"use client";

import { KPICard } from "./kpi-card";
import { mockKPIs } from "@/lib/mock-data";

export function OverviewCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {mockKPIs.map((kpi) => (
        <KPICard key={kpi.title} data={kpi} />
      ))}
    </div>
  );
}
