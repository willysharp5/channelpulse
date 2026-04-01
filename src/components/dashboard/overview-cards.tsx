"use client";

import { KPICard } from "./kpi-card";
import type { KPIData } from "@/types";

interface OverviewCardsProps {
  kpis?: KPIData[];
}

export function OverviewCards({ kpis }: OverviewCardsProps) {
  if (!kpis || kpis.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <KPICard key={kpi.title} data={kpi} />
      ))}
    </div>
  );
}
