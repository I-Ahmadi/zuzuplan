import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, MailWarning } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { acceptProjectInvite, getProjectInvite } from "@/lib/project-api";
import { useAuth } from "@/contexts/auth-context";

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const inviteQuery = useQuery({
    queryKey: ["project-invite", token],
    queryFn: () => getProjectInvite(token),
    enabled: Boolean(token),
  });

  const acceptMutation = useMutation({
    mutationFn: () => acceptProjectInvite(token),
    onSuccess: (result) => {
      if (result?.success && result?.data?.id) {
        navigate(`/spaces/${result.data.id}/issues`);
      }
    },
  });

  const invite = inviteQuery.data?.data;
  const error = inviteQuery.data?.error?.message || acceptMutation.data?.error?.message || acceptMutation.error?.message;
  const canAccept = invite?.status === "PENDING" && user?.email?.toLowerCase() === invite.email?.toLowerCase();

  return (
    <div className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-3 py-3 sm:px-4 lg:px-5">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {error ? <MailWarning className="h-5 w-5 text-destructive" /> : <CheckCircle2 className="h-5 w-5 text-primary" />}
            Space Invitation
          </CardTitle>
          <CardDescription>
            {invite ? `You were invited to join ${invite.project?.name || "a workspace"}.` : "Loading invitation details."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {invite ? (
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Space</span>
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
          {invite && !canAccept && !error ? (
            <p className="rounded-md border bg-secondary p-3 text-muted-foreground">
              Sign in with {invite.email} to accept this invitation.
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" disabled={!canAccept || acceptMutation.isPending} onClick={() => acceptMutation.mutate()}>
              {acceptMutation.isPending ? "Accepting..." : "Accept invite"}
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/spaces">Back to spaces</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
