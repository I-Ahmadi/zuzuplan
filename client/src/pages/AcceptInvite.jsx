import { CheckCircle2, MailWarning } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InlineLoader } from "@/components/ui/loading";
import { acceptProjectInvite, getProjectInvite } from "@/lib/project-api";
import { useAuth } from "@/contexts/auth-context";
import { useApiAction, useApiResource } from "@/lib/api-hooks";

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading, isAuthenticated } = useAuth();

  const inviteQuery = useApiResource(() => getProjectInvite(token), [token], { enabled: Boolean(token) });

  const acceptAction = useApiAction(() => acceptProjectInvite(token), {
    onSuccess: (result) => {
      if (result?.success && result?.data?.id) {
        navigate(`/projects/${result.data.id}/tasks`);
      }
    },
  });

  const invite = inviteQuery.data?.data;
  const error = inviteQuery.data?.error?.message || acceptAction.data?.error?.message || acceptAction.error?.message;
  const inviteEmail = invite?.email?.toLowerCase();
  const currentEmail = user?.email?.toLowerCase();
  const isPending = invite?.status === "PENDING";
  const emailMatches = Boolean(inviteEmail && currentEmail && inviteEmail === currentEmail);
  const canAccept = isAuthenticated && isPending && emailMatches;
  const loginRedirect = `/login?redirect=${encodeURIComponent(`/invites/${token}/accept`)}`;

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-3 py-3 sm:px-4 lg:px-5">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {error ? <MailWarning className="h-5 w-5 text-destructive" /> : <CheckCircle2 className="h-5 w-5 text-primary" />}
            Project Invitation
          </CardTitle>
          <CardDescription>
            {invite ? `You were invited to join ${invite.project?.name || "a project"}.` : "Review and accept your project invitation."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {inviteQuery.isLoading ? <InlineLoader message="Loading invitation details..." /> : null}
          {invite ? (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Project</span>
                <span className="font-medium">{invite.project?.name}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Invite email</span>
                <span className="font-medium">{invite.email}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium">{invite.role}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{invite.status}</span>
              </div>
            </div>
          ) : null}

          {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive">{error}</p> : null}
          {invite && !loading && !isAuthenticated && !error ? (
            <p className="rounded-md border bg-secondary p-3 text-muted-foreground">
              Sign in with {invite.email} to accept this invitation.
            </p>
          ) : null}
          {invite && isAuthenticated && !emailMatches && !error ? (
            <p className="rounded-md border bg-secondary p-3 text-muted-foreground">
              You are signed in as {user?.email}. This invitation was sent to {invite.email}.
            </p>
          ) : null}
          {invite && isAuthenticated && !isPending && !error ? (
            <p className="rounded-md border bg-secondary p-3 text-muted-foreground">
              This invitation is {String(invite.status || "inactive").toLowerCase()} and cannot be accepted.
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            {loading ? (
              <Button className="flex-1" disabled>Checking session...</Button>
            ) : !isAuthenticated ? (
              <Button asChild className="flex-1">
                <Link to={loginRedirect}>Log in to accept</Link>
              </Button>
            ) : (
              <Button className="flex-1" disabled={!canAccept || acceptAction.isPending} onClick={() => acceptAction.run()}>
                {acceptAction.isPending ? "Accepting..." : "Accept invite"}
              </Button>
            )}
            <Button asChild variant="outline" className="flex-1">
              <Link to={isAuthenticated ? "/projects" : "/login"}>Back to projects</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
