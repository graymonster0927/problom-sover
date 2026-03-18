import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import FloatBallPage from "./pages/FloatBallPage";
import ResultPage from "./pages/ResultPage";
import SettingsPage from "./pages/SettingsPage";
import HistoryPage from "./pages/HistoryPage";

// Force transparent background at the JS level — covers cases where
// WebKit ignores CSS for the initial paint on transparent Tauri windows.
document.documentElement.style.background = "transparent";
document.body.style.background = "transparent";

// Route to different pages based on window label
const windowLabel = getCurrentWebviewWindow().label;

function App() {
  switch (windowLabel) {
    case "float_ball":
      return <FloatBallPage />;
    case "result_panel":
      return <ResultPage />;
    case "settings":
      return <SettingsPage />;
    case "history":
      return <HistoryPage />;
    default:
      // Main window: show settings by default
      return <SettingsPage />;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
