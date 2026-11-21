import { parseAvailabilityFromProfile } from '@/lib/driver-availability';

export function driverServiceDistricts(serviceAreas: string[]): string[] {
  return serviceAreas.filter((item) => !item.startsWith('Availability:'));
}

/** Rwanda admin address from onboarding (province, district, sector, cell). */
export function formatDriverHomeAddress(addressText?: string | null): string {
  const raw = addressText?.trim();
  if (!raw) return '';
  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return parts.join(' · ');
  }
  return raw;
}

export function drivingCapabilityLabel(transmission?: string | null): string {
  const value = transmission?.trim();
  if (!value) return '';
  if (value === 'Both') return 'Manual & automatic';
  return value;
}

export type DriverProfileFacts = {
  licenseCategories?: string[];
  transmission?: string | null;
  certifications?: string[];
  serviceAreas?: string[];
};

/** Split stored certifications from structured profile fields. */
export function driverProfileFactGroups(profile: DriverProfileFacts) {
  const districts = driverServiceDistricts(profile.serviceAreas ?? []);
  const availabilityModes = parseAvailabilityFromProfile({
    certifications: profile.certifications,
    serviceAreas: profile.serviceAreas,
  });
  const licenses =
    profile.licenseCategories && profile.licenseCategories.length > 0
      ? profile.licenseCategories
      : (profile.certifications ?? [])
          .filter((item) => item.startsWith('License: '))
          .map((item) => item.replace('License: ', ''));

  const drive =
    drivingCapabilityLabel(profile.transmission) ||
    (profile.certifications ?? [])
      .find((item) => item.startsWith('Drive: '))
      ?.replace('Drive: ', '') ||
    '';

  const otherCerts = (profile.certifications ?? []).filter(
    (item) =>
      !item.startsWith('License: ') &&
      !item.startsWith('Availability: ') &&
      !item.startsWith('Drive: '),
  );

  return { districts, availabilityModes, licenses, drive, otherCerts };
}