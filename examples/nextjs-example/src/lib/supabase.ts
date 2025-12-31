'use client'

import { createClient } from '@supabase/supabase-js'
import {
  supabaseCollectionOptions,
  where,
  createConsoleLogger,
} from '@supabase/tanstack-db-collection'

// Replace with your Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// Type Definitions
// ============================================

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string
  color: string
  user_id: string
  created_at: string
}

export interface Article {
  id: string
  category_id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  published: boolean
  featured: boolean
  view_count: number
  user_id: string
  created_at: string
  updated_at: string
}

export interface Tag {
  id: string
  name: string
  slug: string
  color: string
}

export interface ArticleTag {
  id: string
  article_id: string
  tag_id: string
}

// ============================================
// Collection Options
// ============================================

// Categories collection
export const categoriesCollectionOptions = supabaseCollectionOptions<Category>({
  supabase,
  table: 'categories',
  primaryKey: 'id',
  syncMode: 'on-demand',
  defaultOrderBy: { column: 'name', ascending: true },
  realtime: {
    enabled: true,
    mode: 'invalidate-subsets',
  },
  auth: {
    enabled: true,
    clearCacheOnChange: true,
  },
  logger: createConsoleLogger('[Categories]'),
})

// Articles collection
export const articlesCollectionOptions = supabaseCollectionOptions<Article>({
  supabase,
  table: 'articles',
  primaryKey: 'id',
  syncMode: 'on-demand',
  defaultOrderBy: { column: 'created_at', ascending: false },
  realtime: {
    enabled: true,
    mode: 'invalidate-subsets',
  },
  auth: {
    enabled: true,
    clearCacheOnChange: true,
  },
  logger: createConsoleLogger('[Articles]'),
})

// Tags collection
export const tagsCollectionOptions = supabaseCollectionOptions<Tag>({
  supabase,
  table: 'tags',
  primaryKey: 'id',
  syncMode: 'all', // Load all tags since there are usually few
  defaultOrderBy: { column: 'name', ascending: true },
  realtime: {
    enabled: true,
    mode: 'patch',
  },
  logger: createConsoleLogger('[Tags]'),
})

// Article-Tag junction table collection
export const articleTagsCollectionOptions = supabaseCollectionOptions<ArticleTag>({
  supabase,
  table: 'article_tags',
  primaryKey: 'id',
  syncMode: 'on-demand',
  realtime: {
    enabled: true,
    mode: 'invalidate-subsets',
  },
  logger: createConsoleLogger('[ArticleTags]'),
})

// Export the where helper for building queries
export { where }
