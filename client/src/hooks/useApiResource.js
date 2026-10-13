import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Small data-fetching hook: loading / error / data plus a manual `refetch`.
 *
 * `request` must be a stable function (wrap it in useCallback) — the hook keys
 * off `deps` so pages can refetch when filters change.
 */
export function useApiResource(request, deps = [], { enabled = true, initialData = null } = {}) {
  const [data, setData] = useState(initialData);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const [refreshing, setRefreshing] = useState(false);
  const requestRef = useRef(request);
  const mounted = useRef(true);
  const firstLoad = useRef(true);

  requestRef.current = request;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await requestRef.current();
      if (!mounted.current) return null;
      setData(response?.data ?? null);
      setMeta(response?.meta ?? null);
      setError(null);
      return response;
    } catch (caught) {
      if (!mounted.current) return null;
      if (caught?.name === 'AbortError') return null;
      setError(caught);
      return null;
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
        firstLoad.current = false;
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return useMemo(
    () => ({
      data,
      meta,
      error,
      loading: loading && enabled,
      refreshing,
      refetch: run,
      setData,
    }),
    [data, meta, error, loading, refreshing, run, enabled],
  );
}

export default useApiResource;
