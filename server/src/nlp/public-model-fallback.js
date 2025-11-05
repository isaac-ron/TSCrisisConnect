// DisasterPulse: Lightweight NLP using publicly available models
// This version uses models that don't require authentication

import { pipeline } from '@xenova/transformers';

let crisisClassifier = null;
let crisisClassifierPromise = null;
let nerModel = null;
let nerModelPromise = null;

/**
 * Loads a publicly available sentiment/text classifier
 * We'll use it to detect crisis-related content
 */
export async function loadPublicCrisisClassifier() {
  if (crisisClassifier) return crisisClassifier;
  if (crisisClassifierPromise) return crisisClassifierPromise;
  
  console.log('[PublicModel] Loading public crisis detection model...');
  
  crisisClassifierPromise = (async () => {
    try {
      // Use a public zero-shot classification model
      const classifierInstance = await pipeline(
        'zero-shot-classification',
        'Xenova/distilbert-base-uncased-mnli',
        { device: 'cpu' }
      );

      console.log('[PublicModel] ✅ Public model loaded successfully!');
      return classifierInstance;
    } catch (error) {
      console.error('[PublicModel] ❌ Failed to load model:', error.message);
      throw error;
    }
  })();

  try {
    crisisClassifier = await crisisClassifierPromise;
    return crisisClassifier;
  } finally {
    crisisClassifierPromise = null;
  }
}

/**
 * Loads public NER model
 */
export async function loadPublicNER() {
  if (nerModel) return nerModel;
  if (nerModelPromise) return nerModelPromise;
  
  console.log('[PublicModel] Loading NER model...');
  
  nerModelPromise = (async () => {
    try {
      const nerInstance = await pipeline(
        'token-classification',
        'Xenova/bert-base-NER',
        { 
          device: 'cpu',
        }
      );
      
      console.log('[PublicModel] ✅ NER model loaded successfully!');
      return nerInstance;
    } catch (error) {
      console.error('[PublicModel] ❌ Failed to load NER:', error.message);
      throw error;
    }
  })();

  try {
    nerModel = await nerModelPromise;
    return nerModel;
  } finally {
    nerModelPromise = null;
  }
}

/**
 * Classifies tweet using zero-shot classification
 */
export async function classifyWithPublicModel(text) {
  const classifier = await loadPublicCrisisClassifier();
  
  const crisisLabels = [
    'emergency crisis disaster',
    'normal everyday situation'
  ];
  
  const result = await classifier(text, crisisLabels);
  
  // Result format: { sequence, labels: [...], scores: [...] }
  const isCrisis = result.labels[0].includes('crisis') && result.scores[0] > 0.7;
  
  return {
    isCrisis,
    confidence: result.scores[0],
    label: result.labels[0]
  };
}

/**
 * Extracts location using public NER model with regex fallback
 */
export async function extractLocationPublic(text) {
  try {
    const ner = await loadPublicNER();
    const entities = await ner(text);
    
    console.log('[PublicModel] Raw NER entities:', JSON.stringify(entities.slice(0, 10), null, 2));
    
    // Group consecutive location entities and merge subword tokens
    // Include ORG entities as they often represent places (universities, buildings, landmarks)
    const locationEntities = entities.filter(e => 
      (e.entity.includes('LOC') || e.entity.includes('B-LOC') || e.entity.includes('I-LOC') ||
       e.entity.includes('ORG') || e.entity.includes('B-ORG') || e.entity.includes('I-ORG')) && 
      e.score > 0.7
    );
    
    if (locationEntities.length > 0) {
      // Sort by index to process tokens in order
      locationEntities.sort((a, b) => a.index - b.index);
      
      // Merge subword tokens (those starting with ##) and reconstruct proper spacing
      let mergedLocation = '';
      let previousWasSubword = false;
      
      for (let i = 0; i < locationEntities.length; i++) {
        const entity = locationEntities[i];
        const word = entity.word;
        
        if (word.startsWith('##')) {
          // This is a subword continuation (e.g., "##ark" from "Newark")
          mergedLocation += word.substring(2);
          previousWasSubword = true;
        } else {
          // Regular word token
          if (i > 0 && !previousWasSubword) {
            // Add space before this word unless the previous token was a subword
            mergedLocation += ' ';
          }
          mergedLocation += word;
          previousWasSubword = false;
        }
      }
      
      const location = mergedLocation.trim();
      if (location) {
        console.log('[PublicModel] ✅ Extracted location via NER:', location);
        return location;
      }
    }
    
    console.log('[PublicModel] No NER location found, trying regex patterns...');
  } catch (error) {
    console.error('[PublicModel] NER failed:', error.message);
  }
  
  // Fallback: Use regex patterns to find common location formats
  const locationPatterns = [
    // "in [Location]" - matches multi-word capitalized names
    /\bin\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)/g,
    // "at [Location]"
    /\bat\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)/g,
    // "near [Location]" - handles "near Kenyatta University"
    /\bnear\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)/g,
    // "[Location] area"
    /([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*)\s+(?:area|region|district)/gi,
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const location = match[1].trim();
      console.log('[PublicModel] ✅ Extracted location via regex:', location);
      return location;
    }
  }
  
  console.log('[PublicModel] ⚠️ No location found');
  return null;
}

/**
 * Zero-shot classification using public model.
 * Allows dynamic classification into any category without retraining.
 * @param {string} text The text to classify.
 * @param {string[]} candidateLabels Array of possible categories.
 * @returns {Promise<{label: string, score: number}>}
 */
export async function classifyZeroShot(text, candidateLabels) {
  console.log(`[PublicModel] 🎯 Zero-shot classifying into ${candidateLabels.length} categories...`);
  
  const classifier = await loadPublicCrisisClassifier();
  
  const result = await classifier(text, candidateLabels);
  
  // Result format: { labels: [...], scores: [...] }
  console.log(`[PublicModel] ✅ Top prediction: ${result.labels[0]} (${(result.scores[0] * 100).toFixed(1)}%)`);
  
  return {
    label: result.labels[0],
    score: result.scores[0]
  };
}
