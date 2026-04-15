import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TaskTimeline({ tasks }) {
  const datedTasks = [...tasks].sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {datedTasks.length ? datedTasks.map((task) => (
          <div key={task.id} className="border-l-2 pl-4">
            <p className="font-medium">{task.title}</p>
            <p className="text-sm text-muted-foreground">{task.dueDate || "No due date"}</p>
          </div>
        )) : <p className="text-sm text-muted-foreground">No tasks available for the timeline.</p>}
      </CardContent>
    </Card>
  );
}
