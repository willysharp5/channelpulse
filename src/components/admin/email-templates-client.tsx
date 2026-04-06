"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Save,
  Send,
  Mail,
  Eye,
  EyeOff,
  Pencil,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  Info,
  TrendingDown,
  TrendingUp,
  Loader2,
  Zap,
  LayoutTemplate,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { emailLayout } from "@/lib/email/templates";
import { buildTransactionalTestEmail } from "@/lib/email/transactional-test-samples";
import {
  type TransactionalEmailTestType,
  TRANSACTIONAL_EMAIL_LABELS,
  isTransactionalEmailTestType,
} from "@/lib/email/transactional-email-meta";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SUPABASE_DASHBOARD_CRON_JOBS,
  SUPABASE_DASHBOARD_TRANSACTIONAL_EMAIL_TEMPLATES,
  SUPABASE_DASHBOARD_EMAIL_TEMPLATES,
} from "@/lib/supabase-dashboard-links";
import { toast } from "sonner";

const EMAIL_TAB_QUERY = "tab";
const TAB_TRANSACTIONAL = "transactional";
const TAB_DATABASE = "database";

function emailTabFromSearchParams(sp: URLSearchParams): string {
  const v = sp.get(EMAIL_TAB_QUERY);
  if (v === TAB_DATABASE) return TAB_DATABASE;
  return TAB_TRANSACTIONAL;
}

const SLUG_ICONS: Record<string, typeof Mail> = {
  low_stock: AlertTriangle,
  sync_error: RefreshCw,
  weekly_digest: BarChart3,
  revenue_drop: TrendingDown,
  order_spike: TrendingUp,
};

const SLUG_COLORS: Record<string, string> = {
  low_stock: "text-amber-500",
  sync_error: "text-red-500",
  weekly_digest: "text-blue-500",
  revenue_drop: "text-orange-500",
  order_spike: "text-emerald-500",
};

interface Section {
  type: "heading" | "text" | "button" | "url" | "note";
  key: string;
  label: string;
  value: string;
}

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string;
  body_html: string;
  description: string | null;
  is_active: boolean;
  sections: Section[];
}

interface TransactionalEmailTemplateRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  subject: string;
  body_html: string;
  is_active: boolean;
  sections: Section[];
}

interface Props {
  initialTemplates: EmailTemplate[];
  initialTransactional: TransactionalEmailTemplateRow[];
}

function buildPreviewHtml(
  subject: string,
  sections: Section[],
  slug: string
): string {
  const heading = sections.find((s) => s.key === "heading")?.value ?? "";
  const ctaLabel = sections.find((s) => s.key === "cta_label")?.value ?? "Learn More";
  const ctaUrl = sections.find((s) => s.key === "cta_url")?.value ?? "#";

  const textSections = sections
    .filter((s) => s.type === "text")
    .map(
      (s) =>
        `<p style="margin:0 0 16px;font-size:14px;color:#71717a;">${s.value}</p>`
    )
    .join("");

  const autoGenSections = sections
    .filter((s) => s.type === "note")
    .map(
      (s) =>
        `<div style="margin:12px 0;padding:10px 14px;background:#f9fafb;border:1px dashed #e5e7eb;border-radius:8px;">
          <p style="margin:0;font-size:11px;color:#9ca3af;font-style:italic;">⚙️ ${s.value}</p>
        </div>`
    )
    .join("");

  let sampleContent = "";
  if (slug === "low_stock") {
    sampleContent = `<table style="width:100%;border-collapse:collapse;border:1px solid #f0f0f0;border-radius:8px;margin:16px 0;">
      <thead><tr style="background:#fafafa;">
        <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;">Product</th>
        <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;color:#71717a;text-transform:uppercase;">Stock</th>
      </tr></thead>
      <tbody>
        <tr><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;"><strong style="color:#18181b;font-size:13px;">Blue Widget — Large</strong><br><span style="font-size:11px;color:#a1a1aa;">SKU: BW-LG-001</span></td><td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;"><span style="display:inline-block;padding:3px 8px;border-radius:99px;font-size:12px;font-weight:600;background:#fffbeb;color:#d97706;">3 left</span></td></tr>
        <tr><td style="padding:10px 12px;"><strong style="color:#18181b;font-size:13px;">Red T-Shirt</strong><br><span style="font-size:11px;color:#a1a1aa;">SKU: RT-MD-002</span></td><td style="padding:10px 12px;text-align:right;"><span style="display:inline-block;padding:3px 8px;border-radius:99px;font-size:12px;font-weight:600;background:#fef2f2;color:#dc2626;">0 left</span></td></tr>
      </tbody>
    </table>`;
  } else if (slug === "weekly_digest") {
    sampleContent = `<div style="display:flex;gap:12px;margin:16px 0 12px;">
      <div style="flex:1;padding:16px;background:#fafafa;border-radius:10px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;font-weight:600;">Revenue</p>
        <p style="margin:4px 0 2px;font-size:22px;font-weight:700;color:#18181b;">$24,831</p>
        <p style="margin:0;font-size:12px;font-weight:600;color:#16a34a;">+12.4% vs last week</p>
      </div>
      <div style="flex:1;padding:16px;background:#fafafa;border-radius:10px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;font-weight:600;">Orders</p>
        <p style="margin:4px 0 2px;font-size:22px;font-weight:700;color:#18181b;">342</p>
        <p style="margin:0;font-size:12px;font-weight:600;color:#16a34a;">+8.2% vs last week</p>
      </div>
    </div>
    <div style="display:flex;gap:12px;margin:0 0 16px;">
      <div style="flex:1;padding:16px;background:#fafafa;border-radius:10px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;font-weight:600;">Units sold</p>
        <p style="margin:4px 0 2px;font-size:22px;font-weight:700;color:#18181b;">1,240</p>
        <p style="margin:0;font-size:12px;font-weight:600;color:#16a34a;">+5.1% vs last week</p>
      </div>
      <div style="flex:1;padding:16px;background:#fafafa;border-radius:10px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#71717a;text-transform:uppercase;font-weight:600;">Net profit</p>
        <p style="margin:4px 0 2px;font-size:22px;font-weight:700;color:#18181b;">$8,420</p>
        <p style="margin:0;font-size:12px;font-weight:600;color:#16a34a;">+3.2% vs last week</p>
      </div>
    </div>
    <div style="padding:12px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:12px;">
      <p style="margin:0;font-size:13px;color:#166534;">🏆 <strong>Shopify</strong> was your top channel at <strong>$15,200</strong></p>
    </div>`;
  }

  const body = `
    <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">${heading}</h2>
    ${textSections}
    ${autoGenSections}
    ${sampleContent}
    <div style="margin-top:24px;text-align:center;">
      <a href="${ctaUrl}" style="display:inline-block;padding:10px 24px;background:#18181b;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">${ctaLabel}</a>
    </div>
  `;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <div style="padding:24px 28px 20px;border-bottom:1px solid #f0f0f0;">
        <span style="font-size:18px;font-weight:700;color:#18181b;">ChannelPulse</span>
      </div>
      <div style="padding:28px;">${body}</div>
      <div style="padding:16px 28px;background:#fafafa;border-top:1px solid #f0f0f0;">
        <p style="margin:0;font-size:11px;color:#a1a1aa;text-align:center;">
          You're receiving this because you have email notifications enabled in ChannelPulse.
        </p>
      </div>
    </div>
  </div>
</body></html>`;
}

export function EmailTemplatesClient({
  initialTemplates,
  initialTransactional,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mainTab = emailTabFromSearchParams(searchParams);

  function replaceEmailTab(tab: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set(EMAIL_TAB_QUERY, tab);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  const [templates, setTemplates] = useState(initialTemplates);
  const [transactionalTemplates, setTransactionalTemplates] = useState(initialTransactional);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [txnEditing, setTxnEditing] = useState<TransactionalEmailTemplateRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingTxn, setSavingTxn] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [runningAlertCheck, setRunningAlertCheck] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formSections, setFormSections] = useState<Section[]>([]);

  const [formTxnName, setFormTxnName] = useState("");
  const [formTxnSubject, setFormTxnSubject] = useState("");
  const [formTxnBody, setFormTxnBody] = useState("");
  const [formTxnActive, setFormTxnActive] = useState(true);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const txnIframeRef = useRef<HTMLIFrameElement>(null);

  const renderedHtml = useMemo(() => {
    if (!editing) return "";
    return buildPreviewHtml(formSubject, formSections, editing.slug);
  }, [formSubject, formSections, editing]);

  const txnRenderedHtml = useMemo(() => {
    if (!txnEditing) return "";
    if (formTxnBody.trim()) {
      return emailLayout(formTxnSubject.trim() || txnEditing.name, formTxnBody.trim());
    }
    return buildTransactionalTestEmail(txnEditing.slug as TransactionalEmailTestType).html;
  }, [txnEditing, formTxnSubject, formTxnBody]);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(renderedHtml);
        doc.close();
      }
    }
  }, [renderedHtml]);

  useEffect(() => {
    if (txnIframeRef.current) {
      const doc = txnIframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(txnRenderedHtml);
        doc.close();
      }
    }
  }, [txnRenderedHtml]);

  function openEdit(template: EmailTemplate) {
    replaceEmailTab(TAB_DATABASE);
    setTxnEditing(null);
    setFormName(template.name);
    setFormSubject(template.subject);
    setFormActive(template.is_active);
    setFormSections(
      Array.isArray(template.sections) ? [...template.sections] : []
    );
    setEditing(template);
  }

  function openTxnEdit(row: TransactionalEmailTemplateRow) {
    replaceEmailTab(TAB_TRANSACTIONAL);
    setEditing(null);
    setFormTxnName(row.name);
    setFormTxnSubject(row.subject ?? "");
    setFormTxnBody(row.body_html ?? "");
    setFormTxnActive(row.is_active);
    setTxnEditing(row);
  }

  async function handleSaveTxn() {
    if (!txnEditing) return;
    setSavingTxn(true);
    try {
      const res = await fetch(`/api/admin/transactional-email-templates/${txnEditing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formTxnName,
          subject: formTxnSubject,
          body_html: formTxnBody,
          is_active: formTxnActive,
        }),
      });
      if (!res.ok) throw new Error();
      setTransactionalTemplates((prev) =>
        prev.map((t) =>
          t.id === txnEditing.id
            ? {
                ...t,
                name: formTxnName,
                subject: formTxnSubject,
                body_html: formTxnBody,
                is_active: formTxnActive,
              }
            : t
        )
      );
      toast.success(`"${formTxnName}" saved`);
      setTxnEditing(null);
      router.refresh();
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSavingTxn(false);
    }
  }

  async function toggleTxnActive(row: TransactionalEmailTemplateRow) {
    const newActive = !row.is_active;
    try {
      const res = await fetch(`/api/admin/transactional-email-templates/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActive }),
      });
      if (!res.ok) throw new Error();
      setTransactionalTemplates((prev) =>
        prev.map((t) => (t.id === row.id ? { ...t, is_active: newActive } : t))
      );
      toast.success(`"${row.name}" ${newActive ? "enabled" : "hidden"}`);
    } catch {
      toast.error("Failed to update template");
    }
  }

  async function handleRunAdminAlertCheck() {
    setRunningAlertCheck(true);
    try {
      const res = await fetch("/api/admin/alerts/run-check", { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        orgCount?: number;
        failedOrgs?: number;
      };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      const n = data.orgCount ?? 0;
      const f = data.failedOrgs ?? 0;
      const dedupeHint =
        "Uses org owners' emails, not the test field. Re-runs may send nothing (daily anomaly dedupe, 24h low-stock).";
      if (f > 0) {
        toast.warning(`Processed ${n} org(s); ${f} hit errors (see server logs).`, {
          description: dedupeHint,
          duration: 10_000,
        });
      } else {
        toast.success(`Alert checks finished for ${n} organization(s).`, {
          description: dedupeHint,
          duration: 10_000,
        });
      }
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to run alert checks");
    } finally {
      setRunningAlertCheck(false);
    }
  }

  async function handleSendTxnTest(row: TransactionalEmailTemplateRow) {
    if (!testEmail.trim()) {
      toast.error("Enter an email address first");
      return;
    }
    setSending(row.id);
    try {
      const res = await fetch("/api/admin/transactional-email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: row.slug,
          recipientEmail: testEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`Test sent to ${testEmail}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send test email");
    } finally {
      setSending(null);
    }
  }

  function updateSection(key: string, value: string) {
    setFormSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, value } : s))
    );
  }

  async function handleSave() {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          subject: formSubject,
          is_active: formActive,
          sections: formSections,
        }),
      });
      if (!res.ok) throw new Error();
      setTemplates(
        templates.map((t) =>
          t.id === editing.id
            ? {
                ...t,
                name: formName,
                subject: formSubject,
                is_active: formActive,
                sections: formSections,
              }
            : t
        )
      );
      toast.success(`"${formName}" template saved`);
      setEditing(null);
      router.refresh();
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendTest(template: EmailTemplate) {
    if (!testEmail.trim()) {
      toast.error("Enter an email address first");
      return;
    }
    setSending(template.id);
    try {
      const res = await fetch("/api/admin/email-templates/send-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: template.id,
          recipientEmail: testEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`Test email sent to ${testEmail}`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Failed to send test email"
      );
    } finally {
      setSending(null);
    }
  }

  async function toggleActive(template: EmailTemplate) {
    const newActive = !template.is_active;
    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActive }),
      });
      if (!res.ok) throw new Error();
      setTemplates(
        templates.map((t) =>
          t.id === template.id ? { ...t, is_active: newActive } : t
        )
      );
      toast.success(
        `"${template.name}" ${newActive ? "enabled" : "disabled"}`
      );
    } catch {
      toast.error("Failed to toggle template");
    }
  }

  // ---- Transactional editor ----
  if (txnEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setTxnEditing(null)}>
              <ArrowLeft className="mr-1 size-3" />
              Back
            </Button>
            <div>
              <h2 className="text-lg font-semibold">{formTxnName}</h2>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">{txnEditing.slug}</span> &middot; Optional overrides; empty fields use the
                built-in template from code
              </p>
              {isTransactionalEmailTestType(txnEditing.slug) ? (
                <p className="mt-2 max-w-2xl text-[13px] leading-snug text-foreground/85">
                  {TRANSACTIONAL_EMAIL_LABELS[txnEditing.slug].whatItIs}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="mr-4 flex items-center gap-2">
              <Switch checked={formTxnActive} onCheckedChange={setFormTxnActive} />
              <Label className="text-xs">Active</Label>
            </div>
            <Button onClick={() => void handleSaveTxn()} disabled={savingTxn} size="sm">
              <Save className="mr-1.5 size-3" />
              {savingTxn ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Email settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Display name</Label>
                  <Input
                    value={formTxnName}
                    onChange={(e) => setFormTxnName(e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Subject override</Label>
                  <Input
                    value={formTxnSubject}
                    onChange={(e) => setFormTxnSubject(e.target.value)}
                    className="mt-1 h-8 text-sm"
                    placeholder="Leave blank for built-in subject"
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Body HTML override</CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Inner content only — wrapped in the standard ChannelPulse shell when sent. Leave blank to use the
                  built-in layout from <span className="font-mono">templates.ts</span>.
                </p>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formTxnBody}
                  onChange={(e) => setFormTxnBody(e.target.value)}
                  rows={14}
                  className="font-mono text-xs"
                  placeholder="<!-- optional: your HTML here -->"
                />
              </CardContent>
            </Card>
          </div>
          <div>
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Live preview</CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    {formTxnBody.trim() ? "Custom body" : "Built-in sample"}
                  </Badge>
                </div>
                <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Subject</p>
                  <p className="mt-0.5 text-sm font-medium">
                    {formTxnSubject.trim()
                      ? formTxnSubject
                      : buildTransactionalTestEmail(txnEditing.slug as TransactionalEmailTestType).subject}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border-t">
                  <iframe
                    ref={txnIframeRef}
                    title="Transactional email preview"
                    className="w-full border-0"
                    style={{ height: "600px" }}
                    sandbox="allow-same-origin"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ---- Editor view ----
  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(null)}
            >
              <ArrowLeft className="mr-1 size-3" />
              Back
            </Button>
            <div>
              <h2 className="text-lg font-semibold">{formName}</h2>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">{editing.slug}</span> &middot;
                Edit the fields below and see changes live
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-4">
              <Switch checked={formActive} onCheckedChange={setFormActive} />
              <Label className="text-xs">Active</Label>
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="mr-1.5 size-3" />
              {saving ? "Saving…" : "Save Template"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Left: Structured editor */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Email Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Template Name</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Subject Line</Label>
                  <Input
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="mt-1 h-8 text-sm"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Dynamic values like {"{{count}}"} or {"{{channel_name}}"}{" "}
                    get replaced automatically when sent.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Email Content</CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Edit each section of the email. The preview updates live as you type.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {formSections.map((section) => (
                  <div key={section.key}>
                    <Label className="text-xs font-medium">
                      {section.label}
                    </Label>
                    {section.type === "note" ? (
                      <div className="mt-1 flex items-start gap-2 rounded-md border border-dashed border-muted-foreground/20 bg-muted/30 px-3 py-2">
                        <Info className="mt-0.5 size-3 shrink-0 text-muted-foreground/60" />
                        <p className="text-[11px] text-muted-foreground">
                          {section.value}
                        </p>
                      </div>
                    ) : (
                      <Input
                        value={section.value}
                        onChange={(e) =>
                          updateSection(section.key, e.target.value)
                        }
                        className="mt-1 h-8 text-sm"
                        placeholder={
                          section.type === "heading"
                            ? "Email heading"
                            : section.type === "button"
                              ? "Button text"
                              : section.type === "url"
                                ? "https://..."
                                : "Text content"
                        }
                      />
                    )}
                    {section.type === "text" &&
                      section.value.includes("{{") && (
                        <p className="mt-1 text-[10px] text-muted-foreground/60">
                          Contains dynamic values that are filled in
                          automatically.
                        </p>
                      )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right: Live preview */}
          <div>
            <Card className="sticky top-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Live Preview</CardTitle>
                  <Badge variant="outline" className="text-[10px]">
                    Updates as you type
                  </Badge>
                </div>
                <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    Subject
                  </p>
                  <p className="text-sm font-medium mt-0.5">
                    {formSubject || "(empty)"}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="border-t">
                  <iframe
                    ref={iframeRef}
                    title="Email Preview"
                    className="w-full border-0"
                    style={{ height: "600px" }}
                    sandbox="allow-same-origin"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ---- Template list view ----
  const sendTestCard = (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Send className="size-4 text-violet-500" />
          <CardTitle className="text-base">Send test email</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          <strong>Send test</strong> only — not used by Run alert checks (those use each org owner&apos;s email).
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label>Recipient email</Label>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1"
            />
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          On Resend&apos;s free tier, you can only send to the email you signed up with.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <Tabs value={mainTab} onValueChange={replaceEmailTab} className="flex flex-col gap-6">
      <TabsList className="grid h-auto w-full max-w-xl grid-cols-2 gap-1 bg-muted/50 p-1 sm:inline-flex sm:w-auto sm:max-w-none">
        <TabsTrigger value={TAB_TRANSACTIONAL} className="gap-2 px-4 py-2.5 sm:py-2">
          <Mail className="size-3.5 shrink-0 opacity-70" />
          Transactional
        </TabsTrigger>
        <TabsTrigger value={TAB_DATABASE} className="gap-2 px-4 py-2.5 sm:py-2">
          <LayoutTemplate className="size-3.5 shrink-0 opacity-70" />
          Database templates
        </TabsTrigger>
      </TabsList>

      <div className="flex flex-col gap-2 rounded-lg border border-blue-200/50 bg-blue-50/30 px-3 py-3 dark:border-blue-900/50 dark:bg-blue-950/20 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-900/80 dark:text-blue-300/90">
          Supabase
        </span>
        <div className="flex flex-wrap gap-2">
          <a
            href={SUPABASE_DASHBOARD_CRON_JOBS}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white/60 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-white dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50"
          >
            Cron jobs ↗
          </a>
          <a
            href={SUPABASE_DASHBOARD_TRANSACTIONAL_EMAIL_TEMPLATES}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white/60 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-white dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50"
          >
            transactional_email_templates ↗
          </a>
          <a
            href={SUPABASE_DASHBOARD_EMAIL_TEMPLATES}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white/60 px-2.5 py-1 text-[11px] font-medium text-blue-700 hover:bg-white dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50"
          >
            email_templates ↗
          </a>
        </div>
      </div>

      <TabsContent value={TAB_TRANSACTIONAL} className="mt-0 flex flex-col gap-6 outline-none">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">About transactional emails</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-snug text-muted-foreground">
              <li>
                Real notifications from ChannelPulse when data or schedule triggers fire — each row below says exactly
                what.
              </li>
              <li>
                Stored in <span className="font-mono text-xs">transactional_email_templates</span>.
              </li>
              <li>
                Hide a row (eye off), or override subject/HTML; empty fields use built-in HTML from{" "}
                <span className="font-mono text-xs">lib/email/templates.ts</span>.
              </li>
              <li>
                Send test adds a <code className="rounded bg-muted px-1 py-0.5 text-[11px]">[TEST]</code> subject
                prefix.
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80 bg-zinc-50/40 dark:border-zinc-800 dark:bg-zinc-950/30">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-zinc-600 dark:text-zinc-400" />
              <CardTitle className="text-base text-zinc-900 dark:text-zinc-100">
                When do these automatic emails go out?
              </CardTitle>
            </div>
            <CardDescription className="text-zinc-700/90 dark:text-zinc-300/90">
              Low stock, revenue, orders, and sync problems — there is no separate &quot;email only&quot; timer for them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-zinc-800 dark:text-zinc-200/90">
            <ol className="list-decimal space-y-4 pl-5 marker:font-semibold marker:text-zinc-900 dark:marker:text-zinc-100">
              <li className="space-y-1.5 pl-1">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  Low stock, revenue drop, order spike
                </span>
                <ul className="list-disc space-y-1 pl-4 text-zinc-700 dark:text-zinc-300/90">
                  <li>
                    <strong>Usually:</strong> right after a <strong>channel sync</strong> finishes. Sync pulls new data,
                    updates stats, <em>then</em> we decide whether to email.
                  </li>
                  <li>
                    <strong>What starts sync:</strong> the <strong>every-15-minute</strong> sync job (see{" "}
                    <strong>Admin → Sync &amp; Cron</strong>), or <strong>Sync all now</strong> there.
                  </li>
                  <li>
                    <strong>Normal users</strong> cannot trigger these checks from the browser or a secret URL — only
                    this admin area.
                  </li>
                </ul>
              </li>
              <li className="space-y-1.5 pl-1">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">Sync failure</span>
                <p className="text-zinc-700 dark:text-zinc-300/90">
                  If a sync <strong>fails</strong>, the org owner may get an email. That ties to a real sync attempt —
                  scheduled cron or <strong>Sync all now</strong> under <strong>Admin → Sync &amp; Cron</strong>.
                </p>
              </li>
            </ol>

            <div className="space-y-2 border-t border-zinc-200/80 pt-4 dark:border-zinc-800">
              <p className="font-medium text-zinc-900 dark:text-zinc-100">Admin: run checks without waiting for sync</p>
              <p className="text-[13px] leading-snug text-zinc-700 dark:text-zinc-300/90">
                Same low-stock and revenue/order-spike logic as post-sync, run once per org. Sends real mail only when
                rules + notification prefs match.
              </p>
              <p className="text-[13px] leading-snug text-zinc-700 dark:text-zinc-300/90">
                Ignores &quot;Recipient email&quot; below (that&apos;s for Send test only). Mail goes to each org
                owner&apos;s login email. Re-runs often send nothing: revenue/order once per day per comparison; low
                stock per SKU within 24h.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-1"
                disabled={runningAlertCheck}
                onClick={() => void handleRunAdminAlertCheck()}
              >
                {runningAlertCheck ? (
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                ) : (
                  <Zap className="mr-2 size-3.5" />
                )}
                {runningAlertCheck ? "Running…" : "Run alert checks (all orgs)"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {sendTestCard}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transactional templates</CardTitle>
            <p className="text-sm text-muted-foreground">
              One type per row. Eye = on (off = no real sends/tests). Mail goes out via your app email provider
              (e.g. Resend), not a personal inbox.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {transactionalTemplates.map((row) => {
                const Icon = SLUG_ICONS[row.slug] ?? Mail;
                const iconColor = SLUG_COLORS[row.slug] ?? "text-muted-foreground";
                const whatItIs = isTransactionalEmailTestType(row.slug)
                  ? TRANSACTIONAL_EMAIL_LABELS[row.slug].whatItIs
                  : null;
                return (
                  <div
                    key={row.id}
                    className={`flex items-start gap-4 p-5 ${!row.is_active ? "opacity-50" : ""}`}
                  >
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 ${iconColor}`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{row.name}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {row.slug}
                        </Badge>
                        {!row.is_active && (
                          <Badge variant="outline" className="text-[10px]">
                            Hidden
                          </Badge>
                        )}
                      </div>
                      {whatItIs ? (
                        <p className="mt-2 text-[13px] leading-snug text-foreground/85">{whatItIs}</p>
                      ) : row.description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">{row.description}</p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground/80">
                        {row.body_html?.trim() || row.subject?.trim()
                          ? `Overrides: ${row.subject?.trim() ? "subject" : ""}${row.subject?.trim() && row.body_html?.trim() ? ", " : ""}${row.body_html?.trim() ? "body" : ""}`
                          : "Using built-in template"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => toggleTxnActive(row)}
                      >
                        {row.is_active ? (
                          <Eye className="size-3.5 text-muted-foreground" />
                        ) : (
                          <EyeOff className="size-3.5 text-muted-foreground" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => openTxnEdit(row)}>
                        <Pencil className="size-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => void handleSendTxnTest(row)}
                        disabled={!testEmail.trim() || sending === row.id}
                      >
                        <Send className="mr-1 size-3" />
                        {sending === row.id ? "Sending…" : "Send test"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value={TAB_DATABASE} className="mt-0 flex flex-col gap-6 outline-none">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">About database templates</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              Marketing-style templates stored in <span className="font-mono text-xs">email_templates</span>. The app
              reads subject and structured <strong>sections</strong> from the database wherever those flows are wired.
              The live preview here is approximate (sample blocks for some slugs). Use edit to change headings, body
              text, and CTA; send a test to verify in your inbox.
            </CardDescription>
          </CardHeader>
        </Card>

        {sendTestCard}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Database templates</CardTitle>
            <p className="text-sm text-muted-foreground">
              Toggle active, edit sections, or send a test. Slugs match features that load from{" "}
              <span className="font-mono text-xs">email_templates</span>.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {templates.map((template) => {
                const Icon = SLUG_ICONS[template.slug] ?? Mail;
                const iconColor =
                  SLUG_COLORS[template.slug] ?? "text-muted-foreground";
                return (
                  <div
                    key={template.id}
                    className={`flex items-start gap-4 p-5 ${!template.is_active ? "opacity-50" : ""}`}
                  >
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 ${iconColor}`}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {template.name}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono"
                        >
                          {template.slug}
                        </Badge>
                        {!template.is_active && (
                          <Badge variant="outline" className="text-[10px]">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Subject: {template.subject}
                      </p>
                      {template.description && (
                        <p className="mt-1 text-xs text-muted-foreground/60">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => toggleActive(template)}
                      >
                        {template.is_active ? (
                          <Eye className="size-3.5 text-muted-foreground" />
                        ) : (
                          <EyeOff className="size-3.5 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => openEdit(template)}
                      >
                        <Pencil className="size-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handleSendTest(template)}
                        disabled={!testEmail.trim() || sending === template.id}
                      >
                        <Send className="mr-1 size-3" />
                        {sending === template.id ? "Sending…" : "Send Test"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
