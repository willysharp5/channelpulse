"use client";

import { Suspense } from "react";
import nextDynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { ImportChannelOption } from "./import-wizard";

const ImportWizard = nextDynamic(
  () => import("./import-wizard").then((m) => ({ default: m.ImportWizard })),
  {
    ssr: false,
    loading: () => (
      <div
        className="mx-auto max-w-3xl space-y-4"
        aria-busy="true"
        aria-label="Loading import"
      >
        <div className="h-20 animate-pulse rounded-lg bg-muted/50" />
        <div className="h-56 animate-pulse rounded-lg bg-muted/40" />
      </div>
    ),
  }
);

const JOB_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ImportWizardWithJobQuery({ channels }: { channels: ImportChannelOption[] }) {
  const sp = useSearchParams();
  const raw = sp.get("job");
  const recoverJobId = raw && JOB_ID_RE.test(raw) ? raw : null;
  return <ImportWizard channels={channels} recoverJobId={recoverJobId} />;
}

export function ImportWizardClient({ channels }: { channels: ImportChannelOption[] }) {
  return (
    <Suspense
      fallback={
        <div
          className="mx-auto max-w-3xl space-y-4"
          aria-busy="true"
          aria-label="Loading import"
        >
          <div className="h-20 animate-pulse rounded-lg bg-muted/50" />
          <div className="h-56 animate-pulse rounded-lg bg-muted/40" />
        </div>
      }
    >
      <ImportWizardWithJobQuery channels={channels} />
    </Suspense>
  );
}
