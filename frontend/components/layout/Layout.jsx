import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  PenLine,
  LayoutDashboard,
  Upload,
  Pill,
  ShieldAlert,
  Stethoscope,
  ListChecks,
  Menu,
  X,
} from "lucide-react";
import { ModeSwitcher } from "@/components/layout/ModeSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { ReminderEngine } from "@/components/patient/ReminderEngine";
import { cn } from "@/lib/utils";

const PATIENT_LINKS = [
  { href: "/patient/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patient/upload", label: "Upload", icon: Upload },
  { href: "/patient/medications", label: "Medications", icon: Pill },
  { href: "/patient/allergies", label: "Allergies", icon: ShieldAlert },
];

const PHARMACIST_LINKS = [
  { href: "/pharmacist/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pharmacist/queue", label: "Queue", icon: ListChecks },
];

function NavLinks({ links, pathname, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const active = pathname === link.href;
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-DEFAULT px-3.5 py-2.5 text-sm font-medium transition-all",
              active
                ? "bg-brand text-white shadow-sm shadow-brand/30"
                : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-ink">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-DEFAULT bg-brand text-white shadow-sm shadow-brand/30">
        <PenLine className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </span>
      <span className="font-display text-[17px] font-bold leading-tight">
        Prescription <span className="text-brand">AI</span>
      </span>
    </Link>
  );
}

export function Layout({ children }) {
  const router = useRouter();
  const isLanding = router.pathname === "/" || router.pathname.startsWith("/share/");
  const isPharmacist = router.pathname.startsWith("/pharmacist");
  const links = isPharmacist ? PHARMACIST_LINKS : PATIENT_LINKS;
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [router.pathname]);

  if (isLanding) {
    return (
      <div className="min-h-screen w-full bg-surface">
        <ReminderEngine />
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-surface">
      <ReminderEngine />

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-border bg-surface-raised px-4 py-5 lg:flex">
        <Wordmark />
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <ModeSwitcher />
          </div>
          <ThemeToggle />
        </div>
        <NavLinks links={links} pathname={router.pathname} />
        <div className="mt-auto flex items-center gap-2 rounded-DEFAULT bg-surface-sunken px-3 py-2.5 text-xs text-ink-faint">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-brand" />
          Every AI read is confirmed by a human before it reaches a patient.
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between border-b border-border bg-surface-raised/90 px-4 py-3 backdrop-blur lg:hidden">
        <Wordmark />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-DEFAULT text-ink hover:bg-surface-sunken"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 bg-surface-raised px-4 py-5 shadow-xl animate-fade-up">
            <div className="flex items-center justify-between">
              <Wordmark />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-DEFAULT text-ink-muted hover:bg-surface-sunken"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <ModeSwitcher />
              </div>
              <ThemeToggle />
            </div>
            <NavLinks links={links} pathname={router.pathname} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface-raised/95 backdrop-blur lg:hidden">
        {links.map((link) => {
          const active = router.pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-brand" : "text-ink-faint"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <main className="min-w-0 flex-1 px-4 pb-24 pt-20 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
