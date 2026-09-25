import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Role } from '../entities/user.entity';

const COST_KEYS = new Set(['costPrice', 'costTotal', 'unitCostPrice']);

/** Recursively removes purchase-cost fields so staff can sell without seeing margins. */
export function redactCosts<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => redactCosts(v)) as unknown as T;
  if (value instanceof Date) return value;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (!COST_KEYS.has(key)) out[key] = redactCosts(v);
    }
    return out as T;
  }
  return value;
}

@Injectable()
export class RedactCostsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const role = context.switchToHttp().getRequest().user?.role;
    return next.handle().pipe(map((data) => (role === Role.STAFF ? redactCosts(data) : data)));
  }
}
