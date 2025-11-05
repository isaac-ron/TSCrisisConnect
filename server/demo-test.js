// Demo script to test the complete crisis classification pipeline
import { processTextForCrisisInfo } from './src/shared/nlp-module.js';

console.log('🔥 === CRISIS CLASSIFICATION DEMO ===\n');

const testCases = [
  { name: '🚨 Critical Emergency', text: 'Massive explosion downtown Los Angeles, multiple casualties reported' },
  { name: '🔥 Building Fire', text: 'Fire in apartment building on 5th Street, people trapped on upper floors' },
  { name: '🌪️ Natural Disaster', text: 'Tornado spotted near Chicago airport, seek shelter immediately' },
  { name: '📰 Non-Crisis', text: 'Traffic jam on highway due to construction work' },
  { name: '🎬 False Alarm', text: 'Movie about disasters was really exciting last night' }
];

for (const testCase of testCases) {
  console.log(`${testCase.name}: ${testCase.text}`);
  try {
    const result = await processTextForCrisisInfo(testCase.text);
    console.log(`✅ Crisis: ${result.isCrisis ? 'YES' : 'NO'} | Type: ${result.crisisType || 'N/A'} | Severity: ${result.severity} | Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    if (result.extractedLocation) {
      console.log(`📍 Location: ${result.extractedLocation} [${result.latitude}, ${result.longitude}]`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  console.log('');
}