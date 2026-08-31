// Client-only "My Medications" storage. No user accounts in this app, so
// this lives in localStorage per-browser (mirrors lib/reminders.js).
const KEY = "rx-medications";

export function loadMedications() {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveMedications(meds) {
  window.localStorage.setItem(KEY, JSON.stringify(meds));
}

export function addMedication(scan) {
  const meds = loadMedications();
  const top = scan.top_pick;
  const med = {
    id: crypto.randomUUID(),
    scanId: scan.id,
    brandName: top.profile?.brand_name || top.drug_name,
    genericName: top.profile?.generic_name || top.drug_name,
    warnings: top.profile?.warnings || "",
    addedAt: new Date().toISOString(),
  };
  meds.push(med);
  saveMedications(meds);
  return med;
}

export function removeMedication(id) {
  const meds = loadMedications().filter((m) => m.id !== id);
  saveMedications(meds);
  return meds;
}
