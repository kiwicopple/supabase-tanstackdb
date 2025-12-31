# React Example

A simple todo app demonstrating `@supabase/tanstack-db-collection` with React.

## Setup

1. Create a Supabase project and add a `todos` table:

```sql
create table todos (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  completed boolean default false,
  user_id text not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table todos enable row level security;

-- Allow all operations for now (customize for production)
create policy "Allow all" on todos for all using (true);
```

2. Copy `.env.example` to `.env` and add your Supabase credentials:

```bash
cp .env.example .env
```

3. Install dependencies:

```bash
npm install
```

4. Run the development server:

```bash
npm run dev
```

## Features Demonstrated

- **Query-driven sync**: Filter todos by status (all/active/completed)
- **Optimistic mutations**: Instant UI updates with server reconciliation
- **Realtime subscriptions**: Automatic cache invalidation when data changes
- **Type safety**: Full TypeScript support
