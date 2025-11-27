import { GoogleGenAI } from '@google/genai';

const MODEL_NAME = 'gemini-2.0-flash';

// Function to get API key (lazy evaluation)
function getApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[ImageCrisisDetector] ❌ GEMINI_API_KEY is not set in environment variables');
    throw new Error('GEMINI_API_KEY is required but not configured');
  }
  return apiKey;
}

/**
 * Analyzes an image to detect crisis situations using Google's Gemini Vision API.
 * @param {string} imageData - Base64 encoded image data (with data URI prefix like "data:image/jpeg;base64,...")
 * @returns {Promise<object>} Analysis result with crisis detection information
 */
export async function analyzeCrisisImage(imageData) {
  try {
    console.log('[ImageCrisisDetector] 🖼️  Starting image analysis...');
    const client = new GoogleGenAI({ apiKey: getApiKey() });

    if (!imageData) {
      console.warn('[ImageCrisisDetector] ⚠️  No image data provided');
      return {
        isCrisis: false,
        confidence: 0,
        crisisType: null,
        severity: 'Low',
        description: null,
        visualIndicators: [],
      };
    }

    // Extract base64 data and mime type from data URI
    const matches = imageData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      console.error('[ImageCrisisDetector] ❌ Invalid image data format');
      return {
        isCrisis: false,
        confidence: 0,
        error: 'Invalid image format',
      };
    }

    const mimeType = matches[1];
    const base64Data = matches[2];

    console.log(`[ImageCrisisDetector] 📊 Image type: ${mimeType}, Size: ${Math.round(base64Data.length / 1024)}KB`);

    // Craft a detailed prompt for crisis detection
    const prompt = `Analyze this image for crisis or emergency situations. Provide a detailed assessment in the following JSON format:

{
  "isCrisis": boolean (true if any emergency/crisis detected),
  "confidence": number (0.0 to 1.0, your confidence in the assessment),
  "crisisType": string (specific type: "fire", "flood", "earthquake damage", "vehicle accident", "building collapse", "violence", "medical emergency", "storm damage", "chemical spill", "evacuation", "rescue operation", or "none"),
  "severity": string ("Critical", "High", "Medium", "Low"),
  "description": string (brief description of what you see that indicates a crisis),
  "visualIndicators": array of strings (list specific visual elements: smoke, flames, debris, damaged structures, emergency vehicles, injured people, flood water, etc.),
  "location": string or null (any identifiable location information visible in the image, like landmarks, street signs, building names),
  "peopleAffected": boolean (true if people appear to be in danger or affected),
  "emergencyResponse": boolean (true if emergency responders or vehicles are visible)
}

IMPORTANT: 
- Only mark as crisis if there's clear evidence of an emergency situation
- Do not flag normal traffic, construction work, or everyday activities as crises
- Be conservative but accurate in your assessment
- If unsure, set confidence lower than 0.6`;

    // Call Gemini API with image and prompt using the new API
    const result = await client.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
    });

    const text = result.text;
    
    console.log('[ImageCrisisDetector] 📥 Raw Gemini response:', text);

    // Parse JSON response
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      analysis = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('[ImageCrisisDetector] ❌ Failed to parse JSON response:', parseError);
      // Fallback: try to extract information from plain text
      analysis = extractCrisisInfoFromText(text);
    }

    console.log('[ImageCrisisDetector] ✅ Analysis complete:', {
      isCrisis: analysis.isCrisis,
      crisisType: analysis.crisisType,
      confidence: analysis.confidence,
      severity: analysis.severity,
    });

    return {
      isCrisis: analysis.isCrisis || false,
      confidence: analysis.confidence || 0,
      crisisType: analysis.crisisType || null,
      severity: analysis.severity || 'Low',
      description: analysis.description || null,
      visualIndicators: analysis.visualIndicators || [],
      location: analysis.location || null,
      peopleAffected: analysis.peopleAffected || false,
      emergencyResponse: analysis.emergencyResponse || false,
    };

  } catch (error) {
    console.error('[ImageCrisisDetector] ❌ Error analyzing image:', error.message);
    console.error('[ImageCrisisDetector] Stack trace:', error.stack);
    
    return {
      isCrisis: false,
      confidence: 0,
      error: error.message,
      crisisType: null,
      severity: 'Low',
    };
  }
}

/**
 * Fallback text extraction if JSON parsing fails
 * @param {string} text - Plain text response from Gemini
 * @returns {object} Extracted crisis information
 */
function extractCrisisInfoFromText(text) {
  const lowerText = text.toLowerCase();
  
  // Check for crisis indicators in text
  const crisisKeywords = ['fire', 'flood', 'accident', 'emergency', 'crisis', 'disaster', 'collapse', 'damage', 'danger'];
  const isCrisis = crisisKeywords.some(keyword => lowerText.includes(keyword));
  
  // Try to extract crisis type
  let crisisType = null;
  const typePatterns = {
    'fire': /\b(fire|flames|burning|smoke)\b/i,
    'flood': /\b(flood|flooding|water)\b/i,
    'vehicle accident': /\b(accident|crash|collision|vehicle)\b/i,
    'building collapse': /\b(collapse|collapsed|structural)\b/i,
    'storm damage': /\b(storm|hurricane|tornado|wind)\b/i,
  };
  
  for (const [type, pattern] of Object.entries(typePatterns)) {
    if (pattern.test(text)) {
      crisisType = type;
      break;
    }
  }
  
  return {
    isCrisis,
    confidence: isCrisis ? 0.6 : 0.3,
    crisisType: crisisType || 'emergency situation',
    severity: isCrisis ? 'Medium' : 'Low',
    description: text.substring(0, 200),
    visualIndicators: [],
  };
}

/**
 * Combines text-based and image-based crisis analysis for enhanced detection
 * @param {string} textContent - Text description from user
 * @param {string} imageData - Base64 encoded image (optional)
 * @returns {Promise<object>} Combined analysis result
 */
export async function analyzeMultimodalCrisis(textContent, imageData = null) {
  console.log('[ImageCrisisDetector] 🔍 Starting multimodal analysis...');
  
  const results = {
    textAnalysis: null,
    imageAnalysis: null,
    combined: {
      isCrisis: false,
      confidence: 0,
      crisisType: null,
      severity: 'Low',
      source: 'none',
    },
  };

  // Analyze image if provided
  if (imageData) {
    results.imageAnalysis = await analyzeCrisisImage(imageData);
    
    if (results.imageAnalysis.isCrisis) {
      results.combined = {
        isCrisis: true,
        confidence: results.imageAnalysis.confidence,
        crisisType: results.imageAnalysis.crisisType,
        severity: results.imageAnalysis.severity,
        description: results.imageAnalysis.description,
        source: 'image',
        visualIndicators: results.imageAnalysis.visualIndicators,
        location: results.imageAnalysis.location,
      };
      
      console.log('[ImageCrisisDetector] ✅ Crisis detected in image with high confidence');
    }
  }

  console.log('[ImageCrisisDetector] 🎯 Multimodal analysis complete');
  return results;
}
