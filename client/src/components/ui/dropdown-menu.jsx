export function DropdownMenu({ children }) {
  return children;
}

export function DropdownMenuTrigger({ asChild, children }) {
  return asChild ? children : <button type="button">{children}</button>;
}

export function DropdownMenuContent({ children, className, ...props }) {
  return <div className={className} {...props}>{children}</div>;
}

export function DropdownMenuItem({ asChild, children, ...props }) {
  if (asChild) {
    return children;
  }

  return <button type="button" {...props}>{children}</button>;
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-border" />;
}
