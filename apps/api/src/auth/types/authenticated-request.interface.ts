export interface AuthenticatedUser {
  clerkUserId: string;
  role?: string;
  publicMetadata?: Record<string, unknown>;
  sessionClaims: Record<string, unknown>;
}

export interface AuthenticatedRequest {
  headers: {
    authorization?: string;
  };
  user: AuthenticatedUser;
}
