import { API_BASE_URL, AUTH_STORAGE_KEYS } from './config';

export type ReviewStatus = 'pending' | 'verified' | 'dismissed' | 'resolved';
export type CorroborationLevel = 'single-report' | 'corroborated' | 'official-match';

export interface Incident {
  id: number;
  crisisType: string;
  priority: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  firstReportedAt: string;
  lastReportedAt: string;
  reviewStatus: ReviewStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  reportCount: number;
  summary: string | null;
  corroboration: {
    level: CorroborationLevel;
    independentReporters: number;
    photoEvidence: boolean;
    officialAlert: { source: string; title: string; url: string | null } | null;
  };
  /** The binary model judged every report not to be a crisis */
  modelDoubt: boolean;
}

export interface IncidentReport {
  id: number;
  description: string;
  timestamp: string;
  isCrisis: boolean | null;
  imageVerified: boolean;
  severity: string | null;
  confidence: number | null;
  reporter:
    | { anonymous: true }
    | { anonymous?: false; id: number; name: string; email: string; trackRecord: { confirmed: number; dismissed: number; unreviewed: number } };
}

export interface IncidentDetail extends Incident {
  reports: IncidentReport[];
  reviewedBy: { id: number; name: string } | null;
}

export interface OfficialAlert {
  id: number;
  source: 'usgs' | 'gdacs';
  title: string;
  url: string | null;
  crisisType: string;
  severity: string;
  latitude: number | null;
  longitude: number | null;
  eventTime: string;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem(AUTH_STORAGE_KEYS.token);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: authHeaders() });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

export const fetchIncidents = (all = false) => getJson<Incident[]>(`/incidents${all ? '?all=1' : ''}`);
export const fetchIncident = (id: number) => getJson<IncidentDetail>(`/incidents/${id}`);
export const fetchOfficialAlerts = () => getJson<OfficialAlert[]>('/alerts/official');

export async function reviewIncident(id: number, status: ReviewStatus, note?: string): Promise<Incident> {
  const response = await fetch(`${API_BASE_URL}/incidents/${id}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status, note: note || undefined }),
  });
  if (!response.ok) throw new Error(`Review failed: ${response.status}`);
  return response.json();
}

export interface StatusInfo {
  label: string;
  className: string;
}

/**
 * How much to trust an incident, in words a member of the public can act on.
 * A responder's review outranks corroboration; corroboration is never presented as verification.
 */
export function incidentStatus(incident: Incident): StatusInfo {
  const { reviewStatus, corroboration: c, reportCount } = incident;
  if (reviewStatus === 'verified') return { label: 'Verified by responders', className: 'bg-green-600 text-white' };
  if (reviewStatus === 'resolved') return { label: 'Resolved', className: 'bg-gray-500 text-white' };
  if (reviewStatus === 'dismissed') return { label: 'Dismissed', className: 'bg-gray-300 text-gray-800' };
  if (c.level === 'official-match') return { label: 'Matches an official alert', className: 'bg-blue-600 text-white' };
  if (c.level === 'corroborated') {
    const evidence = c.independentReporters >= 2 ? `${c.independentReporters} independent reporters` : 'photo evidence';
    return { label: `Corroborated · ${evidence}`, className: 'bg-amber-500 text-black' };
  }
  return { label: `Unverified · ${reportCount} report${reportCount === 1 ? '' : 's'}`, className: 'bg-gray-200 text-gray-800' };
}

export function timeAgo(date: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

export const OFFICIAL_SOURCE_LABELS: Record<OfficialAlert['source'], string> = {
  usgs: 'USGS',
  gdacs: 'GDACS',
};
