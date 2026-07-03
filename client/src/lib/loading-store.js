const listeners = new Set();

let pendingCount = 0;

function emit() {
  listeners.forEach((listener) => listener(pendingCount));
}

export function startGlobalLoading() {
  pendingCount += 1;
  emit();

  let stopped = false;

  return () => {
    if (stopped) return;
    stopped = true;
    pendingCount = Math.max(0, pendingCount - 1);
    emit();
  };
}

export function subscribeGlobalLoading(listener) {
  listeners.add(listener);
  listener(pendingCount);

  return () => {
    listeners.delete(listener);
  };
}

export function getGlobalLoadingCount() {
  return pendingCount;
}
