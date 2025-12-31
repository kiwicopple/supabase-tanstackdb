# React + Supabase Collection Example

A project management app demonstrating `@supabase/tanstack-db-collection` with multiple related tables.

## Features

- **Projects**: Create and manage projects with custom colors
- **Tasks**: Track tasks with status (todo/in_progress/done) and priority (low/medium/high)
- **Comments**: Add comments to tasks with real-time updates
- **Query-driven sync**: Load only the data you need based on filters
- **Optimistic mutations**: Instant UI updates with automatic rollback on error
- **Realtime**: Live updates via Supabase Realtime

## Database Schema

Create these tables in your Supabase project:

```sql
-- Projects table
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text not null default '#3b82f6',
  user_id text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tasks table (belongs to project)
create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date timestamptz,
  user_id text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Comments table (belongs to task)
create table comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references tasks(id) on delete cascade,
  content text not null,
  user_id text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table projects enable row level security;
alter table tasks enable row level security;
alter table comments enable row level security;

-- RLS Policies (allow all for demo - customize for production)
create policy "Allow all for projects" on projects for all using (true);
create policy "Allow all for tasks" on tasks for all using (true);
create policy "Allow all for comments" on comments for all using (true);

-- Enable Realtime
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table comments;
```

## Setup

1. Create a `.env` file from the example:

```bash
cp .env.example .env
```

2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

## Key Concepts Demonstrated

### Multiple Collections
```typescript
// Define collections for each table
export const projectsCollectionOptions = supabaseCollectionOptions<Project>({...})
export const tasksCollectionOptions = supabaseCollectionOptions<Task>({...})
export const commentsCollectionOptions = supabaseCollectionOptions<Comment>({...})
```

### Foreign Key Filtering
```typescript
// Load tasks for a specific project
const result = await tasksCollectionOptions.load({
  meta: {
    loadSubsetOptions: {
      where: where.eq('project_id', selectedProjectId),
    },
  },
})
```

### Complex Queries
```typescript
// Combine multiple filters with AND
const conditions = []
conditions.push(where.eq('project_id', projectId))
conditions.push(where.eq('status', 'in_progress'))
conditions.push(where.ilike('title', `%${search}%`))

loadSubsetOptions.where = where.and(...conditions)
```

### Different Realtime Modes
```typescript
// Use 'invalidate-subsets' for projects/tasks (refresh on change)
realtime: { enabled: true, mode: 'invalidate-subsets' }

// Use 'patch' for comments (apply changes directly)
realtime: { enabled: true, mode: 'patch' }
```

## Project Structure

```
src/
├── App.tsx          # Main app with ProjectList, TaskItem, CommentsSection
├── supabase.ts      # Supabase client and collection options
├── main.tsx         # React entry point
└── vite-env.d.ts    # Vite types
```

## Tech Stack

- React 18
- Vite
- TypeScript
- @supabase/supabase-js
- @supabase/tanstack-db-collection
