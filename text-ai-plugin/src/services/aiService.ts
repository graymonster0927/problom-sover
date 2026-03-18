import { invoke } from "@tauri-apps/api/core";

export const aiService = {
  solveWithAi: (text: string) =>
    invoke("solve_with_ai", { text }),

  stopAi: () =>
    invoke("stop_ai"),
};
