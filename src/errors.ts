/**
 * Error kinds for SupabaseCollection
 */
export type SupabaseCollectionErrorKind =
  | 'UnsupportedPredicate'
  | 'Network'
  | 'Auth'
  | 'Postgrest'
  | 'Unknown'

/**
 * Structured error for SupabaseCollection operations
 */
export class SupabaseCollectionError extends Error {
  readonly kind: SupabaseCollectionErrorKind
  readonly cause: unknown

  constructor(kind: SupabaseCollectionErrorKind, message: string, cause?: unknown) {
    super(message)
    this.name = 'SupabaseCollectionError'
    this.kind = kind
    this.cause = cause

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SupabaseCollectionError)
    }
  }

  /**
   * Create an error for unsupported predicate/expression
   */
  static unsupportedPredicate(message: string, cause?: unknown): SupabaseCollectionError {
    return new SupabaseCollectionError('UnsupportedPredicate', message, cause)
  }

  /**
   * Create an error for network issues
   */
  static network(message: string, cause?: unknown): SupabaseCollectionError {
    return new SupabaseCollectionError('Network', message, cause)
  }

  /**
   * Create an error for auth issues
   */
  static auth(message: string, cause?: unknown): SupabaseCollectionError {
    return new SupabaseCollectionError('Auth', message, cause)
  }

  /**
   * Create an error for PostgREST issues
   */
  static postgrest(message: string, cause?: unknown): SupabaseCollectionError {
    return new SupabaseCollectionError('Postgrest', message, cause)
  }

  /**
   * Create an error for unknown issues
   */
  static unknown(message: string, cause?: unknown): SupabaseCollectionError {
    return new SupabaseCollectionError('Unknown', message, cause)
  }

  /**
   * Wrap an unknown error into a SupabaseCollectionError
   */
  static fromUnknown(error: unknown): SupabaseCollectionError {
    if (error instanceof SupabaseCollectionError) {
      return error
    }

    if (error instanceof Error) {
      // Try to classify the error based on message or properties
      const message = error.message.toLowerCase()

      if (message.includes('network') || message.includes('fetch')) {
        return SupabaseCollectionError.network(error.message, error)
      }

      if (message.includes('auth') || message.includes('jwt') || message.includes('token')) {
        return SupabaseCollectionError.auth(error.message, error)
      }

      return SupabaseCollectionError.unknown(error.message, error)
    }

    return SupabaseCollectionError.unknown(String(error), error)
  }
}
