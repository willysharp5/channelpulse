import { HeaderSkeleton } from "@/components/dashboard/header-skeleton";
import { ChannelsSkeleton } from "@/components/dashboard/page-skeleton";

export default function ChannelsLoading() {
  return (
    <div>
      <HeaderSkeleton />
      <ChannelsSkeleton />
    </div>
  );
}
