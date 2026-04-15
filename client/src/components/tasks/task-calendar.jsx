import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TaskCalendar({ tasks }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length ? tasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between rounded-md border p-3">
            <span>{task.title}</span>
            <span className="text-sm text-muted-foreground">{task.dueDate || "No date"}</span>
          </div>
        )) : <p className="text-sm text-muted-foreground">No scheduled tasks yet.</p>}
      </CardContent>
    </Card>
  );
}
