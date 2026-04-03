import { defineComponent, createLibrary } from "@openuidev/react-lang";
import { z } from "zod";

const Series = defineComponent({
  name: "Series",
  description: "A named numeric data series — one value per category label.",
  props: z.object({ label: z.string(), data: z.array(z.number()) }),
  component: () => null,
});

const Slice = defineComponent({
  name: "Slice",
  description: "A single slice for a donut chart with label, value, and hex color.",
  props: z.object({ label: z.string(), value: z.number(), color: z.string().optional() }),
  component: () => null,
});

const Row = defineComponent({
  name: "Row",
  description: "A single row of string cell values for a data table.",
  props: z.object({ cells: z.array(z.string()) }),
  component: () => null,
});

const FollowUp = defineComponent({
  name: "FollowUp",
  description: "A follow-up question the user can click.",
  props: z.object({ text: z.string() }),
  component: () => null,
});

const AreaChart = defineComponent({
  name: "AreaChart",
  description: "Gradient area chart for time-series. Use for revenue over time by channel.",
  props: z.object({ labels: z.array(z.string()), series: z.array(Series.ref) }),
  component: () => null,
});

const BarChart = defineComponent({
  name: "BarChart",
  description: "Bar chart for comparing categories.",
  props: z.object({ labels: z.array(z.string()), series: z.array(Series.ref), stacked: z.boolean().optional() }),
  component: () => null,
});

const DonutChart = defineComponent({
  name: "DonutChart",
  description: "Donut chart for proportional breakdown.",
  props: z.object({ slices: z.array(Slice.ref), centerLabel: z.string().optional() }),
  component: () => null,
});

const KPI = defineComponent({
  name: "KPI",
  description: "A single KPI metric with label, formatted value, and percent change.",
  props: z.object({ label: z.string(), value: z.string(), change: z.number().optional() }),
  component: () => null,
});

const KPIRow = defineComponent({
  name: "KPIRow",
  description: "A horizontal row of KPI cards.",
  props: z.object({ items: z.array(KPI.ref) }),
  component: () => null,
});

const DataTable = defineComponent({
  name: "DataTable",
  description: "A data table with column headers and rows.",
  props: z.object({ headers: z.array(z.string()), rows: z.array(Row.ref) }),
  component: () => null,
});

const CardHeader = defineComponent({
  name: "CardHeader",
  description: "Title and subtitle for a chart card.",
  props: z.object({ title: z.string(), subtitle: z.string().optional() }),
  component: () => null,
});

const ChartCard = defineComponent({
  name: "ChartCard",
  description: "A bordered card wrapper for a chart.",
  props: z.object({ children: z.array(z.union([CardHeader.ref, AreaChart.ref, BarChart.ref, DonutChart.ref, DataTable.ref])) }),
  component: () => null,
});

const FollowUpBlock = defineComponent({
  name: "FollowUpBlock",
  description: "List of follow-up suggestions.",
  props: z.object({ items: z.array(FollowUp.ref) }),
  component: () => null,
});

const Dashboard = defineComponent({
  name: "Dashboard",
  description: "Root layout — vertical stack of blocks.",
  props: z.object({ children: z.array(z.union([KPIRow.ref, ChartCard.ref, DataTable.ref, FollowUpBlock.ref, CardHeader.ref])) }),
  component: () => null,
});

const lib = createLibrary({
  root: "Dashboard",
  components: [Dashboard, KPIRow, KPI, ChartCard, CardHeader, AreaChart, BarChart, DonutChart, DataTable, Row, Series, Slice, FollowUpBlock, FollowUp],
});

console.log(lib.prompt());
