import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { ExpenseCategory } from '../../../entities';

export class CreateExpenseDto {
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  description?: string;
}
