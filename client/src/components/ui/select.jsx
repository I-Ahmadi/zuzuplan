import { cn } from "@/lib/utils";

export function Select({ value, onValueChange, children }) {
  return children({ value, onValueChange });
}

export function SelectTrigger({ className, children, ...props }) {
  return (
    <div className={cn("flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm", className)} {...props}>
      {children}
    </div>
  );
}

export function SelectValue({ placeholder, value }) {
  return <span>{value || placeholder}</span>;
}

export function SelectContent({ children }) {
  return <div className="mt-2 space-y-2">{children}</div>;
}

export function SelectItem({ value, children, onSelect }) {
  return (
    <button type="button" className="block w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => onSelect?.(value)}>
      {children}
    </button>
  );
}
