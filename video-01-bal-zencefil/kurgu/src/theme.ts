import { loadFont } from "@remotion/google-fonts/Poppins";
import { Easing, interpolate } from "remotion";

export const { fontFamily } = loadFont("normal", {
  weights: ["500", "600", "700", "800"],
  subsets: ["latin", "latin-ext"],
});

export const FPS = 30;
export const W = 1080;
export const H = 1920;
/** Bölünmüş düzende üst panelin yüksekliği (referans: ~%57). */
export const TOP_H = 1090;

// Kurgu kitiyle aynı doğal / aydınlık palet (kurgu-kiti/sablon/src/theme.ts).
export const C = {
  bg: "#F6F3EC",
  bg2: "#ECE5D6",
  card: "#FFFFFF",
  line: "rgba(30,30,30,0.12)",
  soft: "rgba(30,30,30,0.05)",
  shadow: "rgba(60,48,28,0.18)",
  ink: "#1E1E1E",
  onAccent: "#FFFFFF",
  olive: "#4E7A3A",
  beige: "#B8A78A",
  orange: "#C8702F",
  teal: "#2F7F7A",
  yellow: "#C99A1A",
  red: "#E0452E",
  muted: "#6E6656",
  /** Video üstündeki altyazıda rakam vurgusu (koyu zeminde okunur). */
  capHi: "#FFD24A",
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);

export const ramp = (t: number, a: number, dur = 0.35) =>
  interpolate(t, [a, a + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

export const pop = (t: number, at: number) => {
  if (t < at) return 0;
  return interpolate(t - at, [0, 0.18, 0.3], [0, 1.12, 1], { extrapolateRight: "clamp" });
};

/** Türkçe büyük harf (ev kuralı: CSS uppercase İ'yi bozar). */
export const up = (s: string) => s.toLocaleUpperCase("tr-TR");
