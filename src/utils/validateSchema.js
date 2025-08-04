import { v4 as uuidv4 } from 'uuid';

export function validateJob(job) {
  const sessions = (job.sessions || []).map(validateSession);
  const totalTime = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);

  return {
    id: job.id || `job-${uuidv4()}`,
    name: job.name || 'Unnamed Job',
    status: job.status || 'active',
    manualEdits: job.manualEdits || false,
    totalTime: job.totalTime || totalTime,
    totalIdleTime: job.totalIdleTime || 0,
    sessions,
    aiSummary: job.aiSummary || '',
    sensorData: job.sensorData || { images: [], audio: [], gps: [] },
  };
}

export function validateSession(session) {
  return {
    id: session.id || `session-${uuidv4()}`,
    type: session.type || 'work', // work | idle
    reasonCode: session.reasonCode || '',
    startTime: session.startTime || null,
    endTime: session.endTime || null,
    duration: session.duration || calculateDuration(session),
  };
}

function calculateDuration(session) {
  if (!session.startTime || !session.endTime) return 0;
  return Math.floor((new Date(session.endTime) - new Date(session.startTime)) / 1000);
}

export function validateLog(log) {
  return {
    schemaVersion: log.schemaVersion || 1,
    date: log.date || new Date().toISOString().split('T')[0],
    jobs: (log.jobs || []).map(validateJob),
    dailySummary: log.dailySummary || '',
  };
}

export function validateResumeQueue(queue) {
  return {
    schemaVersion: queue.schemaVersion || 1,
    date: queue.date || new Date().toISOString().split('T')[0],
    jobs: (queue.jobs || []).map(validateJob),
  };
}
