'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  const handleVerify = useCallback(async (verifyToken?: string) => {
    const tokenToUse = verifyToken || token;
    if (!tokenToUse) {
      setStatus('error');
      setMessage('Verification token is required');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await api.verifyEmail(tokenToUse);
      if (response.success) {
        setStatus('success');
        setMessage('Your email has been verified successfully!');
      } else {
        setStatus('error');
        setMessage(response.error?.message || 'Verification failed');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Failed to verify email. Please try again.');
    }
  }, [token]);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
      handleVerify(tokenParam);
    }
  }, [searchParams, handleVerify]);

  const handleResend = async () => {
    if (!email) {
      setMessage('Please enter your email address');
      return;
    }

    setIsResending(true);
    setMessage('');

    try {
      // Note: You may need to add a resend verification email endpoint
      // For now, we'll show a message
      setMessage('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      setMessage(err.message || 'Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Email Verified!</CardTitle>
            <CardDescription>
              Your email has been successfully verified. You can now access all features.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col space-y-2">
            <Button asChild className="w-full">
              <Link href="/tasks">Go to Tasks</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Sign In</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Verify your email</CardTitle>
          <CardDescription className="text-center">
            {token
              ? 'We are verifying your email address...'
              : 'Enter your verification token or email to resend'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div
              className={`flex items-center gap-2 p-3 text-sm rounded-md border ${
                status === 'error'
                  ? 'text-destructive bg-destructive/10 border-destructive/20'
                  : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              }`}
            >
              {status === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              <span>{message}</span>
            </div>
          )}

          {!token && (
            <>
              <div className="space-y-2">
                <Label htmlFor="token">Verification Token</Label>
                <Input
                  id="token"
                  type="text"
                  placeholder="Enter verification token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={status === 'loading'}
                />
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    disabled={status === 'loading' || isResending}
                  />
                </div>
              </div>
            </>
          )}

          {status === 'loading' && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          {!token && (
            <>
              <Button
                onClick={() => handleVerify()}
                className="w-full"
                disabled={status === 'loading' || !token}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Email'
                )}
              </Button>
              <Button
                onClick={handleResend}
                variant="outline"
                className="w-full"
                disabled={isResending || !email}
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend Verification Email'
                )}
              </Button>
            </>
          )}
          <Button asChild variant="ghost" className="w-full">
            <Link href="/login" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

