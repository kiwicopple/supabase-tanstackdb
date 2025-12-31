import type {
  SupabaseCollectionConfig,
  CollectionOptions,
  LoadContext,
  LoadSubsetOptions,
} from './types.js'
import { SupabaseCollectionError } from './errors.js'
import { translateLoadSubsetOptions, applyQueryToBuilder } from './translator.js'
import { createMutationHandlers } from './mutations.js'
import { createRealtimeManager, RealtimeManager } from './realtime.js'
import { AuthSessionManager } from './auth.js'
import {
  noopLogger,
  generateSubsetKey,
  mapColumnFromDb,
  SubsetCache,
} from './utils.js'

/**
 * Create collection options for TanStack DB with Supabase backend
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
export function supabaseCollectionOptions<T>(
  config: SupabaseCollectionConfig<T>
): CollectionOptions<T> {
  const {
    supabase,
    table,
    primaryKey,
    schemaName = 'public',
    syncMode = 'on-demand',
    defaultSelect = '*',
    defaultOrderBy,
    columnMap,
    auth,
    onError,
    logger = noopLogger,
  } = config

  // Initialize subset cache
  const subsetCache = new SubsetCache<T>()

  // Initialize realtime manager
  let realtimeManager: RealtimeManager<T> | null = null

  // Initialize auth session manager
  let authManager: AuthSessionManager | null = null
  let authUnsubscribe: (() => void) | null = null

  // Create mutation handlers
  const mutations = createMutationHandlers(config)

  // Get the appropriate schema client
  const getClient = () => {
    if (schemaName !== 'public') {
      return supabase.schema(schemaName)
    }
    return supabase
  }

  /**
   * Load function - handles both 'all' and 'on-demand' sync modes
   */
  const load = async (ctx: LoadContext): Promise<T[]> => {
    const loadSubsetOptions = ctx.meta?.loadSubsetOptions

    if (syncMode === 'all' || !loadSubsetOptions) {
      // Load entire collection
      return loadAll()
    }

    // Query-driven sync: load only the requested subset
    return loadSubset(loadSubsetOptions)
  }

  /**
   * Load all rows from the table
   */
  const loadAll = async (): Promise<T[]> => {
    logger.debug('Loading all:', { table })

    try {
      const client = getClient()
      let query = client.from(table).select(defaultSelect)

      // Apply default ordering if specified
      if (defaultOrderBy) {
        const column = columnMap?.[defaultOrderBy.column] ?? defaultOrderBy.column
        query = query.order(column, { ascending: defaultOrderBy.ascending ?? true })
      }

      const { data, error } = await query

      if (error) {
        throw SupabaseCollectionError.postgrest(error.message, error)
      }

      const rows = (data ?? []).map((row: unknown) =>
        mapColumnFromDb<T>(row as Record<string, unknown>, columnMap)
      )

      logger.debug('Loaded all:', { table, count: rows.length })

      return rows
    } catch (err) {
      const wrappedError = SupabaseCollectionError.fromUnknown(err)
      logger.error('Load all failed:', wrappedError.message)
      onError?.(wrappedError, { op: 'load' })
      throw wrappedError
    }
  }

  /**
   * Load a subset of rows based on query predicates
   */
  const loadSubset = async (options: LoadSubsetOptions): Promise<T[]> => {
    const subsetKey = generateSubsetKey(options)

    // Check cache first
    const cached = subsetCache.get(subsetKey)
    if (cached) {
      logger.debug('Cache hit:', { table, subsetKey })
      return cached
    }

    logger.debug('Loading subset:', { table, subsetKey })

    try {
      // Translate options to PostgREST query
      const query = translateLoadSubsetOptions(options, {
        defaultSelect,
        columnMap,
      })

      logger.debug('Translated query:', query)

      // Build and execute query
      const client = getClient()
      const builder = client.from(table)
      const result = applyQueryToBuilder(builder, query)

      const { data, error } = (await result) as {
        data: Record<string, unknown>[] | null
        error: { message: string } | null
      }

      if (error) {
        throw SupabaseCollectionError.postgrest(error.message, error)
      }

      const rows = (data ?? []).map((row) =>
        mapColumnFromDb<T>(row, columnMap)
      )

      // Cache the result
      subsetCache.set(subsetKey, rows)

      logger.debug('Loaded subset:', { table, subsetKey, count: rows.length })

      return rows
    } catch (err) {
      const wrappedError = SupabaseCollectionError.fromUnknown(err)
      logger.error('Load subset failed:', wrappedError.message)
      onError?.(wrappedError, { op: 'load' })
      throw wrappedError
    }
  }

  /**
   * Get ID from a row
   */
  const getId = (row: T): unknown => {
    return (row as Record<string, unknown>)[primaryKey]
  }

  /**
   * Cleanup function for subscriptions
   */
  const cleanup = (): void => {
    // Cleanup realtime
    if (realtimeManager) {
      realtimeManager.unsubscribe()
      realtimeManager = null
    }

    // Cleanup auth
    if (authUnsubscribe) {
      authUnsubscribe()
      authUnsubscribe = null
    }
    if (authManager) {
      authManager.stop()
      authManager = null
    }

    // Clear cache
    subsetCache.clear()
  }

  // Set up auth session handling
  const authEnabled = auth?.enabled !== false // Default to true
  if (authEnabled) {
    authManager = new AuthSessionManager(supabase, logger)

    authUnsubscribe = authManager.onAuthChange((_event, session) => {
      const hasSession = session !== null
      logger.debug('Auth session changed:', { table, hasSession })

      // Clear cache on session change to prevent cross-user data leakage
      if (auth?.clearCacheOnChange !== false) {
        subsetCache.clear()
        logger.debug('Cache cleared due to auth change')
      }

      // Call optional callback
      auth?.onSessionChange?.(hasSession)
    })

    authManager.start()
  }

  // Set up realtime if enabled
  if (config.realtime?.enabled) {
    realtimeManager = createRealtimeManager(config, subsetCache)
    realtimeManager?.subscribe({
      onInvalidate: () => {
        logger.debug('Realtime invalidation triggered')
        // TanStack DB will handle refetching when needed
      },
      onInsert: (row) => {
        logger.debug('Realtime insert:', { table, id: getId(row) })
      },
      onUpdate: (row) => {
        logger.debug('Realtime update:', { table, id: getId(row) })
      },
      onDelete: (row) => {
        logger.debug('Realtime delete:', { table, id: getId(row) })
      },
    })
  }

  return {
    load,
    ...mutations,
    getId,
    cleanup,
  }
}

/**
 * Low-level factory for creating collection options creators
 * Use this when you need more control over the options creation process
 */
export function createSupabaseCollectionOptionsCreator<T>(
  baseConfig: Partial<SupabaseCollectionConfig<T>>
): (config: Partial<SupabaseCollectionConfig<T>>) => CollectionOptions<T> {
  return (overrideConfig) => {
    const mergedConfig = {
      ...baseConfig,
      ...overrideConfig,
    } as SupabaseCollectionConfig<T>

    // Validate required fields
    if (!mergedConfig.supabase) {
      throw new Error('supabase client is required')
    }
    if (!mergedConfig.table) {
      throw new Error('table name is required')
    }
    if (!mergedConfig.primaryKey) {
      throw new Error('primaryKey is required')
    }

    return supabaseCollectionOptions(mergedConfig)
  }
}
