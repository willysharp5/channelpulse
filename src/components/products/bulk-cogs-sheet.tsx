"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useDemo } from "@/contexts/demo-context";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productIds: string[];
  onApplied: () => void;
};

export function BulkCogsSheet({ open, onOpenChange, productIds, onApplied }: Props) {
  const isDemo = useDemo();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = productIds.length;

  async function handleSubmit() {
    if (isDemo) {
      toast.message("Sign up to edit COGS", {
        description: "Cost settings are available after you connect your stores.",
      });
      return;
    }
    const num = parseFloat(value);
    if (Number.isNaN(num) || num < 0) {
      setError("Enter a valid cost (0 or greater).");
      return;
    }
    if (productIds.length === 0) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/products/cogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds, cogs: num }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Update failed");
        return;
      }
      onApplied();
      onOpenChange(false);
      setValue("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton
        className={cn("flex w-full flex-col gap-0 border-l bg-background p-0 sm:max-w-lg")}
      >
        <SheetHeader className="border-b border-border px-6 py-5 text-left">
          <SheetTitle className="text-xl font-semibold tracking-tight">Bulk update COGS</SheetTitle>
          <SheetDescription className="text-base text-muted-foreground">
            Set the same cost of goods for {selectedCount} selected product{selectedCount !== 1 ? "s" : ""}.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div className="space-y-2">
            <Label htmlFor="bulk-cogs" className="text-sm font-semibold">
              COGS (per unit)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                id="bulk-cogs"
                type="number"
                step="0.01"
                min={0}
                placeholder="0.00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-11 pl-8"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        </div>

        <SheetFooter className="flex-row gap-3 border-t border-border bg-muted/30 px-6 py-4 sm:justify-end">
          <Button type="button" variant="outline" className="flex-1 sm:flex-none" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700 sm:flex-none"
            disabled={selectedCount === 0 || saving}
            onClick={handleSubmit}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply to selected"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
