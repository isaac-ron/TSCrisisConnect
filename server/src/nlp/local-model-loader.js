import { pipeline, env } from '@xenova/transformers';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Point to your local model directory (now in ml-service)
const LOCAL_MODEL_ROOT = path.resolve(__dirname, '..', '..', '..', 'ml-service');
const LOCAL_MODEL_PATH = path.join(LOCAL_MODEL_ROOT, 'CrisisTransformers', 'CT-M1-Complete');
// Use a public crisis/emergency classification model instead
const MODEL_ID = 'unitary/toxic-bert'; // or another suitable public model

console.log(`[LocalModel] Model path configured: ${LOCAL_MODEL_PATH}`);

let crisisClassifier = null;
let crisisClassifierPromise = null;
let nerModel = null;
let nerModelPromise = null;

/**
 * Loads the CrisisTransformers model from local files.
 * The model is private/requires auth on HuggingFace, so we use local files only.
 */
export async function loadCrisisClassifier() {
  // First try to connect to Python ML service
  try {
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    const healthResponse = await fetch(`${ML_SERVICE_URL}/health`, { 
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      if (health.model_loaded) {
        console.log(`[LocalModel] ✅ Connected to Python ML service at ${ML_SERVICE_URL}`);
        console.log(`[LocalModel] 🎯 Device: ${health.device}, Model: ${health.model_path}`);
        return { type: 'python-service', url: ML_SERVICE_URL };
      }
    }
    throw new Error(`ML service not ready: ${healthResponse.statusText}`);
  } catch (error) {
    console.warn('[LocalModel] ⚠️ Python ML service unavailable:', error.message);
    console.log('[LocalModel] 🔄 Will fall back to public models');
    throw error; // This triggers the fallback in disaster-pulse.js
  }

  console.log('[LocalModel] Loading CrisisTransformers model from local files...');

  // Verify essential files exist
  const requiredFiles = ['config.json', 'model.safetensors', 'tokenizer_config.json'];
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(LOCAL_MODEL_PATH, file)));
  if (missingFiles.length > 0) {
    throw new Error(`Missing required model files in ${LOCAL_MODEL_PATH}: ${missingFiles.join(', ')}`);
  }

  // Check if tokenizer.json exists, if not we'll need to create it from vocab.json
  const hasTokenizerJson = fs.existsSync(path.join(LOCAL_MODEL_PATH, 'tokenizer.json'));
  if (!hasTokenizerJson) {
    console.log('[LocalModel] ⚠️  tokenizer.json not found. Attempting to continue with available files...');
  }

  console.log('[LocalModel] Using HuggingFace API with token from .env');

  crisisClassifierPromise = (async () => {
  const originalAllowRemote = env.allowRemoteModels;

    try {
      // Configure environment to allow remote models with API token
      env.allowRemoteModels = true;
      
      // Set HuggingFace token if available
      if (process.env.HF_API_TOKEN) {
        console.log('[LocalModel] Using HF API token for private model access');
      }

      const pipelineInstance = await pipeline('text-classification', MODEL_ID, {
        device: 'cpu',
        auth_token: process.env.HF_API_TOKEN,
      });

      console.log('[LocalModel] ✅ CrisisTransformers model loaded successfully from HuggingFace!');
      return pipelineInstance;
    } catch (error) {
      console.error('[LocalModel] ❌ Failed to load CrisisTransformers:', error.message);
      console.error('[LocalModel] 💡 Check your HF_API_TOKEN in .env file');
      throw error;
    } finally {
      env.allowRemoteModels = originalAllowRemote;
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
 * Loads a NER model for location extraction.
 * This will auto-download if not present (smaller model ~100MB)
 */
export async function loadNERModel() {
  if (nerModel) return nerModel;
  if (nerModelPromise) return nerModelPromise;

  console.log('[LocalModel] Loading NER model for location extraction...');

  nerModelPromise = (async () => {
    try {
      const pipelineInstance = await pipeline('token-classification', 'dslim/bert-base-NER', {
        device: 'cpu',
      });

      console.log('[LocalModel] ✅ NER model loaded successfully!');
      return pipelineInstance;
    } catch (error) {
      console.error('[LocalModel] ❌ Failed to load NER model:', error.message);
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
 * Classifies a tweet using the Python ML service.
 */
export async function classifyTweetLocal(text) {
  try {
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    const response = await fetch(`${ML_SERVICE_URL}/classify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    
    if (!response.ok) {
      throw new Error(`ML service error: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`[LocalModel] 🎯 Classification: ${result.label} (${(result.confidence * 100).toFixed(1)}%)`);
    
    // Convert to format expected by DisasterPulse
    return {
      isCrisis: result.is_crisis,
      label: result.label,
      confidence: result.confidence,
      scores: result.scores
    };
  } catch (error) {
    console.error('[LocalModel] ❌ Classification failed:', error.message);
    throw error;
  }
}

/**
 * Extracts named entities (including locations) using the local NER model.
 */
export async function extractEntitiesLocal(text) {
  const ner = await loadNERModel();
  return ner(text);
}
