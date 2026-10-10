import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveBranchId, CurrentBusinessId } from '../../common/current-business.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../entities';
import { BranchContextGuard } from '../branches/branch-context.guard';

import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, BranchContextGuard)
@Roles(Role.OWNER)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(
    @CurrentBusinessId() businessId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @ActiveBranchId() branchId?: string,
  ) {
    return this.dashboardService.getSummary(
      businessId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
      branchId,
    );
  }
}
