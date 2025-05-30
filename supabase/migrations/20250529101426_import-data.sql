-- Import data from CSV files into Supabase tables

-- Disabled server-side CSV import; will use client-side psql \copy instead
-- COPY public.staff (id, name, grade, department, role, city, country, skills, created_at, updated_at)
--   FROM 'staff.csv' DELIMITER ',' CSV HEADER;

-- COPY public.projects (id, name, description, partner_name, team_lead, budget, created_at, updated_at)
--   FROM 'projects.csv' DELIMITER ',' CSV HEADER;

-- COPY public.assignments (id, staff_id, project_id, date, hours, created_at, updated_at)
--   FROM 'assignments.csv' DELIMITER ',' CSV HEADER;
