// Test script to verify local DisasterPulse model works with mock tweets
// Uses Node.js built-in fetch (available in Node 18+)

const API_URL = 'http://localhost:3000';

async function testMockTweetIngestion() {
  console.log('='.repeat(60));
  console.log('Testing DisasterPulse with Local Model');
  console.log('='.repeat(60));
  console.log('\n🧪 Starting test...\n');

  try {
    // Trigger tweet ingestion
    console.log('📥 Calling /social/ingest-tweets endpoint...\n');
    const response = await fetch(`${API_URL}/social/ingest-tweets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log('='.repeat(60));
    console.log('✅ INGESTION COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n📊 Results:`);
    console.log(`   - Tweets processed: ${result.message}`);
    console.log(`   - Crisis alerts saved: ${result.alerts?.length || 0}\n`);

    if (result.alerts && result.alerts.length > 0) {
      console.log('🚨 Detected Crisis Alerts:\n');
      result.alerts.forEach((alert, index) => {
        console.log(`${index + 1}. ${alert.description.substring(0, 80)}...`);
        console.log(`   Type: ${alert.crisisType || 'N/A'}`);
        console.log(`   Severity: ${alert.severity || 'N/A'}`);
        console.log(`   Location: ${alert.extractedLocation || 'Not extracted'}`);
        if (alert.latitude && alert.longitude) {
          console.log(`   Coordinates: [${alert.latitude}, ${alert.longitude}]`);
        }
        console.log('');
      });
    } else {
      console.log('⚠️  No crisis alerts were detected in the mock tweets.');
      console.log('   This could mean the model filtered them out as non-crisis.\n');
    }

    // Fetch all social alerts
    console.log('='.repeat(60));
    console.log('📋 Fetching all social alerts from database...');
    console.log('='.repeat(60));
    
    const alertsResponse = await fetch(`${API_URL}/social/social-alerts`);
    const allAlerts = await alertsResponse.json();
    
    console.log(`\n✅ Total alerts in database: ${allAlerts.length}\n`);
    
    if (allAlerts.length > 0) {
      console.log('Recent alerts:');
      allAlerts.slice(0, 5).forEach((alert, index) => {
        console.log(`\n${index + 1}. ${alert.description.substring(0, 80)}...`);
        console.log(`   Severity: ${alert.severity}, Type: ${alert.crisisType || 'N/A'}`);
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ TEST COMPLETE - Local model is working!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    console.error('\nMake sure:');
    console.error('  1. The server is running on port 3000');
    console.error('  2. The local model files are in ./nlp-service');
    console.error('  3. @xenova/transformers is installed');
    console.error('='.repeat(60));
  }
}

// Run the test
testMockTweetIngestion();
