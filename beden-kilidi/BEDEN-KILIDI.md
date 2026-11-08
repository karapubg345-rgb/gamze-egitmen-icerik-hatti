# Beden kilidi — gösterim bedeni (8 Kas 2026)

Tarif bedende bir gösterim gerektiriyorsa (deri çimdik testi, el üstüne/ön kola/ayağa/sırta uygulama) o planda **sunucu elinden ayrı** bir beden bölgesi gösterilir. Bölge burada kilitlidir. Nesne kilidi nasıl çalışıyorsa bu da öyle çalışır: gerçek fotoğrafa göre **bir kez** üretilir, sonra her karede referans verilir ve kareden kareye aynı kalır.

(video-06'da çimdik testi bu kilit olmadığı için yalnız yazıyla geçmişti.)

## Kilitler

| Kod | Dosya | Bölge | Ne zaman |
|---|---|---|---|
| B1 | `B1-cocuk-eli.png` | 6-8 yaş çocuk eli (el üstü + parmaklar, bilek hizasında kadraj dışı) | çocuğa uygulanan el tarifleri, çocuk eli masajı |
| B2 | `B2-yetiskin-erkek-onkol.png` | yetişkin erkek ön kolu (dirsek altı – el üstü, iç ya da dış yüz) | deri çimdik testi, ön kola sürme/uygulama |
| B3 | `B3-yetiskin-ayak.png` | yetişkin ayak (ayak üstü + parmaklar + bilek, ayak bileği üstü kadraj dışı) | ayak banyosu, ayak tabanına/üstüne uygulama |
| B4 | `B4-yetiskin-sirt.png` | yetişkin sırt (kürek kemikleri – bel, omuz hizasında kadraj dışı; sedyede yüzüstü) | sırta sürme, masaj, kupa yerleşimi |

Yeni bölge gerekirse aynı düzenle `B5-…` eklenir ve bu tabloya yazılır (geliştirme bilgisayarında; bkz. "Git" altta).

## Değişmez kurallar
- **Yalnız bölge görünür.** Yüz, kafa, saç, boyun, kıyafet (kol ağzı, pantolon paçası, çorap dâhil), takı, saat, dövme, ben/yara izi, oje gibi kimliği belli eden hiçbir şey yok.
- **Çocuk bedeni yalnız el ya da ayak** olabilir. B1 dışında çocuk bölgesi üretilmez.
- **Ten hafif ve doğal:** gerçek gözenek, ince tüy, doğal ışık; pürüzsüz plastik/stüdyo cildi değil. Yara, kızarıklık, döküntü, morluk, kan, hastalık görüntüsü yok (kan kuralı ayrıca geçerli: CLAUDE.md).
- **Anatomi:** 5 parmak, doğru eklem; fazla/eksik parmak = HATA.
- **Sunucu eli ayrıdır.** Gösterim bedeni ile sunucu eli aynı karedeyse sunucu eli yine siyah eldiven + mürdüm kol + leylak manşet + sol bilekte bakır kelepçe; çıplak ten yalnız gösterim bedeninde olabilir. Hangi elin kime ait olduğu karede tartışmasız anlaşılmalı (gösterim bedeni çıplak, sunucu eli eldivenli).
- **Mekân:** gösterim bedeni M0 mekânının içindedir (tezgâh üstünde havlu, sedye, leğen). Kilit görseli sade arka planda olabilir; kareye Image Edit ile yerleştirilir.

## Üretim (ilk kullanımda bir kez)
Kilit **ilk gereken videoda** "Nesne kilidi ve kareler" aşamasında üretilir; dosya burada varsa ve `B*-…/KART.md` sonucu GEÇTİ ise **yeniden üretilmez**, doğrudan kullanılır.

1. **Gerçek referans:** `gercek-referans` ajanı "beden kilidi kipi"nde çalışır → `beden-kilidi/B?-…/indirilen/`, `secilen/` (1-3 gerçek fotoğraf; yüz/kıyafet/takı içeren elenir ya da kırpılır) + `B?-…/KART.md` (ten tonu, yaş aralığı, oran, kadraj, İngilizce "body description" cümlesi, kaynaklar).
2. **Üretim:** GPT Image 2 · 9:16 · 1K · Medium, Image Edit; Image1 = seçilen gerçek fotoğraf (kompozisyon/ten), Image2 = `mekan-kilidi/M0-ana-mekan.png` (ışık). Kalıp:
   > Photorealistic close-up of <KART.md body description>, natural light matching Image2, real skin texture with fine pores and fine hair, healthy even skin tone, no wounds, no redness, no blood, no marks, no tattoos, no jewelry, no nail polish, no clothing visible, no face, no head, only the <region> in frame, cropped at <crop line>, anatomically correct with five fingers/toes, vertical 9:16, no text, no logos.
3. **Denetim:** `sahne-denetci` (beden kilidi maddeleri) → `B?-…/KART.md` sonuna `SONUÇ: GEÇTİ` ya da `DÜZELT` + düzeltme promptu. DÜZELT ise 1 tur Image Edit düzeltmesi.
4. **Kredi:** kredisiz modda TopView **Sınırsız** (Generate düğmesinde rakam yok, 0 kredi). Kredili modda TopView MCP ile bir kez (≈ 0,2 kredi/görsel, düzeltme turuyla en çok ≈ 0,4); harcanan `KART.md`'ye ve aşama raporuna `BEDEN_KILIDI_KREDI: <sayı>` olarak yazılır (HARCANAN_KREDI'ye de dâhildir). Bütçe yetmiyorsa gönderilmez, rapora yazılır.

## Kullanım (her karede)
- Image Edit'te referans sırası: Image1 = M0 (veya ilgili açı), Image2 = nesne kilidi P1 (varsa), **Image3 = beden kilidi B?**. Promptta: "the <region> is exactly the same as Image3 (same skin tone, proportions, nails, lighting); only that region is visible, no face, no clothing".
- Seedance videosunda beden kilidi ayrıca @Image olarak verilir; zaman damgalı promptta gösterim bedeninin göründüğü planlar açıkça yazılır, görünmediği planlarda "bu planda gösterim bedeni YOK" denir.
- Video klasöründe hangi kilidin kullanıldığı `SENARYO.md` → "Gösterim bedeni" tablosunda yazar.

## Git
Bu dosya (kurallar) git'tedir. Üretilen kilit görselleri ve indirilen gerçek fotoğraflar (`B*.png`, `B*-*/`) **git dışındadır** (`.gitignore`): üretim bilgisayarında ilk kullanımda oluşur ve orada kalır, `git pull --ff-only`'yi bozmaz.
