'use client'

import { createClient } from '@supabase/supabase-js'
import {
  supabaseCollectionOptions,
  where,
  createConsoleLogger,
} from '@supabase/tanstack-db-collection'

// Replace with your Supabase credentials
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============================================
// Type Definitions
// ============================================

export interface Project {
  id: string
  name: string
  description: string | null
  color: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  user_id: string
  created_at: string
  updated_at: string
}

export interface Comment {
  id: string
  task_id: string
  content: string
  user_id: string
  created_at: string
}

export type TaskStatus = Task['status']
export type TaskPriority = Task['priority']

// ============================================
// Collection Options
// ============================================

// Projects collection
export const projectsCollectionOptions = supabaseCollectionOptions<Project>({
  supabase,
  table: 'projects',
  primaryKey: 'id',
  syncMode: 'on-demand',
  defaultOrderBy: { column: 'created_at', ascending: false },
  realtime: {
    enabled: true,
    mode: 'invalidate-subsets',
  },
  logger: createConsoleLogger('[Projects]'),
})

// Tasks collection
export const tasksCollectionOptions = supabaseCollectionOptions<Task>({
  supabase,
  table: 'tasks',
  primaryKey: 'id',
  syncMode: 'on-demand',
  defaultOrderBy: { column: 'created_at', ascending: false },
  realtime: {
    enabled: true,
    mode: 'invalidate-subsets',
  },
  logger: createConsoleLogger('[Tasks]'),
})

// Comments collection
export const commentsCollectionOptions = supabaseCollectionOptions<Comment>({
  supabase,
  table: 'comments',
  primaryKey: 'id',
  syncMode: 'on-demand',
  defaultOrderBy: { column: 'created_at', ascending: true },
  realtime: {
    enabled: true,
    mode: 'patch', // Use patch mode for comments to see real-time updates
  },
  logger: createConsoleLogger('[Comments]'),
})

// Export the where helper for building queries
export { where }
