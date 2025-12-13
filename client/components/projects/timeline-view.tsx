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
    <div className="space-y-8 p-6">
      {sortedDates.map((date) => (
        <div key={date} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-border" />
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-4 py-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">{date}</h3>
            </div>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-border" />
          </div>
          <div className="ml-8 space-y-3 border-l-2 border-border pl-8 relative">
            <div className="absolute -left-[5px] top-0 bottom-0 w-1 bg-gradient-to-b from-primary/20 via-primary/40 to-primary/20" />
            {tasksByDate[date].map((task, index) => (
              <Card
                key={task._id}
                className="cursor-pointer border-2 transition-all hover:shadow-lg hover:scale-[1.01] hover:border-primary/20 relative"
                onClick={() => onTaskClick?.(task)}
              >
                <div className="absolute -left-[33px] top-6 h-3 w-3 rounded-full border-2 border-background bg-primary shadow-md" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base font-semibold leading-tight">{task.title}</CardTitle>
                    <Badge variant="outline" className={cn("text-xs font-medium flex-shrink-0", priorityColors[task.priority])}>
                      {task.priority}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {task.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 flex-wrap text-sm">
                    <div className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1">
                      <div
                        className={cn('h-2.5 w-2.5 rounded-full shadow-sm', {
                          'bg-gray-500': task.status === 'TODO',
                          'bg-blue-500': task.status === 'IN_PROGRESS',
                          'bg-yellow-500': task.status === 'IN_REVIEW',
                          'bg-green-500': task.status === 'DONE',
                          'bg-red-500': task.status === 'CANCELLED',
                        })}
                      />
                      <span className="font-medium text-muted-foreground">{task.status.replace('_', ' ')}</span>
                    </div>
                    {task.assignee && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7 border-2 border-background shadow-sm">
                          <AvatarImage src={task.assignee.avatar} />
                          <AvatarFallback className="text-xs font-semibold">
                            {task.assignee.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-muted-foreground">{task.assignee.name}</span>
                      </div>
                    )}
                    {task.dueDate && (
                      <div className="flex items-center gap-2 rounded-md bg-muted px-2.5 py-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="font-medium">{new Date(task.dueDate).toLocaleTimeString()}</span>
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
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Clock className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-base font-semibold text-muted-foreground">No tasks found</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Create tasks with due dates to see them on the timeline</p>
        </div>
      )}
    </div>
  );
}

