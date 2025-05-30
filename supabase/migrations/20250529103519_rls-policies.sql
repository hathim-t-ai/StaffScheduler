-- Enable RLS and create service role bypass
CREATE OR REPLACE FUNCTION public.handle_created_at() RETURNS trigger AS $$
BEGIN
  NEW.created_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Staff table policies
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service full access" ON staff
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Drop existing triggers if they exist to prevent duplicates
DROP TRIGGER IF EXISTS staff_created_at ON staff;
DROP TRIGGER IF EXISTS staff_updated_at ON staff;

CREATE TRIGGER staff_created_at BEFORE INSERT ON staff
  FOR EACH ROW EXECUTE FUNCTION handle_created_at();
  
CREATE TRIGGER staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Projects table policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service full access" ON projects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Assignments table policies
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service full access" ON assignments
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);