import crypto from "crypto";
import { TIKTOK_CONFIG } from "./config";

interface TikTokTokenResponse {
  code: number;
  message: string;
  data: {
    access_token: string;
    refresh_token: string;
    access_token_expire_in: number;
    refresh_token_expire_in: number;
    open_id: string;
    seller_name: string;
  };
}

export interface TikTokOrder {
  order_id: string;
  order_status: string;
  payment_info: {
    total_amount: string;
    sub_total: string;
    shipping_fee: string;
    tax: string;
    platform_discount: string;
    seller_discount: string;
    currency: string;
  };
  buyer_message?: string;
  create_time: number;
  update_time: number;
  item_list: TikTokOrderItem[];
}

export interface TikTokOrderItem {
  product_id: string;
  product_name: string;
  sku_id: string;
  sku_name: string;
  quantity: number;
  sale_price: string;
}

export interface TikTokProduct {
  product_id: string;
  product_name: string;
  product_status: number;
  skus: Array<{
    id: string;
    seller_sku: string;
    stock_infos: Array<{ available_stock: number }>;
    price: { sale_price: string; currency: string };
  }>;
  images?: Array<{ url: string }>;
}

export class TikTokClient {
  private accessToken: string;
  private refreshToken: string;
  private shopCipher: string;
  private tokenExpiresAt = 0;

  constructor(accessToken: string, refreshToken: string, shopCipher: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.shopCipher = shopCipher;
  }

  static async exchangeCodeForTokens(
    authCode: string
  ): Promise<{
    access_token: string;
    refresh_token: string;
    open_id: string;
    seller_name: string;
    expires_in: number;
  }> {
    const url = new URL(TIKTOK_CONFIG.tokenUrl);
    url.searchParams.set("app_key", TIKTOK_CONFIG.appKey);
    url.searchParams.set("app_secret", TIKTOK_CONFIG.appSecret);
    url.searchParams.set("auth_code", authCode);
    url.searchParams.set("grant_type", "authorized_code");

    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`TikTok token exchange failed: ${res.status} ${text}`);
    }

    const data: TikTokTokenResponse = await res.json();
    if (data.code !== 0) {
      throw new Error(`TikTok token error: ${data.message}`);
    }

    return {
      access_token: data.data.access_token,
      refresh_token: data.data.refresh_token,
      open_id: data.data.open_id,
      seller_name: data.data.seller_name,
      expires_in: data.data.access_token_expire_in,
    };
  }

  private async ensureToken(): Promise<void> {
    if (Date.now() < this.tokenExpiresAt - 60_000) return;

    const url = new URL(TIKTOK_CONFIG.refreshUrl);
    url.searchParams.set("app_key", TIKTOK_CONFIG.appKey);
    url.searchParams.set("app_secret", TIKTOK_CONFIG.appSecret);
    url.searchParams.set("refresh_token", this.refreshToken);
    url.searchParams.set("grant_type", "refresh_token");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`TikTok token refresh failed: ${res.status}`);

    const data: TikTokTokenResponse = await res.json();
    if (data.code !== 0) throw new Error(`TikTok refresh error: ${data.message}`);

    this.accessToken = data.data.access_token;
    this.refreshToken = data.data.refresh_token;
    this.tokenExpiresAt = Date.now() + data.data.access_token_expire_in * 1000;
  }

  private sign(path: string, params: Record<string, string>, body?: string): string {
    const sortedKeys = Object.keys(params).sort();
    const paramStr = sortedKeys.map((k) => `${k}${params[k]}`).join("");
    const signStr = `${TIKTOK_CONFIG.appSecret}${path}${paramStr}${body ?? ""}${TIKTOK_CONFIG.appSecret}`;
    return crypto.createHmac("sha256", TIKTOK_CONFIG.appSecret).update(signStr).digest("hex");
  }

  private async request<T>(
    method: string,
    path: string,
    queryParams?: Record<string, string>,
    body?: unknown
  ): Promise<T> {
    await this.ensureToken();

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const params: Record<string, string> = {
      app_key: TIKTOK_CONFIG.appKey,
      timestamp,
      shop_cipher: this.shopCipher,
      access_token: this.accessToken,
      ...queryParams,
    };

    const bodyStr = body ? JSON.stringify(body) : undefined;
    const signature = this.sign(path, params, bodyStr);
    params.sign = signature;

    const url = new URL(path, TIKTOK_CONFIG.apiBase);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const res = await fetch(url.toString(), {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: bodyStr,
    });

    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000));
      return this.request<T>(method, path, queryParams, body);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`TikTok API ${res.status}: ${text}`);
    }

    const json = await res.json();
    if (json.code !== 0) {
      throw new Error(`TikTok API error: ${json.message}`);
    }

    return json.data;
  }

  async searchOrders(
    createTimeFrom: number,
    createTimeTo: number,
    cursor?: string
  ): Promise<{ orders: TikTokOrder[]; nextCursor?: string; total: number }> {
    const data = await this.request<{
      order_list: TikTokOrder[];
      next_cursor: string;
      total_count: number;
    }>("POST", "/api/orders/search", undefined, {
      create_time_ge: createTimeFrom,
      create_time_lt: createTimeTo,
      page_size: 50,
      ...(cursor ? { cursor } : {}),
    });

    return {
      orders: data.order_list ?? [],
      nextCursor: data.next_cursor || undefined,
      total: data.total_count ?? 0,
    };
  }

  async getProducts(
    cursor?: string
  ): Promise<{ products: TikTokProduct[]; nextCursor?: string; total: number }> {
    const data = await this.request<{
      products: TikTokProduct[];
      next_cursor: string;
      total_count: number;
    }>("POST", "/api/products/search", undefined, {
      page_size: 50,
      ...(cursor ? { cursor } : {}),
    });

    return {
      products: data.products ?? [],
      nextCursor: data.next_cursor || undefined,
      total: data.total_count ?? 0,
    };
  }

  getUpdatedTokens() {
    return {
      access_token: this.accessToken,
      refresh_token: this.refreshToken,
    };
  }
}
