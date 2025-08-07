import { v4 as uuidv4 } from "uuid";

/**
 * Normalize a single session object
 */
export function validateSession(session) {
  return {
    id: session.id || `session-${uuidv4()}`,
    type: session.type || "work", // 'work' | 'idle'
    reasonCode: session.reasonCode || "",
    startTime: session.startTime || null,
    endTime: session.endTime || null,
    duration:
      typeof session.duration === "number"
        ? session.duration
        : calculateDuration(session),
  };
}

/**
 * Normalize a single job object
 */
export function validateJob(job) {
  const sessions = (job.sessions || []).map(validateSession);
  const totalTime =
    typeof job.totalTime === "number"
      ? job.totalTime
      : sessions.reduce((acc, s) => acc + (s.duration || 0), 0);

  return {
    id: job.id || `job-${uuidv4()}`,
    name: job.name || "Unnamed Job",
    status: job.status || "active",
    manualEdits: job.manualEdits || false,
    totalTime,
    sessions,
    aiSummary: job.aiSummary || "",
    sensorData: job.sensorData || { images: [], audio: [], gps: [] },

    // Preserve live clock-in metadata
    isClockedIn: job.isClockedIn || false,
    startTime: job.startTime || null,
    lastClockOut: job.lastClockOut || null,

    // Preserve task history
    tasksByDate: job.tasksByDate || {},
  };
}

/**
 * Normalize a full daily log object
 */
export function validateLog(log) {
  return {
    schemaVersion: log.schemaVersion || 1,
    date: log.date || log.logId || new Date().toISOString().split("T")[0],
    jobs: (log.jobs || []).map(validateJob),
    idleTotal:
      typeof log.idleTotal === "number"
        ? log.idleTotal
        : typeof log.totalIdleTime === "number"
        ? log.totalIdleTime
        : 0,
    dayStartTime: log.dayStartTime || null,
    dailySummary: log.dailySummary || "",
  };
}

/**
 * Normalize a resume queue object
 */
export function validateResumeQueue(queue) {
  return {
    schemaVersion: queue.schemaVersion || 1,
    date: queue.date || new Date().toISOString().split("T")[0],
    jobs: (queue.jobs || []).map(validateJob),
  };
}

/**
 * Helper: calculate duration from timestamps
 */
function calculateDuration(session) {
  if (!session.startTime || !session.endTime) return 0;
  return new Date(session.endTime) - new Date(session.startTime);
}
