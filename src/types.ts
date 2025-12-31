import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Logger interface for observability
 */
export interface Logger {
  debug: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

/**
 * Error context passed to onError callback
 */
export interface ErrorContext {
  op: 'load' | 'insert' | 'update' | 'delete'
}

/**
 * Realtime configuration options
 */
export interface RealtimeConfig {
  /** Enable realtime subscriptions */
  enabled: boolean
  /** How to handle realtime events */
  mode?: 'invalidate-subsets' | 'patch'
  /** Custom channel name (defaults to table name) */
  channel?: string
}

/**
 * Mutation configuration
 */
export interface MutationsConfig {
  insert?: boolean
  update?: boolean
  delete?: boolean
}

/**
 * Order by configuration
 */
export interface OrderByConfig {
  column: string
  ascending?: boolean
}

/**
 * Main configuration for SupabaseCollection
 */
export interface SupabaseCollectionConfig<T> {
  // Required
  /** Supabase client instance */
  supabase: SupabaseClient
  /** Table name in Supabase */
  table: string
  /** Primary key field name */
  primaryKey: keyof T & string

  // Optional schema
  /** Schema for type inference (optional) */
  schema?: unknown

  // Column mapping
  /** Map between DB columns and client fields */
  columnMap?: Record<string, string>

  // Query-driven loading
  /** Sync mode: 'all' loads entire table, 'on-demand' loads subsets */
  syncMode?: 'all' | 'on-demand'
  /** Default select columns (default: '*') */
  defaultSelect?: string
  /** Default order by configuration */
  defaultOrderBy?: OrderByConfig

  // Mutations
  /** Enable/disable specific mutation operations */
  mutations?: MutationsConfig

  // PostgREST specifics
  /** Postgres schema name (default: 'public') */
  schemaName?: string
  /** Conflict column for upsert operations */
  conflict?: string
  /** Return preference for mutations */
  returning?: 'representation' | 'minimal'

  // Realtime
  /** Realtime subscription configuration */
  realtime?: RealtimeConfig

  // Error handling / observability
  /** Error callback */
  onError?: (err: unknown, ctx: ErrorContext) => void
  /** Logger for debug output */
  logger?: Logger
}

// ============================================
// Expression Tree Types (for query translation)
// ============================================

export type ComparisonOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is'

export type LogicalOperator = 'and' | 'or'

export interface ComparisonExpression {
  type: 'comparison'
  field: string
  operator: ComparisonOperator
  value: unknown
}

export interface LogicalExpression {
  type: 'logical'
  operator: LogicalOperator
  expressions: WhereExpression[]
}

export interface NotExpression {
  type: 'not'
  expression: WhereExpression
}

export type WhereExpression = ComparisonExpression | LogicalExpression | NotExpression

/**
 * Subset options passed from TanStack DB for query-driven sync
 */
export interface LoadSubsetOptions {
  where?: WhereExpression
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>
  limit?: number
  offset?: number
  select?: string[]
}

/**
 * Context passed to load function
 */
export interface LoadContext {
  meta?: {
    loadSubsetOptions?: LoadSubsetOptions
  }
}

/**
 * Context passed to mutation handlers
 */
export interface MutationContext<T> {
  /** The row data */
  data: T
  /** The primary key value */
  id: unknown
}

// ============================================
// Collection Options Types (TanStack DB compatible)
// ============================================

/**
 * Result of a mutation operation
 */
export interface MutationResult<T> {
  success: boolean
  data?: T
  error?: unknown
}

/**
 * Handler function types for mutations
 */
export type InsertHandler<T> = (data: Partial<T>) => Promise<MutationResult<T>>
export type UpdateHandler<T> = (id: unknown, data: Partial<T>) => Promise<MutationResult<T>>
export type DeleteHandler<T> = (id: unknown) => Promise<MutationResult<T>>

/**
 * Collection options returned by the options creator
 * Compatible with TanStack DB collection configuration
 */
export interface CollectionOptions<T> {
  /** Load function for fetching data */
  load: (ctx: LoadContext) => Promise<T[]>

  /** Insert mutation handler */
  insert?: InsertHandler<T>

  /** Update mutation handler */
  update?: UpdateHandler<T>

  /** Delete mutation handler */
  delete?: DeleteHandler<T>

  /** Get the primary key value from a row */
  getId: (row: T) => unknown

  /** Cleanup function for subscriptions */
  cleanup?: () => void
}

// ============================================
// Internal Types
// ============================================

/**
 * Translated PostgREST query parameters
 */
export interface PostgRESTQuery {
  select: string
  filters: Array<{ column: string; operator: string; value: string }>
  order?: string
  limit?: number
  offset?: number
}

/**
 * Subset cache entry
 */
export interface SubsetCacheEntry<T> {
  key: string
  data: T[]
  timestamp: number
  dirty: boolean
}
