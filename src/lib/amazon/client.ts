import crypto from "crypto";
import { AMAZON_CONFIG } from "./config";

interface LWATokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

interface AmazonOrder {
  AmazonOrderId: string;
  PurchaseDate: string;
  LastUpdateDate: string;
  OrderStatus: string;
  OrderTotal?: { CurrencyCode: string; Amount: string };
  NumberOfItemsShipped: number;
  NumberOfItemsUnshipped: number;
  FulfillmentChannel: string;
  BuyerInfo?: { BuyerEmail?: string; BuyerName?: string };
}

interface AmazonOrderItem {
  ASIN: string;
  SellerSKU: string;
  Title: string;
  QuantityOrdered: number;
  QuantityShipped: number;
  ItemPrice?: { CurrencyCode: string; Amount: string };
  ItemTax?: { CurrencyCode: string; Amount: string };
  PromotionDiscount?: { CurrencyCode: string; Amount: string };
  ShippingPrice?: { CurrencyCode: string; Amount: string };
  ShippingDiscount?: { CurrencyCode: string; Amount: string };
}

interface CatalogItem {
  asin: string;
  summaries?: Array<{
    marketplaceId: string;
    itemName: string;
    brandName?: string;
  }>;
  images?: Array<{
    marketplaceId: string;
    images: Array<{ link: string; variant: string }>;
  }>;
}

interface InventorySummary {
  asin: string;
  fnSku: string;
  sellerSku: string;
  productName: string;
  condition: string;
  inventoryDetails?: {
    fulfillableQuantity: number;
    inboundWorkingQuantity: number;
    inboundShippedQuantity: number;
    inboundReceivingQuantity: number;
  };
  totalQuantity: number;
}

export type { AmazonOrder, AmazonOrderItem, CatalogItem, InventorySummary };

export class AmazonClient {
  private refreshToken: string;
  private marketplaceId: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(refreshToken: string, marketplaceId?: string) {
    this.refreshToken = refreshToken;
    this.marketplaceId = marketplaceId ?? AMAZON_CONFIG.marketplaceId;
  }

  static async exchangeCodeForTokens(
    code: string
  ): Promise<{ access_token: string; refresh_token: string }> {
    const res = await fetch(`${AMAZON_CONFIG.lwaEndpoint}/auth/o2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: AMAZON_CONFIG.lwaClientId,
        client_secret: AMAZON_CONFIG.lwaClientSecret,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LWA token exchange failed: ${res.status} ${text}`);
    }

    const data: LWATokenResponse = await res.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token!,
    };
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const res = await fetch(`${AMAZON_CONFIG.lwaEndpoint}/auth/o2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
        client_id: AMAZON_CONFIG.lwaClientId,
        client_secret: AMAZON_CONFIG.lwaClientSecret,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LWA refresh failed: ${res.status} ${text}`);
    }

    const data: LWATokenResponse = await res.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
    return this.accessToken;
  }

  private async signedRequest(
    method: string,
    path: string,
    queryParams?: Record<string, string>,
    body?: unknown
  ): Promise<Response> {
    const token = await this.getAccessToken();
    const url = new URL(path, AMAZON_CONFIG.endpoint);

    if (queryParams) {
      for (const [k, v] of Object.entries(queryParams)) {
        url.searchParams.set(k, v);
      }
    }

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const bodyStr = body ? JSON.stringify(body) : "";
    const bodyHash = crypto
      .createHash("sha256")
      .update(bodyStr)
      .digest("hex");

    const sortedParams = [...url.searchParams.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`)
      .join("&");

    const canonicalHeaders =
      `host:${url.hostname}\n` +
      `x-amz-access-token:${token}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-access-token;x-amz-date";

    const canonicalRequest = [
      method,
      url.pathname,
      sortedParams,
      canonicalHeaders,
      signedHeaders,
      bodyHash,
    ].join("\n");

    const credentialScope = `${dateStamp}/${AMAZON_CONFIG.region}/execute-api/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const signingKey = getSignatureKey(
      AMAZON_CONFIG.awsSecretAccessKey,
      dateStamp,
      AMAZON_CONFIG.region,
      "execute-api"
    );
    const signature = crypto
      .createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");

    const authHeader =
      `AWS4-HMAC-SHA256 Credential=${AMAZON_CONFIG.awsAccessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers: Record<string, string> = {
      Authorization: authHeader,
      "x-amz-access-token": token,
      "x-amz-date": amzDate,
      "Content-Type": "application/json",
      "User-Agent": "ChannelPulse/1.0",
    };

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: bodyStr || undefined,
    });

    if (response.status === 429) {
      await new Promise((r) => setTimeout(r, 2000));
      return this.signedRequest(method, path, queryParams, body);
    }

    return response;
  }

  async getOrders(
    lastUpdatedAfter: string,
    nextToken?: string
  ): Promise<{
    orders: AmazonOrder[];
    nextToken?: string;
  }> {
    const params: Record<string, string> = {
      MarketplaceIds: this.marketplaceId,
      LastUpdatedAfter: lastUpdatedAfter,
      MaxResultsPerPage: "50",
    };
    if (nextToken) params.NextToken = nextToken;

    const res = await this.signedRequest("GET", "/orders/v0/orders", params);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SP-API getOrders failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    return {
      orders: data.payload?.Orders ?? [],
      nextToken: data.payload?.NextToken,
    };
  }

  async getOrderItems(
    orderId: string
  ): Promise<AmazonOrderItem[]> {
    const res = await this.signedRequest(
      "GET",
      `/orders/v0/orders/${orderId}/orderItems`
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SP-API getOrderItems failed: ${res.status} ${text}`);
    }

    const data = await res.json();
    return data.payload?.OrderItems ?? [];
  }

  async getCatalogItem(asin: string): Promise<CatalogItem | null> {
    const params: Record<string, string> = {
      marketplaceIds: this.marketplaceId,
      includedData: "summaries,images",
    };

    const res = await this.signedRequest(
      "GET",
      `/catalog/2022-04-01/items/${asin}`,
      params
    );
    if (!res.ok) return null;
    return res.json();
  }

  async getInventorySummaries(
    nextToken?: string
  ): Promise<{
    inventories: InventorySummary[];
    nextToken?: string;
  }> {
    const params: Record<string, string> = {
      details: "true",
      granularityType: "Marketplace",
      granularityId: this.marketplaceId,
      marketplaceIds: this.marketplaceId,
    };
    if (nextToken) params.nextToken = nextToken;

    const res = await this.signedRequest(
      "GET",
      "/fba/inventory/v1/summaries",
      params
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `SP-API getInventorySummaries failed: ${res.status} ${text}`
      );
    }

    const data = await res.json();
    return {
      inventories: data.payload?.inventorySummaries ?? [],
      nextToken: data.pagination?.nextToken,
    };
  }
}

function encodeRfc3986(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

function getSignatureKey(
  key: string,
  dateStamp: string,
  region: string,
  service: string
): Buffer {
  const kDate = crypto
    .createHmac("sha256", "AWS4" + key)
    .update(dateStamp)
    .digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(region).digest();
  const kService = crypto
    .createHmac("sha256", kRegion)
    .update(service)
    .digest();
  return crypto
    .createHmac("sha256", kService)
    .update("aws4_request")
    .digest();
}
