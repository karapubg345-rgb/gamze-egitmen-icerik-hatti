# Kurulum (Windows)

## 1. Repoyu indir
PowerShell'i aç:
```powershell
winget install --id Git.Git -e
cd $HOME\Desktop
git clone https://github.com/karapubg345-rgb/gamze-egitmen-icerik-hatti.git gamze-egitmen
cd gamze-egitmen
```

## 2. Programları kur (tek komut)
```powershell
powershell -ExecutionPolicy Bypass -File .\kurulum.ps1
```
Kurar: Git, Node.js, Python, FFmpeg, uv, Chrome, Claude Code, Python paketleri (Pillow, NumPy), Remotion paketleri. Bittiğinde PowerShell'i kapatıp yeniden aç.

## 3. Hesaplar ve anahtarlar
| Ne | Neden | Nasıl |
|---|---|---|
| **Claude** (Pro/Max) | Sistemi çalıştıran asistan | `claude` yaz → tarayıcıda giriş yap |
| **TopView** (Ultra önerilir) | Görsel (Sınırsız mod) + Seedance video | topview.ai — Chrome'da giriş yapılı kalsın |
| **ElevenLabs** | Seslendirme | elevenlabs.io — Chrome'da giriş yapılı kalsın; "Gamze" sesini My Voices'a ekle |
| **Playwright MCP Bridge** (Chrome uzantısı) | Claude'un TopView/ElevenLabs sekmelerini kullanması | Chrome Web Store → "Playwright MCP Bridge" → kur → uzantı simgesi → token'ı kopyala → `.env` içinde `PLAYWRIGHT_MCP_EXTENSION_TOKEN=` |
| Serper / Pexels (isteğe bağlı) | Gerçek referans fotoğraf araması | `.env.example` içindeki adresler |

## 4. İlk çalıştırma
```powershell
cd $HOME\Desktop\gamze-egitmen
claude
```
İlk açılışta proje MCP sunucusunu (playwright) onayla. Sonra dene:
> video-01-bal-zencefil klasörünü incele ve sistemi bana özetle

Kurgu şablonunun çalıştığını kontrol etmek için:
> video-01'in kurgusunu kurgu-ajani talimatlarıyla yeniden kur ve test render al

(Örnek videonun mp4'leri repoda yok; ilk testte Seedance videosu yeniden üretilmeli ya da örnek dosya ayrıca kopyalanmalı.)

## 5. Stüdyo (arayüz) — günlük kullanım
4. adımdaki ilk `claude` açılışı (MCP onayı) bir kez yapıldıktan sonra repo klasöründeki **`STUDYO-AC.bat`** dosyasına çift tıkla. Chrome'da `http://127.0.0.1:4747` açılır; siyah pencere açık kaldıkça çalışır.

- **1 · Tarif videoları:** konu yaz → Oluştur → aşamaları sırayla çalıştır: Senaryo ve gerçek referans → Nesne kilidi ve kareler → Video üretimi (kredili) → Anlatım sesi (kredili) → Kurgu ve teslim.
- **2 · Referans video (Video Edit):** konu yaz → Oluştur → kendi çekimini sürükle-bırak → Kesitler ve kaynak video → Video Edit dönüşümü (kredili) → Anlatım sesi → Kurgu ve teslim.
- Her aşamanın çıktısı (senaryo, kareler, video, teslim dosyası) kartın altında görünür. Beğenmediğin aşamaya not yaz ("3. kareyi yeniden üret") ve **Yeniden çalıştır**.
- Kredili aşamalar, "Kredi harcanmasını onaylıyorum" kutusu işaretlenmeden ve verilen sınırın üstünde çalışmaz.
- Aynı anda tek aşama çalışır (tarayıcı ortak). Çalışırken TopView/ElevenLabs sekmelerine dokunma.

## 6. Terminalden yeni video (isteğe bağlı)
> Yeni video, Bölüm 1 (tarif): <konu>. SISTEM.md akışıyla başla.
> Yeni video, Bölüm 2 (referans video): referans-videolar/<dosya>.mp4. cekim-donusturucu ile başla.

## Sorun giderme
- **Playwright bağlanmıyor:** Chrome açık mı, uzantı etkin mi, token `.env`'de mi? `claude` içinde `/mcp` ile durumu gör.
- **Whisper yavaş:** ilk çalıştırmada model (~1,5 GB) iner; sonrakiler hızlıdır.
- **Render "dosya kilitli":** oynatıcıda açık olan videoyu kapat; teslim.sh yeni dosyayı `.yeni.mp4` olarak bırakır.
