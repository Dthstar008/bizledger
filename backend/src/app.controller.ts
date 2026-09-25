import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return { name: 'BizLedger API', status: 'ok', health: '/health' };
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
