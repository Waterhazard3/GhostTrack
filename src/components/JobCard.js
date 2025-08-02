import React, { useState } from "react";

function JobCard({ job, onAddTask, onToggleClock, onDeleteSession, onDeleteJob }) {
  const [newTask, setNewTask] = useState("");
  const [editingTasks, setEditingTasks] = useState(false);
  const [taskDrafts, setTaskDrafts] = useState([]);
  const [editingName, setEditingName] = useState(false);
  const [jobName, setJobName] = useState(job.name);
  const [showSessions, setShowSessions] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const todaysTasks = job.tasksByDate?.[today] || [];

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hrs = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const mins = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const secs = String(totalSeconds % 60).padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const currentSessionTime = job.isClockedIn ? Date.now() - job.startTime : 0;
  const totalTime =
    job.sessions.reduce((sum, s) => sum + s, 0) +
    (job.isClockedIn ? currentSessionTime : 0);

  const handleStartEditingTasks = () => {
    setTaskDrafts([...todaysTasks]);
    setEditingTasks(true);
  };

  const saveTaskEdits = () => {
    job.tasksByDate[today] = [...taskDrafts];
    setEditingTasks(false);
  };

  const cancelTaskEdits = () => {
    setTaskDrafts([...todaysTasks]);
    setEditingTasks(false);
  };

  const handleTaskChange = (idx, value) => {
    const updated = [...taskDrafts];
    updated[idx] = value;
    setTaskDrafts(updated);
  };

  const handleDeleteTask = (idx) => {
    const updated = [...taskDrafts];
    updated.splice(idx, 1);
    setTaskDrafts(updated);
  };

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    onAddTask(newTask.trim());
    setNewTask("");
  };

  const handleSaveJobName = () => {
    job.name = jobName.trim() || "Untitled Job";
    setEditingName(false);
  };

  const confirmDeleteJob = () => {
    if (window.confirm("❗ Are you sure you want to permanently delete this job?")) {
      onDeleteJob();
    }
  };

  return (
    <div
      className={`flex flex-col border-2 rounded-2xl mb-8 shadow-lg bg-white overflow-hidden hover:shadow-xl transition-shadow duration-200 ${
        job.isClockedIn ? "border-green-500" : "border-gray-800"
      }`}
    >
      {/* 1️⃣ HEADER */}
      <div className="flex justify-between items-center p-4 border-b bg-blue-50">
        {editingName ? (
          <div className="flex flex-col w-full space-y-2">
            <input
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              className="text-2xl font-bold p-2 border border-blue-400 rounded bg-white"
            />
            <div className="space-x-2 text-sm">
              <button
                onClick={handleSaveJobName}
                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                ✅ Save
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-3xl font-extrabold text-gray-900">{job.name}</h2>
<div className="flex items-end space-x-1">
  <button
    onClick={() => setEditingName(true)}
    className="border border-blue-400 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-50 text-xs"
  >
    ✏️ Edit
  </button>
  <button
    onClick={confirmDeleteJob}
    className="border border-red-400 text-red-600 px-2 py-0.5 rounded hover:bg-red-50 text-xs"
  >
    ❌ Delete
  </button>
</div>

          </>
        )}
      </div>

      {/* 2️⃣ CLOCK BUTTON (Moved here under header) */}
      <button
        onClick={onToggleClock}
        className={`w-full text-white font-bold text-2xl py-6 transition-all duration-300 shadow-md hover:shadow-lg ${
          job.isClockedIn
            ? "bg-green-600 hover:bg-green-700"
            : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {job.isClockedIn ? "Clock Out" : "Clock In"}
      </button>

      {/* 3️⃣ TASKS SECTION */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-700">Tasks & Progress</h3>
          {!editingTasks ? (
            <button
              onClick={handleStartEditingTasks}
              className="text-blue-600 text-xs underline"
            >
              Edit
            </button>
          ) : (
            <div className="space-x-2 text-xs">
              <button
                onClick={saveTaskEdits}
                className="text-green-700 font-semibold"
              >
                ✅ Save
              </button>
              <button onClick={cancelTaskEdits} className="text-gray-500">
                Cancel
              </button>
            </div>
          )}
        </div>

        <ul className="text-sm list-disc pl-6 space-y-1">
          {editingTasks
            ? taskDrafts.map((task, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <input
                    value={task}
                    onChange={(e) => handleTaskChange(idx, e.target.value)}
                    className="flex-grow p-1 border rounded text-sm"
                  />
                  <button
                    onClick={() => handleDeleteTask(idx)}
                    className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                  >
                    Delete
                  </button>
                </li>
              ))
            : todaysTasks.map((task, idx) => <li key={idx}>{task}</li>)}
        </ul>

        {!editingTasks && (
          <div className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Add Task/Progress..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-300"
            />
            <button
              onClick={handleAddTask}
              className="bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-900 text-sm"
            >
              ➕ Add
            </button>
          </div>
        )}
      </div>

      {/* 4️⃣ TIME SECTION */}
      <div className="p-4 border-b bg-white text-center">
        <p
          className={`font-medium text-base ${
            job.isClockedIn ? "text-green-700" : "text-gray-700"
          }`}
        >
          Current Session:{" "}
          <span className="font-semibold">{formatTime(currentSessionTime)}</span>
        </p>
        <p className="font-bold text-xl text-gray-800 mt-1">
          Total Today: {formatTime(totalTime)}
        </p>
        <button
          onClick={() => setShowSessions(!showSessions)}
          className="text-blue-600 underline text-xs mt-2"
        >
          {showSessions ? "Hide Session Log" : "View Session Log"}
        </button>

        {showSessions && (
          <ul className="text-xs list-disc pl-5 mt-2 text-gray-700 space-y-1 bg-gray-100 p-2 rounded-lg">
            {job.sessions.map((s, idx) => (
              <li key={idx}>
                Session {idx + 1}: {formatTime(s)}
                <button
                  onClick={() => onDeleteSession(idx)}
                  className="ml-2 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default JobCard;
