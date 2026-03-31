import type { Platform } from "./channel";

export interface Product {
  id: string;
  orgId: string;
  title: string;
  sku: string;
  imageUrl: string | null;
  cogs: number;
  category: string;
  status: "active" | "archived" | "draft";
  channels: Platform[];
  totalRevenue: number;
  totalUnitsSold: number;
  avgPrice: number;
  profitMargin: number;
  trend: number;
  createdAt: string;
}
