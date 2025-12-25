'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, Trash2, Eye, UserCog } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

type Priority = 'High' | 'Medium' | 'Low';
type Status = 'Pending' | 'In Progress' | 'Completed' | 'Blocked';

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  priority: Priority;
  status: Status;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: user?.name || '',
    priority: 'Medium' as Priority,
    status: 'Pending' as Status,
    dueDate: '',
    tags: '',
  });

  const generateTaskId = () => {
    return `TASK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const now = new Date().toISOString();
    const newTask: Task = {
      id: generateTaskId(),
      title: formData.title,
      description: formData.description,
      assignedTo: formData.assignedTo,
      priority: formData.priority,
      status: formData.status,
      dueDate: formData.dueDate,
      createdAt: now,
      updatedAt: now,
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [],
    };

    setTasks([...tasks, newTask]);
    
    // Reset form
    setFormData({
      title: '',
      description: '',
      assignedTo: user?.name || '',
      priority: 'Medium',
      status: 'Pending',
      dueDate: '',
      tags: '',
    });
    setIsFormOpen(false);
  };

  const handleDelete = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPriorityBadgeVariant = (priority: Priority) => {
    switch (priority) {
      case 'High':
        return 'destructive';
      case 'Medium':
        return 'default';
      case 'Low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: Status) => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'In Progress':
        return 'default';
      case 'Blocked':
        return 'destructive';
      case 'Pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6 p-6 lg:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Task Management</h1>
              <p className="text-muted-foreground mt-2">
                Create and manage your tasks
              </p>
            </div>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>
                    Fill in the details to create a new task
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Enter task title"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assignedTo">Assigned To *</Label>
                      <Input
                        id="assignedTo"
                        value={formData.assignedTo}
                        onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                        placeholder="Enter assignee name"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter task description (optional)"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="priority" className="text-sm">Priority *</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value as Priority })}
                      >
                        <SelectTrigger id="priority" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="status" className="text-sm">Status *</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value as Status })}
                      >
                        <SelectTrigger id="status" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                          <SelectItem value="Blocked">Blocked</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="dueDate" className="text-sm">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="datetime-local"
                        value={formData.dueDate}
                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                        className="w-full"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Task</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
              <CardDescription>
                {tasks.length === 0
                  ? 'No tasks yet. Create your first task to get started.'
                  : `Total tasks: ${tasks.length}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No tasks available. Click "New Task" to create one.</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task ID</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Created At</TableHead>
                        <TableHead>Updated At</TableHead>
                        <TableHead>Tags/Labels</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-mono text-xs">
                            {task.id}
                          </TableCell>
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {task.description || 'N/A'}
                          </TableCell>
                          <TableCell>{task.assignedTo}</TableCell>
                          <TableCell>
                            <Badge variant={getPriorityBadgeVariant(task.priority)}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(task.status)}>
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(task.dueDate)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(task.createdAt)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(task.updatedAt)}
                          </TableCell>
                          <TableCell>
                            {task.tags.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {task.tags.map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="Reassign"
                              >
                                <UserCog className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                title="Delete"
                                onClick={() => handleDelete(task.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
