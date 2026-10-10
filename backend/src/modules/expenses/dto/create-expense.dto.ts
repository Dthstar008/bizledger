import { IsEnum, IsISO8601, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
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

  /** Set by the app: a UUID made when the record was created on the phone. Sending the same one twice returns the first record instead of creating a duplicate. */
  @IsOptional()
  @IsUUID()
  clientRef?: string;

  /** When it actually happened, for records saved offline and synced later. Trusted up to 30 days back; never in the future. */
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}
