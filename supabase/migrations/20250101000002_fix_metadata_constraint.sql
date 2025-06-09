-- Fix metadata column constraint issue
-- Make metadata column nullable and set default empty object

-- Remove NOT NULL constraint from metadata column if it exists
ALTER TABLE staff ALTER COLUMN metadata DROP NOT NULL;

-- Set default value for metadata column
ALTER TABLE staff ALTER COLUMN metadata SET DEFAULT '{}';

-- Update any existing NULL values to empty object
UPDATE staff SET metadata = '{}' WHERE metadata IS NULL; 