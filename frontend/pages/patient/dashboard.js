import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Pill, CalendarCheck, ShieldAlert, Upload, BellOff, Bell, ArrowRight, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/shared/BarChart";
import { StatTile } from "@/components/shared/StatTile";
import { WeeklyOrganizer } from "@/components/patient/WeeklyOrganizer";
import { EmptyState } from "@/components/shared/EmptyState";
import { loadMedications } from "@/lib/medications";
import { loadAllergies } from "@/lib/allergies";
import { checkInteractions } from "@/lib/api";
import {
  DAY_LABELS,
  getAllSchedules,
  getWeekAdherence,
  getWeekDates,
  notificationPermission,
  notificationsSupported,
  requestNotificationPermission,
  todaysRemainingDoses,
} from "@/lib/reminders";

export default function PatientDashboard() {
  const router = useRouter();
  const [medications, setMedications] = useState(null);
  const [schedules, setSchedules] = useState({});
  const [permission, setPermission] = useState("default");
  const [tick, setTick] = useState(0);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [allergyCount, setAllergyCount] = useState(0);

  useEffect(() => {
    setMedications(loadMedications());
    setSchedules(getAllSchedules());
    setPermission(notificationPermission());
    setAllergyCount(loadAllergies().length);
  }, []);

  useEffect(() => {
    if (!medications || medications.length < 2) {
      setFlaggedCount(0);
      return;
    }
    const names = medications.map((m) => m.genericName || m.brandName);
    checkInteractions(names)
      .then((result) => setFlaggedCount(result.flagged_count))
      .catch(() => setFlaggedCount(0));
  }, [medications]);

  const weekDates = useMemo(() => getWeekDates(), []);

  const adherence = useMemo(
    () => (medications ? getWeekAdherence(medications, schedules, weekDates) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [medications, schedules, weekDates, tick]
  );
  const remainingToday = useMemo(
    () => (medications ? todaysRemainingDoses(medications, schedules) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [medications, schedules, tick]
  );

  async function enableReminders() {
    const result = await requestNotificationPermission();
    setPermission(result);
  }

  if (medications === null) return null;

  const chartData = adherence
    ? adherence.perDay.map((d) => {
        const pct = d.total > 0 ? Math.round((d.taken / d.total) * 100) : 0;
        return {
          label: DAY_LABELS[d.date.getDay()],
          value: pct,
          tone: d.total === 0 ? "faint" : pct === 100 ? "success" : pct > 0 ? "warning" : "danger",
        };
      })
    : [];

  return (
    <div className="flex flex-col gap-6 py-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Your week at a glance</h1>
          <p className="mt-1 text-sm text-ink-muted">Medications, reminders, and adherence — all in one place.</p>
        </div>
        <Button as={Link} href="/patient/upload" variant="vivid" size="lg">
          <Upload className="h-4 w-4" /> Upload a prescription
        </Button>
      </div>

      {medications.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="Nothing tracked yet"
          description="Scan a prescription to start building your medication list and weekly schedule."
          actionLabel="Upload a prescription"
          onAction={() => router.push("/patient/upload")}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile icon={Pill} label="Medications" value={medications.length} tone="brand" />
            <StatTile icon={CalendarCheck} label="Doses left today" value={remainingToday.length} tone="secondary" />
            <StatTile
              icon={CalendarCheck}
              label="Week adherence"
              value={adherence?.percent === null ? "—" : adherence.percent}
              suffix="%"
              tone="success"
            />
            <StatTile
              icon={flaggedCount > 0 ? ShieldAlert : ShieldCheck}
              label="Interaction flags"
              tone={flaggedCount > 0 ? "danger" : "success"}
              value={flaggedCount}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
            <div className="flex flex-col gap-5">
              {permission !== "granted" && notificationsSupported() && (
                <Card>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-DEFAULT bg-brand-soft text-brand-ink">
                        <Bell className="h-4 w-4" strokeWidth={1.75} />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-ink">Turn on in-app reminders</p>
                        <p className="text-xs text-ink-muted">
                          Best-effort browser notifications while this tab is open — set a schedule on any medication first.
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={enableReminders} disabled={permission === "denied"}>
                      {permission === "denied" ? "Blocked in browser" : "Enable"}
                    </Button>
                  </CardContent>
                </Card>
              )}
              {!notificationsSupported() && (
                <div className="flex items-center gap-2 rounded-DEFAULT bg-surface-sunken px-3.5 py-2.5 text-xs text-ink-faint">
                  <BellOff className="h-3.5 w-3.5 shrink-0" />
                  Notifications aren&apos;t supported in this browser — use the weekly checklist below to stay on track instead.
                </div>
              )}

              <Card>
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-base font-semibold text-ink">This week&apos;s adherence</h2>
                    <span className="text-xs text-ink-faint">% of scheduled doses marked taken, per day</span>
                  </div>
                  <BarChart data={chartData} valueFormatter={(v) => `${v}%`} />
                </CardContent>
              </Card>

              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">This week&apos;s schedule</h2>
                <WeeklyOrganizer
                  medications={medications}
                  schedules={schedules}
                  weekDates={weekDates}
                  onToggle={() => setTick((t) => t + 1)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <Card className="border-danger-soft bg-gradient-to-b from-danger-soft/40 to-surface-raised">
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-danger" strokeWidth={1.75} />
                    <p className="text-sm font-semibold text-ink">Allergies on file</p>
                  </div>
                  <p className="text-2xl font-bold tabular-nums text-ink">{allergyCount}</p>
                  <Link href="/patient/allergies" className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                    Manage allergies <ArrowRight className="h-3 w-3" />
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex flex-col gap-2 p-4">
                  <p className="text-sm font-semibold text-ink">Quick links</p>
                  <Link href="/patient/medications" className="flex items-center justify-between rounded-DEFAULT px-2 py-2 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink">
                    Manage all medications <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link href="/patient/upload" className="flex items-center justify-between rounded-DEFAULT px-2 py-2 text-sm text-ink-muted hover:bg-surface-sunken hover:text-ink">
                    Upload a new prescription <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
