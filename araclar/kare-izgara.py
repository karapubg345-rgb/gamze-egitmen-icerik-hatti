# Verilen saniyelerden 1080×1920 çıktı koordinatında ızgaralı kare çıkarır (her 120 px çizgi + etiket).
#   python -I kare-izgara.py <video.mp4> <cikti_klasoru> 2 6.5 11.5 ...
# Kurgu ajanı odak noktasını (bıçak ucu, bal ipliği, kaşık) bu karelerden fx/fy olarak okur.
import subprocess, sys
from pathlib import Path

from PIL import Image, ImageDraw

video, outdir, *ts = sys.argv[1:]
Path(outdir).mkdir(parents=True, exist_ok=True)
for t in ts:
    raw = Path(outdir) / f"ham_{t}.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", t, "-i", video, "-frames:v", "1", "-vf", "scale=1080:1920", str(raw)], check=True)
    im = Image.open(raw).convert("RGB")
    d = ImageDraw.Draw(im)
    for x in range(0, 1080, 120):
        d.line([(x, 0), (x, 1920)], fill=(255, 255, 0), width=2)
        d.text((x + 4, 4), str(x), fill=(255, 255, 0))
    for y in range(0, 1920, 120):
        d.line([(0, y), (1080, y)], fill=(0, 255, 255), width=2)
        d.text((4, y + 4), str(y), fill=(0, 255, 255))
    im.resize((540, 960)).save(Path(outdir) / f"izgara_{t}.jpg", quality=85)
    raw.unlink()
    print(Path(outdir) / f"izgara_{t}.jpg")
