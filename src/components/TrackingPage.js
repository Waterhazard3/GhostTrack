import React, { useState, useEffect } from "react";
import JobCard from "./JobCard";
import FixClockInMistake from "./FixClockInMistake";
import { validateJob, validateLog } from "../utils/validateSchema";
import { generateDailySummary } from "../utils/generateDailySummary";

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
  const validatedJobs = jobs.map(validateJob);
  localStorage.setItem("ghosttrackLiveJobs", JSON.stringify(validatedJobs));

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
    sessions: job.sessions.map((s) => {
      if (typeof s === "number") {
        return {
          id: `session-${Date.now()}`,
          type: "work",
          reasonCode: "",
          startTime: null,
          endTime: null,
          duration: s,
        };
      }
      return s;
    }),
    tasksByDate: {
      [today]: job.notes || [],
    },
    isClockedIn: false,
    startTime: null,
    lastClockOut: null,
  }));

  setJobs(restoredJobs);
  localStorage.setItem("ghosttrackLiveJobs", JSON.stringify(restoredJobs));

  // ✅ Restore Idle
  if (typeof log.idleTotal === "number") setIdleTotal(log.idleTotal);
  if (log.idleStartTime) setIdleStartTime(log.idleStartTime);
  setIsIdle(log.isIdle ?? true);

  // ✅ Backfill dayStartTime if missing
  let startTime = log.dayStartTime;
  if (!startTime) {
    const earliest = log.jobs
      .flatMap((j) =>
        j.sessions.map((s) =>
          typeof s === "object" ? s.startTime : null
        )
      )
      .filter(Boolean)
      .sort((a, b) => a - b)[0];
    startTime = earliest || Date.now();
  }
  setDayStartTime(startTime);
  localStorage.setItem("ghosttrackDayStartTime", startTime.toString());

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
      job.sessions.push({
  id: `session-${Date.now()}`,
  type: "work",
  reasonCode: "",
  startTime: job.startTime || null,
  endTime: Date.now(),
  duration: duration
});
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
        j.sessions.push({
  id: `session-${Date.now()}`,
  type: "work",
  reasonCode: "",
  startTime: j.startTime || null,
  endTime: Date.now(),
  duration: duration
});

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

  // ✅ Ensure dayStartTime is set
  let startTime = dayStartTime;
  if (!startTime) {
    const earliestJobStart = jobs
      .flatMap((job) =>
        job.sessions.map((s) =>
          typeof s === "object" ? s.startTime : null
        )
      )
      .filter(Boolean)
      .sort((a, b) => a - b)[0];
    startTime = earliestJobStart || Date.now();
  }

  // ✅ Calculate total idle time (ms)
  // ✅ Calculate total idle time (ms)
const finalIdleDuration = isIdle && idleStartTime ? Date.now() - idleStartTime : 0;
const totalIdleTime = idleTotal + finalIdleDuration;

// ✅ Build job summaries with totalTime
const jobSummaries = jobs.map((job) => {
  const sessions = job.sessions.map((s) => {
    if (typeof s === "number") {
      return {
        id: `session-${Date.now()}`,
        type: "work",
        reasonCode: "",
        startTime: null,
        endTime: null,
        duration: s,
      };
    }
    return s;
  });

  const totalTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

  return {
    name: job.name,
    sessions,
    notes: job.tasksByDate?.[today] || [],
    totalTime, // ✅ store per-job total time
  };
});

// ✅ Save correct idle property
const summary = {
  logId: today,
  jobs: jobSummaries,
  idleTotal: totalIdleTime, // ✅ make sure this is idleTotal
  idleStartTime: null,
  isIdle: false,
  dayStartTime: startTime,
};

  const previousLogs = JSON.parse(localStorage.getItem("ghosttrackLogs") || "[]");
  const existingIndex = previousLogs.findIndex((log) => (log.logId || log.date) === today);

  // ✅ Generate AI Daily Summary
  const generatedSummary = generateDailySummary(summary);
  summary.dailySummary = generatedSummary;

  if (existingIndex !== -1) {
    previousLogs[existingIndex] = summary;
  } else {
    previousLogs.push(summary);
  }

  const validatedLogs = previousLogs.map(validateLog);
  localStorage.setItem("ghosttrackLogs", JSON.stringify(validatedLogs));

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
         {/* PAGE TITLE (no card/box) */}
<div className="flex flex-row items-start justify-between w-full gap-4 flex-nowrap pb-4 mb-6 border-b-2 border-gray-400">
  {/* Left-aligned Page Title */}
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

  {/* Right-aligned stacked buttons */}
  <div className="flex flex-col gap-2 items-end w-[140px] flex-shrink-0 mt-1">
    {/* Save Today - Primary */}
<button
  onClick={handleSaveToday}
  className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-lg text-sm sm:text-base font-semibold shadow-md w-full flex items-center justify-center gap-2"
>
  💾 Save Today
</button>

{/* Cancel Today - Secondary */}
<button
  onClick={handleCancelToday}
  className="border-2 border-red-600 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 text-sm sm:text-base font-semibold w-full transition-colors flex items-center justify-center gap-2"
>
  🗑️ Cancel Today
</button>
  </div>
</div>

          {/* Break Tracker */}
          <div className="transform scale-90 origin-top w-full">
  <div
    className={`rounded-xl shadow-md border-2 transition-colors duration-300 w-full flex flex-col justify-between ${
      isIdle
        ? "border-green-500 bg-green-50 min-h-[160px]"
        : "border-gray-300 bg-white min-h-[110px]"
    }`}
  >
    {/* Top title */}
    <h2 className="text-2xl font-extrabold text-gray-800 px-5 pt-5 text-center w-full">
      Total Idle Today:{" "}
      <span
        className={`${
          isIdle ? "text-green-700" : "text-gray-800"
        }`}
      >
        {formatTime(idleTotal + (isIdle && idleStartTime ? Date.now() - idleStartTime : 0))}
      </span>
    </h2>

    {/* Middle message */}
    {isIdle && (
      <div className="flex items-center justify-center px-5 py-2">
        <p className="text-green-700 text-lg italic font-medium text-center whitespace-nowrap">
          ℹ️ (Clock-In To A Job To Stop Idling)
        </p>
      </div>
    )}

    {/* Bottom bar */}
    {!isIdle ? (
      <button
        onClick={handleTakeBreak}
        className="bg-red-600 hover:bg-red-700 text-white text-center py-3 font-extrabold text-xl shadow-md rounded-b-xl leading-none flex items-center justify-center gap-2"
        style={{ height: "48px" }}
      >
        🛑 Start Break / Idle
      </button>
    ) : (
      <div
        className="bg-green-600 text-white text-center py-3 font-extrabold text-xl shadow-md rounded-b-xl leading-none flex items-center justify-center gap-2"
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
  {/* Add Job */}
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

  {/* Fix Clock-In Mistake */}
  <div className="sm:w-auto mt-2 sm:mt-0">
    <FixClockInMistake
  jobs={jobs}
  setJobs={setJobs}
  idleTotal={idleTotal}
  setIdleTotal={setIdleTotal}
  setIsIdle={setIsIdle}
  setIdleStartTime={setIdleStartTime}
  buttonClassName="border-2 border-gray-500 text-gray-700 px-5 py-3 rounded-lg text-base sm:text-lg font-semibold hover:bg-gray-100 shadow-sm w-full"
/>
  </div>
</div>

          <div className="grid gap-6 mt-4">
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
