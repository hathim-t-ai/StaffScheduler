// scripts/upsertVectors.js
// Fetch every row from staff, projects, and assignments, embed, and upsert into the vectors table

const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
const { encode, decode } = require('gpt-3-encoder');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Initialize Supabase client (use service role key for full privileges)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Maximum tokens per chunk
const MAX_TOKENS = 750;

// Utility to split text into token-limited chunks
function chunkTextByTokens(text, maxTokens) {
  const tokens = encode(text);
  const chunks = [];
  for (let i = 0; i < tokens.length; i += maxTokens) {
    const slice = tokens.slice(i, i + maxTokens);
    chunks.push(decode(slice));
  }
  return chunks;
}

// Fetch rows from a table
async function fetchRows(table) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) {
    console.error(`Error fetching from ${table}:`, error.message);
    return [];
  }
  return data;
}

// Main upsert routine
async function upsertVectors() {
  const tables = ['staff', 'projects', 'assignments'];
  for (const table of tables) {
    const rows = await fetchRows(table);
    for (const row of rows) {
      const docType = table;
      const docId = row.id;
      // Serialize row to descriptive string
      const text = Object.entries(row)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' \n');
      // Chunk into token-limited segments
      const chunks = chunkTextByTokens(text, MAX_TOKENS);
      // Create embeddings for all chunks
      try {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: chunks
        });
        const { data: embedData } = response;
        // Prepare vector records
        const records = embedData.map((item) => ({
          id: uuidv4(),
          doc_type: docType,
          doc_id: docId,
          embedding: item.embedding
        }));
        // Upsert into Supabase; treat empty error objects as success
        const { data: upsertedData, error: upsertError } = await supabase
          .from('vectors')
          .upsert(records);
        // Only log true errors (non-empty objects)
        if (upsertError && Object.keys(upsertError).length > 0) {
          console.error('Upsert error for', { docType, docId, recordsCount: records.length }, upsertError);
        } else {
          console.log(`Upserted ${records.length} vectors for ${docType} ID ${docId}`);
        }
      } catch (err) {
        console.error('Embedding error:', err.message);
      }
    }
  }
}

// Execute script
upsertVectors().then(() => console.log('Vector upsert completed')).catch(console.error); 