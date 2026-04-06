"use client";

import { Player } from "@remotion/player";
import { LandingAiChatComposition } from "@/remotion/landing-ai-chat-composition";

/** Extra tail after OpenUI so the full result stays on screen before loop (~6s more hold). */
const DURATION_FRAMES = 780;
const FPS = 30;
const WIDTH = 1440;
const HEIGHT = 900;

export function LandingAiChatRemotion() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-xl shadow-gray-200/40 dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">
      <div className="relative aspect-[1440/900] w-full">
        <Player
          acknowledgeRemotionLicense
          component={LandingAiChatComposition}
          durationInFrames={DURATION_FRAMES}
          compositionWidth={WIDTH}
          compositionHeight={HEIGHT}
          fps={FPS}
          controls={false}
          loop
          autoPlay
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        />
      </div>
    </div>
  );
}
