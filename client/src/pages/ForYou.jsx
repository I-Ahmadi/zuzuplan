import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, FolderKanban, ListTodo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { getProjects } from "@/lib/project-api";
import { getProjectTasks } from "@/lib/task-api";

function formatDate(value) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

export default function ForYou() {
  const { user } = useAuth();
  const spacesQuery = useQuery({ queryKey: ["spaces", "for-you"], queryFn: () => getProjects({ limit: 12 }) });
  const spaces = spacesQuery.data?.data || [];
  const taskQueries = useQueries({
    queries: spaces.slice(0, 6).map((space) => ({
      queryKey: ["for-you-tasks", space.id],
      queryFn: () => getProjectTasks(space.id, { limit: 20 }),
      enabled: Boolean(space.id),
    })),
  });
  const tasks = taskQueries.flatMap((query, index) => (query.data?.data || []).map((task) => ({ ...task, space: spaces[index] })));
  const assigned = tasks.filter((task) => task.assigneeId === user?.id);
  const dueSoon = tasks.filter((task) => {
    if (!task.dueDate || task.status === "DONE") return false;
    const days = (new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 7;
  });
  const recent = tasks.slice().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 6);

  return (
    <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">For You</h1>
        <p className="mt-1 text-sm text-muted-foreground">Assigned work, recent movement, and near-term attention points.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="flex items-center justify-between p-4"><span className="text-sm text-muted-foreground">Assigned to you</span><ListTodo className="h-4 w-4" /><strong>{assigned.length}</strong></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-4"><span className="text-sm text-muted-foreground">Due soon</span><Clock3 className="h-4 w-4" /><strong>{dueSoon.length}</strong></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-4"><span className="text-sm text-muted-foreground">Spaces</span><FolderKanban className="h-4 w-4" /><strong>{spaces.length}</strong></CardContent></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Assigned Work</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {assigned.slice(0, 6).map((task) => (
              <Link key={task.id} to={`/spaces/${task.space.id}/tasks/${task.id}`} className="block rounded-md border p-3 text-sm hover:border-primary/60">
                <span className="font-medium">{task.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{task.space.name} - {formatDate(task.dueDate)}</span>
              </Link>
            ))}
            {!assigned.length ? <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">No assigned work yet.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recent.map((task) => (
              <Link key={task.id} to={`/spaces/${task.space.id}/tasks/${task.id}`} className="flex gap-3 rounded-md border p-3 text-sm hover:border-primary/60">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{task.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{task.space.name} - {task.status.replaceAll("_", " ")}</span>
                </span>
              </Link>
            ))}
            {!recent.length ? <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">Recent updates will appear here.</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
