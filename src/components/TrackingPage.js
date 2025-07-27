import React, { useState, useEffect } from "react";
import JobCard from "./JobCard";
import FixClockInMistake from "./FixClockInMistake";

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
    if (viewStatus === "active") return;
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
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto font-sans">
      {/* Success Banner */}
      {showSaveSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-800 px-4 py-3 rounded mb-6 shadow-md flex items-center justify-between">
          <span className="text-sm sm:text-base">✅ Log saved successfully!</span>
          <button
            onClick={() => setShowSaveSuccess(false)}
            className="bg-green-600 text-white px-3 py-1 rounded ml-4 text-sm sm:text-base hover:bg-green-700"
          >
            Confirmed
          </button>
        </div>
      )}

      {/* IDLE STATE */}
      {viewStatus === "idle" && (
        <div className="text-center space-y-6 mt-10">
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

      {/* RESUME STATE */}
      {viewStatus === "resume" && (
        <div className="text-center space-y-6 mt-10">
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

      {/* ACTIVE STATE */}
      {viewStatus === "active" && (
        <div className="space-y-8 mt-6">
          {/* SECTION 1 — STATUS HEADER */}
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-5 shadow-md ring-1 ring-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">📅 {todayFormatted}</h1>
                <p className="text-sm text-gray-600 italic">
                  Log Started: {dayStartTime ? new Date(dayStartTime).toLocaleTimeString() : "—"}
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex gap-2 flex-wrap">
                <button
                  onClick={handleSaveToday}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm sm:text-base"
                >
                  ✅ Save Today
                </button>
                <button
                  onClick={handleCancelToday}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm sm:text-base"
                >
                  ❌ Cancel Today
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2 — IDLE/BREAK TRACKER */}
          <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-5 shadow-inner ring-1 ring-yellow-200">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-yellow-800">🛋️ Break Tracker</h2>
              <p className="text-sm text-yellow-700">
                Idle Time: {formatTime(idleTotal + (isIdle && idleStartTime ? Date.now() - idleStartTime : 0))}
              </p>
            </div>
            <button
              onClick={handleTakeBreak}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-3 rounded text-base font-semibold"
            >
              🛑 Take a Break
            </button>
          </div>

          {/* SECTION 3 — JOB TOOLS + CLOCK FIX */}
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-5 shadow-sm ring-1 ring-blue-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 sm:max-w-md flex gap-3">
                <input
                  type="text"
                  placeholder="New Job Name"
                  value={newJobName}
                  onChange={(e) => setNewJobName(e.target.value)}
                  className="flex-1 border border-gray-300 p-2 rounded text-sm sm:text-base"
                />
                <button
                  onClick={handleAddJob}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm sm:text-base hover:bg-blue-700"
                >
                  ➕ Add Job
                </button>
              </div>
              <div className="sm:w-auto">
                <FixClockInMistake
                  jobs={jobs}
                  setJobs={setJobs}
                  idleTotal={idleTotal}
                  setIdleTotal={setIdleTotal}
                  setIsIdle={setIsIdle}
                  setIdleStartTime={setIdleStartTime}
                  buttonClassName="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm sm:text-base"
                />
              </div>
            </div>
          </div>

          {/* JOB LIST */}
          {jobs.length > 0 && (
            <h2 className="text-lg font-semibold text-gray-700 border-b pb-1">📋 Jobs In Progress</h2>
          )}
          <div className="grid gap-4">
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
          </div>
        </div>
      )}
    </div>
  );
}

export default TrackingPage;
