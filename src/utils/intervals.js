// src/utils/intervals.js
// Merge ended work intervals across all jobs and return workSeconds, firstStart, lastEnd
export function mergeIntervalsFromJobs(jobs) {
  const intervals = [];
  for (const j of jobs || []) {
    for (const s of j.sessions || []) {
      const start = typeof s?.startTime === "number" ? s.startTime : null;
      const end = typeof s?.endTime === "number" ? s.endTime : null;
      if (start != null && end != null && end > start) intervals.push([start, end]);
    }
  }
  if (intervals.length === 0) return { workSeconds: 0, firstStart: null, lastEnd: null };

  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [];
  let [cs, ce] = intervals[0];
  for (let i = 1; i < intervals.length; i++) {
    const [s, e] = intervals[i];
    if (s <= ce) ce = Math.max(ce, e);
    else { merged.push([cs, ce]); [cs, ce] = [s, e]; }
  }
  merged.push([cs, ce]);

  const workMs = merged.reduce((acc, [s, e]) => acc + (e - s), 0);
  return {
    workSeconds: Math.floor(workMs / 1000),
    firstStart: merged[0][0],
    lastEnd: merged[merged.length - 1][1],
  };
}
