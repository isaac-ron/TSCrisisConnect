// DisasterPulse: Dynamic Crisis Detection and Classification System
// Uses adaptive ML models with intelligent fallbacks

import { classifyCrisisBinary, classifySeverity, classifyTweetLocal, extractEntitiesLocal } from './local-model-loader.js';
import { classifyWithPublicModel, extractLocationPublic, classifyZeroShot } from './public-model-fallback.js';
import { geocodeLocation as geocodeWithService } from '../services/geocoder.js';

// Flag to track if local model failed and we should use fallback
let usePublicFallback = false;

// Crisis indicators (signals that something is a crisis, not just specific types)
const CRISIS_INDICATORS = {
  urgency: ['urgent', 'emergency', 'help', 'sos', 'please', 'anyone', 'immediately', 'now', 'asap'],
  action: ['evacuate', 'evacuation', 'shelter', 'lockdown', 'alert', 'warning', 'flee', 'run', 'escape'],
  impact: ['casualties', 'injured', 'dead', 'deaths', 'victim', 'victims', 'trapped', 'missing', 'damage', 'damaged', 'destroyed', 'collapsed'],
  scale: ['massive', 'major', 'severe', 'widespread', 'multiple', 'many', 'numerous', 'huge', 'devastating'],
  response: ['ambulance', 'police', 'firefighters', 'rescue', 'military', 'authorities', 'emergency services', 'first responders'],
  hazard: [
    'earthquake', 'quake', 'aftershock', 'tremor',
    'wildfire', 'fire', 'inferno', 'blaze',
    'flood', 'flooding', 'flash flood', 'deluge',
    'hurricane', 'cyclone', 'typhoon', 'storm',
    'tornado', 'twister',
    'explosion', 'blast', 'bombing',
    'shooting', 'gunfire', 'gunshots', 'active shooter',
    'landslide', 'avalanche',
    'collapse', 'derailment', 'crash', 'pile-up'
  ]
};

// Non-crisis indicators (helps filter out false positives)
const NON_CRISIS_INDICATORS = [
  'traffic', 'commute', 'delayed', 'boring', 'annoying', 'frustrated',
  'movie', 'game', 'show', 'concert', 'party', 'celebration', 'event',
  'metaphor', 'literally', 'figuratively', 'like', 'so', 'just',
  'yesterday', 'last week', 'last month', 'last year', 'history', 'memorial', 'remember'
];

// Dynamic severity scoring based on context, not just keywords
const SEVERITY_INDICATORS = {
  critical: {
    keywords: ['active', 'ongoing', 'imminent', 'mass', 'catastrophic', 'life-threatening', 'critical', 'extreme'],
    crisisTypes: ['earthquake', 'shooting', 'bombing', 'explosion', 'hurricane', 'tornado', 'nuclear', 'chemical attack', 'terrorist attack', 'building collapse']
  },
  high: {
    keywords: ['serious', 'significant', 'major', 'spreading', 'rapid', 'multiple', 'large', 'dangerous'],
    crisisTypes: ['fire', 'wildfire', 'flood', 'outbreak', 'epidemic', 'riot', 'crash', 'plane crash', 'gas leak', 'hostage', 'armed attack']
  },
  medium: {
    keywords: ['developing', 'potential', 'possible', 'reported', 'unconfirmed', 'minor', 'small'],
    crisisTypes: ['protest', 'power outage', 'water contamination', 'minor accident', 'theft', 'vandalism']
  }
};

/**
 * Analyzes a tweet using adaptive crisis detection.
 * @param {string} text The text to analyze.
 * @returns {Promise<object>} Analysis result with crisis info, location, and coordinates.
 */
export async function analyzeTweetWithDisasterPulse(text) {
  try {
    console.log(`[DisasterPulse] 🔍 Analyzing: "${text.substring(0, 100)}..."`);

    // --- Stage 1: Initial Crisis Detection (Try new binary model, fallback to heuristic) ---
    let isCrisisCandidate;
    try {
      isCrisisCandidate = await classifyCrisisBinary(text);
      console.log(`[DisasterPulse] ✅ Binary model result: ${isCrisisCandidate.isCrisis} (confidence: ${(isCrisisCandidate.confidence * 100).toFixed(1)}%)`);
    } catch (binaryError) {
      console.warn('[DisasterPulse] ⚠️ Binary model unavailable, using heuristic detection');
      isCrisisCandidate = await detectCrisisCandidate(text);
    }
    
    if (!isCrisisCandidate.isCrisis) {
      console.log('[DisasterPulse] ❌ Not a crisis');
      return { isCrisis: false };
    }

    console.log(`[DisasterPulse] ✅ Crisis candidate (confidence: ${(isCrisisCandidate.confidence * 100).toFixed(1)}%)`);

    // --- Stage 2: Dynamic Crisis Type Classification ---
    const crisisTypeResult = await classifyCrisisTypeDynamic(text);
    
    console.log(`[DisasterPulse] 🏷️  Type: ${crisisTypeResult.crisisType} (${(crisisTypeResult.confidence * 100).toFixed(1)}%)`);

    // --- Stage 3: Context-Aware Severity Assessment ---
    let severity = assessSeverityDynamic(text, crisisTypeResult.crisisType);
    // If a local severity model is available, prefer its prediction
    try {
      const sev = await classifySeverity(text);
      if (sev && sev.severity) {
        console.log(`[DisasterPulse] 🎚️  Severity (model): ${sev.severity} (conf ${(sev.confidence*100).toFixed(1)}%)`);
        severity = sev.severity;
      }
    } catch (err) {
      console.log(`[DisasterPulse] 🎚️  Severity (heuristic): ${severity}`);
    }
    console.log(`[DisasterPulse] ⚠️  Final Severity: ${severity}`);

    // --- Stage 4: Location Extraction ---
    const locationData = await extractLocationLocal(text);

    // --- Stage 5: Geocoding ---
    let coordinates = null;
    if (locationData.extractedLocation) {
      coordinates = await geocodeLocation(locationData.extractedLocation);
    }

    return {
      isCrisis: true,
      crisisType: crisisTypeResult.crisisType,
      confidence: crisisTypeResult.confidence,
      severity,
      extractedLocation: locationData.extractedLocation,
      latitude: coordinates ? coordinates.latitude : null,
      longitude: coordinates ? coordinates.longitude : null,
    };
  } catch (error) {
    console.error('[DisasterPulse] ❌ Error during analysis:', error);
    return { isCrisis: false, error: error.message };
  }
}

/**
 * Initial crisis detection using multiple signals (not just keywords).
 */
async function detectCrisisCandidate(text) {
  const lowerText = text.toLowerCase();
  
  // Calculate crisis indicator score
  let crisisScore = 0;
  let indicatorCategories = 0;
  
  for (const [category, keywords] of Object.entries(CRISIS_INDICATORS)) {
    const matches = keywords.filter(kw => lowerText.includes(kw)).length;
    if (matches > 0) {
      crisisScore += matches;
      indicatorCategories++;
    }
  }
  
  // Check for non-crisis indicators (false positive filters)
  const nonCrisisMatches = NON_CRISIS_INDICATORS.filter(kw => lowerText.includes(kw)).length;
  
  // Calculate confidence based on positive vs negative indicators
  const positiveSignal = crisisScore / Math.max(indicatorCategories, 1);
  const negativeSignal = nonCrisisMatches * 0.3;
  const confidence = Math.max(0, Math.min(1, (positiveSignal - negativeSignal) / 3));
  
  console.log(`[DisasterPulse] 📊 Crisis indicators: ${crisisScore} | Non-crisis: ${nonCrisisMatches} | Confidence: ${(confidence * 100).toFixed(1)}%`);
  
  // Use ML model for final decision if confidence is borderline
  if (confidence >= 0.25 && confidence < 0.75) {
    try {
      console.log('[DisasterPulse] 🤖 Confidence borderline, consulting ML model...');
      let isCrisis = false;
      let mlConfidence = 0;

      if (!usePublicFallback) {
        // Prefer the local binary model if available
        try {
          const bin = await classifyCrisisBinary(text);
          isCrisis = !!bin.isCrisis;
          mlConfidence = bin.confidence || 0;
          console.log(`[DisasterPulse] 🤖 Binary model returned isCrisis=${isCrisis} (conf ${(mlConfidence*100).toFixed(1)}%)`);
        } catch (localErr) {
          console.warn('[DisasterPulse] ⚠️ Local binary model unavailable, falling back to Python/local service');
          const mlResult = await classifyTweetLocal(text);
          isCrisis = mlResult.isCrisis;
          mlConfidence = mlResult.confidence || 0;
        }
      } else {
        const mlResult = await classifyWithPublicModel(text);
        const out = Array.isArray(mlResult) ? mlResult[0] : mlResult;
        isCrisis = !!(out.label && out.label.toLowerCase().includes('crisis'));
        mlConfidence = out.score || 0;
      }

      return { isCrisis, confidence: Math.max(confidence, mlConfidence, 0.5) };
    } catch (error) {
      console.warn('[DisasterPulse] ⚠️  ML classification failed, using heuristic result');
      if (!usePublicFallback) {
        console.warn('[DisasterPulse] 🔁 Switching to public fallback models');
        usePublicFallback = true;
      }
    }
  }
  
  return { 
    isCrisis: confidence >= 0.3, 
    confidence 
  };
}

/**
 * Dynamic crisis type classification using zero-shot learning.
 * Allows the model to recognize any crisis type, not just predefined ones.
 */
async function classifyCrisisTypeDynamic(text) {
  // Comprehensive list of crisis categories (easily expandable)
  const crisisCategories = [
    // Natural disasters
    'earthquake', 'fire', 'wildfire', 'flood', 'hurricane', 'tornado', 'tsunami',
    'volcanic eruption', 'landslide', 'avalanche', 'drought', 'heatwave', 'blizzard', 'storm',
    
    // Human-caused emergencies
    'shooting', 'active shooter', 'bombing', 'explosion', 'terrorist attack', 'armed conflict',
    'chemical attack', 'nuclear incident', 'biological hazard', 'cyberattack',
    
    // Accidents
    'vehicle crash', 'car accident', 'train derailment', 'plane crash', 'ship accident',
    'building collapse', 'bridge collapse', 'gas leak', 'industrial accident',
    
    // Public health
    'disease outbreak', 'epidemic', 'pandemic', 'food poisoning', 'water contamination',
    'medical emergency', 'health crisis',
    
    // Civil unrest
    'riot', 'protest', 'civil unrest', 'looting', 'hostage situation', 'kidnapping',
    
    // Infrastructure
    'power outage', 'blackout', 'water shortage', 'communication failure',
    
    // Other emergencies
    'missing person', 'search and rescue', 'evacuation', 'emergency situation'
  ];
  
  try {
    const result = await classifyZeroShot(text, crisisCategories);
    return {
      crisisType: result.label,
      confidence: result.score
    };
  } catch (error) {
    console.warn('[DisasterPulse] ⚠️  Zero-shot classification failed, using keyword fallback');
    return inferCrisisTypeFromKeywords(text);
  }
}

/**
 * Fallback keyword-based crisis type inference.
 */
function inferCrisisTypeFromKeywords(text) {
  const lowerText = text.toLowerCase();
  
  // Order matters: specific patterns first, generic patterns last
  const patterns = [
    // Specific multi-word patterns first
    { regex: /active\s+shooter|mass\s+shooting/i, type: 'active shooter', confidence: 0.95 },
    { regex: /plane\s+crash|aircraft\s+(crash|down)/i, type: 'plane crash', confidence: 0.95 },
    { regex: /train\s+(derail|crash)/i, type: 'train derailment', confidence: 0.9 },
    { regex: /building\s+(collaps|fail)|structure\s+fail/i, type: 'building collapse', confidence: 0.9 },
    { regex: /gas\s+leak|chemical\s+spill/i, type: 'gas leak', confidence: 0.85 },
    { regex: /water\s+rising|river\s+overflow|flash\s+flood/i, type: 'flood', confidence: 0.9 },
    { regex: /hostage\s+situation|kidnap(ping)?/i, type: 'hostage situation', confidence: 0.9 },
    
    // Natural disasters
    { regex: /wildfire/i, type: 'wildfire', confidence: 0.95 },
    { regex: /earthquake|seismic|tremor|quake/i, type: 'earthquake', confidence: 0.9 },
    { regex: /\bfire\b|blaze|burning|flames|inferno/i, type: 'fire', confidence: 0.85 },
    { regex: /flood(ing)?|inundation/i, type: 'flood', confidence: 0.9 },
    { regex: /hurricane|typhoon|cyclone/i, type: 'hurricane', confidence: 0.95 },
    { regex: /tornado|twister/i, type: 'tornado', confidence: 0.95 },
    { regex: /tsunami/i, type: 'tsunami', confidence: 0.95 },
    { regex: /landslide|mudslide|avalanche/i, type: 'landslide', confidence: 0.9 },
    
    // Violence & attacks
    { regex: /\bshoot(ing)?\b|gunfire|gunshots|gunman/i, type: 'shooting', confidence: 0.85 },
    { regex: /\bbomb(ing)?\b|explosive|ied|detonation/i, type: 'bombing', confidence: 0.85 },
    { regex: /explosion|explode|blast/i, type: 'explosion', confidence: 0.8 },
    { regex: /terror(ist)?\s+attack/i, type: 'terrorist attack', confidence: 0.9 },
    
    // Accidents
    { regex: /\bcrash|collision|pile-?up/i, type: 'vehicle accident', confidence: 0.75 },
    { regex: /\baccident\b/i, type: 'accident', confidence: 0.7 },
    
    // Health emergencies
    { regex: /outbreak|epidemic|pandemic/i, type: 'disease outbreak', confidence: 0.85 },
    { regex: /virus|disease|infection/i, type: 'health emergency', confidence: 0.7 },
    
    // Civil unrest
    { regex: /riot(ing)?|looting|civil\s+unrest|mob/i, type: 'civil unrest', confidence: 0.8 },
    { regex: /protest/i, type: 'protest', confidence: 0.6 },
  ];
  
  for (const pattern of patterns) {
    if (pattern.regex.test(lowerText)) {
      console.log(`[DisasterPulse] 🎯 Keyword match: ${pattern.type}`);
      return { crisisType: pattern.type, confidence: pattern.confidence };
    }
  }
  
  return { crisisType: 'emergency situation', confidence: 0.6 };
}

/**
 * Context-aware severity assessment.
 * Considers both the crisis type AND contextual indicators.
 */
function assessSeverityDynamic(text, crisisType) {
  const lowerText = text.toLowerCase();
  
  // Start with base severity from crisis type
  let baseSeverity = 'Medium';
  
  for (const [level, data] of Object.entries(SEVERITY_INDICATORS)) {
    if (data.crisisTypes.some(type => crisisType.toLowerCase().includes(type.toLowerCase()))) {
      baseSeverity = level.charAt(0).toUpperCase() + level.slice(1);
      break;
    }
  }
  
  // Adjust severity based on contextual keywords
  let severityAdjustment = 0;
  
  // Check for severity-increasing indicators
  if (SEVERITY_INDICATORS.critical.keywords.some(kw => lowerText.includes(kw))) {
    severityAdjustment += 2;
  }
  if (SEVERITY_INDICATORS.high.keywords.some(kw => lowerText.includes(kw))) {
    severityAdjustment += 1;
  }
  
  // Check for severity-decreasing indicators  
  if (SEVERITY_INDICATORS.medium.keywords.some(kw => lowerText.includes(kw))) {
    severityAdjustment -= 1;
  }
  
  // Check for impact indicators
  const impactScore = CRISIS_INDICATORS.impact.filter(kw => lowerText.includes(kw)).length;
  if (impactScore >= 2) severityAdjustment += 1;
  
  // Check for scale indicators
  const scaleScore = CRISIS_INDICATORS.scale.filter(kw => lowerText.includes(kw)).length;
  if (scaleScore >= 2) severityAdjustment += 1;
  
  // Map to final severity level
  const severityLevels = ['Low', 'Medium', 'High', 'Critical'];
  let currentIndex = severityLevels.indexOf(baseSeverity);
  currentIndex = Math.max(0, Math.min(3, currentIndex + severityAdjustment));
  
  return severityLevels[currentIndex];
}

/**
 * Extracts location information using NER model with public fallback.
 */
async function extractLocationLocal(text) {
  console.log('[DisasterPulse] 📍 Extracting location...');

  try {
    const entities = await extractEntitiesLocal(text);
    const location = selectLocationFromEntities(entities);
    if (location) {
      console.log(`[DisasterPulse] 📍 Local NER detected location: ${location}`);
      return { extractedLocation: location, source: 'local-ner' };
    }
  } catch (error) {
    console.warn('[DisasterPulse] ⚠️ Local NER unavailable:', error.message);
  }

  try {
    const fallbackLocation = await extractLocationPublic(text);
    if (fallbackLocation) {
      return { extractedLocation: fallbackLocation, source: 'public-ner' };
    }
  } catch (error) {
    console.error('[DisasterPulse] ❌ Public NER fallback failed:', error.message);
  }

  console.log('[DisasterPulse] ⚠️ No location extracted');
  return { extractedLocation: null };
}

/**
 * Converts a location name into geographic coordinates using the geocoder service.
 */
async function geocodeLocation(locationText) {
  console.log(`[DisasterPulse] 🗺️  Geocoding: "${locationText}"`);
  return await geocodeWithService(locationText, 'nominatim'); // Use Nominatim by default
}

function selectLocationFromEntities(entities) {
  if (!Array.isArray(entities) || entities.length === 0) {
    return null;
  }

  const acceptedLabels = ['LOC', 'GPE', 'B-LOC', 'I-LOC', 'B-GPE', 'I-GPE', 'ORG', 'B-ORG', 'I-ORG', 'FAC', 'B-FAC', 'I-FAC', 'PLACE'];

  const filtered = entities.filter((entity) => {
    const label = (entity.entity_group || entity.entity || '').toUpperCase();
    return acceptedLabels.some((accepted) => label.includes(accepted));
  });

  if (filtered.length === 0) {
    return null;
  }

  filtered.sort((a, b) => {
    const aIndex = a.index ?? a.start ?? 0;
    const bIndex = b.index ?? b.start ?? 0;
    return aIndex - bIndex;
  });

  const chunks = [];
  let currentChunk = [];
  let previousIndex = null;

  for (const token of filtered) {
    const currentIndex = token.index ?? token.start ?? 0;
    if (currentChunk.length === 0 || currentIndex === previousIndex + 1) {
      currentChunk.push(token);
    } else {
      chunks.push(currentChunk);
      currentChunk = [token];
    }
    previousIndex = currentIndex;
  }
  if (currentChunk.length) {
    chunks.push(currentChunk);
  }

  const candidates = chunks
    .map((chunk) => {
      const text = chunk
        .map((token, idx) => {
          const word = token.word || token.text || '';
          if (!word) return '';
          if (word.startsWith('##')) {
            return word.slice(2);
          }
          return (idx === 0 ? '' : ' ') + word;
        })
        .join('')
        .replace(/\s+/g, ' ')
        .trim();

      const score = chunk.reduce((sum, token) => sum + (token.score || 0), 0) / chunk.length;
      return { text, score };
    })
    .filter((candidate) => candidate.text.length > 0);

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.score - a.score || b.text.length - a.text.length);
  return candidates[0].text;
}
