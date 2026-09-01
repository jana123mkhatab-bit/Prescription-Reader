import { useRouter } from "next/router";
import useSWR from "swr";
import { Pill, ShieldAlert, PenLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/ErrorState";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { getSharedCard } from "@/lib/api";

export default function SharedCardPage() {
  const router = useRouter();
  const { token } = router.query;
  const { data: card, error, isLoading, mutate } = useSWR(token ? ["share", token] : null, () => getSharedCard(token));

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="flex w-full max-w-md flex-col gap-5">
        <div className="flex items-center justify-center gap-2 text-ink">
          <PenLine className="h-5 w-5 text-brand" strokeWidth={2.25} />
          <span className="font-display text-base font-bold">
            Prescription <span className="text-brand">AI</span>
          </span>
        </div>

        {isLoading && <Skeleton className="h-56 w-full" />}
        {error && <ErrorState message={error.message} onRetry={() => mutate()} />}

        {card && (
          <Card className="border-2 border-brand-soft">
            <CardContent className="flex flex-col gap-5 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-DEFAULT bg-brand-soft text-brand-ink">
                  <Pill className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="font-display text-xl font-bold text-ink">{card.drug_name}</p>
                  <p className="text-xs text-ink-faint">Shared medication summary</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Dosage</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{card.dosage}</p>
              </div>

              {card.warnings && (
                <div className="flex gap-2 rounded-DEFAULT bg-warning-soft px-3.5 py-3 text-warning">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <p className="text-xs leading-relaxed">{card.warnings}</p>
                </div>
              )}

              <p className="border-t border-border pt-3 text-xs text-ink-faint">
                This is a plain-language summary, not a substitute for medical advice. Confirm anything uncertain
                with a pharmacist or doctor.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
