import FloatBall from "../components/FloatBall";
import { useSelectionEvent } from "../hooks/useSelectionEvent";

export default function FloatBallPage() {
  // useSelectionEvent listens for selection events and calls showFloatBall automatically
  useSelectionEvent();

  return (
    <div style={{ width: "100%", height: "100%", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <FloatBall />
    </div>
  );
}
