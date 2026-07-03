import { Bell, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Notifications() {
  return (
    <div className="space-y-4 px-3 py-4 sm:px-4 lg:px-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">Assignments, mentions, invites, and due-date updates will appear here.</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary" />
            Inbox
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="rounded-md border border-dashed p-8 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 text-sm font-medium">No notifications yet</p>
            <p className="mt-1 text-sm text-muted-foreground">New work updates and people activity will show up here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
