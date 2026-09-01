import { useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  PenLine,
  User,
  Stethoscope,
  ScanLine,
  GitCompareArrows,
  ShieldCheck,
  ArrowRight,
  ShieldAlert,
  Languages,
  MessageCircleQuestion,
  BarChart3,
  Share2,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const CORE_FEATURES = [
  {
    icon: ScanLine,
    tone: "brand",
    title: "Reads the handwriting",
    description: "A vision model resolves scrawl a plain OCR engine can't, then cross-checks it against a real drug database.",
  },
  {
    icon: GitCompareArrows,
    tone: "secondary",
    title: "Cross-checks the diagnosis",
    description: "Matches the reading against real drug data and re-ranks it against what the patient is being treated for.",
  },
  {
    icon: ShieldCheck,
    tone: "violet",
    title: "Never auto-approves quietly",
    description: "Anything ambiguous is flagged for a pharmacist to confirm before it reaches the patient.",
  },
];

const NEW_FEATURES = [
  { icon: ShieldAlert, tone: "danger", title: "Interaction checker", description: "Screens your full medication list for known interactions, severity-scored." },
  { icon: ShieldCheck, tone: "warning", title: "Allergy cross-check", description: "Flags conflicts against your allergy list — conservatively, never a silent pass." },
  { icon: Languages, tone: "brand", title: "Bilingual summaries", description: "Every explanation generated in English and Arabic, toggle instantly." },
  { icon: MessageCircleQuestion, tone: "violet", title: "Ask about this medication", description: "A follow-up chat grounded in the actual label data, not general knowledge." },
  { icon: BarChart3, tone: "secondary", title: "Pharmacist analytics", description: "Volume, review rates, and the most frequently misread drug names." },
  { icon: Share2, tone: "success", title: "Shareable medication card", description: "Hand a caregiver a QR code with dosage and warnings — nothing more." },
];

const TONE_CLASSES = {
  brand: "bg-brand-soft text-brand-ink",
  secondary: "bg-secondary-soft text-secondary-ink",
  violet: "bg-violet-soft text-violet-ink",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

function ScanPad() {
  return (
    <div className="relative mx-auto h-72 w-56 shrink-0 sm:h-80 sm:w-64">
      <div className="absolute -left-6 -top-4 h-14 w-14 animate-float-slow rounded-full bg-secondary-soft" style={{ animationDelay: "0.4s" }} />
      <div className="absolute -bottom-6 -right-3 h-16 w-16 animate-float-slow rounded-full bg-violet-soft" style={{ animationDelay: "1.1s" }} />
      <div className="relative h-full overflow-hidden rounded-2xl border-2 border-border bg-surface-raised shadow-xl shadow-brand/10">
        <div className="flex items-center gap-2 border-b border-border bg-surface-sunken px-4 py-3">
          <PenLine className="h-4 w-4 text-brand" strokeWidth={2} />
          <span className="font-mono text-[11px] uppercase tracking-wide text-ink-faint">Rx Scan</span>
        </div>
        <div className="flex flex-col gap-2.5 px-4 py-5">
          {[85, 60, 92, 45, 70].map((w, i) => (
            <div key={i} className="h-2.5 rounded-full bg-surface-sunken" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="absolute inset-x-0 top-0 h-16 animate-scan-sweep bg-gradient-to-b from-transparent via-brand/25 to-transparent" />
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const last = window.localStorage.getItem("rx-last-mode");
    if (last === "patient") router.replace("/patient/dashboard");
    if (last === "pharmacist") router.replace("/pharmacist/dashboard");
  }, [router]);

  return (
    <div className="flex w-full flex-col">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5 text-ink">
          <span className="flex h-9 w-9 items-center justify-center rounded-DEFAULT bg-brand text-white shadow-sm shadow-brand/30">
            <PenLine className="h-[18px] w-[18px]" strokeWidth={2.25} />
          </span>
          <span className="font-display text-[17px] font-bold">
            Prescription <span className="text-brand">AI</span>
          </span>
        </div>
        <ThemeToggle />
      </div>

      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-16 px-5 pb-20 pt-6 sm:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-5">
            <span className="w-fit rounded-full bg-brand-soft px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-ink">
              AI co-worker, human-confirmed
            </span>
            <h1 className="max-w-xl font-display text-4xl font-bold leading-[1.1] text-ink sm:text-5xl">
              Read handwriting, checked by humans.
            </h1>
            <p className="max-w-md text-[15px] leading-relaxed text-ink-muted">
              Upload a handwritten prescription for a plain-language explanation, interaction and allergy checks,
              and a follow-up chat grounded in the real label — or open the pharmacist dashboard to verify readings
              before they reach a patient.
            </p>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <Link
                href="/patient/dashboard"
                onClick={() => window.localStorage.setItem("rx-last-mode", "patient")}
                className="group flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-lg hover:shadow-brand/10"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-DEFAULT bg-brand-soft text-brand-ink">
                  <User className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold text-ink">I&apos;m a patient</p>
                  <p className="text-sm text-ink-muted">Track medications, get explanations, stay on schedule.</p>
                </div>
                <span className="flex items-center gap-1 text-sm font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
                  Open dashboard <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
              <Link
                href="/pharmacist/dashboard"
                onClick={() => window.localStorage.setItem("rx-last-mode", "pharmacist")}
                className="group flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5 transition-all hover:-translate-y-0.5 hover:border-secondary hover:shadow-lg hover:shadow-secondary/10"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-DEFAULT bg-secondary-soft text-secondary-ink">
                  <Stethoscope className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="font-display text-lg font-semibold text-ink">I&apos;m a pharmacist</p>
                  <p className="text-sm text-ink-muted">Review trends across the queue, confirm or override.</p>
                </div>
                <span className="flex items-center gap-1 text-sm font-medium text-secondary-ink opacity-0 transition-opacity group-hover:opacity-100">
                  Open dashboard <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </div>
          </div>
          <ScanPad />
        </div>

        <div className="flex flex-col gap-5 border-t border-border pt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Core pipeline</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {CORE_FEATURES.map(({ icon: Icon, tone, title, description }) => (
              <div key={title} className="flex flex-col gap-2.5">
                <span className={`flex h-10 w-10 items-center justify-center rounded-DEFAULT ${TONE_CLASSES[tone]}`}>
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <p className="font-display text-base font-semibold text-ink">{title}</p>
                <p className="text-sm leading-relaxed text-ink-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 border-t border-border pt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Built on top</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {NEW_FEATURES.map(({ icon: Icon, tone, title, description }) => (
              <div
                key={title}
                className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface-raised p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-DEFAULT ${TONE_CLASSES[tone]}`}>
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <p className="font-display text-[15px] font-semibold text-ink">{title}</p>
                <p className="text-sm leading-relaxed text-ink-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
