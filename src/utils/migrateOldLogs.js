export function migrateOldLogs() {
  console.log("🚀 Running migrateOldLogs utility...");

  const logs = JSON.parse(localStorage.getItem("ghosttrackLogs") || "[]");
  console.log("📦 Logs before migration:", logs);

  const migrated = logs.map((log) => {
    // Ensure jobs array
    if (!Array.isArray(log.jobs)) {
      log.jobs = [];
    }

    log.jobs = log.jobs.map((job) => {
      if (!Array.isArray(job.sessions)) {
        job.sessions = [];
      }

      // Convert raw durations to structured sessions
      job.sessions = job.sessions.map((s) => {
        if (typeof s === "number") {
          return {
            id: `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            type: "work",
            reasonCode: "",
            startTime: null,
            endTime: null,
            duration: s,
          };
        }

        return {
          ...s,
          duration: s.duration !== undefined ? s.duration : 0,
        };
      });

      return job;
    });

    // ✅ Only set dayStartTime if missing
    if (!log.dayStartTime) {
      const sessionTimes = log.jobs
        .flatMap((j) => j.sessions)
        .map((s) => s.startTime)
        .filter(Boolean);

      if (sessionTimes.length > 0) {
        log.dayStartTime = Math.min(...sessionTimes);
      } else {
        log.dayStartTime = Date.now(); // fallback
        log.startTimeEstimated = true;
      }
    }

    return log;
  });

  localStorage.setItem("ghosttrackLogs", JSON.stringify(migrated));
  console.log("✅ Logs after migration:", migrated);
  console.log("✅ Migrated old logs for session durations and start times.");
}
