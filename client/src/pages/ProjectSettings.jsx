import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Eye,
  FolderKanban,
  Gauge,
  Lock,
  MailPlus,
  RotateCcw,
  Save,
  Settings2,
  Shield,
  Trash2,
  UserMinus,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createProjectInvite,
  deleteProject,
  getProject,
  getProjectInvites,
  getProjectMembers,
  getProjectStats,
  removeProjectMember,
  revokeProjectInvite,
  updateProject,
  updateProjectMember,
} from "@/lib/project-api";
import { getProjectSettingsKey } from "@/lib/storage-keys";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const ROLES = ["Admin", "Manager", "Employee", "Viewer"];
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];
const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private" },
  { value: "public", label: "Public" },
];
const SECTIONS = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "access", label: "Access", icon: Users },
  { id: "workflow", label: "Workflow", icon: Workflow },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "danger", label: "Danger Zone", icon: Trash2 },
];
const DEFAULT_LOCAL_SETTINGS = {
  defaultBoardView: "board",
  defaultPriority: "MEDIUM",
  dueSoonDays: "3",
  autoArchiveDone: false,
  notifyMentions: true,
  notifyAssignments: true,
  notifyDueSoon: true,
  notifyComments: true,
  digestFrequency: "daily",
};

function resultMessage(result, fallback) {
  return result?.error?.message || fallback;
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function toDateInput(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function countText(count, singular, plural = `${singular}s`) {
  const safeCount = Number(count) || 0;
  return `${safeCount} ${safeCount === 1 ? singular : plural}`;
}

function statusTone(status) {
  if (status === "completed") return "bg-[hsl(var(--notion-blue)/0.12)] text-[hsl(var(--notion-blue))]";
  if (status === "archived") return "bg-secondary text-muted-foreground";
  return "bg-[hsl(var(--notion-green)/0.12)] text-[hsl(var(--notion-green))]";
}

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm">
      <span className="min-w-0">
        <span className="block font-medium">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
      <input type="checkbox" className="h-4 w-4 shrink-0" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

export default function ProjectSettings() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("general");
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Employee");
  const [form, setForm] = useState({
    name: "",
    key: "",
    description: "",
    visibility: "private",
    status: "active",
    startDate: "",
    endDate: "",
  });
  const [localSettings, setLocalSettings] = useState(DEFAULT_LOCAL_SETTINGS);

  const localSettingsKey = getProjectSettingsKey(projectId);

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
  const statsQuery = useQuery({
    queryKey: ["project-stats", projectId],
    queryFn: () => getProjectStats(projectId),
    enabled: Boolean(projectId),
  });

  const project = projectQuery.data?.data;
  const members = membersQuery.data?.data || [];
  const invites = invitesQuery.data?.data || [];
  const pendingInvites = invites.filter((invite) => invite.status === "PENDING");
  const stats = statsQuery.data?.data;
  const canUpdate = project?.currentUserPermissions?.includes("project.update");
  const canManageMembers = project?.currentUserPermissions?.includes("members.manage");
  const canDelete = project?.currentUserPermissions?.includes("project.delete");

  useEffect(() => {
    if (!project) return;
    setForm({
      name: project.name || "",
      key: project.key || "",
      description: project.description || "",
      visibility: project.visibility || "private",
      status: project.status || "active",
      startDate: toDateInput(project.startDate),
      endDate: toDateInput(project.endDate),
    });
  }, [project]);

  useEffect(() => {
    if (!localSettingsKey) return;
    try {
      const stored = JSON.parse(localStorage.getItem(localSettingsKey) || "{}");
      setLocalSettings({ ...DEFAULT_LOCAL_SETTINGS, ...stored });
    } catch {
      setLocalSettings(DEFAULT_LOCAL_SETTINGS);
    }
  }, [localSettingsKey]);

  const projectBadge = useMemo(() => {
    const key = form.key || project?.key || "ZP";
    return key.slice(0, 3).toUpperCase();
  }, [form.key, project?.key]);

  function refreshProject() {
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["projects", "sidebar"] });
    queryClient.invalidateQueries({ queryKey: ["project-members", projectId] });
    queryClient.invalidateQueries({ queryKey: ["project-invites", projectId] });
    queryClient.invalidateQueries({ queryKey: ["project-stats", projectId] });
  }

  function saveLocalSettings(nextSettings) {
    setLocalSettings(nextSettings);
    if (localSettingsKey) localStorage.setItem(localSettingsKey, JSON.stringify(nextSettings));
    setMessage("Project preferences saved on this device.");
  }

  const updateMutation = useMutation({
    mutationFn: (payload) => updateProject(projectId, payload),
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(resultMessage(result, "Could not update project."));
        return;
      }
      setMessage("Project settings saved.");
      refreshProject();
    },
    onError: (error) => setMessage(error.message),
  });

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
      refreshProject();
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
      refreshProject();
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
      refreshProject();
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
      refreshProject();
    },
    onError: (error) => setMessage(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject(projectId),
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(resultMessage(result, "Could not delete project."));
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "sidebar"] });
      navigate("/spaces");
    },
    onError: (error) => setMessage(error.message),
  });

  function submitGeneral(event) {
    event.preventDefault();
    setMessage("");
    if (!form.name.trim() || !form.key.trim()) {
      setMessage("Project name and key are required.");
      return;
    }
    updateMutation.mutate({
      name: form.name.trim(),
      key: form.key.trim().toUpperCase(),
      description: form.description.trim(),
      visibility: form.visibility,
      status: form.status,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    });
  }

  function submitInvite(event) {
    event.preventDefault();
    setMessage("");
    if (!inviteEmail.trim()) {
      setMessage("Email is required.");
      return;
    }
    inviteMutation.mutate();
  }

  function archiveProject() {
    const nextStatus = project?.status === "archived" ? "active" : "archived";
    updateMutation.mutate({ status: nextStatus });
  }

  function removeMember(member) {
    removeMemberMutation.mutate(member.userId);
  }

  const loading = projectQuery.isLoading;

  return (
    <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link to="/spaces" className="hover:text-foreground">Spaces</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="truncate">{project?.name || "Project"}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Project Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tune project details, access, workflow defaults, and lifecycle controls.</p>
        </div>
        {message ? (
          <div className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 text-sm">
            <span className="inline-flex min-w-0 items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-[hsl(var(--notion-green))]" />
              <span className="truncate">{message}</span>
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMessage("")} aria-label="Dismiss message">
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Loading project settings...</CardContent>
        </Card>
      ) : !project ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Project not found.</CardContent>
        </Card>
      ) : (
        <div className="grid items-stretch gap-4 xl:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="h-full">
            <Card className="h-full">
              <CardContent className="flex h-full flex-col p-3">
                <div className="flex items-center gap-3 border-b pb-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                    {projectBadge}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{project.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{project.key}</p>
                  </div>
                </div>
                <nav className="mt-3 space-y-1">
                  {SECTIONS.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        className={cn(
                          "flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm transition-colors",
                          activeSection === section.id ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                        onClick={() => setActiveSection(section.id)}
                      >
                        <Icon className="h-4 w-4" />
                        {section.label}
                      </button>
                    );
                  })}
                </nav>
                <div className="mt-auto space-y-2 border-t pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Your role</span>
                    <span className="rounded border px-1.5 py-0.5 text-foreground">{project.currentUserRole || "Viewer"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Status</span>
                    <span className={cn("rounded-md px-2 py-0.5 capitalize", statusTone(project.status))}>{project.status}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          <main className="space-y-4">
            <Card>
              <CardContent className="grid gap-3 p-4 md:grid-cols-4">
                <StatCard icon={ClipboardList} label="Tasks" value={countText(stats?.totalTasks ?? project._count?.tasks, "task")} />
                <StatCard icon={Check} label="Completed" value={countText(stats?.completedTasks, "task")} />
                <StatCard icon={Users} label="Members" value={countText(members.length, "member")} />
                <StatCard icon={Gauge} label="Progress" value={`${stats?.progress ?? project.progress ?? 0}%`} />
              </CardContent>
            </Card>

            {activeSection === "general" ? (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FolderKanban className="h-4 w-4" />
                    General
                  </CardTitle>
                  <CardDescription>Server-backed project identity and lifecycle settings.</CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <form className="space-y-4" onSubmit={submitGeneral}>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
                      <div className="space-y-2">
                        <Label htmlFor="project-name">Project name</Label>
                        <Input id="project-name" value={form.name} disabled={!canUpdate} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="project-key">Key</Label>
                        <Input id="project-key" maxLength={10} value={form.key} disabled={!canUpdate} onChange={(event) => setForm((current) => ({ ...current, key: event.target.value.toUpperCase() }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project-description">Description</Label>
                      <Textarea id="project-description" className="min-h-28" value={form.description} disabled={!canUpdate} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="space-y-2">
                        <Label htmlFor="project-visibility">Visibility</Label>
                        <select id="project-visibility" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.visibility} disabled={!canUpdate} onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value }))}>
                          {VISIBILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="project-status">Status</Label>
                        <select id="project-status" className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.status} disabled={!canUpdate} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                          {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="project-start">Start date</Label>
                        <Input id="project-start" type="date" value={form.startDate} disabled={!canUpdate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="project-end">End date</Label>
                        <Input id="project-end" type="date" value={form.endDate} disabled={!canUpdate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
                      </div>
                    </div>
                    <div className="grid gap-3 border-t pt-4 sm:grid-cols-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Shield className="h-4 w-4" />
                        Owner: {project.owner?.name || project.owner?.email || "Unknown"}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4" />
                        Created {formatDate(project.createdAt)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {project.visibility === "private" ? <Lock className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {project.visibility === "private" ? "Private project" : "Public project"}
                      </div>
                    </div>
                    <Button disabled={!canUpdate || updateMutation.isPending}>
                      <Save className="h-4 w-4" />
                      {updateMutation.isPending ? "Saving..." : "Save general settings"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}

            {activeSection === "access" ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <Card>
                  <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="h-4 w-4" />
                      Members
                    </CardTitle>
                    <CardDescription>Review roles and remove project access.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 p-4">
                    {members.map((member) => {
                      const isOwner = project.ownerId === member.userId;
                      const isCurrentUser = user?.id === member.userId;
                      return (
                        <div key={member.id} className="grid gap-3 rounded-md border p-3 sm:grid-cols-[minmax(0,1fr)_150px_auto] sm:items-center">
                          <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar user={member.user} className="h-9 w-9" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{member.user?.name || member.user?.email}</p>
                              <p className="truncate text-xs text-muted-foreground">{member.user?.email}</p>
                            </div>
                          </div>
                          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={isOwner ? "Admin" : member.role} disabled={!canManageMembers || isOwner || updateRoleMutation.isPending} onChange={(event) => updateRoleMutation.mutate({ userId: member.userId, role: event.target.value })}>
                            {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                          </select>
                          <Button variant="ghost" size="icon" className="h-9 w-9 justify-self-start text-muted-foreground hover:text-destructive sm:justify-self-end" disabled={!canManageMembers || isOwner || isCurrentUser || removeMemberMutation.isPending} onClick={() => removeMember(member)} aria-label={`Remove ${member.user?.name || member.user?.email}`}>
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                    {!membersQuery.isLoading && members.length === 0 ? <p className="text-sm text-muted-foreground">No members found.</p> : null}
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card>
                    <CardHeader className="border-b">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <MailPlus className="h-4 w-4" />
                        Invite
                      </CardTitle>
                      <CardDescription>Invites expire after seven days.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4">
                      <form className="space-y-3" onSubmit={submitInvite}>
                        <Input type="email" placeholder="teammate@example.com" value={inviteEmail} disabled={!canManageMembers} onChange={(event) => setInviteEmail(event.target.value)} />
                        <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={inviteRole} disabled={!canManageMembers} onChange={(event) => setInviteRole(event.target.value)}>
                          {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                        </select>
                        <Button className="w-full" disabled={!canManageMembers || inviteMutation.isPending}>
                          <MailPlus className="h-4 w-4" />
                          {inviteMutation.isPending ? "Sending..." : "Send invite"}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="border-b">
                      <CardTitle className="text-base">Pending Invites</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 p-4">
                      {pendingInvites.map((invite) => (
                        <div key={invite.id} className="rounded-md border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{invite.email}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{invite.role} - expires {formatDate(invite.expiresAt)}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" disabled={!canManageMembers || revokeInviteMutation.isPending} onClick={() => revokeInviteMutation.mutate(invite.id)} aria-label={`Revoke invite to ${invite.email}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {!invitesQuery.isLoading && pendingInvites.length === 0 ? <p className="text-sm text-muted-foreground">No pending invites.</p> : null}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : null}

            {activeSection === "workflow" ? (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Workflow className="h-4 w-4" />
                    Workflow Defaults
                  </CardTitle>
                  <CardDescription>Project-scoped preferences saved on this device until backend fields are added.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Default board view</Label>
                      <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={localSettings.defaultBoardView} onChange={(event) => saveLocalSettings({ ...localSettings, defaultBoardView: event.target.value })}>
                        <option value="board">Board</option>
                        <option value="list">List</option>
                        <option value="backlog">Backlog</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Default priority</Label>
                      <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={localSettings.defaultPriority} onChange={(event) => saveLocalSettings({ ...localSettings, defaultPriority: event.target.value })}>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Due-soon window</Label>
                      <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={localSettings.dueSoonDays} onChange={(event) => saveLocalSettings({ ...localSettings, dueSoonDays: event.target.value })}>
                        <option value="1">1 day</option>
                        <option value="3">3 days</option>
                        <option value="7">7 days</option>
                      </select>
                    </div>
                  </div>
                  <ToggleRow title="Auto-archive completed work" description="Keep completed tasks quieter in repeated project views." checked={localSettings.autoArchiveDone} onChange={(checked) => saveLocalSettings({ ...localSettings, autoArchiveDone: checked })} />
                </CardContent>
              </Card>
            ) : null}

            {activeSection === "notifications" ? (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </CardTitle>
                  <CardDescription>Project-scoped notification preferences for your current browser.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  <ToggleRow title="Mentions" description="Notify me when someone mentions me in this project." checked={localSettings.notifyMentions} onChange={(checked) => saveLocalSettings({ ...localSettings, notifyMentions: checked })} />
                  <ToggleRow title="Assignments" description="Notify me when work is assigned or reassigned to me." checked={localSettings.notifyAssignments} onChange={(checked) => saveLocalSettings({ ...localSettings, notifyAssignments: checked })} />
                  <ToggleRow title="Due soon" description="Notify me before work reaches the due-soon window." checked={localSettings.notifyDueSoon} onChange={(checked) => saveLocalSettings({ ...localSettings, notifyDueSoon: checked })} />
                  <ToggleRow title="Comments" description="Notify me about new comments on work I follow." checked={localSettings.notifyComments} onChange={(checked) => saveLocalSettings({ ...localSettings, notifyComments: checked })} />
                  <div className="space-y-2 pt-1">
                    <Label>Digest frequency</Label>
                    <select className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:max-w-xs" value={localSettings.digestFrequency} onChange={(event) => saveLocalSettings({ ...localSettings, digestFrequency: event.target.value })}>
                      <option value="off">Off</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {activeSection === "danger" ? (
              <Card className="border-destructive/30">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-base text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>Archive, restore, or permanently delete this project.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{project.status === "archived" ? "Restore project" : "Archive project"}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Archived projects stay available but move out of active work.</p>
                    </div>
                    <Button variant="outline" disabled={!canUpdate || updateMutation.isPending} onClick={archiveProject}>
                      {project.status === "archived" ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      {project.status === "archived" ? "Restore" : "Archive"}
                    </Button>
                  </div>
                  <div className="flex flex-col gap-3 rounded-md border border-destructive/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium text-destructive">Delete project</p>
                      <p className="mt-1 text-sm text-muted-foreground">This permanently removes tasks, docs, sprints, comments, and attachment metadata.</p>
                    </div>
                    <Button variant="destructive" disabled={!canDelete} onClick={() => setConfirmDelete(true)}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </main>
        </div>
      )}

      <Dialog open={confirmDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {project?.name}?</DialogTitle>
            <p className="text-sm text-muted-foreground">Type the project key to confirm permanent deletion.</p>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            <Label htmlFor="delete-confirm">Project key</Label>
            <Input id="delete-confirm" value={deleteText} onChange={(event) => setDeleteText(event.target.value.toUpperCase())} placeholder={project?.key} />
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => { setConfirmDelete(false); setDeleteText(""); }}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={deleteText !== project?.key || deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
              <Trash2 className="h-4 w-4" />
              {deleteMutation.isPending ? "Deleting..." : "Delete project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
