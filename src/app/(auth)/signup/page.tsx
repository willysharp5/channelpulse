"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { signUp } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/icons/google";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signUp(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md overflow-hidden border-0 shadow-xl shadow-black/5 dark:border dark:shadow-none">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500" />
        <CardHeader className="pb-4 pt-8 text-center">
          <div className="mx-auto mb-4">
            <Image src="/logo.svg" alt="ChannelPulse" width={56} height={56} className="rounded-xl" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Check your email
          </CardTitle>
          <CardDescription className="text-sm">
            We sent you a confirmation link. Click it to activate your account,
            then come back here to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <Link href="/login">
            <Button className="h-11 w-full bg-amber-500 text-white shadow-md shadow-amber-500/20 hover:bg-amber-600">
              Go to Sign In
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md overflow-hidden border-0 shadow-xl shadow-black/5 dark:border dark:shadow-none">
      <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />
      <CardHeader className="pb-4 pt-8 text-center">
        <div className="mx-auto mb-4">
          <Image src="/logo.svg" alt="ChannelPulse" width={56} height={56} className="rounded-xl" />
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Create your account
        </CardTitle>
        <CardDescription className="text-sm">
          Start tracking your multichannel sales in minutes
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        {error && (
          <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="h-11 w-full"
          disabled={googleLoading || loading}
          onClick={handleGoogleSignIn}
        >
          {googleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <GoogleIcon className="mr-2 h-4 w-4" />
          )}
          Continue with Google
        </Button>

        <div className="relative my-6">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
            or
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="businessName" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Business Name
            </Label>
            <Input
              id="businessName"
              name="businessName"
              placeholder="My Ecommerce Store"
              required
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seller@example.com"
              required
              autoComplete="email"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Password
            </Label>
            <PasswordInput
              id="password"
              name="password"
              placeholder="Create a password"
              required
              minLength={6}
              autoComplete="new-password"
              className="h-11"
            />
          </div>
          <Button
            type="submit"
            className="h-11 w-full bg-amber-500 text-white shadow-md shadow-amber-500/20 hover:bg-amber-600"
            disabled={loading || googleLoading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Free plan includes 1 channel and 100 orders/month
          </p>
          <div className="relative py-1">
            <Separator />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-amber-500 transition-colors hover:text-amber-600"
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
