import { cn } from "@/lib/utils";

export function Dialog({ open, children }) {
  return open ? children : null;
}

export function DialogContent({ className, children, ...props }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" {...props}>
      <div
        role="dialog"
        aria-modal="true"
        className={cn("w-full max-w-lg rounded-lg border bg-background p-4 shadow-lg", className)}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }) {
  return <div className={cn("flex flex-col space-y-1 text-center sm:text-left", className)} {...props} />;
}

export function DialogTitle({ className, ...props }) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props} />;
}

export function DialogFooter({ className, ...props }) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}
