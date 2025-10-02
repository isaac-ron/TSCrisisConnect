export type UserProfile = {
  id: number;
  email: string;
  name: string;
  role: string;
  badgeId?: string | null;
};

export type AuthPayload = {
  token: string;
  user: UserProfile;
};
