// Bitmiş videoyu Gamze Hoca'nın SÖZLERİYLE yeniden kurgular: ses (ElevenLabs Voice Changer çıktısı ya da Hoca'nın
// kaydı) cümle cümle, o cümlenin anlattığı plana yerleştirilir; video kesitleri sese uysun diye kesilir/hızlanır/
// yavaşlar/yeniden kullanılır. Cümlelerin içi DEĞİŞMEZ (kelime, sıra, ritim, duygu): yalnız nereye konduğu değişir.
// Yerleşim kararını (hangi cümle hangi plana) Claude verir (arayuz/hoca-sesi-istem.md), bu betik uygular ve render alır.
//
//   node araclar/hoca-sesi.mjs <video klasörü | numara> <yerlesim.json>
//
// yerlesim.json (yollar video klasörüne göre):
// {
//   "ses": "ses/hoca-sesi/eleven.mp3",                 // cümleleri alınacak ses
//   "desifre": "ses/hoca-sesi/desifre/desifre.json",   // o sesin whisper kelime zamanları
//   "kesitler": [ { "a": 0, "b": 4.58, "hiz": 1, "z": 1 }, ... ],   // kurgu/public/video.mp4'ten sırayla; hiz 0.7-1.6; z = yakınlık çarpanı (tekrar kullanılan planı farklı göstermek için)
//   "parcalar": [ { "a": 0, "b": 3.42, "t": 0 }, ... ]               // sesten [a,b] aralığı, çıktıda t anına (tempo hep 1: ses değişmez)
// }
// Çıktı: <video>/teslim/<video>-hoca-sesi.mp4 · çalışma klasörü <video>/kurgu-hoca-sesi/ · mevcut teslim dosyasına dokunulmaz.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KAYIT_KLASORLERI = ['sesli-tarif', 'sesli-anlatim'];
const HIZ = [0.7, 1.6];

function calistir(prog, args, ek = {}) {
  const r = spawnSync(prog, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 64e6, ...ek });
  if (r.status !== 0) throw new Error(`${prog} hata verdi: ${(r.stderr || r.stdout || r.error?.message || '').trim().split('\n').slice(-4).join(' ')}`);
  return r.stdout;
}
const sure = f => Number(calistir('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).trim());
const y2 = x => Math.round(x * 100) / 100;

// Videonun Hoca kaydı (Telegram sesli mesajı) ve zamanlı deşifresi.
export function kayitBul(klasor) {
  for (const k of KAYIT_KLASORLERI) {
    const d = path.join(KOK, klasor, k);
    if (!fs.existsSync(path.join(d, 'desifre.json'))) continue;
    const kayit = fs.readdirSync(d).find(f => /^kayit\.\w+$/i.test(f));
    if (kayit) return { kayit: path.join(d, kayit), desifre: path.join(d, 'desifre.json') };
  }
  return null;
}

// Uygun video: Hoca kaydı + kurgu zaman çizelgesi + teslim videosu olan. En yenisi = teslim dosyası en yeni olan.
export function uygunVideolar() {
  return fs.readdirSync(KOK).filter(k => /^video-\d+/.test(k)).flatMap(k => {
    const teslim = path.join(KOK, k, 'teslim');
    const mp4 = fs.existsSync(teslim) ? fs.readdirSync(teslim).filter(f => /\.mp4$/i.test(f) && !/-hoca-sesi\.mp4$/i.test(f)) : [];
    if (!mp4.length || !kayitBul(k) || !fs.existsSync(path.join(KOK, k, 'kurgu', 'src', 'timeline.json'))) return [];
    return [{ klasor: k, zaman: Math.max(...mp4.map(f => fs.statSync(path.join(teslim, f)).mtimeMs)) }];
  }).sort((a, b) => b.zaman - a.zaman).map(x => x.klasor);
}

export function videoSec(arg) {
  const liste = uygunVideolar();
  if (!arg) return liste[0] || null;
  const n = String(arg).trim();
  return liste.find(k => k === n || k.startsWith(`video-${n.padStart(2, '0')}-`) || k.startsWith(`video-${n}-`)) || null;
}

// Whisper'ın bilinen yanlış duyuşları (araclar/sozluk.json → words). Yalnız altyazı yazımı; ses değişmez.
function duzeltici() {
  let m = {};
  try { m = JSON.parse(fs.readFileSync(path.join(KOK, 'araclar', 'sozluk.json'), 'utf8')).words || {}; } catch {}
  return w => {
    const [, govde, nokta] = w.match(/^(.*?)([.,!?…]*)$/u);
    return (m[govde.toLocaleLowerCase('tr')] ?? govde) + nokta;
  };
}

function dogrula(Y, vidSure, sesSure) {
  if (!Y.kesitler?.length || !Y.parcalar?.length) throw new Error('yerleşimde kesitler ve parcalar olmalı');
  let dur = 0;
  for (const [i, k] of Y.kesitler.entries()) {
    const hiz = k.hiz ?? 1;
    if (!(k.a >= 0 && k.b <= vidSure + 0.05 && k.b - k.a >= 0.3)) throw new Error(`kesit ${i + 1}: [${k.a}, ${k.b}] videonun (${vidSure.toFixed(2)} sn) dışında ya da çok kısa`);
    if (hiz < HIZ[0] || hiz > HIZ[1]) throw new Error(`kesit ${i + 1}: hız ${hiz} sınır dışı (${HIZ.join('-')})`);
    dur += (k.b - k.a) / hiz;
  }
  const P = [...Y.parcalar].sort((a, b) => a.t - b.t);
  for (const [i, p] of P.entries()) {
    if (!(p.a >= 0 && p.b <= sesSure + 0.05 && p.b > p.a)) throw new Error(`parça ${i + 1}: [${p.a}, ${p.b}] sesin (${sesSure.toFixed(2)} sn) dışında`);
    if (p.t + (p.b - p.a) > dur + 0.05) throw new Error(`parça ${i + 1} videonun sonunu aşıyor (${(p.t + p.b - p.a).toFixed(2)} > ${dur.toFixed(2)} sn): kesit ekle ya da yavaşlat`);
    if (i && p.t < P[i - 1].t + (P[i - 1].b - P[i - 1].a) - 0.02) throw new Error(`parça ${i + 1} öncekinin üstüne biniyor`);
  }
  if (dur > 60.5) throw new Error(`çıktı ${dur.toFixed(1)} sn; üst sınır 60 sn`);
  return { dur: y2(dur), P };
}

export function hocaSesiRender(klasor, yerlesimYolu, log = console.log) {
  const k = path.join(KOK, klasor);
  const Y = JSON.parse(fs.readFileSync(yerlesimYolu, 'utf8'));
  const sesYol = path.resolve(k, Y.ses), desYol = path.resolve(k, Y.desifre);
  const eski = path.join(k, 'kurgu'), yeni = path.join(k, 'kurgu-hoca-sesi');
  const kaynakVideo = path.join(eski, 'public', JSON.parse(fs.readFileSync(path.join(eski, 'src', 'timeline.json'), 'utf8')).video);
  const { dur, P } = dogrula(Y, sure(kaynakVideo), sure(sesYol));

  // 1) Kurguyu kopyala (node_modules ve out hariç); node_modules şablondakine bağlanır.
  fs.rmSync(yeni, { recursive: true, force: true });
  fs.cpSync(eski, yeni, { recursive: true, filter: s => !/[\\/](node_modules|out)$/.test(s) });
  const nm = path.join(KOK, 'kurgu-sablon', 'node_modules');
  if (!fs.existsSync(nm)) throw new Error('kurgu-sablon/node_modules yok (kurulum eksik: kurgu-sablon klasöründe npm ci).');
  fs.symlinkSync(nm, path.join(yeni, 'node_modules'), 'junction');
  const pub = path.join(yeni, 'public');
  const tlYol = path.join(yeni, 'src', 'timeline.json');
  const tl = JSON.parse(fs.readFileSync(tlYol, 'utf8'));

  // 2) Video ve ortam sesi: kesitler sırayla, her biri kendi hızında (ortam sesi görüntüyle senkron kalır).
  const K = Y.kesitler.map(x => ({ ...x, hiz: x.hiz ?? 1, z: x.z ?? 1 }));
  const vf = K.map((x, i) => `[0:v]trim=${x.a}:${x.b},setpts=(PTS-STARTPTS)/${x.hiz},fps=30[v${i}]`);
  vf.push(`${K.map((_, i) => `[v${i}]`).join('')}concat=n=${K.length}:v=1:a=0[v]`);
  calistir('ffmpeg', ['-v', 'error', '-y', '-i', kaynakVideo, '-filter_complex', vf.join(';'), '-map', '[v]', '-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', path.join(pub, 'video-hoca.mp4')]);
  const ortamYol = tl.ambient?.src && path.join(pub, tl.ambient.src);
  if (ortamYol && fs.existsSync(ortamYol)) {
    const af = K.map((x, i) => `[0:a]atrim=${x.a}:${x.b},asetpts=PTS-STARTPTS,atempo=${x.hiz},afade=t=in:d=0.03,afade=t=out:st=${Math.max(0, (x.b - x.a) / x.hiz - 0.04).toFixed(3)}:d=0.04[a${i}]`);
    af.push(`${K.map((_, i) => `[a${i}]`).join('')}concat=n=${K.length}:v=0:a=1[a]`);
    calistir('ffmpeg', ['-v', 'error', '-y', '-i', ortamYol, '-filter_complex', af.join(';'), '-map', '[a]', '-ar', '48000', '-ac', '2', path.join(pub, 'ortam-hoca.wav')]);
    tl.ambient.src = 'ortam-hoca.wav';
  }

  // 3) Ses: parçalar olduğu gibi (tempo/filtre yok), yalnız yerine konur; aralar sessiz (ortam sesi açılır).
  const sf = P.map((p, i) => { const d = Math.round(p.t * 1000); return `[0:a]atrim=${p.a}:${p.b},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st=${(p.b - p.a - 0.02).toFixed(3)}:d=0.02,adelay=${d}|${d}[s${i}]`; });
  sf.push(`${P.map((_, i) => `[s${i}]`).join('')}amix=inputs=${P.length}:normalize=0:duration=longest,apad=whole_dur=${dur}[o]`);
  calistir('ffmpeg', ['-v', 'error', '-y', '-i', sesYol, '-filter_complex', sf.join(';'), '-map', '[o]', '-ar', '48000', '-ac', '2', path.join(pub, 'hoca-ses.wav')]);

  // 4) Zaman çizelgesi: kamera planları ve sahne başları kesitlerle birlikte taşınır; altyazı yerleşmiş kelimelerden.
  const shots = [], sahneler = [];
  let T = 0;
  for (const x of K) {
    const sonT = T + (x.b - x.a) / x.hiz, map = s => y2(T + (s - x.a) / x.hiz);
    sahneler.push(y2(T));
    for (const s of tl.sceneStarts || []) if (s > x.a + 0.2 && s < x.b - 0.2) sahneler.push(map(s));
    for (const s of tl.shots || []) if (s.e > x.a && s.s < x.b) shots.push({ ...s, s: map(Math.max(s.s, x.a)), e: map(Math.min(s.e, x.b)), z: +(s.z * x.z).toFixed(3) });
    T = sonT;
  }
  if (shots.length) shots.at(-1).e = y2(dur + 0.3);
  const duz = duzeltici();
  const W = JSON.parse(fs.readFileSync(desYol, 'utf8')).flatMap(s => s.words);
  const caps = [];
  for (const p of P) {
    let cur = [];
    const kapat = () => { if (cur.length) caps.push({ t: cur.map(x => x.w).join(' ').replace(/[.,!?…]+$/u, ''), s: y2(cur[0].s), e: y2(cur.at(-1).e) }); cur = []; };
    for (const w of W.filter(w => w.s >= p.a - 0.05 && w.e <= p.b + 0.15)) {
      cur.push({ w: duz(w.w.trim()), s: p.t + (w.s - p.a), e: Math.min(p.t + (w.e - p.a), p.t + (p.b - p.a)) });
      if (/[.,!?…]$/u.test(w.w.trim()) || cur.length >= 3) kapat();
    }
    kapat();
  }
  for (let i = 0; i < caps.length - 1; i++) if (caps[i + 1].s - caps[i].e < 0.6) caps[i].e = caps[i + 1].s;
  Object.assign(tl, { video: 'video-hoca.mp4', audio: 'hoca-ses.wav', captions: caps, dur: y2(dur + 0.3), shots, sceneStarts: sahneler });
  const kapanis = caps.length >= 2 ? caps.at(-2).s : Math.max(0, dur - 2.5);
  if (tl.outro) tl.outro.s = kapanis;
  if (tl.ambient) tl.ambient.fadeAt = y2(dur - 0.2);
  fs.writeFileSync(tlYol, JSON.stringify(tl, null, 1));
  log(`${klasor}: ${K.length} kesit, ${P.length} ses parçası, çıktı ${dur} sn, ${caps.length} altyazı grubu.`);

  // 5) Render + −14 LUFS + altyazı bandı kontrolü (mevcut teslim hattı). Windows'ta Git Bash (System32'deki WSL bash'i değil).
  const cikti = path.join(k, 'teslim', `${klasor}-hoca-sesi.mp4`);
  const bash = process.platform !== 'win32' ? 'bash' : ['C:/Program Files/Git/bin/bash.exe', path.join(process.env.LOCALAPPDATA || '', 'Programs/Git/bin/bash.exe')].find(f => fs.existsSync(f)) || 'bash';
  const r = calistir(bash, [path.join(KOK, 'araclar', 'teslim.sh').replace(/\\/g, '/'), yeni.replace(/\\/g, '/'), cikti.replace(/\\/g, '/')], { timeout: 30 * 60e3 });
  log(r.trim().split('\n').slice(-3).join('\n'));
  return { klasor, cikti: r.match(/^TESLİM: (.+)$/m)?.[1]?.trim() || cikti, dur, caps };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const klasor = videoSec(process.argv[2]) || (fs.existsSync(path.join(KOK, process.argv[2] || '-')) ? process.argv[2] : null);
  if (!klasor || !process.argv[3]) { console.error('Kullanım: node araclar/hoca-sesi.mjs <video|no> <yerlesim.json>. Uygun videolar: ' + (uygunVideolar().join(', ') || 'yok')); process.exit(1); }
  try { const s = hocaSesiRender(klasor, path.resolve(process.argv[3])); console.log('ÇIKTI: ' + s.cikti); }
  catch (e) { console.error(e.message); process.exit(1); }
}
