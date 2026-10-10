import { Equals, IsBoolean, IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import { IsStrongPassword } from '../../../common/password-policy';

export class RegisterDto {
  @IsNotEmpty()
  businessName: string;

  @IsOptional()
  ownerName?: string;

  @IsOptional()
  phone?: string;

  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  /** Self-attestation, not a collected birthdate — must be explicitly true. */
  @Equals(true, { message: 'You must confirm you are 18 or older to register' })
  confirmedAdult: boolean;

  /**
   * Acceptance of the Terms and Privacy Policy. Optional on the API so apps
   * released before it existed can still register; the 1.2 app requires it.
   */
  @IsOptional()
  @IsBoolean()
  acceptedTerms?: boolean;
}
