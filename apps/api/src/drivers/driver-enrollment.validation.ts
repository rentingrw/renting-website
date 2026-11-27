import { BadRequestException } from '@nestjs/common';
import type { DriverProfile, User } from '@prisma/client';

type DriverProfileForReview = DriverProfile & {
  user: Pick<User, 'avatarUrl' | 'phone' | 'fullName'>;
};

function serviceDistricts(serviceAreas: string[]): string[] {
  return serviceAreas.filter((item) => !item.startsWith('Availability:'));
}

function hasAvailabilityCertification(certifications: string[]): boolean {
  return certifications.some((item) => item.startsWith('Availability: '));
}

/** Required fields collected during driver onboarding before admin review. */
export function assertDriverProfileReadyForReview(profile: DriverProfileForReview) {
  if (!profile.idDocumentUrl?.trim() || !profile.licenseDocumentUrl?.trim()) {
    throw new BadRequestException('Upload your national ID and driving license before submitting.');
  }
  if (!profile.user.avatarUrl?.trim()) {
    throw new BadRequestException('Upload a profile photo before submitting.');
  }
  if (!profile.user.phone?.trim()) {
    throw new BadRequestException('Add a phone number before submitting.');
  }
  if (!profile.user.fullName?.trim()) {
    throw new BadRequestException('Add your full name before submitting.');
  }
  if (!profile.addressText?.trim()) {
    throw new BadRequestException('Add your home address before submitting.');
  }
  if (!profile.transmission?.trim()) {
    throw new BadRequestException('Select manual, automatic, or both transmission types.');
  }
  if (!profile.licenseCategories?.length) {
    throw new BadRequestException('Select at least one driving license category.');
  }
  if (!profile.languages?.length) {
    throw new BadRequestException('Select at least one language.');
  }
  if (!serviceDistricts(profile.serviceAreas).length) {
    throw new BadRequestException('Select at least one district you serve.');
  }
  if (!hasAvailabilityCertification(profile.certifications)) {
    throw new BadRequestException('Select at least one availability option.');
  }

  const daily = Number(profile.dailyRateRwf);
  const weekly = profile.weeklyRateRwf ? Number(profile.weeklyRateRwf) : null;
  const monthly = profile.monthlyRateRwf ? Number(profile.monthlyRateRwf) : null;
  if (daily < 1000) {
    throw new BadRequestException('Daily rate must be at least 1,000 RWF.');
  }
  if (!weekly || weekly < 1000) {
    throw new BadRequestException('Weekly rate must be at least 1,000 RWF.');
  }
  if (!monthly || monthly < 1000) {
    throw new BadRequestException('Monthly rate must be at least 1,000 RWF.');
  }
}