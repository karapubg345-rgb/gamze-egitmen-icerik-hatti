# Gamze Eğitmen — yapay zekâ içerik hattı

Bu klasör Gamze Eğitmen'in (@gamze.egitmen) Instagram Reels üretim sistemidir. Her zaman **Türkçe** konuş. Akışın tamamı `SISTEM.md`'de.

## Değişmez kurallar
- **Yüz yok, karakter yok.** Kadrajda yalnız eller: siyah pamuk eldiven, bileği tamamen kapatan mürdüm kol (leylak işlemeli manşet), sol bilekte manşetin üstünde dövme bakır kelepçe. Çıplak ten = hata.
- **Tek mekân:** `mekan-kilidi/M0-ana-mekan.png` (aydınlık klinik-mutfak). Her sahne bu görsel referans verilerek üretilir.
- **Nesne kilidi:** ana nesne (kavanoz, kâse…) gerçek fotoğrafa göre bir kez üretilir, her karede referans verilir. Nesne kareden kareye değişmez.
- **Gerçeklik:** tarif/uygulama görünümü internetten gerçek fotoğraflarla doğrulanır (`gercek-referans` ajanı); yapay zekânın uydurduğu görünüm kullanılmaz.
- **Sağlık dili:** "tedavi eder / geçirir / iyileştirir" YOK → "geleneksel olarak kullanılır". Aşı, 5G vb. konular yok. Her açıklamada uyarı satırı: "Geleneksel bir tariftir, tedavi amacı taşımaz; sağlık sorununuz varsa hekiminize danışın." Bal içeren tariflerde "1 yaş altı bebeklere bal verilmez".
- **Kan:** hafif kan (kupada damlalar) şimdilik kabul (kullanıcı, 29 Eki); uzun yoğun akış ve yara yakın planı yok. Yapay zekâ üretiminde kan HAFİF yazılır.
- **Gamze'nin kendi çekimi önce gelir:** uygulama videosu (hacamat vb.) için önce Gamze'nin çekimi `cekim-donusturucu` ile Seedance Video Edit'ten geçirilir (hareket çekimden, eller ve ortam bizden). Sıfırdan yapay zekâ uygulama videosu yalnız çekim yoksa (Gamze ilk denemeyi "yanlış sonuç çok" diye beğenmedi).
- **Hasta/kişi gösterilmez:** kafa, yüz, kıyafet kadraja girmez; kurguda kırpılır ya da o saniyeler kesilir. Görünen yalnız uygulama bölgesi (sırt, kupalar) ve eller.
- **Kol asla siyah değil:** yalnız eldiven siyah; bilek/kol her zaman mürdüm. Net referans: `mekan-kilidi/ELLER-referans.jpg`.
- **Prompt planın gerçeğini anlatır:** video promptunda her plan zaman damgasıyla gerçekte ne oluyorsa onu söyler; o planda olmayan nesne adı geçmez ya da "bu planda X YOK" diye yazılır. Kesitlere ortak/genel prompt yazılmaz.
- **Sıra:** anlatım metni ve ses, video üretilip denetlendikten SONRA yazılır.
- **Kredi:** TopView görselleri Sınırsız modda (0 kredi) üretilir; kredili her işlemden (video, ücretli model) önce maliyeti söyle ve onay al.
- Kurguda emoji yok; ikon gerekirse çizgi SVG.

- **Referans varsa his referanstan gelir:** kullanıcı örnek video/fotoğraf verdiyse kadraj, mesafe, açı ve çekim hissi ondan alınır; tedavi/uygulama sahnelerinde mekânın görünmesi şart değil, önemli olan tedavi anını hissettirmek. Referans kare Image Edit'e kompozisyon referansı olarak verilir.

## İki bölüm (arayüzdeki iki sekme)
| Bölüm | Ne zaman | Ajan sırası | Örnek |
|---|---|---|---|
| **1 · Tarif videoları** | çekimi olmayan tarif/konu; sıfırdan yapay zekâ | `gercek-referans` → `referans-uyum` (referans varsa) → `sahne-denetci` → `video-denetci` → `kurgu-ajani` | `video-01-bal-zencefil/` |
| **2 · Referans video (Video Edit)** | Gamze'nin kendi çekimi var; uygulama videoları | `cekim-donusturucu` → `video-denetci` → `kurgu-ajani` | `video-04-hacamat-edit/` |

Kullanıcıya hiçbir kare/video denetimden geçmeden gösterilmez. Her video klasörünün bölümü `video-NN/.arayuz/durum.json`'da (`bolum`: `tarif` | `cekim`).

## Arayüz (Stüdyo)
`STUDYO-AC.bat` → http://127.0.0.1:4747. Aşamalar, talimatlar ve çıktı yolları `arayuz/asamalar.json`'da; her aşama `claude -p` ile tek başına çalışır (`arayuz/sunucu.mjs`).
- Arayüzden gelen istemde kullanıcıya soru SORULAMAZ: en güvenli seçeneği uygula, raporda belirt; yalnız istenen aşamayı yap.
- Kredi: kredisiz aşamada kredili işlem yok; kredili aşamada arayüzde onaylanan sınır aşılmaz.
- Çıktılar `asamalar.json`daki `ciktilar` yollarına yazılır (arayüz oradan gösterir). Yeni aşama/değişen yol olursa `asamalar.json` da güncellenir.
- Terminalden çalışırken de aynı bölüm ve aşama sırası geçerlidir.

## Skill'ler (`.claude/skills/`)
`topview-uretim` (görsel + video, arayüz tuzakları), `elevenlabs-ses` (anlatım).

## Yeni video başlatma
Tercihen arayüzden (Stüdyo → bölüm → Yeni video). Terminalden: önce bölümü belirle; `video-NN-konu/` klasörü aç → Bölüm 1: `SENARYO.md` (kanca + 20-30 sn anlatım + 8-10 kısa plan + açıklama + uyarı) → SISTEM.md Bölüm 1 adımları; Bölüm 2: çekimi `referans-videolar/`a koy → `cekim-donusturucu`.
