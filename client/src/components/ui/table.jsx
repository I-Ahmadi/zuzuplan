export function Table(props) {
  return <table className="w-full caption-bottom text-sm" {...props} />;
}

export function TableHeader(props) {
  return <thead className="[&_tr]:border-b" {...props} />;
}

export function TableBody(props) {
  return <tbody className="[&_tr:last-child]:border-0" {...props} />;
}

export function TableRow(props) {
  return <tr className="border-b transition-colors hover:bg-muted/50" {...props} />;
}

export function TableHead(props) {
  return <th className="h-9 px-2 text-left align-middle font-medium text-muted-foreground" {...props} />;
}

export function TableCell(props) {
  return <td className="px-2 py-1.5 align-middle" {...props} />;
}
