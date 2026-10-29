# Gamze Eğitmen — içerik üretim hattı

Gamze konuyu/tarifi verir → hat 20-30 sn'lik yüzsüz Reel çıkarır.

## Sabitler
- `mekan-kilidi/` — kusursuz klinik-mutfak, M0 ana referans (MEKAN-KILIDI.md).
- Eller kuralı — siyah eldiven, mürdüm kol, sol bilekte bakır kelepçe; yüz/karakter yok.
- Ses — ElevenLabs sabit ses (seçilecek).
- Yazı stili — Remotion şablonu (kanca yazısı, logo, altyazı, "açıklamada").

## Akış (her video `video-NN-konu/` klasörü)
1. **SENARYO.md** — kanca + 20-30 sn metin + 4-6 sahne listesi + açıklama metni + uyarı satırı. İddia filtresi: "tedavi eder/geçer" yok, "geleneksel olarak" dili.
2. **gercek-referans** ajanı — tarifin gerçek fotoğrafları → `gercek-referans/` + REFERANS-KARTI.md (+ gerekiyorsa senaryo düzeltmesi).
3. **Nesne kilidi** — ana nesne(ler) (kavanoz, kâse, sülük kabı...) M0 mekânında, gerçek referansa göre BİR kez üretilir → `nesne-kilidi/P1-*.png`. Sonraki her karede Image2 olarak verilir.
4. **Kareler** — Image Edit: Image1 = M0 (veya ilgili açı), Image2 = P1 nesne kilidi; eller kalıbı + sahne eylemi. → `kareler/`
5. **sahne-denetci** ajanı — kareleri denetler → DENETIM.md; DÜZELT olanlar Image Edit ile düzeltilir, tekrar denetlenir. Kullanıcıya yalnız geçen kareler gider.
6. **Video** — Seedance 2.5 Omni Reference: tüm kareler @Image1..N + zaman damgalı TEK prompt (25 sn ≈ 30 kredi) → `klipler/`. Promptta kamera hareketi + doğal hız; "slow" yalnız akışkanlarda.
7. **video-denetci** ajanı — VIDEO-DENETIM.md (KULLAN / KIRP / YENİDEN ÜRET).
8. **Ses** — ElevenLabs (`elevenlabs-diyalog` skill), whisper ile doğrula.
9. **kurgu-ajani** — `kurgu-sablon/` + `araclar/` ile plan kesmeleri (dijital kamera), ortam sesi ducking, altyazı, kanca/kapanış → `araclar/teslim.sh` → `teslim/` + altyazı bandı kontrolü.

## Ajanlar (`.claude/agents/`)
gercek-referans → sahne-denetci → video-denetci → kurgu-ajani. Bu klasörde açılan Claude Code oturumunda ada göre çağrılır.

## API anahtarları (`.env`)
| Anahtar | Ne için | Nereden |
|---|---|---|
| PEXELS_API_KEY | telifsiz gerçek stok foto/video | pexels.com/api (ücretsiz) |
| PIXABAY_API_KEY | telifsiz stok foto/video | pixabay.com/api/docs (ücretsiz) |
| SERPER_API_KEY | Google Görseller (gerçek ev tarifleri; yalnız referans) | serper.dev (2.500 ücretsiz sorgu) |
| ELEVENLABS_API_KEY | seslendirmeyi otomatik üretmek | elevenlabs.io → Profile → API Keys |
Anahtar yoksa referans araması Playwright + Bing Görseller ile çalışır.
