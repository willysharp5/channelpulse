"use client";

import { REPORT_ICON_MAP, type SuggestedReportData } from "@/lib/ai/icon-map";
import { BarChart3 } from "lucide-react";

interface QuickReportsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  reports: SuggestedReportData[];
}

export function QuickReports({ onSelect, disabled, reports }: QuickReportsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {reports.map((report) => {
        const Icon = REPORT_ICON_MAP[report.icon_name] ?? BarChart3;
        return (
          <button
            key={report.id}
            disabled={disabled}
            onClick={() => onSelect(report.prompt)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <Icon className="h-3 w-3" />
            {report.title}
          </button>
        );
      })}
    </div>
  );
}
