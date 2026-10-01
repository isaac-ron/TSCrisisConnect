import { GoogleGenAI } from '@google/genai';
import { logger } from '../logger.js';

const log = logger.child({ module: 'image-crisis-detector' });

// Gemini models are retired on a schedule (gemini-2.0-flash shut down on 2026-06-01), so the model is configurable.
// Current IDs: https://ai.google.dev/gemini-api/docs/models
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

const PROMPT = `Analyze this image for crisis or emergency situations. Respond with JSON:

{
  "isCrisis": boolean (true if any emergency/crisis detected),
  "confidence": number (0.0 to 1.0, your confidence in the assessment),
  "crisisType": string (specific type: "fire", "flood", "earthquake damage", "vehicle accident", "building collapse", "violence", "medical emergency", "storm damage", "chemical spill", "evacuation", "rescue operation", or "none"),
  "severity": string ("Critical", "High", "Medium", "Low"),
  "description": string (brief description of what you see that indicates a crisis),
  "visualIndicators": array of strings (specific visual elements: smoke, flames, debris, damaged structures, emergency vehicles, injured people, flood water, etc.),
  "location": string or null (identifiable location information visible in the image: landmarks, street signs, building names),
  "peopleAffected": boolean (true if people appear to be in danger or affected),
  "emergencyResponse": boolean (true if emergency responders or vehicles are visible)
}

IMPORTANT:
- Only mark as crisis if there's clear evidence of an emergency situation
- Do not flag normal traffic, construction work, or everyday activities as crises
- Be conservative but accurate in your assessment
- If unsure, set confidence lower than 0.6`;

const NOT_ANALYZED = { isCrisis: false, confidence: 0, crisisType: null, severity: 'Low', location: null };

/**
 * Analyzes an image for signs of a crisis with Gemini.
 * Never throws: returns a non-crisis result when the image can't be analyzed.
 * @param {string} imageData data URI, e.g. "data:image/jpeg;base64,..."
 */
export async function analyzeCrisisImage(imageData) {
  if (!process.env.GEMINI_API_KEY) {
    log.warn('GEMINI_API_KEY is not set; skipping image analysis');
    return NOT_ANALYZED;
  }
  const match = imageData?.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (!match) {
    log.warn('attachment is not a base64 data URI; skipping image analysis');
    return NOT_ANALYZED;
  }
  const [, mimeType, data] = match;

  try {
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await client.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: PROMPT }, { inlineData: { mimeType, data } }] }],
      config: { responseMimeType: 'application/json' },
    });
    const analysis = parseResponse(result.text);
    log.debug({ model: MODEL_NAME, isCrisis: analysis.isCrisis, crisisType: analysis.crisisType,
      confidence: analysis.confidence }, 'image analyzed');
    return {
      isCrisis: Boolean(analysis.isCrisis),
      confidence: Number(analysis.confidence) || 0,
      crisisType: analysis.crisisType || null,
      severity: analysis.severity || 'Low',
      description: analysis.description || null,
      visualIndicators: analysis.visualIndicators || [],
      location: analysis.location || null,
      peopleAffected: Boolean(analysis.peopleAffected),
      emergencyResponse: Boolean(analysis.emergencyResponse),
    };
  } catch (error) {
    log.error({ err: error.message, model: MODEL_NAME }, 'image analysis failed');
    return NOT_ANALYZED;
  }
}

function parseResponse(text) {
  try {
    // JSON mode should return bare JSON; strip a markdown fence if a model adds one anyway
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    return JSON.parse(fenced ? fenced[1] : text);
  } catch {
    log.warn('image analysis was not valid JSON; falling back to keyword extraction');
    return extractCrisisInfoFromText(text);
  }
}

/** Fallback when the model returns prose instead of JSON. */
function extractCrisisInfoFromText(text) {
  const lower = text.toLowerCase();
  const isCrisis = ['fire', 'flood', 'accident', 'emergency', 'crisis', 'disaster', 'collapse', 'damage', 'danger']
    .some((keyword) => lower.includes(keyword));
  const typePatterns = {
    fire: /\b(fire|flames|burning|smoke)\b/i,
    flood: /\b(flood|flooding|water)\b/i,
    'vehicle accident': /\b(accident|crash|collision|vehicle)\b/i,
    'building collapse': /\b(collapse|collapsed|structural)\b/i,
    'storm damage': /\b(storm|hurricane|tornado|wind)\b/i,
  };
  const crisisType = Object.keys(typePatterns).find((type) => typePatterns[type].test(text));
  return {
    isCrisis,
    confidence: isCrisis ? 0.6 : 0.3,
    crisisType: crisisType || 'emergency situation',
    severity: isCrisis ? 'Medium' : 'Low',
    description: text.substring(0, 200),
    visualIndicators: [],
  };
}
