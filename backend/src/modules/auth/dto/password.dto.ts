import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/password-policy';

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from the email' })
  code: string;

  @IsStrongPassword()
  newPassword: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Enter your current password' })
  currentPassword: string;

  // Checked against the account's email in the service, which knows it.
  @IsString()
  newPassword: string;
}
