# Gamze Hoca'nın ses klonu ve klon sesle yeniden kurgu

Bu dosya üretim bilgisayarında (Gamze Hoca'nın bilgisayarı) Claude Code'a verilen iştir. Baştan sona sırayla uygula.

Bu bilgisayar üretim bilgisayarı: repo dosyalarını DÜZENLEME (yalnız `.env`, `ogrenilen/` ve `video-*/` altına yaz). CLAUDE.md'yi oku ve uy. Türkçe konuş. Kredi harcayan her işlemden önce maliyeti söyle ve onay al. TopView'da yeni görsel/video ÜRETME; bu iş yalnız ses ve kurgu.

## 0. Güncelle
`git pull --ff-only` çalıştır. `arayuz/sunucu.mjs` içinde `YEREL_ONCELIK` geçmiyorsa DUR ve "güncelleme henüz gelmemiş" de.

## 1. Ses klonu (ElevenLabs, Playwright uzantı modu)
- `.env`'de `HOCA_SES_ID` doluysa bu adımı atla.
- Kaynak: Hoca'nın kendi sesli mesajları → `video-*/sesli-tarif/kayit.*` ve `video-*/sesli-anlatim/kayit.*`. Hepsini listele, sürelerini ffprobe ile ölç. Gürültülü, çok kısa ya da başka birinin konuştuğu kayıtları alma. Toplam temiz süre 1 dakikanın altındaysa DUR ve Hoca'dan 2-3 dakikalık temiz bir kayıt iste (hangi klasöre koyacağını söyle).
- https://elevenlabs.io/app/voice-lab → Add voice → Instant Voice Clone. Ad: "Gamze Hoca", dil: Türkçe, seçtiğin kayıtları yükle. Onay kutusunu (sesin kendisine ait olduğu beyanı) işaretlemeden ÖNCE Hoca'ya sor, "evet" deyince işaretle. Plan klona izin vermiyorsa DUR, ne gerektiğini yaz; başka yol deneme.
- Oluşan sesin kimliğini (voice_id) al. `.env`'e yaz: `HOCA_SES_ID=<kimlik>` ve `ELEVENLABS_VOICE_ID=<kimlik>` (satır varsa değiştir, yoksa ekle).
- Deneme: `uslup/GAMZE-USLUP.md` tarzında 1-2 cümleyi klonla seslendir (`elevenlabs-ses` skill'i; model `eleven_v3`, olmazsa `eleven_multilingual_v2`), dosyayı aç ve Hoca'ya dinlet. "Bu benim sesim" demezse daha temiz/uzun kayıtla klonu bir kez yenile; yine olmazsa DUR.

## 2. Bütün çalışmaların analizi
Her `video-NN-*/` klasörü için:
- Konu ve bölüm: `SENARYO.md`, `SESLI-TARIF.md` / `SESLI-ANLATIM.md`, `.arayuz/durum.json` (`bolum`).
- Ham video: `kurgu/public/video.mp4` (yoksa `klipler/`), `kurgu/src/timeline.json`, `VIDEO-DENETIM.md`. `python -I araclar/kare-izgara.py` ile her planın ortasından kare al, ızgarayı AÇ ve BAK: plan listesi `[başlangıç, bitiş] → gerçekte ne görünüyor`.
- Ses: mevcut anlatım (`ses/`), Hoca'nın kaydı var mı (`sesli-tarif/` ya da `sesli-anlatim/` içinde `kayit.*` + `desifre.json`), teslim dosyaları.
- Tercihler: `ogrenilen/TERCIHLER.md` ve `ogrenilen/geri-bildirim.jsonl`'u oku; her videoya verilen tepkileri o videonun yanına yaz.

Sonucu `ogrenilen/VIDEO-ANALIZ.md`'ye yaz: video başına konu, bölüm, süre, plan listesi, kayıt var/yok, hangi yöntemle yeniden seslendirileceği, tercihlere göre dikkat edilecekler. Hoca'ya kısa bir özet tablo göster.

## 3. Klon sesle yeniden kurgu (en son videodan geriye doğru)
Sıra: teslim dosyası en yeni olan video önce. İLK videoyu bitir, Hoca'ya göster, onayını al; sonra diğerlerine geç.

Her video için:
- `teslim/<video>-hoca-sesi.mp4` zaten varsa önce `-hoca-sesi-eski.mp4` adıyla sakla. Asıl teslim dosyasına dokunma.
- **Kayıt varsa:** `arayuz/hoca-sesi-istem.md`'deki adımları aynen uygula (`{klasor}`, `{kayit}`, `{desifre}` yerine o videonun yolları). Ses: Voice Changer, girdi Hoca'nın kaydı, hedef ses `HOCA_SES_ID` (model `eleven_multilingual_sts_v2`). Kelimeler, vurgu ve duygu değişmez.
- **Kayıt yoksa:** mevcut anlatımın KELİMELERİNİ birebir al (`SENARYO.md` → Anlatım; `ses/desifre` ile karşılaştır), klon sesle TTS üret (`elevenlabs-ses` skill'i, duygu etiketleri `uslup/GAMZE-USLUP.md`'ye göre) → `ses/hoca-sesi/eleven.mp3` → whisper deşifre → `ses/hoca-sesi/yerlesim.json` (kurallar `hoca-sesi-istem.md` 4. adım) → `node araclar/hoca-sesi.mjs <klasör> <yerlesim.json>`. Eğitmen anlatımı videolarında (`bolum: egitim`) jestler eski sesin zamanına göre üretilmiştir: her cümleyi kendi planına yerleştir, vurgu kelimesi jestin zirvesine ±0,3 sn otursun; oturmuyorsa kesit hızını 0,7-1,6 arasında ayarla.
- Denetim (`hoca-sesi-istem.md` 5. adım): her cümlenin başladığı andan kare çıkar ve BAK, altyazı bandını aç, whisper ile kelimeleri doğrula. Kayma > 0,3 sn ya da yanlış plan varsa yerleşimi düzeltip BİR kez yeniden render al.
- Değişmezler: yüz yok, kapanış uyarı satırı kalır, süre ≤ 60 sn, kurguda emoji yok.

## 4. Rapor
Kısa ve Hoca'nın anlayacağı dille: klon oluştu mu ve kimliği, video başına yöntem (Voice Changer / TTS), süre, çıktı dosyasının tam yolu, bakılması gereken yerler, harcanan ElevenLabs kredisi, yapılamayan video varsa nedeni.
