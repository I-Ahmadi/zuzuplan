import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Spinner({ className, label = "Loading" }) {
  return (
    <Loader2
      aria-label={label}
      className={cn("h-5 w-5 animate-spin text-primary", className)}
      role="status"
    />
  );
}

export function FullPageLoader({ message = "Loading..." }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <Spinner className="h-8 w-8" label={message} />
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function LoadingState({ message = "Loading...", variant = "default", className }) {
  const compact = variant === "compact";
  const page = variant === "page";

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 rounded-md border border-border bg-background px-4 text-sm text-muted-foreground",
        compact ? "min-h-16 py-3" : page ? "min-h-[320px] py-10" : "min-h-36 py-8",
        className,
      )}
    >
      <Spinner className="h-4 w-4" label={message} />
      <span>{message}</span>
    </div>
  );
}

export function ErrorState({
  message = "Something went wrong.",
  retryLabel = "Retry",
  onRetry,
  variant = "default",
  className,
}) {
  const compact = variant === "compact";
  const page = variant === "page";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-md border border-border bg-background px-4 text-center text-sm",
        compact ? "min-h-16 py-3" : page ? "min-h-[320px] py-10" : "min-h-36 py-8",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <span>{message}</span>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function AsyncContent({
  query,
  loading,
  error,
  errorMessage,
  onRetry,
  loadingMessage = "Loading...",
  refreshingMessage = "Refreshing...",
  empty,
  emptyWhen = false,
  variant = "default",
  className,
  children,
}) {
  const isInitialLoading = query?.isInitialLoading ?? loading;
  const isRefreshing = query?.isRefreshing ?? false;
  const isError = query?.isError ?? Boolean(error);
  const resolvedErrorMessage = errorMessage || query?.errorMessage || error?.message || "Something went wrong.";
  const retry = onRetry || query?.retry || query?.reload;

  if (isInitialLoading) {
    return <LoadingState message={loadingMessage} variant={variant} className={className} />;
  }

  if (isError) {
    return <ErrorState message={resolvedErrorMessage} onRetry={retry} variant={variant} className={className} />;
  }

  if (emptyWhen) {
    return empty || null;
  }

  return (
    <div className={cn("relative", className)}>
      {isRefreshing ? (
        <div className="mb-3 flex items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
          <Spinner className="h-3.5 w-3.5" label={refreshingMessage} />
          <span>{refreshingMessage}</span>
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function InlineLoader(props) {
  return <LoadingState {...props} />;
}
