import React, { useState } from "react";
import { Clock3, Trash2, Pencil, Save } from "lucide-react";

const formatTime = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const secs = String(totalSeconds % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
};

const WorkHistoryPage = () => {
  const [expandedDateIndex, setExpandedDateIndex] = useState(null);
  const [expandedJobs, setExpandedJobs] = useState({});
  const [logs, setLogs] = useState(
    JSON.parse(localStorage.getItem("ghosttrackLogs") || "[]")
  );
  const [editMode, setEditMode] = useState({});

  const toggleDate = (index) => {
    setExpandedDateIndex((prev) => (prev === index ? null : index));
  };

  const toggleJobSessions = (dateIdx, jobIdx) => {
    const key = `${dateIdx}-${jobIdx}`;
    setExpandedJobs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const getFormattedDate = (log) => {
    const rawDate = log.date || log.logId;
    if (!rawDate) return "Invalid Date";
    const [year, month, day] = rawDate.split("-");
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day));
    const weekday = dateObj.toLocaleDateString("en-US", { weekday: "long" });
    return `${weekday}, ${month}-${day}-${year.slice(2)}`;
  };

  const getTotalDayTime = (jobs) => {
    const total = jobs.reduce(
      (sum, job) => sum + job.sessions.reduce((s, t) => s + t, 0),
      0
    );
    return formatTime(total);
  };

  const getEndTime = (jobs) => {
    let latest = 0;
    jobs.forEach((job) => {
      job.sessions.forEach((dur) => {
        latest = Math.max(latest, dur);
      });
    });
    return latest || null;
  };

  const handleDeleteSingleLog = (index) => {
    const confirmDelete = window.confirm("Delete this log entry?");
    if (!confirmDelete) return;
    const updatedLogs = [...logs];
    updatedLogs.splice(index, 1);
    setLogs(updatedLogs);
    localStorage.setItem("ghosttrackLogs", JSON.stringify(updatedLogs));
  };

  const handleClearHistory = () => {
    const confirmClear = window.confirm(
      "Are you sure you want to permanently delete all saved work logs?"
    );
    if (confirmClear) {
      localStorage.removeItem("ghosttrackLogs");
      setLogs([]);
      alert("🗑️ All work history has been cleared.");
    }
  };

  const handleEditToggle = (index) => {
    setEditMode((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleEditChange = (logIdx, jobIdx, field, value) => {
    console.log("✏️ Edited field:", { logIdx, jobIdx, field, value });
    const updatedLogs = [...logs];
    if (field === "name") {
      updatedLogs[logIdx].jobs[jobIdx].name = value;
    } else if (field === "note") {
      updatedLogs[logIdx].jobs[jobIdx].notes = value.split("\n");
    } else if (field === "jobTime") {
      const ms = parseTimeInput(value);
      updatedLogs[logIdx].jobs[jobIdx].sessions = [ms];
    } else if (field === "idle") {
      const ms = parseTimeInput(value);
      updatedLogs[logIdx].idleTotal = ms;
    }
    setLogs(updatedLogs);
  };

  const parseTimeInput = (str) => {
    const [h, m, s] = str.split(":" ).map((n) => parseInt(n, 10));
    return ((h || 0) * 3600 + (m || 0) * 60 + (s || 0)) * 1000;
  };

  const handleSaveEdits = () => {
    document.activeElement?.blur();
    const clonedLogs = JSON.parse(JSON.stringify(logs));
    localStorage.setItem("ghosttrackLogs", JSON.stringify(clonedLogs));
    console.log("✅ Saving logs to localStorage:", clonedLogs);
    setLogs(clonedLogs);
    setEditMode({});
  };

  return (
    <div className="p-8 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📅 Work History</h1>
        {logs.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            🗑️ Clear All Work History
          </button>
        )}
      </div>

      {logs.length === 0 && (
        <p className="text-gray-600">No work history saved yet.</p>
      )}

      {logs
        .slice()
        .reverse()
        .map((log, dateIdx) => {
          const formattedDate = getFormattedDate(log);
          const totalTime = getTotalDayTime(log.jobs);
          const idleTime = formatTime(log.idleTotal || 0);
          const startTimeStr = log.dayStartTime
            ? new Date(log.dayStartTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "N/A";

          return (
            <div key={dateIdx} className="mb-6">
              <div
                className="flex justify-between items-center bg-gray-100 hover:bg-gray-200 px-4 py-3 rounded-lg shadow cursor-pointer"
                onClick={() => toggleDate(dateIdx)}
              >
                <div>
                  <div className="font-semibold text-lg">
                    {formattedDate} •{" "}
                    <span className="text-blue-700 font-medium">
                      Total: {totalTime}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    🕐 Start: {startTimeStr} • 💤 Idle: {idleTime}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {expandedDateIndex === dateIdx && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditToggle(dateIdx);
                      }}
                      className="text-gray-600 hover:text-gray-800"
                      title="Edit"
                    >
                      {editMode[dateIdx] ? <Save size={18} /> : <Pencil size={18} />}
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSingleLog(dateIdx);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {expandedDateIndex === dateIdx && (
                <div className="mt-4 space-y-4 pl-2">
                  {log.jobs.map((job, jobIdx) => {
                    const jobKey = `${dateIdx}-${jobIdx}`;
                    const jobTime = formatTime(
                      job.sessions.reduce((s, t) => s + t, 0)
                    );

                    return (
                      <div
                        key={jobKey}
                        className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-3">
                          {editMode[dateIdx] ? (
                            <input
                              className="text-xl font-bold text-gray-900 border px-2 py-1 rounded"
                              defaultValue={job.name}
                              onBlur={(e) =>
                                handleEditChange(dateIdx, jobIdx, "name", e.target.value)
                              }
                            />
                          ) : (
                            <div className="text-2xl font-extrabold text-gray-900">
                              {job.name}
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-lg font-bold text-blue-700">
                            <Clock3 size={18} />
                            {editMode[dateIdx] ? (
                              <input
                                className="border px-2 py-1 rounded w-28"
                                defaultValue={jobTime}
                                onBlur={(e) =>
                                  handleEditChange(
                                    dateIdx,
                                    jobIdx,
                                    "jobTime",
                                    e.target.value
                                  )
                                }
                              />
                            ) : (
                              jobTime
                            )}
                          </div>
                        </div>

                        <div className="text-sm text-gray-800 mb-2">
                          <div className="font-medium mb-1">Tasks & Progress:</div>
                          {editMode[dateIdx] ? (
                            <textarea
                              className="border w-full rounded px-2 py-1"
                              rows={job.notes.length || 3}
                              defaultValue={job.notes.join("\n")}
                              onBlur={(e) =>
                                handleEditChange(
                                  dateIdx,
                                  jobIdx,
                                  "note",
                                  e.target.value
                                )
                              }
                            />
                          ) : (
                            <ul className="list-disc pl-5">
                              {job.notes.length === 0 ? (
                                <li>No notes</li>
                              ) : (
                                job.notes.map((note, idx) => (
                                  <li key={idx}>{note}</li>
                                ))
                              )}
                            </ul>
                          )}
                        </div>

                        <div
                          onClick={() => toggleJobSessions(dateIdx, jobIdx)}
                          className="text-blue-600 text-xs underline mt-1 cursor-pointer"
                        >
                          {expandedJobs[jobKey] ? "Hide Sessions" : "View Sessions"}
                        </div>

                        {expandedJobs[jobKey] && (
                          <ul className="text-xs list-disc pl-6 mt-1 text-gray-700">
                            {job.sessions.map((s, idx) => (
                              <li key={idx}>
                                Session {idx + 1}: {formatTime(s)}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}

                  {editMode[dateIdx] && (
                    <div className="mt-2 text-sm text-gray-800">
                      <label className="block font-medium mb-1">
                        Total Idle Time:
                      </label>
                      <input
                        className="border px-2 py-1 rounded"
                        defaultValue={idleTime}
                        onBlur={(e) =>
                          handleEditChange(dateIdx, null, "idle", e.target.value)
                        }
                      />
                      <button
                        onClick={handleSaveEdits}
                        className="ml-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                      >
                        💾 Save Edits
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
};

export default WorkHistoryPage;
