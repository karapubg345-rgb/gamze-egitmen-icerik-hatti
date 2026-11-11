# Gamze Eğitmen — yapay zekâ içerik hattı

Bu klasör Gamze Eğitmen'in (@gamze.egitmen) Instagram Reels üretim sistemidir. Her zaman **Türkçe** konuş. Akışın tamamı `SISTEM.md`'de.

## Değişmez kurallar
- **Yüz yok.** Sunucu (Gamze'nin) elleri, 11 Kas 2026'dan itibaren her bölümde: dar, mat **siyah** uzun kol; bileği tamamen örter, elin sırtına uzanır, başparmak deliğinden çıkar; **yalnız parmaklar açıkta**, tırnaklar kısa, temiz, bakımlı, şeffaf-doğal (nude). Yüzük/bilezik/saat/takı YOK. El kilidi (üretimde verilir): `mekan-kilidi/ELLER-kilidi.png`; kaynak fotoğraf `mekan-kilidi/ELLER-referans.jpg`; İngilizce kalıp `mekan-kilidi/MEKAN-KILIDI.md` → "Eller". **Sunucu elinde parmak dışında çıplak ten (bilek, el sırtı, ön kol) = hata; kötü görünen tırnak (kırık, kirli, uzun, renkli oje) = hata.** Kan teması olan planda (hacamat, sülük, kanlı kupa) hijyen gereği parmaklar ince siyah nitril eldivenli. Eski siyah eldiven + mürdüm kol artık kullanılmaz (Gamze Hoca'nın isteği; eski videolar yalnız denemeydi).
- **Eğitmen kadrajı** (Bölüm 0 · Eğitmen anlatımı): Gamze Hoca ofisinde (`mekan-kilidi/E0-ofis.png`) masada; kadraj göğüs ortasından masaya, düz siyah elbise. Baş, yüz, boyun, saç kadraja girmez.
- **İstisna — gösterim bedeni** (8 Kas 2026; yalnız bundan sonraki üretimlerde): tarif bedende bir gösterim gerektiriyorsa (deri çimdik testi, el üstü / ön kol / ayak / sırt uygulaması) o planda sunucu elinden AYRI bir beden bölgesi gösterilebilir. Bölge `beden-kilidi/`deki kilitlerden biridir (B1 çocuk eli, B2 yetişkin erkek ön kol, B3 yetişkin ayak, B4 yetişkin sırt; `beden-kilidi/BEDEN-KILIDI.md`) ve nesne kilidi gibi her karede referans verilir, kareden kareye aynı kalır. Yalnız o bölge görünür: yüz, kafa, kıyafet, takı, dövme, ben/iz gibi kimliği belli eden işaret yok. Çocuk bedeni yalnız el ya da ayak olabilir. Ten hafif ve doğal; yara, kan, hastalık görüntüsü yok (kan kuralı ayrıca geçerli). Sunucu eli aynı karedeyse siyah başparmak delikli kol kuralı ona aynen uygulanır (gösterim bedeninde kol/kıyafet yok; ikisi böyle ayrılır). SENARYO.md'de gösterim bedeni olmayan videolarda (video-01…05 dâhil) eski kural değişmeden geçerlidir.
- **Mekân kilidi:** tarif/uygulama `mekan-kilidi/M0-ana-mekan.png` (aydınlık klinik-mutfak); eğitmen anlatımı `mekan-kilidi/E0-ofis.png` (Hoca'nın ofisi; ilk eğitmen videosunda bir kez üretilir). Her sahne ilgili görsel referans verilerek üretilir.
- **Nesne kilidi:** ana nesne (kavanoz, kâse…) gerçek fotoğrafa göre bir kez üretilir, her karede referans verilir. Nesne kareden kareye değişmez.
- **Gerçeklik:** tarif/uygulama görünümü internetten gerçek fotoğraflarla doğrulanır (`gercek-referans` ajanı); yapay zekânın uydurduğu görünüm kullanılmaz.
- **Sağlık dili:** "tedavi eder / geçirir / iyileştirir" YOK → "geleneksel olarak kullanılır". Aşı, 5G vb. konular yok. Her açıklamada uyarı satırı: "Geleneksel bir tariftir, tedavi amacı taşımaz; sağlık sorununuz varsa hekiminize danışın." Bal içeren tariflerde "1 yaş altı bebeklere bal verilmez".
- **Kan:** hafif kan (kupada damlalar) şimdilik kabul (kullanıcı, 29 Eki); uzun yoğun akış ve yara yakın planı yok. Yapay zekâ üretiminde kan HAFİF yazılır.
- **Gamze'nin kendi çekimi önce gelir:** uygulama videosu (hacamat vb.) için önce Gamze'nin çekimi `cekim-donusturucu` ile Seedance Video Edit'ten geçirilir (hareket çekimden, eller ve ortam bizden). Sıfırdan yapay zekâ uygulama videosu yalnız çekim yoksa (Gamze ilk denemeyi "yanlış sonuç çok" diye beğenmedi).
- **Kişi tanınmaz:** hastanın/gösterim bedeninin kafası, yüzü, kıyafeti, takısı kadraja girmez; çekimde girerse kurguda kırpılır ya da o saniyeler kesilir. Görünen yalnız uygulama/gösterim bölgesi (sırt, ön kol, el üstü, ayak; kupalar) ve sunucu elleri. Yapay zekâ üretiminde bu bölge bir beden kilidinden gelir (yukarıdaki istisna); Gamze'nin çekiminde gerçek hastanın bölgesi Video Edit'te korunur, yalnız kimliği belli eden kısımlar gizlenir.
- **Prompt planın gerçeğini anlatır:** video promptunda her plan zaman damgasıyla gerçekte ne oluyorsa onu söyler; o planda olmayan nesne adı geçmez ya da "bu planda X YOK" diye yazılır. Kesitlere ortak/genel prompt yazılmaz.
- **Sıra:** tarif ve çekim bölümlerinde anlatım metni ve ses, video üretilip denetlendikten SONRA yazılır. **Eğitmen anlatımında tersi:** önce ses (Hoca'nın tarzında metin → ElevenLabs), sonra sesin kelime zamanlarından jest çizelgesi, video bu çizelgeye (ve TopView alıyorsa sese) göre üretilir; eller konuşmaya uyar.
- **Ses:** iki modda da ElevenLabs MCP (`.mcp.json` → `elevenlabs`, OAuth); bağlı değilse kredisiz modda web arayüzü. Ses klonu yok: `.env` → `ELEVENLABS_VOICE_ID`'deki seçili ses kullanılır; Hoca'ya benzerlik metnin üslubundan ve duygu etiketlerinden gelir (`uslup/GAMZE-USLUP.md`).
- **Üslup:** anlatım metinleri (her bölümde) `uslup/GAMZE-USLUP.md`'deki Gamze Hoca kalıplarıyla yazılır; sağlık dili kuralı üsluptan önce gelir.
- **Süre:** 10-60 sn. Seedance tek görevde ≤ 30 sn; üstü plan kesmesinde dikişli parçalarla üretilir (`topview-uretim` → "60 sn'ye kadar").
- **Kredi / üretim modu** (`durum.json` → `mod`):
  - **kredisiz** (varsayılan): TopView tarayıcıdan, görsel ve video **Sınırsız** modda (0 kredi). Kredi Modu'na kaymışsa ya da Sınırsız yoksa GÖNDERME. TopView MCP üretim araçları bu modda kapalı.
  - **kredili**: tarayıcı açılmaz; TopView MCP + ElevenLabs MCP (`topview-uretim` → "Kredili mod (MCP)"). Video oluşturulurken verilen **bütçe tek onaydır**; aşılacaksa gönderme, dur.
  - Terminalden çalışırken (arayüz/bot dışında) kredili her işlemden önce maliyeti söyle ve onay al.
- Kurguda emoji yok; ikon gerekirse çizgi SVG.

- **Referans varsa his referanstan gelir:** kullanıcı örnek video/fotoğraf verdiyse kadraj, mesafe, açı ve çekim hissi ondan alınır; tedavi/uygulama sahnelerinde mekânın görünmesi şart değil, önemli olan tedavi anını hissettirmek. Referans kare Image Edit'e kompozisyon referansı olarak verilir.

## Üç bölüm (arayüzdeki üç sekme)
| Bölüm | Ne zaman | Ajan sırası | Örnek |
|---|---|---|---|
| **0 · Eğitmen anlatımı** (öncelikli) | Hoca bir bitkinin/konunun faydasını anlatır; ofiste, elinde konu nesnesi, elleri konuşmaya uyar | `gercek-referans` → ses + jest çizelgesi → `sahne-denetci` → `video-denetci` (jest uyumu) → `kurgu-ajani` | (ilk: reyhan) |
| **1 · Tarif videoları** | çekimi olmayan tarif/konu; sıfırdan yapay zekâ | `gercek-referans` → `referans-uyum` (referans varsa) → `sahne-denetci` → `video-denetci` → `kurgu-ajani` | `video-01-bal-zencefil/` |
| **2 · Referans video (Video Edit)** | Gamze'nin kendi çekimi var; uygulama videoları | `cekim-donusturucu` → `video-denetci` → `kurgu-ajani` | `video-04-hacamat-edit/` |

Kullanıcıya hiçbir kare/video denetimden geçmeden gösterilmez. Her video klasörünün bölümü `video-NN/.arayuz/durum.json`'da (`bolum`: `egitim` | `tarif` | `cekim`).

## Arayüz (Stüdyo)
`STUDYO-AC.bat` → http://127.0.0.1:4747. Aşamalar, talimatlar ve çıktı yolları `arayuz/asamalar.json`'da; her aşama `claude -p` ile tek başına çalışır (`arayuz/sunucu.mjs`).
- Arayüzden gelen istemde kullanıcıya soru SORULAMAZ: en güvenli seçeneği uygula, raporda belirt; yalnız istenen aşamayı yap.
- Kredi: kredisiz aşamada kredili işlem yok; kredili aşamada arayüzde onaylanan sınır aşılmaz.
- Çıktılar `asamalar.json`daki `ciktilar` yollarına yazılır (arayüz oradan gösterir). Yeni aşama/değişen yol olursa `asamalar.json` da güncellenir.
- Terminalden çalışırken de aynı bölüm ve aşama sırası geçerlidir.
- **Kaldığı yerden sürdürme:** Stüdyo kapanınca çalışan aşama `yarida` olur (hata değil, arayüzde sarı); açılışta otomatik işler sırayla kuyruğa girer, onay bekleyenler beklemeye devam eder, Telegram'a "sürüyor" bilgisi gider. Sürdürme 1 deneme sayılır (zaten yeniden denenmiş aşama sürdürülmez, "Tekrar dene" bekler). Her aşama önce `asamalar.json` → `surdurme` kuralıyla hazır çıktıya bakar, denetimden geçmişi yeniden üretmez; TopView'a gönderilen her görev `.arayuz/topview-dosyalar.json` → `gorevler`'e yazılır, sürdürmede yeni görev açılmaz, o sorgulanır. Kredili sürdürmede kesilen çalışmanın harcaması `.arayuz/kredi-<aşama>.json` başlangıç bakiyesiyle hesaba katılır, bütçe aşılmaz.
- **Otomatik akış** (`durum.json` → `onaylar`):
  - **yok** (tam otomatik, varsayılan): Claude karar verir. **Uyum payı (kredi koruması):** her aşama `UYUM: <0-100>` ve `EKSIK:` satırları yazar; uyum `ESIK_UYUM`'un (varsayılan %70) üstündeyse düzeltme YAPILMAZ, eksikler teslim mesajında listelenir ve "Eksikleri düzelt" önerilir. Payın altındaki sorun ve hata YALNIZ 1 kez yeniden denenir; kredili üretim aşama içinde kendiliğinden yeniden gönderilmez. Kullanıcıya yalnız bitmiş video gider; "Düzelt" notu son aşamadan başlar, aşama işin daha geride yapılması gerektiğine karar verirse `GERI: <aşama-id>` yazar ve hat oradan yeniden yürür (en fazla 2 kez).
  - **iki** (onaylı): `onay` tanımlı aşamada (kareler / kesitler / teslim), hata ya da sorunda durup sorar.
  - Her aşama raporu `EKSIK: …`, `UYUM: <0-100>`, `SONUC: TAMAM|SORUN`, gerekirse `GERI: <id>` ve `HARCANAN_KREDI: <sayı>` satırlarıyla biter (sunucu bunları okur).
- **Telegram** (`arayuz/telegram.mjs`, sunucuyla aynı süreçte): `/egitim <konu>` (eğitmen anlatımı), `/yeni` (tarif), sesli mesaj → whisper → varsayılan **eğitmen anlatımı** (`SESLI-ANLATIM.md`); açıklamasında "tarif" yazıyorsa tarif videosu (`SESLI-TARIF.md`), çekim videosu gönderme, video linki (Instagram/TikTok/YouTube → yt-dlp, olmazsa Apify → Video Edit hattı; yazı/logo promptla silinir, uyarı yok; linkin yanında "tarif" varsa görüntü kullanılmaz: konuşma whisper'la + gönderi açıklaması → `SESLI-TARIF.md` → tarif videosu; "eğitim/anlatım" varsa aynı yolla → `SESLI-ANLATIM.md` → eğitmen anlatımı), onay düğmeleri, `/guncelle`. **Ayar kartı:** her yeni iş önce düğmeli kartla gelir (kredisiz/kredili, süre, metin varsa "Metni düzelt" → metin dosyasının sonuna "Gamze Hoca'nın düzelttiği metin/düzeltmesi" bölümü, "Başlat", "İptal"); 3 dk dokunulmazsa kendiliğinden başlar (`sunucu.mjs` → `ayarDegistir`). **Takılma bekçisi:** kredisizde kredili olabilen aşama `TAKILMA_DK`'dan (90) uzun sürerse ya da günlük `TAKILMA_SESSIZ_DK` (30) dakika yazılmazsa Telegram "Kredili devam?" sorar; onayda aşama kredili yeniden başlar, hazır çıktılar korunur, bütçe = harcanan + kalan tahmini (`krediliyeGec`). Kredisiz hata kapısında da "Kredili devam et" düğmesi var. Mesajda (ya da arayüz konu kutusunda) "çocuk eli", "erkek kolu", "ön kol", "ayak", "sırt", "çimdik" gibi ifade varsa `durum.json` → `beden` olur ve senaryoya gösterim bedeni ipucu olarak geçer (`sunucu.mjs` → `bedenIpucu`). Yalnız `.env`'deki `TELEGRAM_CHAT_ID`'ye cevap verir.

## Öğrenilen tercihler (`arayuz/ogrenme.mjs`)
- Gamze Hoca'nın her tepkisi (teslim, düzeltme notu, "Eksikleri düzelt", onay kararı, /unut) `ogrenilen/geri-bildirim.jsonl`'a yazılır.
- Her teslimden sonra kısa, kredisiz bir `claude -p` görevi (yalnız dosya araçları, MCP yok) bunları `ogrenilen/TERCIHLER.md`'ye damıtır: aynı yönde 2 ayrı videoda tepki ya da "hep / bundan sonra" gibi açık ifade → kural; tek videoya özgü düzeltme kural olmaz; değişmez kurallarla çelişen tercih eklenmez; düzeltilmeden bırakılan eksik "önemsiz" sayılır (Kalibrasyon).
- Kurallar her aşamanın istemine eklenir; değişmez kurallar her zaman önce gelir. Hoca Telegram'da `/tercihler` ile görür, `/unut <no>` ile siler (silinen kural yeni açık tepki gelmedikçe geri gelmez).
- `ogrenilen/` git dışındadır, yalnız üretim bilgisayarında yaşar.

## Ortak geliştirme
- Kod **geliştirme bilgisayarında** değişir ve GitHub'a gönderilir; Gamze Hoca'nın bilgisayarı yalnız üretim yapar ve `/guncelle` (git pull) ile güncellenir. Onun bilgisayarında repo dosyalarını düzenleme — yerel değişiklik `git pull --ff-only`'yi bozar.
- Makineye özel her şey `.env`'de (token'lar, sohbet kimliği) ve git dışında; video çıktıları da `.gitignore`'da.
- **Ortak ayarlar** (şimdilik `ELEVENLABS_VOICE_ID`; liste `arayuz/sunucu.mjs` → `ORTAK_AYARLAR`): `.env.example`'da değiştir ve gönder; üretim bilgisayarında `/guncelle` sonrası Stüdyo açılırken `.env`'e kendiliğinden yazılır. Token buraya eklenmez.

## Skill'ler (`.claude/skills/`)
`topview-uretim` (görsel + video, arayüz tuzakları), `elevenlabs-ses` (anlatım).

## Yeni video başlatma
Tercihen arayüzden (Stüdyo → bölüm → Yeni video). Terminalden: önce bölümü belirle; `video-NN-konu/` klasörü aç → Bölüm 0: SISTEM.md Bölüm 0 adımları (senaryo → ses → kilitler ve kareler → video → kurgu); Bölüm 1: `SENARYO.md` (kanca + 20-30 sn anlatım + 8-10 kısa plan + açıklama + uyarı; bedende gösterim gereken planda gösterim bedeni B1…B4 ve sunucu eli var/yok yazılır) → SISTEM.md Bölüm 1 adımları; Bölüm 2: çekimi `referans-videolar/`a koy → `cekim-donusturucu`.
