import { Clock3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Recent() {
  return (
    <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Recent</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recently opened spaces, boards, docs, tasks, and settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock3 className="h-4 w-4" />
            Recent navigation disabled
          </CardTitle>
          <CardDescription>This portal no longer stores page navigation history in local storage.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            Use search or the sidebar navigation to open spaces, boards, tasks, and settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
