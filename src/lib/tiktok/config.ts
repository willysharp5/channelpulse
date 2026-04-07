export const TIKTOK_CONFIG = {
  appKey: process.env.TIKTOK_APP_KEY ?? "",
  appSecret: process.env.TIKTOK_APP_SECRET ?? "",
  hostName: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.channelpulse.us",
  callbackPath: "/api/auth/tiktok/callback",
  authUrl: "https://services.us.tiktokshop.com/open/authorize",
  tokenUrl: "https://auth.tiktok-shops.com/api/v2/token/get",
  refreshUrl: "https://auth.tiktok-shops.com/api/v2/token/refresh",
  apiBase: "https://open-api.tiktokglobalshop.com",
} as const;

export function getTikTokAuthUrl(state: string): string {
  const { appKey, authUrl } = TIKTOK_CONFIG;

  return (
    `${authUrl}` +
    `?service_id=${encodeURIComponent(appKey)}` +
    `&state=${encodeURIComponent(state)}`
  );
}
