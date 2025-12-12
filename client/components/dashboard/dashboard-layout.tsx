import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './sidebar';
import { Header } from './header';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-y-auto bg-background">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

