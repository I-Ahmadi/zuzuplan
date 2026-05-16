import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  FolderKanban,
  ListTodo,
  Plus,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PAGE_SIZE } from "@/components/ui/pagination";
import { UserAvatar } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { getProjects } from "@/lib/project-api";
import { getProjectTasks } from "@/lib/task-api";
import { ISSUE_STATUS_LABELS } from "@/lib/issue-constants";
import { cn } from "@/lib/utils";

const DAY_MS = 1000 * 60 * 60 * 24;
const PRIORITY_RANK = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const PRIORITY_TONES = {
  URGENT: "border-red-500/30 bg-red-500/10 text-red-500",
  HIGH: "border-red-500/30 bg-red-500/10 text-red-500",
  MEDIUM: "border-orange-500/30 bg-orange-500/10 text-orange-500",
  LOW: "border-muted bg-muted/40 text-muted-foreground",
};
const STATUS_LABELS = ISSUE_STATUS_LABELS;

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
  return `/spaces/${task.space?.id || task.projectId}/issues/${task.id}`;
}

function issueKey(task) {
  return `${task.space?.key || "SPC"}-${task.id.slice(-4).toUpperCase()}`;
}

function sortActionable(a, b) {
  const aDue = dueMeta(a).days ?? 999;
  const bDue = dueMeta(b).days ?? 999;
  if (aDue !== bDue) return aDue - bDue;
  return (PRIORITY_RANK[a.priority] ?? 4) - (PRIORITY_RANK[b.priority] ?? 4);
}

function MetricCard({ label, value, icon: Icon, detail }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          {detail ? <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p> : null}
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/50 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function SectionCard({ title, description, icon: Icon, action, children }) {
  return (
    <Card>
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

function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-md border border-dashed p-5 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
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
  const due = dueMeta(task);
  return (
    <span
      className={cn(
        "inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium",
        due.tone === "danger" && "border-red-500/30 bg-red-500/10 text-red-500",
        due.tone === "warning" && "border-orange-500/30 bg-orange-500/10 text-orange-500",
        due.tone === "muted" && "border-border bg-muted/35 text-muted-foreground"
      )}
    >
      {due.label}
    </span>
  );
}

function TaskRow({ task, reason, compact = false }) {
  return (
    <Link
      to={taskPath(task)}
      className="group block rounded-md border p-3 text-sm transition-colors hover:border-primary/60 hover:bg-accent/45"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold group-hover:text-primary">{task.title}</span>
            <span className="text-xs text-muted-foreground">{issueKey(task)}</span>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {task.space?.name || "Space"} · {STATUS_LABELS[task.status] || task.status}
            {reason ? ` · ${reason}` : ""}
          </p>
        </div>
        <UserAvatar user={task.assignee} fallback={task.assignee?.name || task.assignee?.email || "U"} className="h-7 w-7" fallbackClassName="bg-primary text-[10px] text-primary-foreground" />
      </div>
      {!compact ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <PriorityBadge priority={task.priority} />
          <DueBadge task={task} />
        </div>
      ) : null}
    </Link>
  );
}

function ActivityItem({ task }) {
  return (
    <Link to={taskPath(task)} className="flex gap-3 rounded-md border p-3 text-sm transition-colors hover:border-primary/60 hover:bg-accent/45">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/45">
        <CheckCircle2 className="h-4 w-4 text-primary" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{task.title}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {task.space?.name || "Space"} moved through {STATUS_LABELS[task.status] || task.status} · {relativeDate(task.updatedAt)}
        </span>
      </span>
    </Link>
  );
}

function SpaceRow({ space, tasks }) {
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === "DONE").length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  return (
    <Link to={`/spaces/${space.id}/issues`} className="block rounded-md border p-3 text-sm transition-colors hover:border-primary/60 hover:bg-accent/45">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{space.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{total} issues · {done} done</p>
        </div>
        <span className="rounded border bg-muted/35 px-2 py-1 text-xs font-medium">{space.key}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
      </div>
    </Link>
  );
}

export default function ForYou() {
  const { user } = useAuth();
  const spacesQuery = useQuery({ queryKey: ["spaces", "for-you"], queryFn: () => getProjects({ limit: PAGE_SIZE }) });
  const spaces = spacesQuery.data?.data || [];
  const taskQueries = useQueries({
    queries: spaces.slice(0, 6).map((space) => ({
      queryKey: ["for-you-tasks", space.id],
      queryFn: () => getProjectTasks(space.id, { limit: PAGE_SIZE }),
      enabled: Boolean(space.id),
    })),
  });

  const tasks = taskQueries.flatMap((query, index) => (query.data?.data || []).map((task) => ({ ...task, space: spaces[index] })));
  const loading = spacesQuery.isLoading || taskQueries.some((query) => query.isLoading);
  const primarySpace = spaces[0];
  const primarySpaceTasksPath = primarySpace ? `/spaces/${primarySpace.id}/issues` : "/spaces";

  const dashboard = useMemo(() => {
    const activeTasks = tasks.filter((task) => task.status !== "DONE");
    const assigned = activeTasks.filter((task) => task.assigneeId === user?.id);
    const createdByMe = activeTasks.filter((task) => task.createdById === user?.id || task.createdBy?.id === user?.id);
    const dueSoon = activeTasks.filter((task) => {
      const due = dueMeta(task);
      return due.days !== null && due.days >= 0 && due.days <= 7;
    });
    const overdue = activeTasks.filter((task) => dueMeta(task).days < 0);
    const attention = activeTasks
      .filter((task) => {
        const due = dueMeta(task);
        const importantAssigned = task.assigneeId === user?.id && ["HIGH", "URGENT"].includes(task.priority);
        return importantAssigned || due.days < 1 || (task.assigneeId === user?.id && due.days !== null && due.days <= 7);
      })
      .sort(sortActionable);
    const recent = tasks.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6);
    const spacesWithTasks = spaces.map((space) => ({
      space,
      tasks: tasks.filter((task) => task.space?.id === space.id),
    }));

    return {
      activeTasks,
      assigned: assigned.sort(sortActionable),
      createdByMe: createdByMe.sort(sortActionable),
      dueSoon: dueSoon.sort(sortActionable),
      overdue,
      attention,
      recent,
      spacesWithTasks,
    };
  }, [spaces, tasks, user?.id]);

  return (
    <div className="space-y-4 px-3 py-4 sm:px-4 lg:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">For You</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your daily view for urgent work, personal queue, activity, and upcoming deadlines.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to={`${primarySpaceTasksPath}?view=list`}>
              <Plus className="h-4 w-4" />
              Create issue
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/spaces">
              <FolderKanban className="h-4 w-4" />
              Create space
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`${primarySpaceTasksPath}?view=docs`}>
              <FileText className="h-4 w-4" />
              Create doc
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/team-members">
              <UserPlus className="h-4 w-4" />
              Invite member
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Assigned to you" value={dashboard.assigned.length} detail="Open personal work" icon={ListTodo} />
        <MetricCard label="Needs attention" value={dashboard.attention.length} detail={`${dashboard.overdue.length} overdue`} icon={AlertTriangle} />
        <MetricCard label="Due soon" value={dashboard.dueSoon.length} detail="Next 7 days" icon={Clock3} />
        <MetricCard label="Spaces" value={spaces.length} detail="Accessible workspaces" icon={FolderKanban} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.75fr)]">
        <main className="space-y-4">
          <SectionCard
            title="Needs Attention"
            description="Overdue, due-today, and high-priority work assigned to you."
            icon={Sparkles}
            action={
              <Button asChild variant="outline" size="sm">
                <Link to={primarySpaceTasksPath}>View all issues</Link>
              </Button>
            }
          >
            <div className="space-y-2">
              {dashboard.attention.slice(0, 5).map((task) => (
                <TaskRow key={task.id} task={task} reason={dueMeta(task).label} />
              ))}
              {!dashboard.attention.length ? (
                <EmptyState
                  title={loading ? "Loading attention points..." : "No urgent work"}
                  description={loading ? "Gathering work across your spaces." : "You are clear for now. New urgent issues and due-today items will show here."}
                />
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="My Work Queue" description="Assigned, created, and recently touched work across spaces." icon={ListTodo}>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Assigned to me</p>
                {dashboard.assigned.slice(0, 3).map((task) => <TaskRow key={task.id} task={task} compact />)}
                {!dashboard.assigned.length ? <EmptyState title="No assigned work" description="Assigned work will appear here." /> : null}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Created by me</p>
                {dashboard.createdByMe.slice(0, 3).map((task) => <TaskRow key={task.id} task={task} compact />)}
                {!dashboard.createdByMe.length ? <EmptyState title="No created work" description="Work you report or create will appear here." /> : null}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Recent Activity" description="Latest issue movement and updates from your accessible spaces." icon={CheckCircle2}>
            <div className="space-y-2">
              {dashboard.recent.map((task) => <ActivityItem key={task.id} task={task} />)}
              {!dashboard.recent.length ? <EmptyState title="Recent updates will appear here" description="Issue changes, comments, and space movement will populate this feed." /> : null}
            </div>
          </SectionCard>
        </main>

        <aside className="space-y-4">
          <SectionCard title="Upcoming" description="Deadlines and near-term planning signals." icon={CalendarClock}>
            <div className="space-y-2">
              {dashboard.dueSoon.slice(0, 4).map((task) => <TaskRow key={task.id} task={task} compact />)}
              {!dashboard.dueSoon.length ? <EmptyState title="No due-soon issues" description="Issues due in the next 7 days will appear here." /> : null}
            </div>
          </SectionCard>

          <SectionCard title="Pinned Spaces" description="Frequently used spaces with work progress." icon={FolderKanban}>
            <div className="space-y-2">
              {dashboard.spacesWithTasks.slice(0, 4).map(({ space, tasks: spaceTasks }) => (
                <SpaceRow key={space.id} space={space} tasks={spaceTasks} />
              ))}
              {!spaces.length ? (
                <EmptyState
                  title="No spaces yet"
                  description="Create your first space to start organizing work."
                  action={
                    <Button asChild size="sm">
                      <Link to="/spaces">Create space</Link>
                    </Button>
                  }
                />
              ) : null}
            </div>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
