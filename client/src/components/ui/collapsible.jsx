export function Collapsible({ children }) {
  return children;
}

export function CollapsibleTrigger({ asChild, children }) {
  return asChild ? children : <button type="button">{children}</button>;
}

export function CollapsibleContent({ children }) {
  return children;
}
