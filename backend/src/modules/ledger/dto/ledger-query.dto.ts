import { Transform } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { LedgerEventType } from '../../../entities';

export const LEDGER_ENTITIES = ['product', 'customer', 'expense', 'sale'] as const;
export type LedgerEntity = (typeof LEDGER_ENTITIES)[number];

export class LedgerQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : parseInt(value, 10)))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsIn(LEDGER_ENTITIES)
  entity?: LedgerEntity;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  /** Comma-separated event types, e.g. `types=INVENTORY_DECREASED,INVENTORY_ADJUSTED`. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((v: string) => v.trim()).filter(Boolean) : value))
  @IsArray()
  @IsEnum(LedgerEventType, { each: true })
  types?: LedgerEventType[];

  /** Cursor: only events strictly older than this timestamp (the last `createdAt` of the previous page). */
  @IsOptional()
  @IsDateString()
  before?: string;
}
