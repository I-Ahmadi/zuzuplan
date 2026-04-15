import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLUMNS = ["todo", "in-progress", "completed", "blocked"];

export default function TaskBoard({ tasks, onDelete }) {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {COLUMNS.map((column) => (
        <Card key={column}>
          <CardHeader>
            <CardTitle className="capitalize">{column.replace("-", " ")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.filter((task) => task.status === column).map((task) => (
              <div key={task.id} className="rounded-md border p-3">
                <h3 className="font-medium">{task.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{task.assignedTo}</p>
                <button className="mt-3 text-sm text-destructive" onClick={() => onDelete(task.id)}>
                  Delete
                </button>
              </div>
            ))}
            {!tasks.some((task) => task.status === column) && (
              <p className="text-sm text-muted-foreground">No tasks in this column.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
