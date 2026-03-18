import { useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "../store/appStore";

interface AgentChunk {
  content: string;
  done: boolean;
}

export function useAiStream() {
  const { aiContent, aiStatus, aiError, appendAiContent, setAiStatus, resetAiContent, setAiError } =
    useAppStore();

  useEffect(() => {
    const unlistenChunk = listen<AgentChunk>("ai_chunk", (event) => {
      appendAiContent(event.payload.content);
      if (useAppStore.getState().aiStatus !== "loading") {
        setAiStatus("loading");
      }
    });

    const unlistenDone = listen<AgentChunk>("ai_done", () => {
      setAiStatus("done");
    });

    const unlistenError = listen<string>("ai_error", (event) => {
      setAiError(event.payload);
      setAiStatus("error");
    });

    return () => {
      unlistenChunk.then((fn) => fn());
      unlistenDone.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, [appendAiContent, setAiStatus, setAiError]);

  const reset = useCallback(() => {
    resetAiContent();
    setAiStatus("idle");
  }, [resetAiContent, setAiStatus]);

  return { content: aiContent, status: aiStatus, error: aiError, reset };
}
