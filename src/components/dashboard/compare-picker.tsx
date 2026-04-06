"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { COMPARE_OPTIONS, type CompareMode } from "@/lib/comparison";

export function ComparePicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = (searchParams.get("compare") as CompareMode) ?? "previous";

  function setCompare(mode: CompareMode) {
    const params = new URLSearchParams(searchParams.toString());
    if (mode !== "previous") {
      params.set("compare", mode);
    } else {
      params.delete("compare");
    }
    router.push(`/?${params.toString()}`);
  }

  return (
    <div
      className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-1"
      role="tablist"
      aria-label="Comparison period"
    >
      {COMPARE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={current === opt.value}
          title={opt.label}
          onClick={() => setCompare(opt.value)}
          className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-all sm:px-3 ${
            current === opt.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.tabLabel}
        </button>
      ))}
    </div>
  );
}
