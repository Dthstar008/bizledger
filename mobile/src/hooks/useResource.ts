import { useCallback, useEffect, useRef, useState } from 'react';
import { apiErrorMessage, isNetworkError } from '../api/client';
import { AppEventType, useRefreshOn } from '../events/bus';
import { readCache, writeCache } from '../offline/cache';
import { onBackOnline } from '../offline/connection';

interface State<T> {
  data: T | null;
  error: string | null;
  /** First load with nothing to show yet: render a skeleton. */
  loading: boolean;
  /** Pull-to-refresh or event-driven reload: keep showing the old data. */
  refreshing: boolean;
  /** Set while showing the copy saved on the phone because the server couldn't be reached: when it was saved. */
  savedAt: number | null;
}

interface CacheOptions<T> {
  /** Name for the copy kept on the phone (scoped to business, user and branch). */
  key: string;
  /** Trim what's saved, e.g. only the most recent sales. */
  trim?: (data: T) => T;
}

/**
 * Loads data once, then refreshes only when one of `events` fires (or the
 * user pulls to refresh). Errors never throw; they're returned as a
 * user-facing message.
 *
 * With `cache`, the last data loaded is kept on the phone: it shows at once
 * while fresh data loads, and stands in (without an error) when there's no
 * connection. The data reloads by itself when the connection returns.
 */
export function useResource<T>(loader: () => Promise<T>, events: AppEventType[], deps: unknown[] = [], cache?: CacheOptions<T>) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true, refreshing: false, savedAt: null });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const seq = useRef(0);

  const run = useCallback(async (mode: 'initial' | 'refresh') => {
    const id = ++seq.current;
    const c = cacheRef.current;
    setState((s) => ({ ...s, loading: mode === 'initial' && s.data === null, refreshing: mode === 'refresh', error: null }));

    // Show the saved copy straight away instead of a skeleton.
    if (mode === 'initial' && c) {
      const saved = await readCache<T>(c.key);
      if (saved && id === seq.current) {
        setState((s) => (s.data === null ? { ...s, data: saved.data, loading: false, savedAt: saved.savedAt } : s));
      }
    }

    try {
      const data = await loaderRef.current();
      if (id !== seq.current) return;
      setState({ data, error: null, loading: false, refreshing: false, savedAt: null });
      if (c) void writeCache(c.key, c.trim ? c.trim(data) : data);
    } catch (err) {
      if (id !== seq.current) return;
      if (isNetworkError(err) && c) {
        // Keep whatever is showing (saved or earlier data); the connection bar explains why it may be out of date.
        const saved = await readCache<T>(c.key);
        if (id !== seq.current) return;
        setState((s) => {
          const data = s.data ?? saved?.data ?? null;
          if (data === null) return { ...s, error: apiErrorMessage(err), loading: false, refreshing: false };
          return { ...s, data, error: null, loading: false, refreshing: false, savedAt: s.savedAt ?? saved?.savedAt ?? Date.now() };
        });
        return;
      }
      setState((s) => ({ ...s, error: apiErrorMessage(err), loading: false, refreshing: false }));
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void run('initial'), deps);
  useRefreshOn(events, () => void run('refresh'));

  // Data shown from the phone's copy (or that failed to load) refreshes once the connection is back.
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(
    () =>
      onBackOnline(() => {
        const s = stateRef.current;
        if (s.savedAt !== null || s.error) void run('refresh');
      }),
    [run],
  );

  return {
    ...state,
    reload: useCallback(() => run('refresh'), [run]),
    retry: useCallback(() => run('initial'), [run]),
    setData: useCallback((data: T) => setState((s) => ({ ...s, data })), []),
  };
}
