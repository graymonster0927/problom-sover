import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import FloatBallPage from "./pages/FloatBallPage";
import ResultPage from "./pages/ResultPage";
import SettingsPage from "./pages/SettingsPage";
import HistoryPage from "./pages/HistoryPage";

// Force transparent background before any React paint
document.documentElement.style.cssText += ";background:transparent!important";
document.body.style.cssText += ";background:transparent!important";

/**
 * Routing strategy:
 *  - Production (file://): each window loads a unique hash URL set in tauri.conf.json
 *    e.g. /#/float_ball, /#/result, /#/history, /#/settings
 *  - Dev (http://localhost): all windows load the same devUrl, so we fall back to
 *    the Tauri window label injected into globalThis by the Tauri runtime.
 */
function getRoute(): string {
  const hash = window.location.hash; // "#/float_ball" etc.
  if (hash.includes("/float_ball")) return "float_ball";
  if (hash.includes("/result"))     return "result";
  if (hash.includes("/history"))    return "history";
  if (hash.includes("/settings"))   return "settings";

  // Dev fallback: read window label from Tauri internals
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const internals = (globalThis as any).__TAURI_INTERNALS__;
  const label: string = internals?.metadata?.currentWindow?.label ?? "";
  if (label === "float_ball") return "float_ball";
  if (label === "result_panel") return "result";
  if (label === "history")    return "history";

  return "settings"; // default: main / settings
}

const route = getRoute();

// Debug logging
console.log('[Main] Route detected:', route);
console.log('[Main] Window hash:', window.location.hash);
console.log('[Main] Window label:', (globalThis as any).__TAURI_INTERNALS__?.metadata?.currentWindow?.label);

function App() {
  if (route === "float_ball") return <FloatBallPage />;
  if (route === "result")     return <ResultPage />;
  if (route === "history")    return <HistoryPage />;
  return <SettingsPage />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
