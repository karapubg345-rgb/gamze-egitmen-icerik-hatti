# Referans kare ile üretilen kareyi aynı yükseklikte yan yana koyar (referans-uyum ajanı için).
#   python -I yan-yana.py <referans.jpg> <uretilen.png> [<uretilen2.png> ...] <cikti.jpg>
import sys

from PIL import Image, ImageDraw

*girdiler, cikti = sys.argv[1:]
H = 720
ims = []
for i, p in enumerate(girdiler):
    im = Image.open(p).convert("RGB")
    im = im.resize((int(im.width * H / im.height), H))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 150, 26], fill=(0, 0, 0))
    d.text((6, 6), "REFERANS" if i == 0 else f"URETILEN {i}", fill=(255, 255, 0))
    ims.append(im)
out = Image.new("RGB", (sum(im.width for im in ims) + 8 * (len(ims) - 1), H), (255, 255, 255))
x = 0
for im in ims:
    out.paste(im, (x, 0))
    x += im.width + 8
out.save(cikti, quality=88)
print(cikti)
