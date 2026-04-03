"use client";

import { defineComponent, createLibrary, useTriggerAction, type Library } from "@openuidev/react-lang";
import { z } from "zod";
import { TremorAreaChart } from "@/components/tremor/area-chart";
import { TremorBarChart } from "@/components/tremor/bar-chart";
import { TremorDonutChart, type DonutDataItem } from "@/components/tremor/donut-chart";
import { TREMOR_CHART_COLORS } from "@/lib/chartUtils";
import { CHANNEL_CONFIG } from "@/lib/constants";
import type { Platform } from "@/types";

const PALETTE = ["blue", "emerald", "violet", "amber", "cyan", "pink", "lime", "fuchsia", "gray"];

const PLATFORM_TO_PALETTE: Record<string, string> = {
  shopify: "lime",
  amazon: "amber",
  ebay: "pink",
  etsy: "amber",
  tiktok: "pink",
  walmart: "blue",
  facebook: "blue",
  instagram: "pink",
  google: "blue",
  bigcommerce: "gray",
  square: "blue",
  temu: "amber",
};

function platformPaletteKey(name: string): string {
  const key = name.toLowerCase();
  return PLATFORM_TO_PALETTE[key] ?? "";
}

function platformColor(name: string): string {
  const key = name.toLowerCase() as Platform;
  return CHANNEL_CONFIG[key]?.color ?? TREMOR_CHART_COLORS[PALETTE[0]] ?? "#6b7280";
}

// ─── Child: data series ─────────────────────────────────────────
const Series = defineComponent({
  name: "Series",
  description: "A named numeric data series — one value per category label.",
  props: z.object({
    label: z.string(),
    data: z.array(z.number()),
  }),
  component: () => null,
});

// ─── Child: pie/donut slice ─────────────────────────────────────
const Slice = defineComponent({
  name: "Slice",
  description: "A single slice for a donut chart with a label, value, and hex color.",
  props: z.object({
    label: z.string(),
    value: z.number(),
    color: z.string().optional(),
  }),
  component: () => null,
});

// ─── Child: table row ───────────────────────────────────────────
const Row = defineComponent({
  name: "Row",
  description: "A single row of string cell values for a data table.",
  props: z.object({
    cells: z.array(z.string()),
  }),
  component: () => null,
});

// ─── Child: follow-up suggestion ────────────────────────────────
const FollowUp = defineComponent({
  name: "FollowUp",
  description: "A follow-up question the user can click to continue the conversation.",
  props: z.object({
    text: z.string(),
  }),
  component: ({ props }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const triggerAction = useTriggerAction();
    return (
      <button
        onClick={() => triggerAction(props.text, undefined, { type: "followup", params: { text: props.text } })}
        className="rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {props.text}
      </button>
    );
  },
});

// ─── Helper: build recharts-compatible data array ───────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SeriesLike = { props?: { label: string; data: number[] }; label?: string; data?: number[] };

function extractSeries(raw: SeriesLike[]): Array<{ label: string; data: number[] }> {
  return raw.map((s) => ({
    label: s.props?.label ?? s.label ?? "",
    data: s.props?.data ?? s.data ?? [],
  }));
}

function buildChartData(
  labels: string[],
  rawSeries: SeriesLike[] | undefined
): Record<string, unknown>[] {
  const series = extractSeries(rawSeries ?? []);
  return labels.map((label, i) => {
    const point: Record<string, unknown> = { name: label };
    for (const s of series) {
      point[s.label] = s.data[i] ?? 0;
    }
    return point;
  });
}

function seriesCategories(rawSeries: SeriesLike[] | undefined): string[] {
  return extractSeries(rawSeries ?? []).map((s) => s.label);
}

function seriesColors(rawSeries: SeriesLike[] | undefined): string[] {
  const used = new Set<string>();
  return extractSeries(rawSeries ?? []).map((s, i) => {
    const mapped = platformPaletteKey(s.label);
    if (mapped && !used.has(mapped)) {
      used.add(mapped);
      return mapped;
    }
    const fallback = PALETTE[i % PALETTE.length];
    used.add(fallback);
    return fallback;
  });
}

// ─── AreaChart ──────────────────────────────────────────────────
const AreaChartComponent = defineComponent({
  name: "AreaChart",
  description: "Gradient area chart for time-series trends (e.g. revenue over time by channel). Use for continuous data.",
  props: z.object({
    labels: z.array(z.string()),
    series: z.array(Series.ref),
  }),
  component: ({ props }) => {
    if (!props.labels?.length || !props.series?.length) {
      return <div className="h-72 w-full animate-pulse rounded-lg bg-muted" />;
    }
    const data = buildChartData(props.labels, props.series);
    const categories = seriesCategories(props.series);
    const colors = seriesColors(props.series);
    return (
      <TremorAreaChart
        data={data}
        index="name"
        categories={categories}
        colors={colors as any} // eslint-disable-line @typescript-eslint/no-explicit-any
        valueFormatter={(v) => `$${v.toLocaleString()}`}
      />
    );
  },
});

// ─── BarChart ───────────────────────────────────────────────────
const BarChartComponent = defineComponent({
  name: "BarChart",
  description: "Bar chart for comparing discrete categories or periods. Use stacked=true for stacked bars.",
  props: z.object({
    labels: z.array(z.string()),
    series: z.array(Series.ref),
    stacked: z.boolean().optional(),
  }),
  component: ({ props }) => {
    if (!props.labels?.length || !props.series?.length) {
      return <div className="h-72 w-full animate-pulse rounded-lg bg-muted" />;
    }
    const data = buildChartData(props.labels, props.series);
    const categories = seriesCategories(props.series);
    const colors = seriesColors(props.series);
    return (
      <TremorBarChart
        data={data}
        index="name"
        categories={categories}
        colors={colors as any} // eslint-disable-line @typescript-eslint/no-explicit-any
        stack={props.stacked}
        valueFormatter={(v) => `$${v.toLocaleString()}`}
      />
    );
  },
});

// ─── DonutChart ─────────────────────────────────────────────────
const DonutChartComponent = defineComponent({
  name: "DonutChart",
  description: "Donut chart for showing proportional breakdown (e.g. revenue share by channel).",
  props: z.object({
    slices: z.array(Slice.ref),
    centerLabel: z.string().optional(),
  }),
  component: ({ props }) => {
    if (!props.slices?.length) {
      return <div className="h-44 w-44 animate-pulse rounded-full bg-muted" />;
    }
    const DONUT_COLORS = [
      "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
      "#06b6d4", "#ec4899", "#84cc16", "#d946ef",
      "#f97316", "#14b8a6", "#6366f1", "#e11d48",
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: DonutDataItem[] = props.slices.map((raw: any, i: number) => {
      const s = raw.props ?? raw;
      const label = s.label ?? "";
      const explicitColor = s.color && s.color.startsWith("#") ? s.color : null;
      const channelHex = CHANNEL_CONFIG[label.toLowerCase() as Platform]?.color;
      return {
        name: label,
        value: s.value ?? 0,
        color: explicitColor || channelHex || DONUT_COLORS[i % DONUT_COLORS.length],
      };
    });
    return (
      <div className="flex items-center gap-6">
        <TremorDonutChart
          data={data}
          label={props.centerLabel ?? "Total"}
          valueFormatter={(v) => `$${v.toLocaleString()}`}
          size={180}
        />
        <div className="flex flex-col gap-2">
          {data.map((d) => {
            const total = data.reduce((s, x) => s + x.value, 0);
            const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
            return (
              <div key={d.name} className="flex items-center gap-2 text-sm">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="ml-auto font-medium tabular-nums">
                  ${d.value.toLocaleString()} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
});

// ─── KPI stat card ──────────────────────────────────────────────
const KPI = defineComponent({
  name: "KPI",
  description: "A single KPI metric with label, formatted value, and percent change (positive=good, negative=bad).",
  props: z.object({
    label: z.string(),
    value: z.string(),
    change: z.number().optional(),
  }),
  component: ({ props }) => (
    <div className="min-w-0 overflow-hidden rounded-lg border bg-card p-3">
      <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {props.label}
      </p>
      <p className="mt-1 truncate text-lg font-bold tabular-nums tracking-tight sm:text-xl">
        {props.value}
      </p>
      {props.change != null && (
        <span
          className={`mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
            props.change >= 0
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-red-500/10 text-red-500"
          }`}
        >
          {props.change >= 0 ? "↑" : "↓"} {Math.abs(props.change).toFixed(1)}%
        </span>
      )}
    </div>
  ),
});

// ─── KPI row ────────────────────────────────────────────────────
const KPIRow = defineComponent({
  name: "KPIRow",
  description: "A horizontal row of KPI cards. Use 3-5 KPIs.",
  props: z.object({
    items: z.array(KPI.ref),
  }),
  component: ({ props, renderNode }) => {
    const count = props.items?.length ?? 0;
    const cols = count <= 3 ? `grid-cols-${count}` : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
    return (
      <div className={`grid gap-2 ${cols}`}>
        {props.items?.map((item, i) => (
          <div key={i} className="min-w-0">{renderNode(item)}</div>
        ))}
      </div>
    );
  },
});

// ─── Data table ─────────────────────────────────────────────────
const DataTable = defineComponent({
  name: "DataTable",
  description: "A data table with column headers and rows of string values.",
  props: z.object({
    headers: z.array(z.string()),
    rows: z.array(Row.ref),
  }),
  component: ({ props }) => {
    if (!props.headers?.length) return null;
    return (
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {props.headers.map((h, i) => (
                <th
                  key={i}
                  className="border-b bg-muted/40 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(props.rows ?? []).map((raw: any, ri: number) => {
              const row = raw.props ?? raw;
              return (
              <tr key={ri} className="border-b last:border-b-0">
                {(row.cells ?? []).map((cell: string, ci: number) => (
                  <td key={ci} className="px-4 py-2.5 tabular-nums">
                    {cell}
                  </td>
                ))}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  },
});

// ─── Card container ─────────────────────────────────────────────
const CardHeader = defineComponent({
  name: "CardHeader",
  description: "A title and optional subtitle for a section or chart card.",
  props: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
  }),
  component: ({ props }) => (
    <div className="mb-3">
      <h3 className="text-sm font-semibold">{props.title}</h3>
      {props.subtitle && (
        <p className="text-xs text-muted-foreground">{props.subtitle}</p>
      )}
    </div>
  ),
});

const ChartCard = defineComponent({
  name: "ChartCard",
  description: "A bordered card wrapper for a chart with an optional header. Put a CardHeader and then a chart inside.",
  props: z.object({
    children: z.array(
      z.union([
        CardHeader.ref,
        AreaChartComponent.ref,
        BarChartComponent.ref,
        DonutChartComponent.ref,
        DataTable.ref,
      ])
    ),
  }),
  component: ({ props, renderNode }) => (
    <div className="min-w-0 overflow-hidden rounded-xl border bg-card p-4">
      {props.children?.map((child, i) => (
        <div key={i} className="min-w-0">{renderNode(child)}</div>
      ))}
    </div>
  ),
});

// ─── Follow-up block ────────────────────────────────────────────
const FollowUpBlock = defineComponent({
  name: "FollowUpBlock",
  description: "A list of clickable follow-up suggestions for the user. Always include 2-4 suggestions after showing data.",
  props: z.object({
    items: z.array(FollowUp.ref),
  }),
  component: ({ props, renderNode }) => (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {props.items?.map((item, i) => (
        <span key={i}>{renderNode(item)}</span>
      ))}
    </div>
  ),
});

// ─── Root: Dashboard layout ─────────────────────────────────────
const Dashboard = defineComponent({
  name: "Dashboard",
  description: "Root layout — a vertical stack of content blocks (KPIs, chart cards, tables, follow-ups).",
  props: z.object({
    children: z.array(
      z.union([
        KPIRow.ref,
        ChartCard.ref,
        DataTable.ref,
        FollowUpBlock.ref,
        CardHeader.ref,
      ])
    ),
  }),
  component: ({ props, renderNode }) => (
    <div className="flex flex-col gap-4">
      {props.children?.map((child, i) => (
        <div key={i}>{renderNode(child)}</div>
      ))}
    </div>
  ),
});

// ─── Assemble library ───────────────────────────────────────────
export const chatLibrary: Library = createLibrary({
  root: "Dashboard",
  components: [
    Dashboard,
    KPIRow,
    KPI,
    ChartCard,
    CardHeader,
    AreaChartComponent,
    BarChartComponent,
    DonutChartComponent,
    DataTable,
    Row,
    Series,
    Slice,
    FollowUpBlock,
    FollowUp,
  ],
  componentGroups: [
    {
      name: "Layout",
      components: ["Dashboard", "ChartCard", "CardHeader"],
      notes: [
        "Always start with Dashboard as root.",
        "Wrap each chart in a ChartCard with a CardHeader.",
      ],
    },
    {
      name: "Metrics",
      components: ["KPIRow", "KPI"],
      notes: ["Put 3-5 KPIs in a KPIRow. Format values with $ and commas."],
    },
    {
      name: "Charts",
      components: ["AreaChart", "BarChart", "DonutChart", "Series", "Slice"],
      notes: [
        "Use AreaChart for time-series trends.",
        "Use BarChart for category comparisons.",
        "Use DonutChart for proportional breakdowns.",
        "Define each data series as a separate Series() or Slice().",
      ],
    },
    {
      name: "Tables",
      components: ["DataTable", "Row"],
      notes: ["Use DataTable for tabular data. Each Row has an array of string cells."],
    },
    {
      name: "Interaction",
      components: ["FollowUpBlock", "FollowUp"],
      notes: ["Always end with a FollowUpBlock containing 2-4 follow-up suggestions."],
    },
  ],
});
