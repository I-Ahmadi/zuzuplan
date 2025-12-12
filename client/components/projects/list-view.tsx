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
    <div className="space-y-2 p-6">
      {tasks.map((task) => (
        <Card
          key={task._id}
          className={cn(
            'cursor-pointer transition-all hover:shadow-md',
            statusColors[task.status]
          )}
          onClick={() => onTaskClick?.(task)}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <Checkbox
              checked={task.status === 'DONE'}
              onCheckedChange={(checked) =>
                onTaskToggle?.(task, checked as boolean)
              }
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex flex-1 items-center gap-4">
              <div className="flex-1">
                <h3 className="font-medium text-foreground">{task.title}</h3>
                {task.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
                    {task.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Badge variant="outline" className={priorityColors[task.priority]}>
                  {task.priority}
                </Badge>
                <Badge variant="outline">{task.status.replace('_', ' ')}</Badge>
                {task.assignee && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={task.assignee.avatar} />
                      <AvatarFallback>
                        {task.assignee.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">{task.assignee.name}</span>
                  </div>
                )}
                {task.dueDate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(task.dueDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {tasks.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">No tasks found</div>
      )}
    </div>
  );
}

