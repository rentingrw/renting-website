/** One account: many car listings; at most one driver profile and one taxi profile. */

export type ProviderJoinLabelKey = 'car' | 'driver' | 'taxi' | 'driverManage' | 'taxiManage';

export type ProviderJoinItem = {
  href: string;
  labelKey: ProviderJoinLabelKey;
  descKey: ProviderJoinLabelKey;
  limitKey: 'multiple' | 'single';
};

export function buildProviderJoinItems(
  locale: string,
  profile: { hasDriverProfile?: boolean; hasTaxiProfile?: boolean },
): ProviderJoinItem[] {
  const driverHref = profile.hasDriverProfile
    ? `/${locale}/app/driver-profile`
    : `/${locale}/onboard/driver`;
  const taxiHref = profile.hasTaxiProfile ? `/${locale}/app/taxi` : `/${locale}/onboard/taxi`;

  return [
    {
      href: `/${locale}/onboard/car`,
      labelKey: 'car',
      descKey: 'car',
      limitKey: 'multiple',
    },
    {
      href: driverHref,
      labelKey: profile.hasDriverProfile ? 'driverManage' : 'driver',
      descKey: profile.hasDriverProfile ? 'driverManage' : 'driver',
      limitKey: 'single',
    },
    {
      href: taxiHref,
      labelKey: profile.hasTaxiProfile ? 'taxiManage' : 'taxi',
      descKey: profile.hasTaxiProfile ? 'taxiManage' : 'taxi',
      limitKey: 'single',
    },
  ];
}