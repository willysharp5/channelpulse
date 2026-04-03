import type { UIMessage } from "ai";

export interface ChatThread {
  id: string;
  title: string;
  updated_at: string;
}

export async function fetchThreads(): Promise<ChatThread[]> {
  const res = await fetch("/api/chat/threads");
  if (!res.ok) return [];
  return res.json();
}

export async function createThread(
  title: string,
  messages: UIMessage[]
): Promise<string | null> {
  const res = await fetch("/api/chat/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, messages }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.id;
}

export async function loadThread(
  id: string
): Promise<{ messages: UIMessage[]; title: string } | null> {
  const res = await fetch(`/api/chat/threads/${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return { messages: data.messages ?? [], title: data.title };
}

export async function saveThread(
  id: string,
  messages: UIMessage[],
  title?: string
) {
  await fetch(`/api/chat/threads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, ...(title ? { title } : {}) }),
  });
}

export async function deleteThread(id: string) {
  await fetch(`/api/chat/threads/${id}`, { method: "DELETE" });
}

export function titleFromMessage(text: string): string {
  return text.slice(0, 60).replace(/\n/g, " ").trim() || "New chat";
}
