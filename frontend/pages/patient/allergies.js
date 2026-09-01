import { AllergyManager } from "@/components/patient/AllergyManager";

export default function AllergiesPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-5 py-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Allergies</h1>
        <p className="mt-1 text-sm text-ink-muted">Entered once, checked automatically on every scan.</p>
      </div>
      <AllergyManager />
    </div>
  );
}
