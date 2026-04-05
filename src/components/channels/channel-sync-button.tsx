"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useDemo } from "@/contexts/demo-context";

export function ChannelSyncButton({
  channelId,
  platform,
  disabled,
}: {
  channelId: string;
  platform: string;
  disabled?: boolean;
}) {
  const isDemo = useDemo();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supportedPlatforms = ["shopify", "amazon", "etsy", "tiktok"];
  const canSync = supportedPlatforms.includes(platform) && !disabled;

  async function onSync() {
    if (isDemo) {
      toast.message("Sign up to sync your stores", {
        description: "Live sync runs on your connected channels after you sign up.",
      });
      return;
    }
    if (!canSync || loading) return;
    setLoading(true);
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
    } finally {
      setLoading(false);
      router.refresh();
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 text-xs"
      onClick={onSync}
      disabled={!canSync || loading}
      title={!canSync ? "Sync not available for this platform yet" : undefined}
    >
      <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Syncing…" : "Sync Now"}
    </Button>
  );
}
