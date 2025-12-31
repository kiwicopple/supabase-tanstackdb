import type { LoadSubsetOptions, Logger } from './types.js'

/**
 * Default no-op logger
 */
export const noopLogger: Logger = {
  debug: () => {},
  warn: () => {},
  error: () => {},
}

/**
 * Create a console-based logger
 */
export function createConsoleLogger(prefix = '[SupabaseCollection]'): Logger {
  return {
    debug: (...args) => console.debug(prefix, ...args),
    warn: (...args) => console.warn(prefix, ...args),
    error: (...args) => console.error(prefix, ...args),
  }
}

/**
 * Generate a canonical key for a subset query
 * Used for caching and deduplication
 */
export function generateSubsetKey(options: LoadSubsetOptions): string {
  const normalized = {
    where: options.where ?? null,
    orderBy: options.orderBy ?? null,
    limit: options.limit ?? null,
    offset: options.offset ?? null,
    select: options.select ? [...options.select].sort() : null,
  }

  return JSON.stringify(normalized, sortObjectKeys)
}

/**
 * JSON replacer that sorts object keys for consistent serialization
 */
function sortObjectKeys(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {}
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[k] = (value as Record<string, unknown>)[k]
    }
    return sorted
  }
  return value
}

/**
 * Map column names from client fields to database columns
 */
export function mapColumnToDb(
  field: string,
  columnMap: Record<string, string> | undefined
): string {
  if (!columnMap) return field
  return columnMap[field] ?? field
}

/**
 * Map column names from database columns to client fields
 */
export function mapColumnFromDb<T>(
  row: Record<string, unknown>,
  columnMap: Record<string, string> | undefined
): T {
  if (!columnMap) return row as T

  // Create reverse map
  const reverseMap: Record<string, string> = {}
  for (const [clientField, dbColumn] of Object.entries(columnMap)) {
    reverseMap[dbColumn] = clientField
  }

  const mapped: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    const clientKey = reverseMap[key] ?? key
    mapped[clientKey] = value
  }

  return mapped as T
}

/**
 * Map row data from client fields to database columns for mutations
 */
export function mapRowToDb<T>(
  data: Partial<T>,
  columnMap: Record<string, string> | undefined
): Record<string, unknown> {
  if (!columnMap) return data as Record<string, unknown>

  const mapped: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const dbColumn = columnMap[key] ?? key
    mapped[dbColumn] = value
  }

  return mapped
}

/**
 * Deep freeze an object (for immutability in development)
 */
export function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  Object.freeze(obj)

  for (const value of Object.values(obj)) {
    deepFreeze(value)
  }

  return obj
}

/**
 * Simple TTL cache for subsets
 */
export class SubsetCache<T> {
  private cache = new Map<string, { data: T[]; timestamp: number; dirty: boolean }>()
  private readonly ttlMs: number

  constructor(ttlMs = 5 * 60 * 1000) {
    // Default 5 minutes
    this.ttlMs = ttlMs
  }

  get(key: string): T[] | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key)
      return undefined
    }

    // Check if dirty
    if (entry.dirty) {
      return undefined
    }

    return entry.data
  }

  set(key: string, data: T[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      dirty: false,
    })
  }

  markDirty(key: string): void {
    const entry = this.cache.get(key)
    if (entry) {
      entry.dirty = true
    }
  }

  markAllDirty(): void {
    for (const entry of this.cache.values()) {
      entry.dirty = true
    }
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  /** Evict expired entries */
  evict(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key)
      }
    }
  }
}
