# Ortam sesi analizi: yarım saniyelik RMS + ani ses (vuruş) anları.
#   python -I ses-analiz.py <ortam.wav> <cikti.json>
# Kurgu ajanı vuruş anlarını plan kesmesi / yakınlaştırma anı olarak kullanır;
# sessiz (−40 dB altı) bölgeler "ses yok" demektir, orada ortam sesi açılmaz.
import json, subprocess, sys

import numpy as np

src, out = sys.argv[1], sys.argv[2]
sr = 16000
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True, check=True).stdout
a = np.frombuffer(pcm, np.float32)

def db(x):
    return float(20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-9))

half = [{"t": round(i / sr, 2), "db": round(db(a[i:i + sr // 2]), 1)} for i in range(0, len(a), sr // 2)]

# Vuruş: 50 ms pencerede önceki 250 ms ortalamasından 10 dB yüksek ve −32 dB üstü.
win = sr // 20
env = [db(a[i:i + win]) for i in range(0, len(a) - win, win)]
hits = []
for k in range(5, len(env)):
    if env[k] > -32 and env[k] - np.mean(env[k - 5:k]) > 10:
        t = round(k * win / sr, 2)
        if not hits or t - hits[-1] > 0.3:
            hits.append(t)

json.dump({"sure": round(len(a) / sr, 2), "yarim_saniye": half, "vuruslar": hits}, open(out, "w"), indent=1)
print("vuruşlar:", hits)
print("yüksek bölgeler:", [h["t"] for h in half if h["db"] > -30])
