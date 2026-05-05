/**
 * NigWrite — Signup Form (Client Component)
 * Created by: Wabi The Tech Nurse
 *
 * Registration form with name, email, password, and confirm password.
 * After successful registration, auto signs in and redirects to /.
 */

'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PenTool, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Get error from URL params
  const urlError = searchParams.get('error');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      // Register the user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Registration failed. Please try again.');
        return;
      }

      // Auto sign in after successful registration
      const signInResult = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Registration succeeded but auto-login failed — redirect to login
        router.push('/login');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-0">
      <CardHeader className="text-center space-y-4 pb-2">
        {/* Logo */}
        <div className="flex justify-center">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl overflow-hidden shadow-lg">
              <div className="absolute inset-0 flex">
                <div className="w-[30%] bg-[#008751]" />
                <div className="w-[40%] bg-white" />
                <div className="w-[30%] bg-[#008751]" />
              </div>
              <PenTool className="h-5 w-5 text-[#008751] relative z-10 drop-shadow" strokeWidth={2.5} />
            </div>
          </Link>
        </div>

        <div>
          <CardTitle className="text-2xl font-bold">
            Join <span className="text-[#008751]">NigWrite</span>
          </CardTitle>
          <CardDescription className="mt-1.5">
            Create your account to get started
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {(error || urlError) && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error || 'Authentication failed'}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              autoComplete="name"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-email">Email</Label>
            <Input
              id="signup-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              autoComplete="email"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              type="password"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="new-password"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="new-password"
              className="h-11"
            />
          </div>

          {/* Password requirements */}
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Password requirements:</p>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className={`h-3 w-3 ${password.length >= 8 ? 'text-[#008751]' : 'text-muted-foreground/40'}`} />
              <span>At least 8 characters</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className={`h-3 w-3 ${password === confirmPassword && confirmPassword.length > 0 ? 'text-[#008751]' : 'text-muted-foreground/40'}`} />
              <span>Passwords match</span>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-11 bg-[#008751] hover:bg-[#006b40] text-white font-medium"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-[#008751] hover:text-[#006b40] transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
