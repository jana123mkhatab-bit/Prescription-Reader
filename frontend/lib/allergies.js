// Client-only allergy list, same localStorage pattern as lib/medications.js —
// no accounts in this app, so this lives per-browser and is sent fresh on
// every /api/analyze call (see lib/api.js) rather than stored server-side.
const KEY = "rx-allergies";

export function loadAllergies() {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveAllergies(allergies) {
  window.localStorage.setItem(KEY, JSON.stringify(allergies));
}

export function addAllergy(name) {
  const trimmed = name.trim();
  if (!trimmed) return loadAllergies();
  const allergies = loadAllergies();
  if (allergies.some((a) => a.toLowerCase() === trimmed.toLowerCase())) return allergies;
  const next = [...allergies, trimmed];
  saveAllergies(next);
  return next;
}

export function removeAllergy(name) {
  const next = loadAllergies().filter((a) => a !== name);
  saveAllergies(next);
  return next;
}
