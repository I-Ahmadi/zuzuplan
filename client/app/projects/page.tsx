'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KanbanView } from '@/components/projects/kanban-view';
import { ListView } from '@/components/projects/list-view';
import { TimelineView } from '@/components/projects/timeline-view';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Task } from '@/types';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

// Mock data - will be replaced with API calls
const mockTasks: Task[] = [
  {
    _id: '1',
    title: 'Design user interface',
    description: 'Create wireframes and mockups for the new feature',
    projectId: '1',
    assigneeId: '1',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignee: {
      _id: '1',
      email: 'user@example.com',
      name: 'John Doe',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    _id: '2',
    title: 'Implement authentication',
    description: 'Set up user authentication and authorization',
    projectId: '1',
    priority: 'URGENT',
    status: 'TODO',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: '3',
    title: 'Write unit tests',
    description: 'Add comprehensive test coverage',
    projectId: '1',
    assigneeId: '2',
    priority: 'MEDIUM',
    status: 'DONE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assignee: {
      _id: '2',
      email: 'jane@example.com',
      name: 'Jane Smith',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
];

export default function ProjectsPage() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [view, setView] = useState<'kanban' | 'list' | 'timeline'>('kanban');

  const handleTaskClick = (task: Task) => {
    // Navigate to task details
    console.log('Task clicked:', task);
  };

  const handleTaskToggle = (task: Task, completed: boolean) => {
    setTasks(
      tasks.map((t) =>
        t._id === task._id
          ? { ...t, status: completed ? 'DONE' : 'TODO' }
          : t
      )
    );
  };

  return (
    <DashboardLayout>
      <div className="flex h-screen flex-col">
        <div className="flex items-center justify-between border-b border-border bg-background p-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Project Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage your projects and tasks
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>

        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)} className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border px-6">
            <TabsList className="bg-transparent">
              <TabsTrigger value="kanban">Kanban</TabsTrigger>
              <TabsTrigger value="list">List</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="kanban" className="m-0 flex-1 overflow-hidden">
            <KanbanView tasks={tasks} onTaskClick={handleTaskClick} />
          </TabsContent>

          <TabsContent value="list" className="m-0 flex-1 overflow-auto">
            <ListView
              tasks={tasks}
              onTaskClick={handleTaskClick}
              onTaskToggle={handleTaskToggle}
            />
          </TabsContent>

          <TabsContent value="timeline" className="m-0 flex-1 overflow-auto">
            <TimelineView tasks={tasks} onTaskClick={handleTaskClick} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

