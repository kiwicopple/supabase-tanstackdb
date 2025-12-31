import { describe, it, expect } from 'vitest'
import { SupabaseCollectionError } from '../src/errors.js'

describe('SupabaseCollectionError', () => {
  describe('constructor', () => {
    it('creates error with kind and message', () => {
      const error = new SupabaseCollectionError('Network', 'Connection failed')

      expect(error.kind).toBe('Network')
      expect(error.message).toBe('Connection failed')
      expect(error.name).toBe('SupabaseCollectionError')
    })

    it('stores cause', () => {
      const cause = new Error('Original error')
      const error = new SupabaseCollectionError('Unknown', 'Wrapped error', cause)

      expect(error.cause).toBe(cause)
    })
  })

  describe('static factory methods', () => {
    it('creates UnsupportedPredicate error', () => {
      const error = SupabaseCollectionError.unsupportedPredicate('OR not supported')

      expect(error.kind).toBe('UnsupportedPredicate')
      expect(error.message).toBe('OR not supported')
    })

    it('creates Network error', () => {
      const error = SupabaseCollectionError.network('Connection timeout')

      expect(error.kind).toBe('Network')
      expect(error.message).toBe('Connection timeout')
    })

    it('creates Auth error', () => {
      const error = SupabaseCollectionError.auth('JWT expired')

      expect(error.kind).toBe('Auth')
      expect(error.message).toBe('JWT expired')
    })

    it('creates Postgrest error', () => {
      const error = SupabaseCollectionError.postgrest('Relation not found')

      expect(error.kind).toBe('Postgrest')
      expect(error.message).toBe('Relation not found')
    })

    it('creates Unknown error', () => {
      const error = SupabaseCollectionError.unknown('Something went wrong')

      expect(error.kind).toBe('Unknown')
      expect(error.message).toBe('Something went wrong')
    })
  })

  describe('fromUnknown', () => {
    it('returns same error if already SupabaseCollectionError', () => {
      const original = SupabaseCollectionError.network('Test')
      const result = SupabaseCollectionError.fromUnknown(original)

      expect(result).toBe(original)
    })

    it('classifies network errors', () => {
      const original = new Error('Network error occurred')
      const result = SupabaseCollectionError.fromUnknown(original)

      expect(result.kind).toBe('Network')
      expect(result.cause).toBe(original)
    })

    it('classifies auth errors', () => {
      const original = new Error('JWT token expired')
      const result = SupabaseCollectionError.fromUnknown(original)

      expect(result.kind).toBe('Auth')
    })

    it('wraps unknown errors', () => {
      const original = new Error('Something random')
      const result = SupabaseCollectionError.fromUnknown(original)

      expect(result.kind).toBe('Unknown')
      expect(result.message).toBe('Something random')
    })

    it('handles non-Error values', () => {
      const result = SupabaseCollectionError.fromUnknown('string error')

      expect(result.kind).toBe('Unknown')
      expect(result.message).toBe('string error')
    })
  })

  describe('instanceof', () => {
    it('is instanceof Error', () => {
      const error = SupabaseCollectionError.network('Test')

      expect(error instanceof Error).toBe(true)
      expect(error instanceof SupabaseCollectionError).toBe(true)
    })
  })
})
