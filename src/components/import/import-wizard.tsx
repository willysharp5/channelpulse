"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  OctagonPause,
  Package,
  ShoppingCart,
  Warehouse,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CHANNEL_CONFIG } from "@/lib/constants";
import { describeImportJobOutcome } from "@/lib/import/import-outcome-summary";
import type { ImportType } from "@/lib/import/templates";
import { fieldsForType } from "@/lib/import/templates";
import { parseCsv } from "@/lib/import/csv-parser";
import {
  applyMapping,
  mappingArrayToRecord,
  suggestColumnMapping,
  type ColumnMapping,
} from "@/lib/import/mapper";
import { validateAllRows } from "@/lib/import/validators";
import {
  exceedsImportRowLimit,
  importRowLimitMessage,
  MAX_CSV_IMPORT_ROWS_PER_REQUEST,
} from "@/lib/import/limits";
import { TemplateDownload, downloadImportTemplate } from "./template-download";
import { CsvDropzone } from "./csv-dropzone";
import { ColumnMapper } from "./column-mapper";
import { PreviewTable } from "./preview-table";

export interface ImportChannelOption {
  id: string;
  name: string;
  platform: string;
}

type Step = "type" | "file" | "map" | "review";

/** Select value must never be `undefined` — Base UI treats that as uncontrolled. */
const NO_CHANNEL_VALUE = "__import_no_channel__";

const TYPE_META: Record<
  ImportType,
  { title: string; description: string; icon: typeof ShoppingCart }
> = {
  orders: {
    title: "Orders",
    description: "Sales you’ve had — dates, amounts, and fees from a spreadsheet",
    icon: ShoppingCart,
  },
  products: {
    title: "Products",
    description: "What you sell — names, SKUs, costs, and photos from a spreadsheet",
    icon: Package,
  },
  inventory: {
    title: "Inventory",
    description: "How many you have in stock — quantities by SKU from a spreadsheet",
    icon: Warehouse,
  },
};

/** Rows stored on `import_jobs` (mapped payload). */
function normalizeStoredImportRows(raw: unknown): Record<string, string>[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    if (!row || typeof row !== "object") return {};
    const o: Record<string, string> = {};
    for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
      if (v == null) o[k] = "";
      else if (typeof v === "string") o[k] = v;
      else o[k] = String(v);
    }
    return o;
  });
}

function pushAppAlert(payload: {
  type: "import_complete" | "import_failed" | "import_stalled";
  title: string;
  message: string;
  action_url?: string;
  link_label?: string;
}) {
  void fetch("/api/alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("[ChannelPulse] Bell notification was not saved:", res.status, detail);
        let msg = "Couldn’t save to notifications.";
        try {
          const j = JSON.parse(detail) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          /* ignore */
        }
        toast.error("Notification not saved", { description: msg });
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        alert?: {
          id: string;
          type?: string;
          severity?: string;
          title: string;
          message: string;
          created_at: string;
          is_read: boolean;
          metadata?: unknown;
        };
      };
      if (data.alert?.id) {
        window.dispatchEvent(new CustomEvent("channelpulse:alerts-push", { detail: data.alert }));
        return;
      }
      window.dispatchEvent(new Event("channelpulse:alerts-refresh"));
    })
    .catch((err) => {
      console.error("[ChannelPulse] Bell notification request failed:", err);
    });
}

function notifyImportComplete(args: {
  importType: ImportType;
  imported: number;
  skipped: number;
  insertedNew: number;
  updatedExisting: number;
  channelName: string;
  platform: string;
  routerPush: (path: string) => void;
  /** When set (from API / DB), matches admin “What happened” and persisted `outcome_summary`. */
  outcomeSummary?: string | null;
}) {
  const {
    importType,
    imported,
    skipped,
    insertedNew,
    updatedExisting,
    channelName,
    platform,
    routerPush,
    outcomeSummary,
  } = args;
  const path = postImportReviewPath(importType, platform || "all");
  const trimmedSummary = outcomeSummary?.trim();
  const message =
    trimmedSummary ||
    describeImportJobOutcome({
      status: "completed",
      importType,
      imported,
      skipped,
      insertedNew,
      updatedExisting,
      channelName: channelName.trim() || "this channel",
    });

  const toastTitle =
    insertedNew > 0
      ? "Your import finished"
      : updatedExisting > 0 && imported > 0
        ? "Import finished — existing rows refreshed"
        : imported > 0
          ? "Import finished"
          : "Import finished";

  toast.success(toastTitle, {
    description: message,
    duration: 12_000,
    action: {
      label: "View",
      onClick: () => routerPush(path),
    },
  });

  const alertTitle =
    toastTitle === "Your import finished" ? "Import complete" : toastTitle;

  pushAppAlert({
    type: "import_complete",
    title: alertTitle,
    message,
    action_url: path,
    link_label: "View imported data",
  });
}

function postImportReviewPath(importType: ImportType, platform: string): string {
  const ch = encodeURIComponent(platform);
  const hash = "#imported-data-table";
  switch (importType) {
    case "orders":
      return `/orders?source=csv&channel=${ch}${hash}`;
    case "products":
      return `/products?source=csv&channel=${ch}${hash}`;
    case "inventory":
      return `/inventory?source=csv&channel=${ch}${hash}`;
    default:
      return `/orders?source=csv&channel=${ch}${hash}`;
  }
}

const POLL_TIMEOUT_MS = 3 * 60 * 1000;

function requiredFieldsMapped(importType: ImportType, mapping: ColumnMapping): string[] {
  const fields = fieldsForType(importType);
  const targets = new Set(
    Object.values(mapping).filter((v): v is string => Boolean(v))
  );
  return fields.filter((f) => f.required && !targets.has(f.key)).map((f) => f.label);
}

export function ImportWizard({
  channels,
  recoverJobId = null,
}: {
  channels: ImportChannelOption[];
  recoverJobId?: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");
  const [importType, setImportType] = useState<ImportType>("orders");
  const [channelId, setChannelId] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  /** When set, preview / queue use rows recovered from a failed `import_jobs` row (avoids applyMapping dropping empty strings). */
  const [mappedRowsOverride, setMappedRowsOverride] = useState<Record<string, string>[] | null>(null);
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [importing, setImporting] = useState(false);
  const [jobPollId, setJobPollId] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const queuedPollCountRef = useRef(0);
  const queueAbortRef = useRef<AbortController | null>(null);
  const stopPollingRef = useRef(false);
  const pollStartedAtRef = useRef(0);
  /** Snapshot for import completion toast + bell (channel may change mid-poll). */
  const importChannelMetaRef = useRef({ name: "", platform: "" });
  const lastRecoveredJobRef = useRef<string | null>(null);

  const selectedChannel = channels.find((c) => c.id === channelId);

  const mappedRows = useMemo(() => {
    if (mappedRowsOverride) return mappedRowsOverride;
    if (rawHeaders.length === 0) return [];
    return applyMapping(rawRows, rawHeaders, mapping);
  }, [mappedRowsOverride, rawRows, rawHeaders, mapping]);

  const validationResults = useMemo(
    () => validateAllRows(importType, mappedRows),
    [importType, mappedRows]
  );

  const rowErrorMessages = useMemo(
    () => validationResults.map((r) => r.errors),
    [validationResults]
  );

  const validCount = validationResults.filter((r) => r.valid).length;
  const invalidCount = validationResults.length - validCount;

  const pendingImportCount = useMemo(() => {
    let n = 0;
    for (let i = 0; i < mappedRows.length; i++) {
      if (skipInvalid && !validationResults[i]?.valid) continue;
      n++;
    }
    return n;
  }, [mappedRows, skipInvalid, validationResults]);

  const importOverLimit = exceedsImportRowLimit(pendingImportCount);
  const previewHeaders = useMemo(() => {
    const present = new Set<string>();
    for (const row of mappedRows) {
      Object.keys(row).forEach((k) => present.add(k));
    }
    return fieldsForType(importType)
      .map((f) => f.key)
      .filter((k) => present.has(k));
  }, [mappedRows, importType]);

  const missingRequired = useMemo(
    () => requiredFieldsMapped(importType, mapping),
    [importType, mapping]
  );

  const clearFileStateOnly = useCallback(() => {
    setMappedRowsOverride(null);
    setFileName("");
    setRawHeaders([]);
    setRawRows([]);
    setMapping({});
  }, []);

  const resetFile = useCallback(() => {
    clearFileStateOnly();
    setImportMessage(null);
  }, [clearFileStateOnly]);

  const onFileText = useCallback(
    (text: string, name: string) => {
      setMappedRowsOverride(null);
      const { headers, rows } = parseCsv(text);
      if (headers.length === 0 || rows.length === 0) {
        setImportMessage("No rows found in CSV.");
        return;
      }
      setImportMessage(null);
      setFileName(name);
      setRawHeaders(headers);
      setRawRows(rows);
      const fields = fieldsForType(importType);
      const suggested = suggestColumnMapping(headers, fields);
      setMapping(mappingArrayToRecord(headers, suggested));
      setStep("map");
    },
    [importType]
  );

  const goReview = useCallback(() => {
    if (missingRequired.length > 0) {
      setImportMessage(`Map required fields: ${missingRequired.join(", ")}`);
      return;
    }
    setImportMessage(null);
    setStep("review");
  }, [missingRequired]);

  const onMappingChange = useCallback((next: ColumnMapping) => {
    setMappedRowsOverride(null);
    setMapping(next);
  }, []);

  useEffect(() => {
    // No deep link: allow the next `?job=` visit (e.g. same bell item again) to run recovery.
    if (!recoverJobId) {
      lastRecoveredJobRef.current = null;
      return;
    }
    // While still on `?job=id` before router.replace, skip duplicate in-flight recovery for that id.
    if (lastRecoveredJobRef.current === recoverJobId) return;
    lastRecoveredJobRef.current = recoverJobId;
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch(`/api/import/jobs/${recoverJobId}?include_rows=1`, { credentials: "include" });
        const data = (await r.json().catch(() => ({}))) as {
          error?: string;
          job?: {
            id: string;
            channel_id: string;
            import_type: ImportType;
            status: string;
            error_message: string | null;
            rows?: unknown;
          };
        };
        if (cancelled) return;
        if (!r.ok || !data.job) {
          setImportMessage(data.error ?? "Could not load this import.");
          router.replace("/import", { scroll: false });
          return;
        }
        const j = data.job;
        if (j.status === "failed") {
          const rows = normalizeStoredImportRows(j.rows);
          if (rows.length === 0) {
            const err = j.error_message?.trim() ?? "";
            setImportMessage(
              err
                ? `Import failed: ${err} (no row data was kept — upload the CSV again).`
                : "Import failed and no row data was kept. Upload your CSV again."
            );
            router.replace("/import", { scroll: false });
            return;
          }
          const fields = fieldsForType(j.import_type);
          const headerSet = new Set<string>();
          for (const row of rows) {
            Object.keys(row).forEach((k) => headerSet.add(k));
          }
          const headers = [...headerSet].sort((a, b) => a.localeCompare(b));
          const paddedRows = rows.map((row) => {
            const out: Record<string, string> = {};
            for (const h of headers) out[h] = row[h] ?? "";
            return out;
          });
          const suggested = suggestColumnMapping(headers, fields);
          setImportType(j.import_type);
          setChannelId(j.channel_id);
          setFileName(`Recovered import (${j.id.slice(0, 8)}…)`);
          setRawHeaders(headers);
          setRawRows(paddedRows);
          setMapping(mappingArrayToRecord(headers, suggested));
          setMappedRowsOverride(rows);
          setStep("review");
          setSkipInvalid(true);
          const errDetail = (j.error_message ?? "Unknown error").trim();
          const shortErr = errDetail.length > 600 ? `${errDetail.slice(0, 600)}…` : errDetail;
          setImportMessage(
            `Previous import failed: ${shortErr} — rows below are what we tried to save; fix and run again, or re-upload.`
          );
          router.replace("/import", { scroll: false });
          return;
        }
        setImportMessage(
          j.status === "completed"
            ? "This import already finished successfully. Open Orders, Products, or Inventory to see your data."
            : j.status === "running" || j.status === "queued"
              ? "This import is still processing. Stay on this page or watch the bell for updates."
              : "Could not restore this import."
        );
        router.replace("/import", { scroll: false });
      } catch {
        if (!cancelled) {
          setImportMessage("Could not load import job.");
          router.replace("/import", { scroll: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recoverJobId, router]);

  useEffect(() => {
    if (!jobPollId) return;
    const watchedJobId = jobPollId;
    let cancelled = false;
    stopPollingRef.current = false;
    pollStartedAtRef.current = Date.now();

    function finishPolling() {
      if (!cancelled) {
        setImporting(false);
        setJobPollId(null);
      }
    }

    async function poll() {
      if (stopPollingRef.current) return;
      if (Date.now() - pollStartedAtRef.current > POLL_TIMEOUT_MS) {
        if (!cancelled) {
          const stallMsg =
            "We stopped checking after a few minutes. Your import might still be running — check the Import page or your Orders, Products, or Inventory lists.";
          setImportMessage(
            "We stopped checking after a few minutes. Your import might still be running — open the bell (top right) or check Orders, Products, or Inventory."
          );
          pushAppAlert({
            type: "import_stalled",
            title: "Import status unclear",
            message: stallMsg,
            action_url: `/import?job=${encodeURIComponent(watchedJobId)}`,
            link_label: "Open Import",
          });
          finishPolling();
        }
        return;
      }
      try {
        const r = await fetch(`/api/import/jobs/${watchedJobId}`);
        const data = (await r.json().catch(() => ({}))) as {
          error?: string;
          job?: {
            status: string;
            imported_count: number;
            skipped_count: number;
            inserted_new_count?: number;
            updated_existing_count?: number;
            error_message: string | null;
            outcome_summary?: string | null;
          };
        };
        if (cancelled) return;
        if (!r.ok) {
          setImportMessage(data.error ?? "Could not load import status.");
          finishPolling();
          return;
        }
        const j = data.job;
        if (!j) {
          setImportMessage("Import job not found.");
          finishPolling();
          return;
        }

        if (j.status === "completed") {
          queuedPollCountRef.current = 0;
          clearFileStateOnly();
          setImportMessage(null);
          const meta = importChannelMetaRef.current;
          notifyImportComplete({
            importType,
            imported: j.imported_count,
            skipped: j.skipped_count,
            insertedNew: j.inserted_new_count ?? 0,
            updatedExisting: j.updated_existing_count ?? 0,
            channelName: meta.name || "this channel",
            platform: meta.platform,
            routerPush: (p) => router.push(p),
            outcomeSummary: j.outcome_summary,
          });
          setStep("type");
          finishPolling();
          return;
        }
        if (j.status === "failed") {
          queuedPollCountRef.current = 0;
          const errMsg = j.error_message ?? "Import failed.";
          setImportMessage(null);
          toast.error("Import failed", {
            description: errMsg,
            duration: 12_000,
          });
          pushAppAlert({
            type: "import_failed",
            title: `Import failed — ${TYPE_META[importType].title}`,
            message: errMsg.slice(0, 2000),
            action_url: `/import?job=${encodeURIComponent(watchedJobId)}`,
            link_label: "Review import",
          });
          finishPolling();
          return;
        }

        if (j.status === "running") {
          queuedPollCountRef.current = 0;
          setImportMessage("Almost there — saving your rows…");
        } else if (j.status === "queued") {
          queuedPollCountRef.current += 1;
          if (queuedPollCountRef.current >= 15) {
            setImportMessage(
              "This is taking longer than usual. You can leave this page — check the bell icon (top right) for updates, or try again in a few minutes."
            );
          } else {
            setImportMessage("Hang tight — we’re processing your file. You can switch pages; we’ll notify you when it’s done.");
          }
        }
      } catch {
        if (!cancelled) {
          setImportMessage("Network error while checking import status.");
          finishPolling();
        }
      }
    }

    const iv = setInterval(poll, 2000);
    poll();
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [jobPollId, clearFileStateOnly, importType, router]);

  const runImport = useCallback(async () => {
    if (!channelId) return;
    const payloadRows = mappedRows
      .map((row, i) => ({ row, i }))
      .filter(({ i }) => !skipInvalid || validationResults[i]?.valid)
      .map(({ row }) => row);

    if (payloadRows.length === 0) {
      setImportMessage("No valid rows to import. Fix errors or disable “Skip invalid rows”.");
      return;
    }

    if (exceedsImportRowLimit(payloadRows.length)) {
      setImportMessage(importRowLimitMessage(payloadRows.length));
      return;
    }

    queueAbortRef.current?.abort();
    queueAbortRef.current = new AbortController();
    setImporting(true);
    setImportMessage("Sending your file…");
    const chMeta = channels.find((c) => c.id === channelId);
    importChannelMetaRef.current = {
      name: chMeta?.name ?? "",
      platform: chMeta?.platform ?? "",
    };
    try {
      const res = await fetch("/api/import/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          importType,
          rows: payloadRows,
        }),
        signal: queueAbortRef.current.signal,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        jobId?: string;
        message?: string;
        jobCompleted?: boolean;
        imported?: number;
        skipped?: number;
        insertedNew?: number;
        updatedExisting?: number;
        outcomeSummary?: string | null;
      };
      if (!res.ok) {
        setImportMessage(data.error ?? data.message ?? "Could not queue import");
        setImporting(false);
        return;
      }
      if (!data.jobId) {
        setImportMessage("Queue did not return a job id.");
        setImporting(false);
        return;
      }
      if (data.jobCompleted === true) {
        queuedPollCountRef.current = 0;
        clearFileStateOnly();
        setImportMessage(null);
        const meta = importChannelMetaRef.current;
        notifyImportComplete({
          importType,
          imported: data.imported ?? 0,
          skipped: data.skipped ?? 0,
          insertedNew: data.insertedNew ?? 0,
          updatedExisting: data.updatedExisting ?? 0,
          channelName: meta.name || "this channel",
          platform: meta.platform,
          routerPush: (p) => router.push(p),
          outcomeSummary: data.outcomeSummary,
        });
        setStep("type");
        setImporting(false);
        return;
      }
      setImportMessage(
        data.message ??
          "Import queued. You can leave this page — we will show the result here if you stay open."
      );
      queuedPollCountRef.current = 0;
      setJobPollId(data.jobId);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setImportMessage("Request cancelled — nothing was sent, or the browser aborted the upload.");
        setImporting(false);
        return;
      }
      setImportMessage("Network error during import.");
      setImporting(false);
    }
  }, [
    channelId,
    importType,
    mappedRows,
    skipInvalid,
    validationResults,
    channels,
    clearFileStateOnly,
    router,
  ]);

  const cancelQueueRequest = useCallback(() => {
    queueAbortRef.current?.abort();
  }, []);

  const stopWatchingJob = useCallback(() => {
    stopPollingRef.current = true;
    setImporting(false);
    setJobPollId(null);
    setImportMessage(
      "You’ve stopped following this import on this screen. It may still finish in the background — check the bell icon (top right) or your Orders, Products, or Inventory pages."
    );
  }, []);

  const platformLabel = (p: string) =>
    CHANNEL_CONFIG[p as keyof typeof CHANNEL_CONFIG]?.label ??
    p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const typeMeta = TYPE_META[importType];
  const channelContext =
    selectedChannel != null
      ? `${selectedChannel.name} · ${platformLabel(selectedChannel.platform)}`
      : null;

  const channelsSorted = useMemo(
    () =>
      [...channels].sort(
        (a, b) =>
          a.platform.localeCompare(b.platform) || a.name.localeCompare(b.name)
      ),
    [channels]
  );

  if (channels.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connect a channel first</CardTitle>
          <CardDescription>
            Imports are tied to a store channel. Add a channel under Channels, then return here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Alert className="border-muted-foreground/20 bg-muted/25 py-2 pl-2 pr-2.5 [&_[data-slot=alert-title]]:mb-0.5">
        <Info className="size-3.5 shrink-0 opacity-70" />
        <AlertTitle className="text-xs font-medium leading-tight">Before you start</AlertTitle>
        <AlertDescription className="text-xs leading-snug text-muted-foreground">
          You can upload up to{" "}
          <span className="font-medium text-foreground">{MAX_CSV_IMPORT_ROWS_PER_REQUEST}</span> rows at a time. If some
          lines look wrong, turn on <span className="font-medium text-foreground">Skip invalid rows</span> so the rest
          can still import. You don’t have to stay on this page — when the import finishes, you’ll see a{" "}
          <span className="font-medium text-foreground">toast</span> and the same summary in the{" "}
          <span className="font-medium text-foreground">bell</span> (top right).
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
        {(["type", "file", "map", "review"] as const).map((s, idx) => (
          <span key={s} className={cn("flex items-center gap-1", step === s && "font-semibold text-foreground")}>
            {idx + 1}. {s === "type" ? "Type & channel" : s === "file" ? "Upload" : s === "map" ? "Map columns" : "Review"}
            {idx < 3 ? <span className="px-1">→</span> : null}
          </span>
        ))}
      </div>

      {step !== "type" && channelContext ? (
        <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm">
          <p className="font-semibold text-foreground">
            Importing: <span className="text-primary">{typeMeta.title}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Into <span className="font-medium text-foreground">{channelContext}</span>
          </p>
        </div>
      ) : null}

      {step === "type" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">What do you want to import?</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose one type, then pick the store below. You can change this before you upload a file.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(TYPE_META) as ImportType[]).map((t) => {
              const meta = TYPE_META[t];
              const Icon = meta.icon;
              const active = importType === t;
              return (
                <div
                  key={t}
                  className={cn(
                    "flex flex-col overflow-hidden rounded-lg border transition-colors",
                    active ? "border-primary ring-1 ring-primary" : "hover:border-muted-foreground/30"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setImportType(t);
                      resetFile();
                      setStep("type");
                    }}
                    className={cn(
                      "flex flex-1 flex-col p-3 text-left transition-colors sm:p-3.5",
                      active ? "bg-primary/5" : "hover:bg-muted/50"
                    )}
                  >
                    <Icon className="mb-1.5 size-5 text-primary" />
                    <div className="text-sm font-semibold">{meta.title}</div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{meta.description}</p>
                  </button>
                  <div className="border-t bg-muted/20 px-2 py-1.5">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto min-h-0 px-0 py-0 text-[11px] font-medium"
                      onClick={(e) => {
                        e.preventDefault();
                        downloadImportTemplate(t);
                      }}
                    >
                      Download {meta.title.toLowerCase()} CSV template
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <Card>
            <CardHeader className="space-y-1 pb-3">
              <CardTitle className="text-base">Channel</CardTitle>
              <CardDescription className="text-xs">Data is saved under this store; platform comes from the channel.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Select channel</Label>
                <Select
                  value={channelId === "" ? NO_CHANNEL_VALUE : channelId}
                  onValueChange={(v: string | null) => {
                    const next = v ?? NO_CHANNEL_VALUE;
                    setChannelId(next === NO_CHANNEL_VALUE ? "" : next);
                  }}
                >
                  <SelectTrigger className="max-w-md bg-background">
                    <SelectValue>
                      {(val) => {
                        if (val == null || val === NO_CHANNEL_VALUE) {
                          return (
                            <span className="text-muted-foreground">Choose a channel…</span>
                          );
                        }
                        const c = channelsSorted.find((ch) => ch.id === val);
                        if (c) {
                          return `${platformLabel(c.platform)} — ${c.name}`;
                        }
                        return (
                          <span className="text-muted-foreground">Choose a channel…</span>
                        );
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CHANNEL_VALUE}>Choose a channel…</SelectItem>
                    {channelsSorted.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {platformLabel(c.platform)} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button disabled={!channelId} onClick={() => setStep("file")}>
                Continue
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "file" && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Upload your {typeMeta.title.toLowerCase()} file</CardTitle>
              <CardDescription className="text-xs">
                CSV with your {typeMeta.title.toLowerCase()} — same columns as the template or your own names (we’ll map
                them next). Up to {MAX_CSV_IMPORT_ROWS_PER_REQUEST} rows per import.
              </CardDescription>
            </div>
            <TemplateDownload importType={importType} />
          </CardHeader>
          <CardContent className="space-y-3">
            <CsvDropzone onFileText={onFileText} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("type")}>
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "map" && (
        <Card>
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="text-base">Match columns to {typeMeta.title.toLowerCase()} fields</CardTitle>
            <CardDescription className="text-xs">
              File <span className="font-mono">{fileName}</span> · {rawRows.length} rows · max{" "}
              {MAX_CSV_IMPORT_ROWS_PER_REQUEST} per import. Pick which CSV column goes to each{" "}
              {typeMeta.title.toLowerCase()} field.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ColumnMapper
              importType={importType}
              csvHeaders={rawHeaders}
              mapping={mapping}
              onChange={onMappingChange}
            />
            {missingRequired.length > 0 ? (
              <p className="text-sm text-destructive">
                Required fields not mapped: {missingRequired.join(", ")}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStep("file")}>
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
              <Button onClick={goReview}>
                Preview & validate
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "review" && (
        <Card>
          <CardHeader className="space-y-1 pb-3">
            <CardTitle className="text-base">Review {typeMeta.title.toLowerCase()} before importing</CardTitle>
            <CardDescription className="text-xs">
              {validCount} rows look good · {invalidCount} with issues · we’ll send{" "}
              <strong>{pendingImportCount}</strong> rows (max {MAX_CSV_IMPORT_ROWS_PER_REQUEST}).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <PreviewTable
              importType={importType}
              headers={previewHeaders}
              rows={mappedRows}
              rowErrors={rowErrorMessages}
            />
            <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5">
              <div>
                <Label htmlFor="skip-invalid" className="text-xs font-medium">
                  Skip invalid rows
                </Label>
                <p className="text-[11px] text-muted-foreground">Only valid rows are queued.</p>
              </div>
              <Switch id="skip-invalid" checked={skipInvalid} onCheckedChange={setSkipInvalid} />
            </div>
            {!skipInvalid && invalidCount > 0 ? (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Import may fail for bad rows depending on database constraints.
              </p>
            ) : null}
            {importOverLimit ? (
              <Alert variant="destructive" className="py-2 text-xs">
                <AlertTitle className="text-xs">Too many rows</AlertTitle>
                <AlertDescription className="text-xs">{importRowLimitMessage(pendingImportCount)}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => setStep("map")} disabled={importing || Boolean(jobPollId)}>
                <ArrowLeft className="mr-2 size-4" />
                Back
              </Button>
              <Button
                onClick={runImport}
                disabled={
                  importing || Boolean(jobPollId) || !channelId || importOverLimit || pendingImportCount === 0
                }
              >
                {importing || jobPollId ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 size-4" />
                )}
                {importing && !jobPollId ? "Uploading…" : jobPollId ? "Working…" : "Run import"} (
                {pendingImportCount} row{pendingImportCount === 1 ? "" : "s"})
              </Button>
              {importing && !jobPollId ? (
                <Button type="button" variant="outline" size="sm" onClick={cancelQueueRequest}>
                  <OctagonPause className="mr-1.5 size-3.5" />
                  Cancel request
                </Button>
              ) : null}
              {jobPollId ? (
                <Button type="button" variant="outline" size="sm" onClick={stopWatchingJob}>
                  <OctagonPause className="mr-1.5 size-3.5" />
                  Stop watching
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {importMessage ? (
        <p
          className={cn(
            "text-xs leading-snug",
            /Queued|queue|Processing|Submitting|Importing|background|leave this page|stay open|Waiting/i.test(
              importMessage
            )
              ? "text-muted-foreground"
              : /cancel|Cancelled|Stopped|Timed out|error/i.test(importMessage)
                ? "text-amber-700 dark:text-amber-400"
                : "text-destructive"
          )}
        >
          {importMessage}
        </p>
      ) : null}
    </div>
  );
}
