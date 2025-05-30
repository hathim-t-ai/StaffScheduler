const fs = require('fs');
const readline = require('readline');

// Create read interface for assignments.csv
const rl = readline.createInterface({ input: fs.createReadStream('assignments.csv'), crlfDelay: Infinity });

// Create write stream for cleaned CSV
const out = fs.createWriteStream('assignments_clean.csv');

rl.on('line', (line) => {
  // Handle header line
  if (line.startsWith('id,')) {
    out.write('id,staff_id,project_id,date,hours\n');
    return;
  }
  // Parse CSV line
  const parts = line.split(',');
  const [id, staffId, projectId, dateMs, hours] = parts;
  // Convert milliseconds to ISO date (YYYY-MM-DD)
  const ms = Number(dateMs);
  const isoDate = new Date(ms).toISOString().split('T')[0];
  // Write cleaned line
  out.write(`${id},${staffId},${projectId},${isoDate},${hours}\n`);
});

rl.on('close', () => {
  console.log('Generated assignments_clean.csv');
}); 