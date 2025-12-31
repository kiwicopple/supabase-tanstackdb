/**
 * @supabase/tanstack-db-collection
 *
 * Supabase collection options creator for TanStack DB with query-driven online sync.
 *
 * @example
 * ```ts
 * import { supabaseCollectionOptions } from '@supabase/tanstack-db-collection'
 * import { createClient } from '@supabase/supabase-js'
 *
 * const supabase = createClient(url, key)
 *
 * const todosCollection = supabaseCollectionOptions({
 *   supabase,
 *   table: 'todos',
 *   primaryKey: 'id',
 * })
 * ```
 */

// Main exports
export { supabaseCollectionOptions, createSupabaseCollectionOptionsCreator } from './collection-options.js'

// Error types
export { SupabaseCollectionError } from './errors.js'
export type { SupabaseCollectionErrorKind } from './errors.js'

// Types
export type {
  SupabaseCollectionConfig,
  CollectionOptions,
  MutationResult,
  InsertHandler,
  UpdateHandler,
  DeleteHandler,
  LoadContext,
  LoadSubsetOptions,
  WhereExpression,
  ComparisonExpression,
  LogicalExpression,
  NotExpression,
  ComparisonOperator,
  LogicalOperator,
  RealtimeConfig,
  MutationsConfig,
  OrderByConfig,
  Logger,
  ErrorContext,
} from './types.js'

// Utilities (for advanced use cases)
export {
  generateSubsetKey,
  mapColumnToDb,
  mapColumnFromDb,
  mapRowToDb,
  createConsoleLogger,
  SubsetCache,
} from './utils.js'

// Translator (for advanced use cases)
export {
  translateWhereExpression,
  translateLoadSubsetOptions,
  applyQueryToBuilder,
} from './translator.js'
