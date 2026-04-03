"use client";

import * as React from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type { DateRange };

type Props = {
  value?: DateRange;
  onChange: (next: DateRange | undefined) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
};

export function DateRangePicker({ value, onChange, className, disabled, placeholder = "Pick dates" }: Props) {
  const [open, setOpen] = React.useState(false);

  const label =
    value?.from && value?.to
      ? `${format(value.from, "MMM d, yyyy")} – ${format(value.to, "MMM d, yyyy")}`
      : value?.from
        ? format(value.from, "MMM d, yyyy")
        : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={<Button variant="outline" className={cn("justify-start gap-2 font-normal", className)} />}
      >
        <CalendarDays className="h-4 w-4 shrink-0 opacity-70" />
        <span className="truncate">{label}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto border bg-popover p-0 shadow-md" align="start" sideOffset={6}>
        <Calendar
          mode="range"
          numberOfMonths={2}
          defaultMonth={value?.from}
          selected={value}
          onSelect={onChange}
          disabled={(d) => d > new Date()}
          className="rounded-md p-2"
        />
        <div className="flex justify-end gap-2 border-t border-border bg-muted/30 px-2 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => {
              onChange(undefined);
              setOpen(false);
            }}
          >
            Clear
          </Button>
          <Button size="sm" className="h-8" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
