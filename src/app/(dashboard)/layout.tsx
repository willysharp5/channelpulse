import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageLoadingProvider } from "@/components/layout/page-loading-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <PageLoadingProvider>{children}</PageLoadingProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
