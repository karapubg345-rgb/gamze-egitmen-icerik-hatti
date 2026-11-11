# Gamze Eğitmen — içerik üretim hattı

Gamze konuyu/tarifi verir → hat 10-60 sn'lik yüzsüz Reel çıkarır (30 sn üstü video parça parça üretilir: `topview-uretim` → "60 sn'ye kadar").

## Sabitler
- `mekan-kilidi/` — kusursuz klinik-mutfak, M0 ana referans (MEKAN-KILIDI.md).
- Eller kuralı — sunucu eli: siyah eldiven, mürdüm kol + leylak manşet, bilezik/kelepçe yok; yüz/karakter yok; sunucu elinde çıplak ten = hata.
- `beden-kilidi/` — gösterim bedeni (B1 çocuk eli, B2 yetişkin erkek ön kol, B3 yetişkin ayak, B4 yetişkin sırt; BEDEN-KILIDI.md). Tarif bedende gösterim gerektirdiğinde o planda yüzsüz, kıyafetsiz, takısız tek bölge; ilk kullanımda gerçek fotoğrafa göre bir kez üretilir, videolar arasında ortaktır.
- Ses — ElevenLabs sabit ses (seçilecek).
- Yazı stili — Remotion şablonu (kanca yazısı, logo, altyazı, "açıklamada").

## Bölüm 1 — Tarif videoları (arayüz sekmesi 1 · sıfırdan yapay zekâ; çekimi olmayan konular)
Akış (her video `video-NN-konu/` klasörü):
0. **Sesli tarif (varsa)** — Gamze Hoca tarifi Telegram'dan sesli mesajla gönderdiyse bot onu whisper ile deşifre eder → `SESLI-TARIF.md` (+ `sesli-tarif/` kayıt ve zamanlı deşifre). Senaryonun TEK kaynağı odur: malzeme, ölçü, sıra birebir; gerçek referans yalnız görünümü doğrular; sağlık dili filtresi yine uygulanır.
   **Linkten tarif:** Telegram'da linkin yanına "tarif" yazılırsa bot videoyu indirir, konuşmayı whisper ile deşifre eder, gönderi açıklamasını da ekler → aynı `SESLI-TARIF.md` (başlık "Linkten alınan tarif", `KAYNAK-LINK.txt`). Tarif oradan alınır ama anlatım kelimesi kelimesine kopyalanmaz, Gamze Hoca'nın üslubuyla yeniden yazılır; videonun görüntüsü kullanılmaz.
1. **SENARYO.md** — kanca + 20-30 sn metin + 4-6 sahne listesi + açıklama metni + uyarı satırı. İddia filtresi: "tedavi eder/geçer" yok, "geleneksel olarak" dili.
   **Gösterim bedeni:** tarif bedende gösterim gerektiriyorsa (çimdik testi, el üstü/ön kol/ayak/sırt uygulaması) yazıya bırakılmaz; `## Gösterim bedeni` tablosu: plan · beden kilidi (B1…B4) · sunucu eli bu planda VAR/YOK · ne gösteriliyor. İstekte "çocuk eli", "erkek kolu", "ayak", "sırt", "çimdik" gibi ifade varsa (arayüz konu kutusu ya da Telegram mesajı) sunucu bunu `durum.json` → `beden` olarak saklar ve senaryoya ipucu verir.
2. **gercek-referans** ajanı — tarifin gerçek fotoğrafları → `gercek-referans/` + REFERANS-KARTI.md (+ gerekiyorsa senaryo düzeltmesi).
3. **Nesne kilidi** — ana nesne(ler) (kavanoz, kâse, sülük kabı...) M0 mekânında, gerçek referansa göre BİR kez üretilir → `nesne-kilidi/P1-*.png`. Sonraki her karede Image2 olarak verilir.
   **Beden kilidi** (senaryoda gösterim bedeni varsa) — `beden-kilidi/B?-*.png` hazır ve KART.md'de GEÇTİ ise kullanılır; yoksa ilk kullanımdır: `gercek-referans` (beden kilidi kipi) → bir kez üretim (kredisiz Sınırsız 0 kredi; kredili MCP ≈ 0,2 kredi, raporda `BEDEN_KILIDI_KREDI`) → `sahne-denetci`. Gösterim bedeninin göründüğü her karede Image3 olarak verilir.
4. **Kareler** — Image Edit: Image1 = M0 (veya ilgili açı), Image2 = P1 nesne kilidi; eller kalıbı + sahne eylemi. → `kareler/`
5. **sahne-denetci** ajanı — kareleri (gösterim bedeni varsa beden kilidine göre de) denetler → DENETIM.md; DÜZELT olanlar Image Edit ile düzeltilir, tekrar denetlenir. Kullanıcıya yalnız geçen kareler gider.
6. **Video** — Seedance 2.5 Omni Reference: tüm kareler @Image1..N + zaman damgalı TEK prompt (25 sn ≈ 30 kredi) → `klipler/`. Promptta kamera hareketi + doğal hız; "slow" yalnız akışkanlarda.
7. **video-denetci** ajanı — VIDEO-DENETIM.md (KULLAN / KIRP / YENİDEN ÜRET).
8. **Ses** — ElevenLabs (`elevenlabs-ses` skill), whisper ile doğrula. **Ses her zaman video geldikten ve video-denetci bittikten SONRA yazılır/üretilir:** anlatım metni VIDEO-DENETIM'deki gerçek sahne zamanlarına ve videoda gerçekten görünen hareketlere göre kesinleştirilir (senaryodaki taslak metin değil). Kredi beklerken ses üretme.
9. **kurgu-ajani** — `kurgu-sablon/` + `araclar/` ile plan kesmeleri (dijital kamera), ortam sesi ducking, altyazı, kanca/kapanış → `araclar/teslim.sh` → `teslim/` + altyazı bandı kontrolü.

## Bölüm 2 — Referans video / Video Edit (arayüz sekmesi 2 · Gamze'nin kendi çekimi; uygulama videoları için ÖNCELİKLİ)
Örnek: `video-04-hacamat-edit/` (NOTLAR.md, prompt.js, teslim/).
1. **cekim-donusturucu** — kesitleri seç, hedef süreye (≤ 60 sn) TEK kaynak video (`kaynak/kurgu30.mp4`; 30 sn üstü parçalı dönüştürülür), kontak şeridinden her planın gerçek içeriğini yaz.
2. **prompt.js** — koru / yalnız eller + ortam değişsin / zaman damgalı plan rehberi ("bu planda pompa YOK"). Ortak prompt yok.
3. **Video Edit** (Seedance 2.5 Omni Reference → Video Edit, ~1,4 kredi/sn, onay al) — her görevden önce sayfayı yeniden yükle; `araclar/topview/parcala.py` + `video-edit-gonder.js`; sonra `inputVideos = 1`, `duration = -1` kontrolü.
4. **Karşılaştırma** — kaynak/çıktı şeritleri + yan yana video; uydurma nesne, siyah kol, görünen hasta saniyeleri → NOTLAR.md.
5. **video-denetci** → **ses** (aynı kesit sırası önceden seslendirildiyse o ses kullanılır) → **kurgu-ajani** (hasta görünen geniş planlar kırpılır/kesilir).

Bilinen sınır: Video Edit hastayı değiştirmiyor (vücudu koruyor) → hastanın kafa/yüz/kıyafet/takısı kurguda gizlenir; uygulama bölgesinin (sırt, kol, ayak) görünmesi kabul (CLAUDE.md → "Kişi tanınmaz"). Beden kilidi Bölüm 1 içindir; Video Edit'te gerçek bölge korunur.

## Ajanlar (`.claude/agents/`)
Bölüm 1 (Tarif): gercek-referans → referans-uyum → sahne-denetci → video-denetci → kurgu-ajani.
Bölüm 2 (Referans video): cekim-donusturucu → video-denetci → kurgu-ajani.
Bu klasörde açılan Claude Code oturumunda ada göre çağrılır.

## API anahtarları (`.env`)
| Anahtar | Ne için | Nereden |
|---|---|---|
| PIXABAY_API_KEY | telifsiz stok foto/video | pixabay.com/api/docs (ücretsiz) |
| SERPER_API_KEY | Google Görseller (gerçek ev tarifleri; yalnız referans) | serper.dev (2.500 ücretsiz sorgu) |
| (ElevenLabs) | seslendirme — anahtar yerine ElevenLabs MCP (OAuth) | `claude` → `/mcp` → elevenlabs → Authenticate |
Anahtar yoksa referans araması Playwright + Bing Görseller ile çalışır.
