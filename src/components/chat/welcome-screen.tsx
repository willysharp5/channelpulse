"use client";

import { REPORT_ICON_MAP, type SuggestedReportData } from "@/lib/ai/icon-map";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeScreenProps {
  onSelectReport: (prompt: string) => void;
  reports: SuggestedReportData[];
  /** Report id to spotlight (e.g. landing Remotion “user picks P&amp;L”). */
  emphasizeReportId?: string;
  /** Brief press feedback on this report id. */
  pressedReportId?: string;
  /** Wider copy + grid for large canvases (landing preview). */
  wide?: boolean;
}

export function WelcomeScreen({
  onSelectReport,
  reports,
  emphasizeReportId,
  pressedReportId,
  wide,
}: WelcomeScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className={cn("space-y-2 text-center", wide ? "max-w-3xl" : "max-w-xl")}>
        <h2 className={cn("font-medium tracking-tight", wide ? "text-2xl" : "text-xl")}>
          What do you want to know?
        </h2>
        <p className={cn("text-muted-foreground", wide ? "text-base" : "text-sm")}>
          Ask about your sales, revenue, products, or pick a report below.
        </p>
      </div>

      <div
        className={cn(
          "mt-8 grid w-full grid-cols-2 gap-2",
          wide ? "max-w-3xl gap-3" : "max-w-xl"
        )}
      >
        {reports.map((report) => {
          const Icon = REPORT_ICON_MAP[report.icon_name] ?? BarChart3;
          const emphasized = emphasizeReportId === report.id;
          const pressed = pressedReportId === report.id;
          return (
            <button
              key={report.id}
              onClick={() => onSelectReport(report.prompt)}
              className={cn(
                "group flex items-start gap-3 rounded-lg border border-transparent bg-muted/50 p-3 text-left transition-all duration-150 hover:border-border hover:bg-muted",
                emphasized &&
                  "ring-2 ring-amber-500/80 ring-offset-2 ring-offset-background dark:ring-amber-400/70",
                pressed && "scale-[0.98]"
              )}
            >
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${report.accent_class}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium leading-tight">
                  {report.title}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  {report.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
