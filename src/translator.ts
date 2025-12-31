import type {
  WhereExpression,
  ComparisonExpression,
  LogicalExpression,
  NotExpression,
  LoadSubsetOptions,
  PostgRESTQuery,
  PostgRESTFilter,
  PostgRESTOrGroup,
} from './types.js'
import { SupabaseCollectionError } from './errors.js'
import { mapColumnToDb } from './utils.js'

/**
 * Map TanStack DB operators to PostgREST operators
 */
const OPERATOR_MAP: Record<string, string> = {
  eq: 'eq',
  neq: 'neq',
  gt: 'gt',
  gte: 'gte',
  lt: 'lt',
  lte: 'lte',
  like: 'like',
  ilike: 'ilike',
  in: 'in',
  is: 'is',
  contains: 'cs',
  containedBy: 'cd',
  rangeGt: 'sr',
  rangeGte: 'nxl',
  rangeLt: 'sl',
  rangeLte: 'nxr',
  rangeAdjacent: 'adj',
  overlaps: 'ov',
  match: 'match',
  imatch: 'imatch',
  fts: 'fts',
  plfts: 'plfts',
  phfts: 'phfts',
  wfts: 'wfts',
}

/**
 * Format a value for PostgREST query string
 */
function formatValue(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  if (Array.isArray(value)) {
    return `{${value.map(formatValue).join(',')}}`
  }
  throw SupabaseCollectionError.unsupportedPredicate(
    `Unsupported value type: ${typeof value}`
  )
}

/**
 * Translate a comparison expression to PostgREST filter format
 */
function translateComparison(
  expr: ComparisonExpression,
  columnMap?: Record<string, string>,
  negate = false
): PostgRESTFilter {
  const operator = OPERATOR_MAP[expr.operator]
  if (!operator) {
    throw SupabaseCollectionError.unsupportedPredicate(
      `Unsupported operator: ${expr.operator}`
    )
  }

  const column = mapColumnToDb(expr.field, columnMap)
  let value: string

  if (expr.operator === 'in') {
    if (!Array.isArray(expr.value)) {
      throw SupabaseCollectionError.unsupportedPredicate(
        `IN operator requires array value`
      )
    }
    value = `(${expr.value.map(formatValue).join(',')})`
  } else if (expr.operator === 'is') {
    value = expr.value === null ? 'null' : String(expr.value)
  } else if (expr.operator === 'contains' || expr.operator === 'containedBy' || expr.operator === 'overlaps') {
    value = formatValue(expr.value)
  } else {
    value = formatValue(expr.value)
  }

  return { column, operator, value, negate }
}

/**
 * Result of translating a where expression
 */
interface TranslationResult {
  filters: PostgRESTFilter[]
  orGroups: PostgRESTOrGroup[]
}

/**
 * Translate a NOT expression
 */
function translateNotExpression(
  expr: NotExpression,
  columnMap?: Record<string, string>
): TranslationResult {
  const inner = expr.expression

  if (inner.type === 'comparison') {
    return {
      filters: [translateComparison(inner, columnMap, true)],
      orGroups: [],
    }
  }

  if (inner.type === 'logical' && inner.operator === 'and') {
    // NOT (A AND B) = NOT A OR NOT B (De Morgan's law)
    const negatedFilters: PostgRESTFilter[] = []

    for (const subExpr of inner.expressions) {
      if (subExpr.type === 'comparison') {
        negatedFilters.push(translateComparison(subExpr, columnMap, true))
      } else {
        throw SupabaseCollectionError.unsupportedPredicate(
          'Nested logical expressions in NOT are not fully supported'
        )
      }
    }

    return {
      filters: [],
      orGroups: [{ type: 'or', filters: negatedFilters }],
    }
  }

  if (inner.type === 'logical' && inner.operator === 'or') {
    // NOT (A OR B) = NOT A AND NOT B (De Morgan's law)
    const negatedFilters: PostgRESTFilter[] = []

    for (const subExpr of inner.expressions) {
      if (subExpr.type === 'comparison') {
        negatedFilters.push(translateComparison(subExpr, columnMap, true))
      } else {
        throw SupabaseCollectionError.unsupportedPredicate(
          'Nested logical expressions in NOT are not fully supported'
        )
      }
    }

    return {
      filters: negatedFilters,
      orGroups: [],
    }
  }

  throw SupabaseCollectionError.unsupportedPredicate(
    'Nested NOT expressions are not supported'
  )
}

/**
 * Translate a where expression tree to PostgREST filters
 * Returns both regular filters (ANDed together) and OR groups
 */
export function translateWhereExpressionFull(
  expr: WhereExpression,
  columnMap?: Record<string, string>
): TranslationResult {
  switch (expr.type) {
    case 'comparison':
      return {
        filters: [translateComparison(expr, columnMap)],
        orGroups: [],
      }

    case 'logical': {
      const logicalExpr = expr as LogicalExpression

      if (logicalExpr.operator === 'and') {
        const result: TranslationResult = { filters: [], orGroups: [] }

        for (const subExpr of logicalExpr.expressions) {
          const subResult = translateWhereExpressionFull(subExpr, columnMap)
          result.filters.push(...subResult.filters)
          result.orGroups.push(...subResult.orGroups)
        }

        return result
      }

      if (logicalExpr.operator === 'or') {
        // Collect all filters for the OR group
        const orFilters: PostgRESTFilter[] = []

        for (const subExpr of logicalExpr.expressions) {
          if (subExpr.type === 'comparison') {
            orFilters.push(translateComparison(subExpr, columnMap))
          } else if (subExpr.type === 'not' && subExpr.expression.type === 'comparison') {
            orFilters.push(translateComparison(subExpr.expression, columnMap, true))
          } else {
            throw SupabaseCollectionError.unsupportedPredicate(
              'Complex nested expressions in OR are not fully supported. Only simple comparisons are allowed in OR clauses.'
            )
          }
        }

        return {
          filters: [],
          orGroups: [{ type: 'or', filters: orFilters }],
        }
      }

      throw SupabaseCollectionError.unsupportedPredicate(
        `Unknown logical operator: ${logicalExpr.operator}`
      )
    }

    case 'not':
      return translateNotExpression(expr as NotExpression, columnMap)

    default:
      throw SupabaseCollectionError.unsupportedPredicate(
        `Unknown expression type: ${(expr as { type: string }).type}`
      )
  }
}

/**
 * Translate a where expression tree to PostgREST filters
 * Legacy function for backward compatibility - returns only filters array
 */
export function translateWhereExpression(
  expr: WhereExpression,
  columnMap?: Record<string, string>
): PostgRESTFilter[] {
  const result = translateWhereExpressionFull(expr, columnMap)
  return result.filters
}

/**
 * Translate LoadSubsetOptions to a PostgREST query configuration
 */
export function translateLoadSubsetOptions(
  options: LoadSubsetOptions,
  config: {
    defaultSelect?: string
    columnMap?: Record<string, string>
  } = {}
): PostgRESTQuery {
  const { defaultSelect = '*', columnMap } = config

  const query: PostgRESTQuery = {
    select: defaultSelect,
    filters: [],
    orGroups: [],
  }

  // Handle select columns
  if (options.select && options.select.length > 0) {
    query.select = options.select
      .map((col) => mapColumnToDb(col, columnMap))
      .join(',')
  }

  // Handle where clause
  if (options.where) {
    const result = translateWhereExpressionFull(options.where, columnMap)
    query.filters = result.filters
    query.orGroups = result.orGroups
  }

  // Handle orderBy
  if (options.orderBy && options.orderBy.length > 0) {
    query.order = options.orderBy
      .map((o) => {
        const column = mapColumnToDb(o.field, columnMap)
        return `${column}.${o.direction}`
      })
      .join(',')
  }

  // Handle pagination
  if (options.limit !== undefined) {
    query.limit = options.limit
  }
  if (options.offset !== undefined) {
    query.offset = options.offset
  }

  return query
}

/**
 * Generic query builder interface compatible with Supabase
 */
type AnyQueryBuilder = {
  select: (columns: string) => AnyQueryBuilder
  eq: (column: string, value: unknown) => AnyQueryBuilder
  neq: (column: string, value: unknown) => AnyQueryBuilder
  gt: (column: string, value: unknown) => AnyQueryBuilder
  gte: (column: string, value: unknown) => AnyQueryBuilder
  lt: (column: string, value: unknown) => AnyQueryBuilder
  lte: (column: string, value: unknown) => AnyQueryBuilder
  like: (column: string, pattern: string) => AnyQueryBuilder
  ilike: (column: string, pattern: string) => AnyQueryBuilder
  in: (column: string, values: unknown[]) => AnyQueryBuilder
  is: (column: string, value: unknown) => AnyQueryBuilder
  contains: (column: string, value: unknown) => AnyQueryBuilder
  containedBy: (column: string, value: unknown) => AnyQueryBuilder
  overlaps: (column: string, value: unknown) => AnyQueryBuilder
  textSearch: (column: string, query: string, options?: { type?: string; config?: string }) => AnyQueryBuilder
  match: (column: string, pattern: string) => AnyQueryBuilder
  not: (column: string, operator: string, value: unknown) => AnyQueryBuilder
  or: (filters: string, options?: { referencedTable?: string }) => AnyQueryBuilder
  order: (column: string, options?: { ascending?: boolean }) => AnyQueryBuilder
  limit: (count: number) => AnyQueryBuilder
  range: (from: number, to: number) => AnyQueryBuilder
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type QueryBuilder = any

/**
 * Format a filter for use in PostgREST or() clause
 */
function formatFilterForOr(filter: PostgRESTFilter): string {
  const prefix = filter.negate ? 'not.' : ''
  return `${filter.column}.${prefix}${filter.operator}.${filter.value}`
}

/**
 * Apply a single filter to the query builder
 */
function applyFilter(result: AnyQueryBuilder, filter: PostgRESTFilter): AnyQueryBuilder {
  const { column, operator, value, negate } = filter

  if (negate) {
    // Use the .not() method for negated filters
    if (operator === 'in') {
      const values = value.slice(1, -1).split(',')
      return result.not(column, 'in', `(${values.join(',')})`)
    }
    if (operator === 'is') {
      return result.not(column, 'is', value === 'null' ? null : value)
    }
    return result.not(column, operator, value)
  }

  // Non-negated filters
  switch (operator) {
    case 'in': {
      const values = value.slice(1, -1).split(',')
      return result.in(column, values)
    }
    case 'eq':
      return result.eq(column, value)
    case 'neq':
      return result.neq(column, value)
    case 'gt':
      return result.gt(column, value)
    case 'gte':
      return result.gte(column, value)
    case 'lt':
      return result.lt(column, value)
    case 'lte':
      return result.lte(column, value)
    case 'like':
      return result.like(column, value)
    case 'ilike':
      return result.ilike(column, value)
    case 'is':
      return result.is(column, value === 'null' ? null : value)
    case 'cs':
      return result.contains(column, parseArrayValue(value))
    case 'cd':
      return result.containedBy(column, parseArrayValue(value))
    case 'ov':
      return result.overlaps(column, parseArrayValue(value))
    case 'fts':
      return result.textSearch(column, value, { type: 'plain' })
    case 'plfts':
      return result.textSearch(column, value, { type: 'plain' })
    case 'phfts':
      return result.textSearch(column, value, { type: 'phrase' })
    case 'wfts':
      return result.textSearch(column, value, { type: 'websearch' })
    default:
      // For any other operator, try to call it directly
      if (typeof result[operator] === 'function') {
        return result[operator](column, value)
      }
      return result
  }
}

/**
 * Parse array value from PostgREST format {a,b,c} to JS array
 */
function parseArrayValue(value: string): unknown[] {
  if (value.startsWith('{') && value.endsWith('}')) {
    return value.slice(1, -1).split(',')
  }
  return [value]
}

/**
 * Apply translated query to a Supabase query builder
 */
export function applyQueryToBuilder(
  builder: QueryBuilder,
  query: PostgRESTQuery
): QueryBuilder {
  let result = (builder as AnyQueryBuilder).select(query.select)

  // Apply regular filters (ANDed together)
  for (const filter of query.filters) {
    result = applyFilter(result, filter)
  }

  // Apply OR groups
  if (query.orGroups && query.orGroups.length > 0) {
    for (const orGroup of query.orGroups) {
      const orString = orGroup.filters.map(formatFilterForOr).join(',')
      result = result.or(orString)
    }
  }

  // Apply ordering
  if (query.order) {
    const orders = query.order.split(',')
    for (const orderSpec of orders) {
      const parts = orderSpec.split('.')
      const column = parts[0]
      const direction = parts[1]
      if (column) {
        result = result.order(column, {
          ascending: direction === 'asc',
        })
      }
    }
  }

  // Apply pagination
  if (query.limit !== undefined) {
    if (query.offset !== undefined && query.offset > 0) {
      result = result.range(query.offset, query.offset + query.limit - 1)
    } else {
      result = result.limit(query.limit)
    }
  }

  return result
}

/**
 * Helper to create comparison expressions
 */
export const where = {
  eq: (field: string, value: unknown): ComparisonExpression => ({
    type: 'comparison',
    field,
    operator: 'eq',
    value,
  }),
  neq: (field: string, value: unknown): ComparisonExpression => ({
    type: 'comparison',
    field,
    operator: 'neq',
    value,
  }),
  gt: (field: string, value: unknown): ComparisonExpression => ({
    type: 'comparison',
    field,
    operator: 'gt',
    value,
  }),
  gte: (field: string, value: unknown): ComparisonExpression => ({
    type: 'comparison',
    field,
    operator: 'gte',
    value,
  }),
  lt: (field: string, value: unknown): ComparisonExpression => ({
    type: 'comparison',
    field,
    operator: 'lt',
    value,
  }),
  lte: (field: string, value: unknown): ComparisonExpression => ({
    type: 'comparison',
    field,
    operator: 'lte',
    value,
  }),
  like: (field: string, pattern: string): ComparisonExpression => ({
    type: 'comparison',
    field,
    operator: 'like',
    value: pattern,
  }),
  ilike: (field: string, pattern: string): ComparisonExpression => ({
    type: 'comparison',
    field,
    operator: 'ilike',
    value: pattern,
  }),
  in: (field: string, values: unknown[]): ComparisonExpression => ({
    type: 'comparison',
    field,
    operator: 'in',
    value: values,
  }),
  isNull: (field: string): ComparisonExpression => ({
    type: 'comparison',
    field,
    operator: 'is',
    value: null,
  }),
  contains: (field: string, value: unknown[]): ComparisonExpression => ({
    type: 'comparison',
    field,
    operator: 'contains',
    value,
  }),
  containedBy: (field: string, value: unknown[]): ComparisonExpression => ({
    type: 'comparison',
    field,
    operator: 'containedBy',
    value,
  }),
  overlaps: (field: string, value: unknown[]): ComparisonExpression => ({
    type: 'comparison',
    field,
    operator: 'overlaps',
    value,
  }),
  fts: (field: string, query: string): ComparisonExpression => ({
    type: 'comparison',
    field,
    operator: 'fts',
    value: query,
  }),
  and: (...expressions: WhereExpression[]): LogicalExpression => ({
    type: 'logical',
    operator: 'and',
    expressions,
  }),
  or: (...expressions: WhereExpression[]): LogicalExpression => ({
    type: 'logical',
    operator: 'or',
    expressions,
  }),
  not: (expression: WhereExpression): NotExpression => ({
    type: 'not',
    expression,
  }),
}
