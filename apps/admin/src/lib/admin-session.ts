export type AdminSessionProfile = {
  email: string;
  role: string;
  displayName: string;
  initials: string;
};

export function buildAdminProfile(email: string, role: string): AdminSessionProfile {
  const local = email.split('@')[0]?.trim() || email;
  const displayName = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  const initialsSource = displayName || local;
  const parts = initialsSource.trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase()
      : initialsSource.slice(0, 2).toUpperCase();

  return { email, role, displayName: displayName || email, initials };
}
