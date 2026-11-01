---
name: topview-uretim
description: TopView web arayüzünde (Playwright uzantı modu) görsel ve video üretimi — mekân açısı, nesne kilidi, sahne kareleri (GPT Image 2 Image Edit) ve Seedance 2.5 Omni Reference video. "kareleri üret", "mekân açısı", "nesne kilidi", "videoyu üret", "TopView'de üret" dendiğinde kullan.
---

# TopView üretimi

Playwright MCP uzantı modunda kullanıcının kendi Chrome'u ve TopView oturumu kullanılır (`.mcp.json`).

## Kredi kuralı (EN ÖNEMLİ)
- Görseller **Sınırsız modda (0 kredi)**: Image → GPT Image 2 · 9:16 · **1K** · Medium. Generate düğmesinde **taç** var ve **rakam yoksa** Sınırsız'dır. 2K'da ya da GPT Image 2.5'te rakam çıkar = ücretli → GÖNDERME.
- Göndermeden önce düğme metnini DOM'dan oku; rakam varsa dur. Video kredilidir: maliyeti kullanıcıya söyle, onay al.
- Her gönderiden sonra görev listesini doğrula (TopView MCP `topview_list_board_tasks` bağlıysa onunla; yoksa tahtadaki kartlar).

## Arayüz tuzakları
- Prompt alanı textarea değil, tiptap: `document.querySelector('.tiptap.ProseMirror').editor.commands.setContent(...)`. Referans chip'leri (`mentionChip`) korunacaksa önce `editor.getJSON()`'dan chip düğümlerini al, içeriği `[chip1, text, chip2, text…]` olarak kur.
- Tıklamalar "stable değil" diye zaman aşımına düşer → düğmeyi DOM'da bul, `elementFromPoint` ile üstünü kapatan bir şey olmadığını kontrol et, `b.click()`.
- Açık kalan **detay penceresi** (`?boardResultId=` URL'de) tıklamaları yutar → her gönderiden önce `Escape` ile kapat.
- **Tahtadaki kartı referans yapmak:** kartı Import kutusuna SÜRÜKLE (mouse down → küçük hareket → 25-30 adımda hedefe → up). Bazen tıklamaya dönüşüp detay açar → Escape, tekrar dene. Sıra = Image1, Image2…
- **Yerel dosya yüklemek:** `setInputFiles` uzantı modunda "Not allowed" verir. Dosyayı base64 JPEG olarak JS'e göm, `new File()` + `DataTransfer` ile **son** `input[type=file]`'a ata, `change` olayı tetikle (script'i dosyaya yazıp `browser_run_code_unsafe filename=` ile çalıştır).
- Tam boy görsel URL'si tahtadaki `img`'den alınamaz (`_resized` önizleme). TopView MCP bağlıysa `topview_list_board_tasks` → `result.originImage.url`; değilse kartın üstündeki indirme simgesi (Downloads klasörüne düşer).

## Görsel üretimi (Image Edit)
- Image1 = `mekan-kilidi/M0-ana-mekan.png` (ya da ilgili açı), Image2 = `nesne-kilidi/P1-*.png`.
- Kalıplar `mekan-kilidi/MEKAN-KILIDI.md` içinde (açı kalıbı, eller kalıbı). Mekânı metinle baştan tarif ETME.

## Video (Seedance 2.5 Omni Reference)
- Video → Omni Reference → model Seedance 2.5 → kareleri sırayla sürükle (@Image1…N) → tek prompt, zaman damgalı: `0-4s: start exactly from @Image1: … 4-9s: cut to @Image2: …` + "same jar/hands/room in every shot, clean hard cuts, no face, no text, no music, no voice".
- 25 sn 720p ≈ 30 kredi (kredi modu). Süre menüsünden seç. Omni'de Native Audio düğmesi yok; ortam sesi gelir, kurguda kullanılır.
- Yeni kural: 8-10 kısa plan (2-3 sn), makro yakın planlar, promptta kamera hareketi (slow push-in, slight orbit, rack focus), doğal hız; "slow" yalnız akışkanlarda.
- Hacamat gibi sahnelerde ERKEK hasta (kadın sırtı GPT Image'da "sexual" reddi); "dome, bare, skin drawn up" kelimelerinden kaçın.

## Video Edit (Gamze'nin çekimini dönüştürme — ayrıntı: `cekim-donusturucu` ajanı)
- Omni Reference → Seedance 2.5 → kaynak video + referanslar → Task Type **Video Edit** (aşağıda, `scrollIntoView` gerekir). Çıktı süresi kaynaktan gelir; ~1,4 kredi/sn, 43 kredi ön provizyon.
- **Her görevden önce sayfayı yeniden yükle.** Silinen küçük resimlerin videoları/görselleri de gönderiliyor (bulaşma).
- Büyük dosya: `araclar/topview/parcala.py` (~315 KB parçalar; tek 2 MB parça "Unexpected number" hatası, 100 KB altı parça araç çıktısında yankılanır).
- Gönderim: `prompt.js` (window.__prompt) → `araclar/topview/video-edit-gonder.js`.
- Panel model seçimi Topview T1'e dönebilir; seçici ilk açılışta geç yüklenir (script döngüyle bekler).
- Sonra `topview_list_board_tasks`: `parameters.inputVideos` = 1, `duration` = -1. Sabit süre (ör. 30) giderse kısa kaynakta "duration geçersiz" hatası (kredi iade).
- Sonuç: `result.originVideo.url`. Hasta değişimi tutmuyor (vücut korunuyor).
- Video Sınırsız modu sık sık "Busy" ile kilitli olur; MiniMax H3 / Wan 3.0 promosyonları 0 kredi gösterebilir — ilk üretimden sonra kredi kaydını kontrol et.

## Kredili mod (MCP, tarayıcısız)
Videonun `durum.json`'unda `mod: kredili` ise (Stüdyo/Telegram "kredili") Chrome **açılmaz**; her şey TopView MCP ile gider. Kredisiz modda bu araçlar sunucu tarafından kapatılır (yalnız okuma araçları açık).
Ölçülen fiyatlar (Kasım 2026): GPT Image 2 · 1K · medium = **0,2 kredi/kare**; Seedance 2.5 · 720p = **~1,2 kredi/sn** (25 sn = 30); Video Edit ~1,4 kredi/sn.

1. **Bakiye:** başta `topview_get_credit` → `remainCredit` not al. Sonda tekrar oku; fark = `HARCANAN_KREDI`. Kalan bütçeyi aşacak gönderim YAPMA.
2. **Yükleme (her yerel dosya):** `ta_upload_credential({format:"png"|"jpg"|"mp4"})` → dönen `uploadUrl`'e `curl -s -X PUT -T <dosya> "<url>"` (Content-Type gerekirse `-H "Content-Type: image/png"`) → `ta_upload_check_file({fileId})` tamam → `fileId`. URL'yi günlüğe/rapora YAZMA.
   Mekân (`mekan-kilidi/M0-ana-mekan.png`) ve nesne kilidi her video başında bir kez yüklenir; fileId'leri `<klasor>/.arayuz/topview-dosyalar.json`'a yaz, sonraki aşamalar oradan okusun.
3. **Kare (image_edit):** `topview_get_generation_config({type:"image", taskType:"image_edit"})` ile modeli doğrula → `topview_generate_image({taskType:"image_edit", model:"GPT Image 2", prompt, inputImageFileIds:[M0, P1], aspectRatio:"9:16", resolution:"1K", quality:"medium"})`. Promptta referanslar sırayla Image1 (mekân), Image2 (nesne). Board sorma: `boardId` verme (My First Board).
4. **Video (Omni Reference):** `topview_generate_video({taskType:"omni_reference", model:"Seedance 2.5", omniReferenceTaskType:"auto", inputImages:[{fileId,name:"Image1"},…], prompt, duration:<sure>, resolution:720, aspectRatio:"9:16"})`. Promptta kareler `<<<Image1>>>`, `<<<Image2>>>` … diye anılır (web'deki `@Image1` yerine). Zaman damgalı plan kuralları aynı.
5. **Video Edit (çekim):** kaynak `kaynak/kurgu30.mp4` yüklenir → `topview_generate_video({taskType:"omni_reference", model:"Seedance 2.5", omniReferenceTaskType:"edit", inputVideos:[{fileId,name:"Video1"}], inputImages:[eller/mekân referansları], prompt:<prompt.js'deki metin, kaynak <<<Video1>>>>, duration:-1, resolution:720})`. Sabit süre VERME (−1 zorunlu).
6. **Sonuç:** dönen `taskId` ile `topview_query_task({taskType, taskId})` — 20-30 sn arayla, iş bitene kadar. `success` → sonuç URL'sini `curl -L -o <klasor>/klipler/<ad>.mp4` (görselde `kareler/<ad>.png`). `costCredit` yalnız iş bitince doğrudur.
7. Hata kodu 4000/4100 ya da "unsupported" → model değiştirip yeniden deneme YOK; mesajı aynen raporla (`SONUC: SORUN`).

## 60 sn'ye kadar (parçalı üretim)
Seedance 2.5 tek görevde en fazla **30 sn** üretir (Omni Reference ve Video Edit). 31-60 sn'lik video **parça parça** üretilir; sunucu istemde parça sayısını verir ("2 parça (~30 + ~30 sn)").
1. **Dikiş = plan kesmesi.** Parça sınırını iki plan arasındaki sert kesmeye koy (planlar zaten sert kesmeyle bağlanır). Kesintisiz hareket dikişten geçmez; böylece dikiş görünmez, yalnız nesne/el/mekân sürekliliği gerekir.
2. **Kilitler her parçada aynı:** Image1 = mekân (`M0`), Image2 = nesne kilidi, ardından yalnız O parçanın plan kareleri. Promptun başlık bloğu (eller: siyah pamuk eldiven + mürdüm kol + leylak manşet + bakır kelepçe; mekân; nesne tarifi; "no face, no text, no music") parçalar arasında **birebir aynı** metin.
3. **2. parça 1. parçaya bağlanır:** 1. parça inince son karesini al (`ffmpeg -sseof -0.1 -i klipler/parca-1.mp4 -frames:v 1 klipler/parca-1-son.png`), 2. parçada Image3 olarak ver ve promptta "lighting, color grade, jar fill level and hand positions continue exactly from <<<Image3>>> / @Image3" yaz. Malzeme miktarı (kavanoz doluluğu, kesilmiş dilimler) 1. parçanın sonundaki hâlinden devam eder.
4. **Zaman damgaları parçanın kendi saatiyle** (her parça 0 sn'den başlar); kurguda birleştirilir.
5. **Birleştir:** `ffmpeg -f concat` (aynı codec/çözünürlük; değilse önce aynı ayarla yeniden kodla) → `klipler/tam.mp4` (Video Edit'te `klipler/edit-tam.mp4`). video-denetci dikiş karesini ayrıca kontrol eder (renk sıçraması, nesne değişimi, el/kol rengi).
6. **Video Edit (çekim):** kaynak `kaynak/kurgu30.mp4` NOTLAR.md'deki plan kesmesinden bölünür (`ffmpeg -ss … -to … -c:v libx264 -crf 16` → `kaynak/parca-N.mp4`), her parça ayrı görev (`duration:-1`), referanslar ve el tarifi aynı.
7. **Kredi:** kredili modda parça başına ~1,2 kredi/sn (Video Edit ~1,4); 60 sn ≈ 72 (Video Edit ≈ 87). Kredisiz modda her parça ayrı Sınırsız kuyruk işi; ikincisini birincisi inmeden gönderme (3. adım için son kare gerekir).
8. Parça sayısı > 1 iken bir parça denetimden kalırsa yalnız o parça yeniden üretilir; diğeri korunur.
