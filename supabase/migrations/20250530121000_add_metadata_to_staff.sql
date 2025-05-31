-- Add metadata column to staff table
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'; 