import { useState } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { CheckCircle2 } from "lucide-react";
import { ConfidenceRing } from "@/components/shared/ConfidenceRing";
import { CandidateList } from "@/components/shared/CandidateList";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getScan, decideScan } from "@/lib/api";

const STATUS_TONE = { pending: "warning", confirmed: "success", overridden: "brand" };
const STATUS_LABEL = { pending: "Needs review", confirmed: "Confirmed", overridden: "Overridden" };

export default function ScanDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: scan, error, isLoading, mutate } = useSWR(id ? ["scan-detail", id] : null, () => getScan(id));
  const [overriding, setOverriding] = useState(false);
  const [overrideName, setOverrideName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleDecision(action, drugName) {
    setSubmitting(true);
    try {
      const updated = await decideScan(id, { action, drugName });
      mutate(updated, false);
      setOverriding(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !id) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 py-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) return <ErrorState message={error.message} onRetry={() => mutate()} />;

  if (!scan.candidates?.length) {
    return (
      <div className="mx-auto max-w-2xl py-6">
        <EmptyState
          title="No drug match found for this scan"
          description={`Raw OCR text: "${scan.raw_ocr_text}"`}
          actionLabel="Back to queue"
          onAction={() => router.push("/pharmacist/queue")}
        />
      </div>
    );
  }

  const top = scan.top_pick;

  return (
    <div className="flex max-w-4xl flex-col gap-6 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Verify reading</h1>
          <p className="text-xs text-ink-faint">{new Date(scan.created_at).toLocaleString()}</p>
        </div>
        <Badge tone={STATUS_TONE[scan.status]}>{STATUS_LABEL[scan.status]}</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Original image</h2>
          <div className="overflow-hidden rounded-lg border border-border bg-surface-sunken">
            {scan.image_data_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={scan.image_data_url} alt="Prescription scan" className="w-full object-contain" />
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-ink-faint">No image stored</div>
            )}
          </div>
          <p className="font-mono text-xs text-ink-muted">
            OCR read: <span className="text-ink">&ldquo;{scan.raw_ocr_text}&rdquo;</span>
          </p>
          {scan.diagnosis && <p className="text-xs text-ink-muted">Stated diagnosis: {scan.diagnosis}</p>}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <ConfidenceRing value={top.confidence} size={56} strokeWidth={5} />
            <div>
              <p className="font-display text-lg font-medium text-ink">{top.drug_name}</p>
              <p className="text-xs text-ink-faint">top candidate</p>
            </div>
          </div>

          <CandidateList candidates={scan.candidates} variant="pharmacist" />

          <Separator />

          {scan.status === "pending" ? (
            overriding ? (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-ink">Correct drug name</label>
                <input
                  value={overrideName}
                  onChange={(e) => setOverrideName(e.target.value)}
                  placeholder="Enter the correct drug name"
                  className="rounded-DEFAULT border border-border bg-surface-raised px-3.5 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
                <div className="flex gap-2">
                  <Button size="sm" disabled={!overrideName.trim() || submitting} onClick={() => handleDecision("override", overrideName.trim())}>
                    Save override
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setOverriding(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" disabled={submitting} onClick={() => handleDecision("confirm")}>
                  <CheckCircle2 className="h-4 w-4" /> Confirm {top.drug_name}
                </Button>
                <Button size="sm" variant="secondary" disabled={submitting} onClick={() => setOverriding(true)}>
                  Override
                </Button>
              </div>
            )
          ) : (
            <p className="text-sm text-ink-muted">
              Decided as <span className="font-medium text-ink">{scan.decided_drug_name}</span> on{" "}
              {new Date(scan.decided_at).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
