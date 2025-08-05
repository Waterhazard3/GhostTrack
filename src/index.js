import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // ✅ Tailwind styles
import App from "./App";

// Removed migrateGhostTrackStorage import
// Removed migrateOldLogs import

console.log("Starting GhostTrack...");

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
