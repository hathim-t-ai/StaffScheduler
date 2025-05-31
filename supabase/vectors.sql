-- Enable extensions for UUIDs and vector similarity
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the vectors table
CREATE TABLE IF NOT EXISTS vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type TEXT NOT NULL,
  doc_id UUID NOT NULL,
  embedding VECTOR(1536) NOT NULL
);

-- RPC to match nearest vectors by Euclidean distance
CREATE OR REPLACE FUNCTION match_vectors(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 5
) RETURNS TABLE (
  id UUID,
  doc_type TEXT,
  doc_id UUID,
  distance FLOAT
) AS $$
  SELECT
    id,
    doc_type,
    doc_id,
    embedding <-> query_embedding AS distance
  FROM vectors
  ORDER BY embedding <-> query_embedding
  LIMIT match_count;
$$ LANGUAGE SQL STABLE; 