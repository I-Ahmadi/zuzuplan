import { useState } from "react";
import { Activity as ActivityIcon, ListTodo, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PAGE_SIZE, PaginationControls } from "@/components/ui/pagination";
import { UserAvatar } from "@/components/ui/avatar";
import { useApiResource } from "@/lib/api-hooks";
import { getActivityEvents } from "@/lib/activity-api";

function iconFor(type) {
  if (type?.includes("issue")) return ListTodo;
  return ActivityIcon;
}

export default function Activity() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const activityQuery = useApiResource(() => getActivityEvents({ search, page, limit: PAGE_SIZE }), [search, page]);
  const events = activityQuery.data?.data || [];
  const pagination = activityQuery.data?.pagination;

  return (
    <div className="space-y-4 px-3 py-4 sm:px-4 lg:px-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">A durable timeline for issues, comments, spaces, and team activity.</p>
      </div>
      <Card>
        <CardHeader className="border-b px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base">Engineering timeline</CardTitle>
            <div className="relative md:w-96">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="h-9 pl-8" placeholder="Search activity" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {activityQuery.isLoading ? <p className="p-6 text-sm text-muted-foreground">Loading activity...</p> : null}
          {!activityQuery.isLoading && !events.length ? <p className="p-8 text-center text-sm text-muted-foreground">No activity recorded yet.</p> : null}
          {events.map((event) => {
            const Icon = iconFor(event.type);
            return (
              <div key={event.id} className="grid gap-3 border-b px-4 py-3 text-sm last:border-b-0 md:grid-cols-[32px_minmax(0,1fr)_auto] md:items-start">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/50 text-primary"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="font-semibold">{event.title}</p>
                  <p className="mt-1 text-muted-foreground">{event.description || event.task?.title || event.project?.name || "No description"}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <UserAvatar user={event.actor} fallback={event.actor?.name || event.actor?.email || "U"} className="h-5 w-5" />
                    <span>{event.actor?.name || event.actor?.email || "System"}</span>
                    <span>·</span>
                    <span>{event.project?.name || "Account"}</span>
                  </div>
                </div>
                <time className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</time>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <PaginationControls pagination={pagination} onPageChange={setPage} />
    </div>
  );
}
