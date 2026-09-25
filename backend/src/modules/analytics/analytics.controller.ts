import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../entities';
import { ActiveBranchId, CurrentBusinessId } from '../../common/current-business.decorator';
import { BranchContextGuard } from '../branches/branch-context.guard';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard, BranchContextGuard)
@Roles(Role.OWNER)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  get(
    @CurrentBusinessId() businessId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @ActiveBranchId() branchId?: string,
  ) {
    return this.analyticsService.getAnalytics(businessId, from, to, branchId);
  }
}
