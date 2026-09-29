import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ExpenseCategory } from '../../../entities';

export class CreateExpenseDto {
  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
