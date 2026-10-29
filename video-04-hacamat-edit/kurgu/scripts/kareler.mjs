import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const times = process.argv.slice(2).map(Number);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const comp = await selectComposition({ serveUrl, id: "Reel" });
for (const t of times) {
  const frame = Math.min(comp.durationInFrames - 1, Math.round(t * 30));
  const out = path.resolve(`out/kare/t${String(t).replace(".", "_")}.jpg`);
  await renderStill({ composition: comp, serveUrl, output: out, frame, imageFormat: "jpeg", jpegQuality: 80 });
  console.log("kare", t, "→", out);
}
