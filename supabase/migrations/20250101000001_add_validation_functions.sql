-- Add validation functions without strict constraints
-- This migration is safer and won't break existing data

-- Add validation functions
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

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_staff_name ON staff(name);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_assignments_staff_date ON assignments(staff_id, date);
CREATE INDEX IF NOT EXISTS idx_assignments_project_date ON assignments(project_id, date);

-- Add comments
COMMENT ON FUNCTION validate_staff_name(text) IS 'Validates staff name format and length';
COMMENT ON FUNCTION validate_project_name(text) IS 'Validates project name format and length';
COMMENT ON FUNCTION validate_email(text) IS 'Validates email format';

-- Note: Constraints will be added in a future migration after data cleanup 