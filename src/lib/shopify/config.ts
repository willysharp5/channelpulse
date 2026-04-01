export const SHOPIFY_CONFIG = {
  apiKey: process.env.SHOPIFY_API_KEY ?? "",
  apiSecret: process.env.SHOPIFY_API_SECRET ?? "",
  scopes: "read_products,read_orders,read_inventory,read_locations",
  hostName: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  callbackPath: "/api/auth/shopify/callback",
} as const;

export function getShopifyAuthUrl(shop: string, state: string): string {
  const { apiKey, scopes, hostName, callbackPath } = SHOPIFY_CONFIG;
  const redirectUri = `${hostName}${callbackPath}`;

  return (
    `https://${shop}/admin/oauth/authorize` +
    `?client_id=${apiKey}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`
  );
}
