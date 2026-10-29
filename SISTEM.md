# Gamze Eğitmen — içerik üretim hattı

Gamze konuyu/tarifi verir → hat 20-30 sn'lik yüzsüz Reel çıkarır.

## Sabitler
- `mekan-kilidi/` — kusursuz klinik-mutfak, M0 ana referans (MEKAN-KILIDI.md).
- Eller kuralı — siyah eldiven, mürdüm kol, sol bilekte bakır kelepçe; yüz/karakter yok.
- Ses — ElevenLabs sabit ses (seçilecek).
- Yazı stili — Remotion şablonu (kanca yazısı, logo, altyazı, "açıklamada").

## Bölüm 1 — Tarif videoları (arayüz sekmesi 1 · sıfırdan yapay zekâ; çekimi olmayan konular)
Akış (her video `video-NN-konu/` klasörü):
1. **SENARYO.md** — kanca + 20-30 sn metin + 4-6 sahne listesi + açıklama metni + uyarı satırı. İddia filtresi: "tedavi eder/geçer" yok, "geleneksel olarak" dili.
2. **gercek-referans** ajanı — tarifin gerçek fotoğrafları → `gercek-referans/` + REFERANS-KARTI.md (+ gerekiyorsa senaryo düzeltmesi).
3. **Nesne kilidi** — ana nesne(ler) (kavanoz, kâse, sülük kabı...) M0 mekânında, gerçek referansa göre BİR kez üretilir → `nesne-kilidi/P1-*.png`. Sonraki her karede Image2 olarak verilir.
4. **Kareler** — Image Edit: Image1 = M0 (veya ilgili açı), Image2 = P1 nesne kilidi; eller kalıbı + sahne eylemi. → `kareler/`
5. **sahne-denetci** ajanı — kareleri denetler → DENETIM.md; DÜZELT olanlar Image Edit ile düzeltilir, tekrar denetlenir. Kullanıcıya yalnız geçen kareler gider.
6. **Video** — Seedance 2.5 Omni Reference: tüm kareler @Image1..N + zaman damgalı TEK prompt (25 sn ≈ 30 kredi) → `klipler/`. Promptta kamera hareketi + doğal hız; "slow" yalnız akışkanlarda.
7. **video-denetci** ajanı — VIDEO-DENETIM.md (KULLAN / KIRP / YENİDEN ÜRET).
8. **Ses** — ElevenLabs (`elevenlabs-ses` skill), whisper ile doğrula. **Ses her zaman video geldikten ve video-denetci bittikten SONRA yazılır/üretilir:** anlatım metni VIDEO-DENETIM'deki gerçek sahne zamanlarına ve videoda gerçekten görünen hareketlere göre kesinleştirilir (senaryodaki taslak metin değil). Kredi beklerken ses üretme.
9. **kurgu-ajani** — `kurgu-sablon/` + `araclar/` ile plan kesmeleri (dijital kamera), ortam sesi ducking, altyazı, kanca/kapanış → `araclar/teslim.sh` → `teslim/` + altyazı bandı kontrolü.

## Bölüm 2 — Referans video / Video Edit (arayüz sekmesi 2 · Gamze'nin kendi çekimi; uygulama videoları için ÖNCELİKLİ)
Örnek: `video-04-hacamat-edit/` (NOTLAR.md, prompt.js, teslim/).
1. **cekim-donusturucu** — kesitleri seç, ≤ 30 sn TEK kaynak video (`kaynak/kurgu30.mp4`), kontak şeridinden her planın gerçek içeriğini yaz.
2. **prompt.js** — koru / yalnız eller + ortam değişsin / zaman damgalı plan rehberi ("bu planda pompa YOK"). Ortak prompt yok.
3. **Video Edit** (Seedance 2.5 Omni Reference → Video Edit, ~1,4 kredi/sn, onay al) — her görevden önce sayfayı yeniden yükle; `araclar/topview/parcala.py` + `video-edit-gonder.js`; sonra `inputVideos = 1`, `duration = -1` kontrolü.
4. **Karşılaştırma** — kaynak/çıktı şeritleri + yan yana video; uydurma nesne, siyah kol, görünen hasta saniyeleri → NOTLAR.md.
5. **video-denetci** → **ses** (aynı kesit sırası önceden seslendirildiyse o ses kullanılır) → **kurgu-ajani** (hasta görünen geniş planlar kırpılır/kesilir).

Bilinen sınır: Video Edit hastayı değiştirmiyor (vücudu koruyor) → hasta kurguda gizlenir.

## Ajanlar (`.claude/agents/`)
Bölüm 1 (Tarif): gercek-referans → referans-uyum → sahne-denetci → video-denetci → kurgu-ajani.
Bölüm 2 (Referans video): cekim-donusturucu → video-denetci → kurgu-ajani.
Bu klasörde açılan Claude Code oturumunda ada göre çağrılır.

## API anahtarları (`.env`)
| Anahtar | Ne için | Nereden |
|---|---|---|
| PEXELS_API_KEY | telifsiz gerçek stok foto/video | pexels.com/api (ücretsiz) |
| PIXABAY_API_KEY | telifsiz stok foto/video | pixabay.com/api/docs (ücretsiz) |
| SERPER_API_KEY | Google Görseller (gerçek ev tarifleri; yalnız referans) | serper.dev (2.500 ücretsiz sorgu) |
| ELEVENLABS_API_KEY | seslendirmeyi otomatik üretmek | elevenlabs.io → Profile → API Keys |
Anahtar yoksa referans araması Playwright + Bing Görseller ile çalışır.
