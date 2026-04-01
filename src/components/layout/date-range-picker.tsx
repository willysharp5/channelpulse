"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { DATE_RANGE_PRESETS } from "@/lib/constants";
import type { DateRange } from "@/types";

export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get("range") as DateRange | null;
  const currentFrom = searchParams.get("from");
  const currentTo = searchParams.get("to");
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState<Date | undefined>(
    currentFrom ? new Date(currentFrom) : undefined
  );
  const [customTo, setCustomTo] = useState<Date | undefined>(
    currentTo ? new Date(currentTo) : undefined
  );
  const [showCalendar, setShowCalendar] = useState(false);

  const isCustom = !!(currentFrom && currentTo);
  const selectedPreset = !isCustom
    ? DATE_RANGE_PRESETS.find((p) => p.value === (currentRange ?? "30d"))
    : null;

  const displayLabel = isCustom && currentFrom && currentTo
    ? `${formatShort(currentFrom)} – ${formatShort(currentTo)}`
    : selectedPreset?.label ?? "Last 30 days";

  function formatShort(dateStr: string) {
    return format(new Date(dateStr), "MMM d");
  }

  function handlePresetSelect(value: DateRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    if (value === "30d") {
      params.delete("range");
    } else {
      params.set("range", value);
    }
    router.push(`${pathname}${params.toString() ? `?${params}` : ""}`);
    setOpen(false);
    setShowCalendar(false);
  }

  function handleCustomApply() {
    if (!customFrom || !customTo) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("range");
    params.set("from", format(customFrom, "yyyy-MM-dd"));
    params.set("to", format(customTo, "yyyy-MM-dd"));
    router.push(`${pathname}?${params}`);
    setOpen(false);
    setShowCalendar(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="gap-2 text-sm" />}>
        <CalendarDays className="h-4 w-4" />
        <span className="truncate max-w-[160px]">{displayLabel}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        {!showCalendar ? (
          <div className="p-2 w-48">
            <div className="flex flex-col gap-0.5">
              {DATE_RANGE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetSelect(preset.value)}
                  className={`rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
                    !isCustom && (currentRange ?? "30d") === preset.value
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <Separator className="my-2" />
            <button
              onClick={() => setShowCalendar(true)}
              className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
                isCustom ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground"
              }`}
            >
              Custom Range...
            </button>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Select date range</p>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowCalendar(false)}>
                Back
              </Button>
            </div>
            <div className="flex gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">From</p>
                <Calendar
                  mode="single"
                  selected={customFrom}
                  onSelect={(d) => setCustomFrom(d ?? undefined)}
                  disabled={(date) => date > new Date()}
                  className="rounded-md border"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">To</p>
                <Calendar
                  mode="single"
                  selected={customTo}
                  onSelect={(d) => setCustomTo(d ?? undefined)}
                  disabled={(date) => date > new Date() || (customFrom ? date < customFrom : false)}
                  className="rounded-md border"
                />
              </div>
            </div>
            {customFrom && customTo && (
              <p className="text-xs text-muted-foreground text-center">
                {format(customFrom, "MMM d, yyyy")} – {format(customTo, "MMM d, yyyy")}
              </p>
            )}
            <Button
              onClick={handleCustomApply}
              disabled={!customFrom || !customTo}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
              size="sm"
            >
              Apply Range
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
