import { Header } from "@/components/layout/header";
import { getPnLData } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { PnLContent } from "@/components/pnl/pnl-content";
import { rangeToDays, DATE_RANGE_PRESETS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PnLPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const dateParams = params.from && params.to
    ? { from: params.from, to: params.to }
    : { days: rangeToDays(params.range ?? null) };

  const rangeLabel = params.from && params.to
    ? `${params.from} to ${params.to}`
    : DATE_RANGE_PRESETS.find((p) => p.value === (params.range ?? "30d"))?.label ?? "Last 30 days";

  const [user, pnl] = await Promise.all([
    getSession(),
    getPnLData(dateParams),
  ]);

  return (
    <>
      <Header title="Profit & Loss" userEmail={user?.email ?? undefined} />
      <PnLContent pnl={pnl} rangeLabel={rangeLabel} />
    </>
  );
}
