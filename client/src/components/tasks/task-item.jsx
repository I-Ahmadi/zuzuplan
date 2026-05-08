import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TaskItem({ task, onDelete }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h3 className="font-medium">{task.title}</h3>
          <p className="text-sm text-muted-foreground">{task.description || "No description provided."}</p>
          <p className="text-xs text-muted-foreground">
            {task.assignedTo} - {task.status} - {task.priority}
          </p>
        </div>
        <Button variant="outline" onClick={() => onDelete(task.id)}>
          Delete
        </Button>
      </CardContent>
    </Card>
  );
}
