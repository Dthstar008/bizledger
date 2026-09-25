import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveBranchId, CurrentBusinessId, WriteBranchId } from '../../common/current-business.decorator';
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
    @Body() dto: CreateSaleDto,
  ) {
    return this.salesService.create(businessId, dto, branchId);
  }

  @Get()
  findAll(@CurrentBusinessId() businessId: string, @ActiveBranchId() branchId?: string) {
    return this.salesService.findAll(businessId, branchId);
  }

  @Get(':id')
  findOne(@CurrentBusinessId() businessId: string, @Param('id') id: string) {
    return this.salesService.findOne(businessId, id);
  }
}
