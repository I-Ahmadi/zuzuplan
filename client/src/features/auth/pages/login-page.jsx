import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthNotice, AuthShell } from "@/features/auth/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/context/auth-context";
import { useApiAction } from "@/services/api-hooks";
import { consumeSessionExpiredNotice } from "@/services/auth-session";

function safeInternalRedirect(value) {
  if (!value || typeof value !== "string") return "/home";
  if (!value.startsWith("/") || value.startsWith("//")) return "/home";
  return value;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verified = searchParams.get("verified") === "true";
  const reset = searchParams.get("reset") === "true";
  const redirectTo = safeInternalRedirect(searchParams.get("redirect"));
  const [sessionExpired] = useState(() => consumeSessionExpiredNotice());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const loginAction = useApiAction(login, {
    onSuccess: () => {
      navigate(redirectTo, { replace: true });
    },
    onError: (err) => {
      setError(err.message || "Something went wrong");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    loginAction.run({ email, password });
  };

  const isLoading = loginAction.isPending;
  const isUnverifiedError =
    error.toLowerCase().includes("not verified") || error.toLowerCase().includes("verify your email");

  return (
    <AuthShell
      title="Log in to continue"
      description="Access your workspace and continue managing your work."
      footer={
        <>
          <Link to="/forgot-password" className="font-medium text-[#0c66e4] hover:underline">
            Can&apos;t log in?
          </Link>
          <span className="mx-2 text-[#626f86]">.</span>
          <Link to="/signup" className="font-medium text-[#0c66e4] hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="space-y-4">
          {verified && (
            <AuthNotice type="success">Email verified. You can now log in.</AuthNotice>
          )}

          {reset && (
            <AuthNotice type="success">Password reset successfully. You can now log in with your new password.</AuthNotice>
          )}

          {sessionExpired && (
            <AuthNotice>Your session expired. Please sign in again.</AuthNotice>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <AuthNotice>{error}</AuthNotice>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-[#172b4d]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold text-[#172b4d]">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Continue"}
            </Button>
          </form>

          {isUnverifiedError && (
            <p className="mt-3 text-sm text-muted-foreground">
              Use the verification link from your email, or go back to{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                sign up
              </Link>{" "}
              again to request a new one.
            </p>
          )}
        </div>
    </AuthShell>
  );
}
