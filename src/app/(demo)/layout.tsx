import Link from "next/link";
import { X } from "lucide-react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageLoadingProvider } from "@/components/layout/page-loading-provider";
import { DemoProvider } from "@/contexts/demo-context";
import { getChannels } from "@/lib/queries";
import { DEMO_ORG_ID } from "@/lib/demo-data";

export default async function DemoSectionLayout({ children }: { children: React.ReactNode }) {
  const channels = await getChannels(DEMO_ORG_ID);
  const sidebarChannels = channels.map((c) => ({
    id: c.id,
    platform: c.platform,
    name: c.name ?? c.platform,
    status: c.status,
  }));

  return (
    <DemoProvider>
      <div className="flex min-h-svh flex-col">
        <Link
          href="/landing"
          className="fixed end-3 top-3 z-[100] inline-flex size-9 items-center justify-center rounded-full border border-border/80 bg-background/95 text-muted-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:end-4 sm:top-4 sm:size-10"
          aria-label="Exit demo and return to marketing site"
        >
          <X className="size-4 shrink-0 sm:size-[1.125rem]" strokeWidth={2} />
        </Link>
        <div className="shrink-0 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2.5 pe-14 text-center text-sm sm:pe-4">
          <span className="font-semibold text-amber-950 dark:text-amber-100">Demo</span>
          <span className="text-muted-foreground"> — Sample data only. </span>
          <Link
            href="/signup"
            className="font-medium text-amber-800 underline underline-offset-2 hover:text-amber-950 dark:text-amber-200 dark:hover:text-amber-50"
          >
            Sign up
          </Link>
          <span className="text-muted-foreground"> to connect your stores.</span>
        </div>
        <SidebarProvider className="flex min-h-0 flex-1">
          <AppSidebar demo={{ channels: sidebarChannels }} />
          <SidebarInset>
            <PageLoadingProvider>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
            </PageLoadingProvider>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </DemoProvider>
  );
}
