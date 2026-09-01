import { useMemo, useState } from "react";
import useSWR from "swr";
import { ScanLine } from "lucide-react";
import { AnalyticsStrip } from "@/components/pharmacist/AnalyticsStrip";
import { ScanQueueRow } from "@/components/pharmacist/ScanQueueRow";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getScans } from "@/lib/api";

const STATUS_RANK = { pending: 0, overridden: 1, confirmed: 2 };

export default function QueuePage() {
  const { data: scans, error, isLoading, mutate } = useSWR("scans", getScans, { refreshInterval: 5000 });
  const [filter, setFilter] = useState("needs-review");

  const filtered = useMemo(() => {
    if (!scans) return [];
    const list = filter === "needs-review" ? scans.filter((s) => s.status === "pending") : scans;
    return [...list].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
  }, [scans, filter]);

  return (
    <div className="flex max-w-5xl flex-col gap-6 py-2">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Scan queue</h1>
        <p className="mt-1 text-sm text-ink-muted">Every prescription read, in one place.</p>
      </div>

      {isLoading && <Skeleton className="h-20 w-full" />}
      {error && <ErrorState message={error.message} onRetry={() => mutate()} />}

      {scans && (
        <>
          <AnalyticsStrip scans={scans} />

          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="needs-review">Needs review</TabsTrigger>
              <TabsTrigger value="all">All scans</TabsTrigger>
            </TabsList>
          </Tabs>

          {filtered.length === 0 ? (
            <EmptyState icon={ScanLine} title="Nothing here" description="No scans match this filter right now." />
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              {filtered.map((scan) => (
                <ScanQueueRow key={scan.id} scan={scan} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
