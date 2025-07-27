import React, { useState } from "react";

function FixClockInMistake({
  jobs,
  setJobs,
  idleTotal,
  setIdleTotal,
  setIsIdle,
  setIdleStartTime,
  buttonClassName,
}) {
  const [showFixUI, setShowFixUI] = useState(false);
  const [fromJob, setFromJob] = useState("");
  const [toJob, setToJob] = useState("");
  const [correctionTime, setCorrectionTime] = useState("");

  const handleConfirmFix = () => {
    if (!fromJob || !toJob || !correctionTime) return alert("Fill out all fields");

    const newJobs = [...jobs];
    const correctionDateTime = new Date();
    const [h, m] = correctionTime.split(":");
    correctionDateTime.setHours(Number(h), Number(m), 0, 0);
    const correctionTimestamp = correctionDateTime.getTime();

    if (fromJob === "__IDLE__") {
      const now = Date.now();
      const mistakenIdle = now - correctionTimestamp;
      if (mistakenIdle > 0) {
        const newIdleTotal = Math.max(0, idleTotal - mistakenIdle);
        setIdleTotal(newIdleTotal);
        localStorage.setItem("ghosttrackIdleTotal", newIdleTotal.toString());
      }
    } else {
      const fromIndex = jobs.findIndex((j) => j.name === fromJob);
      if (fromIndex === -1) return alert("Source job not found");

      const fromJobRef = newJobs[fromIndex];
      if (fromJobRef.isClockedIn && fromJobRef.startTime < correctionTimestamp) {
        const correctedDuration = correctionTimestamp - fromJobRef.startTime;
        fromJobRef.sessions.push(correctedDuration);
        fromJobRef.startTime = null;
        fromJobRef.isClockedIn = false;
        fromJobRef.lastClockOut = correctionTimestamp;
      }
    }

    if (toJob === "__IDLE__") {
      newJobs.forEach((job) => {
        if (job.isClockedIn && job.startTime < correctionTimestamp) {
          const duration = correctionTimestamp - job.startTime;
          job.sessions.push(duration);
          job.startTime = null;
          job.isClockedIn = false;
          job.lastClockOut = correctionTimestamp;
        }
      });

      setIsIdle(true);
      setIdleStartTime(correctionTimestamp);
      localStorage.setItem("ghosttrackIsIdle", "true");
      localStorage.setItem("ghosttrackIdleStartTime", correctionTimestamp.toString());

      setJobs(newJobs);
      resetUI();
      return;
    }

    const toIndex = jobs.findIndex((j) => j.name === toJob);
    if (toIndex === -1) return alert("Target job not found");

    newJobs.forEach((job) => {
      if (job.isClockedIn) {
        const now = Date.now();
        const duration = now - job.startTime;
        if (duration > 0) job.sessions.push(duration);
        job.startTime = null;
        job.isClockedIn = false;
        job.lastClockOut = now;
      }
    });

    const toJobRef = newJobs[toIndex];
    toJobRef.isClockedIn = true;
    toJobRef.startTime = correctionTimestamp;

    setJobs(newJobs);
    resetUI();
  };

  const resetUI = () => {
    setShowFixUI(false);
    setFromJob("");
    setToJob("");
    setCorrectionTime("");
  };

  return (
    <div className="mb-4">
      {!showFixUI ? (
        <button
          onClick={() => setShowFixUI(true)}
          className={buttonClassName || "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm sm:text-base min-w-[140px]"}
        >
          🛠️ Fix Clock In Mistake
        </button>
      ) : (
        <div className="bg-yellow-50 p-4 border border-yellow-300 rounded space-y-2">
          <h3 className="font-bold text-yellow-800">Fix Clock-In Mistake</h3>
          <div className="flex flex-col md:flex-row gap-2">
            <select
              value={fromJob}
              onChange={(e) => setFromJob(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="">Forgot to Clock Out of...</option>
              <option value="__IDLE__">Idle Time / Break</option>
              {jobs.map((j, idx) => (
                <option key={idx} value={j.name}>{j.name}</option>
              ))}
            </select>
            <input
              type="time"
              value={correctionTime}
              onChange={(e) => setCorrectionTime(e.target.value)}
              className="border p-2 rounded"
            />
            <select
              value={toJob}
              onChange={(e) => setToJob(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="">Meant to Clock Into...</option>
              <option value="__IDLE__">Idle Time / Break</option>
              {jobs.map((j, idx) => (
                <option key={idx} value={j.name}>{j.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleConfirmFix}
              className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
            >
              ✅ Confirm Fix
            </button>
            <button
              onClick={resetUI}
              className="bg-gray-500 text-white px-4 py-1 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FixClockInMistake;
