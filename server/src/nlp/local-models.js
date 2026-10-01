// Small transformers.js models that run inside the API server (no ML service needed):
// zero-shot classification for crisis type, and NER for location extraction.
import path from 'path';
import { fileURLToPath } from 'url';
import { env, pipeline } from '@xenova/transformers';

env.cacheDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.model-cache');

const loaded = new Map();

// Loads each model once; a failed load is retried on the next call.
function load(task, model) {
  const key = `${task}:${model}`;
  if (!loaded.has(key)) {
    const promise = pipeline(task, model, { quantized: true });
    promise.catch(() => loaded.delete(key));
    loaded.set(key, promise);
  }
  return loaded.get(key);
}

/** @returns {Promise<{label: string, score: number}>} the best of `labels` */
export async function classifyZeroShot(text, labels) {
  const classifier = await load('zero-shot-classification', 'Xenova/distilbert-base-uncased-mnli');
  const result = await classifier(text, labels);
  return { label: result.labels[0], score: result.scores[0] };
}

/** @returns {Promise<Array<{entity: string, score: number, index: number, word: string}>>} */
export async function extractEntities(text) {
  const ner = await load('token-classification', 'Xenova/bert-base-NER');
  return ner(text);
}
