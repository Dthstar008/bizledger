import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActiveBranchId, CurrentBusinessId, WriteBranchId } from '../../common/current-business.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../entities';
import { BranchContextGuard } from '../branches/branch-context.guard';

import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard, BranchContextGuard)
@Roles(Role.OWNER)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(
    @CurrentBusinessId() businessId: string,
    @WriteBranchId() branchId: string | undefined,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(businessId, dto, branchId);
  }

  @Get()
  findAll(@CurrentBusinessId() businessId: string, @ActiveBranchId() branchId?: string) {
    return this.expensesService.findAll(businessId, branchId);
  }
}
