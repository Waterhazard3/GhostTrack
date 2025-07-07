import React, { useState, useEffect } from "react";
import JobCard from "./JobCard";

function TrackingPage() {
  const [tick, setTick] = useState(0);
  const today = new Date().toISOString().split("T")[0];
  const [currentDate, setCurrentDate] = useState(today);
  const [viewStatus, setViewStatus] = useState("idle");

  const [jobs, setJobs] = useState(() => {
    const saved = localStorage.getItem("ghosttrackLiveJobs");
    try {
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.map((job) => ({
        ...job,
        startTime: job.startTime ? Number(job.startTime) : null,
        lastClockOut: job.lastClockOut || null,
      }));
    } catch {
      return [];
    }
  });

  const [newJobName, setNewJobName] = useState("");
  const [dayStartTime, setDayStartTime] = useState(() => {
    const saved = localStorage.getItem("ghosttrackDayStartTime");
    return saved ? Number(saved) : null;
  });

  const [idleStartTime, setIdleStartTime] = useState(() => {
    const saved = localStorage.getItem("ghosttrackIdleStartTime");
    return saved ? Number(saved) : null;
  });

  const [idleTotal, setIdleTotal] = useState(() => {
    const saved = localStorage.getItem("ghosttrackIdleTotal");
    return saved ? Number(saved) : 0;
  });

  const [isIdle, setIsIdle] = useState(() => {
    const saved = localStorage.getItem("ghosttrackIsIdle");
    return saved === "true";
  });

  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newDate = new Date().toISOString().split("T")[0];
      if (newDate !== currentDate) {
        setCurrentDate(newDate);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [currentDate]);

  useEffect(() => {
    localStorage.setItem("ghosttrackLiveJobs", JSON.stringify(jobs));

    const someoneClockedIn = jobs.some((j) => j.isClockedIn);
    if (!someoneClockedIn && !isIdle && jobs.length > 0) {
      const now = Date.now();
      setIdleStartTime(now);
      setIsIdle(true);
    } else if (someoneClockedIn && isIdle) {
      if (idleStartTime) {
        const idleDuration = Date.now() - idleStartTime;
        setIdleTotal((prev) => prev + idleDuration);
      }
      setIdleStartTime(null);
      setIsIdle(false);
    }
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem("ghosttrackIdleStartTime", idleStartTime?.toString() || "");
    localStorage.setItem("ghosttrackIdleTotal", idleTotal.toString());
    localStorage.setItem("ghosttrackIsIdle", isIdle.toString());
  }, [idleStartTime, idleTotal, isIdle]);

  const getTodayLogFromHistory = (dateStr = today) => {
    const logs = JSON.parse(localStorage.getItem("ghosttrackLogs") || "[]");
    return logs.find((log) => (log.logId || log.date) === dateStr);
  };

  useEffect(() => {
  if (viewStatus === "active") return; // don't override active mode
  const existingLog = getTodayLogFromHistory();
  if (jobs.length > 0) setViewStatus("active");
  else if (existingLog) setViewStatus("resume");
  else setViewStatus("idle");
}, [jobs, viewStatus]);


  const handleStartTracking = () => {
    const now = Date.now();
    setDayStartTime(now);
    setIdleStartTime(now);
    setIdleTotal(0);
    setIsIdle(true);
    setJobs([]);
    setViewStatus("active");
    localStorage.setItem("ghosttrackDayStartTime", now.toString());
    localStorage.setItem("ghosttrackLiveJobs", JSON.stringify([]));
  };

  const handleResumeToday = () => {
    const log = getTodayLogFromHistory();
    if (!log) return;

    const restoredJobs = log.jobs.map((job) => ({
      name: job.name,
      sessions: [...job.sessions],
      tasksByDate: {
        [today]: job.notes || [],
      },
      isClockedIn: false,
      startTime: null,
      lastClockOut: null,
    }));

    setJobs(restoredJobs);
    localStorage.setItem("ghosttrackLiveJobs", JSON.stringify(restoredJobs));

    if (typeof log.idleTotal === "number") setIdleTotal(log.idleTotal);
    if (log.idleStartTime) setIdleStartTime(log.idleStartTime);
    setIsIdle(log.isIdle ?? true);
    if (log.dayStartTime) {
      setDayStartTime(log.dayStartTime);
      localStorage.setItem("ghosttrackDayStartTime", log.dayStartTime.toString());
    }

    setViewStatus("active");
  };

  const handleAddJob = () => {
    if (!newJobName.trim()) return;
    const newJob = {
      name: newJobName.trim(),
      tasksByDate: {},
      sessions: [],
      isClockedIn: false,
      startTime: null,
      lastClockOut: null,
    };
    setJobs([newJob, ...jobs]);
    setNewJobName("");
  };

  const handleAddTaskToJob = (index, task) => {
    const updated = [...jobs];
    const job = updated[index];

    if (!job.tasksByDate) job.tasksByDate = {};
    if (!job.tasksByDate[today]) job.tasksByDate[today] = [];

    job.tasksByDate[today].push(task);
    setJobs(updated);
  };

  const handleToggleClock = (index) => {
    const updated = [...jobs];
    const job = updated[index];

    if (job.isClockedIn) {
      const endTime = Date.now();
      const duration = endTime - job.startTime;
      job.sessions.push(duration);
      job.lastClockOut = endTime;
      job.isClockedIn = false;
      job.startTime = null;
    } else {
      updated.forEach((j, i) => {
        if (i !== index && j.isClockedIn) {
          const endTime = Date.now();
          const duration = endTime - j.startTime;
          j.sessions.push(duration);
          j.lastClockOut = endTime;
          j.isClockedIn = false;
          j.startTime = null;
        }
      });

      job.isClockedIn = true;
      job.startTime = Date.now();
    }

    setJobs(updated);
  };

  const handleTakeBreak = () => {
    const updated = [...jobs];
    updated.forEach((j) => {
      if (j.isClockedIn) {
        const endTime = Date.now();
        const duration = endTime - j.startTime;
        j.sessions.push(duration);
        j.lastClockOut = endTime;
        j.isClockedIn = false;
        j.startTime = null;
      }
    });
    setJobs(updated);
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const secs = String(totalSeconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const handleDeleteSession = (jobIdx, sessionIdx) => {
    const updated = [...jobs];
    updated[jobIdx].sessions.splice(sessionIdx, 1);
    setJobs(updated);
  };

  const handleDeleteJob = (index) => {
    const updated = [...jobs];
    updated.splice(index, 1);
    setJobs(updated);
  };

  const handleSaveToday = () => {
    const anyClockedIn = jobs.some((job) => job.isClockedIn);
    if (anyClockedIn) {
      alert("⚠️ Please clock out of all jobs before saving.");
      return;
    }

    const finalIdleDuration = isIdle && idleStartTime ? Date.now() - idleStartTime : 0;
    const summary = {
      logId: today,
      jobs: [],
      idleTotal: idleTotal + finalIdleDuration,
      idleStartTime: null,
      isIdle: false,
      dayStartTime,
    };

    jobs.forEach((job) => {
      const jobSummary = {
        name: job.name,
        sessions: [...job.sessions],
        notes: job.tasksByDate?.[today] || [],
      };
      if (jobSummary.sessions.length > 0 || jobSummary.notes.length > 0) {
        summary.jobs.push(jobSummary);
      }
    });

    if (summary.jobs.length === 0 && summary.idleTotal === 0) {
      alert("No work logged today to save.");
      return;
    }

    const previousLogs = JSON.parse(localStorage.getItem("ghosttrackLogs") || "[]");
    const existingIndex = previousLogs.findIndex((log) => (log.logId || log.date) === today);

    if (existingIndex !== -1) {
      previousLogs[existingIndex] = summary;
    } else {
      previousLogs.push(summary);
    }

    localStorage.setItem("ghosttrackLogs", JSON.stringify(previousLogs));
    localStorage.removeItem("ghosttrackLiveJobs");
    localStorage.removeItem("ghosttrackDayStartTime");
    localStorage.removeItem("ghosttrackIdleStartTime");
    localStorage.removeItem("ghosttrackIdleTotal");
    localStorage.removeItem("ghosttrackIsIdle");

    setJobs([]);
    setDayStartTime(null);
    setIdleStartTime(null);
    setIdleTotal(0);
    setIsIdle(false);
    setShowSaveSuccess(true);
    setViewStatus("idle");
  };

  const handleCancelToday = () => {
    if (window.confirm("Cancel and delete today's current log?")) {
      setJobs([]);
      localStorage.removeItem("ghosttrackLiveJobs");
      localStorage.removeItem("ghosttrackDayStartTime");

      const stillHasSavedLog = Boolean(getTodayLogFromHistory());
      if (!stillHasSavedLog) {
        localStorage.removeItem("ghosttrackIdleStartTime");
        localStorage.removeItem("ghosttrackIdleTotal");
        localStorage.removeItem("ghosttrackIsIdle");
        setIdleStartTime(null);
        setIdleTotal(0);
        setIsIdle(false);
      }

      setViewStatus("idle");
    }
  };

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-8 font-sans">
      {showSaveSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded mb-4 shadow-md flex items-center justify-between">
          <span>✅ Log saved successfully!</span>
          <button
            onClick={() => setShowSaveSuccess(false)}
            className="bg-green-600 text-white px-3 py-1 rounded ml-4 hover:bg-green-700"
          >
            Confirmed
          </button>
        </div>
      )}

      {viewStatus === "idle" && (
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold">Today’s Work Log</h1>
          <div className="text-2xl font-bold text-gray-800">📅 {todayFormatted}</div>
          <button
            onClick={handleStartTracking}
            className="text-white bg-green-600 px-6 py-3 rounded hover:bg-green-700 text-lg"
          >
            + Start Today’s Log
          </button>
        </div>
      )}

      {viewStatus === "resume" && (
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold">Today’s Work Log</h1>
          <div className="text-2xl font-bold text-gray-800">📅 {todayFormatted}</div>
          <button
            onClick={handleResumeToday}
            className="text-white bg-blue-600 px-6 py-3 rounded hover:bg-blue-700 text-lg"
          >
            🔄 Resume Today’s Log
          </button>
        </div>
      )}

      {viewStatus === "active" && (
        <>
          <div className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-green-50 border border-green-300 p-4 rounded-xl shadow-sm">
              <div className="text-2xl font-bold text-black">
                📅 {todayFormatted}{" "}
                {dayStartTime && (
                  <span className="ml-4 text-green-800 text-base font-semibold">
                    🕐 Started:{" "}
                    {new Date(dayStartTime).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleSaveToday}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  💾 Save Today’s Log
                </button>
                <button
                  onClick={handleCancelToday}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  ❌ Exit Without Saving
                </button>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg shadow-sm flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="text-base font-semibold text-gray-800">
                {isIdle
                  ? `⏸️ You are now idling • Total Idle Time: ${formatTime(
                      idleTotal + (idleStartTime ? Date.now() - idleStartTime : 0)
                    )}`
                  : `⏱️ Actively working • Total Idle Time: ${formatTime(idleTotal)}`}
              </div>
              {!isIdle && (
                <div className="mt-2 md:mt-0">
                  <button
                    onClick={handleTakeBreak}
                    className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                  >
                    ⏸️ Take a Break / Idle
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6 flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Add a New Job"
              value={newJobName}
              onChange={(e) => setNewJobName(e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded flex-grow text-base"
            />
            <button
              onClick={handleAddJob}
              className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900 flex items-center gap-2"
            >
              ➕ <span>Create Job</span>
            </button>
          </div>

          {jobs.map((job, idx) => (
            <JobCard
              key={idx}
              job={job}
              onAddTask={(task) => handleAddTaskToJob(idx, task)}
              onToggleClock={() => handleToggleClock(idx)}
              onDeleteSession={(sIdx) => handleDeleteSession(idx, sIdx)}
              onDeleteJob={() => handleDeleteJob(idx)}
            />
          ))}
        </>
      )}
    </div>
  );
}

export default TrackingPage;
