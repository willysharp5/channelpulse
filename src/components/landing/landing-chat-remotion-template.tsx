"use client";

import { ArrowUp, Loader2, MousePointer2, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Renderer } from "@openuidev/react-lang";
import { QuickReports } from "@/components/chat/quick-reports";
import { WelcomeScreen } from "@/components/chat/welcome-screen";
import { chatLibrary } from "@/lib/ai/chart-library";
import { toolLabel } from "@/lib/ai/chat-tool-labels";
import { LANDING_DEMO_MARKDOWN, LANDING_DEMO_OPENUI } from "@/lib/ai/landing-demo-openui";
import { FALLBACK_SUGGESTED_REPORTS_DATA } from "@/lib/ai/suggested-reports";
import { cn } from "@/lib/utils";

export type LandingChatPointerProps = {
  visible: boolean;
  /** 0–100, relative to the preview card */
  xPercent: number;
  yPercent: number;
  clicking: boolean;
};

export type LandingChatRemotionTemplateProps = {
  phase: "welcome" | "chat";
  /** Typing happens in the bottom composer only; 0 = placeholder. */
  composerVisibleChars: number;
  userMessageFull: string;
  /** After send: full message in the thread (no typing at top). */
  showUserBubble: boolean;
  showChatPageLoadingRow: boolean;
  assistantPendingTool: string | null;
  assistantCompletedTools: string[];
  showMarkdown: boolean;
  markdownVisibleChars: number;
  showOpenUI: boolean;
  /** 0–1 from Remotion spring: dashboard/charts ease in (opacity + motion). */
  openUIEntrance: number;
  showQuickReports: boolean;
  showNewChatButton: boolean;
  emphasizeReportId?: string;
  pressedReportId?: string;
  landingWelcomeWide?: boolean;
  landingThreadWide?: boolean;
  pointer: LandingChatPointerProps;
};

function sliceVisibleMarkdown(full: string, chars: number): string {
  if (chars <= 0) return "";
  if (chars >= full.length) return full;
  return full.slice(0, chars);
}

function LandingRemotionPointer({ visible, xPercent, yPercent, clicking }: LandingChatPointerProps) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none absolute z-[100]"
      style={{
        left: `${xPercent}%`,
        top: `${yPercent}%`,
        transform: `translate(-4px, -4px) scale(${clicking ? 0.9 : 1})`,
        transition: "none",
      }}
      aria-hidden
    >
      <MousePointer2 className="h-8 w-8 fill-foreground stroke-background stroke-[1.5] drop-shadow-md dark:stroke-gray-950" />
    </div>
  );
}

export function LandingChatRemotionTemplate({
  phase,
  composerVisibleChars,
  userMessageFull,
  showUserBubble,
  showChatPageLoadingRow,
  assistantPendingTool,
  assistantCompletedTools,
  showMarkdown,
  markdownVisibleChars,
  showOpenUI,
  openUIEntrance,
  showQuickReports,
  showNewChatButton,
  emphasizeReportId,
  pressedReportId,
  landingWelcomeWide,
  landingThreadWide,
  pointer,
}: LandingChatRemotionTemplateProps) {
  const reports = FALLBACK_SUGGESTED_REPORTS_DATA;
  const noop = () => {};
  const mdSlice = showMarkdown ? sliceVisibleMarkdown(LANDING_DEMO_MARKDOWN, markdownVisibleChars) : "";

  const showAssistantColumn =
    assistantPendingTool !== null ||
    assistantCompletedTools.length > 0 ||
    showMarkdown ||
    showOpenUI;

  const threadMax = landingThreadWide ? "max-w-5xl" : "max-w-2xl";
  const bubbleText = landingThreadWide ? "text-base leading-relaxed" : "text-sm";

  const composerLine =
    composerVisibleChars > 0 ? userMessageFull.slice(0, composerVisibleChars) : "";
  const showComposerCaret = !showUserBubble && composerVisibleChars > 0;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-xl border bg-background text-foreground">
      <LandingRemotionPointer {...pointer} />

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {phase === "welcome" ? (
          <WelcomeScreen
            onSelectReport={noop}
            reports={reports}
            emphasizeReportId={emphasizeReportId}
            pressedReportId={pressedReportId}
            wide={landingWelcomeWide}
          />
        ) : (
          <div className={cn("mx-auto px-4 pb-32 pt-6", threadMax)}>
            <div className="flex min-h-[100px] flex-col gap-8">
              {showUserBubble && (
                <div className="flex justify-end">
                  <div className={cn("max-w-[85%] rounded-3xl bg-muted px-4 py-2.5", bubbleText)}>
                    {userMessageFull}
                  </div>
                </div>
              )}

              {showChatPageLoadingRow && (
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

              {showAssistantColumn && (
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background text-[11px] font-semibold text-muted-foreground">
                    C
                  </div>
                  <div className="min-w-0 flex-1 space-y-4">
                    {assistantCompletedTools.map((name) => (
                      <div key={name} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
                        </svg>
                        <span>{toolLabel(name, true)}</span>
                      </div>
                    ))}
                    {assistantPendingTool && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>{toolLabel(assistantPendingTool, false)}</span>
                      </div>
                    )}
                    {(mdSlice || showOpenUI) && (
                      <div className="space-y-4">
                        {mdSlice ? (
                          <div
                            className={cn(
                              "prose max-w-none dark:prose-invert prose-p:leading-relaxed prose-p:my-1.5 prose-headings:mb-2 prose-headings:mt-4 prose-headings:font-semibold prose-strong:font-semibold prose-ul:my-2 prose-li:my-0.5",
                              landingThreadWide ? "prose-base" : "prose-sm"
                            )}
                          >
                            <ReactMarkdown>{mdSlice}</ReactMarkdown>
                          </div>
                        ) : null}
                        {showOpenUI ? (
                          <div
                            className="will-change-[transform,opacity]"
                            style={{
                              opacity: openUIEntrance,
                              transform: `translateY(${(1 - openUIEntrance) * 18}px) scale(${0.97 + openUIEntrance * 0.03})`,
                              transformOrigin: "50% 0%",
                            }}
                          >
                            <Renderer
                              response={LANDING_DEMO_OPENUI}
                              library={chatLibrary}
                              isStreaming={false}
                              onAction={() => {}}
                            />
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative shrink-0 border-t border-border/60 bg-background px-4 pb-4 pt-3">
        <div className={cn("mx-auto", threadMax)}>
          {phase === "chat" && showQuickReports && (
            <div className="mb-2">
              <QuickReports onSelect={noop} disabled reports={reports} />
            </div>
          )}
          <div className="relative flex flex-col overflow-hidden rounded-xl bg-muted/50 focus-within:bg-muted/70">
            <div
              className={cn(
                "min-h-[44px] w-full whitespace-pre-wrap px-4 pt-3 pb-2 text-sm leading-relaxed",
                composerVisibleChars > 0 ? "text-foreground" : "text-muted-foreground/50"
              )}
            >
              {composerVisibleChars > 0 ? (
                <>
                  {composerLine}
                  {showComposerCaret ? (
                    <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-foreground/70 align-text-bottom" />
                  ) : null}
                </>
              ) : (
                "Ask about your data..."
              )}
            </div>
            <div className="flex items-center justify-between px-3 pb-2.5">
              <div className="flex items-center gap-1">
                {phase === "chat" && showNewChatButton && (
                  <button
                    type="button"
                    className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    New chat
                  </button>
                )}
              </div>
              <button
                type="button"
                className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-80"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
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
