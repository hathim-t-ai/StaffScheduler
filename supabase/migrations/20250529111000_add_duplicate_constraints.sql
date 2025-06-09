-- Migration to add duplicate prevention constraints
-- Add unique constraint for staff based on name, grade, and department
ALTER TABLE staff ADD CONSTRAINT unique_staff_name_grade_department UNIQUE (name, grade, department);

-- Remove the old unique constraint on project name only and add new constraint for name + partner
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_name_key;
ALTER TABLE projects ADD CONSTRAINT unique_project_name_partner UNIQUE (name, partner_name); 