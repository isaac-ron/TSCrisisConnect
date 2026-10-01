export interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  badgeId?: string | null;
}

export interface AuthPayload {
  token: string;
  user: UserProfile;
}