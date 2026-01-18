-- Migration: Create Categories, Articles, Tags, and ArticleTags tables
-- Example: Next.js Knowledge Base

-- ============================================
-- Categories table
-- ============================================
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  icon text not null default '📁',
  color text not null default '#3b82f6',
  user_id text not null,
  created_at timestamptz default now()
);

-- Create indexes for common queries
create index if not exists idx_categories_slug on categories(slug);
create index if not exists idx_categories_user_id on categories(user_id);

-- ============================================
-- Articles table (belongs to category)
-- ============================================
create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id) on delete cascade,
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

-- Create indexes for common queries
create index if not exists idx_articles_category_id on articles(category_id);
create index if not exists idx_articles_slug on articles(slug);
create index if not exists idx_articles_user_id on articles(user_id);
create index if not exists idx_articles_published on articles(published);
create index if not exists idx_articles_featured on articles(featured);

-- Full-text search index for title and excerpt
create index if not exists idx_articles_title_search on articles using gin(to_tsvector('english', title));
create index if not exists idx_articles_excerpt_search on articles using gin(to_tsvector('english', coalesce(excerpt, '')));

-- ============================================
-- Tags table
-- ============================================
create table if not exists tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  color text not null default '#8b5cf6'
);

-- Create index for slug lookups
create index if not exists idx_tags_slug on tags(slug);

-- ============================================
-- Article-Tag junction table (many-to-many)
-- ============================================
create table if not exists article_tags (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  created_at timestamptz default now(),
  unique(article_id, tag_id)
);

-- Create indexes for lookups
create index if not exists idx_article_tags_article_id on article_tags(article_id);
create index if not exists idx_article_tags_tag_id on article_tags(tag_id);

-- ============================================
-- Enable Row Level Security
-- ============================================
alter table categories enable row level security;
alter table articles enable row level security;
alter table tags enable row level security;
alter table article_tags enable row level security;

-- ============================================
-- RLS Policies
-- These are permissive policies for demo purposes.
-- Customize for production based on your auth requirements.
-- ============================================

-- Categories policies
create policy "Anyone can view categories"
  on categories for select
  using (true);

create policy "Users can insert categories"
  on categories for insert
  with check (true);

create policy "Users can update categories"
  on categories for update
  using (true);

create policy "Users can delete categories"
  on categories for delete
  using (true);

-- Articles policies
create policy "Anyone can view published articles"
  on articles for select
  using (true);

create policy "Users can insert articles"
  on articles for insert
  with check (true);

create policy "Users can update articles"
  on articles for update
  using (true);

create policy "Users can delete articles"
  on articles for delete
  using (true);

-- Tags policies
create policy "Anyone can view tags"
  on tags for select
  using (true);

create policy "Users can insert tags"
  on tags for insert
  with check (true);

create policy "Users can update tags"
  on tags for update
  using (true);

create policy "Users can delete tags"
  on tags for delete
  using (true);

-- Article_tags policies
create policy "Anyone can view article_tags"
  on article_tags for select
  using (true);

create policy "Users can insert article_tags"
  on article_tags for insert
  with check (true);

create policy "Users can delete article_tags"
  on article_tags for delete
  using (true);

-- ============================================
-- Enable Realtime
-- ============================================
alter publication supabase_realtime add table categories;
alter publication supabase_realtime add table articles;
alter publication supabase_realtime add table tags;
alter publication supabase_realtime add table article_tags;

-- ============================================
-- Updated_at trigger for articles
-- ============================================
-- Reuse the update_updated_at_column function from the previous migration

create trigger update_articles_updated_at
  before update on articles
  for each row
  execute function update_updated_at_column();

-- ============================================
-- Increment view count function
-- ============================================
create or replace function increment_article_view_count(article_uuid uuid)
returns void as $$
begin
  update articles
  set view_count = view_count + 1
  where id = article_uuid;
end;
$$ language plpgsql security definer;
