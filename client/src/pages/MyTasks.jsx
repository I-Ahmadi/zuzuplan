import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Filter,
  FolderKanban,
  ListTodo,
  Search,
  X,
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
const STATUSES = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "DONE", label: "Done" },
];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const PRIORITY_RANK = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const PRIORITY_TONES = {
  URGENT: "border-red-500/30 bg-red-500/10 text-red-500",
  HIGH: "border-red-500/30 bg-red-500/10 text-red-500",
  MEDIUM: "border-orange-500/30 bg-orange-500/10 text-orange-500",
  LOW: "border-muted bg-muted/40 text-muted-foreground",
};
const BUCKETS = [
  { value: "assigned", label: "Assigned to me" },
  { value: "created", label: "Created by me" },
  { value: "due-soon", label: "Due soon" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
  { value: "watching", label: "Watching" },
];

function resultMessage(result, fallback) {
  return result?.error?.message || fallback;
}

function relativeDate(value) {
  if (!value) return "No update";
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

function issueKey(task) {
  return `${task.space?.key || "SPC"}-${task.id.slice(-4).toUpperCase()}`;
}

function taskPath(task) {
  return `/spaces/${task.space?.id || task.projectId}/tasks/${task.id}`;
}

function isCreatedBy(task, userId) {
  return task.createdById === userId || task.createdBy?.id === userId;
}

function isDueSoon(task) {
  const days = dueDays(task);
  return task.status !== "DONE" && days !== null && days >= 0 && days <= 7;
}

function isOverdue(task) {
  const days = dueDays(task);
  return task.status !== "DONE" && days !== null && days < 0;
}

function groupLabel(task, groupBy) {
  if (groupBy === "space") return task.space?.name || "No space";
  if (groupBy === "priority") return task.priority || "No priority";
  if (groupBy === "due") {
    const days = dueDays(task);
    if (days === null) return "No due date";
    if (days < 0) return "Overdue";
    if (days === 0) return "Today";
    if (days <= 7) return "This week";
    return "Later";
  }
  return STATUSES.find((status) => status.value === task.status)?.label || task.status || "No status";
}

function sortTasks(tasks, sortBy) {
  const list = [...tasks];
  return list.sort((a, b) => {
    if (sortBy === "priority") return (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4);
    if (sortBy === "status") return String(a.status).localeCompare(String(b.status));
    if (sortBy === "space") return String(a.space?.name || "").localeCompare(String(b.space?.name || ""));
    if (sortBy === "updated") return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    const aDays = dueDays(a);
    const bDays = dueDays(b);
    return (aDays ?? 9999) - (bDays ?? 9999);
  });
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

function PriorityBadge({ priority }) {
  return (
    <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[11px] font-semibold", PRIORITY_TONES[priority] || PRIORITY_TONES.LOW)}>
      {priority || "LOW"}
    </span>
  );
}

function DueBadge({ task }) {
  const days = dueDays(task);
  return (
    <span
      className={cn(
        "inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium",
        days !== null && days < 0 && "border-red-500/30 bg-red-500/10 text-red-500",
        days !== null && days >= 0 && days <= 7 && "border-orange-500/30 bg-orange-500/10 text-orange-500",
        (days === null || days > 7) && "border-border bg-muted/35 text-muted-foreground"
      )}
    >
      {dueLabel(task)}
    </span>
  );
}

function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-md border border-dashed p-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function InlineSelect({ value, options, onChange, disabled, ariaLabel }) {
  return (
    <select
      className="h-8 min-w-32 rounded-md border bg-background px-2 text-sm"
      value={value || ""}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <option key={option.value || option} value={option.value || option}>
          {option.label || option}
        </option>
      ))}
    </select>
  );
}

function TaskTable({ groups, onSelectTask, onUpdateTask, updating }) {
  return (
    <div className="space-y-4">
      {groups.map(([label, tasks]) => (
        <section key={label} className="overflow-hidden rounded-md border">
          <div className="flex items-center justify-between border-b bg-muted/25 px-3 py-2">
            <h2 className="text-sm font-semibold">{label}</h2>
            <span className="text-xs text-muted-foreground">{tasks.length} work items</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Work</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Priority</th>
                  <th className="px-3 py-2 font-semibold">Due date</th>
                  <th className="px-3 py-2 font-semibold">Space</th>
                  <th className="px-3 py-2 font-semibold">Reporter</th>
                  <th className="px-3 py-2 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id} className="border-b last:border-b-0 hover:bg-accent/35">
                    <td className="max-w-[320px] px-3 py-2">
                      <button type="button" className="min-w-0 text-left" onClick={() => onSelectTask(task)}>
                        <span className="block truncate font-semibold hover:text-primary">{task.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{issueKey(task)}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <InlineSelect
                        value={task.status}
                        options={STATUSES}
                        disabled={updating}
                        ariaLabel={`Update status for ${task.title}`}
                        onChange={(status) => onUpdateTask(task, { status })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <InlineSelect
                        value={task.priority}
                        options={PRIORITIES}
                        disabled={updating}
                        ariaLabel={`Update priority for ${task.title}`}
                        onChange={(priority) => onUpdateTask(task, { priority })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="date"
                        className="h-8 min-w-36"
                        value={task.dueDate?.slice(0, 10) || ""}
                        disabled={updating}
                        aria-label={`Update due date for ${task.title}`}
                        onChange={(event) => onUpdateTask(task, { dueDate: event.target.value || null })}
                      />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{task.space?.name || "Space"}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex max-w-40 items-center gap-2">
                        <UserAvatar user={task.createdBy} fallback={task.createdBy?.name || task.createdBy?.email || "U"} className="h-6 w-6" fallbackClassName="bg-primary text-[10px] text-primary-foreground" />
                        <span className="truncate">{task.createdBy?.name || task.createdBy?.email || "Unknown"}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{relativeDate(task.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function TaskDetailDrawer({ task, onClose, onUpdateTask, updating }) {
  if (!task) return null;

  return (
    <aside className="fixed bottom-0 right-0 top-14 z-40 flex w-full flex-col border-l bg-background shadow-2xl sm:w-[82vw] lg:w-[520px]" aria-label="Task details">
      <div className="flex h-12 items-center justify-between border-b px-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{issueKey(task)}</p>
          <p className="truncate text-xs text-muted-foreground">{task.space?.name || "Space"}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close task details">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <h2 className="text-xl font-semibold">{task.title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{task.description || "No description yet."}</p>
        </div>

        <div className="grid gap-3 rounded-md border p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Status</span>
            <InlineSelect value={task.status} options={STATUSES} disabled={updating} ariaLabel="Update task status" onChange={(status) => onUpdateTask(task, { status })} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Priority</span>
            <InlineSelect value={task.priority} options={PRIORITIES} disabled={updating} ariaLabel="Update task priority" onChange={(priority) => onUpdateTask(task, { priority })} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Due date</span>
            <Input type="date" className="h-8 w-40" value={task.dueDate?.slice(0, 10) || ""} disabled={updating} onChange={(event) => onUpdateTask(task, { dueDate: event.target.value || null })} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Assignee</span>
            <span className="inline-flex min-w-0 items-center gap-2">
              <UserAvatar user={task.assignee} fallback={task.assignee?.name || task.assignee?.email || "U"} className="h-6 w-6" fallbackClassName="bg-primary text-[10px] text-primary-foreground" />
              <span className="truncate">{task.assignee?.name || task.assignee?.email || "Unassigned"}</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Reporter</span>
            <span className="truncate">{task.createdBy?.name || task.createdBy?.email || "Unknown"}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <PriorityBadge priority={task.priority} />
          <DueBadge task={task} />
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link to={taskPath(task)}>
            <ExternalLink className="h-4 w-4" />
            Open full task
          </Link>
        </Button>
      </div>
    </aside>
  );
}

export default function MyTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [bucket, setBucket] = useState("assigned");
  const [search, setSearch] = useState("");
  const [spaceFilter, setSpaceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [dueFilter, setDueFilter] = useState("");
  const [reporterFilter, setReporterFilter] = useState("");
  const [sortBy, setSortBy] = useState("due");
  const [groupBy, setGroupBy] = useState("status");
  const [selectedTask, setSelectedTask] = useState(null);
  const [error, setError] = useState("");

  const spacesQuery = useQuery({ queryKey: ["spaces", "my-tasks"], queryFn: () => getProjects({ limit: PAGE_SIZE }) });
  const spaces = spacesQuery.data?.data || [];
  const taskQueries = useQueries({
    queries: spaces.map((space) => ({
      queryKey: ["my-tasks-tasks", space.id],
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

      const updatedTask = { ...result.data, space: variables.task.space };
      setSelectedTask((current) => (current?.id === updatedTask.id ? updatedTask : current));
      setError("");
      queryClient.invalidateQueries({ queryKey: ["my-tasks-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks", variables.task.space.id] });
    },
    onError: () => setError("Could not update task."),
  });

  function updateTaskField(task, payload) {
    setError("");
    updateMutation.mutate({ task, payload });
  }

  const data = useMemo(() => {
    const tasks = taskQueries.flatMap((query, index) => (query.data?.data || []).map((task) => ({ ...task, space: spaces[index] })));
    const openAssigned = tasks.filter((task) => task.assigneeId === user?.id && task.status !== "DONE");
    const dueToday = tasks.filter((task) => task.assigneeId === user?.id && task.status !== "DONE" && dueDays(task) === 0);
    const overdue = tasks.filter((task) => task.assigneeId === user?.id && isOverdue(task));
    const completed = tasks.filter((task) => task.assigneeId === user?.id && task.status === "DONE");
    const inReview = tasks.filter((task) => task.assigneeId === user?.id && task.status === "IN_REVIEW");
    const reporters = Array.from(
      new Map(tasks.filter((task) => task.createdBy).map((task) => [task.createdBy.id || task.createdBy.email, task.createdBy])).values()
    );

    let filtered = tasks.filter((task) => {
      if (bucket === "assigned" && !(task.assigneeId === user?.id && task.status !== "DONE")) return false;
      if (bucket === "created" && !isCreatedBy(task, user?.id)) return false;
      if (bucket === "due-soon" && !(task.assigneeId === user?.id && isDueSoon(task))) return false;
      if (bucket === "overdue" && !(task.assigneeId === user?.id && isOverdue(task))) return false;
      if (bucket === "completed" && !(task.assigneeId === user?.id && task.status === "DONE")) return false;
      if (bucket === "watching") return false;
      if (search.trim()) {
        const haystack = [task.title, issueKey(task), task.space?.name, task.status, task.priority, task.createdBy?.name, task.createdBy?.email].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) return false;
      }
      if (spaceFilter && task.space?.id !== spaceFilter) return false;
      if (statusFilter && task.status !== statusFilter) return false;
      if (priorityFilter && task.priority !== priorityFilter) return false;
      if (reporterFilter && task.createdById !== reporterFilter && task.createdBy?.id !== reporterFilter && task.createdBy?.email !== reporterFilter) return false;
      if (dueFilter === "overdue" && !isOverdue(task)) return false;
      if (dueFilter === "today" && dueDays(task) !== 0) return false;
      if (dueFilter === "week" && !isDueSoon(task)) return false;
      if (dueFilter === "none" && task.dueDate) return false;
      return true;
    });

    filtered = sortTasks(filtered, sortBy);
    const grouped = Object.entries(filtered.reduce((acc, task) => {
      const label = groupLabel(task, groupBy);
      acc[label] = acc[label] || [];
      acc[label].push(task);
      return acc;
    }, {}));

    return { tasks, openAssigned, dueToday, overdue, completed, inReview, reporters, filtered, grouped };
  }, [bucket, dueFilter, groupBy, priorityFilter, reporterFilter, search, sortBy, spaceFilter, spaces, statusFilter, taskQueries, user?.id]);

  return (
    <div className="space-y-4 px-3 py-4 sm:px-4 lg:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Tasks</h1>
          <p className="mt-1 text-sm text-muted-foreground">A focused workbench for assigned, created, due-soon, and completed work across spaces.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/tasks">
            <FolderKanban className="h-4 w-4" />
            Open board
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Open assigned" value={data.openAssigned.length} detail="Current workload" icon={ListTodo} />
        <MetricCard label="Due today" value={data.dueToday.length} detail="Needs action today" icon={CalendarClock} />
        <MetricCard label="Overdue" value={data.overdue.length} detail="Past due date" icon={AlertTriangle} />
        <MetricCard label="Completed" value={data.completed.length} detail="Assigned and done" icon={CheckCircle2} />
        <MetricCard label="In review" value={data.inReview.length} detail="Awaiting review" icon={Clock3} />
      </div>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardContent className="space-y-3 p-3">
          <div className="flex flex-wrap gap-2">
            {BUCKETS.map((item) => (
              <Button key={item.value} type="button" variant={bucket === item.value ? "default" : "outline"} size="sm" onClick={() => setBucket(item.value)}>
                {item.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_repeat(6,minmax(130px,auto))]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search tasks, keys, spaces, reporters..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={spaceFilter} onChange={(event) => setSpaceFilter(event.target.value)} aria-label="Filter by space">
              <option value="">All spaces</option>
              {spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
            </select>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} aria-label="Filter by priority">
              <option value="">All priorities</option>
              {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={dueFilter} onChange={(event) => setDueFilter(event.target.value)} aria-label="Filter by due date">
              <option value="">Any due date</option>
              <option value="today">Due today</option>
              <option value="week">Due this week</option>
              <option value="overdue">Overdue</option>
              <option value="none">No due date</option>
            </select>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={reporterFilter} onChange={(event) => setReporterFilter(event.target.value)} aria-label="Filter by reporter">
              <option value="">All reporters</option>
              {data.reporters.map((reporter) => <option key={reporter.id || reporter.email} value={reporter.id || reporter.email}>{reporter.name || reporter.email}</option>)}
            </select>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort tasks">
              <option value="due">Sort by due date</option>
              <option value="priority">Sort by priority</option>
              <option value="updated">Sort by updated</option>
              <option value="status">Sort by status</option>
              <option value="space">Sort by space</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Group by</span>
            <select className="h-8 rounded-md border bg-background px-2 text-sm" value={groupBy} onChange={(event) => setGroupBy(event.target.value)} aria-label="Group tasks">
              <option value="status">Status</option>
              <option value="due">Due date</option>
              <option value="space">Space</option>
              <option value="priority">Priority</option>
            </select>
            <span className="ml-auto text-sm text-muted-foreground">{data.filtered.length} matching tasks</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-base">Task List</CardTitle>
          <p className="text-sm text-muted-foreground">Click a task title for a quick drawer, or update status, priority, and due date inline.</p>
        </CardHeader>
        <CardContent className="p-4">
          {data.grouped.length ? (
            <TaskTable groups={data.grouped} onSelectTask={setSelectedTask} onUpdateTask={updateTaskField} updating={updateMutation.isPending} />
          ) : (
            <EmptyState
              title={loading ? "Loading your tasks..." : bucket === "watching" ? "Watching is planned" : "No tasks found"}
              description={loading ? "Gathering work across your spaces." : bucket === "watching" ? "Followed tasks and saved task watches will appear here when that feature is enabled." : "Try changing filters, or open a space to create and assign work."}
              action={
                <Button asChild size="sm">
                  <Link to="/spaces">Open spaces</Link>
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <TaskDetailDrawer task={selectedTask} onClose={() => setSelectedTask(null)} onUpdateTask={updateTaskField} updating={updateMutation.isPending} />
    </div>
  );
}
