import { useEffect, useState } from "react";
import { MailPlus, Shield, Trash2, UserMinus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InlineLoader } from "@/components/ui/loading";
import { getClientPagination, PAGE_SIZE, PaginationControls } from "@/components/ui/pagination";
import {
  createProjectInvite,
  getProject,
  getProjectInvites,
  getProjects,
  removeProjectMember,
  revokeProjectInvite,
  updateProjectMember,
} from "@/lib/project-api";
import { useApiAction, useApiResource } from "@/lib/api-hooks";
import { LEGACY_STORAGE_KEYS, migrateStorageKey, STORAGE_KEYS } from "@/lib/storage-keys";
import { useAuth } from "@/contexts/auth-context";
import { useProjectMembers } from "@/contexts/project-members-context";

const ROLES = ["Admin", "Manager", "Employee", "Viewer"];
const CURRENT_PROJECT_KEY = STORAGE_KEYS.currentProjectId;
const CURRENT_PROJECT_CHANGE_EVENT = "current-project-change";

function resultMessage(result, fallback) {
  return result?.error?.message || fallback;
}

function formatDate(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default function People() {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState(() => migrateStorageKey(LEGACY_STORAGE_KEYS.currentProjectId, CURRENT_PROJECT_KEY) || "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Employee");
  const [message, setMessage] = useState("");
  const [membersPage, setMembersPage] = useState(1);
  const [invitesPage, setInvitesPage] = useState(1);

  const projectsQuery = useApiResource(() => getProjects({ fields: "switcher", limit: PAGE_SIZE }), [], { refreshEvents: ["projects"] });
  const projects = projectsQuery.data?.data || [];

  useEffect(() => {
    if (!projectId && projects[0]?.id) {
      localStorage.setItem(CURRENT_PROJECT_KEY, projects[0].id);
      setProjectId(projects[0].id);
      window.dispatchEvent(new CustomEvent(CURRENT_PROJECT_CHANGE_EVENT, { detail: projects[0].id }));
    }
  }, [projectId, projects]);

  useEffect(() => {
    function handleProjectChange(event) {
      if (event.detail) setProjectId(event.detail);
    }

    window.addEventListener(CURRENT_PROJECT_CHANGE_EVENT, handleProjectChange);
    return () => window.removeEventListener(CURRENT_PROJECT_CHANGE_EVENT, handleProjectChange);
  }, []);

  const projectQuery = useApiResource(() => getProject(projectId, { fields: "people" }), [projectId], { enabled: Boolean(projectId) });

  const invitesQuery = useApiResource(() => getProjectInvites(projectId), [projectId], { enabled: Boolean(projectId) });
  const { members, isLoading: membersLoading, error: membersError, refreshMembers } = useProjectMembers(projectId);

  const refreshPeople = () => {
    refreshMembers();
    invitesQuery.reload();
    projectQuery.reload();
  };

  const inviteAction = useApiAction(() => createProjectInvite(projectId, { email: inviteEmail, role: inviteRole }), {
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(resultMessage(result, "Could not send invite."));
        return;
      }
      setInviteEmail("");
      setInviteRole("Employee");
      setMessage("Invite sent.");
      refreshPeople();
    },
    onError: (error) => setMessage(error.message),
  });

  const updateRoleAction = useApiAction(({ userId, role }) => updateProjectMember(projectId, userId, { role }), {
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(resultMessage(result, "Could not update role."));
        return;
      }
      setMessage("Role updated.");
      refreshPeople();
    },
    onError: (error) => setMessage(error.message),
  });

  const removeMemberAction = useApiAction((userId) => removeProjectMember(projectId, userId), {
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(resultMessage(result, "Could not remove member."));
        return;
      }
      setMessage("Member removed.");
      refreshPeople();
    },
    onError: (error) => setMessage(error.message),
  });

  const revokeInviteAction = useApiAction((inviteId) => revokeProjectInvite(projectId, inviteId), {
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(resultMessage(result, "Could not revoke invite."));
        return;
      }
      setMessage("Invite revoked.");
      refreshPeople();
    },
    onError: (error) => setMessage(error.message),
  });

  const project = projectQuery.data?.data;
  const invites = invitesQuery.data?.data || [];
  const canManage = project?.currentUserPermissions?.includes("members.manage");
  const pendingInvites = invites.filter((invite) => invite.status === "PENDING");
  const { items: pagedMembers, pagination: membersPagination } = getClientPagination(members, membersPage, PAGE_SIZE);
  const { items: pagedInvites, pagination: invitesPagination } = getClientPagination(pendingInvites, invitesPage, PAGE_SIZE);

  useEffect(() => {
    setMembersPage(1);
    setInvitesPage(1);
  }, [projectId]);

  function submitInvite(event) {
    event.preventDefault();
    setMessage("");
    if (!inviteEmail.trim()) {
      setMessage("Email is required.");
      return;
    }
    inviteAction.run();
  }

  return (
    <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">People</h1>
          <p className="mt-1 text-sm text-muted-foreground">Invite people and manage project access.</p>
        </div>
        {project ? (
          <div className="inline-flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm">
            <span className="font-medium">{project.name}</span>
            <span className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground">{project.key}</span>
          </div>
        ) : null}
      </div>

      {message ? (
        <div className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm">
          <span>{message}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMessage("")} aria-label="Dismiss message">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Members</CardTitle>
              <CardDescription>{project?.name || "Select a project"} access list.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {membersLoading ? <InlineLoader message="Loading members..." /> : null}
              {!membersLoading && membersError ? (
                <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-destructive">{membersError}</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => refreshMembers()}>
                    Retry
                  </Button>
                </div>
              ) : null}
              {!membersLoading && pagedMembers.map((member) => {
                const isOwner = project?.ownerId === member.userId;
                const isCurrentUser = user?.id === member.userId;
                return (
                  <div key={member.id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar user={member.user} className="h-9 w-9" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{member.user?.name || member.user?.email}</p>
                        <p className="truncate text-xs text-muted-foreground">{member.user?.email}</p>
                      </div>
                    </div>
                    <select
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                      value={member.role}
                      disabled={!canManage || isOwner || updateRoleAction.isPending}
                      onChange={(event) => updateRoleAction.run({ userId: member.userId, role: event.target.value })}
                    >
                      {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 justify-self-start text-muted-foreground hover:text-destructive sm:justify-self-end"
                      disabled={!canManage || isOwner || isCurrentUser || removeMemberAction.isPending}
                      onClick={() => removeMemberAction.run(member.userId)}
                      aria-label={`Remove ${member.user?.name || member.user?.email}`}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              <PaginationControls pagination={membersPagination} onPageChange={setMembersPage} className="border-0 px-0" />
              {!membersLoading && !membersError && members.length === 0 ? <p className="text-sm text-muted-foreground">No members found.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Invites</CardTitle>
              <CardDescription>Invitations expire after seven days.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {invitesQuery.isLoading ? <InlineLoader message="Loading invites..." /> : null}
              {!invitesQuery.isLoading && pagedInvites.map((invite) => (
                <div key={invite.id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">Expires {formatDate(invite.expiresAt)}</p>
                  </div>
                  <span className="inline-flex h-7 items-center gap-1 rounded-md bg-secondary px-2 text-xs">
                    <Shield className="h-3 w-3" />
                    {invite.role}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 justify-self-start text-muted-foreground hover:text-destructive sm:justify-self-end"
                    disabled={!canManage || revokeInviteAction.isPending}
                    onClick={() => revokeInviteAction.run(invite.id)}
                    aria-label={`Revoke invite to ${invite.email}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <PaginationControls pagination={invitesPagination} onPageChange={setInvitesPage} className="border-0 px-0" />
              {!invitesQuery.isLoading && pendingInvites.length === 0 ? <p className="text-sm text-muted-foreground">No pending invites.</p> : null}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite Member</CardTitle>
            <CardDescription>Send an email invitation with a project role.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submitInvite}>
              <Input type="email" placeholder="teammate@example.com" value={inviteEmail} disabled={!canManage} onChange={(event) => setInviteEmail(event.target.value)} />
              <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={inviteRole} disabled={!canManage} onChange={(event) => setInviteRole(event.target.value)}>
                {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <Button className="w-full" disabled={!canManage || inviteAction.isPending}>
                <MailPlus className="h-4 w-4" />
                {inviteAction.isPending ? "Sending..." : "Send invite"}
              </Button>
              {!canManage ? <p className="text-xs text-muted-foreground">You can view these people, but cannot manage membership.</p> : null}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
