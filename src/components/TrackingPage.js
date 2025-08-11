import React, { useState, useEffect } from "react";
import JobCard from "./JobCard";
import FixClockInMistake from "./FixClockInMistake";
import { validateLog } from "../utils/validateSchema";
import { generateDailySummary } from "../utils/generateDailySummary";
import { useSessionContext } from "../context/SessionContext";

// ✅ Added: server write-only helper + uuid for safe ids when needed
import { saveToday as saveTodayToServer } from "../api/logActions";
import { v4 as uuid } from "uuid";

// Stable UUID per date so retries are idempotent and schema-valid
function getOrCreateServerLogId(dateKey) {
  const key = `ghosttrackServerLogId:${dateKey}`;
  let id = localStorage.getItem(key);
  if (!id) { id = uuid(); localStorage.setItem(key, id); }
  return id;
}

function TrackingPage() {
  const today = new Date().toISOString().split("T")[0];
  const [currentDate, setCurrentDate] = useState(today);
  const [viewStatus, setViewStatus] = useState("idle");
  const [newJobName, setNewJobName] = useState("");
  const [dayStartTime, setDayStartTime] = useState(() => {
    const saved = localStorage.getItem("ghosttrackDayStartTime");
    return saved ? Number(saved) : null;
  });
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Accessing context for job and idle state management
  const { jobs, setJobs, clockIn, clockOut, addJob, deleteJob, addTaskToJob, idleTotal, setIdleTotal, isIdle, setIsIdle, idleStartTime, setIdleStartTime, takeBreak, getElapsedTime, tick, resetIdleState } = useSessionContext();


  // Date rollover checker
  useEffect(() => {
    const interval = setInterval(() => {
      const newDate = new Date().toISOString().split("T")[0];
      if (newDate !== currentDate) setCurrentDate(newDate);
    }, 60000);
    return () => clearInterval(interval);
  }, [currentDate]);

  // Initialize view status
  useEffect(() => {
    const logs = (() => {
      try {
        const parsed = JSON.parse(localStorage.getItem("ghosttrackLogs") || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();

    const todayLog = logs.find((log) => (log.logId || log.date) === today);

    if (jobs.length > 0) setViewStatus("active");
    else if (todayLog) setViewStatus("resume");
    else setViewStatus("idle");
  }, []);

  // **Handle adding task to job** (added function)
  const handleAddTask = (jobIdx, task) => {
    const updatedJobs = [...jobs];  // Clone the jobs array
    const job = updatedJobs[jobIdx];  // Get the specific job
    const currentDate = new Date().toISOString().split("T")[0];  // Get today's date in YYYY-MM-DD format

    // Initialize tasksByDate if it doesn't exist
    if (!job.tasksByDate) {
      job.tasksByDate = {};
    }

    // Initialize the current date's tasks array if it doesn't exist
    if (!job.tasksByDate[currentDate]) {
      job.tasksByDate[currentDate] = [];
    }

    // Add the task to the current date's task list
    job.tasksByDate[currentDate].push(task);

    setJobs(updatedJobs);  // Update the jobs state with the new task
  };

  const handleStartTracking = () => {
    const now = Date.now();
    setDayStartTime(now);
    localStorage.setItem("ghosttrackDayStartTime", now.toString());
    setJobs([]);
    setViewStatus("active");

    resetIdleState();
    localStorage.removeItem("ghosttrackIdleStartTime");
    localStorage.removeItem("ghosttrackIdleTotal");
    localStorage.removeItem("ghosttrackIsIdle");
  };

  const handleResumeToday = () => {
  let logs = [];
  try {
    logs = JSON.parse(localStorage.getItem("ghosttrackLogs") || "[]");
  } catch {
    logs = [];
  }

  const log = logs.find((l) => (l.logId || l.date) === today);
  if (!log) return;

  const restoredJobs = log.jobs.map((job) => ({
    id: job.id || `job-${Date.now()}`,
    name: job.name,
    sessions: job.sessions,
    tasksByDate: job.tasksByDate || {},
    isClockedIn: false,
    startTime: null,
    lastClockOut: null,
  }));

  setJobs(restoredJobs);

  let startTime = log.dayStartTime;
  if (!startTime) {
    const earliest = log.jobs
      .flatMap((j) =>
        j.sessions.map((s) => (typeof s === "object" ? s.startTime : null))
      )
      .filter(Boolean)
      .sort((a, b) => a - b)[0];
    startTime = earliest || Date.now();
  }

  setDayStartTime(startTime);
  localStorage.setItem("ghosttrackDayStartTime", startTime.toString());

  // ✅ Restore idle total
  if (typeof log.idleTotal === "number") {
    setIdleTotal(log.idleTotal);
  } else {
    const storedIdleTime = localStorage.getItem("ghosttrackIdleTotal");
    if (storedIdleTime) setIdleTotal(Number(storedIdleTime));
  }

  // ✅ Restore idle start time (only if still idle when saved)
  if (log.isIdle && log.idleStartTime) {
    setIdleStartTime(log.idleStartTime);
    setIsIdle(true);
  } else {
    const storedIdleStartTime = localStorage.getItem("ghosttrackIdleStartTime");
    if (storedIdleStartTime) {
      setIdleStartTime(Number(storedIdleStartTime));
      setIsIdle(true);
    }
  }

  setViewStatus("active");
};

  const handleAddJob = () => {
    if (!newJobName.trim()) return;
    addJob(newJobName);
    setNewJobName("");
  };

  const handleSaveToday = async () => {
  const anyClockedIn = jobs.some((job) => job.isClockedIn);
  if (anyClockedIn) {
    alert("⚠️ Please clock out of all jobs before saving.");
    return;
  }

  let startTime = dayStartTime;
  if (!startTime) {
    const earliestJobStart = jobs
      .flatMap((job) =>
        job.sessions.map((s) => (typeof s === "object" ? s.startTime : null))
      )
      .filter(Boolean)
      .sort((a, b) => a - b)[0];
    startTime = earliestJobStart || Date.now();
  }

  // Calculate total idle time at the moment of saving
  const finalIdleDuration =
    isIdle && localStorage.getItem("ghosttrackIdleStartTime")
      ? Date.now() - Number(localStorage.getItem("ghosttrackIdleStartTime"))
      : 0;

  const totalIdleTime = idleTotal + finalIdleDuration;

  // Store total idle time in localStorage
  localStorage.setItem("ghosttrackIdleTotal", totalIdleTime.toString());
  
  // Store idleStartTime if user is still idle
  if (isIdle) {
    localStorage.setItem("ghosttrackIdleStartTime", Date.now());
  } else {
    localStorage.removeItem("ghosttrackIdleStartTime");
  }

  const jobSummaries = jobs.map((job) => {
    const sessions = job.sessions.map((s) =>
      typeof s === "number"
        ? {
            id: `session-${Date.now()}`,
            type: "work",
            reasonCode: "",
            startTime: null,
            endTime: null,
            duration: s,
          }
        : s
    );

    const totalTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    return {
      name: job.name,
      sessions,
      totalTime,
      tasksByDate: job.tasksByDate || {}, // Save full tasks
    };
  });

  const summary = {
  logId: today,
  date: today, // ← add this line
  jobs: jobSummaries,
  idleTotal: totalIdleTime,
  idleStartTime: null,
  isIdle: false,
  dayStartTime: startTime,
};

  let previousLogsRaw = localStorage.getItem("ghosttrackLogs");
  let previousLogs = [];

  try {
    const parsed = JSON.parse(previousLogsRaw || "[]");
    previousLogs = Array.isArray(parsed) ? parsed : [];
  } catch {
    previousLogs = [];
  }

  const existingIndex = previousLogs.findIndex(
    (log) => (log.logId || log.date) === today
  );

  summary.dailySummary = generateDailySummary(summary);

  if (existingIndex !== -1) previousLogs[existingIndex] = summary;
  else previousLogs.push(summary);

  const validatedLogs = previousLogs.map(validateLog).filter(Boolean);
  localStorage.setItem("ghosttrackLogs", JSON.stringify(validatedLogs));

  // ✅ NEW: also save to the server (write-only; does not affect resume)
  // Build a server payload from current in-memory data WITHOUT changing local shapes
  try {
    const serverJobs = jobs.map((job) => {
      const jobId = uuid();
      // cursor used only when we need to synthesize start/end for number-only sessions
      let cursor = startTime;

      const sessions = (job.sessions || []).map((s) => {
        if (typeof s === "object" && (s.startTime || s.endTime)) {
          const startISO = s.startTime ? new Date(s.startTime).toISOString() : new Date(Date.now() - (s.duration || 0)).toISOString();
          const endISO = s.endTime ? new Date(s.endTime).toISOString() : new Date().toISOString();
          return {
            sessionId: s.sessionId || uuid(),
            startTime: startISO,
            endTime: endISO,
          };
        }
        const durMs = typeof s === "number" ? s : (s?.duration || 0);
        const startISO = new Date(cursor).toISOString();
        const endISO = new Date(cursor + durMs).toISOString();
        cursor += durMs;
        return {
          sessionId: uuid(),
          startTime: startISO,
          endTime: endISO,
        };
      });

      return { jobId, jobName: job.name, sessions };
    });

    const serverPayload = {
      logId: getOrCreateServerLogId(today),                // idempotent per day
      date: today,                 // YYYY-MM-DD
      jobs: serverJobs,
      idleTimeSeconds: Math.max(0, Math.floor(totalIdleTime / 1000)), // seconds
      meta: { notes: "", tags: [] },
    };

    await saveTodayToServer(serverPayload); // will queue if offline
  } catch {
    // no-op; server write is best-effort and already queues on error
  }

  // Reset idle state after saving the log
  localStorage.removeItem("ghosttrackIsIdle");

  // Reset idle state in context
  setIdleTotal(0); // Reset idle total after saving
  setIsIdle(false); // Set idle state to false (stop idle timer)
  setIdleStartTime(null); // Reset idle start time to null

  setJobs([]);
  setDayStartTime(null);
  setShowSaveSuccess(true);
  setViewStatus("resume");
};

  const handleCancelToday = () => {
    if (!window.confirm("Cancel and delete today's current log?")) return;

    setJobs([]);
    localStorage.removeItem("ghosttrackLiveJobs");
    localStorage.removeItem("ghosttrackDayStartTime");

    let logs = [];
    try {
      logs = JSON.parse(localStorage.getItem("ghosttrackLogs") || "[]");
    } catch {
      logs = [];
    }

    const stillHasSavedLog = Boolean(
      logs.find((log) => (log.logId || log.date) === today)
    );

    if (!stillHasSavedLog) {
      localStorage.removeItem("ghosttrackIdleStartTime");
      localStorage.removeItem("ghosttrackIdleTotal");
      localStorage.removeItem("ghosttrackIsIdle");
    }

    setViewStatus("idle");
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const secs = String(totalSeconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const liveIdleDuration =
    isIdle && idleStartTime ? Date.now() - idleStartTime : 0;

  const idleDisplayTotal = idleTotal + liveIdleDuration;
  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-5xl mx-auto font-sans bg-gray-100 min-h-screen">
      {showSaveSuccess && (
        <div className="bg-green-100 border-2 border-green-700 text-green-800 px-4 py-3 rounded mb-6 shadow-md flex items-center justify-between">
          <span className="text-base sm:text-lg font-semibold">✅ Log saved successfully!</span>
          <button
            onClick={() => setShowSaveSuccess(false)}
            className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 font-semibold"
          >
            Confirmed
          </button>
        </div>
      )}

      {viewStatus === "idle" && (
        <div className="text-center space-y-6 mt-10 bg-white border-2 border-gray-300 shadow-lg rounded-2xl p-6">
          <h1 className="text-4xl font-extrabold">Today’s Work Log</h1>
          <div className="text-2xl font-bold text-gray-800">📅 {todayFormatted}</div>
          <button
            onClick={handleStartTracking}
            className="text-white bg-blue-700 px-8 py-4 rounded-xl hover:bg-blue-800 text-xl font-bold shadow-md"
          >
            + Start Today’s Log
          </button>
        </div>
      )}

      {viewStatus === "resume" && (
        <div className="text-center space-y-6 mt-10 bg-white border-2 border-gray-300 shadow-lg rounded-2xl p-6">
          <h1 className="text-4xl font-extrabold">Today’s Work Log</h1>
          <div className="text-2xl font-bold text-gray-800">📅 {todayFormatted}</div>
          <button
            onClick={handleResumeToday}
            className="text-white bg-slate-600 px-8 py-4 rounded-xl hover:bg-slate-700 text-xl font-bold shadow-md"
          >
            🔄 Resume Today’s Log
          </button>
        </div>
      )}

      {viewStatus === "active" && (
        <div className="space-y-8 mt-6">
          {/* Page Title */}
          <div className="flex flex-row items-start justify-between w-full gap-4 pb-4 mb-6 border-b-2 border-gray-400">
            <div className="flex-1 min-w-[160px]">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
                {new Date().toLocaleDateString("en-US", { weekday: "long" })}
              </h1>
              <p className="text-xl sm:text-2xl font-semibold text-gray-700">
                {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
              <p className="text-sm sm:text-base text-gray-600 italic mt-1">
                Log Started:{" "}
                {dayStartTime
                  ? new Date(dayStartTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "—"}
              </p>
            </div>
            <div className="flex flex-col gap-2 items-end w-[140px] mt-1">
              <button
                onClick={handleSaveToday}
                className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg text-sm sm:text-base font-semibold shadow-md w-full flex items-center justify-center gap-2"
              >
                💾 Save Today
              </button>
              <button
                onClick={handleCancelToday}
                className="border-2 border-red-600 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 text-sm sm:text-base font-semibold w-full transition-colors flex items-center justify-center gap-2"
              >
                🗑️ Cancel Today
              </button>
            </div>
          </div>

          {/* Idle Tracker */}
          <div className="transform scale-90 origin-top w-full">
            <div
              className={`rounded-xl shadow-md border-2 transition-colors duration-300 w-full flex flex-col justify-between ${
                isIdle ? "border-green-500 bg-green-50 min-h-[160px]" : "border-gray-300 bg-white min-h-[110px]"
              }`}
            >
              <h2 className="text-2xl font-extrabold text-gray-800 px-5 pt-5 text-center w_full">
                Total Idle Today:{" "}
                <span className={isIdle ? "text-green-700" : "text-gray-800"}>
                  {formatTime(idleDisplayTotal)}
                </span>
              </h2>
              {isIdle && (
                <div className="flex items-center justify-center px-5 py-2">
                  <p className="text-green-700 text-lg italic font-medium text-center whitespace-nowrap">
                    ℹ️ (Clock-In To A Job To Stop Idling)
                  </p>
                </div>
              )}
              {!isIdle ? (
                <button
                  onClick={takeBreak}
                  className="bg-red-600 hover:bg-red-700 text_white text-center py-3 font-extrabold text-xl shadow-md rounded-b-xl leading-none flex items-center justify-center gap-2"
                  style={{ height: "48px" }}
                >
                  🛑 Start Break / Idle
                </button>
              ) : (
                <div
                  className="bg-green-600 text-white text-center py-3 font-extrabold text-xl shadow-md rounded-b-xl leading-none flex items-center justify_center gap-2"
                  style={{ height: "48px" }}
                >
                  🕒 Break / Idle - Active
                </div>
              )}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 pb-2 border-b-2 border-gray-300">
            📋 Jobs In Progress:
          </h2>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
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
                className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 text-sm sm:text-base font-semibold shadow-md"
              >
                + Add Job
              </button>
            </div>

            <div className="sm:w-auto mt-2 sm:mt-0">
              <FixClockInMistake
                jobs={jobs}
                setJobs={setJobs} // ✅ must be from context
                idleTotal={idleTotal}
                isIdle={isIdle}
                idleStartTime={idleStartTime}
                setIdleTotal={setIdleTotal}
                setIsIdle={setIsIdle}
                setIdleStartTime={setIdleStartTime}
                buttonClassName="border-2 border-gray-500 text-gray-700 px-5 py-3 rounded-lg text-base sm:text-lg font-semibold hover:bg-gray-100 shadow-sm w-full"
              />
            </div>
          </div>

          <div className="grid gap-6 mt-4">
            {jobs.map((job, idx) => {
              const elapsed = getElapsedTime(idx);
              const pastSessions = job.sessions.reduce(
                (sum, s) => sum + (s.duration || 0),
                0
              );
              const totalTime = elapsed + pastSessions;

              // ✅ Current session time (0 if not clocked in)
              const currentSessionTime = job.isClockedIn ? elapsed : 0;

              return (
                <JobCard
                  key={idx}
                  job={job}
                  tick={tick} // ✅ Add this line
                  elapsedTotalFormatted={formatTime(totalTime)}
                  elapsedCurrentSessionFormatted={formatTime(currentSessionTime)}
                  onAddTask={(task) => handleAddTask(idx, task)} // ✅ Use handleAddTask here
                  onToggleClock={() => job.isClockedIn ? clockOut(idx) : clockIn(idx)}
                  onDeleteSession={(sIdx) => {
                    const updated = [...jobs];
                    updated[idx].sessions.splice(sIdx, 1);
                    setJobs(updated);
                  }}
                  onDeleteJob={() => deleteJob(idx)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default TrackingPage;
