import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Role, User } from '../../entities';

interface JwtPayload {
  sub: string;
  businessId: string;
}

export interface AuthenticatedUser {
  userId: string;
  businessId: string;
  role: Role;
  branchId: string | null;
}

const CACHE_TTL_MS = 30_000;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly cache = new Map<string, { value: AuthenticatedUser; expires: number }>();

  constructor(
    config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret')!,
    });
  }

  /**
   * The role and branch come from the database, not the token, so removing a
   * staff member or changing their branch takes effect within ~30s instead of
   * whenever their 7-day token expires. Cached briefly to keep this off the
   * hot path of every request.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const cached = this.cache.get(payload.sub);
    // Always hand out a copy: BranchContextGuard mutates req.user per request.
    if (cached && cached.expires > Date.now()) return { ...cached.value };

    const user = await this.users.findOne({
      where: { id: payload.sub },
      select: ['id', 'businessId', 'role', 'branchId'],
    });
    if (!user || user.businessId !== payload.businessId) {
      this.cache.delete(payload.sub);
      throw new UnauthorizedException();
    }

    const value: AuthenticatedUser = {
      userId: user.id,
      businessId: user.businessId,
      role: user.role,
      branchId: user.branchId ?? null,
    };
    this.cache.set(payload.sub, { value, expires: Date.now() + CACHE_TTL_MS });
    return { ...value };
  }
}
