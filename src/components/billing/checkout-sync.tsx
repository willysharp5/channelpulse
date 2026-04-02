"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";

interface CheckoutSyncProps {
  currentPlan: string;
}

export function CheckoutSync({ currentPlan }: CheckoutSyncProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"polling" | "synced" | "timeout">("polling");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (currentPlan !== "free") {
      setStatus("synced");
      return;
    }

    const maxAttempts = 15;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/stripe/status");
        const data = await res.json();

        if (data.synced && data.plan !== "free") {
          setStatus("synced");
          clearInterval(interval);
          setTimeout(() => {
            router.refresh();
          }, 500);
          return;
        }

        setAttempts((prev) => {
          if (prev + 1 >= maxAttempts) {
            setStatus("timeout");
            clearInterval(interval);
          }
          return prev + 1;
        });
      } catch {
        // ignore fetch errors, keep polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentPlan, router]);

  if (status === "synced") {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
            Payment successful! Your plan has been activated.
          </p>
        </div>
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Payment received! Your plan is still being activated.
        </p>
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          This can take up to a minute. Refresh the page to check.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/40">
      <Loader2 className="h-5 w-5 animate-spin text-blue-600 shrink-0" />
      <div>
        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
          Payment successful! Activating your plan...
        </p>
        <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
          Syncing with Stripe ({attempts}/15)
        </p>
      </div>
    </div>
  );
}
