import { useCallback, useEffect, useRef, useState } from 'react';
import { apiErrorMessage } from '../api/client';
import { AppEventType, useRefreshOn } from '../events/bus';

interface State<T> {
  data: T | null;
  error: string | null;
  /** First load with nothing to show yet: render a skeleton. */
  loading: boolean;
  /** Pull-to-refresh or event-driven reload: keep showing the old data. */
  refreshing: boolean;
}

/**
 * Loads data once, then refreshes only when one of `events` fires (or the
 * user pulls to refresh). Errors never throw; they're returned as a
 * user-facing message.
 */
export function useResource<T>(loader: () => Promise<T>, events: AppEventType[], deps: unknown[] = []) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true, refreshing: false });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const seq = useRef(0);

  const run = useCallback(async (mode: 'initial' | 'refresh') => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: mode === 'initial' && s.data === null, refreshing: mode === 'refresh', error: null }));
    try {
      const data = await loaderRef.current();
      if (id === seq.current) setState({ data, error: null, loading: false, refreshing: false });
    } catch (err) {
      if (id === seq.current) setState((s) => ({ ...s, error: apiErrorMessage(err), loading: false, refreshing: false }));
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => void run('initial'), deps);
  useRefreshOn(events, () => void run('refresh'));

  return {
    ...state,
    reload: useCallback(() => run('refresh'), [run]),
    retry: useCallback(() => run('initial'), [run]),
    setData: useCallback((data: T) => setState((s) => ({ ...s, data })), []),
  };
}
