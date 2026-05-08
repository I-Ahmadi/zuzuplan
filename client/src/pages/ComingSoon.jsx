import { Construction } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ComingSoon({ title, description }) {
  return (
    <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Construction className="h-4 w-4" />
            Under development
          </CardTitle>
          <CardDescription>This area is planned for a future release.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            The navigation is ready. The feature experience will be added here later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
