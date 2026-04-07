"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Status = "loading" | "success" | "error";

export default function RecoverDeletionPage() {
  return (
    <Suspense>
      <RecoverDeletionInner />
    </Suspense>
  );
}

function RecoverDeletionInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  const recover = useCallback(async (t: string) => {
    try {
      const res = await fetch("/api/account/cancel-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: t }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Recovery failed.");
        return;
      }
      setStatus("success");
      setMessage("Your account has been recovered. You can sign in again.");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again or contact support.");
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No recovery token provided. Check the link in your email.");
      return;
    }
    void recover(token);
  }, [token, recover]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#fafaf9] p-4 dark:bg-gray-950">
      <Card className="w-full max-w-md overflow-hidden border-0 shadow-xl shadow-black/5 dark:border dark:shadow-none">
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />
        <CardHeader className="pb-4 pt-8 text-center">
          <div className="mx-auto mb-4">
            <Image src="/logo.svg" alt="ChannelPulse" width={56} height={56} className="rounded-xl" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Account Recovery
          </CardTitle>
          <CardDescription className="text-sm">
            ChannelPulse account deletion recovery
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <p className="text-sm text-muted-foreground">Recovering your account...</p>
            </div>
          )}
          {status === "success" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <p className="text-center text-sm text-foreground">{message}</p>
              <Link href="/login" className="w-full">
                <Button className="h-11 w-full bg-amber-500 text-white shadow-md shadow-amber-500/20 hover:bg-amber-600">
                  Sign In
                </Button>
              </Link>
            </div>
          )}
          {status === "error" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <XCircle className="h-12 w-12 text-red-500" />
              <p className="text-center text-sm text-destructive">{message}</p>
              <Link href="/login" className="w-full">
                <Button variant="outline" className="h-11 w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
