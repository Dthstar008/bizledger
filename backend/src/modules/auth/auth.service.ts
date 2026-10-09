import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource, IsNull, MoreThan, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { User, Business, Branch, Role, PasswordReset } from '../../entities';
import { passwordProblem } from '../../common/password-policy';
import { MailService } from '../mail/mail.service';
import { TERMS_VERSION } from '../legal/legal-content';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/password.dto';
import { forgetCachedUser } from './jwt.strategy';

/** Consecutive failed sign-ins before the account is locked for LOCK_MINUTES. */
export const MAX_FAILED_LOGINS = 10;
export const LOCK_MINUTES = 15;
export const RESET_CODE_MINUTES = 15;
export const RESET_MAX_ATTEMPTS = 5;
/** Reset emails per account per hour, so the endpoint can't be used to spam someone. */
export const RESET_REQUESTS_PER_HOUR = 3;

const RESET_SENT_MESSAGE = `If an account exists for that email, we've sent a 6-digit code to it. The code expires in ${RESET_CODE_MINUTES} minutes.`;
const RESET_INVALID_MESSAGE = 'That code is incorrect or has expired. Request a new code and try again.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('Auth');

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(PasswordReset) private readonly resets: Repository<PasswordReset>,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.users.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const now = new Date();

    const { business, user } = await this.dataSource.transaction(async (manager) => {
      const business = await manager.save(
        manager.create(Business, {
          name: dto.businessName,
          ownerName: dto.ownerName,
          phone: dto.phone,
        }),
      );
      await manager.save(manager.create(Branch, { businessId: business.id, name: 'Main Branch', isDefault: true }));
      const user = await manager.save(
        manager.create(User, {
          email: dto.email,
          passwordHash,
          name: dto.ownerName,
          businessId: business.id,
          role: Role.OWNER,
          // DTO validation already requires this to be exactly `true`, so
          // this timestamp is an honest record of when that confirmation
          // actually happened, not just a UI gate.
          ageConfirmedAt: now,
          // Recorded only when the app actually sent the consent.
          termsAcceptedAt: dto.acceptedTerms === true ? now : null,
          termsVersion: dto.acceptedTerms === true ? TERMS_VERSION : null,
        }),
      );
      return { business, user };
    });

    return this.buildAuthResponse(user, business);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ where: { email: dto.email }, relations: ['business'] });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000));
      throw new HttpException(
        `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}, or reset your password.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      const failed = (user.failedLoginCount ?? 0) + 1;
      const lock = failed >= MAX_FAILED_LOGINS;
      await this.users.update(user.id, {
        failedLoginCount: lock ? 0 : failed,
        lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : user.lockedUntil ?? null,
      });
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.failedLoginCount || user.lockedUntil) {
      await this.users.update(user.id, { failedLoginCount: 0, lockedUntil: null });
    }
    return this.buildAuthResponse(user, user.business);
  }

  /**
   * Emails a one-time code. Always answers the same way whether or not the
   * account exists, so the endpoint can't be used to discover who has one.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const isProduction = this.config.get<boolean>('isProduction');
    // Decided before looking the account up, so this answer reveals nothing either.
    if (!this.mail.isConfigured && isProduction) {
      throw new ServiceUnavailableException(
        "Password reset by email isn't available yet. Ask your business owner to reset your password, or contact BizLedger support.",
      );
    }

    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) return { message: RESET_SENT_MESSAGE };

    const recent = await this.resets.count({ where: { userId: user.id, createdAt: MoreThan(new Date(Date.now() - 60 * 60_000)) } });
    if (recent >= RESET_REQUESTS_PER_HOUR) return { message: RESET_SENT_MESSAGE };

    // Only the newest code is ever valid.
    await this.resets.update({ userId: user.id, usedAt: IsNull() }, { usedAt: new Date() });
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.resets.save(
      this.resets.create({ userId: user.id, codeHash: this.hashCode(code), expiresAt: new Date(Date.now() + RESET_CODE_MINUTES * 60_000) }),
    );

    if (this.mail.isConfigured) {
      await this.mail.send({
        to: user.email,
        subject: 'Your BizLedger password reset code',
        text:
          `Your BizLedger password reset code is ${code}.\n\n` +
          `It expires in ${RESET_CODE_MINUTES} minutes and can be used once. ` +
          `If you didn't ask to reset your password, you can ignore this email; your password hasn't changed.`,
      });
    } else {
      // Development only (production without email is refused above).
      this.logger.warn(`[dev] Password reset code for ${user.email}: ${code}`);
    }
    return { message: RESET_SENT_MESSAGE };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const user = await this.users.findOne({ where: { email: dto.email } });
    if (!user) throw new BadRequestException(RESET_INVALID_MESSAGE);

    const reset = await this.resets.findOne({ where: { userId: user.id, usedAt: IsNull() }, order: { createdAt: 'DESC' } });
    if (!reset || reset.expiresAt <= new Date() || reset.attempts >= RESET_MAX_ATTEMPTS) {
      throw new BadRequestException(RESET_INVALID_MESSAGE);
    }
    if (!this.codeMatches(dto.code, reset.codeHash)) {
      const attempts = reset.attempts + 1;
      await this.resets.update(reset.id, attempts >= RESET_MAX_ATTEMPTS ? { attempts, usedAt: new Date() } : { attempts });
      throw new BadRequestException(RESET_INVALID_MESSAGE);
    }

    // Claim the code first, so two simultaneous requests can't both use it.
    const claimed = await this.resets.update({ id: reset.id, usedAt: IsNull() }, { usedAt: new Date() });
    if (!claimed.affected) throw new BadRequestException(RESET_INVALID_MESSAGE);

    await this.setPassword(user, dto.newPassword);
    return { message: 'Your password has been changed. Sign in with your new password.' };
  }

  /** Changes the signed-in user's password and returns a fresh session for this device. */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.users.findOne({ where: { id: userId }, relations: ['business'] });
    if (!user) throw new UnauthorizedException();
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      // 400, not 401: a wrong current password must not sign the user out.
      throw new BadRequestException('Your current password is not correct.');
    }
    const problem = passwordProblem(dto.newPassword, { email: user.email });
    if (problem) throw new BadRequestException(problem);
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('Choose a password different from your current one.');
    }
    const updated = await this.setPassword(user, dto.newPassword);
    return this.buildAuthResponse(updated, user.business);
  }

  /**
   * Stores a new password and bumps tokenVersion, which signs out every
   * session issued before now. Also clears any sign-in lockout.
   */
  async setPassword(user: User, password: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    const tokenVersion = (user.tokenVersion ?? 0) + 1;
    const passwordChangedAt = new Date();
    await this.users.update(user.id, { passwordHash, tokenVersion, passwordChangedAt, failedLoginCount: 0, lockedUntil: null });
    forgetCachedUser(user.id);
    return { ...user, passwordHash, tokenVersion, passwordChangedAt, failedLoginCount: 0, lockedUntil: null };
  }

  private hashCode(code: string): string {
    return createHmac('sha256', `${this.config.get<string>('jwt.secret')}:password-reset`).update(code).digest('hex');
  }

  private codeMatches(code: string, storedHash: string): boolean {
    const a = Buffer.from(this.hashCode(code), 'hex');
    const b = Buffer.from(storedHash, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private buildAuthResponse(user: User, business: Business) {
    const accessToken = this.jwtService.sign({ sub: user.id, businessId: user.businessId, tv: user.tokenVersion ?? 0 });
    return {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, branchId: user.branchId ?? null },
      business: { id: business.id, name: business.name },
    };
  }
}
