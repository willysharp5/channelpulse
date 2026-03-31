import { Badge } from "@/components/ui/badge";
import { CHANNEL_CONFIG } from "@/lib/constants";
import type { Platform } from "@/types";

interface ChannelBadgeProps {
  platform: Platform;
  className?: string;
}

export function ChannelBadge({ platform, className }: ChannelBadgeProps) {
  const config = CHANNEL_CONFIG[platform];

  return (
    <Badge
      variant="outline"
      className={className}
      style={{
        borderColor: config.color,
        color: config.color,
        backgroundColor: `${config.color}10`,
      }}
    >
      <span className="mr-1 text-xs">{config.icon}</span>
      {config.label}
    </Badge>
  );
}
