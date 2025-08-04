import { v4 as uuidv4 } from 'uuid'; // npm install uuid if not already installed

export function migrateGhostTrackStorage() {
  console.log("Running GhostTrack schema migration...");

  // ---- Helper functions ----
  const upgradeSession = (session) => {
    return {
      id: session.id || `session-${uuidv4()}`,
      type: session.type || 'work',
      reasonCode: session.reasonCode || '',
      startTime: session.startTime || null,
      endTime: session.endTime || null,
      duration: session.duration || calculateDuration(session),
    };
  };

  const upgradeJob = (job) => {
    const sessions = (job.sessions || []).map(upgradeSession);
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
  };

  const calculateDuration = (session) => {
    if (!session.startTime || !session.endTime) return 0;
    return Math.floor((new Date(session.endTime) - new Date(session.startTime)) / 1000);
  };

  // ---- Upgrade each storage key ----
  const liveJobs = JSON.parse(localStorage.getItem('ghosttrackLiveJobs') || '[]');
  const logs = JSON.parse(localStorage.getItem('ghosttrackLogs') || '[]');
  const resumeQueue = JSON.parse(localStorage.getItem('ghosttrackResumeQueue') || '{}');

  const upgradedLiveJobs = liveJobs.map(upgradeJob);
  const upgradedLogs = logs.map(log => ({
    schemaVersion: log.schemaVersion || 1,
    date: log.date || new Date().toISOString().split('T')[0],
    jobs: (log.jobs || []).map(upgradeJob),
    dailySummary: log.dailySummary || '',
  }));
  const upgradedResumeQueue = {
    schemaVersion: resumeQueue.schemaVersion || 1,
    date: resumeQueue.date || new Date().toISOString().split('T')[0],
    jobs: (resumeQueue.jobs || []).map(upgradeJob),
  };

  // ---- Save upgraded data ----
  localStorage.setItem('ghosttrackLiveJobs', JSON.stringify(upgradedLiveJobs));
  localStorage.setItem('ghosttrackLogs', JSON.stringify(upgradedLogs));
  localStorage.setItem('ghosttrackResumeQueue', JSON.stringify(upgradedResumeQueue));

  console.log("GhostTrack schema migration complete.");
}
