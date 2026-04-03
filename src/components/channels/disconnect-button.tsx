"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function DisconnectButton({
  channelId,
  channelName,
}: {
  channelId: string;
  channelName: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDisconnect() {
    if (!confirm(`Disconnect "${channelName}"? You can reconnect later without losing historical data.`)) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/disconnect`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success(`"${channelName}" disconnected`);
      router.refresh();
    } catch {
      toast.error("Failed to disconnect channel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="text-xs"
      onClick={handleDisconnect}
      disabled={loading}
    >
      {loading ? "Disconnecting…" : "Disconnect"}
    </Button>
  );
}
