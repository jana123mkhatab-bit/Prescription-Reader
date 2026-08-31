import { useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { User, Stethoscope, ScanLine, GitCompareArrows, ShieldCheck, ArrowRight } from "lucide-react";

const FEATURES = [
  {
    icon: ScanLine,
    title: "Reads the handwriting",
    description: "A vision model trained on real-world medication names resolves scrawl a plain OCR engine can't.",
  },
  {
    icon: GitCompareArrows,
    title: "Cross-checks the diagnosis",
    description: "Matches the reading against real drug data and re-ranks it against what the patient is being treated for.",
  },
  {
    icon: ShieldCheck,
    title: "Never auto-approves quietly",
    description: "Anything ambiguous is flagged for a pharmacist to confirm before it reaches the patient.",
  },
];

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const last = window.localStorage.getItem("rx-last-mode");
    if (last === "patient") router.replace("/patient/dashboard");
    if (last === "pharmacist") router.replace("/pharmacist/dashboard");
  }, [router]);

  return (
    <div className="flex flex-col gap-12 py-10">
      <div className="flex flex-col gap-3">
        <h1 className="max-w-lg font-display text-4xl font-medium leading-tight text-ink">
          Read handwriting, confirmed by humans.
        </h1>
        <p className="max-w-md text-[15px] leading-relaxed text-ink-muted">
          Upload a handwritten prescription for a plain-language explanation, or open the pharmacist
          dashboard to verify readings before they reach a patient.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/patient/dashboard"
          onClick={() => window.localStorage.setItem("rx-last-mode", "patient")}
          className="group flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-6 transition-colors hover:border-brand"
        >
          <User className="h-6 w-6 text-brand" strokeWidth={1.75} />
          <div>
            <p className="font-display text-lg font-medium text-ink">I&apos;m a patient</p>
            <p className="text-sm text-ink-muted">Track medications, get plain-language explanations, and stay on schedule.</p>
          </div>
          <span className="mt-1 flex items-center gap-1 text-sm font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
            Open dashboard <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
        <Link
          href="/pharmacist/dashboard"
          onClick={() => window.localStorage.setItem("rx-last-mode", "pharmacist")}
          className="group flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-6 transition-colors hover:border-brand"
        >
          <Stethoscope className="h-6 w-6 text-brand" strokeWidth={1.75} />
          <div>
            <p className="font-display text-lg font-medium text-ink">I&apos;m a pharmacist</p>
            <p className="text-sm text-ink-muted">Review trends across the queue and confirm or override readings.</p>
          </div>
          <span className="mt-1 flex items-center gap-1 text-sm font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
            Open dashboard <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>

      <div className="flex flex-col gap-5 border-t border-border pt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">How it works</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex flex-col gap-2">
              <Icon className="h-5 w-5 text-brand" strokeWidth={1.75} />
              <p className="font-display text-base font-medium text-ink">{title}</p>
              <p className="text-sm leading-relaxed text-ink-muted">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
