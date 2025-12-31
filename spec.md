# spec.md — SupabaseCollection for TanStack DB (Query-Driven Online Sync)

## Summary
Build a `SupabaseCollection` integration for TanStack DB using TanStack's **collection options creator** pattern, targeting **query-driven online sync** (no offline persistence in v1). The integration should let developers use TanStack DB collections with Supabase (PostgREST + Auth + optional Realtime) with optimistic writes and automatic reconciliation.

## Goals
- Provide a first-class TanStack DB "collection options creator" that talks to Supabase.
- Support **query-driven sync** (subset loading based on live queries / predicates) by translating TanStack DB load subsets into PostgREST queries.
- Support **optimistic mutations** (insert/update/delete) with mutation handlers, rollback on errors, and optional refetch behavior.
- Be RLS-native: rely on Supabase Auth + PostgREST enforcing RLS. (No client-side enforcement.)
- Provide an optional Realtime integration for invalidation / patching.
- Keep the API "Supabase-ish" and ergonomic for `supabase-js`.

## Non-goals (v1)
- Offline-first / local durable persistence (SQLite/IndexedDB). (Online-only cache in memory.)
- Full CRDT conflict resolution.
- Schema migrations / codegen (can be layered later).
- Supporting all PostgREST advanced features on day one (expose escape hatches).

## Target users
- Web apps using TanStack DB for reactive UI, wanting Supabase as the backend.
- Teams who want to start "sync-first" without adopting a separate sync engine.

## Package layout
- `@supabase/tanstack-db-collection` (new)
  - Exports:
    - `supabaseCollectionOptions` (collection options creator)
    - `createSupabaseCollectionOptionsCreator` (low-level factory, if needed)
    - Types and utilities for filter translation and key mapping

## External dependencies
- `@tanstack/db` + `@tanstack/query-db-collection` (or equivalent hooks TanStack DB exposes for query-driven sync).
- `@supabase/supabase-js`

## High-level design

### Why "collection options creator"
TanStack DB expects integrations to be provided via a factory that returns standard collection configuration (load, mutations, optional lifecycle).

### "Query-driven sync" model
- In `syncMode: 'on-demand'` (or equivalent), TanStack DB will pass query predicates (where/orderBy/limit) as expression trees in `ctx.meta.loadSubsetOptions` (naming per TanStack DB 0.5 blog). We translate that into PostgREST query parameters.
- Returned rows are normalized into the collection's store.

## Public API

### Primary export
```ts
supabaseCollectionOptions<T>(config: SupabaseCollectionConfig<T>): CollectionOptions<T>
```

### Config
```ts
type SupabaseCollectionConfig<T> = {
  // Required
  supabase: SupabaseClient
  table: string

  // Required: stable primary key field used by TanStack DB
  primaryKey: keyof T & string

  // Optional schema (TanStack DB supports schema-based inference)
  schema?: unknown

  // Optional: map between DB columns and client fields (if different)
  columnMap?: Record<string, string>

  // Query-driven loading
  syncMode?: 'all' | 'on-demand'  // default: 'on-demand' for large tables
  defaultSelect?: string          // default: '*'
  defaultOrderBy?: { column: string, ascending?: boolean }

  // Mutations
  mutations?: {
    insert?: boolean
    update?: boolean
    delete?: boolean
  }

  // PostgREST specifics
  schemaName?: string             // Postgres schema, default 'public'
  conflict?: string               // PostgREST upsert onConflict
  returning?: 'representation' | 'minimal'  // default: 'representation'

  // Optional realtime behavior
  realtime?: {
    enabled: boolean
    mode?: 'invalidate-subsets' | 'patch'
    // channel naming strategy
    channel?: string
  }

  // Error handling / observability
  onError?: (err: unknown, ctx: { op: 'load'|'insert'|'update'|'delete' }) => void
  logger?: { debug: (...a:any[]) => void; warn: (...a:any[]) => void; error: (...a:any[]) => void }
}
```

### Example usage (conceptual)
- Create a TanStack DB collection with `supabaseCollectionOptions({ supabase, table: 'todos', primaryKey: 'id' })`
- Use TanStack DB live queries normally; subsets will fetch from PostgREST as they're queried.

## Data operations

### Load / sync

#### Load modes
- **syncMode: 'all'**
  - One request loads full collection (suitable for small tables).
- **syncMode: 'on-demand'** (default)
  - Load only requested subsets based on TanStack DB query predicates.

#### Translating loadSubsetOptions → PostgREST

**Input** (from TanStack DB) includes:
- `where` expression tree
- `orderBy`
- `limit`/`offset` (or cursor)
- selected columns

**Output:**
- `select=...`
- filter params: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `in`, `is`, `fts` (as supported)
- `order=col.asc`
- `limit`, `offset`

**Translation rules:**
- Supported operators: `=`, `!=`, `>`, `>=`, `<`, `<=`, `IN`, `IS NULL`, `AND`, `OR`
- String ops: `like`, `ilike` (optional v1)
- Any unsupported expression yields:
  - either throw a structured error (dev) OR
  - fall back to a broader query (configurable), with a warning.

#### Pagination strategy
- v1: `limit` + `offset` only (simple and PostgREST-native).
- v2: keyset pagination helper if needed.

#### Caching / subset identity
- Subsets should be keyed by a canonical serialization of the expression tree.
- Add TTL-based eviction to avoid unbounded memory usage.

### Mutations

TanStack DB Query Collection supports mutation handlers and rollback. We implement:
- `insertHandler`
- `updateHandler`
- `deleteHandler`

And follow TanStack DB's handler contract (including optional refetch control).

#### Insert
- Call `supabase.from(table).insert(payload).select(returning)`
- If `returning=representation`, server row is used to replace optimistic row (ensures defaults/triggers computed fields match).

#### Update
- Call `supabase.from(table).update(patch).eq(primaryKey, id).select(returning)`
- If server returns a row, patch local record with server record.

#### Delete
- Call `supabase.from(table).delete().eq(primaryKey, id)`
- If failure, rollback local delete.

#### Optimistic strategy
- Always apply optimistic local mutation first (TanStack DB does this).
- On error, rollback via TanStack DB handler contract.

#### Upsert support (optional)
- If `conflict` provided, use `.upsert(data, { onConflict: conflict })` with PostgREST upsert semantics.

## Auth / RLS
- Authentication handled externally via supabase-js session.
- All reads/writes go through PostgREST which enforces RLS.
- No special "service role" support in the browser integration.
- If auth state changes:
  - clear subsets
  - refetch active subsets
  - optionally reset collection to prevent cross-user leakage.

## Realtime integration (optional)

**Goal:** reduce staleness and avoid manual invalidation.

**Modes:**

1. **invalidate-subsets**
   - Subscribe to Realtime changes for table
   - On INSERT/UPDATE/DELETE: mark relevant subsets "dirty" and refetch next tick / next query.

2. **patch**
   - Apply row-level patches directly into the collection when safe:
     - INSERT: upsert into store
     - UPDATE: patch matching primaryKey
     - DELETE: remove primaryKey
   - Caveat: RLS + filter subsets mean patching may show rows not in a specific subset; patching is safe for normalized store but subset query results must still be consistent (prefer invalidation if unsure).

Realtime is explicitly best-effort; server remains source of truth.

## Error model
- Standardize errors into:
  - `SupabaseCollectionError` with `{ kind: 'UnsupportedPredicate'|'Network'|'Auth'|'Postgrest'|'Unknown', cause }`
- Provide `onError` callback and `logger`.

## Observability
- Emit debug logs for:
  - subset key + translated PostgREST query
  - mutation op + payload shape (no secrets)
  - realtime events + action taken

## Security considerations
- Avoid leaking data across auth sessions:
  - require a `sessionKey` derived from access_token/user.id
  - on session change: clear local store and pending subset cache
- Never log full row bodies by default.

## Testing plan

### Unit tests:
- expression tree → PostgREST translation
- subset key canonicalization
- mutation handler success/rollback paths (mock supabase client)

### Integration tests:
- simple table with RLS policies
- optimistic insert with server defaults
- realtime invalidate behavior

### Compatibility matrix:
- supabase-js versions supported
- TanStack DB versions supported (pin minor)

## Milestones

1. **MVP (no realtime)**
   - on-demand subset loading
   - insert/update/delete handlers
   - auth session reset behavior

2. **Realtime invalidate**

3. **Patch mode + perf tuning**

4. **Docs + starter template**

## Open questions
- Exact shape of `loadSubsetOptions` / expression tree API across TanStack DB versions (pin to DB 0.5+ behavior described in Query-Driven Sync).
- Should v1 default to `syncMode: 'all'` for simplicity or `'on-demand'` for scalability?
- How much of PostgREST filter surface area to support in the translator (`fts`, `json`, `range`)?
- Should we expose an escape hatch: `queryFnOverride(ctx) => Promise<Row[]>` for custom endpoints?
