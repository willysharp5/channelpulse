"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DATE_RANGE_PRESETS } from "@/lib/constants";
import type { DateRange } from "@/types";

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (value: DateRange) => void;
}

export function DateRangePicker({
  value = "30d",
  onChange,
}: DateRangePickerProps) {
  const [selected, setSelected] = useState<DateRange>(value);
  const [open, setOpen] = useState(false);

  const selectedPreset = DATE_RANGE_PRESETS.find((p) => p.value === selected);

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
              onClick={() => {
                setSelected(preset.value);
                onChange?.(preset.value);
                setOpen(false);
              }}
              className={`rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
                selected === preset.value
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
