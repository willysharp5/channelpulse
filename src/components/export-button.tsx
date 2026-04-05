"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useDemo } from "@/contexts/demo-context";

interface ExportButtonProps {
  endpoint: string;
  label?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  /** When true, show sign-up toast instead of calling the API (public demo). */
  isDemo?: boolean;
}

export function ExportButton({
  endpoint,
  label = "Export CSV",
  variant = "outline",
  size = "sm",
  className,
  isDemo: isDemoProp,
}: ExportButtonProps) {
  const ctxDemo = useDemo();
  const isDemo = isDemoProp ?? ctxDemo;
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    if (isDemo) {
      toast.message("Sign up to export your own data", {
        description: "Exports are available once you connect your stores.",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") ?? "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] ?? "export.csv";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Export downloaded");
    } catch {
      toast.error("Failed to export data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleExport}
      disabled={loading}
    >
      <Download className="mr-1.5 size-3.5" />
      {loading ? "Exporting…" : label}
    </Button>
  );
}
