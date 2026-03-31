import type {
  Order,
  Channel,
  Product,
  KPIData,
  RevenueTimeSeriesPoint,
  ChannelRevenue,
  TopProduct,
  PnLData,
} from "@/types";
import { format, subDays } from "date-fns";

const ORG_ID = "org_demo_001";

// --- Channels ---
export const mockChannels: Channel[] = [
  {
    id: "ch_shopify_001",
    orgId: ORG_ID,
    platform: "shopify",
    name: "My Shopify Store",
    status: "active",
    lastSyncAt: new Date().toISOString(),
    ordersCount: 1247,
    revenue: 62350,
    createdAt: "2025-12-01T00:00:00Z",
  },
  {
    id: "ch_amazon_001",
    orgId: ORG_ID,
    platform: "amazon",
    name: "Amazon US Marketplace",
    status: "active",
    lastSyncAt: new Date(Date.now() - 900000).toISOString(),
    ordersCount: 834,
    revenue: 48920,
    createdAt: "2026-01-15T00:00:00Z",
  },
];

// --- Revenue time series (last 30 days) ---
function generateRevenueSeries(): RevenueTimeSeriesPoint[] {
  const points: RevenueTimeSeriesPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = format(subDays(new Date(), i), "yyyy-MM-dd");
    const dayOfWeek = subDays(new Date(), i).getDay();
    const weekendDip = dayOfWeek === 0 || dayOfWeek === 6 ? 0.7 : 1;
    const trendMultiplier = 1 + (30 - i) * 0.008;

    const shopify =
      Math.round((1200 + Math.random() * 800) * weekendDip * trendMultiplier);
    const amazon =
      Math.round((900 + Math.random() * 600) * weekendDip * trendMultiplier);
    const ebay = 0;
    const etsy = 0;

    points.push({
      date,
      shopify,
      amazon,
      ebay,
      etsy,
      total: shopify + amazon + ebay + etsy,
    });
  }
  return points;
}

export const mockRevenueSeries = generateRevenueSeries();

// --- KPI data ---
const totalRevenue = mockRevenueSeries.reduce((sum, p) => sum + p.total, 0);
const totalOrders = 2081;
const avgOrderValue = totalRevenue / totalOrders;
const totalCogs = totalRevenue * 0.38;
const totalFees = totalRevenue * 0.12;
const netProfit = totalRevenue - totalCogs - totalFees;

export const mockKPIs: KPIData[] = [
  {
    title: "Total Revenue",
    value: totalRevenue,
    formattedValue: `$${(totalRevenue / 1000).toFixed(1)}k`,
    change: 12.3,
    changeLabel: "vs last 30 days",
    sparklineData: mockRevenueSeries.slice(-14).map((p) => p.total),
  },
  {
    title: "Total Orders",
    value: totalOrders,
    formattedValue: totalOrders.toLocaleString(),
    change: 8.1,
    changeLabel: "vs last 30 days",
    sparklineData: mockRevenueSeries
      .slice(-14)
      .map((p) => Math.round(p.total / avgOrderValue)),
  },
  {
    title: "Net Profit",
    value: netProfit,
    formattedValue: `$${(netProfit / 1000).toFixed(1)}k`,
    change: 15.2,
    changeLabel: "vs last 30 days",
    sparklineData: mockRevenueSeries
      .slice(-14)
      .map((p) => p.total * 0.5),
  },
  {
    title: "Avg Order Value",
    value: avgOrderValue,
    formattedValue: `$${avgOrderValue.toFixed(2)}`,
    change: -2.1,
    changeLabel: "vs last 30 days",
    sparklineData: [
      26.1, 25.8, 24.9, 25.5, 24.2, 25.0, 24.8, 23.9, 24.5, 25.1, 24.3,
      24.0, 23.8, 24.1,
    ],
  },
];

// --- Channel breakdown ---
const shopifyRevenue = mockRevenueSeries.reduce((s, p) => s + p.shopify, 0);
const amazonRevenue = mockRevenueSeries.reduce((s, p) => s + p.amazon, 0);

export const mockChannelRevenue: ChannelRevenue[] = [
  {
    channel: "shopify",
    label: "Shopify",
    revenue: shopifyRevenue,
    percentage: Math.round((shopifyRevenue / totalRevenue) * 100),
    color: "#96BF48",
  },
  {
    channel: "amazon",
    label: "Amazon",
    revenue: amazonRevenue,
    percentage: Math.round((amazonRevenue / totalRevenue) * 100),
    color: "#FF9900",
  },
];

// --- Top products ---
export const mockTopProducts: TopProduct[] = [
  {
    id: "prod_001",
    title: "Organic Cotton T-Shirt",
    sku: "OCT-BLK-M",
    imageUrl: null,
    totalRevenue: 8430,
    totalUnits: 281,
    trend: 12.4,
    channels: [
      { channel: "shopify", units: 168, revenue: 5040 },
      { channel: "amazon", units: 113, revenue: 3390 },
    ],
  },
  {
    id: "prod_002",
    title: "Bamboo Water Bottle 750ml",
    sku: "BWB-750",
    imageUrl: null,
    totalRevenue: 6210,
    totalUnits: 207,
    trend: 8.7,
    channels: [
      { channel: "shopify", units: 124, revenue: 3720 },
      { channel: "amazon", units: 83, revenue: 2490 },
    ],
  },
  {
    id: "prod_003",
    title: "Eco-Friendly Tote Bag",
    sku: "ETB-NAT",
    imageUrl: null,
    totalRevenue: 5890,
    totalUnits: 327,
    trend: -3.2,
    channels: [
      { channel: "shopify", units: 196, revenue: 3528 },
      { channel: "amazon", units: 131, revenue: 2362 },
    ],
  },
  {
    id: "prod_004",
    title: "Stainless Steel Straw Set",
    sku: "SSS-6PK",
    imageUrl: null,
    totalRevenue: 4100,
    totalUnits: 410,
    trend: 22.1,
    channels: [
      { channel: "shopify", units: 205, revenue: 2050 },
      { channel: "amazon", units: 205, revenue: 2050 },
    ],
  },
  {
    id: "prod_005",
    title: "Natural Beeswax Wraps 3-Pack",
    sku: "NBW-3PK",
    imageUrl: null,
    totalRevenue: 3780,
    totalUnits: 189,
    trend: 5.4,
    channels: [
      { channel: "shopify", units: 113, revenue: 2268 },
      { channel: "amazon", units: 76, revenue: 1512 },
    ],
  },
];

// --- Recent orders ---
const names = [
  "Emma Johnson",
  "Liam Chen",
  "Sophia Martinez",
  "Noah Williams",
  "Ava Brown",
  "James Taylor",
  "Isabella Davis",
  "Oliver Wilson",
  "Mia Anderson",
  "Lucas Thomas",
];

function generateOrders(): Order[] {
  const orders: Order[] = [];
  const statuses: Order["status"][] = [
    "paid",
    "shipped",
    "delivered",
    "paid",
    "shipped",
    "delivered",
    "delivered",
    "shipped",
    "pending",
    "delivered",
  ];

  for (let i = 0; i < 20; i++) {
    const platform = i % 3 === 0 ? "amazon" as const : "shopify" as const;
    const channelId =
      platform === "shopify" ? "ch_shopify_001" : "ch_amazon_001";
    const amount = Math.round((15 + Math.random() * 120) * 100) / 100;
    const fees = amount * (platform === "amazon" ? 0.15 : 0.029);
    const cogs = amount * 0.35;

    orders.push({
      id: `ord_${String(i + 1).padStart(3, "0")}`,
      orgId: ORG_ID,
      channelId,
      platform,
      platformOrderId: `${platform === "shopify" ? "SH" : "AZ"}-${10847 - i}`,
      orderNumber: `#${10847 - i}`,
      status: statuses[i % statuses.length],
      financialStatus: "paid",
      customerName: names[i % names.length],
      customerEmail: `${names[i % names.length].toLowerCase().replace(" ", ".")}@email.com`,
      subtotal: amount,
      totalTax: Math.round(amount * 0.08 * 100) / 100,
      totalShipping: Math.round((4.99 + Math.random() * 5) * 100) / 100,
      totalDiscounts: i % 4 === 0 ? Math.round(amount * 0.1 * 100) / 100 : 0,
      totalAmount: amount,
      currency: "USD",
      platformFees: Math.round(fees * 100) / 100,
      cogs: Math.round(cogs * 100) / 100,
      netProfit: Math.round((amount - fees - cogs) * 100) / 100,
      itemCount: Math.ceil(Math.random() * 3),
      orderedAt: new Date(
        Date.now() - i * 3600000 * (1 + Math.random() * 2)
      ).toISOString(),
      createdAt: new Date(
        Date.now() - i * 3600000 * (1 + Math.random() * 2)
      ).toISOString(),
    });
  }
  return orders;
}

export const mockOrders = generateOrders();

// --- P&L data ---
export const mockPnL: PnLData = {
  period: "March 2026",
  revenue: {
    shopify: shopifyRevenue,
    amazon: amazonRevenue,
    ebay: 0,
    etsy: 0,
    total: totalRevenue,
  },
  cogs: totalCogs,
  grossProfit: totalRevenue - totalCogs,
  grossMargin: ((totalRevenue - totalCogs) / totalRevenue) * 100,
  fees: {
    marketplace: totalRevenue * 0.05,
    shipping: totalRevenue * 0.035,
    processing: totalRevenue * 0.029,
    advertising: 2500,
    refunds: totalRevenue * 0.02,
    total: totalFees,
  },
  netProfit,
  netMargin: (netProfit / totalRevenue) * 100,
};

// --- Mock products for products table ---
export const mockProducts: Product[] = mockTopProducts.map((tp, i) => ({
  id: tp.id,
  orgId: ORG_ID,
  title: tp.title,
  sku: tp.sku,
  imageUrl: tp.imageUrl,
  cogs: tp.totalRevenue * 0.35,
  category: ["Apparel", "Drinkware", "Bags", "Kitchen", "Kitchen"][i],
  status: "active" as const,
  channels: tp.channels.map((c) => c.channel),
  totalRevenue: tp.totalRevenue,
  totalUnitsSold: tp.totalUnits,
  avgPrice: tp.totalRevenue / tp.totalUnits,
  profitMargin: 50 + Math.round(Math.random() * 20),
  trend: tp.trend,
  createdAt: "2025-12-01T00:00:00Z",
}));
