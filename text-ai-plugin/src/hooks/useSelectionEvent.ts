import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore, SelectionEvent } from "../store/appStore";

export function useSelectionEvent() {
  const setSelectionEvent = useAppStore((s) => s.setSelectionEvent);

  useEffect(() => {
    const unlisten = listen<SelectionEvent>("selection_event", (event) => {
      const { text, x, y } = event.payload;
      if (text.trim()) {
        // Store the selection event so FloatBall can pass the text to AI.
        // The float_ball window is shown directly by the Rust backend,
        // so no invoke call is needed here.
        setSelectionEvent({ text, x, y });
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setSelectionEvent]);

  return useAppStore((s) => s.selectionEvent);
}
