import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageLoadingProvider } from "@/components/layout/page-loading-provider";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { getImpersonatedUserInfo } from "@/lib/admin/impersonate";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const impersonated = await getImpersonatedUserInfo();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {impersonated && (
          <ImpersonationBanner
            userName={impersonated.name}
            userEmail={impersonated.email}
            userId={impersonated.userId}
          />
        )}
        <PageLoadingProvider>{children}</PageLoadingProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
