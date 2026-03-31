export type Platform = "shopify" | "amazon" | "ebay" | "etsy" | "woocommerce";

export type ChannelStatus =
  | "pending"
  | "active"
  | "syncing"
  | "error"
  | "disconnected";

export interface Channel {
  id: string;
  orgId: string;
  platform: Platform;
  name: string;
  status: ChannelStatus;
  lastSyncAt: string | null;
  ordersCount: number;
  revenue: number;
  createdAt: string;
}
