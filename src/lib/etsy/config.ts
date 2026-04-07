import crypto from "crypto";

export const ETSY_CONFIG = {
  apiKey: process.env.ETSY_API_KEY ?? "",
  hostName: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.channelpulse.us",
  callbackPath: "/api/auth/etsy/callback",
  baseUrl: "https://openapi.etsy.com/v3",
  oauthUrl: "https://www.etsy.com/oauth/connect",
  tokenUrl: "https://api.etsy.com/v3/public/oauth/token",
  scopes: "transactions_r listings_r shops_r",
} as const;

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString("base64url");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function getEtsyAuthUrl(
  state: string,
  codeChallenge: string
): string {
  const { apiKey, hostName, callbackPath, scopes } = ETSY_CONFIG;
  const redirectUri = `${hostName}${callbackPath}`;

  return (
    `${ETSY_CONFIG.oauthUrl}` +
    `?response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&client_id=${encodeURIComponent(apiKey)}` +
    `&state=${encodeURIComponent(state)}` +
    `&code_challenge=${encodeURIComponent(codeChallenge)}` +
    `&code_challenge_method=S256`
  );
}
