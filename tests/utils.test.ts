import { describe, it, expect } from 'vitest'
import {
  generateSubsetKey,
  mapColumnToDb,
  mapColumnFromDb,
  mapRowToDb,
  SubsetCache,
} from '../src/utils.js'
import type { LoadSubsetOptions } from '../src/types.js'

describe('generateSubsetKey', () => {
  it('generates consistent key for same options', () => {
    const options: LoadSubsetOptions = {
      where: { type: 'comparison', field: 'status', operator: 'eq', value: 'active' },
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 10,
    }

    const key1 = generateSubsetKey(options)
    const key2 = generateSubsetKey(options)

    expect(key1).toBe(key2)
  })

  it('generates different keys for different options', () => {
    const options1: LoadSubsetOptions = {
      where: { type: 'comparison', field: 'status', operator: 'eq', value: 'active' },
    }
    const options2: LoadSubsetOptions = {
      where: { type: 'comparison', field: 'status', operator: 'eq', value: 'pending' },
    }

    const key1 = generateSubsetKey(options1)
    const key2 = generateSubsetKey(options2)

    expect(key1).not.toBe(key2)
  })

  it('handles empty options', () => {
    const options: LoadSubsetOptions = {}

    const key = generateSubsetKey(options)

    expect(key).toBeDefined()
    expect(typeof key).toBe('string')
  })

  it('sorts select columns for consistent keys', () => {
    const options1: LoadSubsetOptions = { select: ['name', 'id', 'status'] }
    const options2: LoadSubsetOptions = { select: ['id', 'name', 'status'] }

    const key1 = generateSubsetKey(options1)
    const key2 = generateSubsetKey(options2)

    expect(key1).toBe(key2)
  })
})

describe('mapColumnToDb', () => {
  it('returns field as-is without column map', () => {
    const result = mapColumnToDb('userName', undefined)

    expect(result).toBe('userName')
  })

  it('maps field to db column', () => {
    const columnMap = { userName: 'user_name', createdAt: 'created_at' }

    const result = mapColumnToDb('userName', columnMap)

    expect(result).toBe('user_name')
  })

  it('returns field as-is if not in map', () => {
    const columnMap = { userName: 'user_name' }

    const result = mapColumnToDb('status', columnMap)

    expect(result).toBe('status')
  })
})

describe('mapColumnFromDb', () => {
  it('returns row as-is without column map', () => {
    const row = { id: '1', user_name: 'John' }

    const result = mapColumnFromDb(row, undefined)

    expect(result).toEqual(row)
  })

  it('maps db columns to client fields', () => {
    const row = { id: '1', user_name: 'John', created_at: '2024-01-01' }
    const columnMap = { userName: 'user_name', createdAt: 'created_at' }

    const result = mapColumnFromDb<{ id: string; userName: string; createdAt: string }>(
      row,
      columnMap
    )

    expect(result).toEqual({
      id: '1',
      userName: 'John',
      createdAt: '2024-01-01',
    })
  })
})

describe('mapRowToDb', () => {
  it('returns data as-is without column map', () => {
    const data = { userName: 'John', status: 'active' }

    const result = mapRowToDb(data, undefined)

    expect(result).toEqual(data)
  })

  it('maps client fields to db columns', () => {
    const data = { userName: 'John', createdAt: '2024-01-01' }
    const columnMap = { userName: 'user_name', createdAt: 'created_at' }

    const result = mapRowToDb(data, columnMap)

    expect(result).toEqual({
      user_name: 'John',
      created_at: '2024-01-01',
    })
  })
})

describe('SubsetCache', () => {
  it('stores and retrieves data', () => {
    const cache = new SubsetCache<{ id: string }>()
    const data = [{ id: '1' }, { id: '2' }]

    cache.set('key1', data)
    const result = cache.get('key1')

    expect(result).toEqual(data)
  })

  it('returns undefined for missing keys', () => {
    const cache = new SubsetCache<{ id: string }>()

    const result = cache.get('missing')

    expect(result).toBeUndefined()
  })

  it('marks entries as dirty', () => {
    const cache = new SubsetCache<{ id: string }>()
    const data = [{ id: '1' }]

    cache.set('key1', data)
    cache.markDirty('key1')
    const result = cache.get('key1')

    expect(result).toBeUndefined()
  })

  it('marks all entries as dirty', () => {
    const cache = new SubsetCache<{ id: string }>()

    cache.set('key1', [{ id: '1' }])
    cache.set('key2', [{ id: '2' }])
    cache.markAllDirty()

    expect(cache.get('key1')).toBeUndefined()
    expect(cache.get('key2')).toBeUndefined()
  })

  it('clears all entries', () => {
    const cache = new SubsetCache<{ id: string }>()

    cache.set('key1', [{ id: '1' }])
    cache.set('key2', [{ id: '2' }])
    cache.clear()

    expect(cache.get('key1')).toBeUndefined()
    expect(cache.get('key2')).toBeUndefined()
  })

  it('deletes specific entry', () => {
    const cache = new SubsetCache<{ id: string }>()

    cache.set('key1', [{ id: '1' }])
    cache.set('key2', [{ id: '2' }])
    cache.delete('key1')

    expect(cache.get('key1')).toBeUndefined()
    expect(cache.get('key2')).toEqual([{ id: '2' }])
  })

  it('evicts expired entries', async () => {
    const cache = new SubsetCache<{ id: string }>(10) // 10ms TTL

    cache.set('key1', [{ id: '1' }])

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 20))

    cache.evict()
    const result = cache.get('key1')

    expect(result).toBeUndefined()
  })
})
