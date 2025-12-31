import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SupabaseCollectionConfig,
  MutationResult,
  InsertHandler,
  UpdateHandler,
  DeleteHandler,
  Logger,
} from './types.js'
import { SupabaseCollectionError } from './errors.js'
import { mapRowToDb, mapColumnFromDb, noopLogger } from './utils.js'

/**
 * Create mutation handlers for a Supabase collection
 */
export function createMutationHandlers<T>(
  config: SupabaseCollectionConfig<T>
): {
  insert?: InsertHandler<T>
  update?: UpdateHandler<T>
  delete?: DeleteHandler<T>
} {
  const {
    supabase,
    table,
    primaryKey,
    schemaName = 'public',
    columnMap,
    conflict,
    returning = 'representation',
    mutations = { insert: true, update: true, delete: true },
    onError,
    logger = noopLogger,
  } = config

  const handlers: {
    insert?: InsertHandler<T>
    update?: UpdateHandler<T>
    delete?: DeleteHandler<T>
  } = {}

  // Get the appropriate schema client
  const getClient = () => {
    if (schemaName !== 'public') {
      return supabase.schema(schemaName)
    }
    return supabase
  }

  if (mutations.insert) {
    handlers.insert = createInsertHandler<T>({
      getClient,
      table,
      columnMap,
      conflict,
      returning,
      onError,
      logger,
    })
  }

  if (mutations.update) {
    handlers.update = createUpdateHandler<T>({
      getClient,
      table,
      primaryKey,
      columnMap,
      returning,
      onError,
      logger,
    })
  }

  if (mutations.delete) {
    handlers.delete = createDeleteHandler<T>({
      getClient,
      table,
      primaryKey,
      columnMap,
      onError,
      logger,
    })
  }

  return handlers
}

interface HandlerConfig<T> {
  getClient: () => SupabaseClient | ReturnType<SupabaseClient['schema']>
  table: string
  primaryKey?: keyof T & string
  columnMap?: Record<string, string>
  conflict?: string
  returning?: 'representation' | 'minimal'
  onError?: (err: unknown, ctx: { op: 'insert' | 'update' | 'delete' }) => void
  logger: Logger
}

/**
 * Create insert handler
 */
function createInsertHandler<T>(config: HandlerConfig<T>): InsertHandler<T> {
  const { getClient, table, columnMap, conflict, returning, onError, logger } = config

  return async (data: Partial<T>): Promise<MutationResult<T>> => {
    logger.debug('Insert:', { table, data: Object.keys(data) })

    try {
      const dbData = mapRowToDb(data, columnMap)
      const client = getClient()

      let query
      if (conflict) {
        // Use upsert with conflict resolution
        query = client.from(table).upsert(dbData, { onConflict: conflict })
      } else {
        query = client.from(table).insert(dbData)
      }

      // Add returning clause
      if (returning === 'representation') {
        query = query.select()
      }

      const { data: result, error } = await query.single()

      if (error) {
        throw SupabaseCollectionError.postgrest(error.message, error)
      }

      const mappedResult = result ? mapColumnFromDb<T>(result, columnMap) : undefined

      logger.debug('Insert successful:', { table })

      return {
        success: true,
        data: mappedResult,
      }
    } catch (err) {
      const wrappedError = SupabaseCollectionError.fromUnknown(err)
      logger.error('Insert failed:', wrappedError.message)
      onError?.(wrappedError, { op: 'insert' })

      return {
        success: false,
        error: wrappedError,
      }
    }
  }
}

/**
 * Create update handler
 */
function createUpdateHandler<T>(config: HandlerConfig<T>): UpdateHandler<T> {
  const { getClient, table, primaryKey, columnMap, returning, onError, logger } = config

  return async (id: unknown, data: Partial<T>): Promise<MutationResult<T>> => {
    logger.debug('Update:', { table, id, data: Object.keys(data) })

    try {
      if (!primaryKey) {
        throw SupabaseCollectionError.unknown('Primary key not configured')
      }

      const dbData = mapRowToDb(data, columnMap)
      const dbPrimaryKey = columnMap?.[primaryKey] ?? primaryKey
      const client = getClient()

      let query = client.from(table).update(dbData).eq(dbPrimaryKey, id)

      // Add returning clause
      if (returning === 'representation') {
        query = query.select()
      }

      const { data: result, error } = await query.single()

      if (error) {
        throw SupabaseCollectionError.postgrest(error.message, error)
      }

      const mappedResult = result ? mapColumnFromDb<T>(result, columnMap) : undefined

      logger.debug('Update successful:', { table, id })

      return {
        success: true,
        data: mappedResult,
      }
    } catch (err) {
      const wrappedError = SupabaseCollectionError.fromUnknown(err)
      logger.error('Update failed:', wrappedError.message)
      onError?.(wrappedError, { op: 'update' })

      return {
        success: false,
        error: wrappedError,
      }
    }
  }
}

/**
 * Create delete handler
 */
function createDeleteHandler<T>(config: HandlerConfig<T>): DeleteHandler<T> {
  const { getClient, table, primaryKey, columnMap, onError, logger } = config

  return async (id: unknown): Promise<MutationResult<T>> => {
    logger.debug('Delete:', { table, id })

    try {
      if (!primaryKey) {
        throw SupabaseCollectionError.unknown('Primary key not configured')
      }

      const dbPrimaryKey = columnMap?.[primaryKey] ?? primaryKey
      const client = getClient()

      const { error } = await client.from(table).delete().eq(dbPrimaryKey, id)

      if (error) {
        throw SupabaseCollectionError.postgrest(error.message, error)
      }

      logger.debug('Delete successful:', { table, id })

      return {
        success: true,
      }
    } catch (err) {
      const wrappedError = SupabaseCollectionError.fromUnknown(err)
      logger.error('Delete failed:', wrappedError.message)
      onError?.(wrappedError, { op: 'delete' })

      return {
        success: false,
        error: wrappedError,
      }
    }
  }
}
