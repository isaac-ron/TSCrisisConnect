// Crisis categories: the same keys as the report form (frontend/src/lib/categories.ts).
// Reports store one of these keys as crisisType, which is what incident clustering groups by.
//
// zeroShot:     hypothesis label for the zero-shot classifier (text-only reports)
// keywords:     fallback when the zero-shot model is unavailable; checked in order
// baseSeverity: starting point for the heuristic severity estimate when the ML service is down
export const CATEGORIES = [
  { key: 'violence', zeroShot: 'violence, shooting, terrorism or an armed attack', baseSeverity: 'High',
    keywords: /active\s+shooter|shoot(ing|out)|gunfire|gunshots|gunman|bomb(ing)?|terror|hostage|kidnap|stabb|riot|looting|attack/i },
  { key: 'building', zeroShot: 'building or structure collapse', baseSeverity: 'High',
    keywords: /(building|bridge|structure|crane|roof|wall)\s+(has\s+)?collaps|collapsed\s+(building|bridge|structure)/i },
  { key: 'chemical', zeroShot: 'chemical spill, gas leak or explosion', baseSeverity: 'High',
    keywords: /gas\s+leak|chemical|toxic|explosion|explode|blast|hazmat/i },
  { key: 'earthquake', zeroShot: 'earthquake', baseSeverity: 'High',
    keywords: /earthquake|quake|tremor|seismic|aftershock/i },
  { key: 'fire', zeroShot: 'fire or wildfire', baseSeverity: 'Medium',
    keywords: /wildfire|\bfire\b|blaze|burning|flames|inferno|smoke/i },
  { key: 'flood', zeroShot: 'flood or water emergency', baseSeverity: 'Medium',
    keywords: /flood|flash\s+flood|water\s+rising|river\s+(burst|overflow)|inundat|landslide|mudslide/i },
  { key: 'storm', zeroShot: 'severe storm, hurricane or tornado', baseSeverity: 'Medium',
    keywords: /hurricane|typhoon|cyclone|tornado|storm|hail|blizzard/i },
  { key: 'accident', zeroShot: 'vehicle or traffic accident', baseSeverity: 'Medium',
    keywords: /crash|collision|pile-?up|accident|derail|overturn|plane\s+down/i },
  { key: 'medical', zeroShot: 'medical emergency', baseSeverity: 'Medium',
    keywords: /injur|unconscious|heart\s+attack|bleeding|ambulance|overdose|outbreak|cholera|epidemic/i },
  { key: 'power', zeroShot: 'power outage or infrastructure failure', baseSeverity: 'Low',
    keywords: /power\s+(outage|cut|is\s+out)|blackout|no\s+power|transformer|water\s+(main|pipe)|burst\s+pipe/i },
  { key: 'shelter', zeroShot: 'people need shelter or evacuation', baseSeverity: 'Medium',
    keywords: /evacuat|shelter|displaced|homeless|stranded/i },
  { key: 'other', zeroShot: 'other emergency', baseSeverity: 'Medium', keywords: null },
];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export function isCategory(value) {
  return CATEGORY_KEYS.includes(value);
}
