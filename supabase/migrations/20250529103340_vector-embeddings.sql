-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector columns to relevant tables
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS embedding vector(384);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Add comments to vector columns
COMMENT ON COLUMN public.staff.embedding IS 'Vector embedding for staff data';
COMMENT ON COLUMN public.projects.embedding IS 'Vector embedding for project data';
