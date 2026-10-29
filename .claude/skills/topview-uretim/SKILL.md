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
- Video Sınırsız modu sık sık "Busy" ile kilitli olur; MiniMax H3 / Wan 3.0 promosyonları 0 kredi gösterebilir — ilk üretimden sonra kredi kaydını kontrol et.
