"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Save,
  Sparkles,
  BarChart3,
  TrendingUp,
  PiggyBank,
  Trophy,
  AlertTriangle,
  ShoppingCart,
  Package,
  DollarSign,
  Percent,
  Clock,
  Layers,
  Zap,
  Target,
  Bot,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3,
  TrendingUp,
  PiggyBank,
  Trophy,
  AlertTriangle,
  ShoppingCart,
  Package,
  DollarSign,
  Percent,
  Clock,
  Layers,
  Zap,
  Target,
  Sparkles,
};

const ACCENT_OPTIONS = [
  { value: "bg-amber-500/10 text-amber-500", label: "Amber" },
  { value: "bg-blue-500/10 text-blue-500", label: "Blue" },
  { value: "bg-emerald-500/10 text-emerald-500", label: "Emerald" },
  { value: "bg-violet-500/10 text-violet-500", label: "Violet" },
  { value: "bg-red-500/10 text-red-500", label: "Red" },
  { value: "bg-cyan-500/10 text-cyan-500", label: "Cyan" },
  { value: "bg-pink-500/10 text-pink-500", label: "Pink" },
  { value: "bg-orange-500/10 text-orange-500", label: "Orange" },
  { value: "bg-teal-500/10 text-teal-500", label: "Teal" },
  { value: "bg-indigo-500/10 text-indigo-500", label: "Indigo" },
];

interface AiConfig {
  id: string;
  provider: string;
  model_id: string;
  model_display_name: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string | null;
}

interface ModelPreset {
  id: string;
  provider: string;
  model_id: string;
  display_name: string;
  sort_order: number;
  is_active: boolean;
}

interface SuggestedReport {
  id: string;
  icon_name: string;
  title: string;
  description: string;
  prompt: string;
  accent_class: string;
  sort_order: number;
  is_active: boolean;
}

interface Props {
  initialConfig: AiConfig | null;
  initialReports: SuggestedReport[];
  initialPresets: ModelPreset[];
}

export function AiSettingsClient({
  initialConfig,
  initialReports,
  initialPresets,
}: Props) {
  const router = useRouter();

  // --- Model config state ---
  const [config, setConfig] = useState<AiConfig | null>(initialConfig);
  const [modelSaving, setModelSaving] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  // --- Presets state ---
  const [presets, setPresets] = useState<ModelPreset[]>(initialPresets);
  const [editingPreset, setEditingPreset] = useState<ModelPreset | null>(null);
  const [isNewPreset, setIsNewPreset] = useState(false);
  const [presetSaving, setPresetSaving] = useState(false);
  const [presetForm, setPresetForm] = useState({
    display_name: "",
    model_id: "",
    provider: "openrouter",
    is_active: true,
  });

  // --- Reports state ---
  const [reports, setReports] = useState<SuggestedReport[]>(initialReports);
  const [editingReport, setEditingReport] = useState<SuggestedReport | null>(
    null
  );
  const [isNewReport, setIsNewReport] = useState(false);
  const [reportSaving, setReportSaving] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // --- Report form state ---
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPrompt, setFormPrompt] = useState("");
  const [formIcon, setFormIcon] = useState("BarChart3");
  const [formAccent, setFormAccent] = useState(ACCENT_OPTIONS[0].value);
  const [formActive, setFormActive] = useState(true);

  // ---- Model config handlers ----

  function handleSelectPreset(modelId: string | null) {
    if (!modelId) return;
    if (modelId === "custom" || !config) return;
    const preset = presets.find((p) => p.model_id === modelId);
    if (!preset) return;
    setConfig({
      ...config,
      provider: preset.provider,
      model_id: preset.model_id,
      model_display_name: preset.display_name,
    });
  }

  const activePreset = config
    ? presets.find((p) => p.model_id === config.model_id)
    : null;
  const presetValue = activePreset?.model_id ?? "custom";

  async function saveModelConfig() {
    if (!config) return;
    setModelSaving(true);
    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: config.provider,
          model_id: config.model_id,
          model_display_name: config.model_display_name,
          temperature: config.temperature,
          max_tokens: config.max_tokens,
          system_prompt: config.system_prompt,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("AI configuration saved");
      router.refresh();
    } catch {
      toast.error("Failed to save config");
    } finally {
      setModelSaving(false);
    }
  }

  // ---- Preset CRUD handlers ----

  function openNewPreset() {
    setIsNewPreset(true);
    setPresetForm({ display_name: "", model_id: "", provider: "openrouter", is_active: true });
    setEditingPreset({} as ModelPreset);
  }

  function openEditPreset(preset: ModelPreset) {
    setIsNewPreset(false);
    setPresetForm({
      display_name: preset.display_name,
      model_id: preset.model_id,
      provider: preset.provider,
      is_active: preset.is_active,
    });
    setEditingPreset(preset);
  }

  async function savePreset() {
    setPresetSaving(true);
    try {
      if (isNewPreset) {
        const res = await fetch("/api/admin/model-presets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            display_name: presetForm.display_name,
            model_id: presetForm.model_id,
            provider: presetForm.provider,
            is_active: presetForm.is_active,
          }),
        });
        if (!res.ok) throw new Error();
        const newPreset = await res.json();
        setPresets([...presets, newPreset]);
        toast.success(`"${presetForm.display_name}" added`);
      } else if (editingPreset?.id) {
        const res = await fetch(
          `/api/admin/model-presets/${editingPreset.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              display_name: presetForm.display_name,
              model_id: presetForm.model_id,
              provider: presetForm.provider,
              is_active: presetForm.is_active,
            }),
          }
        );
        if (!res.ok) throw new Error();
        setPresets(
          presets.map((p) =>
            p.id === editingPreset.id
              ? {
                  ...p,
                  display_name: presetForm.display_name,
                  model_id: presetForm.model_id,
                  provider: presetForm.provider,
                  is_active: presetForm.is_active,
                }
              : p
          )
        );
        toast.success(`"${presetForm.display_name}" updated`);
      }
      setEditingPreset(null);
    } catch {
      toast.error("Failed to save model preset");
    } finally {
      setPresetSaving(false);
    }
  }

  async function deletePreset(id: string, name: string) {
    if (!confirm(`Remove "${name}" from presets?`)) return;
    try {
      const res = await fetch(`/api/admin/model-presets/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setPresets(presets.filter((p) => p.id !== id));
      toast.success(`"${name}" removed`);
    } catch {
      toast.error("Failed to delete preset");
    }
  }

  async function togglePresetActive(preset: ModelPreset) {
    const newActive = !preset.is_active;
    try {
      const res = await fetch(`/api/admin/model-presets/${preset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActive }),
      });
      if (!res.ok) throw new Error();
      setPresets(
        presets.map((p) => (p.id === preset.id ? { ...p, is_active: newActive } : p))
      );
      toast.success(`"${preset.display_name}" ${newActive ? "shown in dropdown" : "hidden from dropdown"}`);
    } catch {
      toast.error("Failed to update preset");
    }
  }

  // ---- Report handlers ----

  function openNewReport() {
    setIsNewReport(true);
    setFormTitle("");
    setFormDescription("");
    setFormPrompt("");
    setFormIcon("BarChart3");
    setFormAccent(ACCENT_OPTIONS[0].value);
    setFormActive(true);
    setEditingReport({} as SuggestedReport);
  }

  function openEditReport(report: SuggestedReport) {
    setIsNewReport(false);
    setFormTitle(report.title);
    setFormDescription(report.description);
    setFormPrompt(report.prompt);
    setFormIcon(report.icon_name);
    setFormAccent(report.accent_class);
    setFormActive(report.is_active);
    setEditingReport(report);
  }

  async function saveReport() {
    setReportSaving(true);
    try {
      if (isNewReport) {
        const res = await fetch("/api/admin/suggested-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            icon_name: formIcon,
            title: formTitle,
            description: formDescription,
            prompt: formPrompt,
            accent_class: formAccent,
            is_active: formActive,
          }),
        });
        if (!res.ok) throw new Error();
        const newReport = await res.json();
        setReports([...reports, newReport]);
        toast.success(`"${formTitle}" created`);
      } else if (editingReport?.id) {
        const res = await fetch(
          `/api/admin/suggested-reports/${editingReport.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              icon_name: formIcon,
              title: formTitle,
              description: formDescription,
              prompt: formPrompt,
              accent_class: formAccent,
              is_active: formActive,
            }),
          }
        );
        if (!res.ok) throw new Error();
        setReports(
          reports.map((r) =>
            r.id === editingReport.id
              ? {
                  ...r,
                  icon_name: formIcon,
                  title: formTitle,
                  description: formDescription,
                  prompt: formPrompt,
                  accent_class: formAccent,
                  is_active: formActive,
                }
              : r
          )
        );
        toast.success(`"${formTitle}" updated`);
      }
      setEditingReport(null);
      router.refresh();
    } catch {
      toast.error("Failed to save report");
    } finally {
      setReportSaving(false);
    }
  }

  async function deleteReport(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/suggested-reports/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setReports(reports.filter((r) => r.id !== id));
      toast.success(`"${title}" deleted`);
    } catch {
      toast.error("Failed to delete report");
    }
  }

  async function toggleReportActive(report: SuggestedReport) {
    const newActive = !report.is_active;
    try {
      const res = await fetch(`/api/admin/suggested-reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: newActive }),
      });
      if (!res.ok) throw new Error();
      setReports(
        reports.map((r) =>
          r.id === report.id ? { ...r, is_active: newActive } : r
        )
      );
      toast.success(
        `"${report.title}" ${newActive ? "enabled" : "disabled"}`
      );
    } catch {
      toast.error("Failed to toggle report");
    }
  }

  // ---- Drag-and-drop reorder ----

  function handleDragStart(index: number) {
    setDragIdx(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === index) return;
    const reordered = [...reports];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(index, 0, moved);
    setReports(reordered);
    setDragIdx(index);
  }

  async function handleDragEnd() {
    setDragIdx(null);
    const order = reports.map((r) => r.id);
    try {
      await fetch("/api/admin/suggested-reports/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });
    } catch {
      toast.error("Failed to save order");
    }
  }

  const IconPreview = ICON_MAP[formIcon] ?? BarChart3;

  return (
    <>
      {/* ===== Model Configuration ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-violet-500" />
              <CardTitle className="text-base">
                AI Model Configuration
              </CardTitle>
            </div>
            <Button
              onClick={saveModelConfig}
              disabled={modelSaving}
              size="sm"
            >
              <Save className="mr-1.5 size-3" />
              {modelSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose the AI model powering the chat. Changes take effect
            immediately for all users.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {config && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Model</Label>
                  <Select value={presetValue} onValueChange={handleSelectPreset}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {presets
                        .filter((p) => p.is_active)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.model_id}>
                            {p.display_name}
                          </SelectItem>
                        ))}
                      <SelectItem
                        value="custom"
                        disabled={presetValue !== "custom"}
                      >
                        Custom
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Model ID (OpenRouter)</Label>
                  <Input
                    value={config.model_id}
                    onChange={(e) => {
                      const match = presets.find(
                        (p) => p.model_id === e.target.value
                      );
                      setConfig({
                        ...config,
                        model_id: e.target.value,
                        model_display_name:
                          match?.display_name ?? e.target.value,
                      });
                    }}
                    placeholder="e.g. google/gemini-2.5-flash"
                    className="mt-1 font-mono text-xs"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Pick from the dropdown or type any{" "}
                    <a
                      href="https://openrouter.ai/models"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      OpenRouter model ID
                    </a>
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>Display Name</Label>
                  <Input
                    value={config.model_display_name}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        model_display_name: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Temperature</Label>
                  <Input
                    type="number"
                    min={0}
                    max={2}
                    step={0.1}
                    value={config.temperature}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        temperature: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Controls response randomness. 0 = same answer every time,
                    0.7 = balanced (recommended), 2 = very random.
                    Lower is better for data accuracy.
                  </p>
                </div>
                <div>
                  <Label>Max Tokens</Label>
                  <Input
                    type="number"
                    min={256}
                    max={128000}
                    step={256}
                    value={config.max_tokens}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        max_tokens: parseInt(e.target.value) || 16384,
                      })
                    }
                    className="mt-1"
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Max length of the AI&apos;s response (not input). 1 token ≈ ¾ of a word.
                    Too low = responses get cut off mid-chart. Recommended: 8K–16K.
                    Higher = more cost per response.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Current active model
                </p>
                <p className="mt-0.5 text-sm font-medium">
                  {config.model_display_name}{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    ({config.model_id})
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Provider: {config.provider} · Temperature:{" "}
                  {config.temperature} · Max tokens:{" "}
                  {config.max_tokens.toLocaleString()}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ===== System Prompt (collapsible) ===== */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setPromptOpen(!promptOpen)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-emerald-500" />
              <CardTitle className="text-base">System Prompt</CardTitle>
              {config?.system_prompt && (
                <Badge variant="outline" className="text-[10px]">
                  {config.system_prompt.length.toLocaleString()} chars
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {promptOpen && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveModelConfig();
                  }}
                  disabled={modelSaving}
                  size="sm"
                >
                  <Save className="mr-1.5 size-3" />
                  {modelSaving ? "Saving..." : "Save"}
                </Button>
              )}
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform ${
                  promptOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            The instructions sent to the AI before every conversation. Click to{" "}
            {promptOpen ? "collapse" : "expand and edit"}.
          </p>
        </CardHeader>
        {promptOpen && config && (
          <CardContent>
            <Textarea
              value={config.system_prompt ?? ""}
              onChange={(e) =>
                setConfig({
                  ...config,
                  system_prompt: e.target.value || null,
                })
              }
              placeholder="Enter the system prompt..."
              rows={20}
              className="font-mono text-xs leading-relaxed"
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              {config.system_prompt
                ? `${config.system_prompt.length.toLocaleString()} characters`
                : "Empty — the code-level default prompt will be used"}
            </p>
          </CardContent>
        )}
      </Card>

      {/* ===== Model Presets ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Model Presets</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Models available in the dropdown above. Use the eye icon to hide or show a preset (same idea as email
                templates). Add new ones when providers release updates.
              </p>
            </div>
            <Button size="sm" onClick={openNewPreset}>
              <Plus className="mr-1.5 size-3" />
              Add Model
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className={`flex items-center justify-between gap-4 p-4 ${
                  !preset.is_active ? "opacity-50" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {preset.display_name}
                    </span>
                    {config?.model_id === preset.model_id && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 text-[10px]">
                        Active
                      </Badge>
                    )}
                    {!preset.is_active && (
                      <Badge variant="outline" className="text-[10px]">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {preset.provider}/{preset.model_id}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => togglePresetActive(preset)}
                    title={preset.is_active ? "Hide from model dropdown" : "Show in model dropdown"}
                  >
                    {preset.is_active ? (
                      <Eye className="size-3.5 text-muted-foreground" />
                    ) : (
                      <EyeOff className="size-3.5 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => openEditPreset(preset)}
                  >
                    <Pencil className="size-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-red-600"
                    onClick={() =>
                      deletePreset(preset.id, preset.display_name)
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {presets.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No model presets. Click &quot;Add Model&quot; to create one.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== Suggested Reports / Canned Questions ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Suggested Questions</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                These appear on the AI Insights welcome screen and as
                quick-access chips. Drag to reorder.
              </p>
            </div>
            <Button size="sm" onClick={openNewReport}>
              <Plus className="mr-1.5 size-3" />
              Add Question
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {reports.map((report, index) => {
              const Icon = ICON_MAP[report.icon_name] ?? BarChart3;
              return (
                <div
                  key={report.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-start gap-3 p-4 transition-colors ${
                    dragIdx === index ? "bg-muted/50" : ""
                  } ${!report.is_active ? "opacity-50" : ""}`}
                >
                  <div className="flex shrink-0 cursor-grab items-center pt-1 text-muted-foreground/40 active:cursor-grabbing">
                    <GripVertical className="size-4" />
                  </div>
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${report.accent_class}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {report.title}
                      </span>
                      {!report.is_active && (
                        <Badge variant="outline" className="text-[10px]">
                          Hidden
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {report.description}
                    </p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground/60 line-clamp-1">
                      {report.prompt}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => toggleReportActive(report)}
                      title={
                        report.is_active
                          ? "Hide from users"
                          : "Show to users"
                      }
                    >
                      {report.is_active ? (
                        <Eye className="size-3.5 text-muted-foreground" />
                      ) : (
                        <EyeOff className="size-3.5 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEditReport(report)}
                    >
                      <Pencil className="size-3.5 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-red-600"
                      onClick={() => deleteReport(report.id, report.title)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {reports.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                No suggested questions yet. Click &quot;Add Question&quot; to
                create one.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== Preset Edit/Create Dialog ===== */}
      <Dialog
        open={!!editingPreset}
        onOpenChange={(open) => !open && setEditingPreset(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isNewPreset
                ? "Add Model Preset"
                : `Edit "${editingPreset?.display_name}"`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Display Name</Label>
              <Input
                value={presetForm.display_name}
                onChange={(e) =>
                  setPresetForm({
                    ...presetForm,
                    display_name: e.target.value,
                  })
                }
                placeholder="e.g. Claude Sonnet 4"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Model ID</Label>
              <Input
                value={presetForm.model_id}
                onChange={(e) =>
                  setPresetForm({ ...presetForm, model_id: e.target.value })
                }
                placeholder="e.g. anthropic/claude-sonnet-4"
                className="mt-1 font-mono text-xs"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                The OpenRouter model identifier. Find IDs at{" "}
                <a
                  href="https://openrouter.ai/models"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  openrouter.ai/models
                </a>
              </p>
            </div>
            <div>
              <Label>Provider</Label>
              <Input
                value={presetForm.provider}
                onChange={(e) =>
                  setPresetForm({ ...presetForm, provider: e.target.value })
                }
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Switch
                checked={presetForm.is_active}
                onCheckedChange={(v) => setPresetForm({ ...presetForm, is_active: v })}
              />
              <Label>Show in model dropdown</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditingPreset(null)}>
              Cancel
            </Button>
            <Button
              onClick={savePreset}
              disabled={
                presetSaving ||
                !presetForm.display_name.trim() ||
                !presetForm.model_id.trim()
              }
            >
              {presetSaving
                ? "Saving..."
                : isNewPreset
                  ? "Add Model"
                  : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Report Edit / Create Dialog ===== */}
      <Dialog
        open={!!editingReport}
        onOpenChange={(open) => !open && setEditingReport(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isNewReport
                ? "New Suggested Question"
                : `Edit "${editingReport?.title}"`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                Preview
              </p>
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${formAccent}`}
                >
                  <IconPreview className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[13px] font-medium leading-tight">
                    {formTitle || "Title"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formDescription || "Description"}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Revenue Overview"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Icon</Label>
                <Select value={formIcon} onValueChange={(v) => setFormIcon(v ?? "")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ICON_MAP).map(([name, Ic]) => (
                      <SelectItem key={name} value={name}>
                        <div className="flex items-center gap-2">
                          <Ic className="size-3.5" />
                          {name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Short description shown under the title"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Prompt</Label>
              <Textarea
                value={formPrompt}
                onChange={(e) => setFormPrompt(e.target.value)}
                placeholder="The actual message sent to the AI when clicked"
                rows={3}
                className="mt-1"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                This is the exact text sent to the AI when a user clicks this
                suggestion.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Accent Color</Label>
                <Select value={formAccent} onValueChange={(v) => setFormAccent(v ?? "")}>
                  <SelectTrigger className="mt-1">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-3 w-3 shrink-0 rounded-full ${formAccent.split(" ")[0]}`}
                      />
                      <span>
                        {ACCENT_OPTIONS.find((o) => o.value === formAccent)?.label ?? "Select"}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {ACCENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-3 w-3 rounded-full ${opt.value.split(" ")[0]}`}
                          />
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-1">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formActive}
                    onCheckedChange={setFormActive}
                  />
                  <Label>Visible to users</Label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditingReport(null)}>
              Cancel
            </Button>
            <Button
              onClick={saveReport}
              disabled={
                reportSaving || !formTitle.trim() || !formPrompt.trim()
              }
            >
              {reportSaving
                ? "Saving..."
                : isNewReport
                  ? "Create Question"
                  : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
