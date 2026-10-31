# Kurulum (Windows, sıfırdan)

Toplam ~45-60 dk (indirmeler dahil). Sıra önemli.

## 1. Repoyu indir
PowerShell'i aç:
```powershell
winget install --id Git.Git -e
```
PowerShell'i kapatıp yeniden aç, sonra:
```powershell
cd $HOME\Desktop
git clone https://github.com/karapubg345-rgb/gamze-egitmen-icerik-hatti.git gamze-egitmen
cd gamze-egitmen
```

## 2. Programları kur (tek komut)
```powershell
powershell -ExecutionPolicy Bypass -File .\kurulum.ps1
```
| Kurulan | Ne için |
|---|---|
| Git, Node.js LTS, Python 3.12, FFmpeg, uv, Chrome | temel araçlar |
| Claude Code (`claude`) | sistemi çalıştıran asistan |
| Pillow, NumPy | `araclar/` Python betikleri |
| faster-whisper (uv önbelleği) | anlatım deşifresi, altyazı zamanları |
| Remotion paketleri + render tarayıcısı (`kurgu-sablon/`) | kurgu ve render |
| `@playwright/mcp` (npx önbelleği) | Claude'un Chrome'u kullanması |

Bittiğinde **PowerShell'i kapatıp yeniden aç** (yeni programlar PATH'e girsin).

## 3. Hesaplar
| Ne | Neden | Nasıl |
|---|---|---|
| **Claude** (Pro/Max) | Sistemi çalıştıran asistan | repo klasöründe `claude` yaz → tarayıcıda giriş yap |
| **TopView** (Ultra önerilir) | Görsel (Sınırsız mod) + Seedance video / Video Edit | topview.ai — **Chrome'da** giriş yapılı kalsın |
| **ElevenLabs** | Seslendirme | elevenlabs.io — Chrome'da giriş yapılı kalsın; "Gamze" sesini (`oDu9B15AlAcHxBVp7d6a`) My Voices'a ekle |
| Serper / Pixabay (isteğe bağlı) | Gerçek referans fotoğraf araması | `.env.example` içindeki adresler; yoksa Bing Görseller tarayıcıdan kullanılır |

## 4. MCP (Claude'un araç bağlantıları)
| MCP | Zorunlu mu | Kurulum |
|---|---|---|
| **playwright** (`.mcp.json`'da hazır) | **Evet** — TopView ve ElevenLabs'i Chrome üzerinden kullanır | Chrome Web Store → **"Playwright MCP Bridge"** → kur → uzantı simgesi → token'ı kopyala → `.env` içinde `PLAYWRIGHT_MCP_EXTENSION_TOKEN=<token>` → `. .\araclar\env-yukle.ps1` (token'ı ortam değişkeni yapar; `.mcp.json` oradan okur) |
| **TopView** (claude.ai bağlayıcısı) | Hayır (kolaylık) | claude.ai → Ayarlar → Bağlayıcılar → TopView → bağlan. Görev durumunu/indirme adresini doğrudan okur; yoksa ajanlar tahtadaki kartları kullanır |

İlk açılış (bir kez, zorunlu): repo klasöründe
```powershell
claude
```
→ "Bu projenin MCP sunucusunu (playwright) kullan" onayını **ver** → `/mcp` yaz, `playwright` **connected** olmalı (Chrome açık ve uzantı etkin olmalı) → `/exit`. Bu onay olmadan Stüdyo'daki aşamalar tarayıcıyı kullanamaz.

## 5. Doğrulama (örnek FFmpeg, Whisper, Remotion, MCP)
```powershell
powershell -ExecutionPolicy Bypass -File .\kurulum-dogrula.ps1
```
Repodaki gerçek dosyalarla dener, çıktıları `ornekler\cikti\` klasörüne koyar ve klasörü açar:
| Örnek | Ne yapar | Beklenen |
|---|---|---|
| FFmpeg | `mekan-kilidi/M0` görselinden 31 sn yakınlaşan dikey video | `ffmpeg-ornek.mp4` (1080×1920) |
| Whisper | video-03 anlatımını (Gamze sesi) deşifre eder | `whisper\okunur.txt` — "hacamatta kupaları sırta bu şekilde sırayla yerleştiriyoruz" |
| Remotion | aynı anlatım + altyazı + kanca ile 10 sn Reel | `remotion-ornek.mp4` — "HACAMAT NASIL YAPILIR" kancası, altyazılar, ses |
| MCP | `claude mcp list` | `playwright … Connected` |

İlk çalıştırmada Whisper "medium" modeli (~1,5 GB) iner; yalnız hızlı deneme için `-Hizli` ("small" model). Sonunda "Her şey hazır" yazmalı.

## 6. Stüdyo (günlük kullanım)
Repo klasöründeki **`STUDYO-AC.bat`** dosyasına çift tıkla (masaüstüne kısayol yapılabilir). Chrome'da `http://127.0.0.1:4747` açılır; siyah pencere açık kaldıkça çalışır.

- **1 · Tarif videoları:** konu yaz → Oluştur → aşamaları sırayla çalıştır: Senaryo ve gerçek referans → Nesne kilidi ve kareler → Video üretimi (kredili) → Anlatım sesi (kredili) → Kurgu ve teslim.
- **2 · Referans video (Video Edit):** konu yaz → Oluştur → kendi çekimini sürükle-bırak → Kesitler ve kaynak video → Video Edit dönüşümü (kredili) → Anlatım sesi → Kurgu ve teslim.
- Her aşamanın çıktısı (senaryo, kareler, video, teslim dosyası) kartın altında görünür. Beğenmediğin aşamaya not yaz ("3. kareyi yeniden üret") ve **Yeniden çalıştır**.
- Kredili aşamalar, "Kredi harcanmasını onaylıyorum" kutusu işaretlenmeden ve verilen sınırın üstünde çalışmaz.
- Aynı anda tek aşama çalışır (tarayıcı ortak). Çalışırken TopView/ElevenLabs sekmelerine dokunma; Chrome açık kalsın.

## 7. Terminalden (isteğe bağlı)
Repo klasöründe `claude` →
> Yeni video, Bölüm 1 (tarif): <konu>. SISTEM.md akışıyla başla.
> Yeni video, Bölüm 2 (referans video): referans-videolar/<dosya>.mp4. cekim-donusturucu ile başla.

## Güncelleme
```powershell
cd $HOME\Desktop\gamze-egitmen
git pull
powershell -ExecutionPolicy Bypass -File .\kurulum.ps1
```

## Sorun giderme
- **Playwright bağlanmıyor:** Chrome açık mı, uzantı etkin mi, token `.env`'de mi? Token'ı değiştirdiysen `. .\araclar\env-yukle.ps1` çalıştır ve PowerShell'i/Stüdyo'yu yeniden aç. `claude` içinde `/mcp` ile durumu gör.
- **Stüdyo aşaması hemen "Hata" oluyor:** kartın "Çalışma günlüğü"nü aç. "MCP" geçiyorsa 4. adımdaki ilk `claude` onayı yapılmamış.
- **Whisper yavaş:** ilk çalıştırmada model iner; sonrakiler hızlıdır.
- **Render "dosya kilitli":** oynatıcıda açık olan videoyu kapat; teslim.sh yeni dosyayı `.yeni.mp4` olarak bırakır.
- **`kurulum.ps1` "winget bulunamadı":** Microsoft Store → "Uygulama Yükleyicisi"ni güncelle.
- **Port meşgul (4747):** Stüdyo zaten açık; tarayıcıda `http://127.0.0.1:4747` adresine git.
