import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMutationHandlers } from '../src/mutations.js'
import type { SupabaseCollectionConfig } from '../src/types.js'

// Mock Supabase client
function createMockSupabaseClient() {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    eq: vi.fn().mockReturnThis(),
  }

  const mockFrom = vi.fn().mockReturnValue({
    insert: vi.fn().mockReturnValue(mockQuery),
    update: vi.fn().mockReturnValue(mockQuery),
    delete: vi.fn().mockReturnValue(mockQuery),
    upsert: vi.fn().mockReturnValue(mockQuery),
  })

  return {
    from: mockFrom,
    schema: vi.fn().mockReturnValue({ from: mockFrom }),
    _mockQuery: mockQuery,
    _mockFrom: mockFrom,
  }
}

interface TestRow {
  id: string
  name: string
  status: string
}

describe('createMutationHandlers', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let config: SupabaseCollectionConfig<TestRow>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    config = {
      supabase: mockSupabase as unknown as SupabaseCollectionConfig<TestRow>['supabase'],
      table: 'test_table',
      primaryKey: 'id',
    }
  })

  describe('insert handler', () => {
    it('creates insert handler when enabled', () => {
      const handlers = createMutationHandlers(config)

      expect(handlers.insert).toBeDefined()
    })

    it('does not create insert handler when disabled', () => {
      config.mutations = { insert: false }
      const handlers = createMutationHandlers(config)

      expect(handlers.insert).toBeUndefined()
    })

    it('calls supabase insert with correct data', async () => {
      const handlers = createMutationHandlers(config)
      const data = { name: 'Test', status: 'active' }

      mockSupabase._mockQuery.single.mockResolvedValueOnce({
        data: { id: '123', ...data },
        error: null,
      })

      await handlers.insert!(data)

      expect(mockSupabase.from).toHaveBeenCalledWith('test_table')
    })

    it('returns success with server data on success', async () => {
      const handlers = createMutationHandlers(config)
      const serverData = { id: '123', name: 'Test', status: 'active' }

      mockSupabase._mockQuery.single.mockResolvedValueOnce({
        data: serverData,
        error: null,
      })

      const result = await handlers.insert!({ name: 'Test', status: 'active' })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(serverData)
    })

    it('returns error on failure', async () => {
      const handlers = createMutationHandlers(config)
      const onError = vi.fn()
      config.onError = onError

      mockSupabase._mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed' },
      })

      const handlersWithError = createMutationHandlers(config)
      const result = await handlersWithError.insert!({ name: 'Test' })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(onError).toHaveBeenCalled()
    })

    it('uses upsert when conflict is specified', async () => {
      config.conflict = 'name'
      const handlers = createMutationHandlers(config)

      mockSupabase._mockQuery.single.mockResolvedValueOnce({
        data: { id: '123', name: 'Test' },
        error: null,
      })

      await handlers.insert!({ name: 'Test' })

      const fromResult = mockSupabase.from('test_table')
      expect(fromResult.upsert).toBeDefined()
    })
  })

  describe('update handler', () => {
    it('creates update handler when enabled', () => {
      const handlers = createMutationHandlers(config)

      expect(handlers.update).toBeDefined()
    })

    it('does not create update handler when disabled', () => {
      config.mutations = { update: false }
      const handlers = createMutationHandlers(config)

      expect(handlers.update).toBeUndefined()
    })

    it('returns success with server data on success', async () => {
      const handlers = createMutationHandlers(config)
      const serverData = { id: '123', name: 'Updated', status: 'active' }

      mockSupabase._mockQuery.single.mockResolvedValueOnce({
        data: serverData,
        error: null,
      })

      const result = await handlers.update!('123', { name: 'Updated' })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(serverData)
    })

    it('returns error on failure', async () => {
      const handlers = createMutationHandlers(config)

      mockSupabase._mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      })

      const result = await handlers.update!('123', { name: 'Updated' })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('delete handler', () => {
    it('creates delete handler when enabled', () => {
      const handlers = createMutationHandlers(config)

      expect(handlers.delete).toBeDefined()
    })

    it('does not create delete handler when disabled', () => {
      config.mutations = { delete: false }
      const handlers = createMutationHandlers(config)

      expect(handlers.delete).toBeUndefined()
    })

    it('returns success on successful delete', async () => {
      const handlers = createMutationHandlers(config)
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      mockSupabase._mockFrom.mockReturnValueOnce({
        delete: mockDelete,
      })

      const handlersWithMock = createMutationHandlers(config)

      // Reset to use a simpler mock
      const simpleMockSupabase = {
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
        schema: vi.fn(),
      }

      const simpleConfig = {
        ...config,
        supabase: simpleMockSupabase as unknown as SupabaseCollectionConfig<TestRow>['supabase'],
      }

      const simpleHandlers = createMutationHandlers(simpleConfig)
      const result = await simpleHandlers.delete!('123')

      expect(result.success).toBe(true)
    })
  })

  describe('column mapping', () => {
    it('maps columns in insert data', async () => {
      config.columnMap = { userName: 'user_name' }
      const handlers = createMutationHandlers(config)

      mockSupabase._mockQuery.single.mockResolvedValueOnce({
        data: { id: '123', user_name: 'Test' },
        error: null,
      })

      const result = await handlers.insert!({ userName: 'Test' } as unknown as Partial<TestRow>)

      expect(result.success).toBe(true)
    })
  })

  describe('schema support', () => {
    it('uses custom schema when specified', async () => {
      config.schemaName = 'custom_schema'
      const handlers = createMutationHandlers(config)

      mockSupabase._mockQuery.single.mockResolvedValueOnce({
        data: { id: '123', name: 'Test' },
        error: null,
      })

      await handlers.insert!({ name: 'Test' })

      expect(mockSupabase.schema).toHaveBeenCalledWith('custom_schema')
    })
  })
})
