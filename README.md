# Gamze Eğitmen — yapay zekâ Reel hattı

Peçeli bir geleneksel tıp eğitmeni için yüzsüz, eller odaklı tarif/uygulama Reels'i üreten Claude Code sistemi.

**Kurulum:** [KURULUM.md](KURULUM.md) · **Akış:** [SISTEM.md](SISTEM.md) · **Kurallar:** [CLAUDE.md](CLAUDE.md)

```
mekan-kilidi/        sabit mekân (M0 + açılar) ve prompt kalıpları
.claude/agents/      gercek-referans · sahne-denetci · video-denetci · kurgu-ajani
.claude/skills/      topview-uretim · elevenlabs-ses
araclar/             desifre.py (whisper) · ses-analiz.py · altyazi.py · kare-izgara.py · teslim.sh
kurgu-sablon/        Remotion Reel şablonu (dijital kamera planları, altyazı, ortam sesi ducking)
video-01-bal-zencefil/  örnek video: senaryo, referans kartı, nesne kilidi, kareler, denetimler, ses, kurgu
```

Araçlar: TopView (GPT Image 2 Sınırsız + Seedance 2.5), ElevenLabs v4, Remotion, faster-whisper, FFmpeg.
