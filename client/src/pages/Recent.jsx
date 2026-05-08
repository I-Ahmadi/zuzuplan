import { Link } from "react-router-dom";
import { Clock3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RECENT_KEY = "zuzuplan.recentNavigation";

function getRecentItems() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function Recent() {
  const items = getRecentItems();

  return (
    <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Recent</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recently opened spaces, boards, docs, tasks, and settings.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recently Viewed</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => (
            <Link key={item.path} to={item.path} className="flex items-center gap-3 rounded-md border p-3 text-sm hover:border-primary/60">
              <Clock3 className="h-4 w-4 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{item.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.path}</span>
              </span>
            </Link>
          ))}
          {!items.length ? <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Your recently viewed work will appear here.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
