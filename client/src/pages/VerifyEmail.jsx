import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const sent = searchParams.get("sent") === "true";
  const [status, setStatus] = useState("idle"); // idle | verifying | success | error
  const hasVerified = useRef(false);

  const verifyMutation = useMutation({
    mutationFn: async (verifyToken) => {
      const res = await api("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ token: verifyToken }),
      });
      if (!res.success) {
        throw new Error(res.error?.message || "Verification failed");
      }
      return res;
    },
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
  }, [token]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {sent && !token && (
            <p className="text-muted-foreground">
              We&apos;ve sent a verification link to your email. Please check your inbox and click the link to verify your account.
            </p>
          )}

          {token && status === "verifying" && (
            <p className="text-muted-foreground">Verifying your email...</p>
          )}

          {status === "success" && (
            <div className="p-4 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 rounded-md">
              <p className="font-medium">Email verified successfully!</p>
              <p className="text-sm mt-1">Redirecting you to login...</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-2">
              <div className="p-4 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-md">
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
            <p className="text-muted-foreground">
              No verification token found. Please use the link from your verification email.
            </p>
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
