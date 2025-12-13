'use client';

import { Task } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Calendar, User } from 'lucide-react';

const statuses = [
  { id: 'TODO', label: 'To Do', color: 'bg-gray-500' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'IN_REVIEW', label: 'In Review', color: 'bg-yellow-500' },
  { id: 'DONE', label: 'Done', color: 'bg-green-500' },
  { id: 'CANCELLED', label: 'Cancelled', color: 'bg-red-500' },
];

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  MEDIUM: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

interface KanbanViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function KanbanView({ tasks, onTaskClick }: KanbanViewProps) {
  const tasksByStatus = statuses.reduce((acc, status) => {
    acc[status.id] = tasks.filter((task) => task.status === status.id);
    return acc;
  }, {} as Record<string, Task[]>);

  return (
    <div className="flex h-full gap-6 overflow-x-auto p-6 pb-6">
      {statuses.map((status) => (
        <div key={status.id} className="flex min-w-[320px] max-w-[320px] flex-col">
          <div className="mb-4 flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
            <div className={cn('h-3 w-3 rounded-full shadow-sm', status.color)} />
            <h3 className="font-semibold text-foreground text-sm">{status.label}</h3>
            <Badge variant="secondary" className="ml-auto font-semibold">
              {tasksByStatus[status.id]?.length || 0}
            </Badge>
          </div>
          <ScrollArea className="flex-1 rounded-xl border-2 border-border bg-muted/10">
            <div className="space-y-3 p-3">
              {tasksByStatus[status.id]?.map((task) => (
                <Card
                  key={task._id}
                  className="cursor-pointer border-2 transition-all hover:shadow-lg hover:scale-[1.02] hover:border-primary/20"
                  onClick={() => onTaskClick?.(task)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold leading-tight">{task.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className={cn("text-xs font-medium", priorityColors[task.priority])}>
                        {task.priority}
                      </Badge>
                      <div className="flex items-center gap-2">
                        {task.assignee && (
                          <Avatar className="h-7 w-7 border-2 border-background shadow-sm">
                            <AvatarImage src={task.assignee.avatar} />
                            <AvatarFallback className="text-xs font-semibold">
                              {task.assignee.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {task.dueDate && (
                          <div className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {(!tasksByStatus[status.id] || tasksByStatus[status.id].length === 0) && (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No tasks</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Drag tasks here or create new ones</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}

