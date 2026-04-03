"use client";

import { REPORT_ICON_MAP, type SuggestedReportData } from "@/lib/ai/icon-map";
import { BarChart3 } from "lucide-react";

interface WelcomeScreenProps {
  onSelectReport: (prompt: string) => void;
  reports: SuggestedReportData[];
}

export function WelcomeScreen({ onSelectReport, reports }: WelcomeScreenProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="max-w-xl space-y-2 text-center">
        <h2 className="text-xl font-medium tracking-tight">
          What do you want to know?
        </h2>
        <p className="text-sm text-muted-foreground">
          Ask about your sales, revenue, products, or pick a report below.
        </p>
      </div>

      <div className="mt-8 grid w-full max-w-xl grid-cols-2 gap-2">
        {reports.map((report) => {
          const Icon = REPORT_ICON_MAP[report.icon_name] ?? BarChart3;
          return (
            <button
              key={report.id}
              onClick={() => onSelectReport(report.prompt)}
              className="group flex items-start gap-3 rounded-lg border border-transparent bg-muted/50 p-3 text-left transition-colors hover:border-border hover:bg-muted"
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
