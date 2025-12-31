import type { SupabaseClient, AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { Logger } from './types.js'
import { noopLogger } from './utils.js'

/**
 * Callback for auth state changes
 */
export type AuthChangeCallback = (event: AuthChangeEvent, session: Session | null) => void

/**
 * Auth session manager for Supabase collections
 * Handles session changes and provides session key generation
 */
export class AuthSessionManager {
  private supabase: SupabaseClient
  private logger: Logger
  private currentSessionKey: string | null = null
  private callbacks: Set<AuthChangeCallback> = new Set()
  private unsubscribe: (() => void) | null = null

  constructor(supabase: SupabaseClient, logger: Logger = noopLogger) {
    this.supabase = supabase
    this.logger = logger
  }

  /**
   * Start listening to auth state changes
   */
  start(): void {
    if (this.unsubscribe) {
      return // Already started
    }

    const { data } = this.supabase.auth.onAuthStateChange((event, session) => {
      this.handleAuthChange(event, session)
    })

    this.unsubscribe = data.subscription.unsubscribe

    // Initialize current session key
    this.initializeSessionKey()
  }

  /**
   * Stop listening to auth state changes
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    this.callbacks.clear()
    this.currentSessionKey = null
  }

  /**
   * Register a callback for auth state changes
   */
  onAuthChange(callback: AuthChangeCallback): () => void {
    this.callbacks.add(callback)
    return () => this.callbacks.delete(callback)
  }

  /**
   * Get the current session key
   * Returns null if no session is active
   */
  getSessionKey(): string | null {
    return this.currentSessionKey
  }

  /**
   * Check if there is an active session
   */
  hasSession(): boolean {
    return this.currentSessionKey !== null
  }

  /**
   * Generate a session key from a session
   * Uses user ID for stability across token refreshes
   */
  private generateSessionKey(session: Session | null): string | null {
    if (!session?.user?.id) {
      return null
    }
    // Use user ID as the key - stable across token refreshes
    return `user:${session.user.id}`
  }

  /**
   * Initialize the session key from current session
   */
  private async initializeSessionKey(): Promise<void> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession()
      this.currentSessionKey = this.generateSessionKey(session)
      this.logger.debug('Session initialized:', {
        hasSession: this.currentSessionKey !== null,
      })
    } catch (err) {
      this.logger.error('Failed to initialize session:', err)
      this.currentSessionKey = null
    }
  }

  /**
   * Handle auth state change
   */
  private handleAuthChange(event: AuthChangeEvent, session: Session | null): void {
    const newSessionKey = this.generateSessionKey(session)
    const sessionChanged = newSessionKey !== this.currentSessionKey

    this.logger.debug('Auth state change:', {
      event,
      sessionChanged,
      hasNewSession: newSessionKey !== null,
    })

    if (sessionChanged) {
      this.currentSessionKey = newSessionKey

      // Notify all callbacks
      for (const callback of this.callbacks) {
        try {
          callback(event, session)
        } catch (err) {
          this.logger.error('Auth change callback error:', err)
        }
      }
    }
  }
}

/**
 * Create an auth session manager for a Supabase client
 */
export function createAuthSessionManager(
  supabase: SupabaseClient,
  logger?: Logger
): AuthSessionManager {
  return new AuthSessionManager(supabase, logger)
}

/**
 * Hook to handle auth changes in collection options
 * Clears cache and triggers refetch on session change
 */
export interface AuthResetOptions {
  /** Clear the subset cache on session change */
  clearCache: () => void
  /** Optional: trigger a refetch of active subsets */
  onSessionChange?: (event: AuthChangeEvent, session: Session | null) => void
}

/**
 * Create an auth change handler that resets collection state
 */
export function createAuthResetHandler(options: AuthResetOptions): AuthChangeCallback {
  return (event, session) => {
    // Clear cache to prevent cross-user data leakage
    options.clearCache()

    // Call optional handler
    options.onSessionChange?.(event, session)
  }
}
