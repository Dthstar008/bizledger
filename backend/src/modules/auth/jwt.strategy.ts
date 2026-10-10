import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Role, User } from '../../entities';

export interface JwtPayload {
  sub: string;
  businessId: string;
  /** The user's tokenVersion when the token was issued; absent on pre-1.2 tokens (= 0). */
  tv?: number;
}

export interface AuthenticatedUser {
  userId: string;
  businessId: string;
  role: Role;
  branchId: string | null;
}

const CACHE_TTL_MS = 30_000;

// Module-level so other modules (e.g. employees) can drop an entry the moment
// a password changes or a staff member is removed, instead of waiting ~30s.
const cache = new Map<string, { value: AuthenticatedUser; tokenVersion: number; expires: number }>();

/** Forget a user's cached session details so the next request re-reads the database. */
export function forgetCachedUser(userId: string) {
  cache.delete(userId);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
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
   * staff member or changing their branch takes effect quickly instead of
   * whenever their 7-day token expires. A token issued before the user's last
   * password change (older tokenVersion) is rejected. Cached briefly to keep
   * this off the hot path of every request.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const issuedVersion = payload.tv ?? 0;
    const cached = cache.get(payload.sub);
    // Always hand out a copy: BranchContextGuard mutates req.user per request.
    if (cached && cached.expires > Date.now()) {
      if (cached.tokenVersion !== issuedVersion) throw new UnauthorizedException();
      return { ...cached.value };
    }

    const user = await this.users.findOne({
      where: { id: payload.sub },
      select: ['id', 'businessId', 'role', 'branchId', 'tokenVersion'],
    });
    if (!user || user.businessId !== payload.businessId) {
      cache.delete(payload.sub);
      throw new UnauthorizedException();
    }

    const value: AuthenticatedUser = {
      userId: user.id,
      businessId: user.businessId,
      role: user.role,
      branchId: user.branchId ?? null,
    };
    const tokenVersion = user.tokenVersion ?? 0;
    cache.set(payload.sub, { value, tokenVersion, expires: Date.now() + CACHE_TTL_MS });
    if (tokenVersion !== issuedVersion) throw new UnauthorizedException();
    return { ...value };
  }
}
