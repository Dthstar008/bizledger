import { readFileSync } from 'fs';
import { join } from 'path';
import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

// The release this server is running: package.json sits in the working
// directory both in development and in the Docker image.
const VERSION = (() => {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')).version as string;
  } catch {
    return 'unknown';
  }
})();
// Render sets this to the deployed commit; absent locally.
const COMMIT = process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null;

// Status routes: Render health checks and the app's wake-up pings must never be throttled.
@SkipThrottle()
@Controller()
export class AppController {
  @Get()
  root() {
    return { name: 'BizLedger API', status: 'ok', version: VERSION, health: '/health' };
  }

  @Get('health')
  health() {
    return { status: 'ok', version: VERSION, commit: COMMIT };
  }
}
