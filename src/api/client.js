const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000/api/v1";

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) {
    const msg = json?.error?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json.data;
}

export async function postLog(log) {
  return request("/logs", { method: "POST", body: log });
}

export async function getLogByDate(date) {
  return request(`/logs/${date}`);
}

export async function listLogs(limit = 30, before) {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (before) qs.set("before", before);
  return request(`/logs?${qs.toString()}`);
}
