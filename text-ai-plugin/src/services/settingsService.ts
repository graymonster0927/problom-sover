import { invoke } from "@tauri-apps/api/core";
import { AppSettings } from "../store/appStore";

export interface HistoryRecord {
  id: string;
  timestamp: string;
  input_text: string;
  ai_result: string;
  provider: string;
}

export const settingsService = {
  getSettings: (): Promise<AppSettings> =>
    invoke("get_settings"),

  saveSettings: (settings: AppSettings): Promise<void> =>
    invoke("save_settings", { settings }),

  listHistory: (page: number, perPage: number): Promise<HistoryRecord[]> =>
    invoke("list_history", { page, per_page: perPage }),

  clearHistory: (): Promise<void> =>
    invoke("clear_history"),
};
