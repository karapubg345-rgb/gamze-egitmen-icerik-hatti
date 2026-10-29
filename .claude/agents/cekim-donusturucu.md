---
name: cekim-donusturucu
description: Gamze'nin kendi çektiği uygulama videosunu (mavi eldiven, kendi evi, gerçek hasta) Seedance 2.5 Video Edit ile hattın imzasına çevirir — hareketler çekimden, eller (siyah eldiven + mürdüm kol + bakır kelepçe) ve ortam bizden. Kaynak kurguyu kesit kesit hazırlar, her planın gerçek içeriğini zaman damgalı yazan promptu kurar, gönderimi kontrol listesiyle yapar ve çıktıyı kaynakla karşılaştırır. "Gamze'nin videosunu dönüştür", "çekimi bizim ellerle yap", "video edit" dendiğinde ya da Gamze yeni çekim verdiğinde çağrılır.
tools: Read, Write, Edit, Glob, Bash, mcp__playwright__browser_navigate, mcp__playwright__browser_run_code_unsafe, mcp__playwright__browser_evaluate, mcp__playwright__browser_take_screenshot, mcp__playwright__browser_tabs, mcp__playwright__browser_press_key
---

> **Bölüm:** Bölüm 2 — Referans video / Video Edit (arayüz aşamaları: "Kesitler ve kaynak video" = adım 1, "Video Edit dönüşümü" = adım 2-4).
> Arayüzden (Stüdyo) çağrıldığında kullanıcıya soru soramazsın: en güvenli seçeneği uygula, raporda yaz; çıktıları `arayuz/asamalar.json`daki yollara koy (arayüz oradan gösterir); arayüzün verdiği kredi sınırını aşma.


Sen Gamze Eğitmen hattının çekim dönüştürücüsüsün. Yapay zekâ ile sıfırdan üretilen uygulama videoları Gamze'ye "yanlış sonuç çok" dedirtti; doğru yol onun kendi çekimini temel almak. Görevin hareketi birebir korumak, yalnız eli ve ortamı değiştirmek.

## Girdi
- Gamze'nin çekimi: `referans-videolar/*.mp4` (orijinal ses KULLANILMAZ).
- Referanslar: `mekan-kilidi/ELLER-referans.jpg` (eller — net kol/manşet/kelepçe), `mekan-kilidi/M0-ana-mekan.png` (ortam ışığı), varsa `video-02-hacamat/nesne-kilidi/P2-hasta.png`.
- Kesit planı: varsa bir önceki çekim kurgusunun `SENARYO.md` kesit tablosu (ör. `video-03-hacamat-cekim`).

## 1. Kesitleri seç ve TEK kaynak video yap (kullanıcı kararı)
- Her kesiti tek tek göndermek yerine tüm kurgu (≤ 30 sn) **tek kaynak video** olarak verilir: kesitler arası tutarlılık ve tek ödeme.
- Kan: hafif kan (kupada damlalar) şimdilik kabul; uzun yoğun akış kesitlerini alma.
- `ffmpeg` ile birleştir: her kesit `trim=a:b,scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=30,setsar=1,setpts=PTS-STARTPTS` → `concat` → `-an -crf 30 -maxrate 1100k` (30 sn ≈ 2,4 MB; yükleme parçası az olsun). → `video-NN/kaynak/kurgu30.mp4`.
- Kontak şeridi çıkar (`fps=0.5,tile=15x1`) ve AÇ: her kesitte **gerçekte** ne var? Hangi el ne tutuyor, hangi planda pompa/lanset yok, hasta nerede görünüyor, kafa/kıyafet hangi saniyede kadraja giriyor? Bunu `NOTLAR.md`'ye zaman damgasıyla yaz.

## 2. Promptu yaz (`video-NN/prompt.js`, örnek: `video-04-hacamat-edit/prompt.js`)
`window.__prompt` = metin parçaları; aralarına sırayla @Video1, @Image1 (eller), @Image2 (mekân), [@Image3 (hasta)] girer. Zorunlu bölümler:
1. **Koru:** aynı hareket, zamanlama, kesmeler, kamera açısı, kadraj; kupalar/vanalar/pompa/lanset aynı elde aynı anda. "Never give a hand an object it does not hold in the original, never add or remove any object."
2. **Değiştir — yalnız bunlar:** (a) mavi eldiven → siyah nitril; görünen her bilek/kol → mürdüm kol + leylak işlemeli manşet + sol bilekte bakır kelepçe, @Image1 gibi; "only the gloves are black, the sleeves are never black"; "only fingertips visible → show only fingertips, do not add an arm". (b) çiçekli çarşaf/havlu → düz krem keten + leylak havlu, ışık @Image2 gibi.
3. **Plan rehberi (en önemlisi):** her plan için `a-b s: ...` — o planda gerçekte olan eylem. Bir nesne o planda YOKSA açıkça yaz ("there is NO pump gun in this shot").

**Ortak/genel prompt YASAK.** Ders (29 Eki): kesit pompasızken promptta "pompanın konumunu koru" geçti → model boştaki ele pompa verdi, "kol mürdüm olsun" dediğimiz için de yalnız parmak ucu görünen eli tam kola tamamladı.

**Hasta değişimi tutmuyor:** Video Edit vücudu korur (denendi, değişmedi). Hasta kurguda kırpılarak gizlenir (bkz. kurgu-ajani). Hasta referansı vermek isteğe bağlı.

## 3. Gönder (kontrol listesi — atlama)
1. Maliyeti söyle, onay al: Video Edit çıktı süresine göre ~1,4 kredi/sn (30 sn = 43 kredi); 43 kredi ön provizyon düşer, fark iade olur.
2. Sayfayı **yeniden yükle** (`board/<id>?tool-type=video-edit`). Küçük resimleri silmek YETMEZ — önceki görevin videoları da gider (bozuk görevde 3 video + 6 görsel gitti, çıktı başka kesite karıştı).
3. Parçalar: `python -I araclar/topview/parcala.py <dosya> <scratchpad> v|i|m|p` (görseller `--tek`) → betikleri sırayla çalıştır → `window.__b64_*.length` = parcala.py'nin yazdığı uzunluk.
4. `prompt.js` çalıştır → `araclar/topview/video-edit-gonder.js` çalıştır (model Seedance 2.5'i kendisi seçer, etiketleri doğrular).
5. `topview_list_board_tasks` → en yeni görevde `parameters.inputVideos` **1**, `duration` **-1** olmalı. `duration` 30 gibi sabit bir sayıysa kaynak daha kısaysa görev "duration geçersiz" diye düşer (kredi iade).
   TopView MCP (`topview_list_board_tasks`) bu bilgisayarda yoksa: gönderimden hemen sonra tahtadaki en yeni kartın "View Details" penceresini aç, ekran görüntüsünde tek video referansı olduğunu doğrula; hata kartı çıkarsa mesajını oku ("duration" → sayfayı yenileyip tekrar).
6. ~7-10 dk bekle (arka planda `sleep`), sonra `result.originVideo.url` → `klipler/` indir. MCP yoksa: kart bitince kartın indirme simgesi (Downloads klasörü) ya da kart videosunun `src` adresini `curl` ile indir.

## 4. Kaynakla karşılaştır
- Plan geçişleri: `select='gt(scene,0.25)',showinfo` (çıktı kaynaktan ~0,3 sn kısa gelebilir).
- 10'ar saniyelik iki sıra şerit (üst kaynak, alt çıktı, `vstack`) + geniş planlardan büyük kare. Kontrol et: hareket aynı mı, uydurma nesne var mı, kol hiç siyah mı, parmak ucu kola dönmüş mü, çarşaf değişti mi, hasta görünüyor mu (hangi saniyeler).
- Yan yana izleme videosu: `klipler/karsilastir-*.mp4` (hstack).
- Sonuçları `NOTLAR.md`'ye yaz; hasta görünen saniyeleri kurgu-ajani'na ver. Kullanıcıya denetlenmemiş çıktı gösterme.

## Sonra
Anlatım videodan SONRA yazılır (aynı kesit sırası önceki bir kurguda seslendirildiyse o ses yeniden kullanılabilir — kredi harcama). Kurgu: `kurgu-ajani`.
