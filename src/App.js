import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import WorkHistoryPage from "./components/WorkHistoryPage";
import TrackingPage from "./components/TrackingPage";
import { SessionProvider } from "./context/SessionContext";

// ⬇️ Add these
import { initOutbox } from "./api/outbox";
import { postLog } from "./api/client";

function App() {
  // Initialize outbox once on mount
  useEffect(() => {
    initOutbox(postLog);
  }, []);

  return (
    <SessionProvider>
      <Router>
        <div>
          <nav className="p-4 bg-gray-200 mb-8 flex gap-4">
            <Link to="/">
              <button className="px-4 py-2 bg-white rounded shadow hover:bg-gray-100">
                🏠 Home
              </button>
            </Link>
            <Link to="/tracking">
              <button className="px-4 py-2 bg-white rounded shadow hover:bg-gray-100">
                ▶️ Today's Log
              </button>
            </Link>
            <Link to="/history">
              <button className="px-4 py-2 bg-white rounded shadow hover:bg-gray-100">
                📅 Work History
              </button>
            </Link>
          </nav>

          <Routes>
            <Route
              path="/"
              element={
                <div className="text-center pt-12">
                  <h1 className="text-3xl font-bold mb-2">Welcome to GhostTrack</h1>
                  <p className="text-lg text-gray-700">
                    Select an option above to get started.
                  </p>
                </div>
              }
            />
            <Route path="/tracking" element={<TrackingPage />} />
            <Route path="/history" element={<WorkHistoryPage />} />
          </Routes>
        </div>
      </Router>
    </SessionProvider>
  );
}

export default App;
