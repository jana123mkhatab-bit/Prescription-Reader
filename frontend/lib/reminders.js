// Client-only medication schedule + adherence tracking. There's no user
// account system in this app (medications already live in localStorage —
// see pages/patient/medications.js), so reminders follow the same pattern:
// everything here is per-browser, not synced anywhere.
//
// Reminder delivery is best-effort only: it uses the Notification API on a
// timer while this tab is open. It cannot wake a closed tab or a phone's
// lock screen — that would need a backend + push subscriptions, which this
// app doesn't have. Framed as "in-app reminders" in the UI for that reason.

const SCHEDULES_KEY = "rx-schedules"; // { [medId]: { days: number[] (0=Sun..6=Sat), times: string[] ("HH:MM") } }
const TAKEN_KEY = "rx-doses-taken"; // { "YYYY-MM-DD|medId|HH:MM": true }
const NOTIFIED_KEY = "rx-doses-notified"; // { "YYYY-MM-DD|medId|HH:MM": true } -- de-dupes notification firing

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function readJSON(key, fallback) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "") ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

export function getAllSchedules() {
  return readJSON(SCHEDULES_KEY, {});
}

export function getSchedule(medId) {
  return getAllSchedules()[medId] || null;
}

export function setSchedule(medId, schedule) {
  const all = getAllSchedules();
  all[medId] = schedule;
  writeJSON(SCHEDULES_KEY, all);
  return all;
}

export function removeSchedule(medId) {
  const all = getAllSchedules();
  delete all[medId];
  writeJSON(SCHEDULES_KEY, all);
  return all;
}

export function getTakenMap() {
  return readJSON(TAKEN_KEY, {});
}

export function isDoseTaken(date, medId, time) {
  return !!getTakenMap()[`${dateKey(date)}|${medId}|${time}`];
}

export function toggleDoseTaken(date, medId, time) {
  const map = getTakenMap();
  const key = `${dateKey(date)}|${medId}|${time}`;
  if (map[key]) {
    delete map[key];
  } else {
    map[key] = true;
  }
  writeJSON(TAKEN_KEY, map);
  return map;
}

// Monday-start week containing `anchor` (defaults to today).
export function getWeekDates(anchor = new Date()) {
  const d = new Date(anchor);
  d.setHours(0, 0, 0, 0);
  const dayIdx = d.getDay(); // 0=Sun..6=Sat
  const mondayOffset = dayIdx === 0 ? -6 : 1 - dayIdx;
  const monday = new Date(d);
  monday.setDate(d.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return day;
  });
}

// All (med, time) doses scheduled for a given date, across the given medications.
export function getDosesForDate(medications, schedules, date) {
  const weekday = date.getDay();
  const doses = [];
  for (const med of medications) {
    const schedule = schedules[med.id];
    if (!schedule?.days?.includes(weekday)) continue;
    for (const time of schedule.times || []) {
      doses.push({ med, time });
    }
  }
  return doses.sort((a, b) => a.time.localeCompare(b.time));
}

// Adherence across a week: per-day taken/total counts plus an overall percent.
export function getWeekAdherence(medications, schedules, weekDates) {
  const taken = getTakenMap();
  const perDay = weekDates.map((date) => {
    const doses = getDosesForDate(medications, schedules, date);
    const takenCount = doses.filter((d) => taken[`${dateKey(date)}|${d.med.id}|${d.time}`]).length;
    return { date, total: doses.length, taken: takenCount };
  });
  const total = perDay.reduce((s, d) => s + d.total, 0);
  const takenTotal = perDay.reduce((s, d) => s + d.taken, 0);
  return { perDay, total, taken: takenTotal, percent: total > 0 ? Math.round((takenTotal / total) * 100) : null };
}

export function todaysRemainingDoses(medications, schedules) {
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5);
  const doses = getDosesForDate(medications, schedules, now);
  const taken = getTakenMap();
  return doses.filter((d) => !taken[`${dateKey(now)}|${d.med.id}|${d.time}`] && d.time >= hhmm);
}

// --- Notifications (best-effort, tab must be open) ---

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission() {
  return notificationsSupported() ? Notification.permission : "unsupported";
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return "unsupported";
  return Notification.requestPermission();
}

// Call once from a top-level effect; checks every 20s whether a scheduled
// dose's minute has arrived and fires a Notification if so (once per dose).
export function checkAndFireReminders(medications, schedules) {
  if (notificationPermission() !== "granted") return;
  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5);
  const doses = getDosesForDate(medications, schedules, now);
  const notified = readJSON(NOTIFIED_KEY, {});
  let changed = false;
  for (const { med, time } of doses) {
    if (time !== hhmm) continue;
    const key = `${dateKey(now)}|${med.id}|${time}`;
    if (notified[key]) continue;
    try {
      new Notification("Medication reminder", {
        body: `Time for your ${time} dose of ${med.brandName || med.genericName}.`,
        tag: key,
      });
    } catch {
      // Notification constructor can throw in some embedded contexts -- ignore, best-effort only
    }
    notified[key] = true;
    changed = true;
  }
  if (changed) writeJSON(NOTIFIED_KEY, notified);
}
