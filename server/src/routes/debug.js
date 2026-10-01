import express from 'express';
import { classifyCrisisBinary, classifySeverity } from '../nlp/ml-client.js';
import { analyzeText } from '../nlp/disaster-pulse.js';

const router = express.Router();

// POST /debug/model-test
// Body: { text: string }
router.post('/model-test', async (req, res) => {
  const { text } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Please provide `text` in the request body.' });
  }

  const results = {};

  try {
    // Try local binary model
    try {
      const bin = await classifyCrisisBinary(text);
      results.binary = bin;
    } catch (e) {
      results.binary = { error: e.message };
    }

    // Try local severity model
    try {
      const sev = await classifySeverity(text);
      results.severity = sev;
    } catch (e) {
      results.severity = { error: e.message };
    }

    // Also run full DisasterPulse analysis for comparison
    try {
      const dp = await analyzeText(text);
      results.disasterPulse = dp;
    } catch (e) {
      results.disasterPulse = { error: e.message };
    }

    return res.json(results);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
