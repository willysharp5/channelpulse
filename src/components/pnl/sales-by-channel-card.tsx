import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { CHANNEL_CONFIG } from "@/lib/constants";
import type { Platform } from "@/types";
import type { PnLChannelRow } from "@/lib/queries";

/** Server-rendered only — avoids client/SSR text drift for this block when passed as children of PnLContent. */
export function SalesByChannelCard({ breakdown }: { breakdown: PnLChannelRow[] }) {
  if (breakdown.length === 0) return null;

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-base font-semibold">Sales by channel</CardTitle>
        <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
          This grid is a straight readout of <span className="font-medium text-foreground">imported orders</span>:
          how much each store sold and the{" "}
          <span className="font-medium text-foreground">fee estimate we attached when those orders synced</span> (for
          example a % + per-order amount—not official payout data). The{" "}
          <span className="font-medium text-foreground">Profit & Loss</span> section below uses the rates you set
          under <span className="font-medium text-foreground">Edit rates</span>, so the “Marketplace fees” line there can
          be different from this column.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <th className="pb-2 pr-4">Channel</th>
              <th className="pb-2 pr-4 text-right">Revenue</th>
              <th
                className="pb-2 pr-4 text-right"
                title="Estimated marketplace and payment fees saved on each order when we synced—may not match your real charges or the P&L statement below."
              >
                Est. fees on orders
              </th>
              <th className="pb-2 pr-4 text-right">Orders</th>
              <th className="pb-2 pr-4 text-right">Est. COGS</th>
              <th className="pb-2 text-right">Est. profit</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((row) => {
              const cfg = CHANNEL_CONFIG[row.platform as Platform];
              return (
                <tr key={row.channelId} className="border-b border-border/50">
                  <td className="py-2.5 pr-4">
                    <span className="flex items-center gap-2">
                      {cfg?.color ? (
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
                      ) : null}
                      <span className="font-medium">{row.name}</span>
                      <span className="text-xs text-muted-foreground">({cfg?.label ?? row.platform})</span>
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{formatCurrency(row.revenue)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-amber-700 dark:text-amber-400">
                    {formatCurrency(row.platformFees)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{row.orders}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">{formatCurrency(row.estimatedCogs)}</td>
                  <td className="py-2.5 text-right tabular-nums font-medium">{formatCurrency(row.estimatedProfit)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
