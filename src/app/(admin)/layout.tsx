import { redirect } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { ImpersonationBanner } from "@/components/admin/impersonation-banner";
import { createClient } from "@/lib/supabase/server";
import { getImpersonatedUserInfo } from "@/lib/admin/impersonate";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") redirect("/");

  const impersonated = await getImpersonatedUserInfo();

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        {impersonated && (
          <ImpersonationBanner
            userName={impersonated.name}
            userEmail={impersonated.email}
            userId={impersonated.userId}
          />
        )}
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
