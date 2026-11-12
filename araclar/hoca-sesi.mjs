// Bitmiş videoyu Gamze Hoca'nın KENDİ ses kaydıyla yeniden render eder. Kayıt DEĞİŞTİRİLMEZ:
// kesilmez, kaydırılmaz, hızlandırılmaz; yalnız biçim çevrilir (wav) ve teslimde tüm karışım −14 LUFS'e
// eşitlenir (teslim.sh). Video aynı kalır; altyazılar Hoca'nın kelime zamanlarından kurulur, ortam sesi
// Hoca konuşurken kısılır. Mevcut teslim dosyasına dokunulmaz, çıktı ayrı dosyadır.
//   node araclar/hoca-sesi.mjs [video klasörü | numara (ör. 05)]   (boşsa: kaydı ve kurgusu olan en son video)
// Çıktı: <video>/teslim/<video>-hoca-sesi.mp4 · çalışma klasörü: <video>/kurgu-hoca-sesi/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const KOK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KAYIT_KLASORLERI = ['sesli-tarif', 'sesli-anlatim'];

function calistir(prog, args, ek = {}) {
  const r = spawnSync(prog, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 64e6, ...ek });
  if (r.status !== 0) throw new Error(`${prog} hata verdi: ${(r.stderr || r.stdout || r.error?.message || '').trim().split('\n').slice(-4).join(' ')}`);
  return r.stdout;
}
const sure = f => Number(calistir('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).trim());

// Videonun Hoca kaydı (Telegram sesli mesajı) ve zamanlı deşifresi.
function kayitBul(klasor) {
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

// Whisper'ın bilinen yanlış duyuşları (araclar/sozluk.json → words). Kelime sırası ve zamanı değişmez.
function duzeltici() {
  let m = {};
  try { m = JSON.parse(fs.readFileSync(path.join(KOK, 'araclar', 'sozluk.json'), 'utf8')).words || {}; } catch {}
  return w => {
    const [, govde, nokta] = w.match(/^(.*?)([.,!?…]*)$/u);
    const yeni = m[govde.toLocaleLowerCase('tr')];
    return (yeni ?? govde) + nokta;
  };
}

// Kelime zamanlarından altyazı grupları: en çok 3 kelime, noktalamada biter (altyazi.py ile aynı kural).
function altyazilar(desifre) {
  const duz = duzeltici();
  const W = JSON.parse(fs.readFileSync(desifre, 'utf8')).flatMap(s => s.words);
  const caps = [];
  let cur = [];
  const kapat = () => { if (!cur.length) return; caps.push({ t: cur.map(x => x.w).join(' ').replace(/[.,!?…]+$/u, ''), s: +cur[0].s.toFixed(2), e: +cur.at(-1).e.toFixed(2) }); cur = []; };
  for (const w of W) {
    cur.push({ ...w, w: duz(w.w.trim()) });
    if (/[.,!?…]$/u.test(w.w.trim()) || cur.length >= 3) kapat();
  }
  kapat();
  for (let i = 0; i < caps.length - 1; i++) if (caps[i + 1].s - caps[i].e < 0.6) caps[i].e = caps[i + 1].s;
  return caps;
}

export function hocaSesiRender(klasor, log = console.log) {
  const k = path.join(KOK, klasor);
  const kaynak = kayitBul(klasor);
  if (!kaynak) throw new Error(`${klasor}: Hoca'nın ses kaydı (sesli-tarif/ ya da sesli-anlatim/ içinde kayit.* + desifre.json) yok.`);
  const eski = path.join(k, 'kurgu');
  const yeni = path.join(k, 'kurgu-hoca-sesi');

  // 1) Kurguyu kopyala (node_modules ve out hariç); node_modules şablondakine bağlanır.
  fs.rmSync(yeni, { recursive: true, force: true });
  fs.cpSync(eski, yeni, { recursive: true, filter: s => !/[\\/](node_modules|out)$/.test(s) });
  const nm = path.join(KOK, 'kurgu-sablon', 'node_modules');
  if (!fs.existsSync(nm)) throw new Error('kurgu-sablon/node_modules yok (kurulum eksik: kurgu-sablon klasöründe npm ci).');
  fs.symlinkSync(nm, path.join(yeni, 'node_modules'), 'junction');

  // 2) Hoca'nın kaydı olduğu gibi: yalnız biçim çevrimi (kesme, filtre, hız değişikliği yok).
  const pub = path.join(yeni, 'public');
  calistir('ffmpeg', ['-v', 'error', '-y', '-i', kaynak.kayit, '-vn', '-ar', '48000', '-ac', '2', path.join(pub, 'hoca-ses.wav')]);
  const sesSure = sure(path.join(pub, 'hoca-ses.wav'));

  // 3) Zaman çizelgesi: ses Hoca'nınki, altyazı onun kelimelerinden; video ve kamera planları aynen kalır.
  const tlYol = path.join(yeni, 'src', 'timeline.json');
  const tl = JSON.parse(fs.readFileSync(tlYol, 'utf8'));
  const vidYol = path.join(pub, tl.video);
  const vidSure = sure(vidYol);
  const caps = altyazilar(kaynak.desifre);
  const dur = +Math.max(vidSure, sesSure + 0.6).toFixed(2);
  // Ses videodan uzunsa video son karede durur (ses asla kesilmez).
  if (dur > vidSure + 0.04) {
    const gecici = path.join(pub, 'video-uzatilmis.mp4');
    calistir('ffmpeg', ['-v', 'error', '-y', '-i', vidYol, '-vf', `tpad=stop_mode=clone:stop_duration=${(dur - vidSure + 0.2).toFixed(2)}`, '-an', '-c:v', 'libx264', '-crf', '16', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', gecici]);
    tl.video = 'video-uzatilmis.mp4';
    tl.shots = (tl.shots || []).map((s, i, a) => i === a.length - 1 ? { ...s, e: dur + 0.2 } : s);
  }
  tl.audio = 'hoca-ses.wav';
  tl.captions = caps;
  tl.dur = dur;
  const kapanis = caps.length >= 2 ? caps.at(-2).s : Math.max(0, dur - 2.5);
  if (tl.outro) tl.outro.s = kapanis;
  if (tl.ambient) tl.ambient.fadeAt = Math.min(+(vidSure - 0.4).toFixed(2), Math.max(kapanis, tl.ambient.fadeAt ?? 0));
  fs.writeFileSync(tlYol, JSON.stringify(tl, null, 1));
  log(`${klasor}: Hoca kaydı ${sesSure.toFixed(1)} sn, video ${vidSure.toFixed(1)} sn, çıktı ${dur} sn, ${caps.length} altyazı grubu.`);

  // 4) Render + −14 LUFS + altyazı bandı kontrolü (mevcut teslim hattı).
  const cikti = path.join(k, 'teslim', `${klasor}-hoca-sesi.mp4`);
  // Windows'ta Git Bash (System32'deki WSL bash'i değil).
  const bash = process.platform !== 'win32' ? 'bash' : ['C:/Program Files/Git/bin/bash.exe', path.join(process.env.LOCALAPPDATA || '', 'Programs/Git/bin/bash.exe')].find(f => fs.existsSync(f)) || 'bash';
  const r = calistir(bash, [path.join(KOK, 'araclar', 'teslim.sh').replace(/\\/g, '/'), yeni.replace(/\\/g, '/'), cikti.replace(/\\/g, '/')], { timeout: 30 * 60e3 });
  const son = r.match(/^TESLİM: (.+)$/m)?.[1]?.trim() || cikti;
  log(r.trim().split('\n').slice(-3).join('\n'));
  return { klasor, cikti: son, kontrol: path.join(yeni, 'out', 'kontrol', 'altyazi-bandi.jpg'), sesSure, vidSure, dur };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const klasor = videoSec(process.argv[2]);
  if (!klasor) { console.error('Hoca kaydı + kurgusu olan video bulunamadı. Uygunlar: ' + (uygunVideolar().join(', ') || 'yok')); process.exit(1); }
  try { const s = hocaSesiRender(klasor); console.log('ÇIKTI: ' + s.cikti); }
  catch (e) { console.error(e.message); process.exit(1); }
}
