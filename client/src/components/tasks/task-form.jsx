import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function TaskForm({ open, onOpenChange, onCreate }) {
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("Ismail Ahmadi");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    const now = new Date().toISOString().split("T")[0];
    onCreate({
      id: Date.now().toString(),
      title,
      description,
      assignedTo,
      priority,
      status,
      dueDate: dueDate || null,
      createdAt: now,
      updatedAt: now,
    });

    setTitle("");
    setAssignedTo("Ismail Ahmadi");
    setDescription("");
    setPriority("medium");
    setStatus("todo");
    setDueDate("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Issue</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Input id="assignedTo" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Issue</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
