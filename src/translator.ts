import type {
  WhereExpression,
  ComparisonExpression,
  LogicalExpression,
  LoadSubsetOptions,
  PostgRESTQuery,
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
}

/**
 * Translate a comparison expression to PostgREST filter format
 */
function translateComparison(
  expr: ComparisonExpression,
  columnMap?: Record<string, string>
): { column: string; operator: string; value: string } {
  const operator = OPERATOR_MAP[expr.operator]
  if (!operator) {
    throw SupabaseCollectionError.unsupportedPredicate(
      `Unsupported operator: ${expr.operator}`
    )
  }

  const column = mapColumnToDb(expr.field, columnMap)
  let value: string

  if (expr.operator === 'in') {
    // IN operator expects array
    if (!Array.isArray(expr.value)) {
      throw SupabaseCollectionError.unsupportedPredicate(
        `IN operator requires array value`
      )
    }
    value = `(${expr.value.map(formatValue).join(',')})`
  } else if (expr.operator === 'is') {
    // IS operator for null checks
    value = expr.value === null ? 'null' : String(expr.value)
  } else {
    value = formatValue(expr.value)
  }

  return { column, operator, value }
}

/**
 * Format a value for PostgREST query string
 */
function formatValue(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  if (typeof value === 'string') {
    // Escape special characters and wrap in quotes if needed
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (value instanceof Date) {
    return value.toISOString()
  }
  throw SupabaseCollectionError.unsupportedPredicate(
    `Unsupported value type: ${typeof value}`
  )
}

/**
 * Translate a where expression tree to PostgREST filters
 */
export function translateWhereExpression(
  expr: WhereExpression,
  columnMap?: Record<string, string>
): Array<{ column: string; operator: string; value: string }> {
  switch (expr.type) {
    case 'comparison':
      return [translateComparison(expr, columnMap)]

    case 'logical': {
      const logicalExpr = expr as LogicalExpression
      if (logicalExpr.operator === 'and') {
        // AND: flatten all filters (PostgREST ANDs by default)
        return logicalExpr.expressions.flatMap((e) =>
          translateWhereExpression(e, columnMap)
        )
      } else if (logicalExpr.operator === 'or') {
        // OR: PostgREST supports or=(filter1,filter2)
        // For now, throw unsupported for complex OR
        throw SupabaseCollectionError.unsupportedPredicate(
          'Complex OR expressions are not yet supported. Use simple queries or provide a queryFnOverride.'
        )
      }
      throw SupabaseCollectionError.unsupportedPredicate(
        `Unknown logical operator: ${logicalExpr.operator}`
      )
    }

    case 'not':
      // NOT: PostgREST supports not.filter
      throw SupabaseCollectionError.unsupportedPredicate(
        'NOT expressions are not yet supported. Use simple queries or provide a queryFnOverride.'
      )

    default:
      throw SupabaseCollectionError.unsupportedPredicate(
        `Unknown expression type: ${(expr as { type: string }).type}`
      )
  }
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
  }

  // Handle select columns
  if (options.select && options.select.length > 0) {
    query.select = options.select
      .map((col) => mapColumnToDb(col, columnMap))
      .join(',')
  }

  // Handle where clause
  if (options.where) {
    query.filters = translateWhereExpression(options.where, columnMap)
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
 * Apply translated query to a Supabase query builder
 */
export function applyQueryToBuilder<T>(
  builder: {
    select: (columns: string) => unknown
    eq: (column: string, value: unknown) => unknown
    neq: (column: string, value: unknown) => unknown
    gt: (column: string, value: unknown) => unknown
    gte: (column: string, value: unknown) => unknown
    lt: (column: string, value: unknown) => unknown
    lte: (column: string, value: unknown) => unknown
    like: (column: string, value: unknown) => unknown
    ilike: (column: string, value: unknown) => unknown
    in: (column: string, value: unknown[]) => unknown
    is: (column: string, value: unknown) => unknown
    order: (column: string, options?: { ascending?: boolean }) => unknown
    limit: (count: number) => unknown
    range: (from: number, to: number) => unknown
  },
  query: PostgRESTQuery
): unknown {
  let result: unknown = builder.select(query.select)

  // Apply filters
  for (const filter of query.filters) {
    const method = filter.operator as keyof typeof builder
    if (method === 'in') {
      // Parse the (value1,value2) format back to array
      const values = filter.value.slice(1, -1).split(',')
      result = (result as Record<string, CallableFunction>).in(filter.column, values)
    } else if (method in builder && typeof (result as Record<string, unknown>)[method] === 'function') {
      result = (result as Record<string, CallableFunction>)[method](filter.column, filter.value)
    }
  }

  // Apply ordering
  if (query.order) {
    const orders = query.order.split(',')
    for (const orderSpec of orders) {
      const [column, direction] = orderSpec.split('.')
      if (column) {
        result = (result as Record<string, CallableFunction>).order(column, {
          ascending: direction === 'asc',
        })
      }
    }
  }

  // Apply pagination
  if (query.limit !== undefined) {
    if (query.offset !== undefined && query.offset > 0) {
      result = (result as Record<string, CallableFunction>).range(
        query.offset,
        query.offset + query.limit - 1
      )
    } else {
      result = (result as Record<string, CallableFunction>).limit(query.limit)
    }
  }

  return result
}
