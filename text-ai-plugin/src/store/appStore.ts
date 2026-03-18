// Zustand global store
import { create } from "zustand";

export interface SelectionEvent {
  text: string;
  x: number;
  y: number;
}

export interface AppSettings {
  provider: string;
  api_key: string;
  model: string;
  base_url: string | null;
  hotkey: string;
  enabled: boolean;
  max_iterations: number;
  timeout_secs: number;
}

export type AiStatus = "idle" | "loading" | "done" | "error";

interface AppStore {
  selectionEvent: SelectionEvent | null;
  aiStatus: AiStatus;
  aiContent: string;
  aiError: string | null;
  settings: AppSettings | null;

  setSelectionEvent: (e: SelectionEvent | null) => void;
  setAiStatus: (s: AiStatus) => void;
  appendAiContent: (chunk: string) => void;
  resetAiContent: () => void;
  setAiError: (err: string | null) => void;
  setSettings: (s: AppSettings) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  selectionEvent: null,
  aiStatus: "idle",
  aiContent: "",
  aiError: null,
  settings: null,

  setSelectionEvent: (e) => set({ selectionEvent: e }),
  setAiStatus: (s) => set({ aiStatus: s }),
  appendAiContent: (chunk) =>
    set((state) => ({ aiContent: state.aiContent + chunk })),
  resetAiContent: () => set({ aiContent: "", aiError: null }),
  setAiError: (err) => set({ aiError: err }),
  setSettings: (s) => set({ settings: s }),
}));
