import React, { useState } from "react";

function FixClockInMistake({ jobs, setJobs }) {
  const [showFixUI, setShowFixUI] = useState(false);
  const [fromJob, setFromJob] = useState("");
  const [toJob, setToJob] = useState("");
  const [correctionTime, setCorrectionTime] = useState("");

  const handleConfirmFix = () => {
    if (!fromJob || !toJob || !correctionTime) return alert("Fill out all fields");

    const fromIndex = jobs.findIndex((j) => j.name === fromJob);
    const toIndex = jobs.findIndex((j) => j.name === toJob);
    if (fromIndex === -1 || toIndex === -1) return alert("Job not found");

    const newJobs = [...jobs];
    const now = Date.now();
    const correctionDateTime = new Date();
    const [h, m] = correctionTime.split(":");
    correctionDateTime.setHours(Number(h), Number(m), 0, 0);
    const correctionTimestamp = correctionDateTime.getTime();

    // Cut off the last session from the FROM job at the correction time
    const fromJobRef = newJobs[fromIndex];
    if (fromJobRef.isClockedIn && fromJobRef.startTime < correctionTimestamp) {
      const correctedDuration = correctionTimestamp - fromJobRef.startTime;
      fromJobRef.sessions.push(correctedDuration);
      fromJobRef.startTime = null;
      fromJobRef.isClockedIn = false;
    }

    // Add a new session to the TO job beginning at the correction time
    const toJobRef = newJobs[toIndex];
    if (!toJobRef.isClockedIn) {
      toJobRef.isClockedIn = true;
      toJobRef.startTime = correctionTimestamp;
    }

    setJobs(newJobs);
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
          className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
        >
          🛠 Fix Clock-In Mistake
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
              onClick={() => setShowFixUI(false)}
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
