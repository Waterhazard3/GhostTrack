// src/api/outbox.js
const KEY = "ghosttrackOutboxV1";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}
function save(arr) { localStorage.setItem(KEY, JSON.stringify(arr)); }
function dequeueById(id) { save(load().filter(x => x.id !== id)); }

export function enqueue(item) {
  const arr = load();
  arr.push({ ...item, ts: Date.now() });
  save(arr);
}

/**
 * Flush the outbox:
 * - Success: remove item
 * - 4xx (validation etc.): DROP item so it doesn't retry forever
 * - Network/5xx: keep item and stop early (retry later)
 */
export async function flushOutbox(postFn) {
  if (!navigator.onLine) return;
  const items = load();
  for (const item of items) {
    try {
      if (!item?.payload) { dequeueById(item.id); continue; }
      await postFn(item.payload);      // server should be idempotent
      dequeueById(item.id);            // success → remove
    } catch (e) {
      if (e?.status && e.status >= 400 && e.status < 500) {
        // Non-retryable → drop it
        dequeueById(item.id);
        console.warn("Outbox dropped non-retryable item", {
          id: item.id, status: e.status, code: e.code, msg: e.message
        });
      } else {
        // Retryable (network/5xx) → leave item, stop for now
        return;
      }
    }
  }
}

export function initOutbox(postFn) {
  const tryFlush = () => flushOutbox(postFn);
  window.addEventListener("online", tryFlush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tryFlush();
  });
  tryFlush();
}
