import { useEffect, useState } from "react";

import { Spinner } from "@/components/ui/loading";
import { subscribeGlobalLoading } from "@/stores/loading-store";
import { cn } from "@/utils/cn";

export function GlobalLoadingIndicator() {
  const [pendingCount, setPendingCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => subscribeGlobalLoading(setPendingCount), []);

  useEffect(() => {
    if (pendingCount <= 0) {
      setVisible(false);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 180);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pendingCount]);

  return (
    <div
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed right-4 top-4 z-[200] flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm transition-opacity duration-150",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <Spinner className="h-4 w-4" label="Loading" />
      <span>Loading...</span>
    </div>
  );
}
