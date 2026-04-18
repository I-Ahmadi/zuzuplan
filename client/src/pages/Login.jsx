import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verified = searchParams.get("verified") === "true";
  const reset = searchParams.get("reset") === "true";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      navigate("/");
    },
    onError: (err) => {
      setError(err.message || "Something went wrong");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ email, password });
  };

  const isLoading = loginMutation.isPending;
  const isUnverifiedError =
    error.toLowerCase().includes("not verified") || error.toLowerCase().includes("verify your email");

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <Card className="max-w-md w-full mx-4">
        <CardHeader>
          <CardTitle>Login</CardTitle>
        </CardHeader>

        <CardContent>
          {verified && (
            <div className="mb-4 p-3 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 rounded-md">
              Email verified! You can now log in.
            </div>
          )}

          {reset && (
            <div className="mb-4 p-3 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 rounded-md">
              Password reset successfully. You can now log in with your new password.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>

          {isUnverifiedError && (
            <p className="mt-4 text-sm text-muted-foreground">
              Use the verification link from your email, or go back to{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                sign up
              </Link>{" "}
              again to request a new one.
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Link
            to="/forgot-password"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            Forgot password?
          </Link>
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
