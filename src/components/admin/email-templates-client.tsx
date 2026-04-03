"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const SLUG_ICONS: Record<string, typeof Mail> = {
  low_stock: AlertTriangle,
  sync_error: RefreshCw,
  weekly_digest: BarChart3,
};

const SLUG_COLORS: Record<string, string> = {
  low_stock: "text-amber-500",
  sync_error: "text-red-500",
  weekly_digest: "text-blue-500",
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

interface Props {
  initialTemplates: EmailTemplate[];
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
    sampleContent = `<div style="display:flex;gap:12px;margin:16px 0;">
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

export function EmailTemplatesClient({ initialTemplates }: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");

  const [formName, setFormName] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formSections, setFormSections] = useState<Section[]>([]);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  const renderedHtml = useMemo(() => {
    if (!editing) return "";
    return buildPreviewHtml(formSubject, formSections, editing.slug);
  }, [formSubject, formSections, editing]);

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

  function openEdit(template: EmailTemplate) {
    setFormName(template.name);
    setFormSubject(template.subject);
    setFormActive(template.is_active);
    setFormSections(
      Array.isArray(template.sections) ? [...template.sections] : []
    );
    setEditing(template);
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
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Send className="size-4 text-violet-500" />
            <CardTitle className="text-base">Send Test Email</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter your email and click &quot;Send Test&quot; on any template.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label>Recipient Email</Label>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Templates</CardTitle>
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
    </>
  );
}
