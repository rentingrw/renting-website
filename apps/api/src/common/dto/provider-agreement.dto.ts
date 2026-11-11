import { Equals, IsBoolean } from 'class-validator';

/** Required acceptance of Terms/Privacy and the 10% platform fee. */
export class ProviderAgreementDto {
  @IsBoolean()
  @Equals(true, { message: 'You must agree to the Terms of Service and Privacy Policy.' })
  acceptedTerms!: boolean;

  @IsBoolean()
  @Equals(true, { message: 'You must agree to pay 10% of the rental amount.' })
  acceptedPlatformFee!: boolean;
}
