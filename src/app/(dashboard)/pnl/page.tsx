import { Header } from "@/components/layout/header";
import { getPnLData } from "@/lib/queries";
import { getSession } from "@/lib/auth/actions";
import { PnLContent } from "@/components/pnl/pnl-content";

export const dynamic = "force-dynamic";

export default async function PnLPage() {
  const [user, pnl] = await Promise.all([
    getSession(),
    getPnLData(30),
  ]);

  return (
    <>
      <Header title="Profit & Loss" userEmail={user?.email ?? undefined} />
      <PnLContent pnl={pnl} />
    </>
  );
}
