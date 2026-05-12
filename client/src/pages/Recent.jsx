import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Clock3,
  FileText,
  FolderKanban,
  ListTodo,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PAGE_SIZE } from "@/components/ui/pagination";
import { UserAvatar } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { getProjectDocs } from "@/lib/doc-api";
import { getProjects } from "@/lib/project-api";
import { getProjectTasks } from "@/lib/task-api";
import { ISSUE_STATUS_LABELS } from "@/lib/issue-constants";
import { cn } from "@/lib/utils";

const DAY_MS = 1000 * 60 * 60 * 24;
const FILTERS = [
  { value: "all", label: "All" },
  { value: "task", label: "Issues" },
  { value: "doc", label: "Docs" },
  { value: "space", label: "Spaces" },
  { value: "assigned", label: "Assigned to me" },
  { value: "created", label: "Created by me" },
];
const STATUS_LABELS = ISSUE_STATUS_LABELS;
const PRIORITY_TONES = {
  URGENT: "border-red-500/30 bg-red-500/10 text-red-500",
  HIGH: "border-red-500/30 bg-red-500/10 text-red-500",
  MEDIUM: "border-orange-500/30 bg-orange-500/10 text-orange-500",
  LOW: "border-muted bg-muted/40 text-muted-foreground",
};

function itemDate(item, field = "updatedAt") {
  return new Date(item[field] || item.createdAt || 0);
}

function relativeDate(value) {
  if (!value) return "No date";
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.max(0, Math.floor(diff / DAY_MS));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function groupLabel(value) {
  if (!value) return "Older";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const date = new Date(value);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor((today.getTime() - day.getTime()) / DAY_MS);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff <= 7) return "This week";
  return "Older";
}

function activityReason(item) {
  const created = item.createdAt ? new Date(item.createdAt).getTime() : 0;
  const updated = item.updatedAt ? new Date(item.updatedAt).getTime() : created;
  const verb = Math.abs(updated - created) < 1000 ? "Created" : "Updated";
  return `${verb} ${relativeDate(item.updatedAt || item.createdAt).toLowerCase()}`;
}

function issueKey(task) {
  return `${task.space?.key || "SPC"}-${task.id.slice(-4).toUpperCase()}`;
}

function typeIcon(type) {
  if (type === "doc") return FileText;
  if (type === "space") return FolderKanban;
  return ListTodo;
}

function matchesFilter(item, filter, userId) {
  if (filter === "all") return true;
  if (filter === "assigned") return item.type === "task" && item.assigneeId === userId;
  if (filter === "created") {
    return item.createdById === userId || item.createdBy?.id === userId || item.ownerId === userId || item.owner?.id === userId;
  }
  return item.type === filter;
}

function isSearchMatch(item, query) {
  if (!query.trim()) return true;
  const haystack = [
    item.title,
    item.key,
    item.space?.name,
    item.space?.key,
    item.status,
    item.priority,
    item.type,
  ].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function MetricCard({ label, value, icon: Icon, detail }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/50 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-md border border-dashed p-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PriorityBadge({ priority }) {
  if (!priority) return null;
  return (
    <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[11px] font-semibold", PRIORITY_TONES[priority] || PRIORITY_TONES.LOW)}>
      {priority}
    </span>
  );
}

function StatusBadge({ status }) {
  if (!status) return null;
  return (
    <span className="inline-flex rounded border bg-muted/35 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function RecentRow({ item }) {
  const Icon = typeIcon(item.type);

  return (
    <Link to={item.to} className="flex gap-3 rounded-md border p-3 text-sm transition-colors hover:border-primary/60 hover:bg-accent/45">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/45 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="truncate font-semibold">{item.title}</span>
          {item.key ? <span className="text-xs text-muted-foreground">{item.key}</span> : null}
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {item.space?.name || item.typeLabel} · {activityReason(item)}
        </span>
        <span className="mt-2 flex flex-wrap gap-2">
          <StatusBadge status={item.status} />
          <PriorityBadge priority={item.priority} />
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end justify-between gap-2 text-right">
        {item.assignee ? (
          <UserAvatar user={item.assignee} fallback={item.assignee?.name || item.assignee?.email || "U"} className="h-7 w-7" fallbackClassName="bg-primary text-[10px] text-primary-foreground" />
        ) : null}
        <span className="text-xs text-muted-foreground">{relativeDate(item.updatedAt || item.createdAt)}</span>
      </span>
    </Link>
  );
}

function CompactItem({ item }) {
  const Icon = typeIcon(item.type);
  return (
    <Link to={item.to} className="flex items-start gap-2 rounded-md border p-3 text-sm transition-colors hover:border-primary/60 hover:bg-accent/45">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{item.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.space?.name || item.typeLabel} · {relativeDate(item.createdAt)}</span>
      </span>
    </Link>
  );
}

function SpaceActivityRow({ space, tasks, docs }) {
  const latest = [...tasks, ...docs, space].sort((a, b) => itemDate(b).getTime() - itemDate(a).getTime())[0];
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === "DONE").length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  return (
    <Link to={`/spaces/${space.id}/issues`} className="block rounded-md border p-3 text-sm transition-colors hover:border-primary/60 hover:bg-accent/45">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{space.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{total} tasks · {docs.length} docs · {relativeDate(latest?.updatedAt || latest?.createdAt)}</p>
        </div>
        <span className="rounded border bg-muted/35 px-2 py-1 text-xs font-medium">{space.key}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
    </Link>
  );
}

export default function Recent() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const spacesQuery = useQuery({ queryKey: ["spaces", "recent"], queryFn: () => getProjects({ limit: PAGE_SIZE }) });
  const spaces = spacesQuery.data?.data || [];

  const taskQueries = useQueries({
    queries: spaces.map((space) => ({
      queryKey: ["recent-tasks", space.id],
      queryFn: () => getProjectTasks(space.id, { limit: PAGE_SIZE }),
      enabled: Boolean(space.id),
    })),
  });
  const docQueries = useQueries({
    queries: spaces.map((space) => ({
      queryKey: ["recent-docs", space.id],
      queryFn: () => getProjectDocs(space.id, { limit: PAGE_SIZE }),
      enabled: Boolean(space.id),
    })),
  });

  const loading = spacesQuery.isLoading || taskQueries.some((query) => query.isLoading) || docQueries.some((query) => query.isLoading);

  const recentData = useMemo(() => {
    const tasks = taskQueries.flatMap((query, index) => (query.data?.data || []).map((task) => {
      const space = spaces[index];
      return {
        ...task,
        type: "task",
        typeLabel: "Issue",
        title: task.title,
        key: issueKey({ ...task, space }),
        to: `/spaces/${space.id}/issues/${task.id}`,
        space,
      };
    }));
    const docs = docQueries.flatMap((query, index) => (query.data?.data || []).map((doc) => {
      const space = spaces[index];
      return {
        ...doc,
        type: "doc",
        typeLabel: "Doc",
        title: doc.title,
        key: space?.key,
        to: `/spaces/${space.id}/issues?view=docs`,
        space,
      };
    }));
    const spaceItems = spaces.map((space) => ({
      ...space,
      type: "space",
      typeLabel: "Space",
      title: space.name,
      key: space.key,
      to: `/spaces/${space.id}/issues`,
      space,
      ownerId: space.ownerId,
      owner: space.owner,
    }));
    const allItems = [...tasks, ...docs, ...spaceItems].sort((a, b) => itemDate(b).getTime() - itemDate(a).getTime());
    const filtered = allItems.filter((item) => matchesFilter(item, filter, user?.id) && isSearchMatch(item, search));
    const grouped = filtered.reduce((acc, item) => {
      const label = groupLabel(item.updatedAt || item.createdAt);
      acc[label] = acc[label] || [];
      acc[label].push(item);
      return acc;
    }, {});
    const created = allItems
      .filter((item) => matchesFilter(item, "created", user?.id))
      .sort((a, b) => itemDate(b, "createdAt").getTime() - itemDate(a, "createdAt").getTime());
    const recentDocs = docs.sort((a, b) => itemDate(b).getTime() - itemDate(a).getTime());
    const spacesWithActivity = spaces
      .map((space) => ({
        space,
        tasks: tasks.filter((task) => task.space?.id === space.id),
        docs: docs.filter((doc) => doc.space?.id === space.id),
      }))
      .sort((a, b) => {
        const aLatest = [...a.tasks, ...a.docs, a.space].sort((x, y) => itemDate(y).getTime() - itemDate(x).getTime())[0];
        const bLatest = [...b.tasks, ...b.docs, b.space].sort((x, y) => itemDate(y).getTime() - itemDate(x).getTime())[0];
        return itemDate(bLatest).getTime() - itemDate(aLatest).getTime();
      });

    return { allItems, filtered, grouped, tasks, docs, created, recentDocs, spacesWithActivity };
  }, [docQueries, filter, search, spaces, taskQueries, user?.id]);

  return (
    <div className="space-y-4 px-3 py-4 sm:px-4 lg:px-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Recent</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recent work activity across spaces, tasks, and docs without storing navigation history.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Recent items" value={recentData.allItems.length} detail="Issues, docs, and spaces" icon={Clock3} />
        <MetricCard label="Updated tasks" value={recentData.tasks.length} detail="From accessible spaces" icon={ListTodo} />
        <MetricCard label="Recent docs" value={recentData.docs.length} detail="Recently edited documents" icon={FileText} />
        <MetricCard label="Active spaces" value={spaces.length} detail="Included in this view" icon={FolderKanban} />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search recent work by title, key, space, status, or priority" className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={filter === item.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
        <main>
          <Card>
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock3 className="h-4 w-4 text-muted-foreground" />
                Activity Timeline
              </CardTitle>
              <p className="text-sm text-muted-foreground">Grouped by recent backend activity, not page visits.</p>
            </CardHeader>
            <CardContent className="space-y-5 p-4">
              {["Today", "Yesterday", "This week", "Older"].map((label) => {
                const items = recentData.grouped[label] || [];
                if (!items.length) return null;
                return (
                  <section key={label} className="space-y-2">
                    <h2 className="text-xs font-semibold uppercase text-muted-foreground">{label}</h2>
                    <div className="space-y-2">
                      {items.map((item) => <RecentRow key={`${item.type}-${item.id}`} item={item} />)}
                    </div>
                  </section>
                );
              })}
              {!recentData.filtered.length ? (
                <EmptyState
                  title={loading ? "Loading recent activity..." : "No recent activity found"}
                  description={loading ? "Gathering tasks, docs, and spaces." : "Create or update tasks, docs, or spaces to see them here."}
                />
              ) : null}
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                Recently Created
              </CardTitle>
              <p className="text-sm text-muted-foreground">Items you created, separated from updates.</p>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              {recentData.created.slice(0, 5).map((item) => <CompactItem key={`created-${item.type}-${item.id}`} item={item} />)}
              {!recentData.created.length ? <EmptyState title="No created items yet" description="Work you create will appear here." /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                Recent Spaces
              </CardTitle>
              <p className="text-sm text-muted-foreground">Spaces ranked by their latest task or doc activity.</p>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              {recentData.spacesWithActivity.slice(0, 5).map(({ space, tasks, docs }) => (
                <SpaceActivityRow key={space.id} space={space} tasks={tasks} docs={docs} />
              ))}
              {!spaces.length ? <EmptyState title="No spaces yet" description="Create a space to start seeing recent work." /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Recent Docs
              </CardTitle>
              <p className="text-sm text-muted-foreground">Recently edited docs across spaces.</p>
            </CardHeader>
            <CardContent className="space-y-2 p-4">
              {recentData.recentDocs.slice(0, 5).map((item) => <CompactItem key={`doc-${item.id}`} item={item} />)}
              {!recentData.recentDocs.length ? <EmptyState title="No recent docs" description="Edited space docs will appear here." /> : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
