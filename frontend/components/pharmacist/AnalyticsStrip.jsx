import { ScanLine, ShieldAlert, TrendingUp } from "lucide-react";

function isToday(iso) {
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function AnalyticsStrip({ scans }) {
  const today = scans.filter((s) => isToday(s.created_at));
  const needsReview = today.filter((s) => s.status === "pending" && s.flagged_for_review);

  const misreadCounts = {};
  for (const s of today) {
    if (!s.top_pick) continue;
    misreadCounts[s.top_pick.drug_name] = (misreadCounts[s.top_pick.drug_name] || 0) + 1;
  }
  const topMisread = Object.entries(misreadCounts).sort((a, b) => b[1] - a[1])[0];

  const stats = [
    { icon: ScanLine, label: "Scans today", value: today.length },
    { icon: ShieldAlert, label: "Need review", value: needsReview.length },
    { icon: TrendingUp, label: "Most scanned", value: topMisread ? topMisread[0] : "—" },
  ];

  return (
    <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-surface-raised">
      {stats.map(({ icon: Icon, label, value }) => (
        <div key={label} className="flex items-center gap-3 px-5 py-4">
          <Icon className="h-5 w-5 shrink-0 text-brand" strokeWidth={1.75} />
          <div className="flex flex-col">
            <span className="truncate font-mono text-lg font-semibold text-ink tabular-nums">{value}</span>
            <span className="text-xs text-ink-muted">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
