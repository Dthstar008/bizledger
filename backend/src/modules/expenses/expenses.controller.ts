import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentBusinessId } from '../../common/current-business.decorator';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(@CurrentBusinessId() businessId: string, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(businessId, dto);
  }

  @Get()
  findAll(@CurrentBusinessId() businessId: string) {
    return this.expensesService.findAll(businessId);
  }
}
