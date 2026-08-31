import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const toneStroke = {
  success: "stroke-success",
  warning: "stroke-warning",
  danger: "stroke-danger",
  brand: "stroke-brand",
};

export function toneForConfidence(value) {
  if (value >= 0.75) return "success";
  if (value >= 0.5) return "warning";
  return "danger";
}

export function ConfidenceRing({ value, size = 72, strokeWidth = 6, tone, label, className }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const resolvedTone = tone || toneForConfidence(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (mounted ? value : 0));

  return (
    <div className={cn("relative inline-flex flex-col items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} className="fill-none stroke-surface-sunken" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn("fill-none transition-[stroke-dashoffset] duration-700 ease-out", toneStroke[resolvedTone])}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-mono text-sm font-semibold text-ink tabular-nums">{Math.round(value * 100)}%</span>
        {label && <span className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</span>}
      </div>
    </div>
  );
}
