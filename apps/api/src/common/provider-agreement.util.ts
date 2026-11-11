import { BadRequestException } from '@nestjs/common';

import { prisma } from '../database/prisma';

export type ProviderAgreementInput = {
  acceptedTerms?: boolean;
  acceptedPlatformFee?: boolean;
};

export function assertProviderAgreement(payload: ProviderAgreementInput) {
  if (payload.acceptedTerms !== true) {
    throw new BadRequestException('You must agree to the Terms of Service and Privacy Policy.');
  }
  if (payload.acceptedPlatformFee !== true) {
    throw new BadRequestException('You must agree to pay 10% of the rental amount.');
  }
}

export async function recordProviderAgreement(userId: string) {
  const now = new Date();
  await prisma.user.update({
    where: { id: userId },
    data: {
      providerPolicyAcceptedAt: now,
      providerFeeAcceptedAt: now,
    },
  });
}

export async function assertAndRecordProviderAgreement(
  userId: string,
  payload: ProviderAgreementInput,
) {
  assertProviderAgreement(payload);
  await recordProviderAgreement(userId);
}
