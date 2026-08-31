import { useEffect, useState } from "react";
import { Pill, Info } from "lucide-react";
import { MedCard } from "@/components/patient/MedCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { checkInteractions } from "@/lib/interactionHeuristic";
import { loadMedications, removeMedication } from "@/lib/medications";
import { useRouter } from "next/router";

export default function MedicationsPage() {
  const router = useRouter();
  const [medications, setMedications] = useState(null);

  useEffect(() => {
    setMedications(loadMedications());
  }, []);

  function remove(id) {
    setMedications(removeMedication(id));
  }

  if (medications === null) return null;

  const withInteractions = checkInteractions(medications);

  return (
    <div className="flex flex-col gap-5 py-4">
      <div>
        <h1 className="font-display text-2xl font-medium text-ink">My Medications</h1>
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
          <div className="flex flex-col gap-3">
            {withInteractions.map((med) => (
              <MedCard key={med.id} med={med} onRemove={remove} />
            ))}
          </div>
          <div className="flex items-start gap-2 rounded-DEFAULT bg-surface-sunken px-3.5 py-3 text-xs text-ink-faint">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              Interaction flags here are a best-effort check, not a substitute for your pharmacist&apos;s review —
              always confirm your full medication list with them.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
