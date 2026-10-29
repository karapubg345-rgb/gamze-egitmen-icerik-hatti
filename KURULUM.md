# Kurulum (Windows)

## 1. Repoyu indir
PowerShell'i aç:
```powershell
winget install --id Git.Git -e
cd $HOME\Desktop
git clone https://github.com/<hesap>/gamze-egitmen-icerik-hatti.git gamze-egitmen
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

## 5. Yeni video
> Yeni video: <konu / tarif>. SISTEM.md akışıyla başla.

Claude sırasıyla senaryo → gerçek referans → nesne kilidi → kareler (denetim) → video (onayınla, kredili) → ses → kurgu → `video-NN/teslim/` adımlarını yürütür.

## Sorun giderme
- **Playwright bağlanmıyor:** Chrome açık mı, uzantı etkin mi, token `.env`'de mi? `claude` içinde `/mcp` ile durumu gör.
- **Whisper yavaş:** ilk çalıştırmada model (~1,5 GB) iner; sonrakiler hızlıdır.
- **Render "dosya kilitli":** oynatıcıda açık olan videoyu kapat; teslim.sh yeni dosyayı `.yeni.mp4` olarak bırakır.
