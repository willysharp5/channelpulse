"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useDemo } from "@/contexts/demo-context";

export function DisconnectButton({
  channelId,
  channelName,
}: {
  channelId: string;
  channelName: string;
}) {
  const isDemo = useDemo();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDisconnect() {
    if (isDemo) {
      toast.message("Sign up to manage channels", {
        description: "Disconnect and other actions are available after you create an account.",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/disconnect`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      toast.success(`"${channelName}" disconnected`);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to disconnect channel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-xs"
        onClick={() => {
          if (isDemo) {
            toast.message("Sign up to manage channels", {
              description: "Disconnect is available after you create an account.",
            });
            return;
          }
          setOpen(true);
        }}
      >
        Disconnect
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Disconnect {channelName}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950">
                <Unplug className="size-5 text-red-500" />
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              This will stop syncing data from <strong>{channelName}</strong>.
              Your historical data will be preserved and you can reconnect anytime.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={loading}
            >
              {loading ? "Disconnecting…" : "Disconnect"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
