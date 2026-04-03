"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { DATE_RANGE_PRESETS } from "@/lib/constants";
import {
  parseTableDateRangeSearchParams,
  type TableDateRangeParams,
} from "@/lib/table-date-range";
import { cn } from "@/lib/utils";

function searchParamsToRecord(sp: URLSearchParams): Record<string, string> {
  const r: Record<string, string> = {};
  sp.forEach((v, k) => {
    if (!(k in r)) r[k] = v;
  });
  return r;
}

function formatShortYmd(dateStr: string) {
  return format(new Date(dateStr + "T12:00:00"), "MMM d");
}

function displayLabel(parsed: TableDateRangeParams): string {
  if (parsed.dateFrom && parsed.dateTo) {
    return `${formatShortYmd(parsed.dateFrom)} – ${formatShortYmd(parsed.dateTo)}`;
  }
  if (parsed.range) {
    return DATE_RANGE_PRESETS.find((p) => p.value === parsed.range)?.label ?? parsed.range;
  }
  return "All time";
}

type Props = {
  label: string;
  searchParams: URLSearchParams;
  replaceQuery: (mutate: (n: URLSearchParams) => void) => void;
  /** Show first row “All time” (no date filter). Default true. */
  allowAllTime?: boolean;
  className?: string;
  triggerClassName?: string;
  align?: "start" | "end";
};

export function TableDateRangeFilter({
  label,
  searchParams,
  replaceQuery,
  allowAllTime = true,
  className,
  triggerClassName,
  align = "start",
}: Props) {
  const parsed = useMemo(
    () => parseTableDateRangeSearchParams(searchParamsToRecord(searchParams)),
    [searchParams]
  );
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

  const isCustom = !!(parsed.dateFrom && parsed.dateTo);

  function applyAllTime() {
    replaceQuery((n) => {
      n.set("page", "1");
      n.delete("range");
      n.delete("from");
      n.delete("to");
      n.delete("date");
    });
    setOpen(false);
    setShowCalendar(false);
  }

  function applyPreset(value: (typeof DATE_RANGE_PRESETS)[number]["value"]) {
    replaceQuery((n) => {
      n.set("page", "1");
      n.delete("from");
      n.delete("to");
      n.delete("date");
      n.set("range", value);
    });
    setOpen(false);
    setShowCalendar(false);
  }

  function applyCustom() {
    if (!customRange?.from || !customRange?.to) return;
    replaceQuery((n) => {
      n.set("page", "1");
      n.delete("range");
      n.delete("date");
      n.set("from", format(customRange.from!, "yyyy-MM-dd"));
      n.set("to", format(customRange.to!, "yyyy-MM-dd"));
    });
    setOpen(false);
    setShowCalendar(false);
  }

  return (
    <div className={cn("w-full space-y-1.5 sm:min-w-[min(100%,220px)] sm:max-w-[280px]", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
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
              className={cn(
                "h-9 w-full justify-start gap-2 font-normal shadow-none bg-background",
                triggerClassName
              )}
            />
          }
        >
          <CalendarDays className="h-4 w-4 shrink-0 opacity-70" />
          <span className="truncate text-left">{displayLabel(parsed)}</span>
        </PopoverTrigger>
        <PopoverContent className="w-auto border bg-popover p-0 shadow-md" align={align} sideOffset={6}>
          {!showCalendar ? (
            <div className="flex w-52 flex-col p-2">
              <div className="flex flex-col gap-0.5">
                {allowAllTime ? (
                  <button
                    type="button"
                    onClick={applyAllTime}
                    className={`rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
                      !isCustom && !parsed.range ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground"
                    }`}
                  >
                    All time
                  </button>
                ) : null}
                {DATE_RANGE_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => applyPreset(preset.value)}
                    className={`rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
                      !isCustom && parsed.range === preset.value
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
              <Button type="button" onClick={applyCustom} disabled={!customRange?.from || !customRange?.to} className="w-full" size="sm">
                Apply range
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
