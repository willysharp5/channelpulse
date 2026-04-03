export const AMAZON_CONFIG = {
  lwaClientId: process.env.AMAZON_LWA_CLIENT_ID ?? "",
  lwaClientSecret: process.env.AMAZON_LWA_CLIENT_SECRET ?? "",
  awsAccessKeyId: process.env.AMAZON_AWS_ACCESS_KEY_ID ?? "",
  awsSecretAccessKey: process.env.AMAZON_AWS_SECRET_ACCESS_KEY ?? "",
  roleArn: process.env.AMAZON_ROLE_ARN ?? "",
  marketplaceId: process.env.AMAZON_MARKETPLACE_ID ?? "ATVPDKIKX0DER",
  hostName: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  callbackPath: "/api/auth/amazon/callback",
  region: "us-east-1",
  endpoint: "https://sellingpartnerapi-na.amazon.com",
  lwaEndpoint: "https://api.amazon.com",
} as const;

export const AMAZON_MARKETPLACE_MAP: Record<
  string,
  { name: string; country: string; endpoint: string; region: string }
> = {
  ATVPDKIKX0DER: { name: "Amazon.com", country: "US", endpoint: "https://sellingpartnerapi-na.amazon.com", region: "us-east-1" },
  A2EUQ1WTGCTBG2: { name: "Amazon.ca", country: "CA", endpoint: "https://sellingpartnerapi-na.amazon.com", region: "us-east-1" },
  A1AM78C64UM0Y8: { name: "Amazon.com.mx", country: "MX", endpoint: "https://sellingpartnerapi-na.amazon.com", region: "us-east-1" },
  A1F83G8C2ARO7P: { name: "Amazon.co.uk", country: "UK", endpoint: "https://sellingpartnerapi-eu.amazon.com", region: "eu-west-1" },
  A1PA6795UKMFR9: { name: "Amazon.de", country: "DE", endpoint: "https://sellingpartnerapi-eu.amazon.com", region: "eu-west-1" },
  A13V1IB3VIYZZH: { name: "Amazon.fr", country: "FR", endpoint: "https://sellingpartnerapi-eu.amazon.com", region: "eu-west-1" },
} as const;

export function getAmazonAuthUrl(state: string): string {
  const { lwaClientId } = AMAZON_CONFIG;

  return (
    `https://sellercentral.amazon.com/apps/authorize/consent` +
    `?application_id=${encodeURIComponent(lwaClientId)}` +
    `&state=${encodeURIComponent(state)}` +
    `&version=beta`
  );
}
