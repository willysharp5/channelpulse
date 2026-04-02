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
  const canSync = platform === "shopify" && !disabled;

  async function onSync() {
    if (!canSync || loading) return;
    setLoading(true);
    try {
      await fetch("/api/sync/shopify", {
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
      title={!canSync && platform !== "shopify" ? "Sync available for Shopify" : undefined}
    >
      <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Syncing…" : "Sync Now"}
    </Button>
  );
}
