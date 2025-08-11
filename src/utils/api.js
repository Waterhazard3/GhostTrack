// src/utils/api.js
const BASE = process.env.REACT_APP_API_BASE || "";

export async function upsertLog(day) {
  const res = await fetch(`${BASE}/api/v1/logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(day),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    const msg = json?.error?.message || `HTTP ${res.status}`;
    throw new Error(`upsertLog failed: ${msg}`);
  }
  return json.data; // canonical server day doc
}
