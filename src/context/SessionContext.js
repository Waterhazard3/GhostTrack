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

  // ✅ Rehydrate jobs on initial load if needed
  useEffect(() => {
    if (jobs.length === 0) {
      try {
        const saved = JSON.parse(localStorage.getItem("ghosttrackLiveJobs") || "[]");
        if (saved.length > 0) setJobs(saved);
      } catch {
        // ignore corrupt JSON
      }
    }
  }, []);

  // ✅ Tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Idle time tracker (based on clock-in status)
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

  // ✅ Persist everything
  useEffect(() => {
    localStorage.setItem("ghosttrackLiveJobs", JSON.stringify(jobs));
    localStorage.setItem("ghosttrackIdleTotal", idleTotal.toString());
    localStorage.setItem("ghosttrackIsIdle", isIdle.toString());
    localStorage.setItem("ghosttrackIdleStartTime", idleStartTime?.toString() || "");
  }, [jobs, idleTotal, isIdle, idleStartTime]);

  // --------------------------------------------
  // Job control functions
  // --------------------------------------------

  const clockIn = (index) => {
    const updated = [...jobs];
    const now = Date.now();

    updated.forEach((j, i) => {
      if (i !== index && j.isClockedIn) {
        const duration = now - j.startTime;
        j.sessions.push({
          id: `session-${now}`,
          type: "work",
          reasonCode: "",
          startTime: j.startTime,
          endTime: now,
          duration,
        });
        j.isClockedIn = false;
        j.startTime = null;
        j.lastClockOut = now;
      }
    });

    const job = updated[index];
    job.isClockedIn = true;
    job.startTime = now;

    setJobs(updated);
  };

  const clockOut = (index) => {
    const updated = [...jobs];
    const now = Date.now();

    const job = updated[index];
    const duration = now - job.startTime;

    job.sessions.push({
      id: `session-${now}`,
      type: "work",
      reasonCode: "",
      startTime: job.startTime,
      endTime: now,
      duration,
    });

    job.isClockedIn = false;
    job.startTime = null;
    job.lastClockOut = now;

    setJobs(updated);
  };

  const takeBreak = () => {
    const updated = [...jobs];
    const now = Date.now();

    updated.forEach((j) => {
      if (j.isClockedIn) {
        const duration = now - j.startTime;
        j.sessions.push({
          id: `session-${now}`,
          type: "work",
          reasonCode: "",
          startTime: j.startTime,
          endTime: now,
          duration,
        });
        j.isClockedIn = false;
        j.startTime = null;
        j.lastClockOut = now;
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
    const today = new Date().toISOString().split("T")[0];

    if (!job.tasksByDate) job.tasksByDate = {};
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
        resetIdleState,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSessionContext = () => useContext(SessionContext);
