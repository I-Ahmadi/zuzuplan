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
    <div className="flex h-full gap-4 overflow-x-auto p-6 pb-6">
      {statuses.map((status) => (
        <div key={status.id} className="flex min-w-[300px] max-w-[300px] flex-col">
          <div className="mb-4 flex items-center gap-2">
            <div className={cn('h-3 w-3 rounded-full', status.color)} />
            <h3 className="font-semibold text-foreground">{status.label}</h3>
            <Badge variant="secondary" className="ml-auto">
              {tasksByStatus[status.id]?.length || 0}
            </Badge>
          </div>
          <ScrollArea className="flex-1 rounded-lg border border-border bg-muted/20">
            <div className="space-y-3 p-3">
              {tasksByStatus[status.id]?.map((task) => (
                <Card
                  key={task._id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => onTaskClick?.(task)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={priorityColors[task.priority]}>
                        {task.priority}
                      </Badge>
                      <div className="flex items-center gap-2">
                        {task.assignee && (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={task.assignee.avatar} />
                            <AvatarFallback>
                              {task.assignee.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {task.dueDate && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No tasks
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
}

