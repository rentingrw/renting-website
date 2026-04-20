export type TrustTier =
  | 'Platinum'
  | 'Gold'
  | 'Silver'
  | 'Bronze'
  | 'Standard'
  | 'Warning'
  | 'Suspended';

export function deriveTrustTier(score: number): TrustTier {
  if (score >= 100) {
    return 'Platinum';
  }
  if (score >= 95) {
    return 'Gold';
  }
  if (score >= 90) {
    return 'Silver';
  }
  if (score >= 85) {
    return 'Bronze';
  }
  if (score >= 80) {
    return 'Standard';
  }
  if (score < 60) {
    return 'Suspended';
  }
  return 'Warning';
}
