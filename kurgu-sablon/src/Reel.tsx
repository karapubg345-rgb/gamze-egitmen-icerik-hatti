import React from "react";
import { AbsoluteFill, Audio, Easing, OffthreadVideo, interpolate, staticFile, useCurrentFrame } from "remotion";
import { FPS, fontFamily, pop, ramp, up } from "./theme";
import TL from "./timeline.json";

// Gamze Eğitmen marka renkleri: mürdüm + leylak (mekândaki tekstillerle aynı aile).
const B = { plum: "#6B3A5E", lilac: "#D9C2E6", cream: "#FFF8EE", hi: "#F3C969" };

type Cap = { t: string; s: number; e: number };
type Shot = { s: number; e: number; z: number; fx: number; fy: number; push?: number };
const caps = TL.captions as Cap[];
const shots = TL.shots as Shot[];
const sceneStarts = TL.sceneStarts as number[];
const keywords = (TL.keywords as string[]).map((k) => up(k));

const ease = Easing.bezier(0.16, 1, 0.3, 1);

/** Kaynak zaman çizgisi bozulmadan (ortam sesi senkron kalsın) her plana dijital kamera: yakınlık + yavaş itme. */
const camera = (t: number) => {
  const sh = shots.find((x) => t >= x.s && t < x.e) ?? shots[shots.length - 1];
  const p = Math.min(1, Math.max(0, (t - sh.s) / (sh.e - sh.s)));
  let z = sh.z * (1 + (sh.push ?? 0.05) * p);
  // Sahne başında kısa vuruş: hafif büyükten oturur.
  const sc = [...sceneStarts].reverse().find((x) => t >= x);
  if (sc !== undefined && sc > 0 && t - sc < 0.3) {
    z *= 1 + 0.1 * (1 - interpolate(t - sc, [0, 0.3], [0, 1], { easing: ease }));
  }
  return { z, fx: sh.fx, fy: sh.fy };
};

const Flash: React.FC<{ t: number }> = ({ t }) => {
  const sc = sceneStarts.find((x) => x > 0 && t >= x && t - x < 0.12);
  if (sc === undefined) return null;
  return <AbsoluteFill style={{ background: "#FFF", opacity: 0.22 * (1 - (t - sc) / 0.12) }} />;
};

const Hook: React.FC<{ t: number }> = ({ t }) => {
  const { s, e } = TL.hook;
  if (t > e + 0.3) return null;
  const out = 1 - ramp(t, e, 0.3);
  // "|" varsa satır oradan bölünür; yoksa ilk iki kelime üst satır.
  const raw = up(TL.hook.t);
  const words = raw.split(" ");
  const lines = raw.includes("|") ? raw.split("|").map((s) => s.trim()) : [words.slice(0, 2).join(" "), words.slice(2).join(" ")];
  return (
    <div style={{ position: "absolute", top: 250, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: out }}>
      {lines.map((l, i) => {
        const k = pop(t, s + 0.1 + i * 0.18);
        return (
          <div
            key={i}
            style={{
              transform: `scale(${k}) rotate(${i === 0 ? -2 : 1.5}deg)`,
              background: i === 0 ? B.plum : B.cream,
              color: i === 0 ? B.cream : B.plum,
              fontFamily,
              fontWeight: 800,
              fontSize: 80,
              letterSpacing: 1,
              padding: "10px 34px",
              borderRadius: 22,
              boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
              opacity: k > 0 ? 1 : 0,
            }}
          >
            {l}
          </div>
        );
      })}
    </div>
  );
};

const Caption: React.FC<{ t: number }> = ({ t }) => {
  const c = caps.find((x) => t >= x.s && t < x.e);
  if (!c) return null;
  const k = pop(t, c.s);
  return (
    <div style={{ position: "absolute", top: 1330, width: "100%", padding: "0 70px", boxSizing: "border-box" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          columnGap: 18,
          transform: `scale(${0.85 + 0.15 * k})`,
          opacity: Math.min(1, k * 1.5),
        }}
      >
        {up(c.t)
          .split(" ")
          .map((w, i) => {
            const hot = keywords.some((kw) => w.startsWith(kw));
            return (
              <span
                key={i}
                style={{
                  fontFamily,
                  fontWeight: 800,
                  fontSize: hot ? 74 : 66,
                  lineHeight: 1.15,
                  color: hot ? B.hi : "#FFFFFF",
                  WebkitTextStroke: "10px rgba(40,20,35,0.85)",
                  paintOrder: "stroke fill",
                  textShadow: "0 4px 18px rgba(0,0,0,0.35)",
                }}
              >
                {w}
              </span>
            );
          })}
      </div>
    </div>
  );
};

const Arrow: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={B.plum} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4v15" />
    <path d="M6 13l6 6 6-6" />
  </svg>
);

const Outro: React.FC<{ t: number }> = ({ t }) => {
  if (t < TL.outro.s) return null;
  const k = pop(t, TL.outro.s);
  const bob = Math.sin((t - TL.outro.s) * 6) * 6;
  return (
    <div style={{ position: "absolute", top: 1170, width: "100%", display: "flex", justifyContent: "center" }}>
      <div
        style={{
          transform: `scale(${k}) translateY(${bob}px)`,
          display: "flex",
          alignItems: "center",
          gap: 14,
          background: B.cream,
          color: B.plum,
          fontFamily,
          fontWeight: 800,
          fontSize: 54,
          padding: "12px 34px",
          borderRadius: 999,
          border: `4px solid ${B.lilac}`,
          boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
        }}
      >
        {up(TL.outro.t)}
        <Arrow />
      </div>
    </div>
  );
};

/** Anlatım konuşurken ortam sesi kısılır, aralarda öne çıkar; uydurma konuşma riskine karşı kapanışta söner. */
const ambientVolume = (f: number) => {
  const t = f / FPS;
  const talking = caps.some((c) => t >= c.s - 0.05 && t < c.e + 0.05);
  const base = talking ? TL.ambient.duck : TL.ambient.open;
  const fade = interpolate(t, [TL.ambient.fadeAt, TL.ambient.fadeAt + 0.4], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return base * fade;
};

export const Reel: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const { z, fx, fy } = camera(t);
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${z})`, transformOrigin: `${fx}px ${fy}px` }}>
        <OffthreadVideo src={staticFile(TL.video)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <Flash t={t} />
      <Audio src={staticFile(TL.audio)} />
      <Audio src={staticFile(TL.ambient.src)} volume={ambientVolume} />
      <div
        style={{
          position: "absolute",
          top: 90,
          right: 60,
          fontFamily,
          fontWeight: 700,
          fontSize: 34,
          color: "rgba(255,255,255,0.9)",
          textShadow: "0 2px 10px rgba(0,0,0,0.5)",
        }}
      >
        {TL.handle}
      </div>
      <Hook t={t} />
      <Caption t={t} />
      <Outro t={t} />
    </AbsoluteFill>
  );
};
