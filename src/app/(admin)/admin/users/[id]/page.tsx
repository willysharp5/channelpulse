import { notFound } from "next/navigation";
import { getAdminUserDetail } from "@/lib/admin/queries";
import { getPlanLimits, getAllPlans } from "@/lib/plans";
import { UserDetailClient } from "@/components/admin/user-detail";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { id } = await params;
  const [user, allPlans] = await Promise.all([
    getAdminUserDetail(id),
    getAllPlans(),
  ]);

  if (!user) notFound();

  const planLimits = await getPlanLimits(user.subscription?.plan ?? "free");
  const availablePlans = allPlans.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="flex-1 space-y-6 p-6">
      <UserDetailClient
        user={user}
        planLimits={planLimits}
        availablePlans={availablePlans}
      />
    </div>
  );
}
