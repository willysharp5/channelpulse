# OpenUI Custom Chart Components: Complete Technical Guide

> Based on comprehensive research of [openui.com](https://openui.com), the [thesysdev/openui GitHub repo](https://github.com/thesysdev/openui), the `@openuidev/react-lang` API reference, LangChain integration docs, and the Shadcn Chat example.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [How defineComponent Works](#2-how-definecomponent-works)
3. [How Zod Schemas Map to Component Props](#3-how-zod-schemas-map-to-component-props)
4. [Creating a Custom Chart Library (Recharts/Tremor)](#4-creating-a-custom-chart-library-rechartsTremor)
5. [How Prompt Generation Works](#5-how-prompt-generation-works)
6. [How the Renderer Renders Custom Components](#6-how-the-renderer-renders-custom-components)
7. [Streaming Behavior with Custom Components](#7-streaming-behavior-with-custom-components)
8. [Token Cost: OpenUI Lang vs JSON](#8-token-cost-openui-lang-vs-json)
9. [Vercel AI SDK Integration](#9-vercel-ai-sdk-integration)
10. [Best Practices for Chart Components](#10-best-practices-for-chart-components)
11. [Complete Working Example](#11-complete-working-example)

---

## 1. Architecture Overview

OpenUI is a generative UI framework built around four core building blocks:

```
┌─────────────────────────────────────────────────────────┐
│  1. LIBRARY                                             │
│     defineComponent() + createLibrary()                 │
│     → Zod schemas + React renderers                     │
├─────────────────────────────────────────────────────────┤
│  2. PROMPT GENERATOR                                    │
│     library.prompt(options)                              │
│     → System prompt with syntax rules + component sigs  │
├─────────────────────────────────────────────────────────┤
│  3. PARSER                                              │
│     createParser() / createStreamingParser()             │
│     → Parses OpenUI Lang into typed element tree         │
├─────────────────────────────────────────────────────────┤
│  4. RENDERER                                            │
│     <Renderer library={...} response={...} />           │
│     → Maps parsed elements to React components           │
└─────────────────────────────────────────────────────────┘
```

**The flow:**

1. You define your chart components with `defineComponent()` (name, Zod props, description, React renderer)
2. You assemble them with `createLibrary()`
3. You call `library.prompt()` to generate a system prompt — this is sent to the LLM
4. The LLM responds in **OpenUI Lang** (a compact, line-oriented DSL)
5. The `<Renderer>` parses the streamed text and renders your React components progressively

**Key insight:** OpenUI Lang is NOT JSON. It looks like this:

```
root = Dashboard([header, chart])
header = CardHeader("Q4 Revenue", "Year-to-Date Analysis")
chart = BarChart(labels, [s1, s2])
labels = ["Jan", "Feb", "Mar", "Apr"]
s1 = Series("Product A", [10, 20, 30, 40])
s2 = Series("Product B", [5, 15, 25, 35])
```

---

## 2. How defineComponent Works

### Function Signature

```typescript
function defineComponent<T extends z.ZodObject<any>>(config: {
  name: string;              // Component call name in OpenUI Lang
  props: T;                  // Zod schema — key order = positional arg order
  description: string;       // Used in generated system prompt signatures
  component: ComponentRenderer<z.infer<T>>; // React renderer
}): DefinedComponent<T>;
```

### Return Type

```typescript
interface DefinedComponent<T> {
  name: string;
  props: T;
  description: string;
  component: ComponentRenderer<z.infer<T>>;
  ref: z.ZodType<...>;  // Use in parent schemas: z.array(Child.ref)
}
```

### Required Fields

| Field | Purpose |
|-------|---------|
| `name` | The identifier the LLM uses in OpenUI Lang output (e.g., `BarChart(...)`) |
| `props` | `z.object(...)` schema. **Key order defines positional argument order** |
| `description` | Appears in the generated prompt's component signature lines |
| `component` | React function receiving `{ props, renderNode }` |

### The `.ref` Property

Every `DefinedComponent` exposes a `.ref` — a Zod type you use in parent schemas to reference child components:

```typescript
const Series = defineComponent({
  name: "Series",
  props: z.object({ label: z.string(), data: z.array(z.number()) }),
  description: "A data series for charts",
  component: ({ props }) => null, // Rendered by parent
});

const BarChart = defineComponent({
  name: "BarChart",
  props: z.object({
    labels: z.array(z.string()),
    series: z.array(Series.ref),   // ← .ref creates the parent-child link
  }),
  description: "Bar chart with labeled categories",
  component: ({ props, renderNode }) => { /* ... */ },
});
```

---

## 3. How Zod Schemas Map to Component Props

### Positional Argument Mapping

The **order of keys** in your `z.object()` defines the positional argument order in OpenUI Lang. This is the core API contract.

**Schema:**
```typescript
const BarChart = defineComponent({
  name: "BarChart",
  props: z.object({
    labels: z.array(z.string()),   // Position 0
    series: z.array(Series.ref),   // Position 1
    stacked: z.boolean().optional(), // Position 2 (optional, can be omitted)
  }),
  // ...
});
```

**LLM output (OpenUI Lang):**
```
chart = BarChart(labels, [s1, s2], true)
```

**Parsed to React props:**
```json
{
  "labels": ["Jan", "Feb", "Mar"],
  "series": [{ "label": "Revenue", "data": [10, 20, 30] }],
  "stacked": true
}
```

### Critical Rules

1. **Key order is the contract.** Changing key order breaks all existing LLM outputs.
2. **Required props must come before optional props** — trailing optionals can be omitted.
3. **The LLM learns positions from the auto-generated prompt.** If schema and prompt disagree, output will be garbled.
4. Use `z.string()`, `z.number()`, `z.boolean()`, `z.array()`, `z.union()`, `z.object()` for prop types.
5. Use `ChildComponent.ref` for nested component references.

### Supported Types in OpenUI Lang

| Zod Type | OpenUI Lang Syntax | Example |
|----------|-------------------|---------|
| `z.string()` | `"text"` | `"Revenue"` |
| `z.number()` | `123`, `12.5`, `-5` | `42` |
| `z.boolean()` | `true` / `false` | `true` |
| `z.array(z.string())` | `["a", "b"]` | `["Jan", "Feb"]` |
| `z.array(z.number())` | `[1, 2, 3]` | `[10, 20, 30]` |
| `Child.ref` | reference identifier | `s1` |
| `z.array(Child.ref)` | `[ref1, ref2]` | `[s1, s2]` |
| `z.union([A.ref, B.ref])` | either type | context-dependent |
| `z.object({...})` | `{key: val}` | `{variant: "info"}` |
| `null` | `null` | `null` |

---

## 4. Creating a Custom Chart Library (Recharts/Tremor)

### Approach A: Wrapping Recharts

```typescript
// src/lib/chart-library.ts
import { defineComponent, createLibrary } from "@openuidev/react-lang";
import { z } from "zod";
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart as RechartsLineChart, Line,
  PieChart as RechartsPieChart, Pie, Cell,
  AreaChart as RechartsAreaChart, Area,
} from "recharts";

const COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff7300",
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042",
];

// ─── Series (shared child for bar/line/area charts) ──────────

const Series = defineComponent({
  name: "Series",
  description: "A named data series with numeric values, one per category label.",
  props: z.object({
    label: z.string(),
    data: z.array(z.number()),
  }),
  component: () => null, // Rendered by parent chart component
});

// ─── PieSlice (child for pie charts) ─────────────────────────

const PieSlice = defineComponent({
  name: "PieSlice",
  description: "A single slice in a pie chart with a label and numeric value.",
  props: z.object({
    label: z.string(),
    value: z.number(),
  }),
  component: () => null,
});

// ─── BarChart ────────────────────────────────────────────────

const BarChartComponent = defineComponent({
  name: "BarChart",
  description:
    "Vertical bar chart for comparing categories. Use for discrete comparisons.",
  props: z.object({
    labels: z.array(z.string()),
    series: z.array(Series.ref),
    stacked: z.boolean().optional(),
  }),
  component: ({ props }) => {
    const data = props.labels.map((label, i) => {
      const point: Record<string, string | number> = { name: label };
      for (const s of props.series ?? []) {
        point[s.label] = s.data[i] ?? 0;
      }
      return point;
    });

    return (
      <ResponsiveContainer width="100%" height={350}>
        <RechartsBarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          {(props.series ?? []).map((s, i) => (
            <Bar
              key={s.label}
              dataKey={s.label}
              fill={COLORS[i % COLORS.length]}
              stackId={props.stacked ? "stack" : undefined}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    );
  },
});

// ─── LineChart ───────────────────────────────────────────────

const LineChartComponent = defineComponent({
  name: "LineChart",
  description:
    "Line chart for showing trends over time or sequential data points.",
  props: z.object({
    labels: z.array(z.string()),
    series: z.array(Series.ref),
  }),
  component: ({ props }) => {
    const data = props.labels.map((label, i) => {
      const point: Record<string, string | number> = { name: label };
      for (const s of props.series ?? []) {
        point[s.label] = s.data[i] ?? 0;
      }
      return point;
    });

    return (
      <ResponsiveContainer width="100%" height={350}>
        <RechartsLineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          {(props.series ?? []).map((s, i) => (
            <Line
              key={s.label}
              type="monotone"
              dataKey={s.label}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    );
  },
});

// ─── AreaChart ───────────────────────────────────────────────

const AreaChartComponent = defineComponent({
  name: "AreaChart",
  description:
    "Filled area chart for showing volume or cumulative trends over time.",
  props: z.object({
    labels: z.array(z.string()),
    series: z.array(Series.ref),
    stacked: z.boolean().optional(),
  }),
  component: ({ props }) => {
    const data = props.labels.map((label, i) => {
      const point: Record<string, string | number> = { name: label };
      for (const s of props.series ?? []) {
        point[s.label] = s.data[i] ?? 0;
      }
      return point;
    });

    return (
      <ResponsiveContainer width="100%" height={350}>
        <RechartsAreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          {(props.series ?? []).map((s, i) => (
            <Area
              key={s.label}
              type="monotone"
              dataKey={s.label}
              fill={COLORS[i % COLORS.length]}
              stroke={COLORS[i % COLORS.length]}
              fillOpacity={0.3}
              stackId={props.stacked ? "stack" : undefined}
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    );
  },
});

// ─── PieChart ────────────────────────────────────────────────

const PieChartComponent = defineComponent({
  name: "PieChart",
  description:
    "Pie or donut chart for showing proportional distribution of a whole.",
  props: z.object({
    slices: z.array(PieSlice.ref),
    donut: z.boolean().optional(),
  }),
  component: ({ props }) => {
    const data = (props.slices ?? []).map((s) => ({
      name: s.label,
      value: s.value,
    }));

    return (
      <ResponsiveContainer width="100%" height={350}>
        <RechartsPieChart>
          <Tooltip />
          <Legend />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={props.donut ? 60 : 0}
            outerRadius={120}
            label
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>
    );
  },
});

export {
  Series,
  PieSlice,
  BarChartComponent as BarChart,
  LineChartComponent as LineChart,
  AreaChartComponent as AreaChart,
  PieChartComponent as PieChart,
};
```

### Approach B: Wrapping Tremor Charts

```typescript
// src/lib/tremor-chart-library.ts
import { defineComponent, createLibrary } from "@openuidev/react-lang";
import { z } from "zod";
import { BarChart, LineChart, DonutChart, AreaChart } from "@tremor/react";

const Series = defineComponent({
  name: "Series",
  description: "A named data series with numeric values.",
  props: z.object({
    label: z.string(),
    data: z.array(z.number()),
  }),
  component: () => null,
});

const TremorBarChart = defineComponent({
  name: "BarChart",
  description: "Bar chart for comparing categories side-by-side.",
  props: z.object({
    labels: z.array(z.string()),
    series: z.array(Series.ref),
    stacked: z.boolean().optional(),
  }),
  component: ({ props }) => {
    const categories = (props.series ?? []).map((s) => s.label);
    const data = props.labels.map((label, i) => {
      const row: Record<string, string | number> = { name: label };
      for (const s of props.series ?? []) {
        row[s.label] = s.data[i] ?? 0;
      }
      return row;
    });

    return (
      <BarChart
        data={data}
        index="name"
        categories={categories}
        stack={props.stacked}
        className="h-72"
      />
    );
  },
});

const TremorLineChart = defineComponent({
  name: "LineChart",
  description: "Line chart for showing trends over time.",
  props: z.object({
    labels: z.array(z.string()),
    series: z.array(Series.ref),
  }),
  component: ({ props }) => {
    const categories = (props.series ?? []).map((s) => s.label);
    const data = props.labels.map((label, i) => {
      const row: Record<string, string | number> = { name: label };
      for (const s of props.series ?? []) {
        row[s.label] = s.data[i] ?? 0;
      }
      return row;
    });

    return (
      <LineChart
        data={data}
        index="name"
        categories={categories}
        className="h-72"
      />
    );
  },
});

// ... similar for DonutChart, AreaChart

export { Series, TremorBarChart, TremorLineChart };
```

### Assembling the Full Library

```typescript
// src/lib/library.ts
import { createLibrary, defineComponent } from "@openuidev/react-lang";
import { z } from "zod";
import {
  Series, PieSlice, BarChart, LineChart, AreaChart, PieChart,
} from "./chart-library";

// ─── Layout components ──────────────────────────────────────

const ChartCardChildUnion = z.union([
  // Reference all child-capable component types
]);

const TextContent = defineComponent({
  name: "TextContent",
  description: "A block of text content with optional size.",
  props: z.object({
    text: z.string(),
    size: z.enum(["small", "default", "large-heavy"]).optional(),
  }),
  component: ({ props }) => {
    const cls = props.size === "large-heavy" ? "text-2xl font-bold"
      : props.size === "small" ? "text-sm text-muted-foreground"
      : "text-base";
    return <p className={cls}>{props.text}</p>;
  },
});

const CardHeader = defineComponent({
  name: "CardHeader",
  description: "Header for a card with title and optional subtitle.",
  props: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
  }),
  component: ({ props }) => (
    <div className="mb-4">
      <h3 className="text-lg font-semibold">{props.title}</h3>
      {props.subtitle && (
        <p className="text-sm text-muted-foreground">{props.subtitle}</p>
      )}
    </div>
  ),
});

const Card = defineComponent({
  name: "Card",
  description: "A container card that wraps children vertically.",
  props: z.object({
    children: z.array(
      z.union([
        CardHeader.ref,
        TextContent.ref,
        BarChart.ref,
        LineChart.ref,
        AreaChart.ref,
        PieChart.ref,
      ])
    ),
  }),
  component: ({ props, renderNode }) => (
    <div className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
      {renderNode(props.children)}
    </div>
  ),
});

const Stack = defineComponent({
  name: "Stack",
  description: "Flexbox layout container. Stacks children in row or column.",
  props: z.object({
    children: z.array(z.union([Card.ref, TextContent.ref])),
    direction: z.enum(["row", "column"]).optional(),
    gap: z.enum(["s", "m", "l"]).optional(),
  }),
  component: ({ props, renderNode }) => {
    const gapMap = { s: "gap-2", m: "gap-4", l: "gap-6" };
    return (
      <div
        className={`flex ${
          props.direction === "row" ? "flex-row flex-wrap" : "flex-col"
        } ${gapMap[props.gap ?? "m"]}`}
      >
        {renderNode(props.children)}
      </div>
    );
  },
});

// ─── Assemble the library ────────────────────────────────────

export const chartLibrary = createLibrary({
  root: "Stack",
  components: [
    Stack, Card, CardHeader, TextContent,
    Series, PieSlice,
    BarChart, LineChart, AreaChart, PieChart,
  ],
  componentGroups: [
    {
      name: "Layout",
      components: ["Stack", "Card", "CardHeader", "TextContent"],
    },
    {
      name: "Charts",
      components: ["BarChart", "LineChart", "AreaChart", "PieChart", "Series", "PieSlice"],
      notes: [
        "- Use BarChart for discrete category comparisons.",
        "- Use LineChart for trends over time.",
        "- Use AreaChart for cumulative/volume trends.",
        "- Use PieChart for proportional distribution.",
        "- Every chart needs its Series/PieSlice defined as separate references.",
        "- Define labels array and Series references BEFORE the chart that uses them.",
      ],
    },
  ],
});

export const chartPromptOptions = {
  preamble:
    "You are a data visualization assistant. Generate interactive charts and dashboards using OpenUI Lang. Your ENTIRE response must be raw OpenUI Lang — no code fences, no markdown, no prose.",
  additionalRules: [
    "Always use Stack as the root container.",
    "Wrap each chart in a Card with a descriptive CardHeader.",
    "Define data (labels, Series) BEFORE the chart component that references them.",
    "Use hoisting: write root = Stack([...]) first, then define children.",
  ],
  examples: [
    `root = Stack([revenueCard])
revenueCard = Card([header, chart])
header = CardHeader("Monthly Revenue", "Q4 2025")
chart = BarChart(labels, [s1, s2])
labels = ["Oct", "Nov", "Dec"]
s1 = Series("Product A", [45000, 52000, 61000])
s2 = Series("Product B", [32000, 38000, 41000])`,
  ],
};
```

---

## 5. How Prompt Generation Works

### What `library.prompt()` Produces

When you call `chartLibrary.prompt(chartPromptOptions)`, it generates a system prompt containing:

1. **Preamble** — Your custom persona instruction
2. **Syntax rules** — The OpenUI Lang grammar (assignments, types, expressions)
3. **Component signatures** — Auto-generated from your `defineComponent` calls:

```
### Charts
BarChart(labels: string[], series: Series[], stacked?: boolean) — Vertical bar chart for comparing categories.
LineChart(labels: string[], series: Series[]) — Line chart for showing trends over time.
AreaChart(labels: string[], series: Series[], stacked?: boolean) — Filled area chart for volume/cumulative trends.
PieChart(slices: PieSlice[], donut?: boolean) — Pie or donut chart for proportional distribution.
Series(label: string, data: number[]) — A named data series with numeric values.
PieSlice(label: string, value: number) — A single slice in a pie chart.
- Use BarChart for discrete category comparisons.
- Use LineChart for trends over time.
...
```

4. **Hoisting/streaming rules** — Write `root` first, define children afterward
5. **Output constraints** — Must start with `root = ...`
6. **Your examples** — Concrete OpenUI Lang code the LLM can pattern-match

### Generating the Prompt

**Programmatically:**
```typescript
const systemPrompt = chartLibrary.prompt(chartPromptOptions);
```

**CLI (at build time):**
```bash
npx @openuidev/cli generate ./src/lib/library.ts --out src/generated/system-prompt.txt
```

The CLI auto-detects exported `PromptOptions` alongside your library export.

### PromptOptions Interface

```typescript
interface PromptOptions {
  preamble?: string;          // Custom persona/instruction
  additionalRules?: string[]; // Extra constraints for the model
  examples?: string[];        // Sample OpenUI Lang code
}
```

### Why This Matters for Charts

The generated prompt teaches the LLM:
- What chart components exist and their exact argument order
- That `Series` and `PieSlice` are separate components (not inline objects)
- That data must be defined as references before the chart uses them
- The syntax for arrays of numbers and strings

---

## 6. How the Renderer Renders Custom Components

### Basic Usage

```tsx
import { Renderer } from "@openuidev/react-lang";
import { chartLibrary } from "./lib/library";

function ChartDisplay({ content, isStreaming }: {
  content: string | null;
  isStreaming: boolean;
}) {
  return (
    <Renderer
      library={chartLibrary}
      response={content}
      isStreaming={isStreaming}
    />
  );
}
```

### What Happens Under the Hood

1. **Parse** — The `Renderer` feeds the OpenUI Lang text to an internal parser
2. **Resolve** — Each `identifier = Expression` line is parsed into an `ElementNode`:
   ```typescript
   interface ElementNode {
     type: "element";
     typeName: string;        // e.g. "BarChart"
     props: Record<string, unknown>;
     partial: boolean;        // true if still streaming
   }
   ```
3. **Validate** — Props are validated against the Zod schema from your library
4. **Render** — Each `ElementNode` is mapped to the `component` function from its `defineComponent` definition
5. **Recurse** — When a component calls `renderNode(props.children)`, the renderer recursively renders child `ElementNode`s

### The `renderNode` Function

Inside your component, `renderNode` converts parsed sub-trees into React elements:

```typescript
const Card = defineComponent({
  name: "Card",
  props: z.object({
    children: z.array(z.union([CardHeader.ref, BarChart.ref])),
  }),
  component: ({ props, renderNode }) => (
    <div className="card">
      {renderNode(props.children)}  {/* Recursively renders children */}
    </div>
  ),
});
```

### Renderer Props

| Prop | Type | Description |
|------|------|-------------|
| `response` | `string \| null` | Raw OpenUI Lang text |
| `library` | `Library` | Your `createLibrary()` output |
| `isStreaming` | `boolean` | Whether the stream is still in progress |
| `onAction` | `(event: ActionEvent) => void` | Interactive event callback |
| `onStateUpdate` | `(state: Record<string, any>) => void` | Form state changes |
| `initialState` | `Record<string, any>` | Hydrate form state on load |
| `onParseResult` | `(result: ParseResult \| null) => void` | Debug/inspect parse |

---

## 7. Streaming Behavior with Custom Components

### How Streaming Works

OpenUI Lang is **line-oriented**, so each line can be parsed independently as it arrives:

```
root = Stack([revenueCard])          ← Shell renders immediately
revenueCard = Card([header, chart])  ← Card container appears
header = CardHeader("Revenue", "Q4") ← Header fills in
chart = BarChart(labels, [s1])       ← Chart placeholder (data not yet defined)
labels = ["Jan", "Feb", "Mar"]       ← Labels resolve
s1 = Series("Revenue", [10, 20, 30])← Series resolves → chart renders with data
```

### Forward References (Hoisting)

OpenUI Lang allows **hoisting** — referencing an identifier before it's defined:

1. The renderer sees `chart` referenced in the `Card` children
2. `chart` is not yet defined → rendered as a placeholder/skeleton
3. When `chart = BarChart(...)` arrives, the placeholder is replaced
4. When `labels` and `s1` arrive, the BarChart finally gets its data

### Protecting Charts from Partial Data

Charts (especially Recharts) crash when their data arrays are `null`. Use the `chartDataRefsResolved` pattern from the LangChain integration:

```typescript
const CHART_TYPES = new Set([
  "BarChart", "LineChart", "AreaChart", "PieChart",
]);

function chartDataRefsResolved(text: string): boolean {
  const lines = text.split("\n");
  const complete = new Set<string>();

  for (const line of lines) {
    const t = line.trimEnd();
    const m = t.match(/^([a-zA-Z][a-zA-Z0-9]*)\s*=/);
    if (m && (t.endsWith(")") || t.endsWith("]"))) complete.add(m[1]);
  }

  for (const line of lines) {
    const t = line.trimEnd();
    const m = t.match(/^([a-zA-Z][a-zA-Z0-9]*)\s*=\s*([A-Z][a-zA-Z0-9]*)\(/);
    if (!m || !CHART_TYPES.has(m[2]) || !t.endsWith(")")) continue;

    const rhs = t.slice(t.indexOf("=") + 1).replace(/"(?:[^"\\]|\\.)*"/g, '""');
    for (const [, name] of rhs.matchAll(/\b([a-zA-Z][a-zA-Z0-9]*)\b/g)) {
      if (/^[a-z]/.test(name) && !complete.has(name)) return false;
    }
  }
  return true;
}
```

### useStableText Pattern

Don't re-render on every token. Gate updates on complete statements:

```typescript
function useStableText(raw: string, isStreaming: boolean): string {
  const [stable, setStable] = useState("");
  const lastCount = useRef(0);

  useEffect(() => {
    if (!isStreaming) { setStable(raw); return; }

    const count = countCompleteStatements(raw);
    if (count > lastCount.current && chartDataRefsResolved(raw)) {
      lastCount.current = count;
      setStable(raw);
    }
  }, [raw, isStreaming]);

  return stable;
}
```

---

## 8. Token Cost: OpenUI Lang vs JSON

### Benchmark Results (from openui.com/docs/openui-lang/benchmarks)

Measured with GPT-5.2, temperature 0, `tiktoken` gpt-5 encoder:

| Scenario | JSON (C1) | Vercel JSON-Render | OpenUI Lang | Savings vs JSON |
|----------|-----------|-------------------|-------------|-----------------|
| Simple table | 357 | 340 | **148** | **-58.5%** |
| Chart with data | 516 | 520 | **231** | **-55.2%** |
| Contact form | 849 | 893 | **294** | **-65.4%** |
| Dashboard | 2,261 | 2,247 | **1,226** | **-45.8%** |
| Pricing page | 2,379 | 2,487 | **1,195** | **-49.8%** |
| **TOTAL** | **9,948** | **10,180** | **4,800** | **-51.7%** |

### Why OpenUI Lang Is More Efficient

1. **No repeated keys** — JSON repeats `"component"`, `"props"`, `"children"` for every node. OpenUI Lang uses positional arguments.
2. **No brackets/braces overhead** — `{}`, `[]`, `:` add up fast in deep trees.
3. **Reference-based** — Instead of nesting, components are assigned to identifiers and referenced by name.

### Concrete Example: Chart with Data

**OpenUI Lang (231 tokens):**
```
root = Stack([title, chart])
title = TextContent("Q4 Revenue", "large-heavy")
chart = BarChart(labels, [s1, s2])
labels = ["Jan", "Feb", "Mar"]
s1 = Series("Product A", [10, 20, 30])
s2 = Series("Product B", [5, 15, 25])
```

**Equivalent JSON (~516 tokens):**
```json
{
  "component": "Stack",
  "props": {
    "children": [
      {
        "component": "TextContent",
        "props": { "text": "Q4 Revenue", "size": "large-heavy" }
      },
      {
        "component": "BarChart",
        "props": {
          "labels": ["Jan", "Feb", "Mar"],
          "series": [
            {
              "component": "Series",
              "props": { "label": "Product A", "data": [10, 20, 30] }
            },
            {
              "component": "Series",
              "props": { "label": "Product B", "data": [5, 15, 25] }
            }
          ]
        }
      }
    ]
  }
}
```

### Latency Impact

At 60 tokens/second (typical frontier model):

| Scenario | JSON Time | OpenUI Lang Time | Speedup |
|----------|-----------|-------------------|---------|
| Chart with data | 8.6s | 3.9s | **2.25x faster** |
| Dashboard | 37.7s | 20.4s | **1.83x faster** |
| Contact form | 14.2s | 4.9s | **3.04x faster** |

---

## 9. Vercel AI SDK Integration

### Backend (Next.js API Route)

```typescript
// src/app/api/chat/route.ts
import { streamText, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { chartLibrary, chartPromptOptions } from "@/lib/library";

const systemPrompt = chartLibrary.prompt(chartPromptOptions);

export async function POST(req: Request) {
  const { messages } = await req.json();
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
```

### Frontend (React)

```tsx
// src/components/ChatWithCharts.tsx
import { useChat } from "@ai-sdk/react";
import { Renderer } from "@openuidev/react-lang";
import { chartLibrary } from "@/lib/library";

export function ChatWithCharts() {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat();
  const isStreaming = status === "streaming";

  return (
    <div>
      {messages.map((msg) => {
        if (msg.role === "assistant") {
          const textContent = msg.parts
            ?.filter((p) => p.type === "text")
            .map((p) => p.text)
            .join("") ?? msg.content;

          return (
            <Renderer
              key={msg.id}
              response={textContent}
              library={chartLibrary}
              isStreaming={isStreaming && msg === messages[messages.length - 1]}
            />
          );
        }
        return <div key={msg.id} className="user-message">{msg.content}</div>;
      })}

      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
```

### Alternative: Direct OpenAI (No Vercel AI SDK)

```typescript
import OpenAI from "openai";
import { chartLibrary, chartPromptOptions } from "@/lib/library";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const systemPrompt = chartLibrary.prompt(chartPromptOptions);

export async function POST(req: Request) {
  const { messages } = await req.json();

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
  });

  return new Response(completion.toReadableStream(), {
    headers: { "Content-Type": "text/event-stream" },
  });
}
```

---

## 10. Best Practices for Chart Components

### Keep Schemas Flat

Deeply nested object props burn tokens and increase error rates. Chart data should be **separate components** (Series, PieSlice), not nested objects.

**Good — flat with .ref:**
```typescript
const BarChart = defineComponent({
  props: z.object({
    labels: z.array(z.string()),
    series: z.array(Series.ref),  // Each Series is a separate line
  }),
});
```

**Bad — deeply nested inline:**
```typescript
const BarChart = defineComponent({
  props: z.object({
    data: z.array(z.object({
      category: z.string(),
      values: z.array(z.object({
        seriesName: z.string(),
        value: z.number(),
      })),
    })),
  }),
});
```

### Order Zod Keys Deliberately

Required props first, most distinctive prop at position 0:

```typescript
props: z.object({
  labels: z.array(z.string()),      // Position 0 — required, distinctive
  series: z.array(Series.ref),      // Position 1 — required
  stacked: z.boolean().optional(),   // Position 2 — optional, trailing
})
```

### Use Descriptive Component Names

The LLM picks components by name. `BarChart` is unambiguous. `Chart3` is not.

### Limit Library Size

Every component adds tokens to the system prompt. Include only chart types the LLM actually needs. A library with `BarChart`, `LineChart`, `AreaChart`, `PieChart` + `Series` + `PieSlice` is usually sufficient.

### Use componentGroups with Notes

```typescript
componentGroups: [
  {
    name: "Charts",
    components: ["BarChart", "LineChart", "AreaChart", "PieChart", "Series", "PieSlice"],
    notes: [
      "- Use BarChart for discrete category comparisons.",
      "- Use LineChart for trends over time.",
      "- Use PieChart for proportional distribution (max 8 slices).",
      "- Define labels and Series BEFORE the chart that references them.",
      "- Each Series must be defined as a separate reference, not inline.",
    ],
  },
],
```

### Provide Examples in PromptOptions

One concrete chart example dramatically improves output quality:

```typescript
examples: [
  `root = Stack([card])
card = Card([header, chart])
header = CardHeader("Monthly Revenue", "Last 3 months")
chart = BarChart(labels, [s1])
labels = ["Jan", "Feb", "Mar"]
s1 = Series("Revenue", [45000, 52000, 61000])`,
],
```

### Handle Null Data in Chart Renderers

Always guard against partial data during streaming:

```typescript
component: ({ props }) => {
  const series = props.series ?? [];
  const labels = props.labels ?? [];
  if (labels.length === 0 || series.length === 0) {
    return <div className="h-72 animate-pulse bg-muted rounded" />;
  }
  // ... render chart
},
```

### Use Hoisting Order

Instruct the LLM (via `additionalRules`) to write `root` first:
```
root = Stack([card1, card2])   ← UI shell appears immediately
card1 = Card([...])            ← Card 1 fills in
card2 = Card([...])            ← Card 2 fills in
labels = [...]                 ← Data arrives
s1 = Series(...)               ← Chart renders with data
```

---

## 11. Complete Working Example

### What the LLM Generates

Given the prompt "Show me a dashboard comparing Q4 sales by region", the LLM outputs:

```
root = Stack([titleCard, chartsRow, summaryCard])
titleCard = Card([titleHeader])
titleHeader = CardHeader("Q4 Sales Dashboard", "Regional Comparison — Oct-Dec 2025")

chartsRow = Stack([barCard, pieCard], "row", "m")

barCard = Card([barHeader, barChart])
barHeader = CardHeader("Monthly Sales by Region")
barChart = BarChart(months, [northSeries, southSeries, westSeries])
months = ["October", "November", "December"]
northSeries = Series("North", [125000, 142000, 168000])
southSeries = Series("South", [98000, 105000, 119000])
westSeries = Series("West", [87000, 93000, 112000])

pieCard = Card([pieHeader, pie])
pieHeader = CardHeader("Q4 Total by Region")
pie = PieChart([northSlice, southSlice, westSlice])
northSlice = PieSlice("North", 435000)
southSlice = PieSlice("South", 322000)
westSlice = PieSlice("West", 292000)

summaryCard = Card([summaryHeader, summaryText])
summaryHeader = CardHeader("Key Takeaways")
summaryText = TextContent("North region leads with $435K total, showing 34% growth from October to December. All regions show positive month-over-month trends.")
```

### How It Renders

The `Renderer` processes this top-down:

1. `root = Stack([...])` → Flex container shell appears
2. `titleCard` → Card with "Q4 Sales Dashboard" header
3. `chartsRow` → Horizontal flex row with two card placeholders
4. `barCard` → Card with header appears, chart is skeleton (data not yet resolved)
5. `months`, `northSeries`, etc. → Data resolves → BarChart renders with actual bars
6. `pieCard` → Similar progressive rendering for the pie chart
7. `summaryCard` → Text summary card fills in last

Total tokens for this dashboard in OpenUI Lang: **~400 tokens**
Equivalent JSON: **~900+ tokens** (2.25x more expensive, 2.25x slower)

### Full File Structure

```
src/
  lib/
    chart-library.ts     # defineComponent() calls for Recharts wrappers
    library.ts           # createLibrary() + chartPromptOptions
  app/
    api/chat/
      route.ts           # Streaming API with system prompt
    page.tsx             # Chat UI with Renderer
  generated/
    system-prompt.txt    # Auto-generated at build time
```

---

## Key Takeaways

1. **OpenUI is NOT a component library** — it's a protocol. Your Recharts/Tremor components are the actual renderers; OpenUI just defines the contract between the LLM and your React code.

2. **The Zod schema IS the API.** Key order = positional arguments. Change the order, break the output.

3. **Use `.ref` for composition.** Each `Series` is a separate line in the LLM output, which streams and validates independently.

4. **Charts need data guards.** During streaming, chart data arrives after the chart declaration. Guard against null/undefined data arrays.

5. **Token savings are real.** 45-67% fewer tokens than JSON, which directly translates to faster rendering and lower API costs.

6. **The system prompt is auto-generated.** You define components → OpenUI generates the LLM instructions. You never manually write the language spec.

7. **Transport-agnostic.** Works with Vercel AI SDK, LangChain, raw OpenAI, Anthropic — any streaming text source feeds into `<Renderer>`.
