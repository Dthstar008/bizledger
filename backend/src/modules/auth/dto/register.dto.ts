import { IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  businessName: string;

  @IsOptional()
  ownerName?: string;

  @IsOptional()
  phone?: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;
}
