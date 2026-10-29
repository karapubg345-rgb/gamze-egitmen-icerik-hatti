# Türkçe deşifre: faster-whisper (CPU, int8) + kelime zamanları + düzeltme sözlükleri.
#   uv run --with faster-whisper python desifre.py --audio anlatim.flac --out desifre/ [--model medium]
#          [--sozluk ../desifre/sozluk.json] [--proje desifre/duzeltmeler.json] [--sadece-duzelt]
# Çıktılar (out/):
#   ham.json        whisper'ın kendisi (segment + kelime), düzeltmeler tekrar uygulanabilsin diye saklanır
#   desifre.json    düzeltilmiş: [{start, end, text, words: [{w, s, e}]}]   ← plan bu zamanlarla yazılır
#   okunur.txt      "[01:23.4] cümle" satırları — plan yazarken okunacak dosya
#   supheli.txt     olasılığı düşük kelimeler (yanlış duyulmuş olabilir) → duzeltmeler.json'a eklenecek adaylar
# Düzeltme dosyası: {"vocab": ["Claude", ...], "phrases": [["top ve ev", "TopView"]], "words": {"pomple": "prompt"}}
#   vocab   → whisper'a ipucu (hotwords + initial_prompt); phrases → çok kelimeli; words → tek kelime (küçük harfle eşleşir)
import argparse, json, os, re, sys, time

sys.stdout.reconfigure(encoding="utf-8")  # Windows konsolu cp1252: → ve Türkçe harfler için

ap = argparse.ArgumentParser()
ap.add_argument("--audio")
ap.add_argument("--out", required=True)
ap.add_argument("--model", default="medium")
ap.add_argument("--sozluk", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "sozluk.json"))
ap.add_argument("--proje")
ap.add_argument("--sadece-duzelt", action="store_true", help="whisper'ı çalıştırma, ham.json'a düzeltmeleri yeniden uygula")
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)

def load(p):
    if not p or not os.path.exists(p): return {"vocab": [], "phrases": [], "words": {}}
    d = json.load(open(p, encoding="utf-8"))
    return {"vocab": d.get("vocab", []), "phrases": d.get("phrases", []), "words": d.get("words", {})}
G, P = load(a.sozluk), load(a.proje)
VOCAB = list(dict.fromkeys(G["vocab"] + P["vocab"]))
PHRASES = sorted(P["phrases"] + G["phrases"], key=lambda x: -len(x[0].split()))  # uzun ifade önce
WORDS = {**G["words"], **P["words"]}  # proje sözlüğü kazanır

ham_path = os.path.join(a.out, "ham.json")
if not a.sadece_duzelt:
    import subprocess, numpy as np
    from faster_whisper import WhisperModel
    t0 = time.time()
    # ses ffmpeg ile çözülür (16 kHz mono float): faster-whisper'ın PyAV yolu yeni av sürümleriyle kırık
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", a.audio, "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
    audio = np.frombuffer(pcm, dtype=np.float32)
    m = WhisperModel(a.model, device="cpu", compute_type="int8")
    segs, info = m.transcribe(audio, language="tr", word_timestamps=True, beam_size=5,
                              vad_filter=False,  # Silero VAD girişteki konuşmayı atıyordu (Animasyon Canavarı ilk 9 sn)
                              initial_prompt=("Konular: " + ", ".join(VOCAB) + ".") if VOCAB else None,
                              hotwords=" ".join(VOCAB) if VOCAB else None)
    ham = []
    for s in segs:
        if s.no_speech_prob > 0.6 and s.avg_logprob < -1.0: continue  # sessizlikte uydurulan cümle
        ham.append({"start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip(),
                    "words": [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)} for w in s.words]})
        el = time.time() - t0
        print(f"\r{s.end / 60:5.1f}/{info.duration / 60:.1f} dk · {el / 60:.1f} dk geçti · hız {s.end / max(el, 1):.1f}×", end="", flush=True)
    print()
    json.dump(ham, open(ham_path, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
ham = json.load(open(ham_path, encoding="utf-8"))

PUNCT = r"[.,!?;:…]+$"
norm = lambda w: re.sub(PUNCT, "", w.strip().lower())
tail = lambda w: (re.search(PUNCT, w.strip()) or [""])[0]
def fixword(w):
    core, t = re.sub(PUNCT, "", w.strip()), tail(w)
    return WORDS.get(core.lower(), core) + t

out, sus = [], []
for s in ham:
    ws, i, words = s["words"], 0, []
    while i < len(ws):
        hit = None
        for ph, rep in PHRASES:
            toks = ph.lower().split(); n = len(toks)
            if [norm(x["w"]) for x in ws[i:i + n]] == toks: hit = (n, rep); break
        if hit:
            n, rep = hit
            words.append({"w": rep + tail(ws[i + n - 1]["w"]), "s": ws[i]["s"], "e": ws[i + n - 1]["e"]}); i += n
        else:
            x = ws[i]; fw = fixword(x["w"])
            if x.get("p", 1) < 0.4 and fw == x["w"]: sus.append((x["s"], x["w"], x["p"], s["text"]))
            words.append({"w": fw, "s": x["s"], "e": x["e"]}); i += 1
    merged = []  # kesme işaretiyle başlayan ekleri ('ı, 'a) önceki kelimeye yapıştır
    for w in words:
        if merged and w["w"].startswith("'"): merged[-1] = {**merged[-1], "w": merged[-1]["w"] + w["w"], "e": w["e"]}
        elif w["w"]: merged.append(w)
    if merged: out.append({"start": s["start"], "end": s["end"], "text": " ".join(w["w"] for w in merged), "words": merged})

json.dump(out, open(os.path.join(a.out, "desifre.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
mmss = lambda t: f"{int(t // 60):02}:{t % 60:04.1f}"
open(os.path.join(a.out, "okunur.txt"), "w", encoding="utf-8").write("\n".join(f"[{mmss(s['start'])}] {s['text']}" for s in out) + "\n")
open(os.path.join(a.out, "supheli.txt"), "w", encoding="utf-8").write(
    "# olasılığı < 0,4 olan kelimeler: yanlışsa desifre/duzeltmeler.json → words'e ekle, sonra --sadece-duzelt\n" +
    "\n".join(f"[{mmss(t)}] {w!r} p={p}  ← {txt}" for t, w, p, txt in sus) + "\n")
print(f"{len(out)} cümle · {sum(len(s['words']) for s in out)} kelime · {len(sus)} şüpheli → {a.out}")
