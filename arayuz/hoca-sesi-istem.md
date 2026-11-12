Gamze Eğitmen içerik hattı — Telegram `/hocasesi` işi. CLAUDE.md'yi oku ve uy. Kullanıcıya soru SORMA (cevap veremez): karar gerekiyorsa en güvenli seçeneği uygula, raporda yaz.

VİDEO KLASÖRÜ: {klasor}
HOCA'NIN KAYDI: {kayit}  ·  ZAMANLI DEŞİFRESİ: {desifre}

## Amaç
Gamze Hoca ElevenLabs'ın hazır seslendirmesini yapay buluyor; kendi kaydını ise videoyla olduğu gibi birleştirince video ile uyumsuz oldu. İstenen: **Hoca'nın KELİMELERİ ve DUYGU TONU değişmeden**, ElevenLabs sesiyle, **videoyla tam senkron** bir kurgu. Mevcut teslim dosyasına dokunma; çıktı `teslim/{klasor}-hoca-sesi.mp4`.

Değişmezler: Hoca'nın kelimeleri eklenmez, çıkarılmaz, sırası değişmez, yeniden yazılmaz (sağlık dili kuralı burada Hoca'nın kendi sözüne uygulanmaz; Hoca'nın isteği). Kapanıştaki uyarı satırı ve ACIKLAMA.txt'deki uyarı kalır.

## 1. Videoyu analiz et
- `{klasor}/SENARYO.md` plan tablosu, `{klasor}/VIDEO-DENETIM.md`, `{klasor}/kurgu/src/timeline.json` (`sceneStarts`, `shots`; zamanlar `kurgu/public/video.mp4`'ün zamanıdır).
- Her planda gerçekte ne göründüğünü doğrula: `python -I araclar/kare-izgara.py {klasor}/kurgu/public/video.mp4 {klasor}/ses/hoca-sesi/izgara <her plan ortası…>` ve ızgarayı AÇ, BAK. Plan listesini çıkar: `[başlangıç, bitiş] → ne görünüyor`.

## 2. Hoca'nın kaydını analiz et
- Deşifreden cümle/söz öbekleri (duraklama ≥ 0,12 sn ya da noktalama yerlerinden). Her öbek: `[a, b]`, metni, anlattığı şey (hangi plana denk gelmeli).
- Duygu ve vurgu: öbek başına ses yüksekliği, hız (kelime/sn), vurgulu kelimeler, soru/heyecan/sıcaklık. `{klasor}/ses/hoca-sesi/ANALIZ.md`'ye yaz.

## 3. ElevenLabs ile ses (kelime ve duygu Hoca'nınki)
Ses kimliği `.env` → `ELEVENLABS_VOICE_ID`. Çıktı `{klasor}/ses/hoca-sesi/eleven.mp3`. Sırayla dene, ilk olanı kullan:
1. **Voice Changer (speech-to-speech), öncelikli:** Hoca'nın kaydı girdi, hedef ses ELEVENLABS_VOICE_ID. Kelimeler, vurgu, duygu ve ritim birebir Hoca'nın kaydından gelir. Ayar: arka plan gürültüsünü kaldır açık; stil/benzerlik varsayılan.
   - Önce ElevenLabs MCP (ToolSearch `elevenlabs`): speech-to-speech / voice changer aracı varsa parametreleri şemadan al.
   - Yoksa web arayüzü (Playwright uzantı modu): `https://elevenlabs.io/app/voice-changer` → kaydı yükle → sesi seç → üret → indir (indirme düğmesi yoksa `.claude/skills/elevenlabs-ses/SKILL.md` 4. adımdaki MediaRecorder yöntemi).
2. **Olmazsa TTS:** Hoca'nın kelimeleri BİREBİR (deşifre + sözlük düzeltmesi, `araclar/sozluk.json`), model Eleven v4 / `eleven_v3`, 2. adımdaki analize göre öbek başına duygu etiketi (`[curious]`, `[warmly]`, `[excited]`, `[short pause]` …) — `elevenlabs-ses` skill'i. Raporda "Voice Changer kullanılamadı, TTS + duygu etiketi" yaz.
- Sonra whisper: `uv run --with faster-whisper python araclar/desifre.py --audio {klasor}/ses/hoca-sesi/eleven.mp3 --out {klasor}/ses/hoca-sesi/desifre --model medium`. Kelimeler Hoca'nın kaydıyla aynı mı karşılaştır; eksik/fazla kelime varsa bir kez yeniden üret.

## 4. Yerleşim (senkron)
`{klasor}/ses/hoca-sesi/yerlesim.json` yaz (biçim `araclar/hoca-sesi.mjs` başındaki açıklamada; örnek: `araclar/hoca-sesi-ornek.json` — video-05 patates suyu + tahin için denenmiş, senkronu doğrulanmış yerleşim). Kurallar:
- **Ses parçalarının içi değişmez** (kesme yalnız öbek sınırında, tempo yok). Öbekler sırayla, her biri anlattığı şeyin göründüğü plana: eylem fiili (döküyoruz, karıştırıyoruz, ekleyeceksiniz) eylemin başladığı ana ±0,3 sn; nesne adı (tahin, patates) o nesne görünürken.
- **Video sese uyar:** `kesitler` ile planlar sırayla alınır; konuşmasız plan hızlanabilir (≤1,6), uzun öbeğin planı yavaşlayabilir (≥0,7). Ses videodan uzunsa uygun planlar (kanca/kahraman çekimi, bitmiş ürün) farklı `z` ile yeniden kullanılır; tarifin sırasına aykırı plan (ör. sabah konuşulurken rende) KULLANILMAZ. Sondaki ~2 sn, ortam sesinde uydurma konuşma olabilecek bölge (`timeline.json → ambient.fadeAt` sonrası) kesite alınmaz.
- Öbekler arası 0,15-0,6 sn boşluk doğal; daha uzun boşlukta ortam sesi açılır, sorun değil. Toplam ≤ 60 sn.
- Çalıştır: `node araclar/hoca-sesi.mjs {klasor} {klasor}/ses/hoca-sesi/yerlesim.json`.

## 5. Denetim
- Her öbeğin başladığı andan teslim dosyasından kare çıkar (ffmpeg `-ss`, drawtext KULLANMA — bu makinede çöküyor), ızgara yap, AÇ: söylenen şey ekranda mı? Kayma > 0,3 sn ya da yanlış plan → yerleşimi düzelt, bir kez yeniden çalıştır.
- `kurgu-hoca-sesi/out/kontrol/altyazi-bandi.jpg`'yi AÇ: taşma yok mu.
- Sesin baştan sona Hoca'nın kelimeleri olduğunu whisper ile doğrula.

## Rapor (kısa, Türkçe, Hoca'nın anlayacağı dille)
Hangi yöntem (Voice Changer / TTS), süre, hangi cümle hangi plana, bakılması gerekenler. EN SON satır: `CIKTI: <teslim dosyasının tam yolu>` (üretilemediyse `CIKTI: yok`).
