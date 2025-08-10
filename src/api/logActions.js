import { postLog, getLogByDate } from "./client";
import { enqueue } from "./outbox";

/**
 * Save today's log to the server.
 * Falls back to queue if offline or server error.
 */
export async function saveToday(log) {
  try {
    await postLog(log); // send to server
    // Optional: keep local copy for offline resume
    localStorage.setItem("ghosttrackLastSaved", JSON.stringify(log));
  } catch (e) {
    // offline or server down — queue it
    enqueue({ id: log.logId, type: "POST_LOG", payload: log });
  }
}

/**
 * Fetch a saved log from the server by date.
 * Falls back to localStorage if server fetch fails.
 */
export async function resumeByDate(dateKey) {
  try {
    const serverLog = await getLogByDate(dateKey);
    return serverLog;
  } catch (e) {
    const local = localStorage.getItem("ghosttrackLastSaved");
    return local ? JSON.parse(local) : null;
  }
}
