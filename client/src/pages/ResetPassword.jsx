import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const { resetPassword } = useAuth();

  const resetPasswordMutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      navigate("/login?reset=true");
    },
    onError: (mutationError) => {
      setError(mutationError.message || "Unable to reset password");
    },
  });

  const missingToken = !token;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-3 py-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>Choose a new password to restore access to your workspace.</CardDescription>
        </CardHeader>

        <CardContent>
          {missingToken ? (
            <div className="rounded-md bg-red-50 p-2.5 text-sm text-red-600">
              This reset link is missing a token. Please request a new password reset email.
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                setError("");

                if (password !== confirmPassword) {
                  setError("Passwords do not match");
                  return;
                }

                resetPasswordMutation.mutate({ token, password });
              }}
            >
              {error && (
                <div className="rounded-md bg-red-50 p-2.5 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                  disabled={resetPasswordMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  minLength={6}
                  required
                  disabled={resetPasswordMutation.isPending}
                />
              </div>

              <Button type="submit" className="w-full" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending ? "Resetting password..." : "Reset password"}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="justify-center">
          <Link
            to={missingToken ? "/forgot-password" : "/login"}
            className="text-sm text-primary hover:underline"
          >
            {missingToken ? "Request a new reset link" : "Back to login"}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
