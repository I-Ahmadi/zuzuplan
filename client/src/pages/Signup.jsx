import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthNotice, AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { useApiAction } from "@/lib/api-hooks";

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signup } = useAuth();

  const registerAction = useApiAction(signup, {
    onSuccess: () => {
      setName("");
      setEmail("");
      setPassword("");
      navigate("/verify-email?sent=true", { state: { email } });
    },
    onError: (error) => {
      setError(error.message || "Something went wrong");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    registerAction.run({ name, email, password });
  };

  const isLoading = registerAction.isPending;

  return (
    <AuthShell
      title="Create your account"
      description="Start organizing spaces, tasks, teams, and delivery plans."
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-[#0c66e4] hover:underline">
            Log in
          </Link>
        </p>
      }
    >
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <AuthNotice>{error}</AuthNotice>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-semibold text-[#172b4d]">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

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
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
            <p className="text-center text-xs leading-5 text-[#626f86]">
              By creating an account, you agree to use this workspace for collaboration and delivery planning.
            </p>
          </form>
    </AuthShell>
  );
}
