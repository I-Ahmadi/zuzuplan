import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Download,
  FileJson,
  GitPullRequest,
  ListTodo,
  Printer,
  Search,
  ShieldAlert,
  TimerReset,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getClientPagination, PAGE_SIZE, PaginationControls } from "@/components/ui/pagination";
import { UserAvatar } from "@/components/ui/avatar";
import { getProjectMembers, getProjects } from "@/lib/project-api";
import { getProjectSprints } from "@/lib/sprint-api";
import { getProjectTasks } from "@/lib/task-api";
import { ISSUE_STATUSES, isClosedIssue } from "@/lib/issue-constants";
import { cn } from "@/lib/utils";

const REPORT_LIMIT = 100;
const DAY_MS = 1000 * 60 * 60 * 24;
const STATUS_TONES = {
  BACKLOG: "bg-slate-500",
  READY: "bg-sky-500",
  IN_PROGRESS: "bg-lime-500",
  IN_REVIEW: "bg-violet-500",
  READY_TO_MERGE: "bg-teal-500",
  MERGED: "bg-blue-600",
  DEPLOYED: "bg-green-500",
  DONE: "bg-blue-500",
  BLOCKED: "bg-red-500",
  CANCELED: "bg-muted-foreground",
};
const STATUSES = ISSUE_STATUSES.map((status) => ({ ...status, tone: STATUS_TONES[status.value] || "bg-muted-foreground" }));
const PRIORITIES = [
  { value: "URGENT", label: "Urgent", tone: "bg-red-500", badge: "border-red-500/30 bg-red-500/10 text-red-500" },
  { value: "HIGH", label: "High", tone: "bg-red-400", badge: "border-red-500/30 bg-red-500/10 text-red-500" },
  { value: "MEDIUM", label: "Medium", tone: "bg-orange-500", badge: "border-orange-500/30 bg-orange-500/10 text-orange-500" },
  { value: "LOW", label: "Low", tone: "bg-muted-foreground", badge: "border-border bg-muted/35 text-muted-foreground" },
];
const TIME_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];
const STALE_DAYS = 7;
const REVIEW_STALE_DAYS = 2;

function dateDaysFromToday(value) {
  if (!value) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const date = new Date(value);
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((day.getTime() - today.getTime()) / DAY_MS);
}

function ageInDays(value) {
  if (!value) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / DAY_MS));
}

function isOpenIssue(task) {
  return !isClosedIssue(task.status);
}

function isOverdue(task) {
  const days = dateDaysFromToday(task.dueDate);
  return isOpenIssue(task) && days !== null && days < 0;
}

function isDueSoon(task) {
  const days = dateDaysFromToday(task.dueDate);
  return isOpenIssue(task) && days !== null && days >= 0 && days <= 7;
}

function isStale(task) {
  if (!isOpenIssue(task)) return false;
  const staleLimit = task.status === "IN_REVIEW" ? REVIEW_STALE_DAYS : STALE_DAYS;
  return ageInDays(task.updatedAt || task.createdAt) >= staleLimit;
}

function inRange(value, days) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() <= Number(days) * DAY_MS;
}

function formatDate(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function relativeDate(value) {
  if (!value) return "No update";
  const days = ageInDays(value);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function issueKey(task) {
  return `${task.space?.key || "SPC"}-${task.id.slice(-4).toUpperCase()}`;
}

function taskPath(task) {
  return `/spaces/${task.space?.id || task.projectId}/issues/${task.id}`;
}

function priorityBadge(priority) {
  return PRIORITIES.find((item) => item.value === priority)?.badge || PRIORITIES[3].badge;
}

function fileDate() {
  return new Date().toISOString().slice(0, 10);
}

function csvCell(value) {
  const safeValue = value === null || value === undefined ? "" : String(value);
  return `"${safeValue.replace(/"/g, '""')}"`;
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildIssuesCsv(tasks) {
  const headers = ["Issue Key", "Title", "Space", "Status", "Priority", "Assignee", "Due Date", "Updated", "Attention Reasons"];
  const rows = tasks.map((task) => [
    issueKey(task),
    task.title,
    task.space?.name,
    task.status,
    task.priority,
    task.assignee?.name || task.assignee?.email || "Unassigned",
    task.dueDate ? formatDate(task.dueDate) : "",
    task.updatedAt ? formatDate(task.updatedAt) : "",
    getAttentionReasons(task).join("; "),
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function buildReportDataset({ spaces, taskResults, sprintResults, memberResults }) {
  const tasks = [];
  const sprints = [];
  const members = [];

  spaces.forEach((space, index) => {
    const spaceTasks = taskResults[index]?.data?.data || [];
    const spaceSprints = sprintResults[index]?.data?.data || [];
    const spaceMembers = memberResults[index]?.data?.data || [];

    spaceTasks.forEach((task) => {
      tasks.push({ ...task, space });
    });
    spaceSprints.forEach((sprint) => {
      sprints.push({ ...sprint, space });
    });
    spaceMembers.forEach((member) => {
      members.push({ ...member, space });
    });
  });

  return { tasks, sprints, members };
}

function applyFilters(tasks, filters) {
  return tasks.filter((task) => {
    if (filters.spaceId !== "all" && task.space?.id !== filters.spaceId) return false;
    if (filters.assigneeId === "unassigned" && task.assigneeId) return false;
    if (filters.assigneeId !== "all" && filters.assigneeId !== "unassigned" && task.assigneeId !== filters.assigneeId) return false;
    if (filters.status !== "all" && task.status !== filters.status) return false;
    if (filters.priority !== "all" && task.priority !== filters.priority) return false;
    if (!filters.includeCompleted && !isOpenIssue(task)) return false;
    if (filters.search.trim()) {
      const haystack = [task.title, task.description, task.space?.name, task.space?.key, task.assignee?.name, task.createdBy?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(filters.search.trim().toLowerCase())) return false;
    }
    return true;
  });
}

function buildDeliveryOverview(tasks, sprints, rangeDays) {
  const open = tasks.filter(isOpenIssue);
  const completed = tasks.filter((task) => task.status === "DONE");
  const activeSprintIds = new Set(sprints.filter((sprint) => sprint.status === "ACTIVE").map((sprint) => sprint.id));
  const activeSprintTasks = tasks.filter((task) => task.sprintId && activeSprintIds.has(task.sprintId));
  const activeCompleted = activeSprintTasks.filter((task) => task.status === "DONE").length;
  const cycleCompletionRate = activeSprintTasks.length ? Math.round((activeCompleted / activeSprintTasks.length) * 100) : 0;

  return {
    open: open.length,
    completed: completed.length,
    inReview: tasks.filter((task) => task.status === "IN_REVIEW").length,
    stale: tasks.filter(isStale).length,
    dueSoon: tasks.filter(isDueSoon).length,
    overdue: tasks.filter(isOverdue).length,
    cycleCompletionRate,
    createdRecent: tasks.filter((task) => inRange(task.createdAt, rangeDays)).length,
    updatedRecent: tasks.filter((task) => inRange(task.updatedAt, rangeDays)).length,
    completedRecent: completed.filter((task) => inRange(task.updatedAt, rangeDays)).length,
  };
}

function buildBreakdown(items, definitions, key = "status") {
  const total = items.length || 1;
  return definitions.map((definition) => {
    const count = items.filter((item) => item[key] === definition.value).length;
    return { ...definition, count, percent: Math.round((count / total) * 100) };
  });
}

function normalizeMember(member) {
  const user = member.user || member.assignee || member.createdBy || member;
  return user?.id ? user : null;
}

function buildAssigneeWorkload(tasks, members) {
  const users = new Map();
  members.forEach((member) => {
    const user = normalizeMember(member);
    if (user) users.set(user.id, user);
  });
  tasks.forEach((task) => {
    if (task.assignee?.id) users.set(task.assignee.id, task.assignee);
    if (task.createdBy?.id) users.set(task.createdBy.id, task.createdBy);
  });

  const rows = Array.from(users.values()).map((user) => {
    const assigned = tasks.filter((task) => task.assigneeId === user.id || task.assignee?.id === user.id);
    const open = assigned.filter(isOpenIssue);
    return {
      user,
      open: open.length,
      inReview: assigned.filter((task) => task.status === "IN_REVIEW").length,
      overdue: assigned.filter(isOverdue).length,
      dueSoon: assigned.filter(isDueSoon).length,
    };
  });

  const unassigned = tasks.filter((task) => isOpenIssue(task) && !task.assigneeId && !task.assignee?.id);
  if (unassigned.length) {
    rows.push({
      user: { id: "unassigned", name: "Unassigned", email: "Needs owner" },
      open: unassigned.length,
      inReview: unassigned.filter((task) => task.status === "IN_REVIEW").length,
      overdue: unassigned.filter(isOverdue).length,
      dueSoon: unassigned.filter(isDueSoon).length,
      unassigned: true,
    });
  }

  return rows.sort((a, b) => b.open - a.open).slice(0, 8);
}

function getAttentionReasons(task) {
  const reasons = [];
  if (isOverdue(task)) reasons.push("Overdue");
  if (task.priority === "URGENT") reasons.push("Urgent");
  if (task.priority === "HIGH") reasons.push("High priority");
  if (!task.assigneeId && !task.assignee?.id && isOpenIssue(task)) reasons.push("No assignee");
  if (task.status === "IN_REVIEW") reasons.push("In review");
  if (isStale(task)) reasons.push(task.status === "IN_REVIEW" ? "Review stale" : "Stale");
  return reasons;
}

function getAttentionIssues(tasks) {
  return tasks
    .map((task) => ({ ...task, attentionReasons: getAttentionReasons(task) }))
    .filter((task) => task.attentionReasons.length)
    .sort((a, b) => {
      const score = (task) =>
        (isOverdue(task) ? 50 : 0) +
        (task.priority === "URGENT" ? 40 : 0) +
        (task.priority === "HIGH" ? 25 : 0) +
        (!task.assigneeId ? 15 : 0) +
        (isStale(task) ? 10 : 0);
      return score(b) - score(a) || new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
}

function activeCycleHealth(sprints, tasks) {
  const active = sprints.filter((sprint) => sprint.status === "ACTIVE");
  const activeIds = new Set(active.map((sprint) => sprint.id));
  const activeTasks = tasks.filter((task) => task.sprintId && activeIds.has(task.sprintId));
  const completed = activeTasks.filter((task) => task.status === "DONE").length;
  const open = activeTasks.filter(isOpenIssue).length;
  const dueSoon = activeTasks.filter(isDueSoon).length;
  const percent = activeTasks.length ? Math.round((completed / activeTasks.length) * 100) : 0;
  return { active, activeTasks, completed, open, dueSoon, percent };
}

function MetricCard({ label, value, detail, icon: Icon }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-r p-4 last:border-r-0 md:[&:nth-child(2n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2n)]:border-r xl:last:border-r-0">
      <div className="min-w-0">
        <p className="truncate text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/50 text-primary">
        <Icon className="h-4 w-4" />
      </span>
    </div>
  );
}

function BreakdownPanel({ title, description, items }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.value} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex min-w-0 items-center gap-2">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", item.tone)} />
                <span className="truncate font-medium">{item.label}</span>
              </span>
              <span className="shrink-0 text-muted-foreground">{item.count} - {item.percent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-muted">
              <div className={cn("h-full rounded", item.tone)} style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CycleHealthPanel({ health }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <GitPullRequest className="h-4 w-4 text-primary" />
          Cycle / Sprint Health
        </CardTitle>
        <p className="text-sm text-muted-foreground">Active cycle progress and near-term delivery pressure.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {health.active.length ? (
          <>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{health.percent}% complete</span>
                <span className="text-muted-foreground">{health.completed}/{health.activeTasks.length} issues done</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded bg-muted">
                <div className="h-full rounded bg-primary" style={{ width: `${health.percent}%` }} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Open</p>
                <p className="mt-1 text-xl font-semibold">{health.open}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Due soon</p>
                <p className="mt-1 text-xl font-semibold">{health.dueSoon}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Active cycles</p>
                <p className="mt-1 text-xl font-semibold">{health.active.length}</p>
              </div>
            </div>
            <div className="space-y-2">
              {health.active.slice(0, 4).map((sprint) => (
                <div key={sprint.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{sprint.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{sprint.space?.name || "Workspace"} - ends {formatDate(sprint.endDate)}</span>
                  </span>
                  <span className="rounded border bg-muted/35 px-2 py-1 text-xs">{sprint._count?.tasks ?? sprint.tasks?.length ?? 0} issues</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-md border border-dashed p-6 text-center">
            <p className="text-sm font-medium">No active sprint or cycle</p>
            <p className="mt-1 text-sm text-muted-foreground">Start a sprint from the backlog to see cycle health here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WorkloadPanel({ rows }) {
  const max = Math.max(1, ...rows.map((row) => row.open));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="h-4 w-4 text-primary" />
          Workload By Assignee
        </CardTitle>
        <p className="text-sm text-muted-foreground">Open work, reviews, and date pressure by owner.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length ? rows.map((row) => (
          <div key={row.user.id} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <UserAvatar user={row.unassigned ? null : row.user} fallback={row.user.name || "U"} className="h-7 w-7" fallbackClassName="bg-muted text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.user.name || row.user.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.user.email}</p>
                </div>
              </div>
              <span className="text-sm font-semibold">{row.open}</span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-muted">
              <div className="h-full rounded bg-primary" style={{ width: `${Math.max(5, (row.open / max) * 100)}%` }} />
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{row.inReview} in review</span>
              <span>{row.overdue} overdue</span>
              <span>{row.dueSoon} due soon</span>
            </div>
          </div>
        )) : (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No assignee workload yet.</div>
        )}
      </CardContent>
    </Card>
  );
}

function ThroughputPanel({ overview, rangeDays }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-primary" />
          Recent Throughput
        </CardTitle>
        <p className="text-sm text-muted-foreground">Activity in the selected {rangeDays}-day window.</p>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Created</p>
          <p className="mt-1 text-2xl font-semibold">{overview.createdRecent}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Updated</p>
          <p className="mt-1 text-2xl font-semibold">{overview.updatedRecent}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="mt-1 text-2xl font-semibold">{overview.completedRecent}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AttentionTable({ issues }) {
  if (!issues.length) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <p className="text-sm font-medium">No attention items</p>
        <p className="mt-1 text-sm text-muted-foreground">No overdue, unassigned, stale, or high-priority issues match the filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b bg-muted/20 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-semibold">Issue</th>
              <th className="px-3 py-2 font-semibold">Needs attention</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Priority</th>
              <th className="px-3 py-2 font-semibold">Assignee</th>
              <th className="px-3 py-2 font-semibold">Updated</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((task) => (
              <tr key={task.id} className="border-b last:border-b-0 hover:bg-accent/35">
                <td className="px-3 py-3 align-top">
                  <Link to={taskPath(task)} className="font-semibold hover:text-primary">{task.title}</Link>
                  <p className="mt-1 text-xs text-muted-foreground">{issueKey(task)} - {task.space?.name}</p>
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="flex flex-wrap gap-1">
                    {task.attentionReasons.map((reason) => (
                      <span key={reason} className="rounded border bg-muted/35 px-1.5 py-0.5 text-[11px] text-muted-foreground">{reason}</span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-3 align-top text-muted-foreground">{STATUSES.find((status) => status.value === task.status)?.label || task.status}</td>
                <td className="px-3 py-3 align-top">
                  <span className={cn("rounded border px-1.5 py-0.5 text-[11px] font-semibold", priorityBadge(task.priority))}>{task.priority}</span>
                </td>
                <td className="px-3 py-3 align-top">
                  {task.assignee ? (
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <UserAvatar user={task.assignee} fallback={task.assignee.name || "U"} className="h-6 w-6" fallbackClassName="bg-primary text-[10px] text-primary-foreground" />
                      <span className="max-w-36 truncate">{task.assignee.name || task.assignee.email}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </td>
                <td className="px-3 py-3 align-top text-muted-foreground">{relativeDate(task.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Reports() {
  const [filters, setFilters] = useState({
    search: "",
    spaceId: "all",
    assigneeId: "all",
    status: "all",
    priority: "all",
    rangeDays: "30",
    includeCompleted: true,
  });
  const [page, setPage] = useState(1);

  const spacesQuery = useQuery({ queryKey: ["spaces", "reports"], queryFn: () => getProjects({ limit: REPORT_LIMIT }) });
  const spaces = spacesQuery.data?.data || [];
  const taskQueries = useQueries({
    queries: spaces.map((space) => ({
      queryKey: ["project-tasks", "reports", space.id],
      queryFn: () => getProjectTasks(space.id, { limit: REPORT_LIMIT }),
      enabled: Boolean(space.id),
    })),
  });
  const sprintQueries = useQueries({
    queries: spaces.map((space) => ({
      queryKey: ["project-sprints", "reports", space.id],
      queryFn: () => getProjectSprints(space.id),
      enabled: Boolean(space.id),
    })),
  });
  const memberQueries = useQueries({
    queries: spaces.map((space) => ({
      queryKey: ["project-members", "reports", space.id],
      queryFn: () => getProjectMembers(space.id),
      enabled: Boolean(space.id),
    })),
  });
  const loading = spacesQuery.isLoading || taskQueries.some((query) => query.isLoading) || sprintQueries.some((query) => query.isLoading) || memberQueries.some((query) => query.isLoading);

  const dataset = useMemo(
    () => buildReportDataset({ spaces, taskResults: taskQueries, sprintResults: sprintQueries, memberResults: memberQueries }),
    [memberQueries, spaces, sprintQueries, taskQueries]
  );
  const filteredTasks = useMemo(() => applyFilters(dataset.tasks, filters), [dataset.tasks, filters]);
  const overview = useMemo(() => buildDeliveryOverview(filteredTasks, dataset.sprints, filters.rangeDays), [dataset.sprints, filteredTasks, filters.rangeDays]);
  const statusBreakdown = useMemo(() => buildBreakdown(filteredTasks, STATUSES), [filteredTasks]);
  const priorityBreakdown = useMemo(() => buildBreakdown(filteredTasks, PRIORITIES, "priority"), [filteredTasks]);
  const workload = useMemo(() => buildAssigneeWorkload(filteredTasks, dataset.members), [dataset.members, filteredTasks]);
  const attentionIssues = useMemo(() => getAttentionIssues(filteredTasks), [filteredTasks]);
  const cycleHealth = useMemo(() => activeCycleHealth(dataset.sprints, filteredTasks), [dataset.sprints, filteredTasks]);
  const assignees = useMemo(() => {
    const users = new Map();
    dataset.members.forEach((member) => {
      const user = normalizeMember(member);
      if (user) users.set(user.id, user);
    });
    dataset.tasks.forEach((task) => {
      if (task.assignee?.id) users.set(task.assignee.id, task.assignee);
    });
    return Array.from(users.values()).sort((a, b) => String(a.name || a.email).localeCompare(String(b.name || b.email)));
  }, [dataset.members, dataset.tasks]);
  const { items: pagedAttention, pagination } = useMemo(() => getClientPagination(attentionIssues, page, PAGE_SIZE), [attentionIssues, page]);
  const generatedAt = useMemo(() => new Date(), []);

  function downloadCsvReport() {
    downloadBlob(`zuzuplan-engineering-report-${fileDate()}.csv`, buildIssuesCsv(filteredTasks), "text/csv;charset=utf-8");
  }

  function downloadJsonReport() {
    const report = {
      generatedAt: generatedAt.toISOString(),
      filters,
      summary: overview,
      statusBreakdown,
      priorityBreakdown,
      workload,
      attentionIssues: attentionIssues.map((task) => ({
        id: task.id,
        key: issueKey(task),
        title: task.title,
        space: task.space?.name,
        status: task.status,
        priority: task.priority,
        assignee: task.assignee?.name || task.assignee?.email || null,
        dueDate: task.dueDate,
        updatedAt: task.updatedAt,
        attentionReasons: task.attentionReasons,
      })),
    };
    downloadBlob(`zuzuplan-engineering-report-${fileDate()}.json`, JSON.stringify(report, null, 2), "application/json;charset=utf-8");
  }

  useEffect(() => {
    setPage(1);
  }, [filters]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-muted/20 px-3 py-4 sm:px-4 lg:px-5">
      <div className="space-y-4">
        <section className="overflow-hidden rounded-md border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b p-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-primary">Engineering report</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Delivery Health Report</h1>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                A generated view of delivery health, cycle pressure, workload, stale work, and engineering attention signals.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-9" onClick={downloadCsvReport}>
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
              <Button type="button" variant="outline" className="h-9" onClick={downloadJsonReport}>
                <FileJson className="h-4 w-4" />
                Download JSON
              </Button>
              <Button type="button" variant="outline" className="h-9" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
          <div className="grid gap-px bg-border text-sm md:grid-cols-4">
            <div className="bg-card px-4 py-3">
              <p className="text-xs uppercase text-muted-foreground">Generated</p>
              <p className="mt-1 font-medium">{formatDate(generatedAt)}</p>
            </div>
            <div className="bg-card px-4 py-3">
              <p className="text-xs uppercase text-muted-foreground">Coverage</p>
              <p className="mt-1 font-medium">{spaces.length} spaces</p>
            </div>
            <div className="bg-card px-4 py-3">
              <p className="text-xs uppercase text-muted-foreground">Dataset</p>
              <p className="mt-1 font-medium">{dataset.tasks.length} total issues</p>
            </div>
            <div className="bg-card px-4 py-3">
              <p className="text-xs uppercase text-muted-foreground">Filtered</p>
              <p className="mt-1 font-medium">{filteredTasks.length} matching issues</p>
            </div>
          </div>
        </section>

        <section className="rounded-md border bg-card">
          <div className="border-b px-3 py-2">
            <p className="text-sm font-semibold">Report criteria</p>
          </div>
          <div className="grid gap-2 p-3 lg:grid-cols-[minmax(240px,1fr)_170px_170px_160px_160px_150px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Search issues, spaces, assignees..." />
            </div>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={filters.spaceId} onChange={(event) => setFilters((current) => ({ ...current, spaceId: event.target.value }))} aria-label="Filter by space">
              <option value="all">All spaces</option>
              {spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
            </select>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={filters.assigneeId} onChange={(event) => setFilters((current) => ({ ...current, assigneeId: event.target.value }))} aria-label="Filter by assignee">
              <option value="all">All assignees</option>
              <option value="unassigned">Unassigned</option>
              {assignees.map((user) => <option key={user.id} value={user.id}>{user.name || user.email}</option>)}
            </select>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} aria-label="Filter by status">
              <option value="all">All statuses</option>
              {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))} aria-label="Filter by priority">
              <option value="all">All priorities</option>
              {PRIORITIES.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
            </select>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={filters.rangeDays} onChange={(event) => setFilters((current) => ({ ...current, rangeDays: event.target.value }))} aria-label="Time range">
              {TIME_RANGES.map((range) => <option key={range.value} value={range.value}>{range.label}</option>)}
            </select>
            <label className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
              <input type="checkbox" checked={filters.includeCompleted} onChange={(event) => setFilters((current) => ({ ...current, includeCompleted: event.target.checked }))} />
              Completed
            </label>
          </div>
        </section>

        <section className="grid overflow-hidden rounded-md border bg-card md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Open issues" value={overview.open} detail="active engineering work" icon={ListTodo} />
          <MetricCard label="Completed" value={overview.completed} detail="done in current filters" icon={CheckCircle2} />
          <MetricCard label="In review" value={overview.inReview} detail="waiting for feedback" icon={GitPullRequest} />
          <MetricCard label="Stale work" value={overview.stale} detail={`${STALE_DAYS}d without movement`} icon={TimerReset} />
          <MetricCard label="Due pressure" value={`${overview.dueSoon}/${overview.overdue}`} detail="due soon / overdue" icon={CalendarClock} />
          <MetricCard label="Cycle completion" value={`${overview.cycleCompletionRate}%`} detail="active sprint progress" icon={BarChart3} />
        </section>

        {loading ? (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Loading engineering reports...</div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="space-y-4">
            <CycleHealthPanel health={cycleHealth} />
            <div className="grid gap-4 lg:grid-cols-2">
              <BreakdownPanel title="Status Breakdown" description="Current lifecycle distribution for filtered issues." items={statusBreakdown} />
              <BreakdownPanel title="Priority Breakdown" description="How engineering effort is distributed by priority." items={priorityBreakdown} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  Engineering Attention List
                </CardTitle>
                <p className="text-sm text-muted-foreground">Issues that are overdue, high-priority, unassigned, stale, or in review.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <AttentionTable issues={pagedAttention} />
                <PaginationControls pagination={pagination} onPageChange={setPage} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <ThroughputPanel overview={overview} rangeDays={filters.rangeDays} />
            <WorkloadPanel rows={workload} />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  Aging / Stale Work
                </CardTitle>
                <p className="text-sm text-muted-foreground">Old open issues and review items that may need a decision.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredTasks.filter(isStale).slice(0, 6).map((task) => (
                  <Link key={task.id} to={taskPath(task)} className="block rounded-md border px-3 py-2 text-sm hover:bg-accent">
                    <span className="font-medium">{task.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{issueKey(task)}</span>
                    <p className="mt-1 text-xs text-muted-foreground">{task.status} - updated {relativeDate(task.updatedAt)}</p>
                  </Link>
                ))}
                {!filteredTasks.filter(isStale).length ? (
                  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">No stale work in the current filters.</div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
