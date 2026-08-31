import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-DEFAULT text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white hover:bg-brand-ink",
        secondary: "bg-surface-raised text-ink border border-border hover:bg-surface-sunken",
        ghost: "text-ink-muted hover:bg-surface-sunken hover:text-ink",
        danger: "bg-danger text-white hover:brightness-95",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-3.5 text-[13px]",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export const Button = forwardRef(function Button(
  { className, variant, size, as: Comp = "button", ...props },
  ref
) {
  return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
});
