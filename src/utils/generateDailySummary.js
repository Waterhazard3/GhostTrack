// utils/generateDailySummary.js

export function generateDailySummary(log) { 
  if (!log || !Array.isArray(log.jobs)) {
    return "No job data available for this day.";
  }

  // ✅ Prefer stored totalIdleTime if available
  const totalIdleMs = typeof log.totalIdleTime === "number" 
    ? log.totalIdleTime 
    : (typeof log.idleTotal === "number" ? log.idleTotal : 0);
  const totalIdleSeconds = Math.floor(totalIdleMs / 1000);

  // ✅ Calculate total work time (prefer totalTime if present)
  const totalWorkSeconds = log.jobs.reduce((sum, job) => {
    if (typeof job.totalTime === "number") {
      return sum + Math.floor(job.totalTime / 1000);
    }
    // fallback: calculate from sessions
    const jobTotal = job.sessions.reduce((acc, session) => {
      if (typeof session === "number") {
        return acc + Math.floor(session / 1000);
      }
      if (session && typeof session === "object" && session.duration) {
        return acc + Math.floor(session.duration / 1000);
      }
      return acc;
    }, 0);
    return sum + jobTotal;
  }, 0);

  const jobCount = log.jobs.length;

  const jobSummaries = log.jobs.map((job) => {
    const jobTotalSeconds = typeof job.totalTime === "number"
      ? Math.floor(job.totalTime / 1000)
      : job.sessions.reduce((acc, session) => {
          if (typeof session === "number") {
            return acc + Math.floor(session / 1000);
          }
          if (session && typeof session === "object" && session.duration) {
            return acc + Math.floor(session.duration / 1000);
          }
          return acc;
        }, 0);

    const hours = Math.floor(jobTotalSeconds / 3600);
    const mins = Math.floor((jobTotalSeconds % 3600) / 60);
    const tasks = (job.notes || []).join(", ") || "No tasks logged";
    const sessionCount = job.sessions.length;

    return `- ${job.name}: ${sessionCount} sessions, ${hours}h ${mins}m. Tasks: ${tasks}`;
  });

  const totalHours = Math.floor(totalWorkSeconds / 3600);
  const totalMins = Math.floor((totalWorkSeconds % 3600) / 60);

  const idleHours = Math.floor(totalIdleSeconds / 3600);
  const idleMins = Math.floor((totalIdleSeconds % 3600) / 60);

  return [
    `Summary for ${log.logId || log.date}:`,
    `- ${jobCount} jobs worked, ${totalHours}h ${totalMins}m total, ${idleHours}h ${idleMins}m idle.`,
    ...jobSummaries,
  ].join("\n");
}
