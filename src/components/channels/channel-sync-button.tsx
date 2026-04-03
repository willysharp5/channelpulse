"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ChannelSyncButton({
  channelId,
  platform,
  disabled,
}: {
  channelId: string;
  platform: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supportedPlatforms = ["shopify", "amazon", "etsy", "tiktok"];
  const canSync = supportedPlatforms.includes(platform) && !disabled;

  async function onSync() {
    if (!canSync || loading) return;
    setLoading(true);
    try {
      const endpoint = `/api/sync/${platform}`;
      await fetch(endpoint, {
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
