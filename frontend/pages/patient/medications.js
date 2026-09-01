import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Pill, Info, ShieldAlert, Loader2 } from "lucide-react";
import { MedCard } from "@/components/patient/MedCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { loadMedications, removeMedication } from "@/lib/medications";
import { checkInteractions } from "@/lib/api";

function medDisplayName(med) {
  return med.genericName || med.brandName;
}

export default function MedicationsPage() {
  const router = useRouter();
  const [medications, setMedications] = useState(null);
  const [interactionState, setInteractionState] = useState({ status: "idle", pairs: [], unresolved: [] });

  useEffect(() => {
    setMedications(loadMedications());
  }, []);

  useEffect(() => {
    if (!medications || medications.length < 2) return;
    let cancelled = false;
    setInteractionState((s) => ({ ...s, status: "loading" }));
    checkInteractions(medications.map(medDisplayName))
      .then((result) => {
        if (!cancelled) setInteractionState({ status: "ready", pairs: result.pairs, unresolved: result.unresolved });
      })
      .catch(() => {
        if (!cancelled) setInteractionState({ status: "error", pairs: [], unresolved: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [medications]);

  function remove(id) {
    setMedications(removeMedication(id));
  }

  if (medications === null) return null;

  const flaggedPairs = interactionState.pairs.filter((p) => p.flagged_for_review);

  function pairsFor(med) {
    const name = medDisplayName(med);
    return interactionState.pairs.filter((p) => p.drug_a === name || p.drug_b === name);
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5 py-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">My Medications</h1>
        <p className="mt-1 text-sm text-ink-muted">Everything you&apos;ve saved from your prescription scans.</p>
      </div>

      {medications.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No medications saved yet"
          description="Scan a prescription and add it here to keep track of what you're taking."
          actionLabel="Upload a prescription"
          onAction={() => router.push("/patient/upload")}
        />
      ) : (
        <>
          {interactionState.status === "loading" && (
            <div className="flex items-center gap-2 rounded-DEFAULT bg-surface-sunken px-3.5 py-2.5 text-xs text-ink-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking your medication list for interactions…
            </div>
          )}

          {flaggedPairs.length > 0 && (
            <Alert tone="danger">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
              <div className="flex flex-col gap-2">
                <AlertTitle>
                  {flaggedPairs.length} possible interaction{flaggedPairs.length > 1 ? "s" : ""} found
                </AlertTitle>
                <ul className="flex flex-col gap-1.5">
                  {flaggedPairs.map((p, i) => (
                    <li key={i} className="text-sm leading-relaxed">
                      <span className="font-semibold">
                        {p.drug_a} + {p.drug_b}
                      </span>{" "}
                      <span className="rounded-sm bg-danger/10 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide">
                        {p.severity}
                      </span>
                      <br />
                      {p.reason}
                    </li>
                  ))}
                </ul>
                <AlertDescription>Confirm your full medication list with your pharmacist before combining these.</AlertDescription>
              </div>
            </Alert>
          )}

          <div className="flex flex-col gap-3">
            {medications.map((med) => (
              <MedCard key={med.id} med={med} onRemove={remove} interactionPairs={pairsFor(med)} />
            ))}
          </div>

          <div className="flex items-start gap-2 rounded-DEFAULT bg-surface-sunken px-3.5 py-3 text-xs text-ink-faint">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              Interaction checks are a best-effort screen built on FDA label data, not a substitute for your
              pharmacist&apos;s review — always confirm your full medication list with them.
              {interactionState.unresolved.length > 0 && (
                <> Couldn&apos;t look up: {interactionState.unresolved.join(", ")}.</>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
