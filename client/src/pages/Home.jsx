import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FolderKanban,
  Gauge,
  ListTodo,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AsyncContent } from "@/components/ui/loading";
import { UserAvatar } from "@/components/ui/avatar";
import { useApiResource } from "@/lib/api-hooks";
import { getHomeDashboard } from "@/lib/home-api";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/task-constants";
import { cn } from "@/lib/utils";

const DAY_MS = 1000 * 60 * 60 * 24;
const PRIORITIES = ["URGENT", "HIGH", "MEDIUM", "LOW"];
const PRIORITY_TONES = {
  URGENT: "border-red-500/30 bg-red-500/10 text-red-500",
  HIGH: "border-red-500/30 bg-red-500/10 text-red-500",
  MEDIUM: "border-orange-500/30 bg-orange-500/10 text-orange-500",
  LOW: "border-muted bg-muted/40 text-muted-foreground",
};
const PRIORITY_BARS = {
  URGENT: "bg-red-500",
  HIGH: "bg-red-400",
  MEDIUM: "bg-orange-500",
  LOW: "bg-slate-400",
};
const STATUS_BARS = {
  TODO: "bg-slate-500",
  IN_PROGRESS: "bg-lime-500",
  IN_REVIEW: "bg-violet-500",
  DONE: "bg-blue-500",
};
const RANK_BARS = ["bg-blue-500", "bg-lime-500", "bg-violet-500", "bg-orange-500", "bg-slate-500"];
const STATUS_LABELS = TASK_STATUS_LABELS;

function relativeDate(value) {
  if (!value) return "No recent activity";
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.max(0, Math.floor(diff / DAY_MS));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function dueMeta(task) {
  if (!task.dueDate) return { label: "No due date", days: null, tone: "muted" };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(task.dueDate);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const days = Math.round((dueDay.getTime() - today.getTime()) / DAY_MS);

  if (days < 0) return { label: `${Math.abs(days)}d overdue`, days, tone: "danger" };
  if (days === 0) return { label: "Due today", days, tone: "warning" };
  if (days === 1) return { label: "Due tomorrow", days, tone: "warning" };
  return { label: `Due in ${days}d`, days, tone: days <= 7 ? "warning" : "muted" };
}

function taskPath(task) {
  return `/projects/${task.project?.id || task.projectId}/tasks/${task.id}`;
}

function taskKey(task) {
  return `${task.project?.key || "PRJ"}-${task.id.slice(-4).toUpperCase()}`;
}

function uniqueTasks(groups) {
  const seen = new Set();
  return groups
    .flat()
    .filter(Boolean)
    .filter((task) => {
      if (seen.has(task.id)) return false;
      seen.add(task.id);
      return true;
    });
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function buildStatusRows(tasks) {
  const rows = TASK_STATUSES.map((status) => ({
    value: status.value,
    label: status.label,
    count: tasks.filter((task) => task.status === status.value).length,
    tone: STATUS_BARS[status.value] || "bg-primary",
  }));
  const known = new Set(TASK_STATUSES.map((status) => status.value));
  const customRows = Object.entries(
    tasks.reduce((acc, task) => {
      if (known.has(task.status)) return acc;
      acc[task.status || "UNKNOWN"] = (acc[task.status || "UNKNOWN"] || 0) + 1;
      return acc;
    }, {})
  ).map(([value, count]) => ({
    value,
    label: STATUS_LABELS[value] || value,
    count,
    tone: "bg-primary",
  }));
  return [...rows, ...customRows];
}

function buildPriorityRows(tasks) {
  return PRIORITIES.map((priority) => ({
    value: priority,
    label: priority.charAt(0) + priority.slice(1).toLowerCase(),
    count: tasks.filter((task) => task.priority === priority).length,
    tone: PRIORITY_BARS[priority] || "bg-primary",
  }));
}

function buildProjectLoadRows(tasks, projects) {
  const projectRows = projects
    .map((project, index) => ({
      value: project.id,
      label: project.name,
      count: project.total || 0,
      tone: RANK_BARS[index % RANK_BARS.length],
    }))
    .filter((row) => row.count > 0);

  if (projectRows.length) return projectRows;

  return Object.values(
    tasks.reduce((acc, task) => {
      const id = task.project?.id || task.projectId || "unknown";
      if (!acc[id]) {
        acc[id] = {
          value: id,
          label: task.project?.name || "Unknown project",
          count: 0,
          tone: RANK_BARS[Object.keys(acc).length % RANK_BARS.length],
        };
      }
      acc[id].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);
}

function buildAssigneeRows(tasks) {
  return Object.values(
    tasks.reduce((acc, task) => {
      const label = task.assignee?.name || task.assignee?.email || "Unassigned";
      if (!acc[label]) {
        acc[label] = {
          value: label,
          label,
          count: 0,
          tone: RANK_BARS[Object.keys(acc).length % RANK_BARS.length],
        };
      }
      acc[label].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);
}

function SectionCard({ title, description, icon: Icon, action, children, className }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 border-b px-4 py-3">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
            {title}
          </CardTitle>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

function EmptyState({ title, description, action, compact = false }) {
  return (
    <div className={cn("rounded-md border border-dashed text-center", compact ? "p-4" : "p-6")}>
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function MetricCard({ label, value, icon: Icon, detail, tone = "primary" }) {
  const toneClass =
    {
      danger: "bg-red-500/10 text-red-500",
      warning: "bg-orange-500/10 text-orange-500",
      primary: "bg-primary/10 text-primary",
    }[tone] || "bg-primary/10 text-primary";

  return (
    <Card>
      <CardContent className="flex min-h-[92px] items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold leading-none">{value}</p>
          {detail ? <p className="mt-2 truncate text-xs text-muted-foreground">{detail}</p> : null}
        </div>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
            toneClass
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function Badge({ children, className }) {
  return <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[11px] font-semibold", className)}>{children}</span>;
}

function PriorityBadge({ priority }) {
  return <Badge className={PRIORITY_TONES[priority] || PRIORITY_TONES.LOW}>{priority || "LOW"}</Badge>;
}

function DueBadge({ task }) {
  const due = dueMeta(task);
  return (
    <Badge
      className={cn(
        due.tone === "danger" && "border-red-500/30 bg-red-500/10 text-red-500",
        due.tone === "warning" && "border-orange-500/30 bg-orange-500/10 text-orange-500",
        due.tone === "muted" && "border-border bg-muted/35 text-muted-foreground"
      )}
    >
      {due.label}
    </Badge>
  );
}

function TaskRow({ task, reason, compact = false }) {
  return (
    <Link
      to={taskPath(task)}
      className="group grid min-w-0 gap-2 rounded-md border bg-background px-3 py-2.5 text-sm transition-colors hover:border-primary/60 hover:bg-accent/45 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
    >
      <span className="min-w-0">
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[11px] font-semibold uppercase text-muted-foreground">{taskKey(task)}</span>
          <span className="min-w-0 truncate font-semibold group-hover:text-primary">{task.title}</span>
        </span>
        <span className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate">{task.project?.name || "Project"}</span>
          <span>-</span>
          <span>{STATUS_LABELS[task.status] || task.status}</span>
          {reason ? (
            <>
              <span>-</span>
              <span>{reason}</span>
            </>
          ) : null}
        </span>
      </span>
      <span className="flex items-center gap-2">
        {!compact ? (
          <span className="hidden flex-wrap gap-1.5 sm:flex">
            <PriorityBadge priority={task.priority} />
            <DueBadge task={task} />
          </span>
        ) : null}
        <UserAvatar user={task.assignee} fallback={task.assignee?.name || task.assignee?.email || "U"} className="h-7 w-7" fallbackClassName="bg-primary text-[10px] text-primary-foreground" />
      </span>
      {!compact ? (
        <span className="flex flex-wrap gap-1.5 sm:hidden">
          <PriorityBadge priority={task.priority} />
          <DueBadge task={task} />
        </span>
      ) : null}
    </Link>
  );
}

function ActivityItem({ task }) {
  return (
    <Link to={taskPath(task)} className="flex min-w-0 gap-3 rounded-md border bg-background p-3 text-sm transition-colors hover:border-primary/60 hover:bg-accent/45">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <CheckCircle2 className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{task.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {task.project?.name || "Project"} moved through {STATUS_LABELS[task.status] || task.status} - {relativeDate(task.updatedAt)}
        </span>
      </span>
    </Link>
  );
}

function ProjectRow({ project }) {
  return (
    <Link to={`/projects/${project.id}/tasks`} className="block rounded-md border bg-background p-3 text-sm transition-colors hover:border-primary/60 hover:bg-accent/45">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{project.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{project.total || 0} tasks - {project.done || 0} done</p>
        </div>
        <span className="rounded border bg-muted/35 px-2 py-1 text-xs font-medium">{project.key}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-label={`${project.progress || 0}% complete`}>
        <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress || 0}%` }} />
      </div>
    </Link>
  );
}

function ChartEmptyNote({ title, description }) {
  return (
    <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-center">
      <p className="text-xs font-medium">{title}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function StatusColumnChart({ rows }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  const hasData = rows.some((row) => row.count > 0);

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-background p-3">
        <div className="flex h-36 items-end gap-2 border-b border-l px-2 pt-3">
          {rows.map((row) => {
            const height = row.count ? Math.max(14, percent(row.count, max)) : 0;
            return (
              <div key={row.value} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
                <span className="text-center text-xs font-semibold">{row.count}</span>
                <span className="flex h-24 items-end">
                  <span
                    className={cn(
                      "block w-full rounded-t transition-[height]",
                      row.count ? row.tone : "bg-muted"
                    )}
                    style={{ height: `${height}%` }}
                  />
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 grid gap-1 text-xs text-muted-foreground" style={{ gridTemplateColumns: `repeat(${Math.max(rows.length, 1)}, minmax(0, 1fr))` }}>
          {rows.map((row) => (
            <span key={row.value} className="truncate text-center" title={row.label}>{row.label}</span>
          ))}
        </div>
      </div>
      {!hasData ? (
        <ChartEmptyNote title="No status data yet" description="Tasks will populate this chart as work appears." />
      ) : null}
    </div>
  );
}

function PriorityDistributionChart({ rows }) {
  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-background p-3">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">Total visible tasks</span>
          <span className="text-2xl font-semibold leading-none">{total}</span>
        </div>
        <div className="flex h-4 overflow-hidden rounded-full bg-muted">
          {total ? rows.map((row) => (
            row.count ? (
              <span
                key={row.value}
                className={cn("h-full", row.tone)}
                style={{ width: `${percent(row.count, total)}%` }}
                title={`${row.label}: ${row.count}`}
              />
            ) : null
          )) : <span className="h-full w-full bg-muted" />}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.value} className="flex items-center justify-between gap-2 rounded border bg-muted/15 px-2 py-1.5 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", row.tone)} />
                <span className="truncate">{row.label}</span>
              </span>
              <span className="font-semibold">{row.count}</span>
            </div>
          ))}
        </div>
      </div>
      {!total ? (
        <ChartEmptyNote title="No priority data yet" description="Prioritized tasks will appear here." />
      ) : null}
    </div>
  );
}

function RankedTable({ rows, emptyTitle, emptyDescription, labelHeader = "Name" }) {
  const visibleRows = rows.filter((row) => row.count > 0).slice(0, 5);
  const max = Math.max(1, ...visibleRows.map((row) => row.count));
  const total = visibleRows.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-md border bg-background">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-muted/35 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">{labelHeader}</th>
              <th className="w-20 px-3 py-2 text-right font-semibold">Tasks</th>
              <th className="w-28 px-3 py-2 text-left font-semibold">Share</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length ? visibleRows.map((row) => (
              <tr key={row.value} className="border-t">
                <td className="min-w-0 px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", row.tone)} />
                    <span className="truncate font-medium" title={row.label}>{row.label}</span>
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-semibold">{row.count}</td>
                <td className="px-3 py-2">
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", row.tone)} style={{ width: `${Math.max(8, percent(row.count, max))}%` }} />
                  </div>
                </td>
              </tr>
            )) : (
              <tr className="border-t">
                <td colSpan={3} className="px-3 py-6 text-center text-sm text-muted-foreground">Waiting for data</td>
              </tr>
            )}
          </tbody>
          <tfoot className="border-t bg-muted/20 text-xs">
            <tr>
              <td className="px-3 py-2 font-medium text-muted-foreground">Total visible</td>
              <td className="px-3 py-2 text-right font-semibold">{total}</td>
              <td className="px-3 py-2" />
            </tr>
          </tfoot>
        </table>
      </div>
      {!visibleRows.length ? <ChartEmptyNote title={emptyTitle} description={emptyDescription} /> : null}
    </div>
  );
}

function ProjectProgressChart({ projects }) {
  if (!projects.length) {
    return (
      <div className="space-y-3">
        <div className="rounded-md border bg-background p-3">
          <div className="space-y-3">
            {["Project A", "Project B", "Project C"].map((label, index) => (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{label}</span>
                  <span>0%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full bg-muted-foreground/20", index === 0 && "w-1/5", index === 1 && "w-2/5", index === 2 && "w-1/3")} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <ChartEmptyNote title="No project progress yet" description="Project completion will appear when tasks are added." />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.slice(0, 5).map((project) => (
        <Link key={project.id} to={`/projects/${project.id}/tasks`} className="block rounded-md border bg-background px-3 py-2 hover:border-primary/60 hover:bg-accent/45">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium">{project.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{project.progress || 0}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress || 0}%` }} />
          </div>
        </Link>
      ))}
    </div>
  );
}

function DuePressureChart({ overdue, dueSoon }) {
  const total = overdue + dueSoon;
  const overduePercent = percent(overdue, total);
  const dueSoonPercent = percent(dueSoon, total);
  const dueGradient = total
    ? `conic-gradient(rgb(239 68 68) 0 ${overduePercent}%, rgb(249 115 22) ${overduePercent}% ${overduePercent + dueSoonPercent}%, hsl(var(--muted)) ${overduePercent + dueSoonPercent}% 100%)`
    : "conic-gradient(hsl(var(--muted)) 0 100%)";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 rounded-md border bg-background p-3">
        <div className="relative h-24 w-24 shrink-0 rounded-full" style={{ background: dueGradient }} aria-label={`${overdue} overdue and ${dueSoon} due soon`}>
          <div className="absolute inset-4 flex items-center justify-center rounded-full bg-card">
            <span className="text-xl font-semibold">{total}</span>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-sm bg-red-500" />Overdue</span>
            <span className="font-semibold text-red-500">{overdue}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-muted-foreground"><span className="h-2.5 w-2.5 rounded-sm bg-orange-500" />Due soon</span>
            <span className="font-semibold text-orange-500">{dueSoon}</span>
          </div>
        </div>
      </div>
      {!total ? <ChartEmptyNote title="No deadline pressure" description="Overdue and upcoming work will show here." /> : null}
    </div>
  );
}

function QuickLinks({ primaryProjectTasksPath }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">
      <Button asChild variant="outline" className="justify-start">
        <Link to={`${primaryProjectTasksPath}?view=list`}>
          <ListTodo className="h-4 w-4" />
          Open task list
        </Link>
      </Button>
      <Button asChild variant="outline" className="justify-start">
        <Link to="/analytics">
          <BarChart3 className="h-4 w-4" />
          View analytics
        </Link>
      </Button>
      <Button asChild variant="outline" className="justify-start">
        <Link to="/activity">
          <CheckCircle2 className="h-4 w-4" />
          View activity
        </Link>
      </Button>
    </div>
  );
}

export default function Home() {
  const homeQuery = useApiResource(() => getHomeDashboard({ limit: 6 }), []);
  const home = homeQuery.data?.data || {
    metrics: { assigned: 0, attention: 0, dueSoon: 0, projects: 0, overdue: 0 },
    attention: [],
    assigned: [],
    createdByMe: [],
    recent: [],
    upcoming: [],
    projects: [],
    primaryProject: null,
  };
  const primaryProjectTasksPath = home.primaryProject ? `/projects/${home.primaryProject.id}/tasks` : "/projects";
  const workTasks = uniqueTasks([home.attention, home.assigned, home.createdByMe, home.recent, home.upcoming]);
  const statusRows = buildStatusRows(workTasks);
  const priorityRows = buildPriorityRows(workTasks);
  const projectLoadRows = buildProjectLoadRows(workTasks, home.projects);
  const assigneeRows = buildAssigneeRows(workTasks);
  const homeErrorMessage = homeQuery.data?.status === 404
    ? "Home dashboard data is unavailable. Restart the API server, then retry."
    : homeQuery.errorMessage || "Could not load your home dashboard.";

  return (
    <div className="space-y-4 px-3 py-4 sm:px-4 lg:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-primary">Sprintly Home</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Your work dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">A Jira-inspired command center for attention items, personal work, activity, deadlines, and project health.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to={`${primaryProjectTasksPath}?view=list`}>
              <Plus className="h-4 w-4" />
              Create task
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/projects">
              <FolderKanban className="h-4 w-4" />
              Create project
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/people">
              <UserPlus className="h-4 w-4" />
              Invite member
            </Link>
          </Button>
        </div>
      </div>

      <AsyncContent
        query={homeQuery}
        loadingMessage="Loading your home..."
        errorMessage={homeErrorMessage}
        variant="page"
      >
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Assigned to you" value={home.metrics.assigned} detail="Open personal work" icon={ListTodo} />
            <MetricCard label="Needs attention" value={home.metrics.attention} detail={`${home.metrics.overdue} overdue`} icon={AlertTriangle} tone={home.metrics.overdue ? "danger" : "primary"} />
            <MetricCard label="Due soon" value={home.metrics.dueSoon} detail="Next 7 days" icon={Clock3} tone={home.metrics.dueSoon ? "warning" : "primary"} />
            <MetricCard label="Projects" value={home.metrics.projects} detail="Accessible projects" icon={FolderKanban} />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
            <main className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <SectionCard title="Work by status" description="Visible work grouped by lifecycle." icon={Gauge}>
                  <StatusColumnChart rows={statusRows} />
                </SectionCard>
                <SectionCard title="Priority mix" description="Attention, assigned, upcoming, and recent work." icon={TrendingUp}>
                  <PriorityDistributionChart rows={priorityRows} />
                </SectionCard>
                <SectionCard title="Project workload" description="Task volume across active projects." icon={FolderKanban}>
                  <RankedTable rows={projectLoadRows} labelHeader="Project" emptyTitle="No project workload yet" emptyDescription="Project task volume will appear here." />
                </SectionCard>
                <SectionCard title="Ownership load" description="Visible work grouped by assignee." icon={Users}>
                  <RankedTable rows={assigneeRows} labelHeader="Assignee" emptyTitle="No ownership data yet" emptyDescription="Assigned and unassigned work will appear here." />
                </SectionCard>
              </div>

              <SectionCard
                title="Needs Attention"
                description="Overdue, due-today, and high-priority work assigned to you."
                icon={Sparkles}
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link to={primaryProjectTasksPath}>View all tasks</Link>
                  </Button>
                }
              >
                <div className="space-y-2">
                  {home.attention.slice(0, 5).map((task) => (
                    <TaskRow key={task.id} task={task} reason={dueMeta(task).label} />
                  ))}
                  {!home.attention.length ? (
                    <EmptyState title="No urgent work" description="You are clear for now. New urgent tasks and due-today items will show here." />
                  ) : null}
                </div>
              </SectionCard>

              <SectionCard title="My Work Queue" description="Assigned, created, and recently touched work across projects." icon={ListTodo}>
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Assigned to me</p>
                    {home.assigned.map((task) => <TaskRow key={task.id} task={task} compact />)}
                    {!home.assigned.length ? <EmptyState title="No assigned work" description="Assigned work will appear here." compact /> : null}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Created by me</p>
                    {home.createdByMe.map((task) => <TaskRow key={task.id} task={task} compact />)}
                    {!home.createdByMe.length ? <EmptyState title="No created work" description="Work you report or create will appear here." compact /> : null}
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Recent Activity" description="Latest task movement and updates from your accessible projects." icon={CheckCircle2}>
                <div className="space-y-2">
                  {home.recent.map((task) => <ActivityItem key={task.id} task={task} />)}
                  {!home.recent.length ? <EmptyState title="Recent activity will appear here" description="Task changes, comments, and project movement will populate this feed." /> : null}
                </div>
              </SectionCard>
            </main>

            <aside className="space-y-4">
              <SectionCard title="Due pressure" description="Overdue compared with the next seven days." icon={AlertTriangle}>
                <DuePressureChart overdue={home.metrics.overdue || 0} dueSoon={home.metrics.dueSoon || 0} />
              </SectionCard>

              <SectionCard title="Upcoming" description="Deadlines and near-term planning signals." icon={CalendarClock}>
                <div className="space-y-2">
                  {home.upcoming.map((task) => <TaskRow key={task.id} task={task} compact />)}
                  {!home.upcoming.length ? <EmptyState title="No due-soon tasks" description="Tasks due in the next 7 days will appear here." compact /> : null}
                </div>
              </SectionCard>

              <SectionCard title="Project progress" description="Pinned projects by completion." icon={BarChart3}>
                <ProjectProgressChart projects={home.projects} />
              </SectionCard>

              <SectionCard title="Pinned Projects" description="Frequently used projects with work progress." icon={FolderKanban}>
                <div className="space-y-2">
                  {home.projects.map((project) => (
                    <ProjectRow key={project.id} project={project} />
                  ))}
                  {!home.projects.length ? (
                    <EmptyState
                      title="No projects yet"
                      description="Create your first project to start organizing work."
                      action={
                        <Button asChild size="sm">
                          <Link to="/projects">Create project</Link>
                        </Button>
                      }
                    />
                  ) : null}
                </div>
              </SectionCard>

              <SectionCard title="Quick links" description="Jump into common work areas." icon={Sparkles}>
                <QuickLinks primaryProjectTasksPath={primaryProjectTasksPath} />
              </SectionCard>
            </aside>
          </div>
        </>
      </AsyncContent>
    </div>
  );
}
