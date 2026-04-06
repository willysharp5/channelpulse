"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CopyInline({ text, className }: { text: string; className?: string }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const multiline = text.includes("\n");

  return (
    <span className={cn("inline-flex max-w-full gap-1", multiline ? "flex-col items-stretch" : "items-center", className)}>
      <span className={cn("flex min-w-0 gap-1", multiline ? "items-start" : "items-center")}>
        <code
          className={cn(
            "min-w-0 rounded bg-muted px-1.5 py-0.5 text-xs",
            multiline && "max-h-32 flex-1 overflow-auto whitespace-pre-wrap break-all text-left font-mono leading-snug"
          )}
        >
          {text}
        </code>
        <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={copy} aria-label="Copy">
          {done ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
        </Button>
      </span>
    </span>
  );
}
