import Link from "next/link";
import { useState } from "react";
import { ShieldCheck, ShieldAlert, BellRing, Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScheduleEditor } from "@/components/patient/ScheduleEditor";
import { DAY_LABELS, getSchedule } from "@/lib/reminders";

function scheduleSummary(schedule) {
  if (!schedule?.days?.length || !schedule?.times?.length) return null;
  const days = [...schedule.days].sort().map((d) => DAY_LABELS[d]).join(", ");
  return `${days} at ${schedule.times.join(", ")}`;
}

export function MedCard({ med, onRemove, interactionPairs = [] }) {
  const flagged = interactionPairs.filter((p) => p.flagged_for_review);
  const hasFlag = flagged.length > 0;
  const [schedule, setSchedule] = useState(() => (typeof window !== "undefined" ? getSchedule(med.id) : null));
  const [editingSchedule, setEditingSchedule] = useState(false);
  const summary = scheduleSummary(schedule);

  return (
    <Card className={hasFlag ? "border-danger-soft" : undefined}>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <Link href={`/patient/results/${med.scanId}`} className="font-display text-base font-semibold text-ink hover:text-brand">
              {med.brandName || med.genericName}
            </Link>
            {med.genericName && med.genericName !== med.brandName && (
              <span className="text-xs text-ink-faint">{med.genericName}</span>
            )}
            <Badge tone={hasFlag ? "danger" : "success"} className="mt-1 w-fit">
              {hasFlag ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
              {hasFlag ? `${flagged.length} possible interaction${flagged.length > 1 ? "s" : ""}` : "No known interaction flagged"}
            </Badge>
          </div>
          <button onClick={() => onRemove(med.id)} className="text-xs text-ink-faint hover:text-danger">
            Remove
          </button>
        </div>

        {hasFlag && (
          <ul className="flex flex-col gap-1 rounded-DEFAULT bg-danger-soft px-3 py-2.5 text-xs text-danger">
            {flagged.map((p, i) => (
              <li key={i}>
                <span className="font-semibold">with {p.drug_a === (med.genericName || med.brandName) ? p.drug_b : p.drug_a}:</span>{" "}
                {p.reason}
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setEditingSchedule((v) => !v)}
          className="flex w-fit items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-brand"
        >
          {summary ? <BellRing className="h-3.5 w-3.5 text-brand" /> : <Bell className="h-3.5 w-3.5" />}
          {summary || "Set a reminder schedule"}
        </button>

        {editingSchedule && (
          <ScheduleEditor
            med={med}
            schedule={schedule}
            onSaved={(next) => {
              setSchedule(next);
              setEditingSchedule(false);
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}
