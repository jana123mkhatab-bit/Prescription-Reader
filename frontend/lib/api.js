const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Optimistic cache: analyzePrescription() stashes its result here so the results
// page can render instantly post-submit without a fetch flash. Falls back to
// getScan(id) on a cache miss (direct navigation, refresh, or a different tab).
const scanCache = new Map();

async function handle(res) {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new ApiError(detail, res.status);
  }
  return res.json();
}

export async function analyzePrescription({ imageFile, diagnosis = "", source = "patient" }) {
  const formData = new FormData();
  formData.append("image", imageFile);
  formData.append("diagnosis", diagnosis);
  formData.append("source", source);

  // CPU inference (TrOCR) can take 1-3 minutes on first run while the model warms up.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300000);
  let res;
  try {
    res = await fetch(`${API_URL}/api/analyze`, { method: "POST", body: formData, signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") {
      throw new ApiError("This is taking longer than expected — the model may still be loading. Please try again.", 0);
    }
    throw new ApiError("Couldn't reach the server. Check your connection and try again.", 0);
  } finally {
    clearTimeout(timeout);
  }
  const record = await handle(res);
  scanCache.set(record.id, record);
  return record;
}

export async function getScans() {
  let res;
  try {
    res = await fetch(`${API_URL}/api/scans`);
  } catch {
    throw new ApiError("Couldn't reach the server. Check your connection and try again.", 0);
  }
  return handle(res);
}

export async function getScan(id) {
  if (scanCache.has(id)) return scanCache.get(id);
  let res;
  try {
    res = await fetch(`${API_URL}/api/scans/${id}`);
  } catch {
    throw new ApiError("Couldn't reach the server. Check your connection and try again.", 0);
  }
  const record = await handle(res);
  scanCache.set(id, record);
  return record;
}

export async function decideScan(id, { action, drugName }) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/scans/${id}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, drug_name: drugName ?? null }),
    });
  } catch {
    throw new ApiError("Couldn't reach the server. Check your connection and try again.", 0);
  }
  const record = await handle(res);
  scanCache.set(id, record);
  return record;
}
