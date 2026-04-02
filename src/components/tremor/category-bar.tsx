"use client";

import { cn } from "@/lib/utils";

interface CategoryBarItem {
  label: string;
  value: number;
  color: string;
}

interface CategoryBarProps {
  data: CategoryBarItem[];
  showLabels?: boolean;
  className?: string;
}

export function CategoryBar({ data, showLabels = true, className }: CategoryBarProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
        {data.map((item, i) => {
          const pct = (item.value / total) * 100;
          return (
            <div
              key={item.label}
              className={cn(
                "h-full transition-all",
                i === 0 && "rounded-l-full",
                i === data.length - 1 && "rounded-r-full",
              )}
              style={{ width: `${pct}%`, backgroundColor: item.color }}
            />
          );
        })}
      </div>
      {showLabels && (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {data.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 text-xs">
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium tabular-nums">
                {((item.value / total) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
