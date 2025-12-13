'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FolderKanban, CheckCircle2, XCircle, Mail } from 'lucide-react';

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      verifyEmail(token);
    }
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    setStatus('verifying');
    setError('');

    try {
      await api.verifyEmail(token);
      setStatus('success');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to verify email. The link may have expired.');
      setStatus('error');
    }
  };

  const handleResend = async () => {
    // This would require a resend verification email endpoint
    // For now, we'll just show a message
    alert('Please check your email for the verification link. If you need a new one, please contact support.');
  };

  if (status === 'verifying') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md border-2 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Verifying your email...</h2>
                <p className="text-sm text-muted-foreground">
                  Please wait while we verify your email address.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md border-2 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 shadow-lg">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Email verified successfully!</h2>
                <p className="text-sm text-muted-foreground">
                  Your email has been verified. Redirecting to dashboard...
                </p>
              </div>
              <Link href="/dashboard" className="w-full">
                <Button className="w-full">Go to dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md border-2 shadow-xl">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-destructive/10 to-destructive/5 shadow-lg">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Verification failed</h2>
                <p className="text-sm text-muted-foreground">
                  {error || 'The verification link is invalid or has expired.'}
                </p>
              </div>
              <div className="w-full space-y-3">
                <Button onClick={handleResend} className="w-full" variant="outline">
                  <Mail className="mr-2 h-4 w-4" />
                  Resend verification email
                </Button>
                <Link href="/login" className="block w-full">
                  <Button variant="ghost" className="w-full">
                    Back to login
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Initial state - waiting for token
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-4 text-center">
          <Link href="/" className="inline-flex items-center gap-3 transition-transform hover:scale-105">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
              <FolderKanban className="h-7 w-7" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              ZuzuPlan
            </span>
          </Link>
          <div>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50 shadow-lg">
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mt-6 text-3xl font-bold tracking-tight">Verify your email</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Please check your email for the verification link.
            </p>
          </div>
        </div>
        <Card className="border-2 shadow-xl">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Button onClick={handleResend} variant="outline" className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Resend verification email
              </Button>
              <Link href="/login" className="block w-full">
                <Button variant="ghost" className="w-full">Back to login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

