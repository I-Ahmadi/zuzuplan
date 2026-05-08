import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";

export default function VerifyEmail() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const sent = searchParams.get("sent") === "true";
  const [status, setStatus] = useState("idle"); // idle | verifying | success | error
  const email = location.state?.email || "";
  const hasVerified = useRef(false);
  const { verifyEmail } = useAuth();

  const verifyMutation = useMutation({
    mutationFn: verifyEmail,
    onSuccess: () => {
      setStatus("success");
      setTimeout(() => navigate("/login?verified=true"), 2000);
    },
    onError: () => {
      setStatus("error");
    },
  });

  useEffect(() => {
    if (token && !hasVerified.current) {
      hasVerified.current = true;
      setStatus("verifying");
      verifyMutation.mutate(token);
    }
  }, [token, verifyMutation]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-3 py-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
          <CardDescription>Confirm your email address to activate your ZuzuPlan account.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {sent && !token && (
            <p className="text-muted-foreground">
              We&apos;ve sent a verification link to your email. Please check your inbox and click the link to verify your account.
            </p>
          )}

          {token && status === "verifying" && (
            <p className="text-muted-foreground">Verifying your email...</p>
          )}

          {status === "success" && (
            <div className="rounded-md bg-green-50 p-3 text-green-600">
              <p className="font-medium">Email verified successfully!</p>
              <p className="text-sm mt-1">Redirecting you to login...</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-2">
              <div className="rounded-md bg-red-50 p-3 text-red-600">
                <p className="font-medium">Verification failed</p>
                <p className="text-sm mt-1">
                  {verifyMutation.error?.message || "The link may be invalid or expired."}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                You can request a new verification email by signing up again or contacting support.
              </p>
            </div>
          )}

          {!token && !sent && (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                No verification token found. Please use the link from your verification email.
              </p>
              {email && (
                <p className="text-sm text-muted-foreground">
                  Verification was requested for <span className="font-medium text-foreground">{email}</span>.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                If you did not receive the email, sign up again with the same account to generate a fresh verification link.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Back to Login</Link>
          </Button>
          {!token && (
            <Button asChild variant="link" className="w-full">
              <Link to="/signup">Sign up again</Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
