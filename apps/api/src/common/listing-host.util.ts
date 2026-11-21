import { CarHostType } from '@prisma/client';

export function isCompanyHost(hostType: CarHostType | null | undefined): boolean {
  return hostType === CarHostType.company;
}

export function resolveCarHostDisplay(params: {
  hostType?: CarHostType | string | null;
  companyName?: string | null;
  ownerFullName: string;
}): {
  hostDisplayName: string;
  isCompanyHost: boolean;
  companyName: string | null;
} {
  const company = params.companyName?.trim() || null;
  const companyHost = params.hostType === CarHostType.company || params.hostType === 'company';
  if (companyHost && company) {
    return { hostDisplayName: company, isCompanyHost: true, companyName: company };
  }
  return {
    hostDisplayName: params.ownerFullName,
    isCompanyHost: false,
    companyName: companyHost ? company : null,
  };
}

export function providerLabelForBooking(params: {
  hostType?: CarHostType | string | null;
  companyName?: string | null;
  ownerFullName: string;
}): string {
  const { hostDisplayName } = resolveCarHostDisplay({
    hostType: params.hostType,
    companyName: params.companyName,
    ownerFullName: params.ownerFullName,
  });
  if (params.hostType === CarHostType.company || params.hostType === 'company') {
    const contact = params.ownerFullName.trim();
    return contact && contact !== hostDisplayName ? `${hostDisplayName} (${contact})` : hostDisplayName;
  }
  return hostDisplayName;
}