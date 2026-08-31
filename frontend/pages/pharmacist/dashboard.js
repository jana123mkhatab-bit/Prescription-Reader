import { useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ScanLine, ShieldAlert, CheckCircle2, PenLine, ArrowRight, Gauge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/shared/BarChart";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { getScans } from "@/lib/api";

function lastNDays(n) {
  const days = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push(d);
  }
  return days;
}

function isSameDay(iso, date) {
  return new Date(iso).toDateString() === date.toDateString();
}

function StatTile({ icon: Icon, label, value, tone = "text-ink" }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-5 w-5 shrink-0 ${tone}`} strokeWidth={1.75} />
        <div className="flex flex-col">
          <span className="truncate font-mono text-xl font-semibold tabular-nums text-ink">{value}</span>
          <span className="text-xs text-ink-muted">{label}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PharmacistDashboard() {
  const { data: scans, error, isLoading, mutate } = useSWR("scans", getScans, { refreshInterval: 5000 });

  const stats = useMemo(() => {
    if (!scans) return null;
    const days = lastNDays(7);
    const perDay = days.map((day) => {
      const dayScans = scans.filter((s) => isSameDay(s.created_at, day));
      const flagged = dayScans.filter((s) => s.flagged_for_review).length;
      return {
        label: day.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3),
        count: dayScans.length,
        flaggedPct: dayScans.length > 0 ? Math.round((flagged / dayScans.length) * 100) : 0,
      };
    });

    const pending = scans.filter((s) => s.status === "pending").length;
    const confirmed = scans.filter((s) => s.status === "confirmed").length;
    const overridden = scans.filter((s) => s.status === "overridden").length;
    const confidences = scans.map((s) => s.top_pick?.confidence).filter((c) => typeof c === "number");
    const avgConfidence = confidences.length
      ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100)
      : null;

    const drugCounts = {};
    for (const s of scans) {
      if (!s.top_pick) continue;
      drugCounts[s.top_pick.drug_name] = (drugCounts[s.top_pick.drug_name] || 0) + 1;
    }
    const topDrugs = Object.entries(drugCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { perDay, total: scans.length, pending, confirmed, overridden, avgConfidence, topDrugs };
  }, [scans]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 py-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">Pharmacist dashboard</h1>
          <p className="mt-1 text-sm text-ink-muted">Trends and volume across every scan in the queue.</p>
        </div>
        <Button as={Link} href="/pharmacist/queue" size="sm" variant="secondary">
          Open queue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <ErrorState message={error.message} onRetry={() => mutate()} />}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatTile icon={ScanLine} label="Total scans" value={stats.total} />
            <StatTile icon={ShieldAlert} label="Pending review" value={stats.pending} tone={stats.pending > 0 ? "text-warning" : "text-ink"} />
            <StatTile icon={CheckCircle2} label="Confirmed" value={stats.confirmed} />
            <StatTile icon={PenLine} label="Overridden" value={stats.overridden} />
            <StatTile icon={Gauge} label="Avg. match confidence" value={stats.avgConfidence === null ? "—" : `${stats.avgConfidence}%`} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4">
                  <h2 className="font-display text-base font-medium text-ink">Scans per day</h2>
                  <p className="text-xs text-ink-faint">Last 7 days</p>
                </div>
                <BarChart data={stats.perDay.map((d) => ({ label: d.label, value: d.count, tone: "brand" }))} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="mb-4">
                  <h2 className="font-display text-base font-medium text-ink">Flagged-for-review rate</h2>
                  <p className="text-xs text-ink-faint">% of that day&apos;s scans needing pharmacist review</p>
                </div>
                <BarChart
                  data={stats.perDay.map((d) => ({
                    label: d.label,
                    value: d.flaggedPct,
                    tone: d.count === 0 ? "faint" : d.flaggedPct >= 50 ? "danger" : d.flaggedPct > 0 ? "warning" : "success",
                  }))}
                  valueFormatter={(v) => `${v}%`}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-5">
              <h2 className="mb-3 font-display text-base font-medium text-ink">Most scanned medications</h2>
              {stats.topDrugs.length === 0 ? (
                <p className="text-sm text-ink-faint">No matched scans yet.</p>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {stats.topDrugs.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-ink">{name}</span>
                      <span className="font-mono text-ink-muted tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
