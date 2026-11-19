import { useCallback, useEffect, useSyncExternalStore } from 'react'

/**
 * A small stale-while-revalidate cache shared by every page.
 *
 * - Data is kept per key for the whole session, so returning to a page shows
 *   what was loaded last time straight away.
 * - A key is refetched in the background when a component mounts and the data
 *   is older than `staleMs` (or was invalidated). Fresh data is not refetched.
 * - Concurrent requests for the same key share one in-flight promise, which
 *   also removes the StrictMode double fetch in development.
 */

interface Entry {
  data?: unknown
  error: string | null
  updatedAt: number
  stale: boolean
  promise: Promise<unknown> | null
  /** Bumped per request so a slower, older response never overwrites a newer one. */
  seq: number
  snapshot: QuerySnapshot<unknown>
}

export interface QuerySnapshot<T> {
  data: T | undefined
  error: string | null
  /** True while a request for this key is in flight (with or without data). */
  fetching: boolean
}

const DEFAULT_STALE_MS = 60_000
const EMPTY: QuerySnapshot<never> = { data: undefined, error: null, fetching: false }

const store = new Map<string, Entry>()
const listeners = new Map<string, Set<() => void>>()

function getEntry(key: string): Entry {
  let entry = store.get(key)
  if (!entry) {
    entry = { error: null, updatedAt: 0, stale: true, promise: null, seq: 0, snapshot: EMPTY }
    store.set(key, entry)
  }
  return entry
}

function emit(key: string): void {
  const entry = store.get(key)
  if (entry) {
    entry.snapshot = { data: entry.data, error: entry.error, fetching: entry.promise !== null }
  }
  listeners.get(key)?.forEach((listener) => listener())
}

function subscribe(key: string, listener: () => void): () => void {
  let set = listeners.get(key)
  if (!set) {
    set = new Set()
    listeners.set(key, set)
  }
  set.add(listener)
  return () => {
    set.delete(listener)
  }
}

/**
 * Fetch `key` and store the result. Joins a request already in flight unless
 * `force` is set (use force after a write, so the result reflects it).
 */
export function fetchQuery<T>(key: string, fetcher: () => Promise<T>, force = false): Promise<T> {
  const entry = getEntry(key)
  if (entry.promise && !force) return entry.promise as Promise<T>

  const seq = ++entry.seq
  const current = (): boolean => store.get(key) === entry && entry.seq === seq

  const promise = fetcher().then(
    (data) => {
      if (!current()) return data
      entry.data = data
      entry.error = null
      entry.updatedAt = Date.now()
      entry.stale = false
      entry.promise = null
      emit(key)
      return data
    },
    (err: unknown) => {
      if (current()) {
        entry.error = err instanceof Error ? err.message : 'Request failed'
        entry.promise = null
        emit(key)
      }
      throw err
    }
  )

  entry.promise = promise
  emit(key)
  return promise
}

/** Cached data for `key`, if any. */
export function peekQuery<T>(key: string): T | undefined {
  return store.get(key)?.data as T | undefined
}

/** Replace the cached data for `key` (e.g. after a write that returned it). */
export function setQueryData<T>(key: string, data: T): void {
  const entry = getEntry(key)
  entry.seq++
  entry.promise = null
  entry.data = data
  entry.error = null
  entry.updatedAt = Date.now()
  entry.stale = false
  emit(key)
}

/**
 * Mark keys stale so the next mount refetches them: every key starting with
 * `match` when it is a string, or every key it returns true for.
 */
export function invalidateQueries(match: string | ((key: string) => boolean)): void {
  const test = typeof match === 'string' ? (key: string) => key.startsWith(match) : match
  for (const [key, entry] of store) {
    if (test(key)) entry.stale = true
  }
}

/** Forget everything (sign-out). */
export function clearQueryCache(): void {
  store.clear()
  for (const key of listeners.keys()) emit(key)
}

/** True when `key` has data that is neither invalidated nor older than `staleMs`. */
export function isQueryFresh(key: string, staleMs = DEFAULT_STALE_MS): boolean {
  const entry = store.get(key)
  return Boolean(
    entry && entry.data !== undefined && !entry.stale && Date.now() - entry.updatedAt <= staleMs
  )
}

function needsFetch(key: string, staleMs: number): boolean {
  const entry = store.get(key)
  if (!entry) return true
  if (entry.promise) return false
  return entry.stale || entry.data === undefined || Date.now() - entry.updatedAt > staleMs
}

export interface QueryResult<T> extends QuerySnapshot<T> {
  /** No data yet and a request is in flight: the only time to show a skeleton. */
  loading: boolean
  refresh: () => Promise<T | undefined>
}

/**
 * Read `key` from the cache and revalidate it on mount when stale. Pass a null
 * key to disable (e.g. no workspace yet). The fetcher is read on each call, so
 * it does not need to be memoised.
 */
export function useQuery<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  { staleMs = DEFAULT_STALE_MS }: { staleMs?: number } = {}
): QueryResult<T> {
  const snapshot = useSyncExternalStore(
    useCallback((listener: () => void) => (key ? subscribe(key, listener) : () => {}), [key]),
    () => (key ? (store.get(key)?.snapshot as QuerySnapshot<T> | undefined) ?? EMPTY : EMPTY)
  )

  useEffect(() => {
    if (key && needsFetch(key, staleMs)) {
      fetchQuery(key, fetcher).catch(() => {
        /* The error is stored on the entry and returned in the snapshot. */
      })
    }
    // The fetcher is intentionally not a dependency: the key identifies the data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, staleMs])

  const refresh = useCallback(async (): Promise<T | undefined> => {
    if (!key) return undefined
    // A refresh after a write must not reuse a request that started before it.
    return fetchQuery(key, fetcher, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return {
    ...snapshot,
    loading: snapshot.data === undefined && (snapshot.fetching || (key !== null && !snapshot.error)),
    refresh
  }
}
