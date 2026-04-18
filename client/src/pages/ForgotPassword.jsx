import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { forgotPassword } = useAuth();

  const forgotPasswordMutation = useMutation({
    mutationFn: forgotPassword,
    onSuccess: () => {
      setError("");
      setMessage("If that email exists, a password reset link has been sent.");
    },
    onError: (mutationError) => {
      setMessage("");
      setError(mutationError.message || "Unable to send reset email");
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Forgot password</CardTitle>
        </CardHeader>

        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setMessage("");
              setError("");
              forgotPasswordMutation.mutate(email);
            }}
          >
            {message && (
              <div className="p-3 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 rounded-md">
                {message}
              </div>
            )}

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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                disabled={forgotPasswordMutation.isPending}
              />
            </div>

            <Button type="submit" className="w-full" disabled={forgotPasswordMutation.isPending}>
              {forgotPasswordMutation.isPending ? "Sending reset link..." : "Send reset link"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <Link to="/login" className="text-sm text-primary hover:underline">
            Back to login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
