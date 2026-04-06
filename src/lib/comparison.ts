import { getDateRange, type DateParams } from "./date-range-bounds";

export type CompareMode = "previous" | "last_month" | "last_year" | "none";

export const COMPARE_OPTIONS = [
  {
    value: "previous" as const,
    label: "Previous period",
    /** Short label for compact tab UI */
    tabLabel: "Previous",
  },
  {
    value: "last_month" as const,
    label: "Same period last month",
    tabLabel: "Last month",
  },
  {
    value: "last_year" as const,
    label: "Same period last year",
    tabLabel: "Last year",
  },
  {
    value: "none" as const,
    label: "No comparison",
    tabLabel: "Off",
  },
] as const;

export function getComparisonDateRange(
  params: DateParams,
  mode: CompareMode
): { fromStr: string; toStr: string } | null {
  if (mode === "none") return null;

  const { fromStr, toStr } = getDateRange(params);
  const from = new Date(fromStr);
  const to = new Date(toStr);
  const diffDays = Math.ceil((to.getTime() - from.getTime()) / 86400000);

  if (mode === "previous") {
    const prevFrom = new Date(from);
    prevFrom.setDate(prevFrom.getDate() - diffDays);
    return {
      fromStr: prevFrom.toISOString().split("T")[0],
      toStr: fromStr,
    };
  }

  if (mode === "last_month") {
    const prevFrom = new Date(from);
    prevFrom.setMonth(prevFrom.getMonth() - 1);
    const prevTo = new Date(to);
    prevTo.setMonth(prevTo.getMonth() - 1);
    return {
      fromStr: prevFrom.toISOString().split("T")[0],
      toStr: prevTo.toISOString().split("T")[0],
    };
  }

  if (mode === "last_year") {
    const prevFrom = new Date(from);
    prevFrom.setFullYear(prevFrom.getFullYear() - 1);
    const prevTo = new Date(to);
    prevTo.setFullYear(prevTo.getFullYear() - 1);
    return {
      fromStr: prevFrom.toISOString().split("T")[0],
      toStr: prevTo.toISOString().split("T")[0],
    };
  }

  return null;
}

export function getCompareLabel(mode: CompareMode): string {
  return COMPARE_OPTIONS.find((o) => o.value === mode)?.label ?? "Previous period";
}

export function alignComparisonSeries(
  currentSeries: { date: string; total: number }[],
  comparisonSeries: { date: string; total: number }[],
  dayOffset: number
): { date: string; total: number; compTotal: number }[] {
  const compMap = new Map<number, number>();
  for (const point of comparisonSeries) {
    const d = new Date(point.date);
    compMap.set(d.getTime(), point.total);
  }

  return currentSeries.map((point) => {
    const d = new Date(point.date);
    const compDate = new Date(d);
    compDate.setDate(compDate.getDate() - dayOffset);
    const compTotal = compMap.get(compDate.getTime()) ?? 0;
    return { ...point, compTotal };
  });
}
