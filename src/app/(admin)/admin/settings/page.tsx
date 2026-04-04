import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getAllPlans } from "@/lib/plans";
import { AdminPlanManager } from "@/components/admin/plan-manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminSettingsPage() {
  const plans = await getAllPlans();

  const supabaseProjectId = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "").replace(".supabase.co", "") ?? "";

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
            <span className="font-mono text-xs">{supabaseProjectId}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link
            href={`https://supabase.com/dashboard/project/${supabaseProjectId}/integrations/cron/jobs`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
          >
            <div>
              <p className="font-medium">Supabase Cron Jobs</p>
              <p className="text-xs text-muted-foreground">View and manage pg_cron jobs directly in Supabase</p>
            </div>
            <ExternalLink className="size-4 text-muted-foreground" />
          </Link>
          <Link
            href="https://vercel.com/edowilliams-projects"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
          >
            <div>
              <p className="font-medium">Vercel Dashboard</p>
              <p className="text-xs text-muted-foreground">Deployments, logs, environment variables, and domains</p>
            </div>
            <ExternalLink className="size-4 text-muted-foreground" />
          </Link>
          <Link
            href={`https://supabase.com/dashboard/project/${supabaseProjectId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors hover:bg-muted/50"
          >
            <div>
              <p className="font-medium">Supabase Dashboard</p>
              <p className="text-xs text-muted-foreground">Database, auth, storage, and edge functions</p>
            </div>
            <ExternalLink className="size-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
