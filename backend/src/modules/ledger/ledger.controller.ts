import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentBusinessId } from '../../common/current-business.decorator';
import { LedgerService } from './ledger.service';

@Controller('ledger')
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('events')
  list(@CurrentBusinessId() businessId: string, @Query('limit') limit?: string) {
    return this.ledgerService.listForBusiness(businessId, limit ? parseInt(limit, 10) : undefined);
  }
}
