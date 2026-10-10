import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveBranchId, Actor, CurrentActor, CurrentBusinessId, CurrentRole, WriteBranchId } from '../../common/current-business.decorator';
import { Role } from '../../entities';
import { RolesGuard } from '../../common/roles.guard';
import { RedactCostsInterceptor } from '../../common/redact-costs.interceptor';
import { BranchContextGuard } from '../branches/branch-context.guard';

import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard, BranchContextGuard)
@UseInterceptors(RedactCostsInterceptor)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(
    @CurrentBusinessId() businessId: string,
    @WriteBranchId() branchId: string | undefined,
    @CurrentActor() actor: Actor,
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.create(businessId, dto, branchId, actor);
  }

  @Get()
  findAll(@CurrentBusinessId() businessId: string, @ActiveBranchId() branchId?: string) {
    return this.salesService.findAll(businessId, branchId);
  }

  /** Staff only see sales from their own branch, as in the list; owners see every branch. */
  @Get(':id')
  findOne(
    @CurrentBusinessId() businessId: string,
    @CurrentRole() role: Role,
    @ActiveBranchId() branchId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.salesService.findOne(businessId, id, role === Role.STAFF ? branchId : undefined);
  }
}
