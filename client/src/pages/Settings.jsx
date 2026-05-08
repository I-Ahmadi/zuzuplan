import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, KeyRound, Monitor, Save, ShieldCheck, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { setStoredUser } from "@/lib/auth-api";
import { getUserPreferences, updateAvatar, updateCurrentUser, updateUserPreferences } from "@/lib/user-api";
import { useAuth } from "@/contexts/auth-context";

const preferenceDefaults = {
  defaultView: "board",
  density: "comfortable",
  theme: "system",
  profileNote: "",
  emailNotifications: true,
  inAppNotifications: true,
  dueSoonNotifications: true,
};

export default function Setting() {
  const queryClient = useQueryClient();
  const { user, refreshSession } = useAuth();
  const [profile, setProfile] = useState({ name: "", email: "", avatar: "" });
  const [password, setPassword] = useState("");
  const [preferences, setPreferences] = useState(preferenceDefaults);
  const [message, setMessage] = useState("");

  const preferencesQuery = useQuery({
    queryKey: ["user-preferences"],
    queryFn: getUserPreferences,
  });

  useEffect(() => {
    setProfile({
      name: user?.name || "",
      email: user?.email || "",
      avatar: user?.avatar || "",
    });
  }, [user]);

  useEffect(() => {
    if (preferencesQuery.data?.data) {
      setPreferences({ ...preferenceDefaults, ...preferencesQuery.data.data });
    }
  }, [preferencesQuery.data?.data]);

  const initials = useMemo(() => {
    return (profile.name || profile.email || "ZP")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [profile.email, profile.name]);

  const profileMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: profile.name.trim(),
        email: profile.email.trim(),
      };
      if (password.trim()) payload.password = password.trim();
      const result = await updateCurrentUser(payload);
      if (!result.success) throw new Error(result.error?.message || "Could not update profile.");

      if (profile.avatar.trim() !== (user?.avatar || "")) {
        const avatarResult = await updateAvatar(profile.avatar.trim());
        if (!avatarResult.success) throw new Error(avatarResult.error?.message || "Could not update avatar.");
      }

      return result.data;
    },
    onSuccess: async (updatedUser) => {
      setStoredUser(updatedUser);
      setPassword("");
      await refreshSession();
      setMessage("Settings saved.");
    },
    onError: (error) => setMessage(error.message),
  });

  const preferencesMutation = useMutation({
    mutationFn: updateUserPreferences,
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(result?.error?.message || "Could not save preferences.");
        return;
      }
      setPreferences({ ...preferenceDefaults, ...result.data });
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
      setMessage("Preferences saved.");
    },
    onError: (error) => setMessage(error.message),
  });

  function savePreferences(nextPreferences = preferences) {
    setPreferences(nextPreferences);
    preferencesMutation.mutate(nextPreferences);
  }

  return (
    <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your profile and workspace preferences.</p>
        </div>
        {message ? (
          <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            {message}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCircle className="h-4 w-4" />
                Profile
              </CardTitle>
              <CardDescription>Update the identity shown across spaces, tasks, and comments.</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  setMessage("");
                  profileMutation.mutate();
                }}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-secondary text-lg font-semibold">
                    {profile.avatar ? <img src={profile.avatar} alt="" className="h-full w-full object-cover" /> : initials}
                  </div>
                  <div className="grid flex-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatar">Avatar URL</Label>
                  <Input id="avatar" value={profile.avatar} onChange={(event) => setProfile((current) => ({ ...current, avatar: event.target.value }))} placeholder="https://..." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Profile note</Label>
                  <Textarea id="bio" value={preferences.profileNote} onChange={(event) => savePreferences({ ...preferences, profileNote: event.target.value })} placeholder="Role, focus area, or working notes" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">New password</Label>
                  <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Leave blank to keep current password" />
                </div>

                <Button disabled={profileMutation.isPending}>
                  <Save className="h-4 w-4" />
                  {profileMutation.isPending ? "Saving..." : "Save profile"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Monitor className="h-4 w-4" />
                Workspace Defaults
              </CardTitle>
              <CardDescription>Saved preferences for how ZuzuPlan opens for you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Default view</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={preferences.defaultView}
                  onChange={(event) => savePreferences({ ...preferences, defaultView: event.target.value })}
                >
                  <option value="dashboard">Dashboard</option>
                  <option value="spaces">Spaces</option>
                  <option value="board">Board</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Theme</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={preferences.theme}
                  onChange={(event) => savePreferences({ ...preferences, theme: event.target.value })}
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Layout density</Label>
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={preferences.density}
                  onChange={(event) => savePreferences({ ...preferences, density: event.target.value })}
                >
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </div>
              {[
                ["emailNotifications", "Email notifications"],
                ["inAppNotifications", "In-app notifications"],
                ["dueSoonNotifications", "Due-soon reminders"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>{label}</span>
                  <input type="checkbox" checked={Boolean(preferences[key])} onChange={(event) => savePreferences({ ...preferences, [key]: event.target.checked })} />
                </label>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" />
                Account Security
              </CardTitle>
              <CardDescription>Session and verification status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-md border p-3">
                <span>Email verified</span>
                <span className="rounded-md bg-secondary px-2 py-1 text-xs">{user?.emailVerified ? "Yes" : "No"}</span>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <span>Password</span>
                <span className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs">
                  <KeyRound className="h-3 w-3" />
                  Managed
                </span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
