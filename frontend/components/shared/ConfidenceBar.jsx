import { Progress } from "@/components/ui/progress";
import { toneForConfidence } from "@/components/shared/ConfidenceRing";
import { cn } from "@/lib/utils";

export function ConfidenceBar({ value, tone, className }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Progress value={value * 100} tone={tone || toneForConfidence(value)} className="flex-1" />
      <span className="w-11 shrink-0 text-right font-mono text-xs font-semibold text-ink-muted tabular-nums">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}
