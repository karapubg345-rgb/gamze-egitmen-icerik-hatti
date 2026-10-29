#!/usr/bin/env bash
# Render → iki geçişli loudnorm (−14 LUFS) → TESLİM DOSYASINDAN kontrol kareleri.
#   bash teslim.sh <kurgu_klasoru> <teslim_dosyasi.mp4>
# Herhangi bir adım hata verirse durur (eski render'ın teslim edilmesini önler).
set -euo pipefail
K="$1"; OUT="$2"
cd "$K"
TMP="out/render-$(date +%H%M%S).mp4"   # her seferinde yeni ad: açık oynatıcı eski dosyayı kilitlese de çakışmaz
rm -f out/*.remotion-in-progress
npx tsc --noEmit -p .
npx remotion render src/index.ts Reel "$TMP" --concurrency=4
read -r I TP LRA TH OFF < <(ffmpeg -hide_banner -i "$TMP" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -vn -f null - 2>&1 | python -c "
import sys,json; t=sys.stdin.read(); j=json.loads(t[t.rfind('{'):t.rfind('}')+1]); print(j['input_i'],j['input_tp'],j['input_lra'],j['input_thresh'],j['target_offset'])")
NEW="${OUT%.mp4}.yeni.mp4"
ffmpeg -v error -y -i "$TMP" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$I:measured_TP=$TP:measured_LRA=$LRA:measured_thresh=$TH:offset=$OFF:linear=true" -ar 48000 -c:a aac -b:a 192k "$NEW"
mv -f "$NEW" "$OUT" 2>/dev/null || { echo "UYARI: $OUT kilitli (oynatıcıda açık?), yeni dosya: $NEW"; OUT="$NEW"; }
ffmpeg -hide_banner -i "$OUT" -af ebur128 -vn -f null - 2>&1 | grep -E "^\s+I:" | tail -1
# Her altyazı grubunun ortasından alt bant: taşma / okunurluk kontrolü teslim dosyasından yapılır.
mkdir -p out/kontrol && rm -f out/kontrol/*
python -c "
import json;c=json.load(open('src/timeline.json',encoding='utf-8'))['captions']
print(' '.join(str(round((x['s']+x['e'])/2,2)) for x in c))" | tr -d '\r' | tr ' ' '\n' | while read -r t; do
  ffmpeg -v error -y -ss "$t" -i "$OUT" -frames:v 1 -vf "crop=1080:420:0:1150,scale=360:-1" "out/kontrol/c_$t.jpg"
done
python -c "
from PIL import Image; import glob
fs=sorted(glob.glob('out/kontrol/c_*.jpg'), key=lambda f: float(f.split('c_')[1][:-4]))
ims=[Image.open(f) for f in fs]; w,h=ims[0].size; cols=3; rows=(len(ims)+cols-1)//cols
s=Image.new('RGB',(w*cols,h*rows))
for i,im in enumerate(ims): s.paste(im,((i%cols)*w,(i//cols)*h))
s.save('out/kontrol/altyazi-bandi.jpg',quality=85)"
rm -f "$TMP"; rm -rf "${TEMP:-/tmp}"/remotion-* 2>/dev/null || true
echo "TESLİM: $OUT"
echo "KONTROL: $K/out/kontrol/altyazi-bandi.jpg"
