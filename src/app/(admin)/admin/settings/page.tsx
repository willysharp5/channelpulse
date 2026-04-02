import { getAllPlans } from "@/lib/plans";
import { AdminPlanManager } from "@/components/admin/plan-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminSettingsPage() {
  const plans = await getAllPlans();

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Settings</h1>
        <p className="text-muted-foreground">
          Manage pricing tiers and platform configuration
        </p>
      </div>

      <AdminPlanManager plans={plans} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">App Version</span>
            <span className="font-medium">1.0.0</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Environment</span>
            <Badge variant="outline">
              {process.env.NODE_ENV === "production" ? "Production" : "Development"}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Supabase Project</span>
            <span className="font-mono text-xs">
              {process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "").replace(".supabase.co", "")}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
