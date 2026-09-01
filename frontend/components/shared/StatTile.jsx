import { Card, CardContent } from "@/components/ui/card";
import { useCountUp } from "@/lib/useCountUp";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  brand: "bg-brand-soft text-brand-ink",
  secondary: "bg-secondary-soft text-secondary-ink",
  violet: "bg-violet-soft text-violet-ink",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export function StatTile({ icon: Icon, label, value, tone = "brand", suffix = "" }) {
  const display = useCountUp(value);

  return (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="flex items-center gap-3.5 p-4">
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-DEFAULT", TONE_CLASSES[tone])}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-xl font-semibold tabular-nums text-ink">
            {display}
            {typeof value === "number" && suffix}
          </span>
          <span className="text-xs text-ink-muted">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}
