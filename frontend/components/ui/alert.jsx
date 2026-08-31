import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("flex items-start gap-3 rounded-lg border p-4", {
  variants: {
    tone: {
      neutral: "border-border bg-surface-raised text-ink",
      brand: "border-transparent bg-brand-soft text-brand-ink",
      warning: "border-transparent bg-warning-soft text-warning",
      danger: "border-transparent bg-danger-soft text-danger",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Alert({ className, tone, ...props }) {
  return <div role="status" className={cn(alertVariants({ tone }), className)} {...props} />;
}

export function AlertTitle({ className, ...props }) {
  return <p className={cn("font-semibold leading-tight", className)} {...props} />;
}

export function AlertDescription({ className, ...props }) {
  return <p className={cn("text-sm leading-relaxed opacity-90", className)} {...props} />;
}
