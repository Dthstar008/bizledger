import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/password-policy';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  /** Defaults to the business's default branch when omitted. */
  @IsOptional()
  @IsUUID()
  branchId?: string;
}

/** An owner setting a new password for a staff member (checked against the staff email in the service). */
export class ResetEmployeePasswordDto {
  @IsString()
  password: string;
}
