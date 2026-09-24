import { IsOptional } from 'class-validator';

export class UpdateBusinessDto {
  @IsOptional()
  name?: string;

  @IsOptional()
  ownerName?: string;

  @IsOptional()
  phone?: string;

  @IsOptional()
  category?: string;
}
