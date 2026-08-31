import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DAY_LABELS, setSchedule } from "@/lib/reminders";

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun, values match Date#getDay()

export function ScheduleEditor({ med, schedule, onSaved }) {
  const [days, setDays] = useState(schedule?.days || []);
  const [times, setTimes] = useState(schedule?.times?.length ? schedule.times : ["08:00"]);

  function toggleDay(day) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function updateTime(i, value) {
    setTimes((prev) => prev.map((t, idx) => (idx === i ? value : t)));
  }

  function addTime() {
    setTimes((prev) => [...prev, "08:00"]);
  }

  function removeTime(i) {
    setTimes((prev) => prev.filter((_, idx) => idx !== i));
  }

  const canSave = days.length > 0 && times.filter(Boolean).length > 0;

  function save() {
    if (!canSave) return;
    const next = setSchedule(med.id, { days, times: times.filter(Boolean) });
    onSaved?.(next[med.id]);
  }

  return (
    <div className="flex flex-col gap-3 rounded-DEFAULT bg-surface-sunken p-3.5">
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">Days</p>
        <div className="flex flex-wrap gap-1.5">
          {DAY_ORDER.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={cn(
                "h-8 w-10 rounded-sm border text-xs font-semibold transition-colors",
                days.includes(day)
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-surface-raised text-ink-muted hover:text-ink"
              )}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">Times</p>
        <div className="flex flex-col gap-1.5">
          {times.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="time"
                value={t}
                onChange={(e) => updateTime(i, e.target.value)}
                className="h-8 rounded-sm border border-border bg-surface-raised px-2 text-sm text-ink"
              />
              {times.length > 1 && (
                <button type="button" onClick={() => removeTime(i)} className="text-ink-faint hover:text-danger">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addTime}
            className="flex w-fit items-center gap-1 text-xs font-medium text-brand hover:underline"
          >
            <Plus className="h-3 w-3" /> Add another time
          </button>
        </div>
      </div>

      <Button size="sm" onClick={save} disabled={!canSave} className="w-fit">
        Save schedule
      </Button>
    </div>
  );
}
