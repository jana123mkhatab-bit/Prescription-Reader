import { UserCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ReviewBanner() {
  return (
    <Alert tone="warning" className="items-center">
      <UserCheck className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} />
      <div>
        <AlertTitle>Let&apos;s double-check this with your pharmacist</AlertTitle>
        <AlertDescription>
          We&apos;re not fully confident in this reading. It&apos;s nothing to worry about — your pharmacist
          will confirm it before this goes any further.
        </AlertDescription>
      </div>
    </Alert>
  );
}
