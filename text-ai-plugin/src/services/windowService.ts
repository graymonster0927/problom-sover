import { invoke } from "@tauri-apps/api/core";

export const windowService = {
  showFloatBall: (x: number, y: number) => invoke("show_float_ball", { x, y }),
  hideFloatBall: () => invoke("hide_float_ball"),
  showResultPanel: (x: number, y: number) => invoke("show_result_panel", { x, y }),
  hideResultPanel: () => invoke("hide_result_panel"),
};
