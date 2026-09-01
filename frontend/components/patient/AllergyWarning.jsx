import { ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AllergyWarning({ allergyFlag }) {
  if (!allergyFlag?.conflict) return null;

  return (
    <Alert tone="danger" className="items-center">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
      <div>
        <AlertTitle>Possible allergy conflict</AlertTitle>
        <AlertDescription>
          {allergyFlag.reason} Don&apos;t take this medication until your pharmacist confirms it&apos;s safe
          given your allergies.
        </AlertDescription>
      </div>
    </Alert>
  );
}
