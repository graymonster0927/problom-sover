import { useState, useEffect, useRef } from "react";
import { useAppStore } from "../store/appStore";
import { aiService } from "../services/aiService";
import { windowService } from "../services/windowService";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

export default function FloatBall() {
  const [isLoading, setIsLoading] = useState(false);
  const selectionEvent = useAppStore((s) => s.selectionEvent);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggered = useRef(false);

  useEffect(() => {
    const unlisten = listen("ai_done", () => setIsLoading(false));
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  // Reset trigger flag when a new selection arrives
  useEffect(() => {
    triggered.current = false;
    setIsLoading(false);
  }, [selectionEvent]);

  // Mouse-down on drag handle → startDragging()
  const handleDragMouseDown = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await getCurrentWebviewWindow().startDragging();
    } catch (_) { /* ignore */ }
  };

  const handleMouseEnter = () => {
    if (triggered.current || !selectionEvent?.text) return;
    hoverTimer.current = setTimeout(async () => {
      if (triggered.current) return;
      triggered.current = true;
      setIsLoading(true);
      try {
        await windowService.hideFloatBall().catch(console.error);
        await windowService.showResultPanel(
          selectionEvent.x + 20,
          selectionEvent.y - 260,
        ).catch(console.error);
        const { emit } = await import("@tauri-apps/api/event");
        await emit("open_result_panel", { text: selectionEvent.text });
        aiService.solveWithAi(selectionEvent.text).catch(console.error);
      } catch (e) {
        console.error(e);
        triggered.current = false;
        setIsLoading(false);
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "transparent",
    }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: "20px",
          boxShadow: "0 2px 14px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.10)",
          border: "1px solid rgba(255,255,255,0.2)",
          overflow: "hidden",
          userSelect: "none",
        }}
      >
        {/* Drag handle — mousedown triggers startDragging(), does NOT fire hover */}
        <div
          onMouseDown={handleDragMouseDown}
          onMouseEnter={(e) => e.stopPropagation()}
          onMouseLeave={(e) => e.stopPropagation()}
          title="拖动"
          style={{
            padding: "8px 6px 8px 10px",
            cursor: "grab",
            display: "flex",
            alignItems: "center",
            opacity: 0.35,
            flexShrink: 0,
          }}
        >
          <DragIcon />
        </div>

        {/* Divider */}
        <div style={{ width: "1px", height: "16px", background: "rgba(0,0,0,0.10)", flexShrink: 0 }} />

        {/* Content area — hover here triggers analysis */}
        <div 
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          padding: "8px 13px 8px 10px",
          cursor: isLoading ? "default" : "pointer",
        }}>
          {isLoading ? <LoadingSpinner /> : <QuoteIcon />}
          <span style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "#1a1a1a",
            letterSpacing: "0.01em",
            lineHeight: 1,
            whiteSpace: "nowrap",
          }}>
            {isLoading ? "分析中…" : "询问AI"}
          </span>
        </div>
      </div>
    </div>
  );
}

function DragIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
      {[0, 4, 8].map((y) =>
        [0, 4].map((x) => (
          <circle key={`${x}-${y}`} cx={x + 1} cy={y + 1} r="1.2" fill="#666" />
        ))
      )}
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg width="15" height="13" viewBox="0 0 15 13" fill="none">
      <text x="0" y="12" fontSize="18" fontWeight="700" fill="#1a1a1a" fontFamily="Georgia, serif">
        ❝
      </text>
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24"
      style={{ animation: "spin 0.8s linear infinite" }} fill="none">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="#e0e0e0" strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
