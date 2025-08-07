import React, { createContext, useContext, useState, useEffect } from "react";

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
  const [jobs, setJobs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ghosttrackLiveJobs") || "[]");
    } catch {
      return [];
    }
  });

  const [tick, setTick] = useState(0);
  const [idleTotal, setIdleTotal] = useState(() => {
    const saved = localStorage.getItem("ghosttrackIdleTotal");
    return saved ? Number(saved) : 0;
  });
  const [isIdle, setIsIdle] = useState(() => {
    return localStorage.getItem("ghosttrackIsIdle") === "true";
  });
  const [idleStartTime, setIdleStartTime] = useState(() => {
    const saved = localStorage.getItem("ghosttrackIdleStartTime");
    return saved ? Number(saved) : null;
  });

  // ✅ STEP 1: Rehydrate jobs from ghosttrackLiveJobs if empty
  useEffect(() => {
    if (jobs.length === 0) {
      try {
        const saved = JSON.parse(localStorage.getItem("ghosttrackLiveJobs") || "[]");
        if (saved.length > 0) setJobs(saved);
      } catch {
        // ignore
      }
    }
  }, []);

  // Tick every second to drive timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Idle tracking logic (this will be replaced in Step 2)
  // ✅ Tick-based idle tracking — clean and consistent
useEffect(() => {
  const someoneClockedIn = jobs.some((j) => j.isClockedIn);

  if (!someoneClockedIn && !isIdle && jobs.length > 0) {
    setIdleStartTime(Date.now());
    setIsIdle(true);
  } else if (someoneClockedIn && isIdle) {
    if (idleStartTime) {
      setIdleTotal((prev) => prev + (Date.now() - idleStartTime));
    }
    setIdleStartTime(null);
    setIsIdle(false);
  }
}, [tick]);

  // Persist all session state
  useEffect(() => {
    localStorage.setItem("ghosttrackLiveJobs", JSON.stringify(jobs));
    localStorage.setItem("ghosttrackIdleTotal", idleTotal.toString());
    localStorage.setItem("ghosttrackIsIdle", isIdle.toString());
    localStorage.setItem("ghosttrackIdleStartTime", idleStartTime?.toString() || "");
  }, [jobs, idleTotal, isIdle, idleStartTime]);

  const clockIn = (index) => {
    const updated = [...jobs];
    const job = updated[index];

    updated.forEach((j, i) => {
      if (i !== index && j.isClockedIn) {
        const endTime = Date.now();
        const duration = endTime - j.startTime;
        j.sessions.push({
          id: `session-${Date.now()}`,
          type: "work",
          reasonCode: "",
          startTime: j.startTime || null,
          endTime: endTime,
          duration,
        });
        j.lastClockOut = endTime;
        j.isClockedIn = false;
        j.startTime = null;
      }
    });

    job.isClockedIn = true;
    job.startTime = Date.now();
    setJobs(updated);
  };

  const clockOut = (index) => {
    const updated = [...jobs];
    const job = updated[index];
    const endTime = Date.now();
    const duration = endTime - job.startTime;

    job.sessions.push({
      id: `session-${Date.now()}`,
      type: "work",
      reasonCode: "",
      startTime: job.startTime || null,
      endTime: endTime,
      duration,
    });
    job.lastClockOut = endTime;
    job.isClockedIn = false;
    job.startTime = null;

    setJobs(updated);
  };

  const takeBreak = () => {
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
          endTime: endTime,
          duration,
        });
        j.lastClockOut = endTime;
        j.isClockedIn = false;
        j.startTime = null;
      }
    });
    setJobs(updated);
  };

  const addJob = (name) => {
    const newJob = {
      id: `job-${Date.now()}`,
      name: name.trim(),
      tasksByDate: {},
      sessions: [],
      isClockedIn: false,
      startTime: null,
      lastClockOut: null,
    };
    setJobs([newJob, ...jobs]);
  };

  const deleteJob = (index) => {
    const updated = [...jobs];
    updated.splice(index, 1);
    setJobs(updated);
  };

  const addTaskToJob = (index, task) => {
    const updated = [...jobs];
    const job = updated[index];
    if (!job.tasksByDate) job.tasksByDate = {};
    const today = new Date().toISOString().split("T")[0];
    if (!job.tasksByDate[today]) job.tasksByDate[today] = [];
    job.tasksByDate[today].push(task);
    setJobs(updated);
  };

  const getElapsedTime = (index) => {
    const job = jobs[index];
    if (!job.isClockedIn || !job.startTime) return 0;
    return Date.now() - job.startTime;
  };
const resetIdleState = () => {
  setIdleTotal(0);
  setIsIdle(false);
  setIdleStartTime(null);
};
  return (
    <SessionContext.Provider
  value={{
    jobs,
    setJobs,
    idleTotal,
    isIdle,
    idleStartTime,
    tick,
    clockIn,
    clockOut,
    takeBreak,
    addJob,
    deleteJob,
    addTaskToJob,
    getElapsedTime,
    resetIdleState, // ✅ ADD THIS LINE
  }}
>
      {children}
    </SessionContext.Provider>
  );
};

export const useSessionContext = () => useContext(SessionContext);
