import { Header } from "@/components/layout/header";
import { getPnLData } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { PnLContent } from "@/components/pnl/pnl-content";
import { rangeToDays } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PnLPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const params = await searchParams;
  const days = rangeToDays(params.range ?? null);

  const [user, pnl] = await Promise.all([
    getSession(),
    getPnLData(days),
  ]);

  return (
    <>
      <Header title="Profit & Loss" userEmail={user?.email ?? undefined} />
      <PnLContent pnl={pnl} />
    </>
  );
}
