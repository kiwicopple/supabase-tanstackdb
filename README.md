# @supabase/tanstack-db-collection

Supabase collection options creator for [TanStack DB](https://tanstack.com/db) with query-driven online sync.

## Features

- **Query-driven sync** - Load only the data you need based on TanStack DB query predicates
- **Optimistic mutations** - Insert, update, and delete with automatic rollback on errors
- **RLS-native** - Relies on Supabase Auth + PostgREST for row-level security
- **Optional Realtime** - Subscribe to changes for automatic invalidation or patching
- **Type-safe** - Full TypeScript support with generics

## Installation

```bash
npm install @supabase/tanstack-db-collection @supabase/supabase-js @tanstack/db
```

## Quick Start

```typescript
import { supabaseCollectionOptions } from '@supabase/tanstack-db-collection'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

interface Todo {
  id: string
  title: string
  completed: boolean
  user_id: string
}

const todosCollection = supabaseCollectionOptions<Todo>({
  supabase,
  table: 'todos',
  primaryKey: 'id',
})
```

## Configuration

```typescript
interface SupabaseCollectionConfig<T> {
  // Required
  supabase: SupabaseClient
  table: string
  primaryKey: keyof T & string

  // Query-driven loading
  syncMode?: 'all' | 'on-demand'  // default: 'on-demand'
  defaultSelect?: string          // default: '*'
  defaultOrderBy?: { column: string; ascending?: boolean }

  // Mutations
  mutations?: {
    insert?: boolean
    update?: boolean
    delete?: boolean
  }

  // PostgREST specifics
  schemaName?: string             // default: 'public'
  conflict?: string               // for upsert operations
  returning?: 'representation' | 'minimal'

  // Column mapping (for camelCase <-> snake_case)
  columnMap?: Record<string, string>

  // Optional realtime
  realtime?: {
    enabled: boolean
    mode?: 'invalidate-subsets' | 'patch'
    channel?: string
  }

  // Error handling
  onError?: (err: unknown, ctx: { op: 'load' | 'insert' | 'update' | 'delete' }) => void
  logger?: Logger
}
```

## Sync Modes

### On-demand (default)

Loads only the requested subsets based on TanStack DB query predicates:

```typescript
const options = supabaseCollectionOptions({
  supabase,
  table: 'todos',
  primaryKey: 'id',
  syncMode: 'on-demand',  // Only loads what's queried
})
```

### All

Loads the entire table (suitable for small tables):

```typescript
const options = supabaseCollectionOptions({
  supabase,
  table: 'settings',
  primaryKey: 'id',
  syncMode: 'all',  // Loads everything
})
```

## Column Mapping

Map between camelCase client fields and snake_case database columns:

```typescript
const options = supabaseCollectionOptions<Todo>({
  supabase,
  table: 'todos',
  primaryKey: 'id',
  columnMap: {
    createdAt: 'created_at',
    userId: 'user_id',
  },
})
```

## Realtime Integration

Enable realtime subscriptions for automatic updates:

```typescript
const options = supabaseCollectionOptions({
  supabase,
  table: 'todos',
  primaryKey: 'id',
  realtime: {
    enabled: true,
    mode: 'invalidate-subsets',  // or 'patch' for direct updates
  },
})
```

## Error Handling

```typescript
const options = supabaseCollectionOptions({
  supabase,
  table: 'todos',
  primaryKey: 'id',
  onError: (err, ctx) => {
    console.error(`Error during ${ctx.op}:`, err)
  },
  logger: {
    debug: console.debug,
    warn: console.warn,
    error: console.error,
  },
})
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

## License

MIT
