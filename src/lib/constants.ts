import type { Platform } from "@/types";
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Boxes,
  Store,
  FileText,
  Settings,
  ShoppingCart,
  Users,
  CreditCard,
  ClipboardList,
  Shield,
  Receipt,
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
  tiktok: { color: "#FE2C55", label: "TikTok Shop", abbr: "TT" },
  walmart: { color: "#0071CE", label: "Walmart", abbr: "Wm" },
  facebook: { color: "#1877F2", label: "Facebook", abbr: "Fb" },
  instagram: { color: "#E4405F", label: "Instagram", abbr: "Ig" },
  pinterest: { color: "#BD081C", label: "Pinterest", abbr: "P" },
  google: { color: "#4285F4", label: "Google", abbr: "G" },
  bigcommerce: { color: "#121118", label: "BigCommerce", abbr: "BC" },
  square: { color: "#006AFF", label: "Square", abbr: "Sq" },
  temu: { color: "#FF6A00", label: "Temu", abbr: "Te" },
  magento: { color: "#EE672F", label: "Magento", abbr: "Mg" },
  mirakl: { color: "#5C2D91", label: "Mirakl", abbr: "Mi" },
} as const;

/** Order for “all platforms” UI (Channels reference, settings). */
export const PLATFORM_DISPLAY_ORDER = [
  "shopify",
  "amazon",
  "ebay",
  "etsy",
  "woocommerce",
  "tiktok",
  "walmart",
  "facebook",
  "instagram",
  "pinterest",
  "google",
  "bigcommerce",
  "square",
  "temu",
  "magento",
  "mirakl",
] as const satisfies readonly Platform[];

/** Stable ordering for platform filter dropdowns (known slugs first, then alpha). */
export function sortPlatformsForUi(platforms: string[]): string[] {
  const order = new Map<string, number>(
    (PLATFORM_DISPLAY_ORDER as readonly string[]).map((p, i) => [p, i])
  );
  return [...new Set(platforms)].sort(
    (a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999) || a.localeCompare(b)
  );
}

/** Distinct colors when many channels stack (e.g. multiple Shopify stores). */
export const REPORT_CHANNEL_PALETTE = [
  "#96BF48",
  "#FF9900",
  "#E53238",
  "#F16521",
  "#7B2D8E",
  "#FE2C55",
  "#0071CE",
  "#1877F2",
  "#E4405F",
  "#BD081C",
  "#4285F4",
  "#121118",
  "#006AFF",
  "#FF6A00",
  "#EE672F",
  "#5C2D91",
  "#0D9488",
  "#CA8A04",
  "#DC2626",
  "#7C3AED",
  "#059669",
  "#DB2777",
] as const;

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
  { title: "Inventory", href: "/inventory", icon: Boxes },
  { title: "Channels", href: "/channels", icon: Store },
  { title: "P&L", href: "/pnl", icon: FileText },
  { title: "Billing", href: "/billing", icon: Receipt },
  { title: "Settings", href: "/settings", icon: Settings },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  { title: "Audit Log", href: "/admin/audit-log", icon: ClipboardList },
  { title: "Settings", href: "/admin/settings", icon: Settings },
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

export const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 19,
  growth: 39,
  scale: 79,
};
