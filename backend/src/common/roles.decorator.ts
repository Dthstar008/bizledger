import { SetMetadata } from '@nestjs/common';
import { Role } from '../entities/user.entity';

export const ROLES_KEY = 'roles';

/** Restricts a route (or whole controller) to the given roles. Pair with RolesGuard after JwtAuthGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
