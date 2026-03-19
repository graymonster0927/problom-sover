import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore, SelectionEvent } from "../store/appStore";
import { windowService } from "../services/windowService";

export function useSelectionEvent() {
  const setSelectionEvent = useAppStore((s) => s.setSelectionEvent);

  useEffect(() => {
    const unlistenSelection = listen<SelectionEvent>("selection_event", (event) => {
      const { text, x, y } = event.payload;
      if (text.trim()) {
        // Store the selection event so FloatBall can pass the text to AI.
        // The float_ball window is shown directly by the Rust backend,
        // so no invoke call is needed here.
        setSelectionEvent({ text, x, y });
      }
    });

    // Listen for deselection event to hide the float ball
    const unlistenDeselection = listen("deselection_event", () => {
      setSelectionEvent(null);
      windowService.hideFloatBall();
    });

    return () => {
      unlistenSelection.then((fn) => fn());
      unlistenDeselection.then((fn) => fn());
    };
  }, [setSelectionEvent]);

  return useAppStore((s) => s.selectionEvent);
}
