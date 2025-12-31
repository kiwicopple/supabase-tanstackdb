import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { SupabaseCollectionConfig, Logger } from './types.js'
import { noopLogger, SubsetCache } from './utils.js'

/**
 * Realtime event payload from Supabase
 */
interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: T | null
  old: T | null
}

/**
 * Callbacks for realtime events
 */
interface RealtimeCallbacks<T> {
  onInsert?: (row: T) => void
  onUpdate?: (row: T, oldRow: T | null) => void
  onDelete?: (oldRow: T) => void
  onInvalidate?: () => void
}

/**
 * Realtime subscription manager
 */
export class RealtimeManager<T> {
  private channel: RealtimeChannel | null = null
  private readonly supabase: SupabaseClient
  private readonly table: string
  private readonly schemaName: string
  private readonly channelName: string
  private readonly mode: 'invalidate-subsets' | 'patch'
  private readonly logger: Logger
  private readonly primaryKey: string
  private readonly subsetCache: SubsetCache<T>
  private callbacks: RealtimeCallbacks<T> = {}

  constructor(
    config: SupabaseCollectionConfig<T>,
    subsetCache: SubsetCache<T>
  ) {
    this.supabase = config.supabase
    this.table = config.table
    this.schemaName = config.schemaName ?? 'public'
    this.channelName = config.realtime?.channel ?? `${this.table}-changes`
    this.mode = config.realtime?.mode ?? 'invalidate-subsets'
    this.logger = config.logger ?? noopLogger
    this.primaryKey = config.primaryKey
    this.subsetCache = subsetCache
  }

  /**
   * Start listening to realtime changes
   */
  subscribe(callbacks: RealtimeCallbacks<T>): void {
    this.callbacks = callbacks

    this.logger.debug('Subscribing to realtime:', {
      table: this.table,
      channel: this.channelName,
      mode: this.mode,
    })

    this.channel = this.supabase
      .channel(this.channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: this.schemaName,
          table: this.table,
        },
        (payload) => this.handleChange(payload as RealtimePayload<T>)
      )
      .subscribe((status) => {
        this.logger.debug('Realtime subscription status:', status)
      })
  }

  /**
   * Handle incoming realtime change
   */
  private handleChange(payload: RealtimePayload<T>): void {
    this.logger.debug('Realtime event:', {
      type: payload.eventType,
      table: this.table,
    })

    if (this.mode === 'invalidate-subsets') {
      // Mark all subsets as dirty and notify
      this.subsetCache.markAllDirty()
      this.callbacks.onInvalidate?.()
      return
    }

    // Patch mode: apply changes directly
    switch (payload.eventType) {
      case 'INSERT':
        if (payload.new) {
          this.callbacks.onInsert?.(payload.new)
        }
        break

      case 'UPDATE':
        if (payload.new) {
          this.callbacks.onUpdate?.(payload.new, payload.old)
        }
        break

      case 'DELETE':
        if (payload.old) {
          this.callbacks.onDelete?.(payload.old)
        }
        break
    }
  }

  /**
   * Stop listening to realtime changes
   */
  unsubscribe(): void {
    if (this.channel) {
      this.logger.debug('Unsubscribing from realtime:', {
        table: this.table,
        channel: this.channelName,
      })
      this.supabase.removeChannel(this.channel)
      this.channel = null
    }
  }

  /**
   * Check if currently subscribed
   */
  isSubscribed(): boolean {
    return this.channel !== null
  }
}

/**
 * Create a realtime manager if realtime is enabled
 */
export function createRealtimeManager<T>(
  config: SupabaseCollectionConfig<T>,
  subsetCache: SubsetCache<T>
): RealtimeManager<T> | null {
  if (!config.realtime?.enabled) {
    return null
  }

  return new RealtimeManager(config, subsetCache)
}
