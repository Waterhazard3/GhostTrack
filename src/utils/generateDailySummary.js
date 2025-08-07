// utils/generateDailySummary.js

export function generateDailySummary(log) {
  if (!log || !Array.isArray(log.jobs)) {
    return "No job data available for this day.";
  }

  // ✅ Use totalIdleTime or fallback to idleTotal
  const totalIdleMs = typeof log.totalIdleTime === "number"
    ? log.totalIdleTime
    : (typeof log.idleTotal === "number" ? log.idleTotal : 0);
  const totalIdleSeconds = Math.floor(totalIdleMs / 1000);

  // ✅ Compute total work time from job.totalTime or fallback to sessions
  const totalWorkSeconds = log.jobs.reduce((sum, job) => {
    if (typeof job.totalTime === "number") {
      return sum + Math.floor(job.totalTime / 1000);
    }

    const sessionSeconds = job.sessions.reduce((acc, s) => {
      if (typeof s === "number") return acc + Math.floor(s / 1000);
      if (s && typeof s === "object" && s.duration) return acc + Math.floor(s.duration / 1000);
      return acc;
    }, 0);

    return sum + sessionSeconds;
  }, 0);

  const jobCount = log.jobs.length;
  const totalHours = Math.floor(totalWorkSeconds / 3600);
  const totalMins = Math.floor((totalWorkSeconds % 3600) / 60);
  const idleHours = Math.floor(totalIdleSeconds / 3600);
  const idleMins = Math.floor((totalIdleSeconds % 3600) / 60);

  const jobSummaries = log.jobs.map((job) => {
    const jobSeconds = typeof job.totalTime === "number"
      ? Math.floor(job.totalTime / 1000)
      : job.sessions.reduce((acc, s) => {
          if (typeof s === "number") return acc + Math.floor(s / 1000);
          if (s && typeof s === "object" && s.duration) return acc + Math.floor(s.duration / 1000);
          return acc;
        }, 0);

    const hours = Math.floor(jobSeconds / 3600);
    const mins = Math.floor((jobSeconds % 3600) / 60);
    const sessionCount = job.sessions.length;
    const tasks = (job.notes || []).join(", ") || "No tasks logged";

    return `- ${job.name}: ${sessionCount} sessions, ${hours}h ${mins}m. Tasks: ${tasks}`;
  });

  return [
    `Summary for ${log.logId || log.date}:`,
    `- ${jobCount} jobs worked, ${totalHours}h ${totalMins}m total, ${idleHours}h ${idleMins}m idle.`,
    ...jobSummaries,
  ].join("\n");
}
