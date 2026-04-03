import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/actions";
import { fetchOrdersExportRows, parseOrdersParamsFromURLSearchParams } from "@/lib/orders-list";

function csvEscape(s: string): string {
  const t = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const input = parseOrdersParamsFromURLSearchParams(req.nextUrl.searchParams);
  const rows = await fetchOrdersExportRows(input);
  const header = ["Order #", "Channel", "Customer", "Amount", "Fees", "Profit", "Status", "Items", "Date"];
  const lines = [
    header.join(","),
    ...rows.map((o) =>
      [
        csvEscape(o.order_number ?? ""),
        csvEscape(o.platform),
        csvEscape(o.customer_name ?? ""),
        String(Number(o.total_amount ?? 0).toFixed(2)),
        String(Number(o.platform_fees ?? 0).toFixed(2)),
        String(Number(o.net_profit ?? 0).toFixed(2)),
        csvEscape(o.status ?? ""),
        String(o.item_count ?? 0),
        csvEscape(o.ordered_at),
      ].join(",")
    ),
  ];
  const day = new Date().toISOString().split("T")[0];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="channelpulse-orders-${day}.csv"`,
    },
  });
}
