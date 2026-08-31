import { useState } from "react";
import { cn } from "@/lib/utils";

const toneClass = {
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  faint: "bg-surface-sunken",
};

// Minimal single-series bar chart, built in plain divs (no chart library).
// data: [{ label, value, tone?, sublabel? }]. A bar's own color always carries
// severity/state — callers that vary tone per bar (e.g. adherence) should also
// surface the same info as text nearby, since color here is a supplement, not
// the only channel (the hover tooltip gives the exact number either way).
export function BarChart({ data, height = 96, valueFormatter = (v) => v, className }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => {
          const heightPct = d.value > 0 ? Math.max(4, (d.value / max) * 100) : 0;
          return (
            <div
              key={`${d.label}-${i}`}
              className="group relative flex h-full flex-1 flex-col items-center justify-end"
              style={{ maxWidth: 32 }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx((h) => (h === i ? null : h))}
            >
              {hoverIdx === i && (
                <div className="absolute -top-8 z-10 whitespace-nowrap rounded-sm bg-ink px-2 py-1 text-[11px] font-medium text-white shadow-sm">
                  {valueFormatter(d.value)}
                </div>
              )}
              <div
                className={cn(
                  "w-full max-w-[22px] rounded-t-[4px] transition-[height] duration-300",
                  toneClass[d.tone || "brand"],
                  d.value === 0 && "border border-dashed border-border"
                )}
                style={{ height: d.value > 0 ? `${heightPct}%` : 3 }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-start gap-1.5 border-t border-border pt-1.5">
        {data.map((d, i) => (
          <div key={`${d.label}-${i}-label`} className="flex-1 truncate text-center text-[11px] text-ink-faint" style={{ maxWidth: 32 }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
