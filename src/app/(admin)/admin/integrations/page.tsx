import Link from "next/link";
import { ExternalLink, Plug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CHANNEL_INTEGRATIONS,
  INTEGRATION_TABLES,
} from "@/lib/admin/channel-integration-registry";
import { getAdminChannelPlatformCounts } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

function envSet(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

const linkCls = "text-primary underline-offset-4 hover:underline inline-flex items-center gap-0.5";

export default async function AdminIntegrationsPage() {
  const counts = await getAdminChannelPlatformCounts();

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Plug className="size-6" />
          Integrations
        </h1>
        <p className="text-sm text-muted-foreground">
          Supported marketplaces, environment config, and related database tables.
        </p>
      </div>

      {/* Platforms */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Platforms</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Platform</th>
                <th className="pb-2 pr-4 font-medium">Status</th>
                <th className="pb-2 pr-4 font-medium text-right">Channels</th>
                <th className="pb-2 pr-4 font-medium">OAuth</th>
                <th className="pb-2 pr-4 font-medium">Sync</th>
                <th className="pb-2 font-medium">Env</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {CHANNEL_INTEGRATIONS.map((def) => {
                const count = counts[def.slug] ?? 0;
                const isLive = def.status === "live";

                return (
                  <tr key={def.slug} className="align-top">
                    <td className="py-2.5 pr-4">
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: def.color }}
                          aria-hidden
                        />
                        <span className="font-medium">{def.label}</span>
                      </span>
                    </td>

                    <td className="py-2.5 pr-4">
                      <Badge variant={isLive ? "default" : "secondary"} className="text-[11px]">
                        {isLive ? "Live" : "Planned"}
                      </Badge>
                    </td>

                    <td className="py-2.5 pr-4 text-right tabular-nums">{count}</td>

                    {/* OAuth — linked to GitHub source */}
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {def.oauth ? (
                        <span className="flex flex-col gap-0.5">
                          <a href={def.oauth.startSrc} target="_blank" rel="noreferrer" className={linkCls}>
                            {def.oauth.start} <ExternalLink className="size-2.5" />
                          </a>
                          <a href={def.oauth.callbackSrc} target="_blank" rel="noreferrer" className={linkCls}>
                            {def.oauth.callback} <ExternalLink className="size-2.5" />
                          </a>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>

                    {/* Sync — linked to GitHub source */}
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {def.sync ? (
                        <a href={def.sync.src} target="_blank" rel="noreferrer" className={linkCls}>
                          {def.sync.route} <ExternalLink className="size-2.5" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>

                    <td className="py-2.5">
                      {def.envKeys?.length ? (
                        <span className="flex flex-col gap-0.5">
                          {def.envKeys.map((k) => (
                            <span key={k} className="flex items-center gap-1.5 font-mono text-xs">
                              <span
                                className={cn(
                                  "size-1.5 shrink-0 rounded-full",
                                  envSet(k) ? "bg-emerald-500" : "bg-red-500"
                                )}
                              />
                              <span className="truncate">{k}</span>
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Related tables — linked to Supabase table editor */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Related tables</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {INTEGRATION_TABLES.map((t) => (
              <li key={t.name} className="flex items-start justify-between gap-4 py-2">
                <a href={t.url} target="_blank" rel="noreferrer" className={cn(linkCls, "font-mono text-xs shrink-0")}>
                  {t.name} <ExternalLink className="size-2.5" />
                </a>
                <p className="text-xs text-muted-foreground text-right max-w-sm">{t.purpose}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        User-facing connections:{" "}
        <Link href="/channels" className="text-primary underline-offset-4 hover:underline">/channels</Link>
        {" · "}
        Sync schedules:{" "}
        <Link href="/admin/cron" className="text-primary underline-offset-4 hover:underline">/admin/cron</Link>
      </p>
    </div>
  );
}
