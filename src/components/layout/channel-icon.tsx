import type { Platform } from "@/types";
import { CHANNEL_CONFIG } from "@/lib/constants";

interface ChannelSquareProps {
  platform: Platform;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { box: "h-5 w-5 text-[9px]", rounded: "rounded" },
  md: { box: "h-7 w-7 text-[11px]", rounded: "rounded-md" },
  lg: { box: "h-10 w-10 text-sm", rounded: "rounded-lg" },
};

export function ChannelSquare({ platform, size = "sm" }: ChannelSquareProps) {
  const config = CHANNEL_CONFIG[platform];
  if (!config) return null;
  const s = SIZES[size];

  return (
    <span
      className={`inline-flex items-center justify-center font-semibold text-white ${s.box} ${s.rounded}`}
      style={{ backgroundColor: config.color }}
    >
      {config.abbr}
    </span>
  );
}

export function ChannelDot({ platform, size = 8 }: { platform: Platform; size?: number }) {
  const config = CHANNEL_CONFIG[platform];
  return (
    <span
      className="inline-block rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: config?.color ?? "#6B7280",
      }}
    />
  );
}
