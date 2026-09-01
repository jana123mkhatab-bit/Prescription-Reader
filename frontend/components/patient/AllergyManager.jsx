import { useEffect, useState } from "react";
import { ShieldAlert, Plus, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addAllergy, loadAllergies, removeAllergy } from "@/lib/allergies";

export function AllergyManager() {
  const [allergies, setAllergies] = useState(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setAllergies(loadAllergies());
  }, []);

  function handleAdd(e) {
    e.preventDefault();
    setAllergies(addAllergy(draft));
    setDraft("");
  }

  if (allergies === null) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-DEFAULT bg-danger-soft text-danger">
            <ShieldAlert className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <p className="font-display text-base font-semibold text-ink">Known allergies</p>
            <p className="text-sm text-ink-muted">
              Stored on this device and checked against every new medication we identify. If anything&apos;s
              ambiguous, we flag it for your pharmacist rather than guess.
            </p>
          </div>
        </div>

        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. penicillin, sulfa drugs, latex"
            className="flex-1 rounded-DEFAULT border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <Button type="submit" size="default" disabled={!draft.trim()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </form>

        {allergies.length === 0 ? (
          <p className="rounded-DEFAULT bg-surface-sunken px-3.5 py-3 text-sm text-ink-faint">
            No allergies on file yet. Add any you have so we can cross-check new prescriptions against them.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {allergies.map((a) => (
              <li
                key={a}
                className="flex items-center gap-2 rounded-full border border-danger-soft bg-danger-soft px-3.5 py-1.5 text-sm font-medium text-danger"
              >
                {a}
                <button
                  type="button"
                  onClick={() => setAllergies(removeAllergy(a))}
                  className="text-danger/70 hover:text-danger"
                  aria-label={`Remove ${a}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
