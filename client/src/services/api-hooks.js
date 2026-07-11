import { useCallback, useEffect, useRef, useState } from "react";

const API_RESOURCE_REFRESH_EVENT = "sprintly-api-resource-refresh";

function areDepsEqual(previousDeps, nextDeps) {
  if (previousDeps === nextDeps) return true;
  if (!previousDeps || previousDeps.length !== nextDeps.length) return false;
  return previousDeps.every((dep, index) => Object.is(dep, nextDeps[index]));
}

export function emitApiResourceRefresh(name) {
  if (typeof window === "undefined" || !name) return;
  window.dispatchEvent(new CustomEvent(API_RESOURCE_REFRESH_EVENT, { detail: name }));
}

export function useApiResource(fetcher, deps = [], options = {}) {
  const { enabled = true, initialData = null, refreshEvents = [], resetOnChange = false } = options;
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(enabled));
  const [isFetching, setIsFetching] = useState(false);
  const requestIdRef = useRef(0);
  const depsRef = useRef(deps);
  const depsChanged = resetOnChange && !areDepsEqual(depsRef.current, deps);

  const load = useCallback(async ({ reset = false } = {}) => {
    if (!enabled) {
      if (reset) {
        setData(initialData);
        setError(null);
      }
      setIsLoading(false);
      setIsFetching(false);
      return null;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const firstLoad = reset || data === null;

    setError(null);
    if (reset) setData(initialData);
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
  }, [enabled, fetcher, data, initialData]);

  useEffect(() => {
    depsRef.current = deps;
    load({ reset: resetOnChange });
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

  const visibleData = depsChanged ? initialData : data;
  const visibleError = depsChanged ? null : error;
  const visibleIsLoading = depsChanged ? Boolean(enabled) : isLoading;
  const visibleIsFetching = depsChanged ? Boolean(enabled) : isFetching;
  const hasData = visibleData !== null && visibleData !== undefined && visibleData?.success !== false;
  const errorMessage = visibleError?.message || visibleData?.error?.message || visibleData?.message || "";
  const isError = Boolean(visibleError || visibleData?.success === false);

  return {
    data: visibleData,
    error: visibleError,
    errorMessage,
    hasData,
    isError,
    isLoading: visibleIsLoading,
    isFetching: visibleIsFetching,
    isInitialLoading: visibleIsLoading && !hasData,
    isRefreshing: visibleIsFetching && hasData,
    reload: load,
    retry: load,
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
