import { AlertTriangle, Building2, Car, CloudRain, Droplets, Flame, Heart, Home, Mountain, ShieldAlert, Skull, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ReportCategory {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

// Categories a reporter can choose when composing a message
export const REPORT_CATEGORIES: ReportCategory[] = [
  { value: 'medical', label: 'Medical Emergency', icon: Heart, color: 'text-red-600' },
  { value: 'fire', label: 'Fire/Wildfire', icon: Flame, color: 'text-orange-600' },
  { value: 'flood', label: 'Flood/Water Emergency', icon: Droplets, color: 'text-blue-500' },
  { value: 'earthquake', label: 'Earthquake', icon: Mountain, color: 'text-amber-700' },
  { value: 'storm', label: 'Severe Storm/Hurricane', icon: CloudRain, color: 'text-slate-600' },
  { value: 'violence', label: 'Violence/Active Threat', icon: ShieldAlert, color: 'text-red-700' },
  { value: 'accident', label: 'Vehicle/Traffic Accident', icon: Car, color: 'text-yellow-600' },
  { value: 'building', label: 'Building Collapse/Structural', icon: Building2, color: 'text-stone-600' },
  { value: 'chemical', label: 'Chemical/Gas Leak', icon: Skull, color: 'text-purple-600' },
  { value: 'power', label: 'Power Outage', icon: Zap, color: 'text-gray-600' },
  { value: 'shelter', label: 'Need Shelter', icon: Home, color: 'text-blue-600' },
  { value: 'other', label: 'Other Emergency', icon: AlertTriangle, color: 'text-orange-600' },
];

const OTHER = REPORT_CATEGORIES[REPORT_CATEGORIES.length - 1];

export function getCategory(value?: string | null): ReportCategory {
  return REPORT_CATEGORIES.find((c) => c.value === value) ?? OTHER;
}
