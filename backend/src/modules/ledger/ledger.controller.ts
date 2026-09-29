import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../entities';
import { CurrentBusinessId } from '../../common/current-business.decorator';
import { LedgerService } from './ledger.service';
import { LedgerQueryDto } from './dto/ledger-query.dto';

@Controller('ledger')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('events')
  list(@CurrentBusinessId() businessId: string, @Query() query: LedgerQueryDto) {
    return this.ledgerService.listForBusiness(businessId, {
      limit: query.limit,
      entity: query.entity,
      entityId: query.entityId,
      types: query.types,
      before: query.before ? new Date(query.before) : undefined,
    });
  }
}
