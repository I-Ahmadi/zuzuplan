import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { AuthNotice, AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
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
    <AuthShell
      title="Verify your email"
      description="Confirm your email address to activate your account."
      footer={
        <div className="flex flex-col gap-2">
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Back to login</Link>
          </Button>
          {!token ? (
            <Button asChild variant="link" className="w-full text-[#0c66e4]">
              <Link to="/signup">Sign up again</Link>
            </Button>
          ) : null}
        </div>
      }
    >
        <div className="space-y-3">
          {sent && !token && (
            <p className="text-sm leading-5 text-[#44546f]">
              We&apos;ve sent a verification link to your email. Please check your inbox and click the link to verify your account.
            </p>
          )}

          {token && status === "verifying" && (
            <p className="text-sm text-[#44546f]">Verifying your email...</p>
          )}

          {status === "success" && (
            <AuthNotice type="success">
              <p className="font-medium">Email verified successfully!</p>
              <p className="text-sm mt-1">Redirecting you to login...</p>
            </AuthNotice>
          )}

          {status === "error" && (
            <div className="space-y-2">
              <AuthNotice>
                <p className="font-medium">Verification failed</p>
                <p className="text-sm mt-1">
                  {verifyMutation.error?.message || "The link may be invalid or expired."}
                </p>
              </AuthNotice>
              <p className="text-sm text-[#44546f]">
                You can request a new verification email by signing up again or contacting support.
              </p>
            </div>
          )}

          {!token && !sent && (
            <div className="space-y-3">
              <p className="text-sm text-[#44546f]">
                No verification token found. Please use the link from your verification email.
              </p>
              {email && (
                <p className="text-sm text-[#44546f]">
                  Verification was requested for <span className="font-medium text-[#172b4d]">{email}</span>.
                </p>
              )}
              <p className="text-sm text-[#44546f]">
                If you did not receive the email, sign up again with the same account to generate a fresh verification link.
              </p>
            </div>
          )}
        </div>
    </AuthShell>
  );
}
