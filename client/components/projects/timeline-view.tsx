'use client';

import { Task } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Calendar, Clock } from 'lucide-react';

const priorityColors = {
  LOW: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  MEDIUM: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

interface TimelineViewProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

export function TimelineView({ tasks, onTaskClick }: TimelineViewProps) {
  // Group tasks by due date
  const tasksByDate = tasks.reduce((acc, task) => {
    if (!task.dueDate) {
      if (!acc['No due date']) acc['No due date'] = [];
      acc['No due date'].push(task);
      return acc;
    }

    const date = new Date(task.dueDate).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  const sortedDates = Object.keys(tasksByDate).sort((a, b) => {
    if (a === 'No due date') return 1;
    if (b === 'No due date') return -1;
    return new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <div className="space-y-6 p-6">
      {sortedDates.map((date) => (
        <div key={date} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <h3 className="text-sm font-semibold text-foreground">{date}</h3>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="ml-8 space-y-2 border-l-2 border-border pl-6">
            {tasksByDate[date].map((task) => (
              <Card
                key={task._id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => onTaskClick?.(task)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-medium">{task.title}</CardTitle>
                    <Badge variant="outline" className={priorityColors[task.priority]}>
                      {task.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {task.description && (
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn('h-2 w-2 rounded-full', {
                          'bg-gray-500': task.status === 'TODO',
                          'bg-blue-500': task.status === 'IN_PROGRESS',
                          'bg-yellow-500': task.status === 'IN_REVIEW',
                          'bg-green-500': task.status === 'DONE',
                          'bg-red-500': task.status === 'CANCELLED',
                        })}
                      />
                      <span>{task.status.replace('_', ' ')}</span>
                    </div>
                    {task.assignee && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={task.assignee.avatar} />
                          <AvatarFallback>
                            {task.assignee.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{task.assignee.name}</span>
                      </div>
                    )}
                    {task.dueDate && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{new Date(task.dueDate).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
      {tasks.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">No tasks found</div>
      )}
    </div>
  );
}

