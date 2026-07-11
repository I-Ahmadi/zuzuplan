import { useState } from "react";
import { Link } from "react-router-dom";
import { AuthNotice, AuthShell } from "@/features/auth/components/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/context/auth-context";
import { useApiAction } from "@/services/api-hooks";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { forgotPassword } = useAuth();

  const forgotPasswordAction = useApiAction(forgotPassword, {
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
    <AuthShell
      title="Reset your password"
      description="Enter your email and we will send a secure reset link if the account exists."
      footer={
        <Link to="/login" className="font-medium text-[#0c66e4] hover:underline">
          Back to login
        </Link>
      }
    >
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setMessage("");
              setError("");
              forgotPasswordAction.run(email);
            }}
          >
            {message && (
              <AuthNotice type="success">{message}</AuthNotice>
            )}

            {error && (
              <AuthNotice>{error}</AuthNotice>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold text-[#172b4d]">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                disabled={forgotPasswordAction.isPending}
              />
            </div>

            <Button type="submit" className="w-full" disabled={forgotPasswordAction.isPending}>
              {forgotPasswordAction.isPending ? "Sending reset link..." : "Send reset link"}
            </Button>
          </form>
    </AuthShell>
  );
}
