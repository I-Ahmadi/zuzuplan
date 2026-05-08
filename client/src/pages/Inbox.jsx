import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  Bell,
  CalendarClock,
  Check,
  Inbox as InboxIcon,
  ListTodo,
  MessageSquare,
  Search,
  Settings,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PAGE_SIZE } from "@/components/ui/pagination";
import { UserAvatar } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { getProjects } from "@/lib/project-api";
import { getProjectTasks, updateTask } from "@/lib/task-api";
import { cn } from "@/lib/utils";

const DAY_MS = 1000 * 60 * 60 * 24;
const FILTERS = [
  { value: "all", label: "All" },
  { value: "assigned", label: "Assigned" },
  { value: "mention", label: "Mentions" },
  { value: "comment", label: "Comments" },
  { value: "due-soon", label: "Due soon" },
  { value: "overdue", label: "Overdue" },
  { value: "archived", label: "Archived" },
];
const STATUSES = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "DONE", label: "Done" },
];
const STATUS_LABELS = Object.fromEntries(STATUSES.map((status) => [status.value, status.label]));
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const PRIORITY_TONES = {
  URGENT: "border-red-500/30 bg-red-500/10 text-red-500",
  HIGH: "border-red-500/30 bg-red-500/10 text-red-500",
  MEDIUM: "border-orange-500/30 bg-orange-500/10 text-orange-500",
  LOW: "border-muted bg-muted/40 text-muted-foreground",
};

function resultMessage(result, fallback) {
  return result?.error?.message || fallback;
}

function relativeDate(value) {
  if (!value) return "No activity";
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.max(0, Math.floor(diff / DAY_MS));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function dueDays(task) {
  if (!task.dueDate) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(task.dueDate);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((dueDay.getTime() - today.getTime()) / DAY_MS);
}

function dueLabel(task) {
  const days = dueDays(task);
  if (days === null) return "No due date";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days}d`;
}

function groupLabel(value) {
  if (!value) return "Older";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const date = new Date(value);
  const itemDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.floor((today.getTime() - itemDay.getTime()) / DAY_MS);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days <= 7) return "This week";
  return "Older";
}

function issueKey(task) {
  return `${task.space?.key || "SPC"}-${task.id.slice(-4).toUpperCase()}`;
}

function taskPath(task) {
  return `/spaces/${task.space?.id || task.projectId}/tasks/${task.id}`;
}

function isOverdue(task) {
  const days = dueDays(task);
  return task.status !== "DONE" && days !== null && days < 0;
}

function isDueSoon(task) {
  const days = dueDays(task);
  return task.status !== "DONE" && days !== null && days >= 0 && days <= 7;
}

function itemIcon(type) {
  if (type === "overdue") return AlertTriangle;
  if (type === "due-soon") return CalendarClock;
  if (type === "comment") return MessageSquare;
  if (type === "mention") return Bell;
  return UserCheck;
}

function PriorityBadge({ priority }) {
  return (
    <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[11px] font-semibold", PRIORITY_TONES[priority] || PRIORITY_TONES.LOW)}>
      {priority || "LOW"}
    </span>
  );
}

function StatusSelect({ value, disabled, onChange }) {
  return (
    <select className="h-8 rounded-md border bg-background px-2 text-sm" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
    </select>
  );
}

function MetricCard({ label, value, detail, icon: Icon }) {
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

function InboxRow({ item, active, unread, onSelect, onMarkRead, onArchive }) {
  const Icon = itemIcon(item.type);

  return (
    <button
      type="button"
      className={cn(
        "flex w-full gap-3 rounded-md border p-3 text-left text-sm transition-colors hover:border-primary/60 hover:bg-accent/45",
        active && "border-primary/70 bg-primary/10",
        unread && "bg-muted/20"
      )}
      onClick={() => onSelect(item)}
    >
      <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/45 text-primary", item.type === "overdue" && "text-red-500")}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          {unread ? <span className="mt-1 h-2 w-2 rounded-full bg-primary" aria-label="Unread" /> : null}
          <span className="truncate font-semibold">{item.title}</span>
          <span className="text-xs text-muted-foreground">{issueKey(item.task)}</span>
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {item.space.name} · {item.reason} · {relativeDate(item.updatedAt)}
        </span>
        <span className="mt-2 flex flex-wrap gap-2">
          <span className="inline-flex rounded border bg-muted/35 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{STATUS_LABELS[item.task.status] || item.task.status}</span>
          <PriorityBadge priority={item.task.priority} />
          <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium", item.type === "overdue" ? "border-red-500/30 bg-red-500/10 text-red-500" : "border-orange-500/30 bg-orange-500/10 text-orange-500")}>
            {dueLabel(item.task)}
          </span>
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end justify-between gap-2">
        <UserAvatar user={item.task.assignee} fallback={item.task.assignee?.name || item.task.assignee?.email || "U"} className="h-7 w-7" fallbackClassName="bg-primary text-[10px] text-primary-foreground" />
        <span className="flex gap-1" onClick={(event) => event.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onMarkRead(item.id)} aria-label="Mark as read">
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onArchive(item.id)} aria-label="Archive">
            <Archive className="h-3.5 w-3.5" />
          </Button>
        </span>
      </span>
    </button>
  );
}

function PreviewPanel({ item, read, archived, onMarkRead, onArchive, onUpdateStatus, updating }) {
  if (!item) {
    return (
      <Card className="xl:sticky xl:top-16">
        <CardContent className="p-6">
          <EmptyState title="Select an inbox item" description="Choose an item from the list to preview details and take action." />
        </CardContent>
      </Card>
    );
  }

  const Icon = itemIcon(item.type);

  return (
    <Card className="xl:sticky xl:top-16">
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-primary" />
          {item.label}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{item.space.name} · {issueKey(item.task)}</p>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="text-lg font-semibold">{item.task.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{item.task.description || "No description yet."}</p>
        </div>

        <div className="grid gap-3 rounded-md border p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Status</span>
            <StatusSelect value={item.task.status} disabled={updating} onChange={(status) => onUpdateStatus(item.task, status)} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Priority</span>
            <PriorityBadge priority={item.task.priority} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Due date</span>
            <span className={cn(isOverdue(item.task) && "text-red-500", isDueSoon(item.task) && !isOverdue(item.task) && "text-orange-500")}>{dueLabel(item.task)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Read state</span>
            <span>{read ? "Read" : "Unread"}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Archive state</span>
            <span>{archived ? "Archived" : "Active"}</span>
          </div>
        </div>

        <div className="rounded-md border bg-muted/20 p-3 text-sm">
          <p className="font-medium">Comments and mentions</p>
          <p className="mt-1 text-xs text-muted-foreground">Direct mention parsing and comment reply threads will appear here when persistent notification events are added.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onMarkRead(item.id)} disabled={read}>
            <Check className="h-4 w-4" />
            Mark read
          </Button>
          <Button variant="outline" size="sm" onClick={() => onArchive(item.id)} disabled={archived}>
            <Archive className="h-4 w-4" />
            Archive
          </Button>
          <Button asChild size="sm">
            <Link to={taskPath(item.task)}>Open task</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Inbox() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [spaceFilter, setSpaceFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [readIds, setReadIds] = useState(() => new Set());
  const [archivedIds, setArchivedIds] = useState(() => new Set());
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState("");

  const spacesQuery = useQuery({ queryKey: ["spaces", "inbox"], queryFn: () => getProjects({ limit: PAGE_SIZE }) });
  const spaces = spacesQuery.data?.data || [];
  const taskQueries = useQueries({
    queries: spaces.map((space) => ({
      queryKey: ["inbox-tasks", space.id],
      queryFn: () => getProjectTasks(space.id, { limit: PAGE_SIZE }),
      enabled: Boolean(space.id),
    })),
  });
  const loading = spacesQuery.isLoading || taskQueries.some((query) => query.isLoading);

  const updateMutation = useMutation({
    mutationFn: ({ task, payload }) => updateTask(task.space.id, task.id, payload),
    onSuccess: (result, variables) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not update task."));
        return;
      }
      setError("");
      queryClient.invalidateQueries({ queryKey: ["inbox-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks", variables.task.space.id] });
    },
    onError: () => setError("Could not update task."),
  });

  const data = useMemo(() => {
    const tasks = taskQueries.flatMap((query, index) => (query.data?.data || []).map((task) => ({ ...task, space: spaces[index] })));
    const items = tasks.flatMap((task) => {
      const entries = [];
      if (task.assigneeId === user?.id && task.status !== "DONE") {
        entries.push({
          id: `assigned-${task.id}`,
          type: "assigned",
          label: "Assignment",
          title: `Assigned to you: ${task.title}`,
          reason: "Assigned to you",
          task,
          space: task.space,
          updatedAt: task.updatedAt || task.createdAt,
        });
      }
      if (task.assigneeId === user?.id && isDueSoon(task)) {
        entries.push({
          id: `due-${task.id}`,
          type: "due-soon",
          label: "Due soon",
          title: `${dueLabel(task)}: ${task.title}`,
          reason: dueLabel(task),
          task,
          space: task.space,
          updatedAt: task.dueDate || task.updatedAt,
        });
      }
      if (task.assigneeId === user?.id && isOverdue(task)) {
        entries.push({
          id: `overdue-${task.id}`,
          type: "overdue",
          label: "Overdue",
          title: `${dueLabel(task)}: ${task.title}`,
          reason: "Past due",
          task,
          space: task.space,
          updatedAt: task.dueDate || task.updatedAt,
        });
      }
      if ((task.createdById === user?.id || task.createdBy?.id === user?.id) && task.updatedAt && task.updatedAt !== task.createdAt) {
        entries.push({
          id: `comment-${task.id}`,
          type: "comment",
          label: "Task update",
          title: `Updated work you created: ${task.title}`,
          reason: "Created by you and recently updated",
          task,
          space: task.space,
          updatedAt: task.updatedAt,
        });
      }
      return entries;
    });

    const filtered = items
      .filter((item) => {
        const archived = archivedIds.has(item.id);
        const unread = !readIds.has(item.id);
        if (filter === "archived") {
          if (!archived) return false;
        } else if (archived) return false;
        if (filter !== "all" && filter !== "archived" && item.type !== filter) return false;
        if (filter === "mention") return false;
        if (unreadOnly && !unread) return false;
        if (spaceFilter && item.space.id !== spaceFilter) return false;
        if (priorityFilter && item.task.priority !== priorityFilter) return false;
        if (statusFilter && item.task.status !== statusFilter) return false;
        if (search.trim()) {
          const haystack = [item.title, item.reason, item.space.name, issueKey(item.task), item.task.status, item.task.priority].join(" ").toLowerCase();
          if (!haystack.includes(search.trim().toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

    const grouped = Object.entries(filtered.reduce((acc, item) => {
      const label = groupLabel(item.updatedAt);
      acc[label] = acc[label] || [];
      acc[label].push(item);
      return acc;
    }, {}));

    return {
      tasks,
      items,
      filtered,
      grouped,
      unread: items.filter((item) => !readIds.has(item.id) && !archivedIds.has(item.id)).length,
      overdue: items.filter((item) => item.type === "overdue" && !archivedIds.has(item.id)).length,
      dueToday: items.filter((item) => dueDays(item.task) === 0 && !archivedIds.has(item.id)).length,
      comments: items.filter((item) => item.type === "comment" && !archivedIds.has(item.id)).length,
    };
  }, [archivedIds, filter, priorityFilter, readIds, search, spaceFilter, spaces, statusFilter, taskQueries, unreadOnly, user?.id]);

  const selectedItem = data.filtered.find((item) => item.id === selectedId) || data.filtered[0];

  function markRead(id) {
    setReadIds((current) => new Set(current).add(id));
  }

  function archive(id) {
    setArchivedIds((current) => new Set(current).add(id));
    setReadIds((current) => new Set(current).add(id));
  }

  function updateStatus(task, status) {
    setError("");
    updateMutation.mutate({ task, payload: { status } });
  }

  return (
    <div className="space-y-4 px-3 py-4 sm:px-4 lg:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">Triage assignments, due work, overdue items, and updates that need attention.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/settting">
            <Settings className="h-4 w-4" />
            Notification settings
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Unread" value={data.unread} detail="Active inbox items" icon={InboxIcon} />
        <MetricCard label="Overdue" value={data.overdue} detail="Assigned past due" icon={AlertTriangle} />
        <MetricCard label="Due today" value={data.dueToday} detail="Needs action today" icon={CalendarClock} />
        <MetricCard label="Updates" value={data.comments} detail="Task updates for your work" icon={MessageSquare} />
      </div>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardContent className="space-y-3 p-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <Button key={item.value} type="button" variant={filter === item.value ? "default" : "outline"} size="sm" onClick={() => setFilter(item.value)}>
                {item.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-2 lg:grid-cols-[minmax(260px,1fr)_repeat(4,minmax(130px,auto))_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search inbox by title, key, space, status, or priority" value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={spaceFilter} onChange={(event) => setSpaceFilter(event.target.value)} aria-label="Filter by space">
              <option value="">All spaces</option>
              {spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
            </select>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filter by priority">
              <option value="">All priorities</option>
              {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
            <Button type="button" variant={unreadOnly ? "default" : "outline"} size="sm" onClick={() => setUnreadOnly((current) => !current)}>
              Unread only
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
        <Card>
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="h-4 w-4 text-muted-foreground" />
              Inbox Items
            </CardTitle>
            <p className="text-sm text-muted-foreground">Grouped by activity date. Read/archive state is local until notification persistence is added.</p>
          </CardHeader>
          <CardContent className="space-y-5 p-4">
            {["Today", "Yesterday", "This week", "Older"].map((label) => {
              const items = data.grouped.find(([group]) => group === label)?.[1] || [];
              if (!items.length) return null;
              return (
                <section key={label} className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase text-muted-foreground">{label}</h2>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <InboxRow
                        key={item.id}
                        item={item}
                        active={selectedItem?.id === item.id}
                        unread={!readIds.has(item.id)}
                        onSelect={(nextItem) => {
                          setSelectedId(nextItem.id);
                          markRead(nextItem.id);
                        }}
                        onMarkRead={markRead}
                        onArchive={archive}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
            {!data.filtered.length ? (
              <EmptyState
                title={loading ? "Loading inbox..." : filter === "mention" ? "No mentions yet" : filter === "overdue" ? "No overdue items" : "Inbox zero"}
                description={loading ? "Gathering assignments and task updates across spaces." : filter === "mention" ? "Direct mention parsing will appear here when notification events are enabled." : "You are caught up for this view."}
              />
            ) : null}
          </CardContent>
        </Card>

        <PreviewPanel
          item={selectedItem}
          read={selectedItem ? readIds.has(selectedItem.id) : false}
          archived={selectedItem ? archivedIds.has(selectedItem.id) : false}
          onMarkRead={markRead}
          onArchive={archive}
          onUpdateStatus={updateStatus}
          updating={updateMutation.isPending}
        />
      </div>
    </div>
  );
}
