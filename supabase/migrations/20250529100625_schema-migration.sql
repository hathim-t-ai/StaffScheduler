-- Schema migration for Staff Scheduler
-- Translates Prisma models into Postgres tables with created_at/updated_at triggers

-- Create the staff table
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade text,
  department text,
  role text,
  city text,
  country text,
  skills text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.staff is 'Stores information about staff members.';

-- Create the project table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  partner_name text,
  team_lead text,
  budget float,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.projects is 'Stores information about projects.';

-- Create the assignment table
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff(id),
  project_id uuid not null references public.projects(id),
  date timestamptz not null,
  hours integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unique_staff_project_date unique (staff_id, project_id, date)
);

comment on table public.assignments is 'Stores staff assignments to projects.';

-- Create triggers for created_at and updated_at
create or replace function public.handle_created_at()
returns trigger as $$
begin
  new.created_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Attach triggers to staff table
create trigger staff_created_at
  before insert on public.staff
  for each row
  execute function public.handle_created_at();

create trigger staff_updated_at
  before update on public.staff
  for each row
  execute function public.handle_updated_at();

-- Attach triggers to projects table
create trigger projects_created_at
  before insert on public.projects
  for each row
  execute function public.handle_created_at();

create trigger projects_updated_at
  before update on public.projects
  for each row
  execute function public.handle_updated_at();

-- Attach triggers to assignments table
create trigger assignments_created_at
  before insert on public.assignments
  for each row
  execute function public.handle_created_at();

create trigger assignments_updated_at
  before update on public.assignments
  for each row
  execute function public.handle_updated_at();
