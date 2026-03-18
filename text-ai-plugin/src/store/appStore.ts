// Zustand global store
import { create } from "zustand";

export interface SelectionEvent {
  text: string;
  x: number;
  y: number;
}

export interface LlmConfig {
  id: string;
  name: string;
  provider: string;
  api_key: string;
  model: string;
  base_url: string | null;
}

export interface AppSettings {
  // Legacy fields (kept for Rust serde compat)
  provider: string;
  api_key: string;
  model: string;
  base_url: string | null;
  // Multi-LLM
  llm_configs: LlmConfig[];
  active_llm_id: string | null;
  // Global
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

/** Return active LlmConfig from settings, falling back to legacy fields */
export function getActiveLlm(settings: AppSettings): LlmConfig {
  if (settings.active_llm_id) {
    const found = settings.llm_configs.find((c) => c.id === settings.active_llm_id);
    if (found) return found;
  }
  if (settings.llm_configs.length > 0) return settings.llm_configs[0];
  // Legacy fallback
  return {
    id: "legacy",
    name: `${settings.provider} / ${settings.model}`,
    provider: settings.provider,
    api_key: settings.api_key,
    model: settings.model,
    base_url: settings.base_url,
  };
}
