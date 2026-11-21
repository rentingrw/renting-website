export function resolveCarListingHostDisplay(params: {
  hostType?: string | null;
  companyName?: string | null;
  ownerName: string;
}): {
  hostDisplayName: string;
  isCompanyHost: boolean;
  companyName: string | null;
} {
  const company = params.companyName?.trim() || null;
  const companyHost = params.hostType === 'company';
  if (companyHost && company) {
    return { hostDisplayName: company, isCompanyHost: true, companyName: company };
  }
  return {
    hostDisplayName: params.ownerName,
    isCompanyHost: false,
    companyName: companyHost ? company : null,
  };
}