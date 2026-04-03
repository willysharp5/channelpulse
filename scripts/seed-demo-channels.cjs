/**
 * Demo / stress-test channels + daily_stats.
 *
 * Every inserted channel is tagged in metadata so it is NEVER confused with real integrations:
 *   { seed_demo: true, demo_bundle: "stress_test_v1" }
 * Real channels from OAuth/sync should not set seed_demo — safe to delete only demo rows.
 *
 * Commands (from repo root, with .env.local + SUPABASE_SERVICE_ROLE_KEY):
 *
 *   npm run seed:demo              Seed or refresh 7 demo channels + daily_stats + demo orders/products (keeps real Shopify)
 *   npm run seed:demo:list         Print demo channels (id, platform, name)
 *   npm run seed:demo:remove       Delete ALL demo channels + their daily_stats for your org
 *   npm run seed:demo:remove -- --platform=amazon
 *                                  Delete only DEMO amazon channels (keeps real Amazon)
 *
 * Optional: SEED_ORG_ID=<uuid> to target a specific org (default: first profile.org_id).
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

/** Must match on insert and on delete — only these rows are removable as “fake”. */
const DEMO_BUNDLE = "stress_test_v1";

function demoMetadata() {
  return { seed_demo: true, demo_bundle: DEMO_BUNDLE };
}

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function parseArgs(argv) {
  let remove = false;
  let list = false;
  let platform = null;
  for (const a of argv) {
    if (a === "--remove" || a === "remove") remove = true;
    else if (a === "--list" || a === "list") list = true;
    else if (a.startsWith("--platform=")) platform = a.slice("--platform=".length).trim().toLowerCase() || null;
  }
  return { remove, list, platform };
}

/**
 * Seven non-Shopify demos so a typical org is ~8 channels with one real Shopify OAuth store.
 * No fake Shopify rows — your connected Shopify stays the only `shopify` channel.
 */
const DEMO_CHANNELS = [
  { platform: "amazon", name: "Amazon demo store" },
  { platform: "ebay", name: "eBay demo store" },
  { platform: "etsy", name: "Etsy demo store" },
  { platform: "woocommerce", name: "WooCommerce demo store" },
  { platform: "tiktok", name: "TikTok Shop demo store" },
  { platform: "walmart", name: "Walmart demo store" },
  { platform: "google", name: "Google Shopping demo store" },
];

const DAYS = 90;

function chDisplayName(platform) {
  const map = {
    amazon: "Amazon",
    ebay: "eBay",
    etsy: "Etsy",
    woocommerce: "WooCommerce",
    tiktok: "TikTok Shop",
    walmart: "Walmart",
    google: "Google Shopping",
  };
  return map[platform] ?? platform;
}

function splitInteger(total, parts) {
  if (parts <= 0) return [];
  if (parts === 1) return [total];
  const out = Array(parts).fill(0);
  for (let i = 0; i < total; i++) {
    out[Math.floor(Math.random() * parts)]++;
  }
  return out;
}

function splitRevenue(total, n) {
  if (n <= 0) return [];
  if (n === 1) return [Math.round(total * 100) / 100];
  const raw = Array.from({ length: n }, () => Math.random());
  const s = raw.reduce((a, b) => a + b, 0);
  const amounts = raw.map((r) => (total * r) / s);
  const rounded = amounts.slice(0, -1).map((a) => Math.round(a * 100) / 100);
  const sumR = rounded.reduce((a, b) => a + b, 0);
  rounded.push(Math.round((total - sumR) * 100) / 100);
  return rounded;
}

/** Deletes demo orders, products, stats, then channels (products use ON DELETE SET NULL on channel). */
async function purgeDemoChannelData(supabase, ids) {
  if (!ids.length) return;
  const { error: e0 } = await supabase.from("orders").delete().in("channel_id", ids);
  if (e0) throw new Error("orders delete: " + e0.message);
  const { error: e1 } = await supabase.from("products").delete().in("channel_id", ids);
  if (e1) throw new Error("products delete: " + e1.message);
  const { error: e2 } = await supabase.from("daily_stats").delete().in("channel_id", ids);
  if (e2) throw new Error("daily_stats delete: " + e2.message);
  const { error: e3 } = await supabase.from("channels").delete().in("id", ids);
  if (e3) throw new Error("channels delete: " + e3.message);
}

async function resolveOrgId(supabase) {
  const orgId = process.env.SEED_ORG_ID;
  if (orgId) return orgId;
  const { data: profiles, error: pErr } = await supabase.from("profiles").select("org_id").not("org_id", "is", null).limit(1);
  if (pErr || !profiles?.length) {
    throw new Error("Could not resolve org_id. Set SEED_ORG_ID or ensure profiles has org_id. " + (pErr?.message ?? ""));
  }
  return profiles[0].org_id;
}

/**
 * Demo rows: seed_demo true AND (optional) demo_bundle match.
 * Older seeds may lack demo_bundle; we still match seed_demo only for list/remove.
 */
function baseDemoQuery(supabase, orgId) {
  return supabase.from("channels").select("id, platform, name, metadata").eq("org_id", orgId).contains("metadata", { seed_demo: true });
}

async function fetchDemoChannels(supabase, orgId, platformFilter) {
  let q = baseDemoQuery(supabase, orgId);
  if (platformFilter) q = q.eq("platform", platformFilter);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  // Prefer bundle-tagged rows; include legacy seed_demo-only rows when not filtering by bundle
  return rows.filter((r) => {
    const m = r.metadata || {};
    if (!m.seed_demo) return false;
    if (m.demo_bundle && m.demo_bundle !== DEMO_BUNDLE) return false;
    return true;
  });
}

async function removeDemoChannels(supabase, orgId, { platform }) {
  const rows = await fetchDemoChannels(supabase, orgId, platform);
  if (!rows.length) {
    console.log(platform ? `No demo channels for platform "${platform}".` : "No demo channels to remove.");
    return;
  }
  console.log(platform ? `Removing ${rows.length} demo channel(s) (platform=${platform}):` : `Removing ${rows.length} demo channel(s):`);
  for (const r of rows) {
    console.log("  -", r.id, r.platform, "-", r.name);
  }
  const ids = rows.map((r) => r.id);
  await purgeDemoChannelData(supabase, ids);
  console.log("Done. Real channels (no seed_demo metadata) were not touched.");
  if (rows.some((r) => !r.metadata?.demo_bundle)) {
    console.log("Note: Removed legacy demo rows (seed_demo only). New seeds use demo_bundle:", DEMO_BUNDLE);
  }
}

async function listDemoChannels(supabase, orgId) {
  const rows = await fetchDemoChannels(supabase, orgId, null);
  if (!rows.length) {
    console.log("No demo channels for this org.");
    return;
  }
  console.log(rows.length + " demo channel(s) (seed_demo + bundle " + DEMO_BUNDLE + " or legacy seed_demo):");
  for (const r of rows) {
    console.log(" ", r.id, r.platform, "-", r.name, r.metadata?.demo_bundle ? `[${r.metadata.demo_bundle}]` : "[legacy]");
  }
  console.log("\nRemove all:    npm run seed:demo:remove");
  console.log("Remove one platform only: npm run seed:demo:remove -- --platform=amazon");
}

async function seed(supabase, resolvedOrgId) {
  const existing = await fetchDemoChannels(supabase, resolvedOrgId, null);
  const oldIds = existing.map((r) => r.id);
  if (oldIds.length) {
    await purgeDemoChannelData(supabase, oldIds);
    console.log("Removed", oldIds.length, "previous demo channel(s) (orders, products, stats).");
  }

  const meta = demoMetadata();
  const channelsMeta = [];
  for (const ch of DEMO_CHANNELS) {
    const { data, error } = await supabase
      .from("channels")
      .insert({
        org_id: resolvedOrgId,
        platform: ch.platform,
        name: ch.name,
        credentials: {},
        status: "active",
        metadata: meta,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Insert channel failed:", ch.name, error.message);
      console.error("Did you apply migration 20260404120000_expand_channel_platforms.sql?");
      process.exit(1);
    }
    channelsMeta.push({ id: data.id, platform: ch.platform });
  }

  console.log("Inserted", channelsMeta.length, "demo channels (metadata.seed_demo + demo_bundle).");

  const now = new Date().toISOString();
  const productRows = [];
  for (const cm of channelsMeta) {
    for (let i = 0; i < 4; i++) {
      productRows.push({
        org_id: resolvedOrgId,
        channel_id: cm.id,
        platform: cm.platform,
        platform_product_id: `demo-${cm.platform}-listing-${i + 1}-${cm.id.slice(0, 8)}`,
        title: `${chDisplayName(cm.platform)} demo listing ${i + 1}`,
        sku: `DEMO-${cm.platform.toUpperCase()}-${i + 1}`,
        image_url: null,
        category: "Demo",
        cogs: Math.round((8 + Math.random() * 24) * 100) / 100,
        status: "active",
        inventory_quantity: 30 + Math.floor(Math.random() * 170),
        inventory_updated_at: now,
      });
    }
  }

  const { data: insertedProds, error: prodErr } = await supabase.from("products").insert(productRows).select("channel_id,title,sku");
  if (prodErr) {
    console.error("products insert failed:", prodErr.message);
    process.exit(1);
  }

  const productsByChannel = new Map();
  for (const p of insertedProds ?? []) {
    const arr = productsByChannel.get(p.channel_id) ?? [];
    arr.push({ title: p.title, sku: p.sku });
    productsByChannel.set(p.channel_id, arr);
  }
  console.log("Inserted", insertedProds?.length ?? 0, "demo products.");

  const end = new Date();
  const statRows = [];
  const orderRows = [];
  let demoOrderSeq = 0;
  const customers = ["Alex Kim", "Jordan Lee", "Sam Rivera", "Taylor Chen", "Riley Patel", "Casey Morgan", "Jamie Wu"];

  for (const cm of channelsMeta) {
    const prods = productsByChannel.get(cm.id) ?? [];
    if (!prods.length) continue;

    const base = 80 + Math.floor(Math.random() * 400);
    for (let d = 0; d < DAYS; d++) {
      const day = new Date(end);
      day.setDate(day.getDate() - d);
      const dateStr = day.toISOString().split("T")[0];
      const wave = 0.65 + 0.35 * Math.sin((d / 7) * Math.PI * 2);
      const revenue = Math.round(base * wave * (0.85 + Math.random() * 0.35) * 100) / 100;
      const orders = Math.max(1, Math.round((revenue / 85) * (0.7 + Math.random() * 0.6)));
      const total_units = orders * (1 + Math.floor(Math.random() * 4));
      const platform_fees = Math.round(revenue * 0.11 * 100) / 100;
      const estimated_cogs = Math.round(revenue * 0.32 * 100) / 100;
      const estimated_profit = Math.round((revenue - platform_fees - estimated_cogs) * 100) / 100;
      statRows.push({
        org_id: resolvedOrgId,
        channel_id: cm.id,
        date: dateStr,
        total_revenue: revenue,
        total_orders: orders,
        total_units,
        avg_order_value: Math.round((revenue / orders) * 100) / 100,
        platform_fees,
        estimated_cogs,
        estimated_profit,
      });

      const unitParts = splitInteger(total_units, orders);
      const revParts = splitRevenue(revenue, orders);
      for (let oi = 0; oi < orders; oi++) {
        const orderRev = revParts[oi];
        const units = unitParts[oi];
        if (orderRev <= 0 || units <= 0) continue;
        const prod = prods[Math.floor(Math.random() * prods.length)];
        const fees = Math.round(orderRev * 0.11 * 100) / 100;
        const cogs = Math.round(orderRev * 0.32 * 100) / 100;
        const net = Math.round((orderRev - fees - cogs) * 100) / 100;
        const sub = Math.round(orderRev * 0.88 * 100) / 100;
        const tax = Math.round(orderRev * 0.06 * 100) / 100;
        const ship = Math.round((orderRev - sub - tax) * 100) / 100;
        const hour = 10 + Math.floor(Math.random() * 10);
        const min = Math.floor(Math.random() * 60);
        const ordered_at = `${dateStr}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00.000Z`;
        orderRows.push({
          org_id: resolvedOrgId,
          channel_id: cm.id,
          platform: cm.platform,
          platform_order_id: `seed-demo-${DEMO_BUNDLE}-${++demoOrderSeq}`,
          order_number: `#D-${dateStr.slice(5)}-${oi + 1}`,
          status: "paid",
          financial_status: "paid",
          customer_name: customers[demoOrderSeq % customers.length],
          customer_email: null,
          subtotal: sub,
          total_tax: tax,
          total_shipping: ship,
          total_discounts: 0,
          total_amount: orderRev,
          currency: "USD",
          platform_fees: fees,
          cogs,
          net_profit: net,
          item_count: units,
          ordered_at,
          raw_data: { demo_lines: [{ title: prod.title, sku: prod.sku, quantity: units, revenue: orderRev }] },
        });
      }
    }
  }

  const chunk = 400;
  for (let i = 0; i < statRows.length; i += chunk) {
    const part = statRows.slice(i, i + chunk);
    const { error } = await supabase.from("daily_stats").upsert(part, { onConflict: "channel_id,date" });
    if (error) {
      console.error("daily_stats upsert failed:", error.message);
      process.exit(1);
    }
  }

  const orderChunk = 300;
  for (let i = 0; i < orderRows.length; i += orderChunk) {
    const part = orderRows.slice(i, i + orderChunk);
    const { error } = await supabase.from("orders").insert(part);
    if (error) {
      console.error("orders insert failed:", error.message);
      process.exit(1);
    }
  }

  console.log("Upserted", statRows.length, "daily_stats rows.");
  console.log("Inserted", orderRows.length, "demo orders (aligned per day with stats).");
  console.log("Remove later: npm run seed:demo:remove  |  Only fake Amazon: npm run seed:demo:remove -- --platform=amazon");
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).");
    process.exit(1);
  }

  const { remove, list, platform } = parseArgs(process.argv.slice(2));
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const resolvedOrgId = await resolveOrgId(supabase);
  console.log("Using org_id:", resolvedOrgId);

  if (list) {
    await listDemoChannels(supabase, resolvedOrgId);
    return;
  }
  if (remove) {
    await removeDemoChannels(supabase, resolvedOrgId, { platform });
    return;
  }

  await seed(supabase, resolvedOrgId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
