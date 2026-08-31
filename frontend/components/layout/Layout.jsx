import Link from "next/link";
import { useRouter } from "next/router";
import { PenLine } from "lucide-react";
import { ModeSwitcher } from "@/components/layout/ModeSwitcher";
import { ReminderEngine } from "@/components/patient/ReminderEngine";
import { cn } from "@/lib/utils";

const PATIENT_LINKS = [
  { href: "/patient/dashboard", label: "Dashboard" },
  { href: "/patient/upload", label: "Upload" },
  { href: "/patient/medications", label: "Medications" },
];

const PHARMACIST_LINKS = [
  { href: "/pharmacist/dashboard", label: "Dashboard" },
  { href: "/pharmacist/queue", label: "Queue" },
];

function SubNav({ links, pathname, wide }) {
  return (
    <nav
      className={cn(
        "flex gap-5 border-b border-border text-sm",
        wide ? "px-6" : "mx-auto max-w-2xl px-5"
      )}
    >
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "-mb-px border-b-2 py-2.5 font-medium transition-colors",
              active ? "border-brand text-ink" : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Layout({ children }) {
  const router = useRouter();
  const isLanding = router.pathname === "/";
  const isPharmacist = router.pathname.startsWith("/pharmacist");
  const isPatient = router.pathname.startsWith("/patient");

  return (
    <div className="min-h-screen">
      <ReminderEngine />
      <header className="border-b border-border bg-surface-raised">
        <div
          className={
            isPharmacist
              ? "flex items-center justify-between px-6 py-3"
              : "mx-auto flex max-w-2xl items-center justify-between px-5 py-3"
          }
        >
          <Link href="/" className="flex items-center gap-2 text-ink">
            <PenLine className="h-5 w-5 text-brand" strokeWidth={2.25} />
            <span className="font-display text-[17px] font-medium">Prescription AI Co-Worker</span>
          </Link>
          {!isLanding && <ModeSwitcher />}
        </div>
        {isPatient && <SubNav links={PATIENT_LINKS} pathname={router.pathname} wide={false} />}
        {isPharmacist && <SubNav links={PHARMACIST_LINKS} pathname={router.pathname} wide />}
      </header>
      <main className={isPharmacist ? "px-6 py-6" : "mx-auto max-w-2xl px-5 py-6"}>{children}</main>
    </div>
  );
}
