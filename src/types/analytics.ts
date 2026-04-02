import type { Platform } from "./channel";

export interface KPIData {
  title: string;
  value: number;
  formattedValue: string;
  change: number;
  changeLabel: string;
  sparklineData: number[];
  progress?: {
    value: number;
    max: number;
    label?: string;
    color?: string;
  };
}

export interface RevenueTimeSeriesPoint {
  date: string;
  shopify: number;
  amazon: number;
  ebay: number;
  etsy: number;
  total: number;
}

export interface ChannelRevenue {
  channel: Platform;
  label: string;
  revenue: number;
  percentage: number;
  color: string;
}

export interface TopProduct {
  id: string;
  title: string;
  sku: string;
  imageUrl: string | null;
  totalRevenue: number;
  totalUnits: number;
  trend: number;
  channels: {
    channel: Platform;
    units: number;
    revenue: number;
  }[];
}

export interface DailyStats {
  date: string;
  channelId: string;
  platform: Platform;
  totalRevenue: number;
  totalOrders: number;
  totalUnits: number;
  avgOrderValue: number;
  platformFees: number;
  estimatedCogs: number;
  estimatedProfit: number;
}

export interface PnLData {
  period: string;
  revenue: {
    shopify: number;
    amazon: number;
    ebay: number;
    etsy: number;
    total: number;
  };
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  fees: {
    marketplace: number;
    shipping: number;
    processing: number;
    advertising: number;
    refunds: number;
    total: number;
  };
  netProfit: number;
  netMargin: number;
}

export type DateRange = "today" | "7d" | "30d" | "90d" | "thisMonth" | "lastMonth" | "thisYear" | "custom";
