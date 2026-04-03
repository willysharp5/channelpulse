"use client";

import { RotateCcw, Copy, Check, Loader2 } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Renderer } from "@openuidev/react-lang";
import { chatLibrary } from "@/lib/ai/chart-library";
import type { UIMessage } from "ai";

interface ChatMessageProps {
  message: UIMessage;
  isStreaming: boolean;
  onRegenerate?: () => void;
  onSendMessage?: (text: string) => void;
}

export function ChatMessage({ message, isStreaming, onRegenerate, onSendMessage }: ChatMessageProps) {
  if (message.role === "user") {
    return <UserMessage message={message} />;
  }
  return <AIMessage message={message} isStreaming={isStreaming} onRegenerate={onRegenerate} onSendMessage={onSendMessage} />;
}

function UserMessage({ message }: { message: UIMessage }) {
  const text =
    message.parts
      ?.filter((p) => p.type === "text")
      .map((p) => (p as { type: "text"; text: string }).text)
      .join("") ?? "";

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-3xl bg-muted px-4 py-2.5 text-sm">
        {text}
      </div>
    </div>
  );
}

const DONE_STATES = new Set(["output-available", "output-error", "output-denied", "result"]);

function isOpenUILine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("#")) return false;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx < 1) return false;
  const lhs = trimmed.slice(0, eqIdx).trim();
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(lhs)) return false;
  const rhs = trimmed.slice(eqIdx + 1).trim();
  return /^[A-Z]/.test(rhs) || rhs.startsWith("[") || rhs.startsWith('"');
}

function splitTextAndOpenUI(text: string): { plainText: string; openUIText: string | null } {
  let cleaned = text;
  // Strip markdown code fences that wrap OpenUI Lang (```openui, ```openuilang, ```, etc.)
  cleaned = cleaned.replace(/```(?:openui|openuilang|openui-lang|)?\s*\n([\s\S]*?)```/g, (_match, inner) => inner);

  const lines = cleaned.split("\n");
  const plainLines: string[] = [];
  const openUILines: string[] = [];

  for (const line of lines) {
    if (isOpenUILine(line)) {
      openUILines.push(line);
    } else {
      plainLines.push(line);
    }
  }

  return {
    plainText: plainLines.join("\n").trim(),
    openUIText: openUILines.length > 0 ? openUILines.join("\n") : null,
  };
}

function AIMessage({
  message,
  isStreaming,
  onRegenerate,
  onSendMessage,
}: {
  message: UIMessage;
  isStreaming: boolean;
  onRegenerate?: () => void;
  onSendMessage?: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const textParts: string[] = [];
  const toolParts: Array<{
    toolCallId: string;
    toolName: string;
    state: string;
    done: boolean;
  }> = [];

  for (const part of message.parts ?? []) {
    if (part.type === "text") {
      textParts.push((part as { type: "text"; text: string }).text);
    } else if (
      part.type !== "step-start" &&
      part.type !== "source-url" &&
      part.type !== "source-document" &&
      part.type !== "file" &&
      part.type !== "reasoning"
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tp = part as any;
      const state = tp.state ?? "";
      const toolName =
        tp.toolName ??
        (typeof part.type === "string" && part.type.startsWith("tool-")
          ? part.type.slice(5)
          : "");
      if (toolName) {
        toolParts.push({
          toolCallId: tp.toolCallId ?? tp.id ?? "",
          toolName,
          state,
          done: DONE_STATES.has(state),
        });
      }
    }
  }

  const fullText = textParts.join("");
  const { plainText, openUIText } = splitTextAndOpenUI(fullText);
  const pendingTools = toolParts.filter((t) => !t.done);
  const completedTools = toolParts.filter((t) => t.done);
  const errorTools = completedTools.filter((t) => t.state === "output-error");
  const hasContent = plainText || openUIText;

  const successTools = completedTools.filter((t) => t.state !== "output-error");
  const dedupedCompleted = dedupeTools(successTools);
  const dedupedPending = dedupeTools(pendingTools);

  function handleCopy() {
    navigator.clipboard.writeText(plainText || fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background text-[11px] font-semibold text-muted-foreground">
        C
      </div>
      <div className="min-w-0 flex-1 space-y-4">
        {/* Tool execution status */}
        {toolParts.length > 0 && (
          <div className="space-y-1.5">
            {dedupedCompleted.map((tp) => (
              <div
                key={tp.toolName}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                {tp.hasError ? (
                  <span className="h-3.5 w-3.5 text-center text-amber-500">!</span>
                ) : (
                  <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                  </svg>
                )}
                <span>{toolLabel(tp.toolName, true)}</span>
              </div>
            ))}
            {dedupedPending.map((tp) => (
              <div
                key={tp.toolName}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>{toolLabel(tp.toolName, false)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Thinking state */}
        {isStreaming && !hasContent && toolParts.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Thinking...</span>
          </div>
        )}

        {/* Analyzing data after tools complete */}
        {isStreaming && !hasContent && completedTools.length > 0 && pendingTools.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Building visualization...</span>
          </div>
        )}

        {/* Text insight (markdown) */}
        {plainText && (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-p:my-1.5 prose-headings:mb-2 prose-headings:mt-4 prose-headings:font-semibold prose-strong:font-semibold prose-ul:my-2 prose-li:my-0.5">
            <ReactMarkdown>{plainText}</ReactMarkdown>
          </div>
        )}

        {/* OpenUI Lang → Tremor charts rendered live */}
        {openUIText && (
          <Renderer
            response={openUIText}
            library={chatLibrary}
            isStreaming={isStreaming}
            onAction={(event) => {
              if (event.type === "followup" && event.params?.text && onSendMessage) {
                onSendMessage(event.params.text as string);
              }
            }}
          />
        )}

        {/* Error fallback — collapsed debug only */}
        {!isStreaming && errorTools.length > 0 && !hasContent && (
          <div>
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t get that data. Try rephrasing or pick a report below.
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-[10px] text-muted-foreground/40 hover:text-muted-foreground/60">
                Details
              </summary>
              <p className="mt-1 text-[10px] text-muted-foreground/40">
                {errorTools.length} query attempt{errorTools.length > 1 ? "s" : ""} failed
              </p>
            </details>
          </div>
        )}

        {/* Action buttons + suggestions */}
        {!isStreaming && hasContent && (
          <div className="space-y-3">
            <div className="flex items-center gap-0.5">
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  title="Regenerate"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={handleCopy}
                title="Copy"
                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

interface DedupedTool {
  toolName: string;
  count: number;
  hasError: boolean;
}

function dedupeTools(
  tools: Array<{ toolName: string; state: string }>
): DedupedTool[] {
  const map = new Map<string, DedupedTool>();
  for (const t of tools) {
    const existing = map.get(t.toolName);
    if (existing) {
      existing.count++;
      if (t.state === "output-error") existing.hasError = true;
    } else {
      map.set(t.toolName, {
        toolName: t.toolName,
        count: 1,
        hasError: t.state === "output-error",
      });
    }
  }
  return Array.from(map.values());
}

function toolLabel(name: string, done: boolean): string {
  const labels: Record<string, [string, string]> = {
    getDashboardOverview: ["Fetching dashboard stats...", "Fetched dashboard stats"],
    getChannelBreakdown: ["Analyzing channels...", "Analyzed channels"],
    getProfitAndLoss: ["Calculating P&L...", "Calculated P&L"],
    getTopProducts: ["Looking up top products...", "Found top products"],
    getOrdersSummary: ["Fetching orders...", "Fetched orders"],
    runAnalyticsQuery: ["Running analysis...", "Analysis complete"],
  };
  const pair = labels[name];
  if (pair) return done ? pair[1] : pair[0];
  return done ? `Done` : `Working...`;
}

