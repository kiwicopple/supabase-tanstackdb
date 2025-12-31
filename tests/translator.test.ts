import { describe, it, expect } from 'vitest'
import {
  translateWhereExpression,
  translateWhereExpressionFull,
  translateLoadSubsetOptions,
  where,
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
        { column: 'status', operator: 'eq', value: 'active', negate: false },
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
        { column: 'status', operator: 'neq', value: 'deleted', negate: false },
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
        { column: 'age', operator: 'gte', value: '18', negate: false },
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
        { column: 'status', operator: 'in', value: '(active,pending)', negate: false },
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
        { column: 'deleted_at', operator: 'is', value: 'null', negate: false },
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
        { column: 'user_name', operator: 'eq', value: 'john', negate: false },
      ])
    })

    it('translates like operator', () => {
      const expr: WhereExpression = {
        type: 'comparison',
        field: 'name',
        operator: 'like',
        value: '%john%',
      }

      const result = translateWhereExpression(expr)

      expect(result).toEqual([
        { column: 'name', operator: 'like', value: '%john%', negate: false },
      ])
    })

    it('translates ilike operator', () => {
      const expr: WhereExpression = {
        type: 'comparison',
        field: 'name',
        operator: 'ilike',
        value: '%JOHN%',
      }

      const result = translateWhereExpression(expr)

      expect(result).toEqual([
        { column: 'name', operator: 'ilike', value: '%JOHN%', negate: false },
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
        { column: 'status', operator: 'eq', value: 'active', negate: false },
        { column: 'age', operator: 'gte', value: '18', negate: false },
      ])
    })

    it('translates OR expressions to orGroups', () => {
      const expr: WhereExpression = {
        type: 'logical',
        operator: 'or',
        expressions: [
          { type: 'comparison', field: 'status', operator: 'eq', value: 'active' },
          { type: 'comparison', field: 'status', operator: 'eq', value: 'pending' },
        ],
      }

      const result = translateWhereExpressionFull(expr)

      expect(result.filters).toEqual([])
      expect(result.orGroups).toEqual([
        {
          type: 'or',
          filters: [
            { column: 'status', operator: 'eq', value: 'active', negate: false },
            { column: 'status', operator: 'eq', value: 'pending', negate: false },
          ],
        },
      ])
    })
  })

  describe('NOT expressions', () => {
    it('translates NOT comparison to negated filter', () => {
      const expr: WhereExpression = {
        type: 'not',
        expression: { type: 'comparison', field: 'status', operator: 'eq', value: 'active' },
      }

      const result = translateWhereExpression(expr)

      expect(result).toEqual([
        { column: 'status', operator: 'eq', value: 'active', negate: true },
      ])
    })

    it('translates NOT (A OR B) to negated AND filters (De Morgan)', () => {
      const expr: WhereExpression = {
        type: 'not',
        expression: {
          type: 'logical',
          operator: 'or',
          expressions: [
            { type: 'comparison', field: 'status', operator: 'eq', value: 'active' },
            { type: 'comparison', field: 'status', operator: 'eq', value: 'pending' },
          ],
        },
      }

      const result = translateWhereExpressionFull(expr)

      // NOT (A OR B) = NOT A AND NOT B
      expect(result.filters).toEqual([
        { column: 'status', operator: 'eq', value: 'active', negate: true },
        { column: 'status', operator: 'eq', value: 'pending', negate: true },
      ])
      expect(result.orGroups).toEqual([])
    })

    it('translates NOT (A AND B) to negated OR group (De Morgan)', () => {
      const expr: WhereExpression = {
        type: 'not',
        expression: {
          type: 'logical',
          operator: 'and',
          expressions: [
            { type: 'comparison', field: 'status', operator: 'eq', value: 'active' },
            { type: 'comparison', field: 'age', operator: 'gte', value: 18 },
          ],
        },
      }

      const result = translateWhereExpressionFull(expr)

      // NOT (A AND B) = NOT A OR NOT B
      expect(result.filters).toEqual([])
      expect(result.orGroups).toEqual([
        {
          type: 'or',
          filters: [
            { column: 'status', operator: 'eq', value: 'active', negate: true },
            { column: 'age', operator: 'gte', value: '18', negate: true },
          ],
        },
      ])
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

    it('throws for complex nested expressions in OR', () => {
      const expr: WhereExpression = {
        type: 'logical',
        operator: 'or',
        expressions: [
          {
            type: 'logical',
            operator: 'and',
            expressions: [
              { type: 'comparison', field: 'a', operator: 'eq', value: 1 },
              { type: 'comparison', field: 'b', operator: 'eq', value: 2 },
            ],
          },
          { type: 'comparison', field: 'c', operator: 'eq', value: 3 },
        ],
      }

      expect(() => translateWhereExpressionFull(expr)).toThrow(SupabaseCollectionError)
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
      orGroups: [],
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
      { column: 'status', operator: 'eq', value: 'active', negate: false },
    ])
  })

  it('translates OR where clause to orGroups', () => {
    const options: LoadSubsetOptions = {
      where: {
        type: 'logical',
        operator: 'or',
        expressions: [
          { type: 'comparison', field: 'status', operator: 'eq', value: 'active' },
          { type: 'comparison', field: 'status', operator: 'eq', value: 'pending' },
        ],
      },
    }

    const result = translateLoadSubsetOptions(options)

    expect(result.filters).toEqual([])
    expect(result.orGroups).toEqual([
      {
        type: 'or',
        filters: [
          { column: 'status', operator: 'eq', value: 'active', negate: false },
          { column: 'status', operator: 'eq', value: 'pending', negate: false },
        ],
      },
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

describe('where helper', () => {
  it('creates eq expression', () => {
    const expr = where.eq('status', 'active')

    expect(expr).toEqual({
      type: 'comparison',
      field: 'status',
      operator: 'eq',
      value: 'active',
    })
  })

  it('creates and expression', () => {
    const expr = where.and(
      where.eq('status', 'active'),
      where.gte('age', 18)
    )

    expect(expr).toEqual({
      type: 'logical',
      operator: 'and',
      expressions: [
        { type: 'comparison', field: 'status', operator: 'eq', value: 'active' },
        { type: 'comparison', field: 'age', operator: 'gte', value: 18 },
      ],
    })
  })

  it('creates or expression', () => {
    const expr = where.or(
      where.eq('status', 'active'),
      where.eq('status', 'pending')
    )

    expect(expr).toEqual({
      type: 'logical',
      operator: 'or',
      expressions: [
        { type: 'comparison', field: 'status', operator: 'eq', value: 'active' },
        { type: 'comparison', field: 'status', operator: 'eq', value: 'pending' },
      ],
    })
  })

  it('creates not expression', () => {
    const expr = where.not(where.eq('status', 'deleted'))

    expect(expr).toEqual({
      type: 'not',
      expression: { type: 'comparison', field: 'status', operator: 'eq', value: 'deleted' },
    })
  })

  it('creates like expression', () => {
    const expr = where.like('name', '%john%')

    expect(expr).toEqual({
      type: 'comparison',
      field: 'name',
      operator: 'like',
      value: '%john%',
    })
  })

  it('creates ilike expression', () => {
    const expr = where.ilike('name', '%JOHN%')

    expect(expr).toEqual({
      type: 'comparison',
      field: 'name',
      operator: 'ilike',
      value: '%JOHN%',
    })
  })

  it('creates isNull expression', () => {
    const expr = where.isNull('deleted_at')

    expect(expr).toEqual({
      type: 'comparison',
      field: 'deleted_at',
      operator: 'is',
      value: null,
    })
  })

  it('creates in expression', () => {
    const expr = where.in('status', ['active', 'pending'])

    expect(expr).toEqual({
      type: 'comparison',
      field: 'status',
      operator: 'in',
      value: ['active', 'pending'],
    })
  })

  it('creates fts expression', () => {
    const expr = where.fts('content', 'hello world')

    expect(expr).toEqual({
      type: 'comparison',
      field: 'content',
      operator: 'fts',
      value: 'hello world',
    })
  })
})
