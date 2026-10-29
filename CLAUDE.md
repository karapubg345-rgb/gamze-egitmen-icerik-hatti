# Gamze Eğitmen — yapay zekâ içerik hattı

Bu klasör Gamze Eğitmen'in (@gamze.egitmen) Instagram Reels üretim sistemidir. Her zaman **Türkçe** konuş. Akışın tamamı `SISTEM.md`'de.

## Değişmez kurallar
- **Yüz yok, karakter yok.** Kadrajda yalnız eller: siyah pamuk eldiven, bileği tamamen kapatan mürdüm kol (leylak işlemeli manşet), sol bilekte manşetin üstünde dövme bakır kelepçe. Çıplak ten = hata.
- **Tek mekân:** `mekan-kilidi/M0-ana-mekan.png` (aydınlık klinik-mutfak). Her sahne bu görsel referans verilerek üretilir.
- **Nesne kilidi:** ana nesne (kavanoz, kâse…) gerçek fotoğrafa göre bir kez üretilir, her karede referans verilir. Nesne kareden kareye değişmez.
- **Gerçeklik:** tarif/uygulama görünümü internetten gerçek fotoğraflarla doğrulanır (`gercek-referans` ajanı); yapay zekânın uydurduğu görünüm kullanılmaz.
- **Sağlık dili:** "tedavi eder / geçirir / iyileştirir" YOK → "geleneksel olarak kullanılır". Aşı, 5G vb. konular yok. Her açıklamada uyarı satırı: "Geleneksel bir tariftir, tedavi amacı taşımaz; sağlık sorununuz varsa hekiminize danışın." Bal içeren tariflerde "1 yaş altı bebeklere bal verilmez".
- **Kan/kesik gösterilmez** (hacamat sahnelerinde de).
- **Kredi:** TopView görselleri Sınırsız modda (0 kredi) üretilir; kredili her işlemden (video, ücretli model) önce maliyeti söyle ve onay al.
- Kurguda emoji yok; ikon gerekirse çizgi SVG.

## Ajanlar (`.claude/agents/`)
`gercek-referans` → `sahne-denetci` → `video-denetci` → `kurgu-ajani`. Kullanıcıya hiçbir kare/video denetimden geçmeden gösterilmez.

## Skill'ler (`.claude/skills/`)
`topview-uretim` (görsel + video, arayüz tuzakları), `elevenlabs-ses` (anlatım).

## Yeni video başlatma
`video-NN-konu/` klasörü aç → `SENARYO.md` (kanca + 20-30 sn anlatım + 8-10 kısa plan + açıklama + uyarı) → SISTEM.md adımları. Örnek: `video-01-bal-zencefil/`.
