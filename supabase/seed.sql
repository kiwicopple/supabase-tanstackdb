-- Seed data for @supabase/tanstack-db-collection examples
-- Run this after migrations to populate test data

-- ============================================
-- Seed Projects, Tasks, and Comments
-- (React Example)
-- ============================================

-- Insert sample projects
insert into projects (id, name, description, color, user_id) values
  ('11111111-1111-1111-1111-111111111111', 'Website Redesign', 'Complete overhaul of the company website', '#3b82f6', 'demo-user'),
  ('22222222-2222-2222-2222-222222222222', 'Mobile App', 'iOS and Android app development', '#8b5cf6', 'demo-user'),
  ('33333333-3333-3333-3333-333333333333', 'API Integration', 'Third-party API integrations', '#22c55e', 'demo-user');

-- Insert sample tasks
insert into tasks (project_id, title, description, status, priority, user_id) values
  -- Website Redesign tasks
  ('11111111-1111-1111-1111-111111111111', 'Design new homepage', 'Create mockups for the new homepage layout', 'done', 'high', 'demo-user'),
  ('11111111-1111-1111-1111-111111111111', 'Implement responsive navigation', 'Mobile-first navigation component', 'in_progress', 'high', 'demo-user'),
  ('11111111-1111-1111-1111-111111111111', 'Update color scheme', 'Apply new brand colors throughout', 'todo', 'medium', 'demo-user'),
  ('11111111-1111-1111-1111-111111111111', 'Optimize images', 'Compress and lazy-load images', 'todo', 'low', 'demo-user'),

  -- Mobile App tasks
  ('22222222-2222-2222-2222-222222222222', 'Setup React Native project', 'Initialize project with TypeScript', 'done', 'high', 'demo-user'),
  ('22222222-2222-2222-2222-222222222222', 'Implement authentication flow', 'Login, signup, and password reset', 'in_progress', 'high', 'demo-user'),
  ('22222222-2222-2222-2222-222222222222', 'Build home screen', 'Main dashboard with key metrics', 'todo', 'medium', 'demo-user'),

  -- API Integration tasks
  ('33333333-3333-3333-3333-333333333333', 'Research payment APIs', 'Compare Stripe, Square, and PayPal', 'done', 'medium', 'demo-user'),
  ('33333333-3333-3333-3333-333333333333', 'Implement Stripe integration', 'Checkout and subscription flows', 'in_progress', 'high', 'demo-user'),
  ('33333333-3333-3333-3333-333333333333', 'Add webhook handlers', 'Handle payment events', 'todo', 'medium', 'demo-user');

-- Insert sample comments (for the first few tasks)
insert into comments (task_id, content, user_id)
select id, 'Looking good! The mockups are approved.', 'demo-user'
from tasks where title = 'Design new homepage';

insert into comments (task_id, content, user_id)
select id, 'Need to test on Safari mobile.', 'demo-user'
from tasks where title = 'Implement responsive navigation';

insert into comments (task_id, content, user_id)
select id, 'Also check tablet breakpoints.', 'demo-user'
from tasks where title = 'Implement responsive navigation';

-- ============================================
-- Seed Categories, Articles, Tags, and ArticleTags
-- (Next.js Example)
-- ============================================

-- Insert sample categories
insert into categories (id, name, slug, description, icon, color, user_id) values
  ('aaaa1111-1111-1111-1111-111111111111', 'Getting Started', 'getting-started', 'Introduction and setup guides', '🚀', '#3b82f6', 'demo-user'),
  ('aaaa2222-2222-2222-2222-222222222222', 'API Reference', 'api-reference', 'Complete API documentation', '📚', '#8b5cf6', 'demo-user'),
  ('aaaa3333-3333-3333-3333-333333333333', 'Tutorials', 'tutorials', 'Step-by-step tutorials', '📝', '#22c55e', 'demo-user'),
  ('aaaa4444-4444-4444-4444-444444444444', 'Best Practices', 'best-practices', 'Tips and recommendations', '💡', '#f59e0b', 'demo-user');

-- Insert sample tags
insert into tags (id, name, slug, color) values
  ('bbbb1111-1111-1111-1111-111111111111', 'React', 'react', '#61dafb'),
  ('bbbb2222-2222-2222-2222-222222222222', 'TypeScript', 'typescript', '#3178c6'),
  ('bbbb3333-3333-3333-3333-333333333333', 'Supabase', 'supabase', '#3ecf8e'),
  ('bbbb4444-4444-4444-4444-444444444444', 'Database', 'database', '#f59e0b'),
  ('bbbb5555-5555-5555-5555-555555555555', 'Authentication', 'authentication', '#ef4444'),
  ('bbbb6666-6666-6666-6666-666666666666', 'Realtime', 'realtime', '#8b5cf6');

-- Insert sample articles
insert into articles (id, category_id, title, slug, content, excerpt, published, featured, view_count, user_id) values
  (
    'cccc1111-1111-1111-1111-111111111111',
    'aaaa1111-1111-1111-1111-111111111111',
    'Quick Start Guide',
    'quick-start-guide',
    'This guide will help you get started with @supabase/tanstack-db-collection...',
    'Get up and running in 5 minutes with our quick start guide.',
    true,
    true,
    142,
    'demo-user'
  ),
  (
    'cccc2222-2222-2222-2222-222222222222',
    'aaaa1111-1111-1111-1111-111111111111',
    'Installation',
    'installation',
    'Install the package using npm or yarn...',
    'Step-by-step installation instructions.',
    true,
    false,
    89,
    'demo-user'
  ),
  (
    'cccc3333-3333-3333-3333-333333333333',
    'aaaa2222-2222-2222-2222-222222222222',
    'supabaseCollectionOptions',
    'supabase-collection-options',
    'The main function to create collection options for TanStack DB...',
    'Complete reference for the supabaseCollectionOptions function.',
    true,
    false,
    256,
    'demo-user'
  ),
  (
    'cccc4444-4444-4444-4444-444444444444',
    'aaaa2222-2222-2222-2222-222222222222',
    'Query Expressions',
    'query-expressions',
    'Learn how to build complex queries using the where helper...',
    'Build type-safe queries with the where helper functions.',
    true,
    false,
    178,
    'demo-user'
  ),
  (
    'cccc5555-5555-5555-5555-555555555555',
    'aaaa3333-3333-3333-3333-333333333333',
    'Building a Todo App',
    'building-a-todo-app',
    'In this tutorial, we will build a complete todo application...',
    'Learn the basics by building a todo app from scratch.',
    true,
    true,
    423,
    'demo-user'
  ),
  (
    'cccc6666-6666-6666-6666-666666666666',
    'aaaa3333-3333-3333-3333-333333333333',
    'Real-time Collaboration',
    'real-time-collaboration',
    'Add real-time features to your application...',
    'Enable real-time sync between multiple users.',
    false,
    false,
    0,
    'demo-user'
  ),
  (
    'cccc7777-7777-7777-7777-777777777777',
    'aaaa4444-4444-4444-4444-444444444444',
    'Optimistic Updates',
    'optimistic-updates',
    'Best practices for implementing optimistic updates...',
    'Make your UI feel instant with optimistic mutations.',
    true,
    false,
    312,
    'demo-user'
  );

-- Link articles to tags
insert into article_tags (article_id, tag_id) values
  -- Quick Start Guide: React, TypeScript, Supabase
  ('cccc1111-1111-1111-1111-111111111111', 'bbbb1111-1111-1111-1111-111111111111'),
  ('cccc1111-1111-1111-1111-111111111111', 'bbbb2222-2222-2222-2222-222222222222'),
  ('cccc1111-1111-1111-1111-111111111111', 'bbbb3333-3333-3333-3333-333333333333'),

  -- Installation: TypeScript, Supabase
  ('cccc2222-2222-2222-2222-222222222222', 'bbbb2222-2222-2222-2222-222222222222'),
  ('cccc2222-2222-2222-2222-222222222222', 'bbbb3333-3333-3333-3333-333333333333'),

  -- supabaseCollectionOptions: Supabase, Database
  ('cccc3333-3333-3333-3333-333333333333', 'bbbb3333-3333-3333-3333-333333333333'),
  ('cccc3333-3333-3333-3333-333333333333', 'bbbb4444-4444-4444-4444-444444444444'),

  -- Query Expressions: TypeScript, Database
  ('cccc4444-4444-4444-4444-444444444444', 'bbbb2222-2222-2222-2222-222222222222'),
  ('cccc4444-4444-4444-4444-444444444444', 'bbbb4444-4444-4444-4444-444444444444'),

  -- Building a Todo App: React, TypeScript, Supabase
  ('cccc5555-5555-5555-5555-555555555555', 'bbbb1111-1111-1111-1111-111111111111'),
  ('cccc5555-5555-5555-5555-555555555555', 'bbbb2222-2222-2222-2222-222222222222'),
  ('cccc5555-5555-5555-5555-555555555555', 'bbbb3333-3333-3333-3333-333333333333'),

  -- Real-time Collaboration: React, Supabase, Realtime
  ('cccc6666-6666-6666-6666-666666666666', 'bbbb1111-1111-1111-1111-111111111111'),
  ('cccc6666-6666-6666-6666-666666666666', 'bbbb3333-3333-3333-3333-333333333333'),
  ('cccc6666-6666-6666-6666-666666666666', 'bbbb6666-6666-6666-6666-666666666666'),

  -- Optimistic Updates: React, TypeScript
  ('cccc7777-7777-7777-7777-777777777777', 'bbbb1111-1111-1111-1111-111111111111'),
  ('cccc7777-7777-7777-7777-777777777777', 'bbbb2222-2222-2222-2222-222222222222');
