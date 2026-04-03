import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/actions";
import { fetchInventoryExportRows, parseInventoryParamsFromURLSearchParams } from "@/lib/inventory-list";
import { formatDate } from "@/lib/formatters";

function csvEscape(s: string): string {
  const t = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function stockLabel(qty: number): string {
  if (qty > 20) return "Healthy";
  if (qty >= 5) return "Low";
  return "Critical";
}

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const input = parseInventoryParamsFromURLSearchParams(req.nextUrl.searchParams);
  const rows = await fetchInventoryExportRows(input);
  const header = ["Product", "SKU", "Stock", "Status", "Channel", "Platform", "Last updated"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        csvEscape(r.title),
        csvEscape(r.sku ?? ""),
        String(r.inventory_quantity),
        stockLabel(r.inventory_quantity),
        csvEscape(r.channelName),
        csvEscape(r.platform),
        r.updatedAt ? csvEscape(formatDate(r.updatedAt, "yyyy-MM-dd HH:mm")) : "",
      ].join(",")
    ),
  ];
  const day = new Date().toISOString().split("T")[0];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="channelpulse-inventory-${day}.csv"`,
    },
  });
}
