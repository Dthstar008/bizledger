import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { PaymentMethod, TransactionChannel } from '../../../entities';

export class SaleItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  /** Overrides the product's catalog selling price for this line — for negotiated/discounted point-of-sale pricing. Defaults to the product's current sellingPrice when omitted. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class CreateSaleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  /** Amount actually received now. Defaults to the full total unless paymentMethod is credit. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  /** Bank app / POS slip transaction reference, for transfer or POS sales. Not proof of payment on its own. */
  @IsOptional()
  @IsString()
  paymentReference?: string;

  /** More specific channel than paymentMethod when it matters (e.g. paymentMethod=transfer, channel=opay). Defaults to a channel mapped from paymentMethod if omitted. */
  @IsOptional()
  @IsEnum(TransactionChannel)
  channel?: TransactionChannel;
}
