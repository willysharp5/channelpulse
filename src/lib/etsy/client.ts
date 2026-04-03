import { ETSY_CONFIG } from "./config";

interface EtsyTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface EtsyReceipt {
  receipt_id: number;
  receipt_type: number;
  order_id: number;
  seller_user_id: number;
  buyer_user_id: number;
  buyer_email: string;
  name: string;
  status: string;
  payment_method: string;
  grandtotal: { amount: number; divisor: number; currency_code: string };
  subtotal: { amount: number; divisor: number; currency_code: string };
  total_tax_cost: { amount: number; divisor: number; currency_code: string };
  total_shipping_cost: { amount: number; divisor: number; currency_code: string };
  discount_amt: { amount: number; divisor: number; currency_code: string };
  create_timestamp: number;
  update_timestamp: number;
  transactions: EtsyTransaction[];
}

export interface EtsyTransaction {
  transaction_id: number;
  listing_id: number;
  title: string;
  quantity: number;
  price: { amount: number; divisor: number; currency_code: string };
  shipping_cost: { amount: number; divisor: number; currency_code: string };
  sku: string | null;
  product_id: number | null;
}

export interface EtsyListing {
  listing_id: number;
  title: string;
  state: string;
  quantity: number;
  sku: string[];
  price: { amount: number; divisor: number; currency_code: string };
  images?: Array<{ url_fullxfull: string }>;
}

export interface EtsyShop {
  shop_id: number;
  shop_name: string;
  currency_code: string;
  url: string;
}

export class EtsyClient {
  private refreshToken: string;
  private shopId: string;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(refreshToken: string, shopId: string) {
    this.refreshToken = refreshToken;
    this.shopId = shopId;
  }

  static async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<{ access_token: string; refresh_token: string }> {
    const redirectUri = `${ETSY_CONFIG.hostName}${ETSY_CONFIG.callbackPath}`;

    const res = await fetch(ETSY_CONFIG.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: ETSY_CONFIG.apiKey,
        redirect_uri: redirectUri,
        code,
        code_verifier: codeVerifier,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Etsy token exchange failed: ${res.status} ${text}`);
    }

    const data: EtsyTokenResponse = await res.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    };
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const res = await fetch(ETSY_CONFIG.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: ETSY_CONFIG.apiKey,
        refresh_token: this.refreshToken,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Etsy token refresh failed: ${res.status} ${text}`);
    }

    const data: EtsyTokenResponse = await res.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
    return this.accessToken;
  }

  private async request<T>(path: string, params?: Record<string, string>): Promise<T> {
    const token = await this.getAccessToken();
    const url = new URL(path, ETSY_CONFIG.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": ETSY_CONFIG.apiKey,
      },
    });

    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("retry-after") ?? "5", 10);
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      return this.request<T>(path, params);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Etsy API error ${res.status}: ${text}`);
    }

    return res.json();
  }

  async getShop(): Promise<EtsyShop> {
    const data = await this.request<{ results: EtsyShop[] }>(
      `/application/shops/${this.shopId}`
    );
    return data.results?.[0] ?? (data as unknown as EtsyShop);
  }

  async getReceipts(
    minCreated?: number,
    offset = 0
  ): Promise<{ results: EtsyReceipt[]; count: number }> {
    const params: Record<string, string> = {
      limit: "25",
      offset: String(offset),
      was_paid: "true",
    };
    if (minCreated) params.min_created = String(minCreated);

    return this.request(`/application/shops/${this.shopId}/receipts`, params);
  }

  async getListings(
    offset = 0
  ): Promise<{ results: EtsyListing[]; count: number }> {
    return this.request(
      `/application/shops/${this.shopId}/listings/active`,
      { limit: "100", offset: String(offset), includes: "images" }
    );
  }

  async getListingInventory(
    listingId: number
  ): Promise<{ products: Array<{ sku: string; offerings: Array<{ quantity: number }> }> }> {
    return this.request(
      `/application/listings/${listingId}/inventory`
    );
  }

  getUpdatedRefreshToken(): string {
    return this.refreshToken;
  }
}
