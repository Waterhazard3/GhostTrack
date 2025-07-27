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
    <div className="flex flex-col md:flex-row border border-gray-300 rounded-xl mb-6 shadow-md bg-white overflow-hidden">
      {/* LEFT SECTION */}
      <div className="flex-1 p-6 flex flex-col space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-start">
          {editingName ? (
            <div className="flex flex-col w-full space-y-2">
              <input
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
                className="text-4xl font-extrabold p-2 border border-blue-400 rounded bg-white"
              />
              <div className="space-x-2 text-sm">
                <button onClick={handleSaveJobName} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                  ✅ Save
                </button>
                <button onClick={() => setEditingName(false)} className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-4xl font-extrabold text-gray-900">{job.name}</h2>
              <div className="space-x-2">
                <button onClick={() => setEditingName(true)} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 text-sm">
                  ✏️ Edit Name
                </button>
                <button onClick={confirmDeleteJob} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm">
                  ❌ Delete Job
                </button>
              </div>
            </>
          )}
        </div>

        {/* TASKS SECTION */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700">Tasks & Progress:</h3>
            {!editingTasks ? (
              <button onClick={handleStartEditingTasks} className="text-blue-600 text-xs underline">
                Edit List
              </button>
            ) : (
              <div className="space-x-2 text-xs">
                <button onClick={saveTaskEdits} className="text-green-700 font-semibold">✅ Save</button>
                <button onClick={cancelTaskEdits} className="text-gray-500">Cancel</button>
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
                    <button onClick={() => handleDeleteTask(idx)} className="bg-red-500 text-white px-2 py-1 rounded text-xs">
                      Delete
                    </button>
                  </li>
                ))
              : todaysTasks.map((task, idx) => <li key={idx}>{task}</li>)}
          </ul>

          {!editingTasks && (
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Add Task/Progress..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                className="w-full p-2 border rounded text-sm"
              />
              <button onClick={handleAddTask} className="bg-gray-800 text-white px-3 py-1 rounded hover:bg-gray-900 text-sm">
                ➕ Add
              </button>
            </div>
          )}
        </div>

        <hr className="border-gray-200" />

        {/* TIME SECTION */}
        <div className="space-y-3 text-lg">
          <p className={`font-medium ${job.isClockedIn ? "text-green-700" : "text-gray-700"}`}>
            Current Session: <span className="font-semibold">{formatTime(currentSessionTime)}</span>
          </p>
          <p className="font-bold text-gray-800">Total Tracked Today: {formatTime(totalTime)}</p>

          <button onClick={() => setShowSessions(!showSessions)} className="text-blue-600 underline text-xs">
            {showSessions ? "Hide Session Log" : "View Session Log"}
          </button>

          {showSessions && (
            <ul className="text-xs list-disc pl-5 mt-1 text-gray-700 space-y-1">
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

      {/* RIGHT CLOCK BUTTON */}
      <div
        onClick={onToggleClock}
        className={`md:w-56 w-full md:max-w-xs flex justify-center items-center text-white font-bold text-2xl cursor-pointer transition-colors duration-300 ${
          job.isClockedIn ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {job.isClockedIn ? "Clock Out" : "Clock In"}
      </div>
    </div>
  );
}

export default JobCard;
