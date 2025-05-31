-- Add email column to staff table
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS email TEXT; 