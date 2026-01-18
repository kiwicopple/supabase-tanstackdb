-- Migration: Create Projects, Tasks, and Comments tables
-- Example: React Project Manager

-- ============================================
-- Projects table
-- ============================================
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text not null default '#3b82f6',
  user_id text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create index for user_id lookups
create index if not exists idx_projects_user_id on projects(user_id);

-- ============================================
-- Tasks table (belongs to project)
-- ============================================
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date timestamptz,
  user_id text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create indexes for common queries
create index if not exists idx_tasks_project_id on tasks(project_id);
create index if not exists idx_tasks_user_id on tasks(user_id);
create index if not exists idx_tasks_status on tasks(status);
create index if not exists idx_tasks_priority on tasks(priority);

-- ============================================
-- Comments table (belongs to task)
-- ============================================
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  content text not null,
  user_id text not null,
  created_at timestamptz default now()
);

-- Create indexes for common queries
create index if not exists idx_comments_task_id on comments(task_id);
create index if not exists idx_comments_user_id on comments(user_id);

-- ============================================
-- Enable Row Level Security
-- ============================================
alter table projects enable row level security;
alter table tasks enable row level security;
alter table comments enable row level security;

-- ============================================
-- RLS Policies
-- These are permissive policies for demo purposes.
-- Customize for production based on your auth requirements.
-- ============================================

-- Projects policies
create policy "Users can view all projects"
  on projects for select
  using (true);

create policy "Users can insert their own projects"
  on projects for insert
  with check (true);

create policy "Users can update their own projects"
  on projects for update
  using (true);

create policy "Users can delete their own projects"
  on projects for delete
  using (true);

-- Tasks policies
create policy "Users can view all tasks"
  on tasks for select
  using (true);

create policy "Users can insert tasks"
  on tasks for insert
  with check (true);

create policy "Users can update tasks"
  on tasks for update
  using (true);

create policy "Users can delete tasks"
  on tasks for delete
  using (true);

-- Comments policies
create policy "Users can view all comments"
  on comments for select
  using (true);

create policy "Users can insert comments"
  on comments for insert
  with check (true);

create policy "Users can update their own comments"
  on comments for update
  using (true);

create policy "Users can delete their own comments"
  on comments for delete
  using (true);

-- ============================================
-- Enable Realtime
-- ============================================
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table comments;

-- ============================================
-- Updated_at trigger function
-- ============================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply trigger to projects
create trigger update_projects_updated_at
  before update on projects
  for each row
  execute function update_updated_at_column();

-- Apply trigger to tasks
create trigger update_tasks_updated_at
  before update on tasks
  for each row
  execute function update_updated_at_column();
