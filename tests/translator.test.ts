import { describe, it, expect } from 'vitest'
import {
  translateWhereExpression,
  translateLoadSubsetOptions,
} from '../src/translator.js'
import { SupabaseCollectionError } from '../src/errors.js'
import type { WhereExpression, LoadSubsetOptions } from '../src/types.js'

describe('translateWhereExpression', () => {
  describe('comparison expressions', () => {
    it('translates eq operator', () => {
      const expr: WhereExpression = {
        type: 'comparison',
        field: 'status',
        operator: 'eq',
        value: 'active',
      }

      const result = translateWhereExpression(expr)

      expect(result).toEqual([
        { column: 'status', operator: 'eq', value: 'active' },
      ])
    })

    it('translates neq operator', () => {
      const expr: WhereExpression = {
        type: 'comparison',
        field: 'status',
        operator: 'neq',
        value: 'deleted',
      }

      const result = translateWhereExpression(expr)

      expect(result).toEqual([
        { column: 'status', operator: 'neq', value: 'deleted' },
      ])
    })

    it('translates numeric comparisons', () => {
      const expr: WhereExpression = {
        type: 'comparison',
        field: 'age',
        operator: 'gte',
        value: 18,
      }

      const result = translateWhereExpression(expr)

      expect(result).toEqual([
        { column: 'age', operator: 'gte', value: '18' },
      ])
    })

    it('translates IN operator with array', () => {
      const expr: WhereExpression = {
        type: 'comparison',
        field: 'status',
        operator: 'in',
        value: ['active', 'pending'],
      }

      const result = translateWhereExpression(expr)

      expect(result).toEqual([
        { column: 'status', operator: 'in', value: '(active,pending)' },
      ])
    })

    it('translates IS NULL operator', () => {
      const expr: WhereExpression = {
        type: 'comparison',
        field: 'deleted_at',
        operator: 'is',
        value: null,
      }

      const result = translateWhereExpression(expr)

      expect(result).toEqual([
        { column: 'deleted_at', operator: 'is', value: 'null' },
      ])
    })

    it('applies column mapping', () => {
      const expr: WhereExpression = {
        type: 'comparison',
        field: 'userName',
        operator: 'eq',
        value: 'john',
      }
      const columnMap = { userName: 'user_name' }

      const result = translateWhereExpression(expr, columnMap)

      expect(result).toEqual([
        { column: 'user_name', operator: 'eq', value: 'john' },
      ])
    })
  })

  describe('logical expressions', () => {
    it('translates AND expressions by flattening', () => {
      const expr: WhereExpression = {
        type: 'logical',
        operator: 'and',
        expressions: [
          { type: 'comparison', field: 'status', operator: 'eq', value: 'active' },
          { type: 'comparison', field: 'age', operator: 'gte', value: 18 },
        ],
      }

      const result = translateWhereExpression(expr)

      expect(result).toEqual([
        { column: 'status', operator: 'eq', value: 'active' },
        { column: 'age', operator: 'gte', value: '18' },
      ])
    })

    it('throws for OR expressions', () => {
      const expr: WhereExpression = {
        type: 'logical',
        operator: 'or',
        expressions: [
          { type: 'comparison', field: 'status', operator: 'eq', value: 'active' },
          { type: 'comparison', field: 'status', operator: 'eq', value: 'pending' },
        ],
      }

      expect(() => translateWhereExpression(expr)).toThrow(SupabaseCollectionError)
    })
  })

  describe('NOT expressions', () => {
    it('throws for NOT expressions', () => {
      const expr: WhereExpression = {
        type: 'not',
        expression: { type: 'comparison', field: 'status', operator: 'eq', value: 'active' },
      }

      expect(() => translateWhereExpression(expr)).toThrow(SupabaseCollectionError)
    })
  })

  describe('error cases', () => {
    it('throws for unsupported operators', () => {
      const expr: WhereExpression = {
        type: 'comparison',
        field: 'text',
        operator: 'unknown' as 'eq',
        value: 'test',
      }

      expect(() => translateWhereExpression(expr)).toThrow(SupabaseCollectionError)
    })

    it('throws for IN operator without array value', () => {
      const expr: WhereExpression = {
        type: 'comparison',
        field: 'status',
        operator: 'in',
        value: 'active',
      }

      expect(() => translateWhereExpression(expr)).toThrow(SupabaseCollectionError)
    })
  })
})

describe('translateLoadSubsetOptions', () => {
  it('returns default query with empty options', () => {
    const options: LoadSubsetOptions = {}

    const result = translateLoadSubsetOptions(options)

    expect(result).toEqual({
      select: '*',
      filters: [],
    })
  })

  it('translates select columns', () => {
    const options: LoadSubsetOptions = {
      select: ['id', 'name', 'status'],
    }

    const result = translateLoadSubsetOptions(options)

    expect(result.select).toBe('id,name,status')
  })

  it('translates where clause', () => {
    const options: LoadSubsetOptions = {
      where: {
        type: 'comparison',
        field: 'status',
        operator: 'eq',
        value: 'active',
      },
    }

    const result = translateLoadSubsetOptions(options)

    expect(result.filters).toEqual([
      { column: 'status', operator: 'eq', value: 'active' },
    ])
  })

  it('translates orderBy', () => {
    const options: LoadSubsetOptions = {
      orderBy: [
        { field: 'created_at', direction: 'desc' },
        { field: 'name', direction: 'asc' },
      ],
    }

    const result = translateLoadSubsetOptions(options)

    expect(result.order).toBe('created_at.desc,name.asc')
  })

  it('translates pagination', () => {
    const options: LoadSubsetOptions = {
      limit: 10,
      offset: 20,
    }

    const result = translateLoadSubsetOptions(options)

    expect(result.limit).toBe(10)
    expect(result.offset).toBe(20)
  })

  it('uses custom default select', () => {
    const options: LoadSubsetOptions = {}

    const result = translateLoadSubsetOptions(options, { defaultSelect: 'id,name' })

    expect(result.select).toBe('id,name')
  })

  it('applies column mapping to select', () => {
    const options: LoadSubsetOptions = {
      select: ['userName', 'createdAt'],
    }
    const columnMap = { userName: 'user_name', createdAt: 'created_at' }

    const result = translateLoadSubsetOptions(options, { columnMap })

    expect(result.select).toBe('user_name,created_at')
  })

  it('applies column mapping to orderBy', () => {
    const options: LoadSubsetOptions = {
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    }
    const columnMap = { createdAt: 'created_at' }

    const result = translateLoadSubsetOptions(options, { columnMap })

    expect(result.order).toBe('created_at.desc')
  })
})
