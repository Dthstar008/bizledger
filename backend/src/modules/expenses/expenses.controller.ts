import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ActiveBranchId,
  Actor,
  CurrentActor,
  CurrentBusinessId,
  WriteBranchId,
} from '../../common/current-business.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../entities';
import { BranchContextGuard } from '../branches/branch-context.guard';

import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard, BranchContextGuard)
@Roles(Role.OWNER)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(
    @CurrentBusinessId() businessId: string,
    @WriteBranchId() branchId: string | undefined,
    @CurrentActor() actor: Actor,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(businessId, dto, branchId, actor);
  }

  @Get()
  findAll(@CurrentBusinessId() businessId: string, @ActiveBranchId() branchId?: string) {
    return this.expensesService.findAll(businessId, branchId);
  }

  @Get(':id')
  findOne(@CurrentBusinessId() businessId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.findOne(businessId, id);
  }

  @Patch(':id')
  update(
    @CurrentBusinessId() businessId: string,
    @CurrentActor() actor: Actor,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(businessId, id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentBusinessId() businessId: string, @CurrentActor() actor: Actor, @Param('id', ParseUUIDPipe) id: string) {
    return this.expensesService.remove(businessId, id, actor);
  }
}
