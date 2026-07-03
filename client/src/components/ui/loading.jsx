import { Loader2 } from "lucide-react";

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

export function InlineLoader({ message = "Loading...", className }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 rounded-md border border-border bg-background px-4 py-6 text-sm text-muted-foreground",
        className,
      )}
    >
      <Spinner className="h-4 w-4" label={message} />
      <span>{message}</span>
    </div>
  );
}
