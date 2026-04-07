"use client";

import { useState } from "react";
import { RiPulseFill } from "@remixicon/react";
import { Loader2, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleResend() {
    setResending(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        await supabase.auth.resend({ type: "signup", email: user.email });
      }
      setResent(true);
    } catch {
      /* ignore */
    } finally {
      setResending(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <Card className="w-full max-w-md overflow-hidden border-0 shadow-xl shadow-black/5 dark:border dark:shadow-none">
      <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />
      <CardHeader className="pb-4 pt-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-amber-500/10">
          <Mail className="h-7 w-7 text-amber-500" />
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight">
          Verify your email
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          We sent a confirmation link to your email address. Click the link to activate your account and access the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-8 pb-8">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          <p className="font-medium">Check your inbox and spam folder</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
            The email comes from noreply@channelpulse.us. It may take a minute to arrive.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleResend}
          disabled={resending || resent}
        >
          {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {resent ? "Email sent — check your inbox" : "Resend confirmation email"}
        </Button>
        <button
          onClick={handleSignOut}
          className="block w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out and use a different account
        </button>
      </CardContent>
    </Card>
  );
}
