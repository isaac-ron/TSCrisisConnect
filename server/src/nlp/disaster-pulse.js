// DisasterPulse: turns a report's text into crisis type, severity, location and coordinates.
// Each stage has a fallback so a report is never lost when a model is unavailable:
//   crisis?   ML service binary model   -> keyword heuristic (+ zero-shot for borderline cases)
//   type      reporter's category       -> zero-shot model -> keywords
//   severity  ML service priority model -> keyword heuristic
//   location  NER model                 -> regex
import { CATEGORIES, isCategory } from './categories.js';
import { classifyCrisisBinary, classifySeverity } from './ml-client.js';
import { classifyZeroShot, extractEntities } from './local-models.js';
import { geocodeLocation } from '../services/geocoder.js';
import { logger } from '../logger.js';

const log = logger.child({ module: 'disaster-pulse' });

const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

// Signals that something is happening now and matters
const CRISIS_INDICATORS = {
  urgency: ['urgent', 'emergency', 'help', 'sos', 'immediately', 'asap'],
  action: ['evacuate', 'evacuation', 'shelter', 'lockdown', 'alert', 'warning', 'flee', 'escape'],
  impact: ['casualties', 'injured', 'dead', 'deaths', 'victim', 'victims', 'trapped', 'missing', 'damage', 'damaged', 'destroyed', 'collapsed'],
  scale: ['massive', 'major', 'severe', 'widespread', 'multiple', 'many', 'numerous', 'huge', 'devastating'],
  response: ['ambulance', 'police', 'firefighters', 'rescue', 'military', 'authorities', 'emergency services', 'first responders'],
  hazard: ['earthquake', 'quake', 'tremor', 'wildfire', 'fire', 'blaze', 'flood', 'flooding', 'hurricane', 'cyclone', 'storm',
    'tornado', 'explosion', 'blast', 'bombing', 'shooting', 'gunfire', 'active shooter', 'landslide', 'collapse', 'derailment', 'crash', 'pile-up'],
};

// Figurative, past or entertainment contexts that often produce false positives
const NON_CRISIS_INDICATORS = [
  'traffic', 'commute', 'boring', 'annoying', 'movie', 'game', 'show', 'concert', 'party', 'celebration',
  'metaphor', 'literally', 'figuratively', 'lol', 'yesterday', 'last week', 'last year', 'history', 'memorial', 'remember',
];

const SEVERITY_ADJUSTERS = {
  up2: ['active', 'ongoing', 'imminent', 'mass', 'catastrophic', 'life-threatening', 'critical', 'extreme'],
  up1: ['serious', 'significant', 'major', 'spreading', 'rapid', 'multiple', 'large', 'dangerous'],
  down1: ['minor', 'small', 'contained', 'no injuries', 'under control', 'potential', 'possible', 'unconfirmed'],
};

const countMatches = (text, words) => words.filter((w) => text.includes(w)).length;

/** Keyword-based crisis detection, used when the ML service is unavailable. */
async function heuristicCrisis(text) {
  const lower = text.toLowerCase();
  let score = 0;
  let categories = 0;
  for (const words of Object.values(CRISIS_INDICATORS)) {
    const matches = countMatches(lower, words);
    if (matches) {
      score += matches;
      categories++;
    }
  }
  const negative = countMatches(lower, NON_CRISIS_INDICATORS) * 0.3;
  const confidence = Math.max(0, Math.min(1, (score / Math.max(categories, 1) - negative) / 3));

  // Borderline: let the zero-shot model decide
  if (confidence >= 0.25 && confidence < 0.75) {
    try {
      const { label, score: zsScore } = await classifyZeroShot(text, ['an emergency or disaster', 'an everyday situation']);
      return { isCrisis: label === 'an emergency or disaster' && zsScore > 0.7, confidence: zsScore };
    } catch (error) {
      log.warn({ err: error.message }, 'zero-shot unavailable, using keyword score');
    }
  }
  return { isCrisis: confidence >= 0.3, confidence };
}

async function detectCrisis(text) {
  try {
    return await classifyCrisisBinary(text);
  } catch (error) {
    log.warn({ err: error.message }, 'ML service unavailable, using heuristic crisis detection');
    return heuristicCrisis(text);
  }
}

async function detectCategory(text, reportedCategory) {
  if (isCategory(reportedCategory) && reportedCategory !== 'other') {
    return { crisisType: reportedCategory, source: 'reporter' };
  }
  const candidates = CATEGORIES.filter((c) => c.key !== 'other');
  try {
    const { label, score } = await classifyZeroShot(text, candidates.map((c) => c.zeroShot));
    if (score >= 0.3) {
      return { crisisType: candidates.find((c) => c.zeroShot === label).key, source: 'zero-shot' };
    }
  } catch (error) {
    log.warn({ err: error.message }, 'zero-shot unavailable, using keywords for crisis type');
  }
  const match = candidates.find((c) => c.keywords.test(text));
  return { crisisType: match ? match.key : 'other', source: match ? 'keywords' : 'default' };
}

function heuristicSeverity(text, crisisType) {
  const lower = text.toLowerCase();
  const base = CATEGORIES.find((c) => c.key === crisisType)?.baseSeverity ?? 'Medium';
  let adjustment = 0;
  if (countMatches(lower, SEVERITY_ADJUSTERS.up2)) adjustment += 2;
  if (countMatches(lower, SEVERITY_ADJUSTERS.up1)) adjustment += 1;
  if (countMatches(lower, SEVERITY_ADJUSTERS.down1)) adjustment -= 1;
  if (countMatches(lower, CRISIS_INDICATORS.impact) >= 2) adjustment += 1;
  if (countMatches(lower, CRISIS_INDICATORS.scale) >= 2) adjustment += 1;
  const index = Math.max(0, Math.min(3, SEVERITY_LEVELS.indexOf(base) + adjustment));
  return SEVERITY_LEVELS[index];
}

async function detectSeverity(text, crisisType) {
  try {
    return (await classifySeverity(text)).severity;
  } catch (error) {
    log.warn({ err: error.message }, 'ML service unavailable, using heuristic severity');
    return heuristicSeverity(text, crisisType);
  }
}

const LOCATION_LABELS = ['LOC', 'GPE', 'FAC', 'ORG'];   // ORG often names places (malls, universities, stations)

/** Joins adjacent location tokens from NER output into phrases and returns the most confident one. */
function selectLocation(entities) {
  const tokens = entities
    .filter((e) => e.score >= 0.7 && LOCATION_LABELS.some((l) => (e.entity_group || e.entity || '').toUpperCase().includes(l)))
    .sort((a, b) => a.index - b.index);
  const chunks = [];
  for (const token of tokens) {
    const last = chunks[chunks.length - 1];
    if (last && token.index === last[last.length - 1].index + 1) last.push(token);
    else chunks.push([token]);
  }
  const candidates = chunks.map((chunk) => ({
    text: chunk.map((t, i) => (t.word.startsWith('##') ? t.word.slice(2) : (i ? ' ' : '') + t.word)).join('').trim(),
    score: chunk.reduce((sum, t) => sum + t.score, 0) / chunk.length,
  })).filter((c) => c.text.length > 1);
  candidates.sort((a, b) => b.score - a.score || b.text.length - a.text.length);
  return candidates[0]?.text ?? null;
}

const LOCATION_PATTERNS = [
  /\b(?:in|at|near)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)/,
  /([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\s+(?:area|region|district|county|estate)\b/,
];

async function extractLocation(text) {
  try {
    const location = selectLocation(await extractEntities(text));
    if (location) return location;
  } catch (error) {
    log.warn({ err: error.message }, 'NER unavailable, using regex location extraction');
  }
  for (const pattern of LOCATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

/**
 * Analyzes a report or alert text. Never throws: on failure it returns a non-crisis result.
 * @param {string} text
 * @param {{category?: string}} [options] the reporter's chosen category, if any
 */
export async function analyzeText(text, { category } = {}) {
  const empty = { isCrisis: false, confidence: null, crisisType: null, severity: 'Low', extractedLocation: null, latitude: null, longitude: null };
  try {
    const crisis = await detectCrisis(text);
    if (!crisis.isCrisis) {
      return { ...empty, confidence: crisis.confidence };
    }
    const { crisisType, source } = await detectCategory(text, category);
    const [severity, extractedLocation] = await Promise.all([detectSeverity(text, crisisType), extractLocation(text)]);
    const coordinates = extractedLocation ? await geocodeLocation(extractedLocation) : null;
    log.debug({ crisisType, typeSource: source, severity, extractedLocation }, 'analyzed text');
    return {
      isCrisis: true,
      confidence: crisis.confidence,
      crisisType,
      severity,
      extractedLocation,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
    };
  } catch (error) {
    log.error({ err: error }, 'text analysis failed');
    return empty;
  }
}
