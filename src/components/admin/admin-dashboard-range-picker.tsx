"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { DATE_RANGE_PRESETS } from "@/lib/constants";
import type { DateRange as DashboardDateRange } from "@/types";

/** Same presets and URL shape as the main Overview date picker (`range` / `from` / `to`). */
export function AdminDashboardRangePicker() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const currentRange = searchParams.get("range") as DashboardDateRange | null;
  const currentFrom = searchParams.get("from");
  const currentTo = searchParams.get("to");
  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    if (currentFrom && currentTo) {
      setCustomRange({
        from: new Date(currentFrom + "T12:00:00"),
        to: new Date(currentTo + "T12:00:00"),
      });
    } else {
      setCustomRange(undefined);
    }
  }, [open, currentFrom, currentTo]);

  const isCustom = !!(currentFrom && currentTo);
  const selectedPreset = !isCustom ? DATE_RANGE_PRESETS.find((p) => p.value === (currentRange ?? "30d")) : null;

  const displayLabel =
    isCustom && currentFrom && currentTo
      ? `${formatShort(currentFrom)} – ${formatShort(currentTo)}`
      : selectedPreset?.label ?? "Last 30 days";

  function formatShort(dateStr: string) {
    return format(new Date(dateStr + "T12:00:00"), "MMM d");
  }

  function handlePresetSelect(value: DashboardDateRange) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("from");
    params.delete("to");
    if (value === "30d") {
      params.delete("range");
    } else {
      params.set("range", value);
    }
    setOpen(false);
    setShowCalendar(false);
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `/admin?${qs}` : "/admin");
    });
  }

  function handleCustomApply() {
    if (!customRange?.from || !customRange?.to) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("range");
    params.set("from", format(customRange.from, "yyyy-MM-dd"));
    params.set("to", format(customRange.to, "yyyy-MM-dd"));
    setOpen(false);
    setShowCalendar(false);
    startTransition(() => {
      router.push(`/admin?${params}`);
    });
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setShowCalendar(false);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-sm bg-background"
            disabled={isPending}
          />
        }
      >
        <CalendarDays className="h-4 w-4 shrink-0" />
        <span className="truncate max-w-[200px]">{displayLabel}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto border bg-popover p-0 shadow-md" align="start" sideOffset={6}>
        {!showCalendar ? (
          <div className="flex w-52 flex-col p-2">
            <div className="flex flex-col gap-0.5">
              {DATE_RANGE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
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
              type="button"
              onClick={() => setShowCalendar(true)}
              className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
                isCustom ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground"
              }`}
            >
              Custom range…
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-sm font-medium">Select range</p>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowCalendar(false)}>
                Back
              </Button>
            </div>
            <Calendar
              mode="range"
              numberOfMonths={2}
              defaultMonth={customRange?.from}
              selected={customRange}
              onSelect={setCustomRange}
              disabled={(date) => date > new Date()}
              className="rounded-md border border-border bg-background p-1"
            />
            {customRange?.from && customRange?.to ? (
              <p className="px-1 text-center text-xs text-muted-foreground">
                {format(customRange.from, "MMM d, yyyy")} – {format(customRange.to, "MMM d, yyyy")}
              </p>
            ) : null}
            <Button
              type="button"
              onClick={handleCustomApply}
              disabled={!customRange?.from || !customRange?.to}
              className="w-full"
              size="sm"
            >
              Apply range
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
