import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

const STAGES = ["Scanning image…", "Matching drug database…", "Cross-checking your diagnosis…"];

export function LoadingReading({ className }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`flex flex-col items-center gap-5 py-14 text-center ${className || ""}`}>
      <div className="relative flex h-20 w-16 items-center justify-center overflow-hidden rounded-sm border-2 border-brand/30 bg-brand-soft">
        <FileText className="h-8 w-8 text-brand" strokeWidth={1.75} />
        <div className="absolute inset-x-0 top-0 h-6 animate-scan-sweep bg-gradient-to-b from-transparent via-brand/40 to-transparent" />
      </div>
      <p key={stage} className="animate-fade-up font-mono text-sm text-ink-muted">
        {STAGES[stage]}
      </p>
    </div>
  );
}
