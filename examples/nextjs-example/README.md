# Next.js + Supabase Collection Example

A knowledge base app demonstrating `@supabase/tanstack-db-collection` with Next.js 14 (App Router) and multiple related tables including many-to-many relationships.

## Features

- **Categories**: Organize articles with custom icons and colors
- **Articles**: Create and manage content with publish/feature states
- **Tags**: Many-to-many tagging system via junction table
- **Search**: Full-text search across title and excerpt with OR queries
- **Query-driven sync**: Load only the data you need based on filters
- **Auth session handling**: Automatic cache clearing on session change
- **Realtime**: Live updates via Supabase Realtime

## Database Schema

Create these tables in your Supabase project:

```sql
-- Categories table
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon text not null default '📁',
  color text not null default '#3b82f6',
  user_id text not null,
  created_at timestamptz default now()
);

-- Articles table (belongs to category)
create table articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete cascade,
  title text not null,
  slug text not null,
  content text not null,
  excerpt text,
  published boolean default false,
  featured boolean default false,
  view_count integer default 0,
  user_id text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tags table
create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  color text not null default '#8b5cf6'
);

-- Article-Tag junction table (many-to-many)
create table article_tags (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  unique(article_id, tag_id)
);

-- Enable RLS
alter table categories enable row level security;
alter table articles enable row level security;
alter table tags enable row level security;
alter table article_tags enable row level security;

-- RLS Policies (allow all for demo - customize for production)
create policy "Allow all for categories" on categories for all using (true);
create policy "Allow all for articles" on articles for all using (true);
create policy "Allow all for tags" on tags for all using (true);
create policy "Allow all for article_tags" on article_tags for all using (true);

-- Enable Realtime
alter publication supabase_realtime add table categories;
alter publication supabase_realtime add table articles;
alter publication supabase_realtime add table tags;
alter publication supabase_realtime add table article_tags;
```

## Setup

1. Create a `.env.local` file from the example:

```bash
cp .env.example .env.local
```

2. Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
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

### Multiple Collections with Different Sync Modes
```typescript
// On-demand sync for categories and articles
export const categoriesCollectionOptions = supabaseCollectionOptions<Category>({
  syncMode: 'on-demand',
  ...
})

// Load all tags upfront (small dataset)
export const tagsCollectionOptions = supabaseCollectionOptions<Tag>({
  syncMode: 'all',
  ...
})
```

### Many-to-Many Relationships
```typescript
// Article-Tag junction table
export const articleTagsCollectionOptions = supabaseCollectionOptions<ArticleTag>({
  table: 'article_tags',
  ...
})

// Load tags for visible articles using IN query
const result = await articleTagsCollectionOptions.load({
  meta: {
    loadSubsetOptions: {
      where: where.in('article_id', articleIds),
    },
  },
})
```

### OR Queries for Search
```typescript
// Search in title OR excerpt
conditions.push(
  where.or(
    where.ilike('title', `%${searchQuery}%`),
    where.ilike('excerpt', `%${searchQuery}%`)
  )
)
```

### Auth Session Handling
```typescript
export const articlesCollectionOptions = supabaseCollectionOptions<Article>({
  auth: {
    enabled: true,
    clearCacheOnChange: true, // Prevent cross-user data leakage
  },
  ...
})
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx   # Root layout with global styles
│   └── page.tsx     # Main page with CategorySidebar, TagFilter, ArticleCard
└── lib/
    └── supabase.ts  # Supabase client and collection options
```

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- @supabase/supabase-js
- @supabase/tanstack-db-collection
