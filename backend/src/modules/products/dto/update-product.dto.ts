import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  /** Why stock was changed by hand (restock, damaged, count correction). Stored on the INVENTORY_ADJUSTED event. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  stockAdjustmentReason?: string;
}
