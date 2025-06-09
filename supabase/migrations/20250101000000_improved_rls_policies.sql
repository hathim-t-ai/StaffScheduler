-- Improved RLS policies with better security (Safe version without strict constraints)
-- This migration adds proper user authentication without breaking existing data

-- First, drop existing policies
DROP POLICY IF EXISTS "Service full access" ON staff;
DROP POLICY IF EXISTS "Service full access" ON projects;
DROP POLICY IF EXISTS "Service full access" ON assignments;

-- Add validation functions (already added in another migration)
CREATE OR REPLACE FUNCTION validate_staff_name(name text)
RETURNS boolean AS $$
BEGIN
  -- Name must be non-empty, contain only letters, spaces, hyphens, apostrophes
  -- and be between 2 and 100 characters
  RETURN name IS NOT NULL 
    AND length(trim(name)) >= 2 
    AND length(trim(name)) <= 100
    AND trim(name) ~ '^[a-zA-Z\s\-'']+$';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_project_name(name text)
RETURNS boolean AS $$
BEGIN
  -- Project name must be non-empty, contain only letters, numbers, spaces, hyphens
  -- and be between 2 and 100 characters
  RETURN name IS NOT NULL 
    AND length(trim(name)) >= 2 
    AND length(trim(name)) <= 100
    AND trim(name) ~ '^[a-zA-Z0-9\s\-]+$';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_email(email text)
RETURNS boolean AS $$
BEGIN
  -- Email validation (basic pattern)
  RETURN email IS NULL OR email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$';
END;
$$ LANGUAGE plpgsql;

-- Note: Check constraints will be added in a future migration after data cleanup
-- This ensures existing data is not affected during the upgrade

-- Create new RLS policies

-- Staff table policies
CREATE POLICY "Allow service role full access to staff" ON staff
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read staff" ON staff
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert staff" ON staff
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update staff" ON staff
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete staff" ON staff
  FOR DELETE
  TO authenticated
  USING (true);

-- Projects table policies
CREATE POLICY "Allow service role full access to projects" ON projects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read projects" ON projects
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert projects" ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update projects" ON projects
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete projects" ON projects
  FOR DELETE
  TO authenticated
  USING (true);

-- Assignments table policies
CREATE POLICY "Allow service role full access to assignments" ON assignments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read assignments" ON assignments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert assignments" ON assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update assignments" ON assignments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete assignments" ON assignments
  FOR DELETE
  TO authenticated
  USING (true);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(name);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_assignments_staff_date ON assignments(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_assignments_project_date ON assignments(project_id, date);

-- Add comments
COMMENT ON FUNCTION validate_staff_name(text) IS 'Validates staff name format and length';
COMMENT ON FUNCTION validate_project_name(text) IS 'Validates project name format and length';
COMMENT ON FUNCTION validate_email(text) IS 'Validates email format'; 