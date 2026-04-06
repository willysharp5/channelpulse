import {
  BarChart3,
  TrendingUp,
  PiggyBank,
  Trophy,
  AlertTriangle,
  ShoppingCart,
  Package,
  DollarSign,
  Percent,
  Clock,
  Layers,
  Zap,
  Target,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3,
  TrendingUp,
  PiggyBank,
  Trophy,
  AlertTriangle,
  ShoppingCart,
  Package,
  DollarSign,
  Percent,
  Clock,
  Layers,
  Zap,
  Target,
  Sparkles,
};

export interface SuggestedReport {
  id?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  prompt: string;
  accentClass: string;
}

export interface SuggestedReportData {
  id: string;
  icon_name: string;
  title: string;
  description: string;
  prompt: string;
  accent_class: string;
  is_active: boolean;
  sort_order: number;
}

export function mapDbReport(r: SuggestedReportData): SuggestedReport {
  return {
    id: r.id,
    icon: ICON_MAP[r.icon_name] ?? BarChart3,
    title: r.title,
    description: r.description,
    prompt: r.prompt,
    accentClass: r.accent_class,
  };
}

/** Single source for default suggested reports (API fallback + Remotion landing). */
export const FALLBACK_SUGGESTED_REPORTS_DATA: SuggestedReportData[] = [
  {
    id: "fallback-revenue",
    icon_name: "BarChart3",
    title: "Revenue Overview",
    description: "Revenue trends and channel breakdown for the last 30 days",
    prompt:
      "Show me a revenue overview for the last 30 days with KPI cards for revenue, orders, AOV, and profit, plus a revenue chart broken down by channel.",
    accent_class: "bg-amber-500/10 text-amber-500",
    is_active: true,
    sort_order: 0,
  },
  {
    id: "fallback-channels",
    icon_name: "TrendingUp",
    title: "Channel Performance",
    description: "Side-by-side comparison of all connected channels",
    prompt:
      "Compare performance across all my channels for the last 30 days. Show revenue, orders, and share for each channel.",
    accent_class: "bg-blue-500/10 text-blue-500",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "fallback-pnl",
    icon_name: "PiggyBank",
    title: "P&L Summary",
    description: "Profit & loss with COGS, fees, and net margins",
    prompt:
      "Show me my P&L breakdown for the last 30 days. Include gross profit, all fees, net profit, and margins.",
    accent_class: "bg-emerald-500/10 text-emerald-500",
    is_active: true,
    sort_order: 2,
  },
  {
    id: "fallback-products",
    icon_name: "Trophy",
    title: "Top Products",
    description: "Best sellers ranked by revenue and units sold",
    prompt:
      "What are my top 10 best selling products for the last 30 days? Show them with revenue, units sold, and platform.",
    accent_class: "bg-violet-500/10 text-violet-500",
    is_active: true,
    sort_order: 3,
  },
  {
    id: "fallback-inventory",
    icon_name: "AlertTriangle",
    title: "Inventory Alerts",
    description: "Low stock warnings and reorder recommendations",
    prompt:
      "Show me inventory alerts and any low stock items for the last 30 days. Which products need to be reordered?",
    accent_class: "bg-red-500/10 text-red-500",
    is_active: true,
    sort_order: 4,
  },
  {
    id: "fallback-orders",
    icon_name: "ShoppingCart",
    title: "Orders Summary",
    description: "Recent order activity, volume, and status",
    prompt:
      "Give me an orders summary — show the 10 most recent orders with status, customer, amount, and platform.",
    accent_class: "bg-cyan-500/10 text-cyan-500",
    is_active: true,
    sort_order: 5,
  },
];

export const FALLBACK_REPORTS: SuggestedReport[] = FALLBACK_SUGGESTED_REPORTS_DATA.map(mapDbReport);
