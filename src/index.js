import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css"; // ✅ Tailwind styles
import App from "./App";
import { migrateGhostTrackStorage } from './utils/migrateSchema';

// ✅ Run migration before rendering app
console.log("Starting GhostTrack...");
migrateGhostTrackStorage();
console.log("Migration completed, launching app...");

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
