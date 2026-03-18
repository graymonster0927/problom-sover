import FloatBall from "../components/FloatBall";
import { useSelectionEvent } from "../hooks/useSelectionEvent";

export default function FloatBallPage() {
  // useSelectionEvent listens for selection events and calls showFloatBall automatically
  useSelectionEvent();

  return (
      <FloatBall />
  );
}
