import type { Platform } from "@/types";
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Store,
  FileText,
  Settings,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";

export const CHANNEL_CONFIG: Record<
  Platform,
  { color: string; label: string; abbr: string }
> = {
  shopify: { color: "#96BF48", label: "Shopify", abbr: "S" },
  amazon: { color: "#FF9900", label: "Amazon", abbr: "A" },
  ebay: { color: "#E53238", label: "eBay", abbr: "E" },
  etsy: { color: "#F16521", label: "Etsy", abbr: "Et" },
  woocommerce: { color: "#7B2D8E", label: "WooCommerce", abbr: "W" },
} as const;

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Overview", href: "/", icon: LayoutDashboard },
  { title: "Orders", href: "/orders", icon: ShoppingCart },
  { title: "Revenue", href: "/revenue", icon: TrendingUp },
  { title: "Products", href: "/products", icon: Package },
  { title: "Channels", href: "/channels", icon: Store },
  { title: "P&L", href: "/pnl", icon: FileText },
  { title: "Settings", href: "/settings", icon: Settings },
];

export const DATE_RANGE_PRESETS = [
  { label: "Today", value: "today" as const },
  { label: "Last 7 days", value: "7d" as const },
  { label: "Last 30 days", value: "30d" as const },
  { label: "Last 90 days", value: "90d" as const },
  { label: "This month", value: "thisMonth" as const },
  { label: "Last month", value: "lastMonth" as const },
  { label: "This year", value: "thisYear" as const },
];

export function rangeToDays(range: string | null): number {
  const now = new Date();
  switch (range) {
    case "today": return 1;
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    case "thisMonth": return now.getDate();
    case "lastMonth": {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return Math.ceil((endOfLastMonth.getTime() - lastMonth.getTime()) / 86400000) + now.getDate();
    }
    case "thisYear": {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return Math.ceil((now.getTime() - startOfYear.getTime()) / 86400000);
    }
    default: return 30;
  }
}

export const PLAN_LIMITS = {
  free: { channels: 1, ordersPerMonth: 100 },
  starter: { channels: 3, ordersPerMonth: 5000 },
  growth: { channels: 5, ordersPerMonth: 25000 },
  scale: { channels: 999, ordersPerMonth: 999999 },
} as const;
