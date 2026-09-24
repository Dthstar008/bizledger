import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TransactionChannel } from '../../../entities';

export class CreateRepaymentDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  /** Which channel this repayment actually came through. */
  @IsEnum(TransactionChannel)
  channel: TransactionChannel;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  note?: string;
}
