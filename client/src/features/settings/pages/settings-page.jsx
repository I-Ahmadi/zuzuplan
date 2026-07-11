import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  Database,
  Download,
  ImagePlus,
  KeyRound,
  Laptop,
  Lock,
  Monitor,
  Save,
  ShieldCheck,
  Trash2,
  UserCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoutConfirmationDialog } from "@/features/auth/components/logout-confirmation-dialog";
import { UserAvatar } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncContent } from "@/components/ui/loading";
import { Textarea } from "@/components/ui/textarea";
import { getRefreshToken, setStoredUser } from "@/services/auth-session";
import {
  getUserPreferences,
  getUserSessions,
  resendVerificationEmail,
  revokeOtherSessions,
  updateAvatar,
  uploadAvatarImage,
  updateCurrentUser,
  updateUserPreferences,
} from "@/features/settings/services/user-service";
import { useAuth } from "@/features/auth/context/auth-context";
import { useSidebar } from "@/stores/sidebar-context";
import { useTheme } from "@/stores/theme-context";
import { useApiAction, useApiResource } from "@/services/api-hooks";
import { cn } from "@/utils/cn";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const preferenceDefaults = {
  defaultView: "home",
  density: "comfortable",
  theme: "system",
  profileNote: "",
  sidebarDefault: "expanded",
  projectSelectorBehavior: "remember",
  rememberLastProject: true,
  emailNotifications: true,
  inAppNotifications: true,
  dueSoonNotifications: true,
  assignmentNotifications: true,
  mentionNotifications: true,
  commentNotifications: true,
  digestFrequency: "daily",
  quietHoursEnabled: false,
  quietHoursStart: "18:00",
  quietHoursEnd: "09:00",
};

const SECTIONS = [
  { id: "profile", label: "Profile", icon: UserCircle },
  { id: "preferences", label: "Preferences", icon: Monitor },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "sessions", label: "Sessions", icon: Laptop },
  { id: "danger", label: "Danger Zone", icon: Trash2 },
];

function preferenceScopeForSection(section) {
  if (section === "notifications") return "notifications";
  if (section === "preferences") return "workspace";
  return "profile";
}

function preferencePayloadForSection(section, values) {
  if (section === "notifications") {
    return {
      emailNotifications: values.emailNotifications,
      inAppNotifications: values.inAppNotifications,
      dueSoonNotifications: values.dueSoonNotifications,
      assignmentNotifications: values.assignmentNotifications,
      mentionNotifications: values.mentionNotifications,
      commentNotifications: values.commentNotifications,
      digestFrequency: values.digestFrequency,
      quietHoursEnabled: values.quietHoursEnabled,
      quietHoursStart: values.quietHoursStart,
      quietHoursEnd: values.quietHoursEnd,
    };
  }

  if (section === "preferences") {
    return {
      defaultView: values.defaultView,
      density: values.density,
      theme: values.theme,
      sidebarDefault: values.sidebarDefault,
      projectSelectorBehavior: values.projectSelectorBehavior,
      rememberLastProject: values.rememberLastProject,
    };
  }

  return { profileNote: values.profileNote };
}

function formatDate(value) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border p-3 text-sm">
      <span className="min-w-0">
        <span className="block font-medium">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
      <input type="checkbox" className="h-4 w-4 shrink-0" checked={Boolean(checked)} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function passwordStrength(password) {
  if (!password) return { label: "No new password", tone: "text-muted-foreground" };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return { label: "Weak", tone: "text-destructive" };
  if (score <= 3) return { label: "Good", tone: "text-[hsl(var(--chart-3))]" };
  return { label: "Strong", tone: "text-[hsl(var(--notion-green))]" };
}

export default function Setting() {
  const navigate = useNavigate();
  const { user, refreshSession, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { setCollapsed } = useSidebar();
  const [activeSection, setActiveSection] = useState("profile");
  const [profile, setProfile] = useState({ name: "", email: "", avatar: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", password: "", confirmPassword: "" });
  const [preferences, setPreferences] = useState(preferenceDefaults);
  const [message, setMessage] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const preferenceScope = preferenceScopeForSection(activeSection);
  const shouldLoadPreferences = ["profile", "preferences", "notifications"].includes(activeSection);

  const preferencesQuery = useApiResource(() => getUserPreferences(preferenceScope), [preferenceScope, shouldLoadPreferences], {
    enabled: shouldLoadPreferences,
    resetOnChange: true,
  });

  async function confirmLogoutAction() {
    if (logoutPending) return;

    setLogoutPending(true);
    try {
      await logout();
    } finally {
      setLogoutPending(false);
      setConfirmLogout(false);
      navigate("/login", { replace: true });
    }
  }
  const sessionsQuery = useApiResource(getUserSessions, [activeSection], {
    enabled: activeSection === "sessions",
    resetOnChange: true,
  });

  useEffect(() => {
    setProfile({
      name: user?.name || "",
      email: user?.email || "",
      avatar: user?.avatar || "",
    });
  }, [user]);

  useEffect(() => {
    window.scrollTo({ left: 0 });
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }, [activeSection]);

  useEffect(() => {
    if (preferencesQuery.data?.data) {
      const nextPreferences = { ...preferenceDefaults, ...preferencesQuery.data.data };
      setPreferences(nextPreferences);
    }
  }, [preferencesQuery.data?.data]);

  const strength = passwordStrength(passwordForm.password);

  const preferencesAction = useApiAction(updateUserPreferences, {
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(result?.error?.message || "Could not save preferences.");
        return;
      }
      const nextPreferences = { ...preferenceDefaults, ...result.data };
      setPreferences(nextPreferences);
      setTheme(nextPreferences.theme);
      setCollapsed(nextPreferences.sidebarDefault === "collapsed");
      preferencesQuery.reload();
      setMessage("Preferences saved.");
    },
    onError: (error) => setMessage(error.message),
  });

  const profileAction = useApiAction(async () => {
      const payload = { name: profile.name.trim() };
      if (profile.email.trim() !== (user?.email || "")) payload.email = profile.email.trim();
      if (passwordForm.password) {
        if (passwordForm.password !== passwordForm.confirmPassword) throw new Error("New passwords do not match.");
        payload.currentPassword = passwordForm.currentPassword;
        payload.password = passwordForm.password;
      }

      const result = await updateCurrentUser(payload);
      if (!result.success) throw new Error(result.error?.message || "Could not update profile.");

      if (profile.avatar.trim() !== (user?.avatar || "")) {
        const avatarResult = await updateAvatar(profile.avatar.trim());
        if (!avatarResult.success) throw new Error(avatarResult.error?.message || "Could not update avatar.");
      }

      const preferenceResult = await updateUserPreferences({ profileNote: preferences.profileNote });
      if (!preferenceResult.success) throw new Error(preferenceResult.error?.message || "Could not save profile note.");

      return result.data;
    }, {
    onSuccess: async (updatedUser) => {
      setStoredUser(updatedUser);
      setPasswordForm({ currentPassword: "", password: "", confirmPassword: "" });
      await refreshSession();
      preferencesQuery.reload();
      setMessage("Profile saved.");
    },
    onError: (error) => setMessage(error.message),
  });

  const resendAction = useApiAction(resendVerificationEmail, {
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(result?.error?.message || "Could not send verification email.");
        return;
      }
      setMessage("Verification email sent.");
    },
    onError: (error) => setMessage(error.message),
  });

  const revokeSessionsAction = useApiAction(() => revokeOtherSessions(getRefreshToken()), {
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(result?.error?.message || "Could not revoke sessions.");
        return;
      }
      sessionsQuery.reload();
      setMessage("Other sessions revoked.");
    },
    onError: (error) => setMessage(error.message),
  });

  async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setMessage("Avatar image must be 2 MB or smaller.");
      return;
    }

    setAvatarUploading(true);
    setMessage("");
    try {
      const result = await uploadAvatarImage(file);
      if (!result?.success) {
        setMessage(result?.error?.message || "Could not upload avatar.");
        return;
      }
      setStoredUser(result.data);
      setProfile((current) => ({ ...current, avatar: result.data?.avatar || "" }));
      await refreshSession();
      setMessage("Avatar uploaded.");
    } catch (error) {
      setMessage(error.message || "Could not upload avatar.");
    } finally {
      setAvatarUploading(false);
    }
  }

  function savePreferences(nextPreferences = preferences) {
    preferencesAction.run(preferencePayloadForSection(activeSection, nextPreferences));
  }

  async function exportProfileData() {
    const preferencesResult = await getUserPreferences("all");
    if (!preferencesResult?.success) {
      setMessage(preferencesResult?.error?.message || "Could not export account data.");
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        emailVerified: user?.emailVerified,
        createdAt: user?.createdAt,
      },
      preferences: preferencesResult.data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "account-data.json";
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Account data exported.");
  }

  const sessions = sessionsQuery.data?.data || [];
  const preferencesReady = !shouldLoadPreferences || (preferencesQuery.hasData && !preferencesQuery.isError);
  const sessionsReady = activeSection !== "sessions" || (sessionsQuery.hasData && !sessionsQuery.isError);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden space-y-3 px-3 py-3 sm:px-4 lg:px-5">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your account, preferences, notifications, and security.</p>
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

      <div className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
        <Card className="min-w-0 max-w-full overflow-hidden">
          <CardContent className="p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <UserAvatar user={profile} fallback="ME" className="h-11 w-11 rounded-md" fallbackClassName="rounded-md bg-secondary text-foreground" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{profile.name || "Your profile"}</p>
                  <p className="truncate text-xs text-muted-foreground">{profile.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded border px-1.5 py-0.5 text-foreground">{user?.emailVerified ? "Verified email" : "Unverified email"}</span>
                <span className="rounded border px-1.5 py-0.5 capitalize text-foreground">{theme} theme</span>
              </div>
            </div>
            <div className="mt-3 border-t">
              <nav className="flex flex-wrap gap-1" aria-label="Settings sections">
                {SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const active = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      className={cn(
                        "flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-sm font-medium transition-colors",
                        active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <Icon className="h-4 w-4" />
                      {section.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </CardContent>
        </Card>

        <main className="min-w-0 max-w-full space-y-4 overflow-x-hidden">
          {shouldLoadPreferences && !preferencesReady ? (
            <AsyncContent query={preferencesQuery} loadingMessage="Loading settings..." />
          ) : null}

          {activeSection === "profile" && preferencesReady ? (
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserCircle className="h-4 w-4" />
                  Profile
                </CardTitle>
                <CardDescription className="break-words">Update the identity shown across projects, tasks, and comments.</CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <form
                  className="min-w-0 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setMessage("");
                    profileAction.run();
                  }}
                >
                  <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start">
                    <UserAvatar user={profile} fallback="ME" className="h-24 w-24 shrink-0 rounded-md" fallbackClassName="rounded-md bg-secondary text-2xl text-foreground" />
                    <div className="grid min-w-0 flex-1 gap-4 md:grid-cols-2">
                      <div className="min-w-0 space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} />
                      </div>
                      <div className="min-w-0 space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} />
                        {profile.email !== (user?.email || "") ? <p className="text-xs text-destructive">Changing your email will require verification again.</p> : null}
                      </div>
                      <div className="min-w-0 space-y-2 md:col-span-2">
                        <Label htmlFor="avatar">Avatar</Label>
                        <div className="flex min-w-0 flex-col gap-2 lg:flex-row">
                          <Input className="min-w-0 lg:flex-1" id="avatar" value={profile.avatar} onChange={(event) => setProfile((current) => ({ ...current, avatar: event.target.value }))} placeholder="Paste image URL or upload an image" />
                          <Button type="button" variant="outline" className="shrink-0" disabled={avatarUploading} asChild>
                            <label htmlFor="avatar-upload" className="cursor-pointer">
                              <ImagePlus className="h-4 w-4" />
                              {avatarUploading ? "Uploading..." : "Upload"}
                            </label>
                          </Button>
                          <Button type="button" variant="outline" className="shrink-0" disabled={!profile.avatar} onClick={() => setProfile((current) => ({ ...current, avatar: "" }))}>
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                        <Input id="avatar-upload" type="file" accept="image/*" className="sr-only" onChange={uploadAvatar} />
                        <p className="text-xs text-muted-foreground">Upload a JPG, PNG, GIF, or WebP image up to 2 MB.</p>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0 space-y-2">
                    <Label htmlFor="bio">Profile note</Label>
                    <Textarea id="bio" className="min-h-24" value={preferences.profileNote} onChange={(event) => setPreferences((current) => ({ ...current, profileNote: event.target.value }))} placeholder="Role, focus area, or working notes" />
                  </div>

                  <Button disabled={profileAction.isPending}>
                    <Save className="h-4 w-4" />
                    {profileAction.isPending ? "Saving..." : "Save profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {activeSection === "preferences" && preferencesReady ? (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Monitor className="h-4 w-4" />
                  Preferences
                </CardTitle>
                <CardDescription>Control how Sprintly opens and feels for your account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Default landing page</Label>
                    <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={preferences.defaultView} onChange={(event) => setPreferences((current) => ({ ...current, defaultView: event.target.value }))}>
                      <option value="home">Home</option>
                      <option value="projects">Projects</option>
                      <option value="tasks">Tasks</option>
                      <option value="people">People</option>
                      <option value="activity">Activity</option>
                      <option value="analytics">Analytics</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={preferences.theme} onChange={(event) => setPreferences((current) => ({ ...current, theme: event.target.value }))}>
                      <option value="system">System</option>
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Layout density</Label>
                    <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={preferences.density} onChange={(event) => setPreferences((current) => ({ ...current, density: event.target.value }))}>
                      <option value="comfortable">Comfortable</option>
                      <option value="compact">Compact</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sidebar default</Label>
                    <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={preferences.sidebarDefault} onChange={(event) => setPreferences((current) => ({ ...current, sidebarDefault: event.target.value }))}>
                      <option value="expanded">Expanded</option>
                      <option value="collapsed">Collapsed</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Project selector</Label>
                    <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={preferences.projectSelectorBehavior} onChange={(event) => setPreferences((current) => ({ ...current, projectSelectorBehavior: event.target.value }))}>
                      <option value="remember">Remember last selected</option>
                      <option value="first">Use first available</option>
                    </select>
                  </div>
                </div>
                <ToggleRow title="Remember last opened project" description="Use your last active project when opening boards and project-specific tools." checked={preferences.rememberLastProject} onChange={(checked) => setPreferences((current) => ({ ...current, rememberLastProject: checked }))} />
                <Button disabled={preferencesAction.isPending} onClick={() => savePreferences()}>
                  <Save className="h-4 w-4" />
                  {preferencesAction.isPending ? "Saving..." : "Save preferences"}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {activeSection === "notifications" && preferencesReady ? (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="h-4 w-4" />
                  Notifications
                </CardTitle>
                <CardDescription>These notification preferences are persisted to your account.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <ToggleRow title="Email notifications" description="Send important updates to your mailbox." checked={preferences.emailNotifications} onChange={(checked) => setPreferences((current) => ({ ...current, emailNotifications: checked }))} />
                <ToggleRow title="In-app notifications" description="Show notifications inside Sprintly." checked={preferences.inAppNotifications} onChange={(checked) => setPreferences((current) => ({ ...current, inAppNotifications: checked }))} />
                <ToggleRow title="Due-soon reminders" description="Remind me before assigned work is due." checked={preferences.dueSoonNotifications} onChange={(checked) => setPreferences((current) => ({ ...current, dueSoonNotifications: checked }))} />
                <ToggleRow title="Assignments" description="Notify me when work is assigned or reassigned to me." checked={preferences.assignmentNotifications} onChange={(checked) => setPreferences((current) => ({ ...current, assignmentNotifications: checked }))} />
                <ToggleRow title="Mentions" description="Notify me when someone mentions me." checked={preferences.mentionNotifications} onChange={(checked) => setPreferences((current) => ({ ...current, mentionNotifications: checked }))} />
                <ToggleRow title="Comments and replies" description="Notify me about replies and comments on work I follow." checked={preferences.commentNotifications} onChange={(checked) => setPreferences((current) => ({ ...current, commentNotifications: checked }))} />
                <div className="grid gap-4 pt-1 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Digest</Label>
                    <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={preferences.digestFrequency} onChange={(event) => setPreferences((current) => ({ ...current, digestFrequency: event.target.value }))}>
                      <option value="off">Off</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quiet hours start</Label>
                    <Input type="time" value={preferences.quietHoursStart} disabled={!preferences.quietHoursEnabled} onChange={(event) => setPreferences((current) => ({ ...current, quietHoursStart: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Quiet hours end</Label>
                    <Input type="time" value={preferences.quietHoursEnd} disabled={!preferences.quietHoursEnabled} onChange={(event) => setPreferences((current) => ({ ...current, quietHoursEnd: event.target.value }))} />
                  </div>
                </div>
                <ToggleRow title="Quiet hours" description="Pause non-critical notifications during the selected time range." checked={preferences.quietHoursEnabled} onChange={(checked) => setPreferences((current) => ({ ...current, quietHoursEnabled: checked }))} />
                <Button disabled={preferencesAction.isPending} onClick={() => savePreferences()}>
                  <Save className="h-4 w-4" />
                  {preferencesAction.isPending ? "Saving..." : "Save notifications"}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {activeSection === "security" ? (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldCheck className="h-4 w-4" />
                  Security
                </CardTitle>
                <CardDescription>Protect your account and verification status.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current password</Label>
                    <Input id="current-password" type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <Input id="new-password" type="password" value={passwordForm.password} onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))} />
                    <p className={cn("text-xs", strength.tone)}>Strength: {strength.label}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <Input id="confirm-password" type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-3 border-t pt-4 sm:grid-cols-3">
                  <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <span>Email verified</span>
                    <span className="rounded-md bg-secondary px-2 py-1 text-xs">{user?.emailVerified ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <span>Password changed</span>
                    <span className="text-xs text-muted-foreground">{formatDate(user?.passwordChangedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <span>Two-factor auth</span>
                    <span className="rounded-md bg-secondary px-2 py-1 text-xs">Planned</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={profileAction.isPending} onClick={() => profileAction.run()}>
                    <KeyRound className="h-4 w-4" />
                    {profileAction.isPending ? "Saving..." : "Change password"}
                  </Button>
                  <Button variant="outline" disabled={user?.emailVerified || resendAction.isPending} onClick={() => resendAction.run()}>
                    <Lock className="h-4 w-4" />
                    {resendAction.isPending ? "Sending..." : "Resend verification"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {activeSection === "sessions" && !sessionsReady ? (
            <AsyncContent query={sessionsQuery} loadingMessage="Loading sessions..." />
          ) : null}

          {activeSection === "sessions" && sessionsReady ? (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Laptop className="h-4 w-4" />
                  Sessions
                </CardTitle>
                <CardDescription>Review active refresh-token sessions and revoke access from other devices.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {sessions.map((session, index) => (
                  <div key={session.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">{index === 0 ? "Recent session" : "Active session"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Created {formatDate(session.createdAt)} - expires {formatDate(session.expiresAt)}</p>
                    </div>
                    <span className="w-fit rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground">Refresh token</span>
                  </div>
                ))}
                {!sessionsQuery.isLoading && sessions.length === 0 ? <p className="text-sm text-muted-foreground">No active sessions found.</p> : null}
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button variant="outline" disabled={revokeSessionsAction.isPending} onClick={() => revokeSessionsAction.run()}>
                    <ShieldCheck className="h-4 w-4" />
                    {revokeSessionsAction.isPending ? "Revoking..." : "Revoke other sessions"}
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmLogout(true)}>
                    <X className="h-4 w-4" />
                    Logout from this device
                  </Button>
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
                <CardDescription>Export account data now. Full account deletion requires ownership transfer support.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">Export account data</p>
                    <p className="mt-1 text-sm text-muted-foreground">Download your profile and settings as a JSON archive.</p>
                  </div>
                  <Button variant="outline" onClick={exportProfileData}>
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
                <div className="flex flex-col gap-3 rounded-md border border-destructive/30 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-destructive">Delete account</p>
                    <p className="mt-1 text-sm text-muted-foreground">Planned after project ownership transfer is available.</p>
                  </div>
                  <Button variant="destructive" disabled>
                    <Database className="h-4 w-4" />
                    Planned
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </main>
      </div>
      <LogoutConfirmationDialog
        open={confirmLogout}
        pending={logoutPending}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={confirmLogoutAction}
      />
    </div>
  );
}
