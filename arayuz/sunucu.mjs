// Gamze Eğitmen içerik hattı — yerel arayüz sunucusu (bağımlılıksız Node).
// Başlat: node arayuz/sunucu.mjs  → http://127.0.0.1:4747
// Her aşama `claude -p` ile çalışır; aynı anda tek iş (tarayıcı/Playwright ortak).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ARAYUZ = path.dirname(fileURLToPath(import.meta.url));
const KOK = path.resolve(ARAYUZ, '..');
const PORT = Number(process.env.ARAYUZ_PORT || 4747);
const ARACLAR = 'Bash,Read,Write,Edit,Glob,Grep,Agent,Task,Skill,WebFetch,WebSearch,mcp__playwright';
// .env → process.env (alt süreçteki claude, .mcp.json'daki token'ı ortamdan okur).
try {
  for (const s of fs.readFileSync(path.join(KOK, '.env'), 'utf8').split(/\r?\n/)) {
    const m = s.match(/^\s*([A-Z0-9_]+)\s*=\s*([^\s#]*)/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}
if (!process.env.PLAYWRIGHT_MCP_EXTENSION_TOKEN) console.log('UYARI: PLAYWRIGHT_MCP_EXTENSION_TOKEN boş — Claude tarayıcıyı kullanamaz (.env)');

const tanim = () =>JSON.parse(fs.readFileSync(path.join(ARAYUZ, 'asamalar.json'), 'utf8'));

let calisan = null; // { klasor, asama, proc, baslangic }

const TUR = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.log': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };

// Kök dışına çıkan yolları reddet.
function guvenliYol(goreli) {
  const p = path.resolve(KOK, goreli || '');
  if (p !== KOK && !p.startsWith(KOK + path.sep)) throw new Error('geçersiz yol');
  return p;
}

function videoKlasorleri() {
  return fs.readdirSync(KOK, { withFileTypes: true })
    .filter(d => d.isDirectory() && /^video-\d+/.test(d.name)).map(d => d.name).sort();
}

const durumYolu = k => path.join(guvenliYol(k), '.arayuz', 'durum.json');

// Basit glob: "klasor/*.uzanti" ya da sabit dosya; değişiklik zamanına göre yeniden eskiye.
function eslesen(klasor, desen) {
  const tam = path.join(guvenliYol(klasor), desen);
  const dir = path.dirname(tam), ad = path.basename(tam);
  if (!fs.existsSync(dir)) return [];
  const re = new RegExp('^' + ad.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$', 'i');
  return fs.readdirSync(dir).filter(f => re.test(f) && fs.statSync(path.join(dir, f)).isFile())
    .map(f => path.join(dir, f))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .map(f => path.relative(KOK, f).split(path.sep).join('/'));
}

function bolumBul(id) { return tanim().bolumler.find(b => b.id === id); }

function durumOku(klasor) {
  let d = {};
  try { d = JSON.parse(fs.readFileSync(durumYolu(klasor), 'utf8')); } catch {}
  if (!d.bolum) {
    // Arayüzden önce açılmış klasörler: Bölüm 2 izi (prompt.js/kaynak/NOTLAR.md) yoksa Bölüm 1.
    const k = guvenliYol(klasor);
    const senaryo = path.join(k, 'SENARYO.md');
    const cekimIzi = ['prompt.js', 'kaynak', 'NOTLAR.md'].some(f => fs.existsSync(path.join(k, f)))
      || (fs.existsSync(senaryo) && fs.readFileSync(senaryo, 'utf8').includes('referans-videolar/'));
    d.bolum = cekimIzi ? 'cekim' : 'tarif';
    d.konu = klasor.replace(/^video-\d+-?/, '').replace(/-/g, ' ');
  }
  d.asamalar = d.asamalar || {};
  for (const a of bolumBul(d.bolum).asamalar) {
    if (!d.asamalar[a.id] && a.ciktilar.some(c => eslesen(klasor, c).length)) d.asamalar[a.id] = { durum: 'bitti', tahmini: true };
  }
  if (calisan && calisan.klasor === klasor) d.asamalar[calisan.asama] = { ...(d.asamalar[calisan.asama] || {}), durum: 'calisiyor' };
  return d;
}

function durumYaz(klasor, d) {
  fs.mkdirSync(path.dirname(durumYolu(klasor)), { recursive: true });
  fs.writeFileSync(durumYolu(klasor), JSON.stringify(d, null, 2));
}

function slug(s) {
  const harita = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  return s.toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, c => harita[c]).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'video';
}

function yeniKlasor(bolum, konu) {
  const no = videoKlasorleri().reduce((m, k) => Math.max(m, Number(k.match(/^video-(\d+)/)[1])), 0) + 1;
  const ad = `video-${String(no).padStart(2, '0')}-${slug(konu)}`;
  fs.mkdirSync(guvenliYol(ad), { recursive: true });
  durumYaz(ad, { bolum, konu, olusturma: new Date().toISOString(), kaynaklar: [], asamalar: {} });
  return ad;
}

function govdeOku(req) {
  return new Promise((ok, hata) => { let s = ''; req.on('data', c => (s += c)); req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { hata(e); } }); });
}

function json(res, kod, veri) { res.writeHead(kod, { 'Content-Type': TUR['.json'] }); res.end(JSON.stringify(veri)); }

// stream-json satırını okunur günlük satırına çevir.
function gunlukSatiri(o) {
  if (o.type === 'system' && o.subtype === 'init') return `[oturum başladı · ${o.model || ''}]`;
  if (o.type === 'assistant') {
    return (o.message?.content || []).map(c => {
      if (c.type === 'text') return c.text.trim();
      if (c.type === 'tool_use') {
        const i = c.input || {};
        const ozet = i.description || i.command || i.file_path || i.pattern || i.url || i.prompt || i.skill || '';
        return `→ ${c.name}: ${String(ozet).replace(/\s+/g, ' ').slice(0, 160)}`;
      }
      return '';
    }).filter(Boolean).join('\n');
  }
  if (o.type === 'user') {
    const h = (o.message?.content || []).find(c => c.type === 'tool_result' && c.is_error);
    return h ? `  ! araç hatası: ${JSON.stringify(h.content).slice(0, 200)}` : '';
  }
  if (o.type === 'result') return `\n=== SONUÇ (${o.subtype}${o.total_cost_usd ? `, $${o.total_cost_usd.toFixed(2)}` : ''}) ===\n${o.result || ''}`;
  return '';
}

function calistir({ klasor, asama, not, krediOnay, krediLimit }) {
  if (calisan) throw new Error(`Şu an çalışan bir iş var: ${calisan.klasor} · ${calisan.asama}`);
  const d = durumOku(klasor);
  const b = bolumBul(d.bolum);
  const a = b.asamalar.find(x => x.id === asama);
  if (!a) throw new Error('aşama yok');
  if (a.kredili && !krediOnay) throw new Error('Bu aşama kredili: önce kredi onay kutusunu işaretleyin.');
  const t = tanim();
  const doldur = s => s.replaceAll('{klasor}', klasor).replaceAll('{konu}', d.konu || '').replaceAll('{bolum}', `${b.ad} (${b.sistem})`)
    .replaceAll('{kaynaklar}', (d.kaynaklar || []).join(', ') || 'referans-videolar/ altındaki ilgili çekim')
    .replaceAll('{not}', (not || '').trim() || 'yok').replaceAll('{limit}', String(krediLimit || a.varsayilanLimit || 0));
  const kredi = a.kredili ? doldur(t.krediVar) : t.krediYok;
  const istem = doldur(t.ortak).replace('Kredi: {kredi}', 'Kredi: ' + kredi) + '\n\nAŞAMA — ' + a.ad + ':\n' + doldur(a.talimat);

  const logDir = path.join(guvenliYol(klasor), '.arayuz');
  fs.mkdirSync(logDir, { recursive: true });
  const log = fs.createWriteStream(path.join(logDir, `${asama}.log`));
  log.write(`# ${new Date().toLocaleString('tr-TR')} · ${klasor} · ${a.ad}\n# Not: ${(not || '').trim() || '-'}\n\n`);

  const proc = spawn('claude', ['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits', '--allowedTools', ARACLAR],
    { cwd: KOK, shell: true, windowsHide: true });
  proc.stdin.end(istem);
  let kalan = '', sonuc = '';
  proc.stdout.on('data', parca => {
    kalan += parca.toString('utf8');
    const satirlar = kalan.split('\n'); kalan = satirlar.pop();
    for (const s of satirlar) {
      if (!s.trim()) continue;
      try { const o = JSON.parse(s); const g = gunlukSatiri(o); if (g) log.write(g + '\n'); if (o.type === 'result') sonuc = o.result || ''; }
      catch { log.write(s + '\n'); }
    }
  });
  proc.stderr.on('data', p => log.write('[stderr] ' + p.toString('utf8')));
  calisan = { klasor, asama, proc, baslangic: Date.now() };
  d.asamalar[asama] = { durum: 'calisiyor', baslangic: new Date().toISOString() };
  durumYaz(klasor, d);
  proc.on('close', kod => {
    log.end(`\n# bitti · çıkış kodu ${kod}\n`);
    const son = durumOku(klasor);
    son.asamalar[asama] = { durum: kod === 0 && !calisan?.durduruldu ? 'bitti' : (calisan?.durduruldu ? 'durduruldu' : 'hata'), bitis: new Date().toISOString(), ozet: sonuc.slice(0, 4000) };
    calisan = null;
    durumYaz(klasor, son);
  });
}

function dosyaGonder(req, res, tam) {
  const st = fs.statSync(tam);
  const tur = TUR[path.extname(tam).toLowerCase()] || 'application/octet-stream';
  const aralik = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range);
  if (aralik) { // video ileri sarma için
    const bas = aralik[1] ? Number(aralik[1]) : 0, son = aralik[2] ? Number(aralik[2]) : st.size - 1;
    res.writeHead(206, { 'Content-Type': tur, 'Content-Range': `bytes ${bas}-${son}/${st.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': son - bas + 1 });
    fs.createReadStream(tam, { start: bas, end: son }).pipe(res);
  } else {
    res.writeHead(200, { 'Content-Type': tur, 'Content-Length': st.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
    fs.createReadStream(tam).pipe(res);
  }
}

const sunucu = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const q = Object.fromEntries(u.searchParams);
  try {
    if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/index.html'))
      return dosyaGonder(req, res, path.join(ARAYUZ, 'public', 'index.html'));
    if (u.pathname === '/api/tanim') return json(res, 200, tanim());
    if (u.pathname === '/api/videolar' && req.method === 'GET')
      return json(res, 200, { calisan: calisan && { klasor: calisan.klasor, asama: calisan.asama, baslangic: calisan.baslangic },
        videolar: videoKlasorleri().map(k => ({ klasor: k, ...durumOku(k) })) });
    if (u.pathname === '/api/videolar' && req.method === 'POST') {
      const { bolum, konu } = await govdeOku(req);
      if (!bolumBul(bolum) || !konu?.trim()) return json(res, 400, { hata: 'bölüm ve konu gerekli' });
      return json(res, 200, { klasor: yeniKlasor(bolum, konu.trim()) });
    }
    if (u.pathname === '/api/yukle' && req.method === 'POST') { // ham gövde: tek dosya
      const ad = path.basename(q.ad || '').replace(/[^\w.\-]+/g, '_');
      if (!/\.(mp4|mov|m4v|webm)$/i.test(ad)) return json(res, 400, { hata: 'yalnız video dosyası' });
      const hedef = guvenliYol(path.join('referans-videolar', ad));
      fs.mkdirSync(path.dirname(hedef), { recursive: true });
      const yaz = fs.createWriteStream(hedef);
      req.pipe(yaz);
      yaz.on('finish', () => {
        const d = durumOku(q.klasor);
        const goreli = 'referans-videolar/' + ad;
        d.kaynaklar = [...new Set([...(d.kaynaklar || []), goreli])];
        durumYaz(q.klasor, d);
        json(res, 200, { yol: goreli });
      });
      return;
    }
    if (u.pathname === '/api/calistir' && req.method === 'POST') { calistir(await govdeOku(req)); return json(res, 200, { ok: true }); }
    if (u.pathname === '/api/durdur' && req.method === 'POST') {
      if (calisan) { calisan.durduruldu = true; spawn('taskkill', ['/pid', String(calisan.proc.pid), '/T', '/F']); }
      return json(res, 200, { ok: true });
    }
    if (u.pathname === '/api/log') {
      const f = path.join(guvenliYol(q.klasor), '.arayuz', `${path.basename(q.asama)}.log`);
      res.writeHead(200, { 'Content-Type': TUR['.txt'] });
      return res.end(fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
    }
    if (u.pathname === '/api/ciktilar') {
      const d = durumOku(q.klasor);
      const a = bolumBul(d.bolum).asamalar.find(x => x.id === q.asama);
      return json(res, 200, a.ciktilar.flatMap(c => eslesen(q.klasor, c).slice(0, 12)));
    }
    if (u.pathname === '/dosya') {
      const tam = guvenliYol(q.yol);
      if (!fs.existsSync(tam) || !fs.statSync(tam).isFile()) { res.writeHead(404); return res.end(); }
      return dosyaGonder(req, res, tam);
    }
    res.writeHead(404); res.end();
  } catch (e) { json(res, 400, { hata: e.message }); }
});

sunucu.listen(PORT, '127.0.0.1', () => console.log(`Arayüz hazır: http://127.0.0.1:${PORT}  (kapatmak için bu pencereyi kapatın)`));
