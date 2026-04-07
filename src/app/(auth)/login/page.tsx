"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
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
import { signIn } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";
import { GoogleIcon } from "@/components/icons/google";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const verified = searchParams.get("verified");
  const redirectTo = searchParams.get("redirect") ?? undefined;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signIn(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    const supabase = createClient();
    const callbackUrl = `${window.location.origin}/auth/callback${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ""}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md overflow-hidden border-0 shadow-xl shadow-black/5 dark:border dark:shadow-none">
      <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />
      <CardHeader className="pb-4 pt-8 text-center">
        <div className="mx-auto mb-4">
          <Image src="/logo.svg" alt="ChannelPulse" width={56} height={56} className="rounded-xl" />
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Welcome back
        </CardTitle>
        <CardDescription className="text-sm">
          Track all your sales channels in one place
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        {reason === "account_scheduled_deletion" && (
          <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Account scheduled for deletion</p>
              <p className="mt-0.5 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                This account is deactivated and pending permanent deletion. Check your email for a recovery link if you&apos;d like to keep your account.
              </p>
            </div>
          </div>
        )}

        {verified === "true" && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
            Email verified! You can now sign in.
          </div>
        )}

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
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Password
              </Label>
              <Link
                href="#"
                className="text-xs font-medium text-amber-500 transition-colors hover:text-amber-600"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              placeholder="Enter password"
              required
              minLength={6}
              autoComplete="current-password"
              className="h-11"
            />
          </div>
          <Button
            type="submit"
            className="h-11 w-full bg-amber-500 text-white shadow-md shadow-amber-500/20 hover:bg-amber-600"
            disabled={loading || googleLoading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign In
          </Button>
          <div className="relative py-1">
            <Separator />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-amber-500 transition-colors hover:text-amber-600"
            >
              Sign up
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
