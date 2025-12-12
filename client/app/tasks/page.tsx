import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

export default function TasksPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground">Manage all your tasks</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

