import { useEffect, useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Activity,
  CalendarClock,
  Filter,
  FolderKanban,
  KeyRound,
  MailCheck,
  Search,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { getClientPagination, PAGE_SIZE, PaginationControls } from "@/components/ui/pagination";
import { UserAvatar } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { getProjectInvites, getProjects } from "@/lib/project-api";
import { getCurrentUser, getUserSessions } from "@/lib/user-api";
import { cn } from "@/lib/utils";

const EVENT_TYPES = [
  { value: "all", label: "All events" },
  { value: "account", label: "Account" },
  { value: "session", label: "Sessions" },
  { value: "security", label: "Security" },
  { value: "workspace", label: "Workspace" },
  { value: "invite", label: "Invites" },
];
const SEVERITIES = [
  { value: "all", label: "All severity" },
  { value: "info", label: "Info" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
];

function formatDateTime(value) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function eventIcon(type) {
  if (type === "session") return KeyRound;
  if (type === "security") return ShieldCheck;
  if (type === "workspace") return FolderKanban;
  if (type === "invite") return UserPlus;
  return Activity;
}

function severityClass(severity) {
  return {
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
    warning: "border-orange-500/30 bg-orange-500/10 text-orange-500",
    info: "border-border bg-muted/35 text-muted-foreground",
  }[severity] || "border-border bg-muted/35 text-muted-foreground";
}

function AuditStat({ label, value, detail, icon: Icon }) {
  return (
    <div className="flex min-w-0 items-center gap-3 border-r px-4 py-3 last:border-r-0">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border bg-muted/35 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-xl font-semibold">{value}</span>
          <span className="truncate text-xs text-muted-foreground">{detail}</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ loading }) {
  return (
    <div className="rounded-md border border-dashed p-8 text-center">
      <p className="text-sm font-medium">{loading ? "Loading audit activity..." : "No audit events found"}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {loading ? "Gathering account, session, workspace, and invite events." : "Try changing filters or search terms."}
      </p>
    </div>
  );
}

function AuditEventRow({ event, active, onSelect }) {
  const Icon = eventIcon(event.type);

  return (
    <tr
      className={cn("cursor-pointer border-b text-sm hover:bg-accent/35", active && "bg-primary/10")}
      onClick={() => onSelect(event.id)}
    >
      <td className="whitespace-nowrap px-3 py-3 align-top text-xs text-muted-foreground">{formatDateTime(event.timestamp)}</td>
      <td className="px-3 py-3 align-top">
        <span className="inline-flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded border bg-muted/35 text-primary">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="font-medium capitalize">{event.type}</span>
        </span>
      </td>
      <td className="min-w-[260px] px-3 py-3 align-top">
        <p className="font-semibold">{event.title}</p>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{event.description}</p>
      </td>
      <td className="px-3 py-3 align-top text-muted-foreground">{event.scope}</td>
      <td className="px-3 py-3 align-top">
        <span className={cn("rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize", severityClass(event.severity))}>
          {event.severity}
        </span>
      </td>
      <td className="px-3 py-3 align-top text-xs text-muted-foreground">{event.source}</td>
    </tr>
  );
}

function EventDetails({ event, user }) {
  if (!event) {
    return (
      <aside className="rounded-md border bg-background p-5 xl:sticky xl:top-16">
        <EmptyState />
      </aside>
    );
  }

  const Icon = eventIcon(event.type);
  const actorName = event.actor?.name || user?.name || user?.email || "Current user";
  const actorEmail = event.actor?.email || user?.email || "No email available";
  const eventId = event.id.length > 22 ? `${event.id.slice(0, 22)}...` : event.id;

  return (
    <aside className="overflow-hidden rounded-md border bg-background xl:sticky xl:top-16">
      <div className="border-b px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-primary" />
          Event details
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(event.timestamp)}</p>
      </div>
      <div className="space-y-4 overflow-y-auto p-4 text-sm xl:max-h-[calc(100vh-10rem)]">
        <div className={cn("rounded-md border p-3", event.severity === "warning" ? "border-orange-500/30 bg-orange-500/10" : event.severity === "success" ? "border-emerald-500/30 bg-emerald-500/10" : "bg-muted/20")}>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border bg-background/70 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Audit outcome</p>
              <p className="mt-1 font-semibold capitalize">{event.severity}</p>
              <p className="mt-1 text-xs text-muted-foreground">Generated from {event.source.toLowerCase()} data.</p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">{event.title}</h2>
          <p className="mt-1 text-muted-foreground">{event.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Event ID</p>
            <p className="mt-1 truncate font-mono text-xs">{eventId}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Observed</p>
            <p className="mt-1 text-xs">{formatDateTime(event.timestamp)}</p>
          </div>
        </div>

        <div className="rounded-md border p-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Actor</p>
          <div className="mt-3 flex min-w-0 items-center gap-3">
            <UserAvatar user={event.actor || user} fallback={actorName} className="h-9 w-9" fallbackClassName="bg-primary text-primary-foreground" />
            <div className="min-w-0">
              <p className="truncate font-semibold">{actorName}</p>
              <p className="truncate text-xs text-muted-foreground">{actorEmail}</p>
            </div>
          </div>
        </div>

        <div className="grid overflow-hidden rounded border">
          <div className="grid grid-cols-[112px_minmax(0,1fr)]">
            <span className="border-r bg-muted/25 px-3 py-2 text-muted-foreground">Type</span>
            <span className="px-3 py-2 text-right capitalize">{event.type}</span>
          </div>
          <div className="grid grid-cols-[112px_minmax(0,1fr)] border-t">
            <span className="border-r bg-muted/25 px-3 py-2 text-muted-foreground">Severity</span>
            <span className="px-3 py-2 text-right">
              <span className={cn("rounded border px-2 py-1 text-xs font-medium capitalize", severityClass(event.severity))}>{event.severity}</span>
            </span>
          </div>
          <div className="grid grid-cols-[112px_minmax(0,1fr)] border-t">
            <span className="border-r bg-muted/25 px-3 py-2 text-muted-foreground">Scope</span>
            <span className="truncate px-3 py-2 text-right">{event.scope}</span>
          </div>
          <div className="grid grid-cols-[112px_minmax(0,1fr)] border-t">
            <span className="border-r bg-muted/25 px-3 py-2 text-muted-foreground">Source</span>
            <span className="px-3 py-2 text-right">{event.source}</span>
          </div>
          <div className="grid grid-cols-[112px_minmax(0,1fr)] border-t">
            <span className="border-r bg-muted/25 px-3 py-2 text-muted-foreground">Actor</span>
            <span className="inline-flex min-w-0 items-center justify-end gap-2 px-3 py-2 text-right">
              <UserAvatar user={event.actor || user} fallback={event.actor?.name || user?.name || "U"} className="h-6 w-6" fallbackClassName="bg-primary text-[10px] text-primary-foreground" />
              <span className="truncate">{event.actor?.name || user?.name || user?.email || "Current user"}</span>
            </span>
          </div>
        </div>

        <div className="rounded-md border">
          <div className="border-b px-3 py-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Raw event summary</p>
          </div>
          <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-y-2 p-3 text-xs">
            <dt className="text-muted-foreground">id</dt>
            <dd className="truncate font-mono">{event.id}</dd>
            <dt className="text-muted-foreground">type</dt>
            <dd className="font-mono">{event.type}</dd>
            <dt className="text-muted-foreground">severity</dt>
            <dd className="font-mono">{event.severity}</dd>
            <dt className="text-muted-foreground">timestamp</dt>
            <dd className="font-mono">{event.timestamp || "null"}</dd>
          </dl>
        </div>

        <div className="rounded-md border bg-muted/20 p-3">
          <p className="font-medium">Audit storage note</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This event is derived from existing account/session/workspace records. Persistent IP, browser, and request-level audit trails require a dedicated backend audit log table.
          </p>
        </div>
      </div>
    </aside>
  );
}

export default function AuditLog() {
  const { user: authUser } = useAuth();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState("");

  const userQuery = useQuery({ queryKey: ["current-user", "audit-log"], queryFn: getCurrentUser });
  const sessionsQuery = useQuery({ queryKey: ["user-sessions", "audit-log"], queryFn: getUserSessions });
  const spacesQuery = useQuery({ queryKey: ["spaces", "audit-log"], queryFn: () => getProjects({ limit: PAGE_SIZE }) });
  const currentUser = userQuery.data?.data || authUser;
  const sessions = sessionsQuery.data?.data || [];
  const spaces = spacesQuery.data?.data || [];
  const inviteQueries = useQueries({
    queries: spaces.map((space) => ({
      queryKey: ["project-invites", "audit-log", space.id],
      queryFn: () => getProjectInvites(space.id),
      enabled: Boolean(space.id),
    })),
  });
  const loading = userQuery.isLoading || sessionsQuery.isLoading || spacesQuery.isLoading || inviteQueries.some((query) => query.isLoading);

  const events = useMemo(() => {
    const baseEvents = [];

    if (currentUser?.createdAt) {
      baseEvents.push({
        id: "account-created",
        type: "account",
        severity: "success",
        title: "Account created",
        description: `${currentUser.email} joined ZuzuPlan.`,
        timestamp: currentUser.createdAt,
        scope: "Account",
        source: "User profile",
        actor: currentUser,
      });
    }

    baseEvents.push({
      id: "email-verification",
      type: "security",
      severity: currentUser?.emailVerified ? "success" : "warning",
      title: currentUser?.emailVerified ? "Email verified" : "Email verification pending",
      description: currentUser?.emailVerified ? "The account email is verified." : "The account email still needs verification.",
      timestamp: currentUser?.updatedAt || currentUser?.createdAt,
      scope: "Account security",
      source: "User profile",
      actor: currentUser,
    });

    if (currentUser?.passwordChangedAt) {
      baseEvents.push({
        id: "password-changed",
        type: "security",
        severity: "success",
        title: "Password changed",
        description: "The account password was updated.",
        timestamp: currentUser.passwordChangedAt,
        scope: "Account security",
        source: "User profile",
        actor: currentUser,
      });
    }

    sessions.forEach((session) => {
      baseEvents.push({
        id: `session-${session.id}`,
        type: "session",
        severity: "info",
        title: "Active session issued",
        description: `Session expires ${formatDateTime(session.expiresAt)}.`,
        timestamp: session.createdAt,
        scope: "Authentication",
        source: "Refresh token",
        actor: currentUser,
      });
    });

    spaces.forEach((space) => {
      baseEvents.push({
        id: `space-${space.id}`,
        type: "workspace",
        severity: space.ownerId === currentUser?.id ? "success" : "info",
        title: space.ownerId === currentUser?.id ? "Workspace created" : "Workspace access available",
        description: `${space.name} is available to this account.`,
        timestamp: space.createdAt || space.updatedAt,
        scope: space.name,
        source: "Workspace record",
        actor: space.owner || currentUser,
      });
    });

    inviteQueries.forEach((query, index) => {
      const space = spaces[index];
      (query.data?.data || []).forEach((invite) => {
        baseEvents.push({
          id: `invite-${invite.id}`,
          type: "invite",
          severity: invite.status === "ACCEPTED" ? "success" : "info",
          title: `Invite ${String(invite.status || "pending").toLowerCase()}`,
          description: `${invite.email} was invited to ${space?.name || "a workspace"} as ${invite.role}.`,
          timestamp: invite.acceptedAt || invite.createdAt,
          scope: space?.name || "Workspace",
          source: "Project invite",
          actor: invite.invitedBy || currentUser,
        });
      });
    });

    return baseEvents.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
  }, [currentUser, inviteQueries, sessions, spaces]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (typeFilter !== "all" && event.type !== typeFilter) return false;
      if (severityFilter !== "all" && event.severity !== severityFilter) return false;
      if (search.trim()) {
        const haystack = [event.title, event.description, event.scope, event.source, event.type, event.severity].join(" ").toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [events, search, severityFilter, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, severityFilter, typeFilter]);

  const { items: pagedEvents, pagination } = useMemo(
    () => getClientPagination(filteredEvents, page, PAGE_SIZE),
    [filteredEvents, page]
  );

  const selectedEvent = pagedEvents.find((event) => event.id === selectedId) || pagedEvents[0] || filteredEvents[0];
  const warningCount = events.filter((event) => event.severity === "warning").length;
  const sessionCount = events.filter((event) => event.type === "session").length;
  const inviteCount = events.filter((event) => event.type === "invite").length;

  return (
    <div className="bg-background px-3 py-4 sm:px-4 lg:px-5">
      <div className="w-full space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Audit Log</h1>
            <p className="mt-1 text-sm text-muted-foreground">Trace authentication, account security, workspace access, and invite activity.</p>
          </div>
          <div className="rounded border bg-muted/25 px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Retention:</span> derived from current records
          </div>
        </div>

        <div className="grid overflow-hidden rounded-md border bg-muted/10 md:grid-cols-2 xl:grid-cols-4">
          <AuditStat label="Derived events" value={events.length} detail="existing records" icon={Activity} />
          <AuditStat label="Active sessions" value={sessionCount} detail="refresh tokens" icon={KeyRound} />
          <AuditStat label="Warnings" value={warningCount} detail="needs review" icon={ShieldCheck} />
          <AuditStat label="Invites" value={inviteCount} detail="access changes" icon={UserPlus} />
        </div>

        <div className="grid gap-3 rounded-md border bg-background p-3 xl:grid-cols-[minmax(0,1fr)_minmax(420px,24vw)]">
          <section className="min-w-0 space-y-3">
            <div className="rounded-md border bg-background p-3">
              <div className="grid gap-2 lg:grid-cols-[minmax(280px,1fr)_180px_180px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search event, scope, source, or description" />
                </div>
                <select className="h-9 rounded-md border bg-background px-3 text-sm" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter by event type">
                  {EVENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
                <select className="h-9 rounded-md border bg-background px-3 text-sm" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} aria-label="Filter by severity">
                  {SEVERITIES.map((severity) => <option key={severity.value} value={severity.value}>{severity.label}</option>)}
                </select>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" />
                  {filteredEvents.length} matching events
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  newest first
                </span>
                <span className="inline-flex items-center gap-1">
                  <MailCheck className="h-3.5 w-3.5" />
                  email {currentUser?.emailVerified ? "verified" : "pending"}
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border bg-background">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left">
                  <thead className="border-b bg-muted/20 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Timestamp</th>
                      <th className="px-3 py-2 font-semibold">Category</th>
                      <th className="px-3 py-2 font-semibold">Event</th>
                      <th className="px-3 py-2 font-semibold">Scope</th>
                      <th className="px-3 py-2 font-semibold">Severity</th>
                      <th className="px-3 py-2 font-semibold">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedEvents.map((event) => (
                      <AuditEventRow key={event.id} event={event} active={selectedEvent?.id === event.id} onSelect={setSelectedId} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <PaginationControls pagination={pagination} onPageChange={setPage} />
          {!filteredEvents.length ? (
            <div className="rounded-md border bg-background p-4">
              <EmptyState loading={loading} />
            </div>
          ) : null}
        </section>

          <div className="bg-background">
            <EventDetails event={selectedEvent} user={currentUser} />
          </div>
        </div>
      </div>
    </div>
  );
}
