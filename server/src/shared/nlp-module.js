// Reuse the full DisasterPulse analysis pipeline for consistency with social alerts
import { analyzeTweetWithDisasterPulse } from '../nlp/disaster-pulse.js';

/**
 * Analyzes text to extract crisis information like location and severity.
 * Delegates to the DisasterPulse pipeline for parity with social alert ingestion.
 * @param {string} text The message content to analyze.
 * @returns {Promise<object>} An object with extracted info.
 */
export async function processTextForCrisisInfo(text) {
  try {
    console.log('[NLP Module] Processing text:', text.substring(0, 100) + '...');
    
    const analysis = await analyzeTweetWithDisasterPulse(text);
    console.log('[NLP Module] DisasterPulse analysis:', analysis);

    const {
      isCrisis = false,
      severity = 'Low',
      extractedLocation = null,
      crisisType = null,
      confidence = null,
      latitude = null,
      longitude = null,
    } = analysis || {};

    return {
      isCrisis,
      severity,
      extractedLocation,
      crisisType,
      confidence,
      latitude,
      longitude,
    };
  } catch (error) {
    console.error('[NLP Module] ❌ Error in NLP processing:', error.message);
    return {
      isCrisis: false,
      severity: 'Low',
      extractedLocation: null,
      crisisType: null,
      confidence: null,
      latitude: null,
      longitude: null,
    };
  }
}
