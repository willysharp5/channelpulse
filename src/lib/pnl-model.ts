/** Org-wide cost settings fields used by P&L math (avoids circular imports with queries). */
export type PnLCostSettingsInput = {
  use_modeled_platform_fees: boolean;
  platform_fee_percent: number;
  platform_fee_flat: number;
  shipping_cost_percent: number;
  payment_processing_percent: number;
  advertising_monthly: number;
  refund_rate_percent: number;
  other_expenses_monthly: number;
};

/** Per-store optional overrides; null = use org-wide default for that field. */
export type ChannelPnlOverride = {
  channelId: string;
  platform_fee_percent: number | null;
  platform_fee_flat: number | null;
  marketing_monthly: number | null;
  shipping_cost_percent: number | null;
  payment_processing_percent: number | null;
};

type ChannelAgg = {
  channelId: string;
  revenue: number;
  orders: number;
  storedPlatformFees: number;
};

const overrideMap = (rows: ChannelPnlOverride[]) =>
  new Map(rows.map((r) => [r.channelId, r]));

/**
 * Marketplace / platform fees for P&L.
 * - Synced path: use sum of stored order fees when > 0 and not forcing modeled rates.
 * - Modeled path: sum per channel (rev × % + orders × flat) using per-store overrides when set.
 */
export function computeMarketplaceFees(
  costSettings: PnLCostSettingsInput,
  channelAggs: ChannelAgg[],
  overrides: ChannelPnlOverride[],
): number {
  const storedTotal = channelAggs.reduce((s, c) => s + c.storedPlatformFees, 0);
  const om = overrideMap(overrides);

  if (costSettings.use_modeled_platform_fees) {
    let sum = 0;
    for (const ch of channelAggs) {
      const o = om.get(ch.channelId);
      const pct = o?.platform_fee_percent ?? costSettings.platform_fee_percent;
      const flat = o?.platform_fee_flat ?? costSettings.platform_fee_flat;
      sum += (ch.revenue * pct) / 100 + ch.orders * flat;
    }
    return sum;
  }

  if (storedTotal > 0) return storedTotal;

  const totalRev = channelAggs.reduce((s, c) => s + c.revenue, 0);
  const totalOrd = channelAggs.reduce((s, c) => s + c.orders, 0);
  return (totalRev * costSettings.platform_fee_percent) / 100 + totalOrd * costSettings.platform_fee_flat;
}

/** Shared + per-store marketing (monthly amounts; not prorated by date range — same as org field). */
export function computeAdvertisingMonthly(
  orgAdvertisingMonthly: number,
  overrides: ChannelPnlOverride[],
): number {
  let extra = 0;
  for (const o of overrides) {
    if (o.marketing_monthly != null && Number.isFinite(o.marketing_monthly)) {
      extra += o.marketing_monthly;
    }
  }
  return orgAdvertisingMonthly + extra;
}

/**
 * Revenue × % fee: either one org % on total revenue, or (when any per-store % is set)
 * sum over channels of (that channel's revenue × effective % for that channel).
 */
function computeAllocatedRevenuePercent(
  totalRevenue: number,
  channelAggs: ChannelAgg[],
  overrides: ChannelPnlOverride[],
  orgPct: number,
  key: "shipping_cost_percent" | "payment_processing_percent",
): number {
  if (channelAggs.length === 0) {
    return (totalRevenue * orgPct) / 100;
  }
  const anyOverride = overrides.some((o) => o[key] != null);
  if (!anyOverride) {
    return (totalRevenue * orgPct) / 100;
  }
  const om = overrideMap(overrides);
  let sum = 0;
  for (const ch of channelAggs) {
    const o = om.get(ch.channelId);
    const pct = o?.[key] ?? orgPct;
    sum += (ch.revenue * pct) / 100;
  }
  return sum;
}

export function computePnLExpenseTotals(args: {
  costSettings: PnLCostSettingsInput;
  totalRevenue: number;
  totalOrders: number;
  channelAggs: ChannelAgg[];
  channelOverrides: ChannelPnlOverride[];
}): {
  marketplace: number;
  shipping: number;
  processing: number;
  advertising: number;
  refunds: number;
  other: number;
  total: number;
} {
  const { costSettings, totalRevenue, totalOrders, channelAggs, channelOverrides } = args;

  const marketplace = computeMarketplaceFees(costSettings, channelAggs, channelOverrides);
  const shipping = computeAllocatedRevenuePercent(
    totalRevenue,
    channelAggs,
    channelOverrides,
    costSettings.shipping_cost_percent,
    "shipping_cost_percent",
  );
  const processing = computeAllocatedRevenuePercent(
    totalRevenue,
    channelAggs,
    channelOverrides,
    costSettings.payment_processing_percent,
    "payment_processing_percent",
  );
  const advertising = computeAdvertisingMonthly(costSettings.advertising_monthly, channelOverrides);
  const refunds = (totalRevenue * costSettings.refund_rate_percent) / 100;
  const other = costSettings.other_expenses_monthly;
  const total = marketplace + shipping + processing + advertising + refunds + other;

  return { marketplace, shipping, processing, advertising, refunds, other, total };
}
