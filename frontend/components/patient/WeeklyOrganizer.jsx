import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { DAY_LABELS, dateKey, getDosesForDate, isDoseTaken, toggleDoseTaken } from "@/lib/reminders";

export function WeeklyOrganizer({ medications, schedules, weekDates, onToggle }) {
  const [, forceTick] = useState(0);
  const today = dateKey(new Date());

  function handleToggle(date, medId, time) {
    toggleDoseTaken(date, medId, time);
    forceTick((t) => t + 1);
    onToggle?.();
  }

  return (
    <div className="grid grid-cols-7 gap-2 overflow-x-auto">
      {weekDates.map((date) => {
        const doses = getDosesForDate(medications, schedules, date);
        const isToday = dateKey(date) === today;
        return (
          <div
            key={dateKey(date)}
            className={cn(
              "flex min-w-[104px] flex-col gap-2 rounded-DEFAULT border p-2.5",
              isToday ? "border-brand bg-brand-soft" : "border-border bg-surface-raised"
            )}
          >
            <div className="text-center">
              <p className={cn("text-[11px] font-semibold uppercase tracking-wide", isToday ? "text-brand-ink" : "text-ink-faint")}>
                {DAY_LABELS[date.getDay()]}
              </p>
              <p className="text-xs text-ink-muted">{date.getDate()}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              {doses.length === 0 ? (
                <p className="py-2 text-center text-[11px] text-ink-faint">—</p>
              ) : (
                doses.map(({ med, time }) => {
                  const taken = isDoseTaken(date, med.id, time);
                  return (
                    <button
                      key={`${med.id}-${time}`}
                      type="button"
                      onClick={() => handleToggle(date, med.id, time)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-sm px-1.5 py-1 text-left text-[11px] transition-colors",
                        taken ? "bg-success-soft text-success" : "bg-surface-sunken text-ink-muted hover:text-ink"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
                          taken ? "border-success bg-success text-white" : "border-ink-faint"
                        )}
                      >
                        {taken && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                      </span>
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="font-medium">{time}</span>
                        <span className="truncate">{med.brandName || med.genericName}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
