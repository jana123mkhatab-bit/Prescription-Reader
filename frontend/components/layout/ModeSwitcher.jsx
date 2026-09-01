import Link from "next/link";
import { useRouter } from "next/router";
import { cn } from "@/lib/utils";

export function ModeSwitcher() {
  const router = useRouter();
  const mode = router.pathname.startsWith("/pharmacist") ? "pharmacist" : "patient";

  return (
    <div className="flex items-center gap-1 rounded-DEFAULT bg-surface-sunken p-1">
      <Link
        href="/patient/dashboard"
        onClick={() => window.localStorage.setItem("rx-last-mode", "patient")}
        className={cn(
          "flex-1 rounded-sm px-3 py-1.5 text-center text-sm font-medium transition-colors",
          mode === "patient" ? "bg-surface-raised text-ink shadow-sm" : "text-ink-muted hover:text-ink"
        )}
      >
        Patient
      </Link>
      <Link
        href="/pharmacist/dashboard"
        onClick={() => window.localStorage.setItem("rx-last-mode", "pharmacist")}
        className={cn(
          "flex-1 rounded-sm px-3 py-1.5 text-center text-sm font-medium transition-colors",
          mode === "pharmacist" ? "bg-surface-raised text-ink shadow-sm" : "text-ink-muted hover:text-ink"
        )}
      >
        Pharmacist
      </Link>
    </div>
  );
}
