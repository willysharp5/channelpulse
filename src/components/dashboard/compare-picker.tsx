"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { GitCompareArrows } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMPARE_OPTIONS, type CompareMode } from "@/lib/comparison";

const LABEL_TO_VALUE = new Map(COMPARE_OPTIONS.map((o) => [o.label, o.value]));
const VALUE_TO_LABEL = new Map(COMPARE_OPTIONS.map((o) => [o.value, o.label]));

export function ComparePicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentValue = (searchParams.get("compare") as CompareMode) ?? "previous";
  const currentLabel = VALUE_TO_LABEL.get(currentValue) ?? "Previous period";

  function handleChange(label: string | null) {
    if (!label) return;
    const value = LABEL_TO_VALUE.get(label) ?? "previous";
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "previous") {
      params.set("compare", value);
    } else {
      params.delete("compare");
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <GitCompareArrows className="size-3.5 text-muted-foreground" />
      <Select value={currentLabel} onValueChange={handleChange}>
        <SelectTrigger className="h-8 w-[210px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COMPARE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.label}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
