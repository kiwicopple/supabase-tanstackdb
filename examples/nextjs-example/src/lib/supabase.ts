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

// Define the Todo type
export interface Todo {
  id: string
  title: string
  completed: boolean
  user_id: string
  created_at: string
}

// Create collection options for todos
export const todosCollectionOptions = supabaseCollectionOptions<Todo>({
  supabase,
  table: 'todos',
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
    onSessionChange: (hasSession) => {
      console.log('Session changed:', hasSession ? 'logged in' : 'logged out')
    },
  },
  logger: createConsoleLogger('[Todos]'),
})

// Export the where helper for building queries
export { where }
