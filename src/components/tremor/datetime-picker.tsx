"use client";

import * as React from "react";
import { Time } from "@internationalized/date";
import {
  useDateSegment,
  useTimeField,
  type AriaTimeFieldProps,
  type TimeValue,
} from "@react-aria/datepicker";
import {
  useTimeFieldState,
  type DateFieldState,
  type DateSegment,
} from "@react-stately/datepicker";
import { X } from "lucide-react";
import { RiCalendar2Fill } from "@remixicon/react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import type { Locale } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

function isBrowserLocaleClockType24h() {
  if (typeof window === "undefined") return true;
  const hr = new Intl.DateTimeFormat(navigator.language, {
    hour: "numeric",
  }).format(new Date(2000, 0, 1, 13));
  return Number.isInteger(Number(hr));
}

const focusInput =
  "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

type TimeSegmentProps = { segment: DateSegment; state: DateFieldState };

function TimeSegment({ segment, state }: TimeSegmentProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { segmentProps } = useDateSegment(segment, state, ref);
  if (
    !segment.isEditable &&
    segment.type === "literal" &&
    segment.text !== ":"
  ) {
    return null;
  }
  const isLiteral = segment.type === "literal";
  return (
    <div
      {...segmentProps}
      ref={ref}
      className={cn(
        "relative block appearance-none rounded-md border text-left uppercase tabular-nums shadow-xs transition sm:text-sm",
        "border-border bg-background text-foreground",
        focusInput,
        isLiteral
          ? "!w-fit shrink-0 border-none bg-transparent px-0 text-muted-foreground shadow-none"
          : "min-w-[2.25rem] shrink-0 px-2 py-1.5",
        {
          "border-border bg-muted/50 text-muted-foreground":
            state.isDisabled && segment.text !== ":",
        },
      )}
    >
      {segment.isPlaceholder ? segment.placeholder : segment.text}
    </div>
  );
}

type TimeInputProps = Omit<
  AriaTimeFieldProps<TimeValue>,
  "label" | "shouldForceLeadingZeros" | "description" | "errorMessage"
>;

function TimeInput({ hourCycle, ...props }: TimeInputProps) {
  const innerRef = React.useRef<HTMLDivElement>(null);
  const locale =
    typeof window !== "undefined" ? window.navigator.language : "en-US";
  const state = useTimeFieldState({
    hourCycle,
    locale,
    shouldForceLeadingZeros: true,
    ...props,
  });
  const { fieldProps } = useTimeField(
    {
      ...props,
      hourCycle,
      shouldForceLeadingZeros: true,
    },
    state,
    innerRef,
  );
  return (
    <div
      {...fieldProps}
      ref={innerRef}
      className="group/time-input inline-flex w-auto max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-1"
    >
      {state.segments.map((segment, i) => (
        <TimeSegment key={i} segment={segment} state={state} />
      ))}
    </div>
  );
}

function formatDateLabel(
  date: Date,
  locale: Locale,
  includeTime?: boolean,
): string {
  const usesAmPm = !isBrowserLocaleClockType24h();
  if (includeTime) {
    return usesAmPm
      ? format(date, "dd MMM, yyyy h:mm a", { locale })
      : format(date, "dd MMM, yyyy HH:mm", { locale });
  }
  return format(date, "dd MMM, yyyy", { locale });
}

export type TremorDateTimePickerProps = {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Show clear control (X beside trigger + “Clear” in popover when there is something to reset). */
  showClear?: boolean;
  /** Calendar: disallow dates after this (local). */
  maxDate?: Date;
  align?: "start" | "center" | "end";
};

/**
 * Tremor-style single date + time picker: calendar popover, segment time field (React Aria),
 * Apply / Cancel. Matches the pattern from https://tremor.so/docs/inputs/date-picker
 */
export function TremorDateTimePicker({
  value,
  onChange,
  disabled,
  placeholder = "Select date & time",
  className,
  showClear = true,
  maxDate,
  align = "end",
}: TremorDateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draftDate, setDraftDate] = React.useState<Date | undefined>(value);
  const [month, setMonth] = React.useState<Date | undefined>(value ?? new Date());
  const [time, setTime] = React.useState<TimeValue | null>(
    value
      ? new Time(value.getHours(), value.getMinutes())
      : new Time(0, 0),
  );

  React.useEffect(() => {
    if (!open) return;
    const d = value ? new Date(value.getTime()) : undefined;
    setDraftDate(d);
    setMonth(d ?? new Date());
    setTime(
      value
        ? new Time(value.getHours(), value.getMinutes())
        : new Time(0, 0),
    );
  }, [open, value]);

  /** Calendar day change: keep the same clock time as the current draft (do not reset time). */
  const onDateChange = (d: Date | undefined) => {
    if (d === undefined) {
      setDraftDate(undefined);
      return;
    }
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    setDraftDate((prev) => {
      const next = new Date(y, m, day, 0, 0, 0, 0);
      if (prev && Number.isFinite(prev.getTime())) {
        next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
      } else {
        next.setHours(time?.hour ?? 0, time?.minute ?? 0, 0, 0);
      }
      return next;
    });
  };

  const onTimeChange = (t: TimeValue | null) => {
    setTime(t);
    setDraftDate((prev) => {
      if (!prev) return prev;
      const next = new Date(prev.getTime());
      if (!t) {
        next.setHours(0, 0, 0, 0);
      } else {
        next.setHours(t.hour, t.minute, 0, 0);
      }
      return next;
    });
  };

  const triggerLabel =
    value != null && Number.isFinite(value.getTime())
      ? formatDateLabel(value, enUS, true)
      : null;

  const hasCommittedValue =
    value != null && Number.isFinite(value.getTime());
  const canClearInPopover =
    showClear && (hasCommittedValue || draftDate != null);

  function clearSelection() {
    onChange?.(undefined);
    setDraftDate(undefined);
    setMonth(new Date());
    setTime(new Time(0, 0));
    setOpen(false);
  }

  const onApply = () => {
    onChange?.(draftDate);
    setOpen(false);
  };

  const onCancel = () => {
    setOpen(false);
  };

  return (
    <div className={cn("flex w-full items-stretch gap-1", className)}>
      <div className="min-w-0 flex-1">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            disabled={disabled}
            render={
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full min-w-0 justify-start gap-2 truncate font-normal shadow-none"
              />
            }
          >
            <RiCalendar2Fill className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left">
              {triggerLabel ? (
                triggerLabel
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
          </PopoverTrigger>
      <PopoverContent
        align={align}
        side="bottom"
        sideOffset={8}
        className="z-[300] !w-max min-w-0 max-w-[calc(100vw-1rem)] gap-0 border-border bg-popover p-0 shadow-lg"
      >
        <div className="flex w-max min-w-0 max-w-full flex-col gap-0">
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            selected={draftDate}
            onSelect={onDateChange}
            disabled={maxDate ? (d) => d > maxDate : undefined}
            initialFocus
            className="rounded-md p-1 [--cell-size:--spacing(6.5)]"
          />
          <div className="border-t border-border px-2.5 py-2">
            <p className="mb-1.5 text-center text-xs font-medium text-muted-foreground">
              Time
            </p>
            <div className="flex justify-center">
              <TimeInput
                aria-label="Time"
                onChange={onTimeChange}
                isDisabled={!draftDate}
                value={time}
              />
            </div>
          </div>
          <div className="space-y-1.5 border-t border-border px-2.5 py-2">
            {canClearInPopover ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => clearSelection()}
              >
                <X className="size-3.5 shrink-0" aria-hidden />
                Clear selection
              </Button>
            ) : null}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-8 flex-1"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="h-8 flex-1"
                onClick={onApply}
                disabled={!draftDate}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
      </div>
      {showClear && hasCommittedValue && !disabled ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-10 shrink-0 shadow-xs"
          aria-label="Clear date and time"
          onClick={(e) => {
            e.preventDefault();
            clearSelection();
          }}
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
