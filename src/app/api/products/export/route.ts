import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/actions";
import { fetchProductsExportRows, parseProductsParamsFromURLSearchParams } from "@/lib/products-list";

function csvEscape(s: string): string {
  const t = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (/[",\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const input = parseProductsParamsFromURLSearchParams(req.nextUrl.searchParams);
  const rows = await fetchProductsExportRows(input);
  const header = ["Product", "SKU", "Channel", "Units sold", "Revenue", "Category", "COGS", "Status"];
  const lines = [
    header.join(","),
    ...rows.map((p) =>
      [
        csvEscape(p.title),
        csvEscape(p.sku ?? ""),
        csvEscape(p.channelLabel),
        String(p.unitsSold),
        String(p.revenue.toFixed(2)),
        csvEscape(p.category ?? ""),
        String(Number(p.cogs ?? 0).toFixed(2)),
        csvEscape(p.status ?? ""),
      ].join(",")
    ),
  ];
  const day = new Date().toISOString().split("T")[0];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="channelpulse-products-${day}.csv"`,
    },
  });
}
