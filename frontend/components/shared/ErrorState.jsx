import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-raised py-14 text-center">
      <AlertTriangle className="h-8 w-8 text-danger" strokeWidth={1.5} />
      <p className="max-w-xs text-sm text-ink-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-1" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
