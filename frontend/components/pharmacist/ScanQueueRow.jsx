import Link from "next/link";
import { toneForConfidence } from "@/components/shared/ConfidenceRing";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_TONE = { pending: "warning", confirmed: "success", overridden: "brand" };
const STATUS_LABEL = { pending: "Needs review", confirmed: "Confirmed", overridden: "Overridden" };
const CONFIDENCE_TEXT_TONE = { success: "text-success", warning: "text-warning", danger: "text-danger" };

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

export function ScanQueueRow({ scan }) {
  const topName = scan.top_pick?.drug_name || "No match found";
  const confidence = scan.top_pick?.confidence;
  const tone = confidence != null ? toneForConfidence(confidence) : "danger";

  return (
    <Link
      href={`/pharmacist/scan/${scan.id}`}
      className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-border px-4 py-3 text-sm transition-colors hover:bg-surface-sunken"
    >
      <div className="flex flex-col">
        <span className="font-medium text-ink">{topName}</span>
        <span className="font-mono text-[11px] text-ink-faint">{scan.raw_ocr_text}</span>
      </div>
      <span className={cn("font-mono text-xs font-semibold tabular-nums", CONFIDENCE_TEXT_TONE[tone])}>
        {confidence != null ? `${Math.round(confidence * 100)}%` : "—"}
      </span>
      <Badge tone={STATUS_TONE[scan.status]}>{STATUS_LABEL[scan.status]}</Badge>
      <span className="w-16 shrink-0 text-right text-xs text-ink-faint">{timeAgo(scan.created_at)}</span>
    </Link>
  );
}
