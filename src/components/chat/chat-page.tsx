"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, Square, RotateCcw, ChevronDown } from "lucide-react";
import { ChatMessage } from "./chat-message";
import { WelcomeScreen } from "./welcome-screen";
import { QuickReports } from "./quick-reports";
import {
  createThread,
  saveThread,
  titleFromMessage,
} from "@/lib/ai/chat-store";
import { toast } from "sonner";
import type { SuggestedReportData } from "@/lib/ai/icon-map";
import type { UIMessage } from "ai";

const transport = new DefaultChatTransport({ api: "/api/chat" });

export function ChatPage(props?: { isDemo?: boolean }) {
  const isDemo = props?.isDemo ?? false;
  const { messages, sendMessage, regenerate, status, stop, setMessages } =
    useChat({ transport });

  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isLoading = status === "streaming" || status === "submitted";
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const prevMsgCount = useRef(0);
  const [reports, setReports] = useState<SuggestedReportData[]>([]);

  useEffect(() => {
    fetch("/api/suggested-reports")
      .then((res) => (res.ok ? res.json() : []))
      .then(setReports)
      .catch(() => {});
  }, []);

  // Auto-save to database when messages change
  useEffect(() => {
    if (isDemo || messages.length === 0 || isLoading) return;
    if (messages.length === prevMsgCount.current) return;
    prevMsgCount.current = messages.length;

    const firstUserMsg = messages.find((m) => m.role === "user");
    const title = firstUserMsg
      ? titleFromMessage(
          firstUserMsg.parts
            ?.filter((p) => p.type === "text")
            .map((p) => (p as { type: "text"; text: string }).text)
            .join("") ?? ""
        )
      : "New chat";

    if (!threadId) {
      createThread(title, messages).then((id) => {
        if (id) setThreadId(id);
      });
    } else {
      saveThread(threadId, messages, title);
    }
  }, [isDemo, messages, isLoading, threadId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (isLoading) {
      el.scrollTop = el.scrollHeight;
    } else {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (atBottom) el.scrollTop = el.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(gap > 120);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isDemo) {
      toast.message("Sign up for AI Insights", {
        description: "Chat with your sales data after you create an account.",
      });
      return;
    }
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleSelectReport(prompt: string) {
    if (isDemo) {
      toast.message("Sign up for AI Insights", {
        description: "Run suggested reports on your own data after you sign up.",
      });
      return;
    }
    sendMessage({ text: prompt });
  }

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setThreadId(null);
    prevMsgCount.current = 0;
    textareaRef.current?.focus();
  }, [setMessages]);

  function scrollToBottom() {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }

  const lastAssistantIdx = messages.findLastIndex(
    (m: UIMessage) => m.role === "assistant"
  );

  return (
    <div className="relative flex h-full flex-col">
      {isDemo ? (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-center text-xs text-muted-foreground">
          Preview only — AI chat is disabled.{" "}
          <a href="/signup" className="font-medium text-amber-900 underline dark:text-amber-200">
            Sign up
          </a>{" "}
          to ask questions about your stores.
        </div>
      ) : null}
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <WelcomeScreen onSelectReport={handleSelectReport} reports={reports} />
        ) : (
          <div className="mx-auto max-w-2xl px-4 pb-40 pt-6">
            <div className="flex flex-col gap-8">
              {messages.map((message: UIMessage, i: number) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isStreaming={isLoading && i === lastAssistantIdx}
                  onRegenerate={
                    message.role === "assistant" && i === lastAssistantIdx
                      ? () => regenerate()
                      : undefined
                  }
                  onSendMessage={
                    message.role === "assistant" && i === lastAssistantIdx
                      ? (text) => sendMessage({ text })
                      : undefined
                  }
                />
              ))}

              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background text-[11px] font-semibold text-muted-foreground">
                    C
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/30 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/30 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/30 [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Scroll to bottom */}
      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-36 left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border bg-background shadow-sm transition-all hover:bg-accent"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      )}

      {/* Input area */}
      <div className="shrink-0 bg-background px-4 pb-4 pt-3">
        <div className="mx-auto max-w-2xl">
          {messages.length > 0 && (
            <div className="mb-2">
              <QuickReports onSelect={handleSelectReport} disabled={isLoading || isDemo} reports={reports} />
            </div>
          )}
          <div className="flex flex-col overflow-hidden rounded-xl bg-muted/50 focus-within:bg-muted/70">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isDemo ? "Sign up to chat with your data…" : "Ask about your data..."}
              readOnly={isDemo}
              aria-readonly={isDemo}
              rows={1}
              className="w-full resize-none border-0 bg-transparent px-4 pt-3 pb-2 text-sm shadow-none outline-none ring-0 focus:border-0 focus:ring-0 focus:outline-none placeholder:text-muted-foreground/50"
            />
            <div className="flex items-center justify-between px-3 pb-2.5">
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleNewChat}
                    className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    New chat
                  </button>
                )}
              </div>
              {isLoading ? (
                <button
                  type="button"
                  onClick={stop}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-80"
                >
                  <Square className="h-3 w-3" fill="currentColor" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e)}
                  disabled={!input.trim()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-80 disabled:opacity-20"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground/40">
            ChannelPulse AI can make mistakes. Verify important data.
          </p>
        </div>
      </div>
    </div>
  );
}
