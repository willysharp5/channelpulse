import type { Platform } from "@/types";
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Store,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react";

export const CHANNEL_CONFIG: Record<
  Platform,
  { color: string; label: string; icon: string }
> = {
  shopify: { color: "#96BF48", label: "Shopify", icon: "🟢" },
  amazon: { color: "#FF9900", label: "Amazon", icon: "🟠" },
  ebay: { color: "#E53238", label: "eBay", icon: "🔴" },
  etsy: { color: "#F16521", label: "Etsy", icon: "🟤" },
  woocommerce: { color: "#7B2D8E", label: "WooCommerce", icon: "🟣" },
} as const;

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Overview", href: "/", icon: LayoutDashboard },
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

export const PLAN_LIMITS = {
  free: { channels: 1, ordersPerMonth: 100 },
  starter: { channels: 3, ordersPerMonth: 5000 },
  growth: { channels: 5, ordersPerMonth: 25000 },
  scale: { channels: 999, ordersPerMonth: 999999 },
} as const;
