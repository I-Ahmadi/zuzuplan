'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CheckSquare,
  Settings,
  LogOut,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/auth-context';

const navigation = [
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive} 
                      tooltip={item.name}
                      className="hover:bg-sidebar-accent transition-all data-[active=true]:bg-sidebar-accent data-[active=true]:shadow-sm"
                    >
                      <Link href={item.href}>
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => logout()}
              tooltip="Logout"
              className="hover:bg-destructive/10 hover:text-destructive transition-colors text-sidebar-foreground"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

