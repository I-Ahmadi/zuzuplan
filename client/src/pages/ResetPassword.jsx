import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AuthNotice, AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
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
    <AuthShell
      title="Choose a new password"
      description="Create a new password to restore access to your workspace."
      footer={
        <Link
          to={missingToken ? "/forgot-password" : "/login"}
          className="font-medium text-[#0c66e4] hover:underline"
        >
          {missingToken ? "Request a new reset link" : "Back to login"}
        </Link>
      }
    >
          {missingToken ? (
            <AuthNotice>
              This reset link is missing a token. Please request a new password reset email.
            </AuthNotice>
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
                <AuthNotice>{error}</AuthNotice>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-[#172b4d]">New password</Label>
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
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-[#172b4d]">Confirm password</Label>
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
    </AuthShell>
  );
}
