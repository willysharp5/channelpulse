"use client";

import { useRouter } from "next/navigation";
import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImpersonationBannerProps {
  userName: string;
  userEmail: string;
  userId: string;
}

export function ImpersonationBanner({
  userName,
  userEmail,
  userId,
}: ImpersonationBannerProps) {
  const router = useRouter();

  async function handleEndSession() {
    try {
      const res = await fetch("/api/admin/impersonate/end", { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Impersonation ended");
      router.push(`/admin/users/${userId}`);
      router.refresh();
    } catch {
      toast.error("Failed to end impersonation");
    }
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-amber-400 px-4 py-2 text-amber-950">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Eye className="size-4" />
        <span>
          Viewing as <strong>{userName}</strong>{" "}
          <span className="hidden sm:inline">({userEmail})</span>
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleEndSession}
        className="h-7 border-amber-600 bg-amber-500 text-amber-950 hover:bg-amber-300"
      >
        <X className="mr-1 size-3" />
        End Session
      </Button>
    </div>
  );
}
