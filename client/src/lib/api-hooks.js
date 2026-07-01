import { useCallback, useEffect, useRef, useState } from "react";

const API_RESOURCE_REFRESH_EVENT = "zuzuplan-api-resource-refresh";

export function emitApiResourceRefresh(name) {
  if (typeof window === "undefined" || !name) return;
  window.dispatchEvent(new CustomEvent(API_RESOURCE_REFRESH_EVENT, { detail: name }));
}

export function useApiResource(fetcher, deps = [], options = {}) {
  const { enabled = true, initialData = null, refreshEvents = [] } = options;
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(enabled));
  const [isFetching, setIsFetching] = useState(false);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      setIsFetching(false);
      return null;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const firstLoad = data === null;

    setError(null);
    setIsFetching(true);
    if (firstLoad) setIsLoading(true);

    try {
      const result = await fetcher();
      if (requestIdRef.current === requestId) {
        setData(result);
      }
      return result;
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setError(err);
      }
      return null;
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
        setIsFetching(false);
      }
    }
  }, [enabled, fetcher, data]);

  useEffect(() => {
    load();
  }, deps);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!refreshEvents.length || typeof window === "undefined") return undefined;

    function handleRefresh(event) {
      if (refreshEvents.includes(event.detail)) {
        load();
      }
    }

    window.addEventListener(API_RESOURCE_REFRESH_EVENT, handleRefresh);
    return () => window.removeEventListener(API_RESOURCE_REFRESH_EVENT, handleRefresh);
  }, [load, refreshEvents]);

  return {
    data,
    error,
    isError: Boolean(error || data?.success === false),
    isLoading,
    isFetching,
    reload: load,
  };
}

export function useApiAction(action, options = {}) {
  const { onSuccess, onError } = options;
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isPending, setIsPending] = useState(false);

  const run = useCallback(
    async (variables, callbacks = {}) => {
      setError(null);
      setIsPending(true);

      try {
        const result = await action(variables);
        setData(result);
        onSuccess?.(result, variables);
        callbacks.onSuccess?.(result, variables);
        return result;
      } catch (err) {
        setError(err);
        onError?.(err, variables);
        callbacks.onError?.(err, variables);
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [action, onError, onSuccess]
  );

  return {
    data,
    error,
    isPending,
    run,
    mutate: run,
    mutateAsync: run,
  };
}
