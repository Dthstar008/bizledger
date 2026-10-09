import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Request, Response } from 'express';
import { compareVersions } from '../../common/semver';

/** Reachable by every app version: status checks, the version check itself, and the legal pages. */
const EXEMPT = [/^\/$/, /^\/health\/?$/, /^\/app\/config\/?$/, /^\/legal(\/|$)/];

export const UPDATE_REQUIRED_STATUS = 426;

/**
 * Retires old app versions. The app sends `X-App-Version` on every request;
 * when MIN_APP_VERSION is set, anything older (or missing the header, as every
 * app before 1.2 does) gets 426 Upgrade Required with a message and the update
 * link, and the app shows its "update required" screen. Unset = no-op.
 */
@Injectable()
export class AppVersionMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const minVersion = this.config.get<string | null>('app.minVersion');
    if (!minVersion) return next();

    const path = (req.originalUrl ?? req.url).split('?')[0];
    if (req.method === 'OPTIONS' || EXEMPT.some((re) => re.test(path))) return next();

    const version = req.header('x-app-version');
    if (version && compareVersions(version, minVersion) >= 0) return next();

    res.status(UPDATE_REQUIRED_STATUS).json({
      statusCode: UPDATE_REQUIRED_STATUS,
      code: 'UPDATE_REQUIRED',
      message: 'This version of BizLedger is no longer supported. Please update the app to continue.',
      minVersion,
      updateUrl: this.config.get<string | null>('app.updateUrl') ?? null,
    });
  }
}
