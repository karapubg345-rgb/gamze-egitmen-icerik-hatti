import { Composition } from "remotion";
import { Reel } from "./Reel";
import { FPS, H, W } from "./theme";
import TL from "./timeline.json";

export const RemotionRoot: React.FC = () => (
  <Composition id="Reel" component={Reel} durationInFrames={Math.round(TL.dur * FPS)} fps={FPS} width={W} height={H} />
);
