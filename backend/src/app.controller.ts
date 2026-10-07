import { readFileSync } from 'fs';
import { join } from 'path';
import { Controller, Get } from '@nestjs/common';

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
