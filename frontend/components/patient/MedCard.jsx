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

export function MedCard({ med, onRemove }) {
  const hasFlag = med.flaggedWith?.length > 0;
  const [schedule, setSchedule] = useState(() => (typeof window !== "undefined" ? getSchedule(med.id) : null));
  const [editingSchedule, setEditingSchedule] = useState(false);
  const summary = scheduleSummary(schedule);

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <Link href={`/patient/results/${med.scanId}`} className="font-display text-base font-medium text-ink hover:text-brand">
              {med.brandName || med.genericName}
            </Link>
            {med.genericName && med.genericName !== med.brandName && (
              <span className="text-xs text-ink-faint">{med.genericName}</span>
            )}
            <Badge tone={hasFlag ? "warning" : "success"} className="mt-1 w-fit">
              {hasFlag ? <ShieldAlert className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}
              {hasFlag ? "Possible interaction — ask your pharmacist" : "No known interaction flagged"}
            </Badge>
          </div>
          <button onClick={() => onRemove(med.id)} className="text-xs text-ink-faint hover:text-danger">
            Remove
          </button>
        </div>

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
