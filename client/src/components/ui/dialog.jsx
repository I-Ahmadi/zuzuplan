import { createPortal } from "react-dom";
import { createContext, useContext, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const DialogContext = createContext({ requestOpenChange: null });

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function Dialog({ open, onOpenChange, onClose, children }) {
  if (!open) return null;
  if (typeof document === "undefined") return children;

  function requestOpenChange(nextOpen) {
    onOpenChange?.(nextOpen);
    if (!nextOpen) onClose?.();
  }

  return createPortal(
    <DialogContext.Provider value={{ requestOpenChange }}>
      {children}
    </DialogContext.Provider>,
    document.body
  );
}

export function DialogContent({ className, children, ...props }) {
  const { requestOpenChange } = useContext(DialogContext);
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const previousActiveElement = document.activeElement;
    const focusable = dialog.querySelectorAll(FOCUSABLE_SELECTOR);
    const initialFocus = focusable[0] || dialog;
    initialFocus.focus({ preventScroll: true });

    function handleKeyDown(event) {
      if (event.key === "Escape" && requestOpenChange) {
        event.preventDefault();
        requestOpenChange(false);
        return;
      }

      if (event.key !== "Tab") return;

      const currentFocusable = Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR));
      if (!currentFocusable.length) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const first = currentFocusable[0];
      const last = currentFocusable[currentFocusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousActiveElement && typeof previousActiveElement.focus === "function") {
        previousActiveElement.focus({ preventScroll: true });
      }
    };
  }, [requestOpenChange]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3" {...props}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
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
