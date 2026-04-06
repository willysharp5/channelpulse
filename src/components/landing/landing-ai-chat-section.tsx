"use client";

import dynamic from "next/dynamic";

const LandingAiChatRemotion = dynamic(
  () =>
    import("@/components/landing/landing-ai-chat-remotion").then((m) => ({
      default: m.LandingAiChatRemotion,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-xl shadow-gray-200/40 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
        <div className="relative aspect-[1440/900] w-full min-h-[180px] animate-pulse rounded-xl bg-gray-200/90 dark:bg-gray-800/90" />
      </div>
    ),
  }
);

export function LandingAiChatSection() {
  return <LandingAiChatRemotion />;
}
