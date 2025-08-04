import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // ✅ Tailwind styles
import App from "./App";
import { migrateGhostTrackStorage } from './utils/migrateSchema';
import { migrateOldLogs } from "./utils/migrateOldLogs";
migrateOldLogs();

// ✅ Run migration before rendering app
console.log("Starting GhostTrack...");
migrateGhostTrackStorage();
console.log("✅ GhostTrack migration completed successfully.");

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
