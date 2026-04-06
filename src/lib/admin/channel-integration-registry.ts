export type ChannelPlatformSlug =
  | "shopify"
  | "amazon"
  | "etsy"
  | "tiktok"
  | "walmart";

export type IntegrationStatus = "live" | "planned";

const GH = "https://github.com/willysharp5/channelpulse/blob/main/src/app";

export interface ChannelIntegrationDefinition {
  slug: ChannelPlatformSlug;
  label: string;
  color: string;
  status: IntegrationStatus;
  oauth?: { start: string; callback: string; startSrc: string; callbackSrc: string };
  sync?: { route: string; src: string };
  envKeys?: string[];
}

export const INTEGRATION_TABLES = [
  { name: "channels",             url: "https://supabase.com/dashboard/project/ixbvakwxuwayzfvnxucl/editor/17565?schema=public", purpose: "Store connections, credentials, sync cursor, status." },
  { name: "channel_pnl_settings", url: "https://supabase.com/dashboard/project/ixbvakwxuwayzfvnxucl/editor/21678?schema=public", purpose: "Per-channel P&L fee / shipping / marketing overrides." },
  { name: "sync_jobs",            url: "https://supabase.com/dashboard/project/ixbvakwxuwayzfvnxucl/editor/17714?schema=public", purpose: "Sync run history per channel." },
  { name: "orders",               url: "https://supabase.com/dashboard/project/ixbvakwxuwayzfvnxucl/editor/17625?schema=public", purpose: "Orders with channel_id FK + denormalized platform." },
  { name: "products",             url: "https://supabase.com/dashboard/project/ixbvakwxuwayzfvnxucl/editor/17586?schema=public", purpose: "Catalog rows, optional channel_id / platform_product_id." },
  { name: "daily_stats",          url: "https://supabase.com/dashboard/project/ixbvakwxuwayzfvnxucl/editor/17687?schema=public", purpose: "Daily aggregated metrics per channel." },
  { name: "import_jobs",          url: "https://supabase.com/dashboard/project/ixbvakwxuwayzfvnxucl/editor/21610?schema=public", purpose: "CSV imports scoped to a channel." },
] as const;

export const CHANNEL_INTEGRATIONS: ChannelIntegrationDefinition[] = [
  {
    slug: "shopify",
    label: "Shopify",
    color: "#96BF48",
    status: "live",
    oauth: {
      start: "/api/auth/shopify",
      callback: "/api/auth/shopify/callback",
      startSrc: `${GH}/api/auth/shopify/route.ts`,
      callbackSrc: `${GH}/api/auth/shopify/callback/route.ts`,
    },
    sync: { route: "/api/sync/shopify", src: `${GH}/api/sync/shopify/route.ts` },
    envKeys: ["SHOPIFY_API_KEY", "SHOPIFY_API_SECRET"],
  },
  {
    slug: "amazon",
    label: "Amazon",
    color: "#FF9900",
    status: "live",
    oauth: {
      start: "/api/auth/amazon",
      callback: "/api/auth/amazon/callback",
      startSrc: `${GH}/api/auth/amazon/route.ts`,
      callbackSrc: `${GH}/api/auth/amazon/callback/route.ts`,
    },
    sync: { route: "/api/sync/amazon", src: `${GH}/api/sync/amazon/route.ts` },
    envKeys: [
      "AMAZON_LWA_CLIENT_ID",
      "AMAZON_LWA_CLIENT_SECRET",
      "AMAZON_AWS_ACCESS_KEY_ID",
      "AMAZON_AWS_SECRET_ACCESS_KEY",
      "AMAZON_ROLE_ARN",
      "AMAZON_MARKETPLACE_ID",
    ],
  },
  {
    slug: "etsy",
    label: "Etsy",
    color: "#F16521",
    status: "live",
    oauth: {
      start: "/api/auth/etsy",
      callback: "/api/auth/etsy/callback",
      startSrc: `${GH}/api/auth/etsy/route.ts`,
      callbackSrc: `${GH}/api/auth/etsy/callback/route.ts`,
    },
    sync: { route: "/api/sync/etsy", src: `${GH}/api/sync/etsy/route.ts` },
    envKeys: ["ETSY_API_KEY"],
  },
  {
    slug: "tiktok",
    label: "TikTok Shop",
    color: "#FE2C55",
    status: "live",
    oauth: {
      start: "/api/auth/tiktok",
      callback: "/api/auth/tiktok/callback",
      startSrc: `${GH}/api/auth/tiktok/route.ts`,
      callbackSrc: `${GH}/api/auth/tiktok/callback/route.ts`,
    },
    sync: { route: "/api/sync/tiktok", src: `${GH}/api/sync/tiktok/route.ts` },
    envKeys: ["TIKTOK_APP_KEY", "TIKTOK_APP_SECRET"],
  },
  {
    slug: "walmart",
    label: "Walmart",
    color: "#0071CE",
    status: "planned",
    envKeys: [],
  },
];
