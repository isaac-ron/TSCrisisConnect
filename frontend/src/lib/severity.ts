// Severity levels produced by the backend NLP pipeline, highest first
export const SEVERITY_LEVELS = ['Critical', 'High', 'Medium', 'Low'] as const;
export type Severity = (typeof SEVERITY_LEVELS)[number];

const STYLES: Record<Severity | 'Unknown', { hex: string; badge: string }> = {
  Critical: { hex: '#dc2626', badge: 'bg-red-600 text-white' },
  High: { hex: '#f97316', badge: 'bg-orange-500 text-white' },
  Medium: { hex: '#facc15', badge: 'bg-yellow-400 text-black' },
  Low: { hex: '#3b82f6', badge: 'bg-blue-500 text-white' },
  Unknown: { hex: '#6b7280', badge: 'bg-gray-500 text-white' },
};

export function normalizeSeverity(severity?: string | null): Severity | 'Unknown' {
  const match = SEVERITY_LEVELS.find((level) => level.toLowerCase() === severity?.toLowerCase());
  return match ?? 'Unknown';
}

export function severityColor(severity?: string | null): string {
  return STYLES[normalizeSeverity(severity)].hex;
}

export function severityBadgeClass(severity?: string | null): string {
  return STYLES[normalizeSeverity(severity)].badge;
}
