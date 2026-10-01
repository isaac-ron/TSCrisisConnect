// HTTP client for the Python ML service (ml-service/): the binary crisis model and the priority model.
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
// Generous: a free Render instance runs inference on 0.1 CPU
const TIMEOUT_MS = 30_000;

async function post(path, text) {
  const response = await fetch(`${ML_SERVICE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`ML service ${path} responded ${response.status}`);
  }
  return response.json();
}

/** @returns {Promise<{isCrisis: boolean, confidence: number}>} */
export async function classifyCrisisBinary(text) {
  const { is_crisis: isCrisis, confidence } = await post('/classify/binary', text);
  return { isCrisis, confidence };
}

/** @returns {Promise<{severity: 'Low'|'Medium'|'High'|'Critical', confidence: number}>} */
export async function classifySeverity(text) {
  const { severity, confidence } = await post('/classify/severity', text);
  return { severity, confidence };
}
