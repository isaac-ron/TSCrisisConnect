// Simple script to test the /debug/model-test endpoint

async function runTests() {
  const endpoint = 'http://localhost:3000/debug/model-test';

  const testCases = [
    { id: 'Crisis', text: 'There is a massive fire spreading in the downtown area, many buildings are burning.' },
    { id: 'Non-Crisis', text: 'Just watched a movie about a huge fire, it was intense!' },
    { id: 'Ambiguous', text: 'I hear sirens and see smoke near the bridge.' },
    { id: 'Low Severity', text: 'A small protest is forming at the city square, police are monitoring.' },
    { id: 'High Severity', text: 'Reports of an active shooter at the mall, multiple casualties.' },
  ];

  console.log(`🚀 Testing NLP models via endpoint: ${endpoint}\n`);

  for (const test of testCases) {
    console.log(`--- [TEST CASE: ${test.id}] ---`);
    console.log(`Input: "${test.text}"`);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: test.text }),
      });

      if (!response.ok) {
        console.error(`❌ Error: ${response.status} ${response.statusText}`);
        const errorBody = await response.text();
        console.error('Response:', errorBody);
        continue;
      }

      const result = await response.json();
      console.log('✅ Result:');
      console.log(JSON.stringify(result, null, 2));
      console.log('--------------------------------\n');

    } catch (error) {
      console.error(`❌ FAILED TO FETCH: ${error.message}`);
      console.log('--------------------------------\n');
    }
  }
}

runTests();
