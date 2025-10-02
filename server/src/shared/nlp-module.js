
// Define keywords for severity classification (this part stays the same)
const SEVERITY_KEYWORDS = {
  Critical: ['collapse', 'explosion', 'active shooter', 'mass casualty', 'bomb'],
  High: ['fire', 'trapped', 'major accident', 'gunshots', 'hostage', 'flood'],
  Medium: ['robbery', 'assault', 'gas leak', 'protest', 'riot'],
  Low: ['suspicious person', 'theft', 'power outage', 'road closure'],
};

// The Hugging Face model we'll use for finding locations
const NER_API_URL = 'https://api-inference.huggingface.co/models/dslim/bert-base-NER';

/**
 * Analyzes text to extract crisis information like location and severity.
 * @param {string} text The message content to analyze.
 * @returns {Promise<object>} An object with extracted info.
 */
export async function processTextForCrisisInfo(text) {
  try {
    // --- 1. Extract Location using Hugging Face NER Model ---
    const response = await fetch(NER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (!response.ok) {
      throw new Error(`Hugging Face API failed with status: ${response.status}`);
    }

    const entities = await response.json();

    // Find entities labeled as location (I-LOC)
    const locations = entities
      .filter(entity => entity.entity_group === 'LOC')
      .map(entity => entity.word);

    // Join location words that might be split (e.g., "New", "York")
    const extractedLocation = locations.join(' ');

    // --- 2. Classify Severity using Keywords ---
    let severity = 'Low'; // Default severity
    const lowerCaseText = text.toLowerCase();
    for (const level of ['Critical', 'High', 'Medium']) {
      if (SEVERITY_KEYWORDS[level].some(keyword => lowerCaseText.includes(keyword))) {
        severity = level;
        break; // Stop at the highest severity found
      }
    }

    // --- 3. Return the structured data ---
    return {
      isCrisis: !!extractedLocation || severity !== 'Low',
      severity,
      extractedLocation: extractedLocation || null,
    };
  } catch (error) {
    console.error('Error in NLP processing:', error);
    return { isCrisis: false, severity: null, extractedLocation: null };
  }
}
