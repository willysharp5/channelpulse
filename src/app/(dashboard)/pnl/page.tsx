import { Info } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getPnLData } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { formatCurrency } from "@/lib/formatters";
import { CHANNEL_CONFIG } from "@/lib/constants";
import type { Platform } from "@/types";

export const dynamic = "force-dynamic";

function PnlTip({ tip }: { tip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />} />
      <TooltipContent side="top" className="max-w-[280px] text-xs">{tip}</TooltipContent>
    </Tooltip>
  );
}

function PnLRow({
  label,
  value,
  indent = false,
  bold = false,
  negative = false,
  highlight = false,
  color,
  tooltip,
}: {
  label: string;
  value: number;
  indent?: boolean;
  bold?: boolean;
  negative?: boolean;
  highlight?: boolean;
  color?: string;
  tooltip?: string;
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
        {tooltip && (
          <Tooltip>
            <TooltipTrigger render={<Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />} />
            <TooltipContent side="top" className="max-w-[260px] text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
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
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Total Revenue
                <PnlTip tip="Gross revenue from all connected channels before any deductions. Sum of all order amounts including tax and shipping." />
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
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Gross Margin
                <PnlTip tip={`Percentage of revenue remaining after COGS. Calculated as: (Revenue - COGS) ÷ Revenue × 100 = (${formatCurrency(pnl.totalRevenue)} - ${formatCurrency(pnl.cogs)}) ÷ ${formatCurrency(pnl.totalRevenue)} = ${pnl.grossMargin.toFixed(1)}%.`} />
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
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                Net Profit
                <PnlTip tip={`Your bottom line after all costs. Calculated as: Gross Profit (${formatCurrency(pnl.grossProfit)}) - Total Expenses (${formatCurrency(pnl.fees.total)}) = ${formatCurrency(pnl.netProfit)}. Net margin: ${pnl.netMargin.toFixed(1)}%.`} />
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
              <PnLRow label="Total Revenue" value={pnl.totalRevenue} bold tooltip="Sum of all order amounts across all connected channels for this period." />

              <div className="h-4" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Cost of Goods Sold
              </p>
              <PnLRow label="Product Costs" value={pnl.cogs} indent negative tooltip="Sum of COGS values you've entered for each product. Set per-product COGS in Settings." />
              <Separator className="my-2" />
              <PnLRow label="Gross Profit" value={pnl.grossProfit} bold tooltip="Revenue minus Cost of Goods Sold. Calculated as: Total Revenue - Product Costs." />
              <p className="text-xs text-muted-foreground text-right">
                {pnl.grossMargin.toFixed(1)}% margin
              </p>

              <div className="h-4" />
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Fees & Expenses
              </p>
              <PnLRow label="Marketplace Fees" value={pnl.fees.marketplace} indent negative tooltip="Fees charged by the marketplace (Shopify, Amazon, etc.) per transaction. Pulled from order data." />
              <PnLRow label="Shipping Costs" value={pnl.fees.shipping} indent negative tooltip="Estimated shipping costs. Calculated as: Total Revenue × 3.5%." />
              <PnLRow label="Payment Processing" value={pnl.fees.processing} indent negative tooltip="Payment gateway fees. Estimated as: Total Revenue × 2.9%." />
              <PnLRow label="Advertising" value={pnl.fees.advertising} indent negative tooltip="Monthly advertising spend. Currently set to a flat $2,500/month estimate." />
              <PnLRow label="Returns & Refunds" value={pnl.fees.refunds} indent negative tooltip="Estimated returns and refunds. Calculated as: Total Revenue × 2%." />
              <Separator className="my-2" />
              <PnLRow label="Total Expenses" value={pnl.fees.total} bold negative tooltip="Sum of all fees and expenses: Marketplace Fees + Shipping + Processing + Advertising + Returns." />

              <div className="h-2" />
              <Separator className="my-2 border-2" />
              <PnLRow label="NET PROFIT" value={pnl.netProfit} bold highlight tooltip="Your bottom line. Calculated as: Gross Profit - Total Expenses. This is what you actually take home after all costs." />
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
