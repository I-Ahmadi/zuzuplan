import { CalendarDays, ScrollText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const RELEASE_NOTES = [
  {
    title: "Unified loading indicators",
    date: "Latest",
    description: "Data-loading states now use a consistent spinner across pages, tabs, dialogs, and search.",
  },
  {
    title: "Sidebar cleanup",
    date: "Recent",
    description: "Navigation is simpler, with footer shortcuts for notifications, release notes, theme, and account.",
  },
  {
    title: "Timeline improvements",
    date: "Recent",
    description: "Timeline controls were streamlined while preserving search, assignee, status category, and range controls.",
  },
];

export default function ReleaseNotes() {
  return (
    <div className="space-y-4 px-3 py-4 sm:px-4 lg:px-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Release Notes</h1>
        <p className="mt-1 text-sm text-muted-foreground">A short history of product updates and UI improvements.</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-4 w-4 text-primary" />
            Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {RELEASE_NOTES.map((note) => (
            <article className="p-4" key={note.title}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold">{note.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{note.description}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {note.date}
                </span>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
