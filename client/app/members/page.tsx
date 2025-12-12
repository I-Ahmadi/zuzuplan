import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

export default function MembersPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Members</h1>
          <p className="text-muted-foreground">Manage team members and roles</p>
        </div>
      </div>
    </DashboardLayout>
  );
}

