import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getPnLData } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { formatCurrency } from "@/lib/formatters";
import { CHANNEL_CONFIG } from "@/lib/constants";
import type { Platform } from "@/types";

export const dynamic = "force-dynamic";

function PnLRow({
  label,
  value,
  indent = false,
  bold = false,
  negative = false,
  highlight = false,
  color,
}: {
  label: string;
  value: number;
  indent?: boolean;
  bold?: boolean;
  negative?: boolean;
  highlight?: boolean;
  color?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 ${
        indent ? "pl-6" : ""
      } ${bold ? "font-semibold" : ""} ${highlight ? "text-lg py-3" : ""}`}
    >
      <span className="flex items-center gap-2">
        {color && (
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        )}
        {label}
      </span>
      <span className={`tabular-nums ${negative ? "text-red-500" : ""}`}>
        {negative ? "-" : ""}
        {formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

export default async function PnLPage() {
  const [user, pnl] = await Promise.all([
    getSession(),
    getPnLData(30),
  ]);

  const periodLabel = "Last 30 Days";

  return (
    <>
      <Header title="Profit & Loss" userEmail={user?.email ?? undefined} />
      <div className="flex-1 space-y-6 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {formatCurrency(pnl.totalRevenue)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gross Margin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums text-emerald-500">
                {pnl.grossMargin.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold tabular-nums ${pnl.netProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                {formatCurrency(pnl.netProfit)}
              </div>
              <p className="text-xs text-muted-foreground">
                {pnl.netMargin.toFixed(1)}% margin
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">
              Profit & Loss Statement — {periodLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="max-w-2xl">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Revenue
              </p>
              {Object.entries(pnl.revenueByPlatform).map(([platform, revenue]) => {
                const config = CHANNEL_CONFIG[platform as Platform];
                return revenue > 0 ? (
                  <PnLRow
                    key={platform}
                    label={`${config?.label ?? platform} Sales`}
                    value={revenue}
                    indent
                    color={config?.color}
                  />
                ) : null;
              })}
              <Separator className="my-2" />
              <PnLRow label="Total Revenue" value={pnl.totalRevenue} bold />

              <div className="h-4" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Cost of Goods Sold
              </p>
              <PnLRow label="Product Costs" value={pnl.cogs} indent negative />
              <Separator className="my-2" />
              <PnLRow label="Gross Profit" value={pnl.grossProfit} bold />
              <p className="text-xs text-muted-foreground text-right">
                {pnl.grossMargin.toFixed(1)}% margin
              </p>

              <div className="h-4" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Fees & Expenses
              </p>
              <PnLRow label="Marketplace Fees" value={pnl.fees.marketplace} indent negative />
              <PnLRow label="Shipping Costs" value={pnl.fees.shipping} indent negative />
              <PnLRow label="Payment Processing" value={pnl.fees.processing} indent negative />
              <PnLRow label="Advertising" value={pnl.fees.advertising} indent negative />
              <PnLRow label="Returns & Refunds" value={pnl.fees.refunds} indent negative />
              <Separator className="my-2" />
              <PnLRow label="Total Expenses" value={pnl.fees.total} bold negative />

              <div className="h-2" />
              <Separator className="my-2 border-2" />
              <PnLRow label="NET PROFIT" value={pnl.netProfit} bold highlight />
              <p className="text-xs text-muted-foreground text-right">
                {pnl.netMargin.toFixed(1)}% net margin
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
