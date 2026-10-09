import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * What the app checks at launch: the oldest version still supported, the
 * newest available, and where to get it. All null until configured, which
 * the app treats as "no update needed".
 */
@Controller('app')
export class AppConfigController {
  constructor(private readonly config: ConfigService) {}

  @Get('config')
  appConfig() {
    return {
      minVersion: this.config.get<string | null>('app.minVersion') ?? null,
      latestVersion: this.config.get<string | null>('app.latestVersion') ?? null,
      updateUrl: this.config.get<string | null>('app.updateUrl') ?? null,
    };
  }
}
