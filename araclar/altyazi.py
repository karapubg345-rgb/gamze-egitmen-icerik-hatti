# Senaryo metni + whisper kelime zamanları → timeline.json altyazıları.
#   python -I altyazi.py <metin.txt> <desifre.json> <timeline.json> <ses.mp3>
# Metin doğru yazımdır (whisper "1 limonu" der, ekranda "Bir limonu" yazar); kelime sayıları
# eşit olmalı, değilse durur — o zaman metindeki farklı kelimeyi düzelt.
# Gruplar en çok 3 kelime, noktalama yerinde biter. Son iki grup kapanış kartını ve ortam sesinin
# sönme anını belirler (Seedance kapanışta uydurma konuşma ekleyebiliyor).
import json, subprocess, sys

metin, desifre, tl_yol, ses = sys.argv[1:5]
S = open(metin, encoding="utf-8").read().split()
W = [w for seg in json.load(open(desifre, encoding="utf-8")) for w in seg["words"]]
if len(S) != len(W):
    sys.exit(f"kelime sayısı tutmuyor: metin {len(S)}, whisper {len(W)}")

caps, cur = [], []
for s, w in zip(S, W):
    cur.append((s, w["s"], w["e"]))
    if s[-1] in ".,!?" or len(cur) >= 3:
        caps.append({"t": " ".join(x[0] for x in cur).rstrip(".,!?"), "s": round(cur[0][1], 2), "e": round(cur[-1][2], 2)})
        cur = []
if cur:
    caps.append({"t": " ".join(x[0] for x in cur).rstrip(".,!?"), "s": round(cur[0][1], 2), "e": round(cur[-1][2], 2)})
for a, b in zip(caps, caps[1:]):
    if b["s"] - a["e"] < 0.6:
        a["e"] = b["s"]

sure = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", ses], capture_output=True, text=True).stdout)
tl = json.load(open(tl_yol, encoding="utf-8"))
tl["captions"] = caps
tl["dur"] = round(sure + 0.25, 2)
tl.setdefault("outro", {"t": "Tarif açıklamada"})["s"] = caps[-2]["s"]
tl.setdefault("ambient", {"src": "ortam.wav", "open": 1.0, "duck": 0.45})["fadeAt"] = caps[-2]["s"]
json.dump(tl, open(tl_yol, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for c in caps:
    print(c)
