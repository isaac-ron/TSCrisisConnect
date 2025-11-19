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

// Set the cache directory to ml-service so models are loaded from there
env.cacheDir = LOCAL_MODEL_ROOT;
env.allowLocalModels = true;

console.log(`[LocalModel] Model path configured: ${LOCAL_MODEL_PATH}`);
console.log(`[LocalModel] Cache directory set to: ${LOCAL_MODEL_ROOT}`);

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
    console.log(`[LocalModel] 🔍 Attempting to connect to ML service at ${ML_SERVICE_URL}...`);
    
    const healthResponse = await fetch(`${ML_SERVICE_URL}/health`, { 
      signal: AbortSignal.timeout(10000) // 10 second timeout for Render cold starts
    });
    
    console.log(`[LocalModel] 📡 Health check response status: ${healthResponse.status}`);
    
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log(`[LocalModel] 📊 Health data:`, health);
      
      if (health.model_loaded) {
        console.log(`[LocalModel] ✅ Connected to Python ML service at ${ML_SERVICE_URL}`);
        console.log(`[LocalModel] 🎯 Device: ${health.device}, Model: ${health.model_path}`);
        return { type: 'python-service', url: ML_SERVICE_URL };
      } else {
        throw new Error(`ML service models not loaded yet. Status: ${JSON.stringify(health)}`);
      }
    }
    throw new Error(`ML service health check failed: ${healthResponse.status} ${healthResponse.statusText}`);
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
 * Loaders and wrappers for two local models:
 * - Binary crisis identifier (isCrisis: true/false)
 * - Severity classifier (Low/Medium/High/Critical)
 * These look for folders under `ml-service/CrisisTransformers/` named
 * `crisis-binary` and `crisis-severity`. If not found, callers should
 * fallback to remote/public models.
 */

let binaryModel = null;
let binaryModelPromise = null;
let severityModel = null;
let severityModelPromise = null;

// Candidate folder names to look for in `ml-service` or `ml-service/CrisisTransformers`
const BINARY_CANDIDATES = [
  'crisis-binary',
  'my_final_binary_model',
  'my_final_binary_model_4_class',
  'binary_model'
];

const SEVERITY_CANDIDATES = [
  'crisis-severity',
  'my_final_severity_model_4_class',
  'my_final_severity_model',
  'severity_model'
];

function findModelDir(candidates) {
  for (const name of candidates) {
    const p1 = path.join(LOCAL_MODEL_ROOT, 'CrisisTransformers', name);
    if (fs.existsSync(p1)) return p1;
    const p2 = path.join(LOCAL_MODEL_ROOT, name);
    if (fs.existsSync(p2)) return p2;
  }
  return null;
}

export async function loadBinaryModel() {
  // SafeTensors models are incompatible with @xenova/transformers
  // Use Python ML service instead
  throw new Error('Binary model requires Python ML service');
}

export async function loadSeverityModel() {
  // SafeTensors models are incompatible with @xenova/transformers
  // Return a marker that we should use Python service
  throw new Error('Severity model requires Python ML service');
}

/**
 * Classify whether a piece of text indicates a crisis using the Python ML service.
 * Returns { isCrisis: boolean, confidence: number }
 */
export async function classifyCrisisBinary(text) {
  try {
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    const response = await fetch(`${ML_SERVICE_URL}/classify/binary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      throw new Error(`Python ML service error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    return { isCrisis: result.is_crisis, confidence: result.confidence };
  } catch (err) {
    console.error('[LocalModel] ❌ classifyCrisisBinary failed:', err.message);
    throw err;
  }
}

/**
 * Classify severity using the Python ML service.
 * Returns { severity: 'Low'|'Medium'|'High'|'Critical', confidence: number }
 */
export async function classifySeverity(text) {
  try {
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    const response = await fetch(`${ML_SERVICE_URL}/classify/severity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      throw new Error(`Python ML service error: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    // Normalize the severity label from the model
    let severity = result.severity;
    const label = severity.toLowerCase();
    
    if (label.includes('low') || label.includes('0')) severity = 'Low';
    else if (label.includes('critical') || label.includes('3')) severity = 'Critical';
    else if (label.includes('high') || label.includes('2')) severity = 'High';
    else if (label.includes('medium') || label.includes('1')) severity = 'Medium';
    
    return { severity, confidence: result.confidence };
  } catch (err) {
    console.error('[LocalModel] ❌ classifySeverity failed:', err.message);
    throw err;
  }
}

/**
 * Classifies a tweet using the Python ML service (legacy fallback).
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
