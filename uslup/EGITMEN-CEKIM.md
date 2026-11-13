# Eğitmen anlatımı — Hoca'nın sesi, doğal eller, telefon çekimi (13 Kas 2026)

Bölüm 0'ın (Eğitmen anlatımı) her aşaması bu dosyayı okur. Aşama talimatındaki ya da `ornekler/egitim-begenilen/BEGENILEN.md`'deki bir ifade bununla çelişirse **bu dosya geçerlidir**. Değişmez kurallar (CLAUDE.md: yüz yok, eller, kadraj, uyarı satırı) aynen sürer.

Neden: klon sesle ilk videoda eller yapay durdu. Hoca'nın istediği: sözleri değişmesin, ses kendi sesi olsun, eller o sözü gerçekten anlatıyormuş gibi doğal olsun, görüntü iPhone'la elde çekilmiş gibi dursun.

## 1. Hoca'nın sesi modu
**Ne zaman:** `{klasor}/sesli-anlatim/kayit.*` varsa (Hoca Telegram'a sesli mesaj göndermiş). Linkten alınan anlatımda (`kaynak.*`, başka hesabın sesi) ve `/egitim <konu>` ile başlayan videoda bu mod YOK; onlarda metin eskisi gibi yazılır ve TTS ile okunur, ama 2-6. maddeler onlarda da geçerlidir.

- **Sözler değişmez.** Hoca'nın kelimeleri eklenmez, çıkarılmaz, sırası değişmez, yeniden yazılmaz, kısaltılmaz. Üslup kartı ve sağlık dili filtresi Hoca'nın kendi sözüne uygulanmaz (Hoca'nın isteği); açıklamadaki uyarı satırı ve kapanış etiketi yine yazılır.
- `SENARYO.md → ## Anlatım` = kaydın deşifresi, birebir. Yalnız yanlış DUYULAN kelimenin YAZIMI düzeltilir (`araclar/sozluk.json`, "Metni düzelt" bölümü); bu düzeltme altyazıyı etkiler, sesi etkilemez.
- **Ses = ElevenLabs Voice Changer** (speech-to-speech): girdi Hoca'nın kaydı, hedef ses `.env → HOCA_SES_ID` (boşsa `ELEVENLABS_VOICE_ID`), model `eleven_multilingual_sts_v2`, arka plan gürültüsünü kaldır açık. Önce ElevenLabs MCP'de araç ara; yoksa web arayüzü `https://elevenlabs.io/app/voice-changer`. Kelime, vurgu, duygu ve ritim kayıttan gelir. Yalnız Voice Changer hiç çalışmazsa: birebir kelimelerle duygu etiketli TTS (`elevenlabs-ses`), raporda yaz.
- **Kaydı hazırlama (Voice Changer'dan önce, ffmpeg):** baştaki ve sondaki sessizlik kırpılır; 0,7 sn'den uzun duraklamalar 0,4 sn'ye indirilir. Kelimelere dokunulmaz, hız değişmez.
- **Süre kayıttan gelir** (hedef süre ayarı bu modda yok sayılır). Hazırlanmış kayıt 60 sn'yi aşıyorsa cümle sınırında kesilir: baştan 60 sn'ye sığan tam cümleler alınır, kalan cümleler raporda `EKSIK:` olarak yazılır. Cümle ortasından kesme yok.
- Çıktı `ses/anlatim.mp3`; whisper ile doğrula (`ses/desifre/`): kelimeler kayıtla aynı mı. Eksik/fazla kelime varsa bir kez yeniden üret.

## 2. Jest planı (JEST.md) — eller sözü anlatır
Seedance Türkçeyi söyleyemez ama hareketi iyi yapar: **ses bizden, hareket planı Claude'dan, hareket Seedance'ten.** Videoda konuşma sesi üretilmez.

Plan sesin kelime zamanlarından (`ses/desifre/desifre.json`) çıkarılır. Önce sesi ANLA: her cümle ne diyor, hangi kelime vurgulu (uzayan, yükselen, öncesinde duraklama olan), nerede nefes var.

Doğal jestin kuralları:
- **Cümle başına bir ana jest**, o cümlenin vurgu kelimesinde zirve yapar. Jest üç evrelidir: hazırlık (zirveden 0,3-0,5 sn önce el kalkar) → vuruş (vurgu kelimesinde) → gevşeme (el yumuşakça masaya ya da dinlenme pozuna döner). Zirve kelimeden önce bitmez, kelimeden sonra başlamaz.
- **Jest sözün anlamını taşır**, süs değildir: sayarken parmak, "şu kadar" derken ölçü, nesnenin adı geçerken nesneye dokunma/gösterme/kaldırma, soru sorarken avuç yukarı, "kesinlikle" derken küçük kararlı vuruş, "açıklama" derken aşağıyı işaret. Sözle ilgisi olmayan hareket yazma.
- **Aralarda eller yaşar ama oynamaz:** dinlenme pozu (parmak uçları masada ya da eller gevşekçe birbirinin üstünde), küçük ağırlık değişimi, nefesle hafif kıpırtı. Sürekli sallanan, hiç durmayan el yapaydır; tamamen donuk el de hatadır.
- **Simetri yok:** iki el aynı anda ayna gibi hareket etmez. Bir el baskın (jesti yapar), diğeri destek (masada, nesnede). Baskın el cümleden cümleye değişebilir.
- **Tekrar yok:** aynı jest art arda iki cümlede kullanılmaz. Avuç açma videoda en fazla 2 kez.
- **Tek yasak jest: avuç göğse konmaz** (Hoca'nın isteği, 13 Kas 2026). Avucu göğse/kalbe koyup orada tutma hareketi kullanılmaz (reyhan videosu 39-41. sn: "kesinlikle tavsiye ediyorum" derken sağ avuç göğse yapışıp kaldı). Yerine avuç yukarı açılır ya da el masada küçük, kararlı bir vuruş yapar. Bu yalnız o harekettir: nesneyi kaldırmak, koklar gibi yaklaştırmak, elin yukarı çıkması serbesttir.
- **Büyüklük sözle orantılı:** sakin cümlede küçük jest (bilekten), heyecanlı vurguda büyük (dirsekten). Eller yüzü kadraja sokacak kadar yukarı çıkmaz.
- **Hız konuşmanın hızı:** hızlı sayılan şikâyetlerde kısa, çabuk dokunuşlar; yavaş, sıcak cümlede yavaş jest.
- Nesne tutarlılığı: demet elde kaldıysa sonraki planda da eldedir ya da masaya bırakıldığı yazılır.

### Jest çeşitliliği — robot gibi aynı hareketler yok (Hoca'nın isteği, 13 Kas 2026)
Hoca: "Devamlı robot gibi aynı hareketleri yapma. Her seste anlatılana uygun, rahat uzman eğitmen gibi, tarife uygun hareketler, anlatımlar yapmaya çalış." Çeşitlilik doğallığı bozmaz: cümle başına tek ana jest, aralarda dinlenme kuralı aynen sürer; çeşitlilik jestin SAYISINDA değil TÜRÜNDE.
- **Jest her sesin kendi içeriğinden çıkar, kalıptan değil.** `uslup/GAMZE-USLUP.md` → "Jest dili" tablosu reyhan videosundan örnektir, şablon değildir; yeni videoda o tablo sırayla kopyalanmaz. Önce sor: bu cümlede Hoca neyi anlatıyor, bir uzman bunu masada elleriyle nasıl gösterirdi?
- **Tarife/konuya uygun eylem jesti önce gelir.** Söz bir işi anlatıyorsa el o işi küçükçe canlandırır: "çiğneyin / ezin" → parmak uçlarında ufalama; "karıştırın" → bilekten küçük dairesel hareket; "bir kaşık / bir tutam" → başparmak-işaret parmağıyla tutam ölçüsü; "dökün / ekleyin" → avucu hafif eğip dökme; "sabah aç karna" → masaya hafif dokunup sıralama; "kurutulmuş / taze" → iki nesneyi ayrı ayrı göstermek ya da birinden ötekine el geçirmek; "sıcak / ılık" → avucu nesnenin üstünde tutup ısısını hisseder gibi. Masada konu nesnesi varsa onunla etkileşim (dokunma, çevirme, yaklaştırma, bir parça alma) soyut el işaretinden daha doğaldır.
- **Repertuvar geniş tutulur.** Kullanılabilecek türler: nesneyle etkileşim (dokunma, kaldırma, çevirme, iki nesne arasında gösterme), eylem canlandırma (yukarıdaki), ölçü/boyut (parmaklar arası aralık, avuç büyüklüğü), sayma (parmak ya da masaya dokunarak), sıralama/zaman (masada soldan sağa noktalar), karşılaştırma (iki el iki yanı tutar — biri hareket eder, biri durur), açıklama/ikna (avuç yukarı, yana açma), kararlılık (masada küçük vuruş, parmak ucuyla tek dokunuş), düşünme/geçiş (parmaklar birbirine değer, el nesnenin yanında durur), gösterme (işaret parmağı nesneye ya da aşağıya). Avuç göğse konmaz (yukarıdaki tek yasak).
- **Sayı kuralı:** bir videoda en az 4 farklı jest türü kullanılır (8 sn'den kısa videoda 3); aynı tür art arda iki planda olmaz; hiçbir tür videonun ana jestlerinin üçte birinden fazlası olmaz. Baskın el en az bir kez değişir.
- **Aynı türün içinde de çeşit:** aynı tür ikinci kez geliyorsa biçimi değişir (ilk sayma parmakla, ikincisi masaya dokunarak; ilk avuç açma tek el, ikincisi küçük ve bilekten).
- **Videolar arası tekrar yok:** JEST.md yazılmadan önce son eğitmen videosunun `JEST.md`'sine bakılır (en yüksek numaralı, `bolum: egitim` olan önceki klasör); aynı jest sırası (ör. avuç açma → işaret parmağı → nesne kaldırma) yeni videoda baştan aynen tekrarlanmaz. Özellikle kanca jesti her videoda aynı olmaz.
- **Doğallık sınırı:** çeşitlilik için yapmacık, tiyatro gibi ya da büyük hareket eklenmez; uzman bir eğitmenin rahat, ölçülü hareketi. Emin değilsen sakin bir nesne etkileşimi ya da dinlenme pozu, yapay bir "farklı" jestten iyidir.
- JEST.md tablosunun altına `Jest türleri: <tür> ×<sayı>, …` satırı yazılır (denetim buradan sayar).

`JEST.md` tablosu: | Plan | Başlangıç sn | Bitiş sn | Söz | Vurgu kelimesi @ sn | Baskın el | Jest (hazırlık → vuruş → gevşeme, saniyeleriyle) | Açı (A1/A2/A3) |. Plan sınırı her zaman cümle sınırıdır.

## 3. Tek ana kare, farklı kamera açıları
Her plan için ayrı kare ÜRETİLMEZ (kareler arası fark elleri ve masayı değiştiriyor, hareketi yapaylaştırıyor).
- **A1 — ana kare** (`kareler/kare-01.png`): Eğitmen kadrajı, göğüs ortasından masaya, eller dinlenme pozunda, konu nesnesi masada. Image1 = E0, Image2 = P1, Image3 = ELLER-kilidi.
- **A2 ve A3 — aynı sahnenin başka açıları**, A1'DEN türetilir (Image Edit, Image1 = A1; "same scene, same moment, same hands, same objects, only the phone moved"):
  - A2 (`kare-02.png`): telefon yaklaşmış ve hafif sola kaymış; eller + nesne yakın, gövde kenarda.
  - A3 (`kare-03.png`, isteğe bağlı): telefon hafif sağdan ve biraz daha yukarıdan, masaya eğik bakış.
- En fazla 3 kare. sahne-denetci A2/A3'ü A1 ile karşılaştırır: nesne, masa düzeni, kol, tırnak, ışık aynı mı; yüz/çene/boyun yok mu.
- JEST.md'de her plan bir açı alır; art arda iki plan aynı açıda olmaz, kanca planı A1'dir, nesne gösterilen plan A2'dir.

## 4. Telefon kamerası hissi (iPhone, elde)
Görüntü stüdyo çekimi gibi değil, karşıda oturan birinin iPhone'u elinde tutarak çektiği video gibi durur.

**Karelerde** (Eğitmen kalıbındaki "shallow depth of field" yerine):
> Shot on an iPhone held in hand by someone sitting across the desk, vertical 9:16. Phone main camera look: wide 24-26mm lens, deep focus with the whole desk sharp and the background only slightly soft, natural window daylight, true-to-life colors, mild HDR, a little sensor noise in the shadows. Slightly imperfect framing, a touch off-level. Not a studio photo, no cinematic bokeh, no color grading, no lens flares, no text, no logos.

**Video promptunda** (her planda):
> Handheld iPhone footage, vertical. The phone is held by a person, not on a tripod or gimbal: constant small natural hand shake and micro-jitter, slight drift and breathing of the frame, tiny reframing corrections, occasional subtle autofocus and exposure adjustment. No smooth cinematic camera moves, no slider, no orbit, no slow push-in, no rack focus. Real-time natural speed, no slow motion.

Açı değişimi sert kesmedir (telefon başka yere geçmiş gibi); plan içinde kamera yalnız elde titrer, yüz hiçbir titreşimde kadraja girmez (kadrajın üst kenarı göğüs ortasında kalır).

## 5. Seedance promptu
Seedance 2.5 Omni Reference; referanslar: A1, A2, (A3), son olarak `mekan-kilidi/ELLER-kilidi.png`. Süre = ses süresi (yukarı yuvarlanmış).
- Ortak başlık: 4. maddedeki video kalıbı + eller kalıbı + "head, face, neck and hair always outside the frame; same office, same desk, same objects in every shot; a woman explaining something to a friend across the desk, her hands move the way a real person's hands move while talking: relaxed, slightly asymmetrical, with small pauses; she never places her palm on her chest or heart; no speech audio, no voice, no lip sync, no music, no text".
- Her plan zaman damgasıyla ve DÜZ CÜMLEYLE yazılır, komut listesi gibi değil. Kötü: "2.1s: right index finger rises. 2.4s: left palm opens." İyi: "4.2-7.9s, cut to @Image2 angle: she is naming the herb. Her right hand reaches for the basil bunch and lifts it a little off the desk, arriving at its highest point at 6.8s, then lowers it back gently; her left hand stays resting on the desk."
- Plan başına bir ana jest ve tek zirve saniyesi (JEST.md'den). Gerisini "hands rest naturally" ile bırak; her yarım saniyeye hareket yazma.
- O planda olmayan nesnenin adı geçmez.
- Ses referansı alanı varsa `ses/anlatim.mp3` verilir ("hand gestures follow the rhythm and emphasis of this narration; do not generate speech"); yoksa yalnız zaman damgaları.

## 6. Denetim (video-denetci ek maddeleri)
- Her planın zirve saniyesinde ana jest var mı (±0,4 sn) ve söze uyuyor mu.
- Yapaylık işaretleri = KIRP ya da YENİDEN ÜRET: ayna gibi simetrik eller, aynı hareketin döngü gibi tekrarı, hiç durmadan sallanan eller, tamamen donuk eller, robot gibi köşeli hareket, sözle ilgisiz jest.
- **Çeşitlilik:** videoda gerçekten görülen ana jestlerin türlerini say; 2. maddedeki sayı kuralı tutmuyorsa ya da eller robot gibi aynı hareketi farklı cümlelerde tekrarlıyorsa EKSIK'e yaz ve uyumu düşür (Hoca'nın açık isteği). Rapora `JEST_CESITLILIK: <farklı tür sayısı>/<ana jest sayısı>` yaz.
- Avuç göğse/kalbe konup tutuluyor mu: o saniyeler KIRP (plan başka açıyla kapatılır), kapatılamıyorsa YENİDEN ÜRET.
- Çekim hissi: elde titreme görünüyor mu, gimbal/slider gibi pürüzsüz hareket var mı. Rapora `ELDE_CEKIM: VAR|ZAYIF|YOK` yaz.
- Yüz/çene/boyun, kol ve tırnak kuralı, nesne sürekliliği her zamanki gibi.

## 7. Kurgu
- Ses tam seviyede, 0. saniyeden hizalı; video sesi kapalı ya da çok kısık.
- **Pürüzsüz push-in YOK** (telefon hissini bozar): `timeline.json → shots` içinde her planda `"push": 0`. Yakınlık yalnız plan kesmesinde değişir.
- `timeline.json → "handheld"`: video-denetci `ELDE_CEKIM: VAR` dediyse `0`; `ZAYIF` ise `0.5`; `YOK` ise `1` (kurgu hafif elde titreme ekler; kenar görünmesin diye görüntüyü %3 büyütür).
- Altyazı, kanca kutusu, kullanıcı adı ve kapanış etiketi BEGENILEN.md'deki gibi. Hoca'nın sesi modunda altyazı Hoca'nın kelimeleridir.
