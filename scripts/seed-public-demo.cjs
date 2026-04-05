/**
 * Seed the public read-only demo org (fixed UUID in src/lib/demo-data.ts).
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 *   npm run seed:public-demo
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const DEMO_ORG_ID = "c0ffee00-0000-4000-8000-00000000d3b0";
const BUNDLE = "public_site_demo_v1";

const PRODUCT_NAMES = [
  "Merino Crew Sweater — Heather Gray",
  "Linen Button Shirt — Olive",
  "Slim Taper Denim — Indigo",
  "Canvas Weekender Bag — Natural",
  "Ceramic Pour-Over Set",
  "Wireless Earbuds Case — Leather",
  "Stainless Travel Mug 20oz",
  "Organic Cotton Tee — Black",
  "Wool Beanie — Charcoal",
  "Ripstop Utility Jacket — Navy",
  "Yoga Mat Pro — 5mm",
  "Scented Candle Trio",
  "Desk Organizer — Walnut",
  "Running Shorts 7\" — Graphite",
  "Insulated Water Bottle 32oz",
  "Cashmere Scarf — Camel",
  "Bluetooth Speaker Mini",
  "Ceramic Plant Pot Set",
  "Performance Polo — White",
  "Leather Card Wallet — Brown",
  "Hiking Socks 3-Pack",
  "French Press Glass 34oz",
  "Quilted Tote — Sand",
  "LED Desk Lamp — Matte Black",
  "Fleece Zip Hoodie — Forest",
  "Stoneware Bowl Set",
  "Board Shorts — Coral",
  "Mechanical Keyboard — TKL",
  "Silk Sleep Mask",
  "Trail Running Shoes — Slate",
];

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

const meta = () => ({
  public_demo: true,
  seed_demo: true,
  demo_bundle: BUNDLE,
});

async function purgeOrg(supabase) {
  const { data: ch } = await supabase.from("channels").select("id").eq("org_id", DEMO_ORG_ID);
  const ids = (ch ?? []).map((r) => r.id);
  if (ids.length) {
    await supabase.from("orders").delete().in("channel_id", ids);
    await supabase.from("products").delete().in("channel_id", ids);
    await supabase.from("daily_stats").delete().in("channel_id", ids);
    await supabase.from("channel_pnl_settings").delete().eq("org_id", DEMO_ORG_ID);
    await supabase.from("channels").delete().in("id", ids);
  }
  await supabase.from("alerts").delete().eq("org_id", DEMO_ORG_ID);
  await supabase.from("cost_settings").delete().eq("org_id", DEMO_ORG_ID);
  await supabase.from("chat_threads").delete().eq("org_id", DEMO_ORG_ID);
  await supabase.from("organizations").delete().eq("id", DEMO_ORG_ID);
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  await purgeOrg(supabase);
  console.log("Cleared previous public demo org data (if any).");

  const { error: orgErr } = await supabase.from("organizations").insert({
    id: DEMO_ORG_ID,
    slug: "channelpulse-public-demo",
    name: "Northwind Collective (Demo)",
    onboarding_completed: true,
    notification_preferences: {},
    reporting_preferences: { excluded_channel_ids: [] },
  });
  if (orgErr) {
    console.error("organizations insert:", orgErr.message);
    process.exit(1);
  }

  const costRow = {
    org_id: DEMO_ORG_ID,
    platform_fee_percent: 2.9,
    platform_fee_flat: 0.3,
    shipping_cost_percent: 3.5,
    payment_processing_percent: 2.9,
    advertising_monthly: 400,
    refund_rate_percent: 2,
    other_expenses_monthly: 150,
    default_cogs_percent: 35,
    cogs_method: "per_product",
    use_modeled_platform_fees: false,
  };
  let { error: costErr } = await supabase.from("cost_settings").insert(costRow);
  if (costErr && /use_modeled_platform_fees|schema cache/i.test(costErr.message)) {
    const { use_modeled_platform_fees: _, ...fallback } = costRow;
    const retry = await supabase.from("cost_settings").insert(fallback);
    costErr = retry.error;
  }
  if (costErr) {
    console.error("cost_settings insert:", costErr.message);
    process.exit(1);
  }

  const channelsInsert = [
    {
      org_id: DEMO_ORG_ID,
      platform: "shopify",
      name: "Northwind Supply Co.",
      platform_store_id: "northwind-demo.myshopify.com",
      credentials: {},
      status: "active",
      metadata: { ...meta(), shop_domain: "northwind-demo.myshopify.com" },
    },
    {
      org_id: DEMO_ORG_ID,
      platform: "amazon",
      name: "Northwind Amazon US",
      platform_store_id: "DEMO-AMZ-NA1",
      credentials: {},
      status: "active",
      metadata: meta(),
    },
  ];

  const { data: chRows, error: chErr } = await supabase.from("channels").insert(channelsInsert).select("id, platform");
  if (chErr || !chRows?.length) {
    console.error("channels insert:", chErr?.message);
    process.exit(1);
  }

  const shopifyCh = chRows.find((c) => c.platform === "shopify");
  const amazonCh = chRows.find((c) => c.platform === "amazon");
  if (!shopifyCh || !amazonCh) {
    console.error("Expected shopify + amazon channels");
    process.exit(1);
  }

  const now = new Date().toISOString();
  const productRows = [];
  for (let i = 0; i < 30; i++) {
    const ch = i < 16 ? shopifyCh : amazonCh;
    const inv = i % 7 === 0 ? 0 : i % 5 === 0 ? 8 : 25 + Math.floor(Math.random() * 120);
    productRows.push({
      org_id: DEMO_ORG_ID,
      channel_id: ch.id,
      platform: ch.platform,
      platform_product_id: `demo-${ch.platform}-sku-${i + 1}`,
      title: PRODUCT_NAMES[i] ?? `Demo product ${i + 1}`,
      sku: `NW-${ch.platform.toUpperCase().slice(0, 2)}-${1000 + i}`,
      image_url: `https://picsum.photos/seed/nwdemo${i}/96/96`,
      category: i % 3 === 0 ? "Apparel" : i % 3 === 1 ? "Home" : "Accessories",
      cogs: Math.round((12 + Math.random() * 28) * 100) / 100,
      status: "active",
      inventory_quantity: inv,
      inventory_updated_at: now,
    });
  }

  const { data: insertedProds, error: pErr } = await supabase.from("products").insert(productRows).select("id, channel_id, title, sku, platform");
  if (pErr) {
    console.error("products insert:", pErr.message);
    process.exit(1);
  }

  const productsByChannel = new Map();
  for (const p of insertedProds ?? []) {
    const arr = productsByChannel.get(p.channel_id) ?? [];
    arr.push(p);
    productsByChannel.set(p.channel_id, arr);
  }

  const customers = [
    "Alex Kim",
    "Jordan Lee",
    "Sam Rivera",
    "Taylor Chen",
    "Riley Patel",
    "Casey Morgan",
    "Jamie Wu",
    "Morgan Blake",
    "Quinn Foster",
    "Avery Brooks",
  ];
  const statuses = ["fulfilled", "fulfilled", "fulfilled", "fulfilled", "fulfilled", "fulfilled", "fulfilled", "paid", "paid", "pending", "cancelled"];

  const end = new Date();
  const statRows = [];
  const orderRows = [];
  let orderSeq = 0;
  const TARGET_ORDERS = 200;

  const ordersPerDayPerCh = Math.ceil(TARGET_ORDERS / (30 * 2));

  for (let d = 0; d < 30; d++) {
    const day = new Date(end);
    day.setDate(day.getDate() - d);
    const dateStr = day.toISOString().split("T")[0];
    const trend = 0.75 + (d / 30) * 0.35 + Math.sin((d / 7) * Math.PI * 2) * 0.08;

    for (const cm of chRows) {
      const base = cm.platform === "shopify" ? 420 : 280;
      const revenue = Math.round(base * trend * (0.88 + Math.random() * 0.28) * 100) / 100;
      const orders = Math.max(2, Math.min(ordersPerDayPerCh + Math.floor(Math.random() * 3), 12));
      const total_units = orders * (1 + Math.floor(Math.random() * 3));
      const platform_fees = Math.round(revenue * 0.12 * 100) / 100;
      const estimated_cogs = Math.round(revenue * 0.38 * 100) / 100;
      const estimated_profit = Math.round((revenue - platform_fees - estimated_cogs) * 100) / 100;

      statRows.push({
        org_id: DEMO_ORG_ID,
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

      const prods = productsByChannel.get(cm.id) ?? [];
      if (!prods.length) continue;

      const unitParts = splitInteger(total_units, orders);
      const revParts = splitRevenue(revenue, orders);
      for (let oi = 0; oi < orders; oi++) {
        const orderRev = revParts[oi];
        const units = unitParts[oi];
        if (orderRev <= 0 || units <= 0) continue;
        const prod = prods[Math.floor(Math.random() * prods.length)];
        const fees = Math.round(orderRev * 0.12 * 100) / 100;
        const cogs = Math.round(orderRev * 0.38 * 100) / 100;
        const net = Math.round((orderRev - fees - cogs) * 100) / 100;
        const sub = Math.round(orderRev * 0.86 * 100) / 100;
        const tax = Math.round(orderRev * 0.07 * 100) / 100;
        const ship = Math.round((orderRev - sub - tax) * 100) / 100;
        const hour = 9 + Math.floor(Math.random() * 12);
        const min = Math.floor(Math.random() * 60);
        const ordered_at = `${dateStr}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00.000Z`;
        const st = statuses[orderSeq % statuses.length];
        orderSeq++;
        orderRows.push({
          org_id: DEMO_ORG_ID,
          channel_id: cm.id,
          platform: cm.platform,
          platform_order_id: `pub-demo-${BUNDLE}-${orderSeq}`,
          order_number: `#NW-${dateStr.slice(5)}-${oi + 1}`,
          status: st,
          financial_status: st === "cancelled" ? "voided" : "paid",
          customer_name: customers[orderSeq % customers.length],
          customer_email: null,
          subtotal: sub,
          total_tax: tax,
          total_shipping: ship,
          total_discounts: st === "pending" ? Math.round(orderRev * 0.05 * 100) / 100 : 0,
          total_amount: orderRev,
          currency: "USD",
          platform_fees: fees,
          cogs,
          net_profit: net,
          item_count: units,
          ordered_at,
          raw_data: {
            demo_lines: [{ title: prod.title, sku: prod.sku, quantity: units, revenue: orderRev }],
          },
        });
      }
    }
  }

  for (let i = 0; i < statRows.length; i += 400) {
    const { error } = await supabase.from("daily_stats").upsert(statRows.slice(i, i + 400), { onConflict: "channel_id,date" });
    if (error) {
      console.error("daily_stats upsert:", error.message);
      process.exit(1);
    }
  }

  for (let i = 0; i < orderRows.length; i += 300) {
    const { error } = await supabase.from("orders").insert(orderRows.slice(i, i + 300));
    if (error) {
      console.error("orders insert:", error.message);
      process.exit(1);
    }
  }

  const lowSkus = (insertedProds ?? []).filter((p) => {
    const row = productRows.find((r) => r.sku === p.sku);
    return row && row.inventory_quantity < 6 && row.inventory_quantity > 0;
  });
  const alertRows = lowSkus.slice(0, 4).map((p, i) => {
    const row = productRows.find((r) => r.sku === p.sku);
    const qty = row?.inventory_quantity ?? 0;
    return {
      org_id: DEMO_ORG_ID,
      type: "low_stock",
      severity: "warning",
      title: "Low stock",
      message: `${p.title} is running low (${qty} units).`,
      metadata: { sku: p.sku, product_id: p.id },
      is_read: i > 0,
      is_dismissed: false,
    };
  });

  if (alertRows.length) {
    const { error: aErr } = await supabase.from("alerts").insert(alertRows);
    if (aErr) console.warn("alerts insert:", aErr.message);
  }

  console.log("Public demo seeded.");
  console.log("  org_id:", DEMO_ORG_ID);
  console.log("  channels:", chRows.length);
  console.log("  products:", insertedProds?.length ?? 0);
  console.log("  daily_stats rows:", statRows.length);
  console.log("  orders:", orderRows.length);
  console.log("  alerts:", alertRows.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
