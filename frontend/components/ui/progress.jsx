import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

const toneClass = {
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function Progress({ className, value = 0, tone = "brand", ...props }) {
  return (
    <ProgressPrimitive.Root
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-surface-sunken", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full transition-[width] duration-700 ease-out", toneClass[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </ProgressPrimitive.Root>
  );
}
