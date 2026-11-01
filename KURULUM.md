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
| **playwright** (`.mcp.json`'da hazır) | **Kredisiz mod için evet** — TopView Sınırsız modu Chrome üzerinden kullanır | Chrome Web Store → **"Playwright MCP Bridge"** → kur → uzantı simgesi → token'ı kopyala → `.env` içinde `PLAYWRIGHT_MCP_EXTENSION_TOKEN=<token>` → `. .\araclar\env-yukle.ps1` (token'ı ortam değişkeni yapar; `.mcp.json` oradan okur) |
| **ElevenLabs** (`.mcp.json`'da hazır, barındırılan) | **Evet** — anlatım sesi (iki modda) | repo klasöründe `claude` → `/mcp` → `elevenlabs` → **Authenticate** → tarayıcıda ElevenLabs hesabıyla izin ver. API anahtarı gerekmez |
| **TopView** (claude.ai bağlayıcısı) | **Kredili mod için evet** | claude.ai → Ayarlar → Bağlayıcılar → TopView → bağlan (Claude Code'a aynı claude.ai hesabıyla giriş yapılmış olmalı). Kredili modda tüm üretim bundan gider; kredisiz modda görev durumunu/indirme adresini okur |

İlk açılış (bir kez, zorunlu): repo klasöründe
```powershell
claude
```
→ projenin MCP sunucularını (playwright, elevenlabs) kullanma onayını **ver** → `/mcp` yaz: `playwright` **connected** olmalı (Chrome açık ve uzantı etkin olmalı); `elevenlabs` → **Authenticate** → ElevenLabs hesabıyla izin ver → `/exit`. Bu onay olmadan Stüdyo'daki aşamalar tarayıcıyı kullanamaz.

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
| MCP | `claude mcp list` | `playwright … Connected`, `elevenlabs … Connected` |

İlk çalıştırmada Whisper "medium" modeli (~1,5 GB) iner; yalnız hızlı deneme için `-Hizli` ("small" model). Sonunda "Her şey hazır" yazmalı.

## 6. Telegram botu (telefondan kullanım)
1. Telegram'da **@BotFather** → `/newbot` → ad ver → verdiği token'ı `.env`'e yaz: `TELEGRAM_BOT_TOKEN=<token>`.
2. `STUDYO-AC.bat`'ı aç (yeniden başlat), Telegram'da yeni bota herhangi bir şey yaz → bot **sohbet kimliğinizi** söyler → `.env`'e `TELEGRAM_CHAT_ID=<kimlik>` yaz → Stüdyo'yu yeniden aç. Bot yalnız bu kimliğe cevap verir (repo herkese açık, bu kilit şart).
3. Kullanım:
   - `/yeni bal zencefil 20sn` → tarif videosu, kredisiz (0 kredi).
   - `/yeni bal zencefil 20sn kredili` → tarayıcı açılmadan hızlı (bütçe otomatik hesaplanır; `40kredi` yazılırsa o).
   - Çekim videosu: videoyu sohbete gönder, açıklamasına konuyu yaz (`hacamat 25sn`). Telegram botlar **20 MB**'den büyük dosya indiremez; büyükse Stüdyo'dan yükleyin.
   - Hat iki yerde düğmeyle onay ister: **kareler** (çekimde **kesitler**) hazır olunca ve **teslimde**. "Düzelt"e basıp kısa not yazınca o aşama notla yeniden yapılır.
   - `/durum`, `/dur`, `/guncelle` (GitHub'dan son sürümü çeker, Stüdyo'yu kendisi yeniden başlatır).
4. **Bilgisayar açık kalmalı:** bot ve üretim bu bilgisayarda çalışır. Denetim Masası → Güç seçenekleri → "Bilgisayarı uyku moduna geçir: **Hiçbir zaman**". Açılışta kendiliğinden başlasın: `Win+R` → `shell:startup` → açılan klasöre `STUDYO-AC.bat`'ın **kısayolunu** koy.

## 7. Stüdyo (bilgisayardan)
Repo klasöründeki **`STUDYO-AC.bat`** dosyasına çift tıkla (masaüstüne kısayol yapılabilir). Chrome'da `http://127.0.0.1:4747` açılır; siyah pencere açık kaldıkça arayüz ve Telegram botu çalışır.

- **Yeni üretim:** konu → **mod** (Kredisiz / Kredili) → **süre** (10-60 sn; 30 sn üstü iki parçada üretilip birleştirilir) → Oluştur. "Hemen otomatik başlat" işaretliyse hat sona kadar kendi yürür, yalnız onay kapılarında durur (onay şeridi hem burada hem Telegram'da çıkar).
  - **Kredisiz:** TopView Sınırsız mod, tarayıcıdan; kareler ve video 0 kredi. Video kuyrukta bekler.
  - **Kredili:** Chrome açılmaz; TopView MCP + ElevenLabs MCP. Kare 0,2 kredi, video ~1,2 kredi/sn. Baştaki bütçe tek onaydır; aşılırsa hat durur.
- **1 · Tarif videoları:** Senaryo ve gerçek referans → Nesne kilidi ve kareler (onay) → Video üretimi → Anlatım sesi → Kurgu ve teslim (onay).
- **2 · Referans video (Video Edit):** Oluştur → kendi çekimini sürükle-bırak → **▶ Tümünü çalıştır** → Kesitler (onay) → Video Edit dönüşümü → Anlatım sesi → Kurgu ve teslim (onay).
- Her aşamanın çıktısı kartın altında görünür. Tek aşamayı elle de çalıştırabilirsin: masaya tıkla, not yaz, **Yeniden görevlendir**.
- Aynı anda tek aşama çalışır; fazlası sıraya girer. Kredisiz modda çalışırken TopView/ElevenLabs sekmelerine dokunma; Chrome açık kalsın.

## 8. Terminalden (isteğe bağlı)
Repo klasöründe `claude` →
> Yeni video, Bölüm 1 (tarif): <konu>. SISTEM.md akışıyla başla.
> Yeni video, Bölüm 2 (referans video): referans-videolar/<dosya>.mp4. cekim-donusturucu ile başla.

## Güncelleme
Telegram'dan `/guncelle` yeterli (paketler değiştiyse aşağıdakini de çalıştırın). Elle:
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
