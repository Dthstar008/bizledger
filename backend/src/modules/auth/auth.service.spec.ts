import { BadRequestException, HttpException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService, MAX_FAILED_LOGINS } from './auth.service';

async function build(
  opts: { mailConfigured?: boolean; production?: boolean; password?: string; user?: Record<string, unknown> | null } = {},
) {
  const user =
    opts.user === null
      ? null
      : {
          id: 'u1',
          email: 'owner@shop.ng',
          businessId: 'b1',
          role: 'owner',
          tokenVersion: 0,
          failedLoginCount: 0,
          lockedUntil: null,
          business: { id: 'b1', name: 'Shop' },
          passwordHash: await bcrypt.hash(opts.password ?? 'correct-horse-1', 4),
          ...(opts.user ?? {}),
        };
  const users = {
    findOne: jest.fn(async () => user),
    update: jest.fn(async () => ({ affected: 1 })),
  };
  const resetRows: any[] = [];
  const resets = {
    count: jest.fn(async () => resetRows.length),
    update: jest.fn(async (criteria: any, patch: any) => {
      // TypeORM accepts either a bare id or a where object.
      const where = typeof criteria === 'string' ? { id: criteria } : criteria;
      const hits = resetRows.filter(
        (r) => (where.id ? r.id === where.id : r.userId === where.userId) && (where.usedAt === undefined || r.usedAt == null),
      );
      hits.forEach((r) => Object.assign(r, patch));
      return { affected: hits.length };
    }),
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => {
      const row = { id: `r${resetRows.length + 1}`, attempts: 0, usedAt: null, createdAt: new Date(), ...v };
      resetRows.push(row);
      return row;
    }),
    findOne: jest.fn(async () => [...resetRows].reverse().find((r) => r.usedAt == null) ?? null),
  };
  const sent: string[] = [];
  const mail = { isConfigured: opts.mailConfigured ?? true, send: jest.fn(async (m: { text: string }) => sent.push(m.text)) };
  const settings: Record<string, unknown> = { isProduction: opts.production ?? false, 'jwt.secret': 'test-secret' };
  const config = { get: (k: string) => settings[k] };
  const jwt = { sign: jest.fn((payload) => `token:${JSON.stringify(payload)}`) };
  const service = new AuthService(users as any, resets as any, jwt as any, {} as any, mail as any, config as any);
  return { service, users, resets, resetRows, mail, sent, jwt };
}

describe('AuthService login protection', () => {
  it('counts failed sign-ins and locks the account after too many', async () => {
    const { service, users } = await build({ user: { failedLoginCount: MAX_FAILED_LOGINS - 1 } });
    await expect(service.login({ email: 'owner@shop.ng', password: 'wrong-password' })).rejects.toThrow(UnauthorizedException);
    const patch = (users.update.mock.calls[0] as any[])[1];
    expect(patch.failedLoginCount).toBe(0);
    expect(patch.lockedUntil.getTime()).toBeGreaterThan(Date.now());
  });

  it('refuses a locked account even with the right password', async () => {
    const { service } = await build({ user: { lockedUntil: new Date(Date.now() + 5 * 60_000) } });
    const attempt = service.login({ email: 'owner@shop.ng', password: 'correct-horse-1' });
    await expect(attempt).rejects.toThrow(HttpException);
    await expect(attempt).rejects.toMatchObject({ status: 429 });
  });

  it('signs tokens with the current token version', async () => {
    const { service, jwt } = await build({ user: { tokenVersion: 3 } });
    await service.login({ email: 'owner@shop.ng', password: 'correct-horse-1' });
    expect(jwt.sign).toHaveBeenCalledWith(expect.objectContaining({ sub: 'u1', tv: 3 }));
  });
});

describe('AuthService password reset', () => {
  it('answers the same way for unknown emails and sends nothing', async () => {
    const { service, mail } = await build({ user: null });
    const res = await service.forgotPassword({ email: 'nobody@x.ng' });
    expect(res.message).toMatch(/If an account exists/);
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('refuses in production when email is not configured, before looking anyone up', async () => {
    const { service, users } = await build({ mailConfigured: false, production: true });
    await expect(service.forgotPassword({ email: 'owner@shop.ng' })).rejects.toThrow(ServiceUnavailableException);
    expect(users.findOne).not.toHaveBeenCalled();
  });

  it('emails a 6-digit code, stores only its hash, and accepts it once', async () => {
    const { service, sent, resetRows, users } = await build();
    await service.forgotPassword({ email: 'owner@shop.ng' });
    const code = /(\d{6})/.exec(sent[0])![1];
    expect(resetRows[0].codeHash).not.toContain(code);

    await service.resetPassword({ email: 'owner@shop.ng', code, newPassword: 'new-pass-2026' });
    const patch = (users.update.mock.calls.at(-1) as any[])[1];
    expect(patch.tokenVersion).toBe(1);
    expect(await bcrypt.compare('new-pass-2026', patch.passwordHash)).toBe(true);

    await expect(service.resetPassword({ email: 'owner@shop.ng', code, newPassword: 'another-pass-1' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('burns the code after too many wrong guesses', async () => {
    const { service, sent, resetRows } = await build();
    await service.forgotPassword({ email: 'owner@shop.ng' });
    const code = /(\d{6})/.exec(sent[0])![1];
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) {
      await expect(service.resetPassword({ email: 'owner@shop.ng', code: wrong, newPassword: 'new-pass-2026' })).rejects.toThrow(
        BadRequestException,
      );
    }
    expect(resetRows[0].usedAt).not.toBeNull();
    await expect(service.resetPassword({ email: 'owner@shop.ng', code, newPassword: 'new-pass-2026' })).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('AuthService change password', () => {
  it('needs the current password, without signing the user out when it is wrong', async () => {
    const { service } = await build();
    await expect(service.changePassword('u1', { currentPassword: 'nope', newPassword: 'new-pass-2026' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('applies the password rule and returns a fresh token for this device', async () => {
    const { service, jwt } = await build();
    await expect(service.changePassword('u1', { currentPassword: 'correct-horse-1', newPassword: 'short1' })).rejects.toThrow(
      /at least 8/,
    );
    const res = await service.changePassword('u1', { currentPassword: 'correct-horse-1', newPassword: 'new-pass-2026' });
    expect(res.accessToken).toBeDefined();
    expect(jwt.sign).toHaveBeenLastCalledWith(expect.objectContaining({ tv: 1 }));
  });
});
