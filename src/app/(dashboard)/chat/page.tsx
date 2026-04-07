import { ChatPage } from "@/components/chat/chat-page";
import { AiUpgradeGate } from "@/components/chat/ai-upgrade-gate";
import { getUserPlan } from "@/lib/queries";
import { PLAN_LIMITS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AIChatPage() {
  const { plan } = await getUserPlan();
  const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.free;
  const locked = !limits.aiInsights;

  if (locked) {
    return <AiUpgradeGate currentPlan={plan} />;
  }

  return (
    <div className="h-[calc(100vh-2rem)]">
      <ChatPage />
    </div>
  );
}
