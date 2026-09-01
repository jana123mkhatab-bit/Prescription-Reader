import { useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ScanLine, ShieldAlert, CheckCircle2, PenLine, ArrowRight, Gauge, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/shared/BarChart";
import { StatTile } from "@/components/shared/StatTile";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { getScans, getAnalytics } from "@/lib/api";

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

export default function PharmacistDashboard() {
  const { data: scans, error, isLoading, mutate } = useSWR("scans", getScans, { refreshInterval: 5000 });
  const { data: analytics } = useSWR("analytics", getAnalytics, { refreshInterval: 10000 });

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

    return { perDay, total: scans.length, pending, confirmed, overridden, avgConfidence };
  }, [scans]);

  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Pharmacist dashboard</h1>
          <p className="mt-1 text-sm text-ink-muted">Trends and volume across every scan in the queue.</p>
        </div>
        <Button as={Link} href="/pharmacist/queue" variant="vivid" size="lg">
          Open queue <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}
      {error && <ErrorState message={error.message} onRetry={() => mutate()} />}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <StatTile icon={ScanLine} label="Total scans" value={stats.total} tone="brand" />
            <StatTile icon={ShieldAlert} label="Pending review" value={stats.pending} tone={stats.pending > 0 ? "warning" : "success"} />
            <StatTile icon={CheckCircle2} label="Confirmed" value={stats.confirmed} tone="success" />
            <StatTile icon={PenLine} label="Overridden" value={stats.overridden} tone="secondary" />
            <StatTile icon={Gauge} label="Avg. match confidence" value={stats.avgConfidence === null ? "—" : stats.avgConfidence} suffix="%" tone="violet" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4">
                  <h2 className="font-display text-base font-semibold text-ink">Scans per day</h2>
                  <p className="text-xs text-ink-faint">Last 7 days</p>
                </div>
                <BarChart data={stats.perDay.map((d) => ({ label: d.label, value: d.count, tone: "brand" }))} />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="mb-4">
                  <h2 className="font-display text-base font-semibold text-ink">Flagged-for-review rate</h2>
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
              <div className="mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-danger" strokeWidth={1.75} />
                <h2 className="font-display text-base font-semibold text-ink">Most frequently misread</h2>
                <span className="text-xs text-ink-faint">last {analytics?.period_days ?? 7} days, confidence below threshold</span>
              </div>
              {!analytics || analytics.low_confidence_drugs.length === 0 ? (
                <p className="text-sm text-ink-faint">No low-confidence reads in this window — OCR is holding up well.</p>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {analytics.low_confidence_drugs.map((d) => (
                    <div key={d.drug_name} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-ink">{d.drug_name}</span>
                      <span className="flex items-center gap-3">
                        <span className="font-mono text-xs text-ink-faint tabular-nums">avg {Math.round(d.avg_confidence * 100)}%</span>
                        <span className="rounded-sm bg-warning-soft px-2 py-0.5 font-mono text-xs font-semibold text-warning tabular-nums">
                          ×{d.count}
                        </span>
                      </span>
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
