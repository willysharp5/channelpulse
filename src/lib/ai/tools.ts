import { tool, zodSchema } from "ai";
import { z } from "zod";
import {
  getDashboardStats,
  getRevenueSeries,
  getChannelRevenue,
  getPnLData,
  getTopProductsBySales,
  getRecentOrders,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { getOrgId } from "@/lib/queries";

export const aiTools = {
  getDashboardOverview: tool({
    description:
      "Get dashboard KPIs (revenue, orders, profit, AOV, units) with period-over-period % changes, plus a daily revenue time-series broken down by channel/platform.",
    inputSchema: zodSchema(
      z.object({
        days: z
          .number()
          .min(1)
          .max(365)
          .describe("Number of days to look back. Defaults to 30."),
      })
    ),
    execute: async ({ days = 30 }: { days?: number }) => {
      const [stats, revenue] = await Promise.all([
        getDashboardStats({ days }),
        getRevenueSeries({ days }),
      ]);
      return {
        kpis: stats,
        revenueSeries: revenue.series.slice(-60),
        platforms: revenue.platforms,
      };
    },
  }),

  getChannelBreakdown: tool({
    description:
      "Get per-channel revenue, order count, and revenue share percentage for comparing channel performance.",
    inputSchema: zodSchema(
      z.object({
        days: z
          .number()
          .min(1)
          .max(365)
          .describe("Number of days to look back. Defaults to 30."),
      })
    ),
    execute: async ({ days = 30 }: { days?: number }) => {
      const channels = await getChannelRevenue({ days });
      return { channels };
    },
  }),

  getProfitAndLoss: tool({
    description:
      "Get a full P&L breakdown: revenue, COGS, gross profit, gross margin, all fees, net profit, net margin, and per-channel breakdown.",
    inputSchema: zodSchema(
      z.object({
        days: z
          .number()
          .min(1)
          .max(365)
          .describe("Number of days to look back. Defaults to 30."),
      })
    ),
    execute: async ({ days = 30 }: { days?: number }) => {
      const pnl = await getPnLData({ days });
      return {
        totalRevenue: pnl.totalRevenue,
        totalOrders: pnl.totalOrders,
        cogs: pnl.cogs,
        grossProfit: pnl.grossProfit,
        grossMargin: pnl.grossMargin,
        fees: pnl.fees,
        netProfit: pnl.netProfit,
        netMargin: pnl.netMargin,
        channelBreakdown: pnl.channelBreakdown,
      };
    },
  }),

  getTopProducts: tool({
    description:
      "Get the top-selling products ranked by revenue, including units sold, revenue, and platform.",
    inputSchema: zodSchema(
      z.object({
        days: z
          .number()
          .min(1)
          .max(365)
          .describe("Number of days to look back. Defaults to 30."),
        limit: z
          .number()
          .min(1)
          .max(50)
          .describe("Max products to return. Defaults to 10."),
      })
    ),
    execute: async ({
      days = 30,
      limit = 10,
    }: {
      days?: number;
      limit?: number;
    }) => {
      const products = await getTopProductsBySales({ days }, limit);
      return { products };
    },
  }),

  getOrdersSummary: tool({
    description:
      "Get the most recent orders with platform, order number, status, customer name, amount, and date.",
    inputSchema: zodSchema(
      z.object({
        limit: z
          .number()
          .min(1)
          .max(50)
          .describe("Number of recent orders. Defaults to 10."),
      })
    ),
    execute: async ({ limit = 10 }: { limit?: number }) => {
      const orders = await getRecentOrders(limit);
      return { orders };
    },
  }),

  runAnalyticsQuery: tool({
    description: `Run a custom read-only SQL query for deeper analysis. The org_id filter is automatically injected — use $ORG_ID as a placeholder and it will be replaced.

Available tables:
- daily_stats: date, org_id, channel_id, total_revenue, total_orders, total_units, avg_order_value, platform_fees, estimated_cogs, estimated_profit
- orders: id, org_id, platform, order_number, status, financial_status, customer_name, customer_email, total_amount, subtotal, total_tax, total_shipping, total_discounts, platform_fees, net_profit, currency, item_count, ordered_at, channel_id
- products: id, org_id, title, sku, status, cogs, inventory_quantity, channel_id, platform
- channels: id, org_id, platform, name, status
- cost_settings: org_id, platform_fee_percent, shipping_cost_percent, payment_processing_percent, advertising_monthly, refund_rate_percent, other_expenses_monthly, default_cogs_percent

RULES:
- Use $ORG_ID placeholder for org_id filtering (e.g. WHERE org_id = $ORG_ID)
- Only SELECT queries
- Always include LIMIT (max 200)
- Use clear column aliases`,
    inputSchema: zodSchema(
      z.object({
        sql: z.string().describe("The SELECT SQL query. Use $ORG_ID for the org filter."),
        purpose: z.string().describe("What this query is trying to find out"),
      })
    ),
    execute: async ({ sql, purpose }: { sql: string; purpose: string }) => {
      const trimmed = sql.trim().toLowerCase();
      if (
        !trimmed.startsWith("select") ||
        /\b(insert|update|delete|drop|alter|truncate|create)\b/i.test(sql)
      ) {
        return { rows: [], note: "Query was blocked. Use getDashboardOverview or getChannelBreakdown instead." };
      }

      const orgId = await getOrgId();
      if (!orgId) return { rows: [], note: "Use getDashboardOverview instead." };

      try {
        const supabase = await createClient();
        // Auto-inject org_id — replace placeholder OR add WHERE clause
        let finalSql = sql.replace(/\$ORG_ID/g, `'${orgId}'`);
        if (!finalSql.toLowerCase().includes(orgId)) {
          // AI forgot the org_id filter — inject it automatically
          const fromMatch = finalSql.match(/\bFROM\s+(\w+)/i);
          const table = fromMatch?.[1];
          if (table && ["daily_stats", "orders", "products", "channels", "cost_settings"].includes(table)) {
            if (finalSql.toLowerCase().includes("where")) {
              finalSql = finalSql.replace(/\bWHERE\b/i, `WHERE ${table}.org_id = '${orgId}' AND`);
            } else {
              const limitMatch = finalSql.match(/\b(LIMIT|GROUP|ORDER|HAVING)\b/i);
              if (limitMatch?.index) {
                finalSql = finalSql.slice(0, limitMatch.index) + `WHERE ${table}.org_id = '${orgId}' ` + finalSql.slice(limitMatch.index);
              } else {
                finalSql += ` WHERE ${table}.org_id = '${orgId}'`;
              }
            }
          }
        }

        // Ensure LIMIT exists
        if (!/\bLIMIT\b/i.test(finalSql)) {
          finalSql += " LIMIT 200";
        }

        const { data, error } = await supabase.rpc("safe_readonly_query", {
          sql_text: finalSql,
        });

        if (error) {
          return {
            rows: [],
            purpose,
            note: "This query did not return results. Do NOT mention this to the user. Use getDashboardOverview or getChannelBreakdown instead to answer the question.",
          };
        }

        return {
          rows: data ?? [],
          rowCount: Array.isArray(data) ? data.length : 0,
          purpose,
        };
      } catch {
        return {
          rows: [],
          purpose,
          note: "This query did not return results. Do NOT mention this to the user. Use getDashboardOverview or getChannelBreakdown instead to answer the question.",
        };
      }
    },
  }),
};
