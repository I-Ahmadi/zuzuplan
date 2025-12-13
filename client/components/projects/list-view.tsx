'use client';

import { Task } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  MEDIUM: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statusColors = {
  TODO: 'border-gray-300 dark:border-gray-700',
  IN_PROGRESS: 'border-blue-300 dark:border-blue-700',
  IN_REVIEW: 'border-yellow-300 dark:border-yellow-700',
  DONE: 'border-green-300 dark:border-green-700',
  CANCELLED: 'border-red-300 dark:border-red-700',
};

interface ListViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskToggle?: (task: Task, completed: boolean) => void;
}

export function ListView({ tasks, onTaskClick, onTaskToggle }: ListViewProps) {
  return (
    <div className="space-y-3 p-6">
      {tasks.map((task) => (
        <Card
          key={task._id}
          className={cn(
            'cursor-pointer border-2 transition-all hover:shadow-lg hover:scale-[1.01]',
            statusColors[task.status]
          )}
          onClick={() => onTaskClick?.(task)}
        >
          <CardContent className="flex items-center gap-4 p-5">
            <Checkbox
              checked={task.status === 'DONE'}
              onCheckedChange={(checked) =>
                onTaskToggle?.(task, checked as boolean)
              }
              onClick={(e) => e.stopPropagation()}
              className="h-5 w-5"
            />
            <div className="flex flex-1 items-center gap-6">
              <div className="flex-1 min-w-0">
                <h3 className={cn(
                  "font-semibold text-base mb-1",
                  task.status === 'DONE' && "line-through text-muted-foreground"
                )}>
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {task.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Badge variant="outline" className={cn("text-xs font-medium", priorityColors[task.priority])}>
                  {task.priority}
                </Badge>
                <Badge variant="secondary" className="text-xs font-medium">
                  {task.status.replace('_', ' ')}
                </Badge>
                {task.assignee && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
                      <AvatarImage src={task.assignee.avatar} />
                      <AvatarFallback className="text-xs font-semibold">
                        {task.assignee.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-muted-foreground hidden sm:inline">
                      {task.assignee.name}
                    </span>
                  </div>
                )}
                {task.dueDate && (
                  <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">{new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {tasks.length === 0 && (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <CheckSquare className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-base font-semibold text-muted-foreground">No tasks found</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Create your first task to get started</p>
        </div>
      )}
    </div>
  );
}

