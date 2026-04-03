import { ChatPage } from "@/components/chat/chat-page";

export const dynamic = "force-dynamic";

export default function AIChatPage() {
  return (
    <div className="h-[calc(100vh-2rem)]">
      <ChatPage />
    </div>
  );
}
