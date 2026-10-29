# Gamze Eğitmen — yapay zekâ Reel hattı

Peçeli bir geleneksel tıp eğitmeni için yüzsüz, eller odaklı tarif/uygulama Reels'i üreten Claude Code sistemi.

**Kurulum:** [KURULUM.md](KURULUM.md) · **Akış:** [SISTEM.md](SISTEM.md) · **Kurallar:** [CLAUDE.md](CLAUDE.md)

**Kullanım:** `STUDYO-AC.bat` → tarayıcıda iki bölüm: **1 · Tarif videoları** (sıfırdan yapay zekâ) ve **2 · Referans video** (Gamze'nin çekimi → Seedance Video Edit). Her aşama tek tıkla çalışır, çıktısı aynı sayfada görünür.

```
mekan-kilidi/        sabit mekân (M0 + açılar) ve prompt kalıpları
arayuz/              Stüdyo: sunucu.mjs (Node, bağımlılıksız) · asamalar.json (bölümler, aşamalar, talimatlar) · public/index.html
.claude/agents/      Bölüm 1: gercek-referans · referans-uyum · sahne-denetci | Bölüm 2: cekim-donusturucu | ortak: video-denetci · kurgu-ajani
.claude/skills/      topview-uretim · elevenlabs-ses
araclar/             topview/ (parcala.py, video-edit-gonder.js) · desifre.py (whisper) · ses-analiz.py · altyazi.py · kare-izgara.py · teslim.sh
kurgu-sablon/        Remotion Reel şablonu (dijital kamera planları, altyazı, ortam sesi ducking)
video-01-bal-zencefil/  Bölüm 1 örneği: senaryo, referans kartı, nesne kilidi, kareler, denetimler, ses, kurgu
video-04-hacamat-edit/  Bölüm 2 örneği: NOTLAR.md, prompt.js (Video Edit), kurgu
```

Araçlar: TopView (GPT Image 2 Sınırsız + Seedance 2.5), ElevenLabs v4, Remotion, faster-whisper, FFmpeg.
