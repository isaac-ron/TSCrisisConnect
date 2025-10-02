export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const AUTH_STORAGE_KEYS = {
  token: 'cc_token',
  email: 'cc_user_email',
  role: 'cc_user_role',
  badgeId: 'cc_badge_id',
};
