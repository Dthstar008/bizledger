import { AppVersionMiddleware } from './app-version.middleware';

function run(min: string | null, url: string, version?: string) {
  const values: Record<string, unknown> = { 'app.minVersion': min, 'app.updateUrl': 'https://example.test/app.apk' };
  const middleware = new AppVersionMiddleware({ get: (k: string) => values[k] } as any);
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(b: unknown) {
      this.body = b;
      return this;
    },
  };
  const next = jest.fn();
  const req = { method: 'GET', originalUrl: url, url, header: (name: string) => (name === 'x-app-version' ? version : undefined) };
  middleware.use(req as any, res as any, next);
  return { next, res };
}

describe('AppVersionMiddleware', () => {
  it('does nothing while MIN_APP_VERSION is unset', () => {
    expect(run(null, '/sales').next).toHaveBeenCalled();
  });

  it('lets current and newer apps through', () => {
    expect(run('1.2.0', '/sales', '1.2.0').next).toHaveBeenCalled();
    expect(run('1.2.0', '/sales', '1.10.1').next).toHaveBeenCalled();
  });

  it('answers 426 with the update link for older apps and apps that send no version', () => {
    for (const version of ['1.1.0', undefined]) {
      const { next, res } = run('1.2.0', '/sales?x=1', version);
      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(426);
      expect(res.body).toMatchObject({ code: 'UPDATE_REQUIRED', minVersion: '1.2.0', updateUrl: 'https://example.test/app.apk' });
    }
  });

  it('never blocks status checks, the version check itself or the legal pages', () => {
    for (const url of ['/', '/health', '/app/config', '/legal/privacy', '/legal/terms']) {
      expect(run('9.0.0', url).next).toHaveBeenCalled();
    }
  });
});
