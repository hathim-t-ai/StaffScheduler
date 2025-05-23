// orchestrator.js - MultiCrew orchestrator stub for Staff Scheduler
// Replace 'multi-crew' import with the actual package name when available

const axios = require('axios');

async function main() {
  try {
    const { data } = await axios.post(
      'http://127.0.0.1:8000/orchestrate',
      { date: new Date().toISOString().split('T')[0] }
    );
    console.log('Orchestration result:', data);
  } catch (err) {
    console.error('Error orchestrating:', err);
  }
}

main().catch(console.error); 