import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TaskNote({ tasks }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.length ? tasks.map((task) => (
          <div key={task.id} className="rounded-md border p-3">
            <h3 className="font-medium">{task.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{task.description || "No notes added."}</p>
          </div>
        )) : <p className="text-sm text-muted-foreground">No issue notes available.</p>}
      </CardContent>
    </Card>
  );
}
