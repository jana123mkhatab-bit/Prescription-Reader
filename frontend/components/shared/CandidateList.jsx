import { useEffect, useState } from "react";
import { ConfidenceBar } from "@/components/shared/ConfidenceBar";
import { cn } from "@/lib/utils";

export function CandidateList({ candidates, variant = "patient" }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <ul className="flex flex-col gap-2">
      {candidates.map((c, i) => (
        <li
          key={c.drug_name}
          style={{ transitionDelay: `${i * 80}ms` }}
          className={cn(
            "flex items-center justify-between gap-4 rounded-DEFAULT border border-border bg-surface-raised px-4 py-3 transition-all duration-300",
            mounted ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
            variant === "pharmacist" && "px-3.5 py-2.5"
          )}
        >
          <div className="flex flex-col">
            <span className={cn("font-medium text-ink", variant === "patient" ? "text-[15px]" : "text-sm")}>
              {c.drug_name}
            </span>
            {typeof c.diagnosis_match === "number" && (
              <span className="font-mono text-[11px] text-ink-faint">
                diagnosis match {Math.round(c.diagnosis_match * 100)}%
              </span>
            )}
          </div>
          <ConfidenceBar value={c.confidence} className="w-32 shrink-0" />
        </li>
      ))}
    </ul>
  );
}
