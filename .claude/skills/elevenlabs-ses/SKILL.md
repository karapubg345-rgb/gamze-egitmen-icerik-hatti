---
name: elevenlabs-ses
description: Reel anlatımını ElevenLabs (Eleven v4, duygu etiketli) ile web arayüzünden üretir, sesi tarayıcıdan alır, whisper ile doğrular. "seslendir", "anlatımı üret", "ElevenLabs" dendiğinde kullan.
---

# ElevenLabs seslendirme

## 1. Metin
- SENARYO.md'deki anlatım. Duygu etiketleri cümle başında: `[calmly]`, `[short pause]`, `[matter-of-fact]`, `[cheerfully]`, `[excited]`, `[whispers]`, `[slowly]`.
- Rakamları okunduğu gibi yaz ("1 tatlı kaşığı" → "bir tatlı kaşığı").
- Karakter ≈ kredi. Metni ve tahmini krediyi kullanıcıya göster.

## 2. Ses kimliği
`.env` → `ELEVENLABS_VOICE_ID`. Demo sesi: "Gamze – Soft, Young and Encouraging" (`oDu9B15AlAcHxBVp7d6a`). Ses hesabın "My voices"ında yoksa ses seçicide ara → "Add to My Voices".

## 3. Üret (Playwright, uzantı modu)
1. `https://elevenlabs.io/app/speech-synthesis/text-to-speech`, `main .ProseMirror` bekle.
2. `document.querySelector('main .ProseMirror').editor.commands.setContent({type:'doc',content:[{type:'dialogueNode',attrs:{type:'div',id:crypto.randomUUID(),voiceId:'<ID>'},content:[{type:'text',text:'<metin>'}]}]}, true)`.
3. Doğrula: "Voice not found" yok, blokta ses adı görünüyor; Settings'te model **Eleven v4**.
4. `getByTestId('tts-generate').click({force:true})`; "credits remaining" sayısı değişince bitti. Çalan sesi durdur.

## 4. Sesi al
Oynatıcıdaki ses **blob**'dur ve fetch/XHR ile okunamaz. Gerçek zamanlı kaydet:
```js
() => new Promise(res => { const a=document.querySelector('audio'); a.currentTime=0;
  const mr=new MediaRecorder(a.captureStream(),{mimeType:'audio/webm;codecs=opus',audioBitsPerSecond:192000});
  const ch=[]; mr.ondataavailable=e=>ch.push(e.data);
  mr.onstop=()=>{const f=new FileReader(); f.onload=()=>res(f.result); f.readAsDataURL(new Blob(ch,{type:'audio/webm'}));};
  a.onended=()=>setTimeout(()=>mr.stop(),300); mr.start(); a.play(); })
```
`browser_evaluate(..., filename=<geçici>.txt)` → data URI'yi çöz → `ses/<ad>.webm` → `ffmpeg -c:a libmp3lame -b:a 192k ses/<ad>.mp3`.
(`.env`'de `ELEVENLABS_API_KEY` varsa bunun yerine API ile doğrudan mp3 indir: `POST https://api.elevenlabs.io/v1/text-to-speech/<voice_id>` model `eleven_v3`/v4.)

## 5. Doğrula
`uv run --with faster-whisper python araclar/desifre.py --audio ses/<ad>.mp3 --out ses/desifre --model medium` → `okunur.txt`'yi metinle karşılaştır. Eksik/yanlış kelime → kullanıcıya söyle (whisper hatası olabilir: "tarçım", "dilinmeyin"; şüpheliyse dinlet).
