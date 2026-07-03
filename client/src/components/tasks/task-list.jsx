import TaskItem from "@/components/tasks/task-item";

export default function TaskList({ tasks, onEdit, onDelete }) {
  if (!tasks.length) {
    return <div className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">No tasks yet. Create one to get started.</div>;
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
