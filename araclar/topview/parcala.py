"""Yerel dosyayı TopView'e yüklemek için base64 parça betiklerine böler.

    python -I parcala.py <dosya> <cikis_klasoru> <degisken> [--tek]

<degisken>: v (kaynak video), i (eller), m (mekân), p (hasta). Her betik
window.__b64_<degisken>'e ekler; --tek ise tek parçada değişkeni baştan atar.
Parçalar ~315 KB: 100 KB altı araç çıktısında yankılanır, 2 MB tek parça
"Unexpected number" hatası verir. Betikleri sırayla
browser_run_code_unsafe filename=<betik> ile çalıştır, sonra
window.__b64_<degisken>.length'i burada yazan uzunlukla karşılaştır.
"""
import base64
import math
import os
import sys

dosya, cikis, ad = sys.argv[1], sys.argv[2], sys.argv[3]
tek = '--tek' in sys.argv
os.makedirs(cikis, exist_ok=True)
b = base64.b64encode(open(dosya, 'rb').read()).decode()
n = 1 if tek else max(1, math.ceil(len(b) / 340000))
sz = math.ceil(len(b) / n)
kok = os.path.splitext(os.path.basename(dosya))[0]
for k in range(n):
    govde = f"window.__b64_{ad}=p;" if tek else f"window.__b64_{ad}=(window.__b64_{ad}||'')+p;"
    yol = os.path.join(cikis, f"{ad}_{kok}_{k:02d}.js")
    with open(yol, 'w') as f:
        f.write(f"async (page) => {{ await page.evaluate((p)=>{{ {govde} }}, '{b[k*sz:(k+1)*sz]}'); return 'ok'; }}")
print(f"uzunluk={len(b)} parca={n}")
