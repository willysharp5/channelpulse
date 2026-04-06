import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { LandingChatRemotionTemplate } from "@/components/landing/landing-chat-remotion-template";
import type { LandingChatPointerProps } from "@/components/landing/landing-chat-remotion-template";
import { LANDING_DEMO_MARKDOWN } from "@/lib/ai/landing-demo-openui";

const USER_MESSAGE =
  "Show me P&L for the last 30 days including all fees and net profit.";

const PNL_REPORT_ID = "fallback-pnl";
const MD_LEN = LANDING_DEMO_MARKDOWN.length;

const PTR = {
  enter: { x: 84, y: 28 },
  pnl: { x: 50, y: 42 },
  composer: { x: 26, y: 86 },
  send: { x: 92.5, y: 90 },
} as const;

const POINTER_ENTER = 22;
const PNL_ARRIVE = 56;
const PNL_CLICK_DOWN = 64;
const PNL_CLICK_UP = 72;
const CHAT_START = 74;
const MOVE_COMPOSER_START = 76;
const MOVE_COMPOSER_END = 106;
const COMPOSER_TYPE_START = 110;
const CHARS_PER_FRAME = 1.22;
/** Frames of typing at bottom composer (not in thread). */
const TYPING_STEPS = Math.ceil(USER_MESSAGE.length / CHARS_PER_FRAME);
const COMPOSER_FULL_FRAME = COMPOSER_TYPE_START + TYPING_STEPS;
/** Move to send after the prompt is fully typed. */
const SEND_MOVE_START = COMPOSER_FULL_FRAME + 3;
const SEND_MOVE_END = SEND_MOVE_START + 10;
const SEND_CLICK_DOWN = SEND_MOVE_END + 2;
const SEND_CLICK_UP = SEND_CLICK_DOWN + 8;
const THREAD_MSG = SEND_CLICK_UP + 2;
const POINTER_HIDE = THREAD_MSG + 22;

const CHAT_PAGE_LOADING_END = THREAD_MSG + 16;
const TOOL_PENDING_END = CHAT_PAGE_LOADING_END + 68;
const RESULT_START = TOOL_PENDING_END;
const SUMMARY_TYPE_START = RESULT_START + 22;
const MD_CHARS_PER_FRAME = 1.65;
const SUMMARY_TYPING_FRAMES = Math.ceil(MD_LEN / MD_CHARS_PER_FRAME);
const OPENUI_START = SUMMARY_TYPE_START + SUMMARY_TYPING_FRAMES + 14;

function pointerForFrame(frame: number): LandingChatPointerProps {
  if (frame < POINTER_ENTER || frame >= POINTER_HIDE) {
    return { visible: false, xPercent: 0, yPercent: 0, clicking: false };
  }

  if (frame < PNL_ARRIVE) {
    const t = interpolate(frame, [POINTER_ENTER, PNL_ARRIVE], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return {
      visible: true,
      xPercent: interpolate(t, [0, 1], [PTR.enter.x, PTR.pnl.x]),
      yPercent: interpolate(t, [0, 1], [PTR.enter.y, PTR.pnl.y]),
      clicking: false,
    };
  }

  if (frame < CHAT_START) {
    const clicking = frame >= PNL_CLICK_DOWN && frame < PNL_CLICK_UP;
    return {
      visible: true,
      xPercent: PTR.pnl.x,
      yPercent: PTR.pnl.y,
      clicking,
    };
  }

  if (frame < MOVE_COMPOSER_END) {
    const t = interpolate(frame, [MOVE_COMPOSER_START, MOVE_COMPOSER_END], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return {
      visible: true,
      xPercent: interpolate(t, [0, 1], [PTR.pnl.x, PTR.composer.x]),
      yPercent: interpolate(t, [0, 1], [PTR.pnl.y, PTR.composer.y]),
      clicking: false,
    };
  }

  if (frame < SEND_MOVE_START) {
    return {
      visible: true,
      xPercent: PTR.composer.x,
      yPercent: PTR.composer.y,
      clicking: false,
    };
  }

  if (frame < SEND_MOVE_END) {
    const t = interpolate(frame, [SEND_MOVE_START, SEND_MOVE_END], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return {
      visible: true,
      xPercent: interpolate(t, [0, 1], [PTR.composer.x, PTR.send.x]),
      yPercent: interpolate(t, [0, 1], [PTR.composer.y, PTR.send.y]),
      clicking: false,
    };
  }

  const clicking = frame >= SEND_CLICK_DOWN && frame < SEND_CLICK_UP;
  return {
    visible: true,
    xPercent: PTR.send.x,
    yPercent: PTR.send.y,
    clicking,
  };
}

export const LandingAiChatComposition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const shell = spring({ frame, fps, config: { damping: 22, stiffness: 88 } });
  const phase = frame < CHAT_START ? "welcome" : "chat";

  const composerVisibleChars =
    phase === "chat" && frame >= COMPOSER_TYPE_START && frame < THREAD_MSG
      ? Math.max(
          0,
          Math.min(USER_MESSAGE.length, Math.floor((frame - COMPOSER_TYPE_START) * CHARS_PER_FRAME))
        )
      : 0;

  const showUserBubble = phase === "chat" && frame >= THREAD_MSG;

  const showChatPageLoadingRow =
    phase === "chat" && frame >= THREAD_MSG && frame < CHAT_PAGE_LOADING_END;

  const assistantPendingTool =
    phase === "chat" && frame >= CHAT_PAGE_LOADING_END && frame < TOOL_PENDING_END
      ? "getProfitAndLoss"
      : null;

  const assistantCompletedTools: string[] =
    phase === "chat" && frame >= RESULT_START ? ["getDashboardOverview"] : [];

  const showMarkdown = phase === "chat" && frame >= SUMMARY_TYPE_START;
  const markdownVisibleChars = showMarkdown
    ? Math.max(0, Math.min(MD_LEN, Math.floor((frame - SUMMARY_TYPE_START) * MD_CHARS_PER_FRAME)))
    : 0;

  const showOpenUI = phase === "chat" && frame >= OPENUI_START;
  const openUIEntranceRaw =
    phase === "chat" && frame >= OPENUI_START
      ? spring({
          frame: frame - OPENUI_START,
          fps,
          config: { damping: 28, stiffness: 64, mass: 0.85 },
        })
      : 0;
  const openUIEntrance = Math.min(1, Math.max(0, openUIEntranceRaw));

  const showQuickReports = phase === "chat" && frame >= THREAD_MSG;
  const showNewChatButton = showUserBubble;

  const emphasizeReportId =
    phase === "welcome" && frame >= 18 && frame < PNL_CLICK_DOWN ? PNL_REPORT_ID : undefined;
  const pressedReportId =
    phase === "welcome" && frame >= PNL_CLICK_DOWN && frame < PNL_CLICK_UP ? PNL_REPORT_ID : undefined;

  const pointer = pointerForFrame(frame);

  return (
    <AbsoluteFill className="bg-muted text-foreground">
      <div
        className="absolute inset-3 flex min-h-0 w-auto flex-col sm:inset-4 md:inset-6"
        style={{
          opacity: shell,
          transform: `scale(${interpolate(shell, [0, 1], [0.98, 1])})`,
        }}
      >
        <LandingChatRemotionTemplate
          phase={phase}
          composerVisibleChars={composerVisibleChars}
          userMessageFull={USER_MESSAGE}
          showUserBubble={showUserBubble}
          showChatPageLoadingRow={showChatPageLoadingRow}
          assistantPendingTool={assistantPendingTool}
          assistantCompletedTools={assistantCompletedTools}
          showMarkdown={showMarkdown}
          markdownVisibleChars={markdownVisibleChars}
          showOpenUI={showOpenUI}
          openUIEntrance={openUIEntrance}
          showQuickReports={showQuickReports}
          showNewChatButton={showNewChatButton}
          emphasizeReportId={emphasizeReportId}
          pressedReportId={pressedReportId}
          landingWelcomeWide
          landingThreadWide
          pointer={pointer}
        />
      </div>
    </AbsoluteFill>
  );
};
