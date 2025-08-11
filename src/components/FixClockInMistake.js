import React, { useState } from "react";
import { v4 as uuid } from "uuid";

function FixClockInMistake({
  jobs,
  setJobs,
  idleTotal,
  isIdle,
  idleStartTime,
  setIdleTotal,
  setIsIdle,
  setIdleStartTime,
  buttonClassName,
}) {
  const [showFixUI, setShowFixUI] = useState(false);
  const [fromJob, setFromJob] = useState("");
  const [toJob, setToJob] = useState("");
  const [correctionTime, setCorrectionTime] = useState("");

  const IDLE_KEY = "__IDLE__";

  const handleConfirmFix = () => {
    if (!fromJob || !toJob || !correctionTime) {
      alert("Fill out all fields");
      return;
    }
    if (fromJob === toJob) {
      alert("From and To are the same.");
      return;
    }

    const updatedJobs = JSON.parse(JSON.stringify(jobs)); // deep copy
    const correctionDateTime = new Date();
    const [h, m] = String(correctionTime).split(":");
    correctionDateTime.setHours(Number(h), Number(m), 0, 0);
    let correctionTimestamp = correctionDateTime.getTime();
    const now = Date.now();
    if (correctionTimestamp > now) correctionTimestamp = now;

    // 1) Close/trim the "from" job at correction time (if applicable)
    if (fromJob !== IDLE_KEY) {
      const fromIndex = jobs.findIndex((j) => j.name === fromJob);
      if (fromIndex === -1) return alert("Source job not found");
      const fromJobObj = updatedJobs[fromIndex];

      if (fromJobObj.isClockedIn && fromJobObj.startTime < correctionTimestamp) {
        // Close the running segment at T
        const start = fromJobObj.startTime;
        const end = correctionTimestamp;
        if (end > start) {
          fromJobObj.sessions.push({
            id: `session-${uuid()}`,
            type: "work",
            reasonCode: "",
            startTime: start,
            endTime: end,
            duration: end - start,
          });
        }
        fromJobObj.isClockedIn = false;
        fromJobObj.startTime = null;
        fromJobObj.lastClockOut = correctionTimestamp;
      } else {
        // Not running now — trim only the ended session that spans T (start < T <= end)
        const sess = fromJobObj.sessions || [];
        for (let i = sess.length - 1; i >= 0; i--) {
          const s = sess[i];
          const hasEnds =
            typeof s?.startTime === "number" && typeof s?.endTime === "number";
          if (!hasEnds) continue;
          if (s.startTime < correctionTimestamp && s.endTime >= correctionTimestamp) {
            s.endTime = correctionTimestamp;
            s.duration = Math.max(0, s.endTime - s.startTime);
            fromJobObj.lastClockOut = correctionTimestamp;
            break; // only the most recent spanning session
          }
        }
      }
    }

    // 2) If switching TO Idle: close any running job at T; make Idle live from T
    if (toJob === IDLE_KEY) {
      for (const job of updatedJobs) {
        if (job.isClockedIn && job.startTime < correctionTimestamp) {
          const start = job.startTime;
          const end = correctionTimestamp;
          if (end > start) {
            job.sessions.push({
              id: `session-${uuid()}`,
              type: "work",
              reasonCode: "",
              startTime: start,
              endTime: end,
              duration: end - start,
            });
          }
          job.isClockedIn = false;
          job.startTime = null;
          job.lastClockOut = correctionTimestamp;
        }
      }
      setIsIdle(true);
      // keep earlier idle start if already idle; otherwise start idle at T
      setIdleStartTime((prev) =>
        typeof prev === "number" && prev > 0
          ? Math.min(prev, correctionTimestamp)
          : correctionTimestamp
      );
    }

    // 3) If switching TO another job: stop any running job at T; start target at T.
    if (toJob !== IDLE_KEY) {
      const toIndex = jobs.findIndex((j) => j.name === toJob);
      if (toIndex === -1) return alert("Target job not found");

      // Treat Idle like a job: subtract exactly the T→now slice from effective idle total
      {
        const sliceMs = Math.max(0, now - correctionTimestamp);
        const effectiveIdleNow =
          (idleTotal || 0) +
          (isIdle && typeof idleStartTime === "number"
            ? Math.max(0, now - idleStartTime)
            : 0);
        const newIdleTotal = Math.max(0, effectiveIdleNow - sliceMs);
        setIdleTotal(newIdleTotal);
        setIsIdle(false);
        setIdleStartTime(null);
      }

      // Close any running job segments that started before T
      for (const job of updatedJobs) {
        if (job.isClockedIn && job.startTime < correctionTimestamp) {
          const start = job.startTime;
          const end = correctionTimestamp;
          if (end > start) {
            job.sessions.push({
              id: `session-${uuid()}`,
              type: "work",
              reasonCode: "",
              startTime: start,
              endTime: end,
              duration: end - start,
            });
          }
          job.isClockedIn = false;
          job.startTime = null;
          job.lastClockOut = correctionTimestamp;
        }
      }

      // Start/extend the target job from T
      const toJobObj = updatedJobs[toIndex];
      const existingStart =
        toJobObj.isClockedIn && typeof toJobObj.startTime === "number"
          ? toJobObj.startTime
          : null;
      toJobObj.isClockedIn = true;
      toJobObj.startTime =
        existingStart != null
          ? Math.min(existingStart, correctionTimestamp)
          : correctionTimestamp;
    }

    // 4) Commit local state (no server call here)
    setJobs(updatedJobs);
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
          className={
            buttonClassName ||
            "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm sm:text-base min-w-[140px]"
          }
        >
          ⚠️ Fix a Clock-In Mistake
        </button>
      ) : (
        <div className="bg-yellow-50 p-4 border border-yellow-500 rounded space-y-3">
          <h3 className="font-bold text-yellow-800">Fix Clock-In Mistake</h3>

          <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2 text-base text-gray-800">
            <span className="font-bold">I forgot to clock out of:</span>
            <select
              value={fromJob}
              onChange={(e) => setFromJob(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="">Select job</option>
              <option value={IDLE_KEY}>Break / Idle Time</option>
              {jobs.map((j, idx) => (
                <option key={idx} value={j.name}>
                  {j.name}
                </option>
              ))}
            </select>

            <span className="font-bold">at around:</span>
            <input
              type="time"
              value={correctionTime}
              onChange={(e) => setCorrectionTime(e.target.value)}
              className="border p-2 rounded"
              pattern="\d{2}:\d{2}"
            />

            <span className="font-bold">when I meant to be clocked in to:</span>
            <select
              value={toJob}
              onChange={(e) => setToJob(e.target.value)}
              className="border p-2 rounded"
            >
              <option value="">Select job</option>
              <option value={IDLE_KEY}>Idle Time / Break</option>
              {jobs.map((j, idx) => (
                <option key={idx} value={j.name}>
                  {j.name}
                </option>
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
