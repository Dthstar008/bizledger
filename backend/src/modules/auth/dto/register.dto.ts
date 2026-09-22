import { Equals, IsEmail, IsNotEmpty, IsOptional, MinLength } from 'class-validator';

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

  /** Self-attestation, not a collected birthdate — must be explicitly true. */
  @Equals(true, { message: 'You must confirm you are 18 or older to register' })
  confirmedAdult: boolean;
}
