import { useEffect } from "react";
import { checkAndFireReminders, getAllSchedules } from "@/lib/reminders";
import { loadMedications } from "@/lib/medications";

// Renders nothing -- runs a client-only timer that fires best-effort
// Notification API reminders while this tab is open. Mounted once in Layout
// so it keeps working across page navigations, not just on the dashboard.
export function ReminderEngine() {
  useEffect(() => {
    const tick = () => {
      const meds = loadMedications();
      if (meds.length === 0) return;
      checkAndFireReminders(meds, getAllSchedules());
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, []);

  return null;
}
