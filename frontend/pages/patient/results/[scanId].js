import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import useSWR from "swr";
import { CheckCircle2, PlusCircle } from "lucide-react";
import { ConfidenceRing } from "@/components/shared/ConfidenceRing";
import { ReviewBanner } from "@/components/patient/ReviewBanner";
import { SummaryCards } from "@/components/patient/SummaryCards";
import { CandidateList } from "@/components/shared/CandidateList";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getScan } from "@/lib/api";
import { loadMedications, addMedication } from "@/lib/medications";

export default function ResultsPage() {
  const router = useRouter();
  const { scanId } = router.query;
  const { data: scan, error, isLoading, mutate } = useSWR(scanId ? ["scan", scanId] : null, () => getScan(scanId));
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (scan && typeof window !== "undefined") {
      setAdded(loadMedications().some((m) => m.scanId === scan.id));
    }
  }, [scan]);

  function addToMedications() {
    addMedication(scan);
    setAdded(true);
  }

  if (isLoading || !scanId) {
    return (
      <div className="flex flex-col gap-4 py-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) return <ErrorState message={error.message} onRetry={() => mutate()} />;

  if (!scan.candidates?.length) {
    return (
      <EmptyState
        title="We couldn't confidently match this to a known medication"
        description="Try retaking the photo with better lighting, or crop it to just the drug name."
        actionLabel="Try a clearer photo"
        onAction={() => router.push("/patient/upload")}
      />
    );
  }

  const top = scan.top_pick;

  return (
    <div className="flex flex-col gap-6 py-4">
      {scan.flagged_for_review && <ReviewBanner />}

      <div className="flex items-center gap-4">
        <ConfidenceRing value={top.confidence} label="match" />
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">{scan.cleaned_drug_name || scan.raw_ocr_text}</h1>
          {(top.profile?.brand_name || top.drug_name) && (
            <p className="text-sm text-ink-muted">Matched as: {top.profile?.brand_name || top.drug_name}</p>
          )}
        </div>
      </div>

      <Button
        variant={added ? "secondary" : "primary"}
        size="sm"
        className="w-fit"
        disabled={added}
        onClick={addToMedications}
      >
        {added ? <CheckCircle2 className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
        {added ? "Added to My Medications" : "Add to My Medications"}
      </Button>

      <SummaryCards summary={scan.patient_summary} />

      {/* OCR debug strip — shows what the model read vs what was matched */}
      <div className="rounded-md border border-border bg-surface-raised px-4 py-3 text-xs text-ink-muted space-y-1">
        <p><span className="font-semibold text-ink">OCR read:</span> {scan.raw_ocr_text || "—"}</p>
        <p><span className="font-semibold text-ink">Matched as:</span> {scan.cleaned_drug_name || scan.raw_ocr_text || "—"}</p>
      </div>

      {scan.candidates.length > 1 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Other possible readings</h2>
          <CandidateList candidates={scan.candidates} />
        </div>
      )}

      <Link href="/patient/medications" className="text-sm font-medium text-brand underline underline-offset-2">
        View My Medications
      </Link>
    </div>
  );
}
