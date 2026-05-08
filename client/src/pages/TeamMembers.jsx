import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MailPlus, Shield, Trash2, UserMinus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createProjectInvite,
  getProject,
  getProjectInvites,
  getProjectMembers,
  getProjects,
  removeProjectMember,
  revokeProjectInvite,
  updateProjectMember,
} from "@/lib/project-api";
import { useAuth } from "@/contexts/auth-context";

const ROLES = ["Admin", "Manager", "Employee", "Viewer"];
const CURRENT_PROJECT_KEY = "zuzuplan.currentProjectId";

function resultMessage(result, fallback) {
  return result?.error?.message || fallback;
}

function formatDate(value) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export default function TeamMembers() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [projectId, setProjectId] = useState(() => localStorage.getItem(CURRENT_PROJECT_KEY) || "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Employee");
  const [message, setMessage] = useState("");

  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => getProjects() });
  const projects = projectsQuery.data?.data || [];

  useEffect(() => {
    if (!projectId && projects[0]?.id) {
      localStorage.setItem(CURRENT_PROJECT_KEY, projects[0].id);
      setProjectId(projects[0].id);
    }
  }, [projectId, projects]);

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  });

  const membersQuery = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => getProjectMembers(projectId),
    enabled: Boolean(projectId),
  });

  const invitesQuery = useQuery({
    queryKey: ["project-invites", projectId],
    queryFn: () => getProjectInvites(projectId),
    enabled: Boolean(projectId),
  });

  const refreshTeam = () => {
    queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
    queryClient.invalidateQueries({ queryKey: ["project-invites", projectId] });
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  };

  const inviteMutation = useMutation({
    mutationFn: () => createProjectInvite(projectId, { email: inviteEmail, role: inviteRole }),
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(resultMessage(result, "Could not send invite."));
        return;
      }
      setInviteEmail("");
      setInviteRole("Employee");
      setMessage("Invite sent.");
      refreshTeam();
    },
    onError: (error) => setMessage(error.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => updateProjectMember(projectId, userId, { role }),
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(resultMessage(result, "Could not update role."));
        return;
      }
      setMessage("Role updated.");
      refreshTeam();
    },
    onError: (error) => setMessage(error.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId) => removeProjectMember(projectId, userId),
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(resultMessage(result, "Could not remove member."));
        return;
      }
      setMessage("Member removed.");
      refreshTeam();
    },
    onError: (error) => setMessage(error.message),
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId) => revokeProjectInvite(projectId, inviteId),
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(resultMessage(result, "Could not revoke invite."));
        return;
      }
      setMessage("Invite revoked.");
      refreshTeam();
    },
    onError: (error) => setMessage(error.message),
  });

  const project = projectQuery.data?.data;
  const members = membersQuery.data?.data || [];
  const invites = invitesQuery.data?.data || [];
  const canManage = project?.currentUserPermissions?.includes("members.manage");
  const pendingInvites = invites.filter((invite) => invite.status === "PENDING");

  function submitInvite(event) {
    event.preventDefault();
    setMessage("");
    if (!inviteEmail.trim()) {
      setMessage("Email is required.");
      return;
    }
    inviteMutation.mutate();
  }

  return (
    <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Team Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">Invite teammates and manage space access.</p>
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
              <CardDescription>{project?.name || "Select a space"} access list.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {members.map((member) => {
                const isOwner = project?.ownerId === member.userId;
                const isCurrentUser = user?.id === member.userId;
                return (
                  <div key={member.id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{member.user?.name || member.user?.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.user?.email}</p>
                    </div>
                    <select
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                      value={member.role}
                      disabled={!canManage || isOwner || updateRoleMutation.isPending}
                      onChange={(event) => updateRoleMutation.mutate({ userId: member.userId, role: event.target.value })}
                    >
                      {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 justify-self-start text-muted-foreground hover:text-destructive sm:justify-self-end"
                      disabled={!canManage || isOwner || isCurrentUser || removeMemberMutation.isPending}
                      onClick={() => removeMemberMutation.mutate(member.userId)}
                      aria-label={`Remove ${member.user?.name || member.user?.email}`}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              {!membersQuery.isLoading && members.length === 0 ? <p className="text-sm text-muted-foreground">No members found.</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Invites</CardTitle>
              <CardDescription>Invitations expire after seven days.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingInvites.map((invite) => (
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
                    disabled={!canManage || revokeInviteMutation.isPending}
                    onClick={() => revokeInviteMutation.mutate(invite.id)}
                    aria-label={`Revoke invite to ${invite.email}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {!invitesQuery.isLoading && pendingInvites.length === 0 ? <p className="text-sm text-muted-foreground">No pending invites.</p> : null}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite Member</CardTitle>
            <CardDescription>Send an email invitation with a space role.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={submitInvite}>
              <Input type="email" placeholder="teammate@example.com" value={inviteEmail} disabled={!canManage} onChange={(event) => setInviteEmail(event.target.value)} />
              <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={inviteRole} disabled={!canManage} onChange={(event) => setInviteRole(event.target.value)}>
                {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <Button className="w-full" disabled={!canManage || inviteMutation.isPending}>
                <MailPlus className="h-4 w-4" />
                {inviteMutation.isPending ? "Sending..." : "Send invite"}
              </Button>
              {!canManage ? <p className="text-xs text-muted-foreground">You can view this team, but cannot manage membership.</p> : null}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
