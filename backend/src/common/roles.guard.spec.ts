import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../entities';
import { RolesGuard } from './roles.guard';
import { redactCosts } from './redact-costs.interceptor';

function ctxFor(user: unknown) {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
}

describe('RolesGuard', () => {
  const guardRequiring = (roles?: Role[]) => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(roles) } as unknown as Reflector;
    return new RolesGuard(reflector);
  };

  it('allows any authenticated user when the route has no role requirement', () => {
    expect(guardRequiring(undefined).canActivate(ctxFor({ role: Role.STAFF }))).toBe(true);
  });

  it('allows an owner on an owner-only route', () => {
    expect(guardRequiring([Role.OWNER]).canActivate(ctxFor({ role: Role.OWNER }))).toBe(true);
  });

  it('rejects staff on an owner-only route', () => {
    expect(() => guardRequiring([Role.OWNER]).canActivate(ctxFor({ role: Role.STAFF }))).toThrow(ForbiddenException);
  });

  it('rejects a request with no role at all', () => {
    expect(() => guardRequiring([Role.OWNER]).canActivate(ctxFor({}))).toThrow(ForbiddenException);
  });
});

describe('redactCosts', () => {
  it('removes cost fields at any depth but keeps prices, quantities and dates', () => {
    const createdAt = new Date('2026-09-01T10:00:00Z');
    const input = {
      id: 's1',
      costTotal: 60,
      totalAmount: 100,
      createdAt,
      items: [{ productName: 'Charger', unitPrice: 50, unitCostPrice: 30, quantity: 2 }],
    };
    const out = redactCosts(input);
    expect(out).toEqual({
      id: 's1',
      totalAmount: 100,
      createdAt,
      items: [{ productName: 'Charger', unitPrice: 50, quantity: 2 }],
    });
    expect(input.costTotal).toBe(60);
  });

  it('handles arrays of products', () => {
    expect(redactCosts([{ name: 'A', costPrice: 1, sellingPrice: 2 }])).toEqual([{ name: 'A', sellingPrice: 2 }]);
  });
});
