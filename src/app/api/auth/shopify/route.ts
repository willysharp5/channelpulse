import { NextResponse } from "next/server";
import crypto from "crypto";
import { getShopifyAuthUrl } from "@/lib/shopify/config";
import { createClient } from "@/lib/supabase/server";

function cleanShopDomain(raw: string): string | null {
  let domain = raw.trim();
  // Strip protocol
  domain = domain.replace(/^https?:\/\//, "");
  // Strip trailing slashes and paths
  domain = domain.split("/")[0];
  // Strip any whitespace or special chars
  domain = domain.toLowerCase().trim();
  // Handle admin.shopify.com/store/xxx format
  if (domain.startsWith("admin.shopify.com")) {
    const parts = raw.split("/store/");
    if (parts[1]) {
      domain = parts[1].split("/")[0].trim() + ".myshopify.com";
    }
  }
  // Add .myshopify.com if missing
  if (!domain.includes(".myshopify.com")) {
    domain = domain + ".myshopify.com";
  }
  // Strip any extra dots or spaces
  domain = domain.replace(/\s/g, "");
  // Validate
  if (/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)) {
    return domain;
  }
  console.error("Shop domain validation failed:", { raw, cleaned: domain });
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawShop = searchParams.get("shop") ?? "";
  const shop = cleanShopDomain(rawShop);

  if (!shop) {
    return NextResponse.json(
      { error: "Invalid shop domain. Use format: your-store.myshopify.com" },
      { status: 400 }
    );
  }

  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Generate state with user ID for security
  const state = crypto.randomBytes(16).toString("hex") + ":" + user.id;

  const authUrl = getShopifyAuthUrl(shop, state);
  return NextResponse.redirect(authUrl);
}
