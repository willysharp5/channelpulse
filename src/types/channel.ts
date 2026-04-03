export type Platform =
  | "shopify"
  | "amazon"
  | "ebay"
  | "etsy"
  | "woocommerce"
  | "tiktok"
  | "walmart"
  | "facebook"
  | "instagram"
  | "pinterest"
  | "google"
  | "bigcommerce"
  | "square"
  | "temu"
  | "magento"
  | "mirakl";

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
