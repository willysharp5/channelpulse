"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DATE_RANGE_PRESETS } from "@/lib/constants";
import type { DateRange } from "@/types";

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRange = (searchParams.get("range") as DateRange) ?? "30d";
  const [open, setOpen] = useState(false);

  const selectedPreset = DATE_RANGE_PRESETS.find((p) => p.value === currentRange);

  function handleSelect(value: DateRange) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "30d") {
      params.delete("range");
    } else {
      params.set("range", value);
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="gap-2 text-sm" />}>
        <CalendarDays className="h-4 w-4" />
        {selectedPreset?.label ?? "Last 30 days"}
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="end">
        <div className="flex flex-col gap-0.5">
          {DATE_RANGE_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleSelect(preset.value)}
              className={`rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
                currentRange === preset.value
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
