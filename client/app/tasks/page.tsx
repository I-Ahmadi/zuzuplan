import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Filter, 
  CheckSquare, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  ListTodo
} from 'lucide-react';

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
      <div className="space-y-6 p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Tasks
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage and track all your tasks across projects
            </p>
          </div>
          <Button className="shadow-md hover:shadow-lg transition-shadow">
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search tasks..."
              className="pl-9 h-10 bg-muted/50 border-2"
            />
          </div>
          <Button variant="outline" className="h-10">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-transparent h-12">
            <TabsTrigger value="all" className="data-[state=active]:bg-muted data-[state=active]:shadow-sm">
              All Tasks
            </TabsTrigger>
            <TabsTrigger value="todo" className="data-[state=active]:bg-muted data-[state=active]:shadow-sm">
              To Do
            </TabsTrigger>
            <TabsTrigger value="in-progress" className="data-[state=active]:bg-muted data-[state=active]:shadow-sm">
              In Progress
            </TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-muted data-[state=active]:shadow-sm">
              Completed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Card className="border-2 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50">
                    <ListTodo className="h-10 w-10 text-muted-foreground/50" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">No tasks yet</h3>
                  <p className="mb-6 text-sm text-muted-foreground max-w-sm">
                    Get started by creating your first task. Tasks help you organize and track your work across projects.
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first task
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="todo" className="space-y-4">
            <Card className="border-2 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30">
                    <Clock className="h-10 w-10 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">No tasks to do</h3>
                  <p className="mb-6 text-sm text-muted-foreground max-w-sm">
                    All caught up! Create new tasks to get started.
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add new task
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="in-progress" className="space-y-4">
            <Card className="border-2 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30">
                    <CheckSquare className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">No tasks in progress</h3>
                  <p className="mb-6 text-sm text-muted-foreground max-w-sm">
                    Start working on tasks to see them here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <Card className="border-2 shadow-lg">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30">
                    <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">No completed tasks</h3>
                  <p className="mb-6 text-sm text-muted-foreground max-w-sm">
                    Complete tasks to see your achievements here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
    </ProtectedRoute>
  );
}

