import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  /** Defaults to the business's default branch when omitted. */
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
