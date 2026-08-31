import { ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({ icon: Icon = ImageOff, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-14 text-center">
      <Icon className="h-8 w-8 text-ink-faint" strokeWidth={1.5} />
      <div className="flex flex-col gap-1">
        <p className="font-medium text-ink">{title}</p>
        {description && <p className="max-w-xs text-sm text-ink-muted">{description}</p>}
      </div>
      {actionLabel && (
        <Button variant="secondary" size="sm" className="mt-2" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
