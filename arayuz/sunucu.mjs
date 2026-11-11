// Gamze Eğitmen içerik hattı — yerel arayüz sunucusu (bağımlılıksız Node).
// Başlat: node arayuz/sunucu.mjs  → http://127.0.0.1:4747
// Her aşama `claude -p` ile çalışır; aynı anda tek iş (tarayıcı/Playwright ortak), fazlası kuyruğa girer.
// Otomatik akış: aşamalar sırayla çalışır, `onay` tanımlı aşamada (kareler / kesitler / teslim) durup onay bekler.
// .env'de TELEGRAM_BOT_TOKEN varsa Telegram botu da bu süreçte çalışır (arayuz/telegram.mjs).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { fileURLToPath } from 'node:url';
import { ogrenmeKur } from './ogrenme.mjs';

const ARAYUZ = path.dirname(fileURLToPath(import.meta.url));
const KOK = path.resolve(ARAYUZ, '..');
const PORT = Number(process.env.ARAYUZ_PORT || 4747);
const TEMEL_ARACLAR = 'Bash,Read,Write,Edit,Glob,Grep,Agent,Task,Skill,WebFetch,WebSearch,mcp__claude_ai_topview,mcp__elevenlabs';
// Kredisiz modda kredi harcayan TopView MCP araçları tamamen kapalı (yalnız okuma araçları açık).
const KREDILI_MCP = ['topview_generate_image', 'topview_generate_video', 'topview_submit_creation', 'topview_submit_creation_batch',
  'topview_recreate_creation', 'topview_generate_voice', 'topview_generate_audio', 'topview_generate_music', 'topview_avatar_video',
  'topview_product_avatar', 'topview_remove_background', 'submit_topview_canvas_generation_task'].map(a => 'mcp__claude_ai_topview__' + a);
export const SURE = { en: 10, cok: 60, varsayilan: 25, parca: 30 }; // Seedance tek üretimde en fazla 30 sn; üstü parçalı

// Ortak ayarlar: geliştirme bilgisayarında .env.example'da değişir, /guncelle sonrası açılışta üretim
// bilgisayarının .env'ine yazılır (.env git dışında olduğu için başka türlü ulaşmaz). Token'lar buraya GİRMEZ.
const ORTAK_AYARLAR = ['ELEVENLABS_VOICE_ID'];
try {
  const oku = d => {
    const o = {};
    for (const s of d.split(/\r?\n/)) { const m = s.match(/^\s*([A-Z0-9_]+)\s*=\s*([^\s#]*)/); if (m) o[m[1]] = m[2]; }
    return o;
  };
  const ornek = oku(fs.readFileSync(path.join(KOK, '.env.example'), 'utf8'));
  const envYol = path.join(KOK, '.env');
  let env = fs.existsSync(envYol) ? fs.readFileSync(envYol, 'utf8') : '';
  const mevcut = oku(env);
  const degisen = [];
  for (const k of ORTAK_AYARLAR) {
    if (!ornek[k] || mevcut[k] === ornek[k]) continue;
    const satir = new RegExp(`^(\\s*${k}\\s*=).*$`, 'm');
    env = satir.test(env) ? env.replace(satir, `$1${ornek[k]}`) : env.replace(/\s*$/, '') + `\n${k}=${ornek[k]}\n`;
    degisen.push(`${k}: ${mevcut[k] || '(yok)'} → ${ornek[k]}`);
  }
  if (degisen.length) { fs.writeFileSync(envYol, env); console.log('Ortak ayarlar .env\'e yazıldı:\n  ' + degisen.join('\n  ')); }
} catch (e) { console.log('Ortak ayar eşitlemesi yapılamadı:', e.message); }

// .env → process.env (alt süreçteki claude, .mcp.json'daki token'ı ortamdan okur).
try {
  for (const s of fs.readFileSync(path.join(KOK, '.env'), 'utf8').split(/\r?\n/)) {
    const m = s.match(/^\s*([A-Z0-9_]+)\s*=\s*([^\s#]*)/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}
if (!process.env.PLAYWRIGHT_MCP_EXTENSION_TOKEN) console.log('UYARI: PLAYWRIGHT_MCP_EXTENSION_TOKEN boş — kredisiz modda Claude tarayıcıyı kullanamaz (.env)');

const tanim = () =>JSON.parse(fs.readFileSync(path.join(ARAYUZ, 'asamalar.json'), 'utf8'));
export const olaylar = new EventEmitter(); // 'asama' | 'onay' | 'bitti' | 'ogrendi' (Telegram dinler)
const ogrenme = ogrenmeKur({ KOK, olaylar }); // Gamze Hoca'nın tepkilerinden öğrenilen tercihler (arayuz/ogrenme.mjs)

let calisan = null; // { klasor, asama, proc, baslangic }
const kuyruk = [];  // calistir() argümanları

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

const planSayisi = sure => Math.max(4, Math.round(sure / 2.6)); // 25 sn → 10 plan, 15 sn → 6

// Kredili modda bir videonun tahmini toplam TopView kredisi (%15 pay ile).
function tahminiKredi(bolum, sure, mod, asamalar) {
  if (mod !== 'kredili') return 0;
  const t = (asamalar || bolumBul(bolum).asamalar).reduce((s, a) => s + (a.kartBasina || 0) * (planSayisi(sure) + 2) + (a.saniyeBasina || 0) * sure, 0);
  return Math.ceil(t * 1.15);
}

// Kredisizde takılma bekçisi: kredili olabilen aşama (kareler, video, Video Edit) TAKILMA_DK'dan (varsayılan 90) uzun sürerse
// ya da herhangi bir aşamanın günlüğü TAKILMA_SESSIZ_DK (varsayılan 30) dakikadır yazılmıyorsa Telegram'a "kredili devam?" sorulur.
// Aynı çalışma için bir kez sorulur; "Beklemeye devam" denirse 60 dk sonra yeniden yoklanır.
const TAKILMA_DK = Number(process.env.TAKILMA_DK) || 90;
const TAKILMA_SESSIZ_DK = Number(process.env.TAKILMA_SESSIZ_DK) || 30;
setInterval(() => {
  if (!calisan || calisan.gecis || (calisan.takildiSoruldu || 0) > Date.now()) return;
  const d = durumOku(calisan.klasor);
  if (d.mod === 'kredili' || !d.otomatik) return;
  const a = bolumBul(d.bolum)?.asamalar.find(x => x.id === calisan.asama);
  if (!a) return;
  const dk = (Date.now() - calisan.baslangic) / 60000;
  let sessiz = 0;
  try { sessiz = (Date.now() - fs.statSync(path.join(guvenliYol(calisan.klasor), '.arayuz', `${a.id}.log`)).mtimeMs) / 60000; } catch {}
  const uzun = a.kredili && dk > TAKILMA_DK, durgun = sessiz > TAKILMA_SESSIZ_DK;
  if (!uzun && !durgun) return;
  calisan.takildiSoruldu = Infinity; // cevap gelene kadar yeniden sorma
  const kalanlar = bolumBul(d.bolum).asamalar.filter(x => d.asamalar[x.id]?.durum !== 'bitti');
  olaylar.emit('takildi', { klasor: calisan.klasor, asama: a.id, ad: a.ad, konu: d.konu, dk: Math.round(dk), sessiz: Math.round(sessiz), neden: durgun ? 'sessiz' : 'uzun',
    kredi: tahminiKredi(d.bolum, d.sure, 'kredili', kalanlar) });
}, 5 * 60e3).unref();

// "Beklemeye devam": bekçi bu çalışmayı dk dakika sonra yeniden yoklar.
function takilmaErtele(klasor, dk = 60) {
  if (calisan?.klasor !== klasor) return false;
  calisan.takildiSoruldu = Date.now() + dk * 60e3;
  return true;
}

// Kredisizde takılan videoyu kredili moda geçirir: çalışan aşama durdurulur, aynı aşama kredili (MCP) olarak yeniden başlar.
// Hazır çıktılar korunur; bütçe = harcanan + kalan aşamaların tahmini (bu düğme tek onaydır).
function krediliyeGec(klasor) {
  const d = durumOku(klasor);
  if (d.mod === 'kredili') throw new Error('Bu video zaten kredili.');
  const kalanlar = bolumBul(d.bolum).asamalar.filter(x => d.asamalar[x.id]?.durum !== 'bitti');
  if (!kalanlar.length) throw new Error('Bu videoda kalan aşama yok.');
  const asama = calisan?.klasor === klasor ? calisan.asama : d.bekleyen?.asama || kalanlar[0].id;
  Object.assign(d, { mod: 'kredili', butce: (d.harcanan || 0) + tahminiKredi(d.bolum, d.sure, 'kredili', kalanlar), otomatik: true, bekleyen: null });
  durumYaz(klasor, d);
  ogrenme.kaydet({ tur: 'krediliye-gecis', klasor, konu: d.konu, asama });
  const not = 'Bu aşama kredisiz (TopView Sınırsız) modda takıldı; Gamze Hoca kredili devam etmeyi onayladı. Hazır ve denetimden geçmiş çıktıları KORU, '
    + 'yeniden üretme. Sınırsız kuyrukta bekleyen tarayıcı görevlerini bekleme; eksik kalanı kredili MCP ile üret. Kesilen kredisiz çalışmanın günlüğü: '
    + `{klasor}/.arayuz/${asama}.kredisiz-*.log (ne hazırdı, ne takıldı).`;
  if (calisan?.klasor === klasor) {
    calisan.gecis = { not };
    spawn('taskkill', ['/pid', String(calisan.proc.pid), '/T', '/F']);
    return 'gecis';
  }
  return isEkle({ klasor, asama, not });
}

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
  d.mod = d.mod || 'kredisiz';
  d.onaylar = d.onaylar || 'iki'; // eski videolar onaylı kalır
  d.sure = d.sure || SURE.varsayilan;
  d.harcanan = d.harcanan || 0;
  d.asamalar = d.asamalar || {};
  // Çıktıdan "bitti" tahmini yalnız arayüzden önce açılmış klasörler için; yeni videoda eski çıktı (ör. geri dönüşten kalan) aşamayı atlatmasın.
  if (!d.olusturma) for (const a of bolumBul(d.bolum).asamalar) {
    if (!d.asamalar[a.id] && a.ciktilar.some(c => eslesen(klasor, c).length)) d.asamalar[a.id] = { durum: 'bitti', tahmini: true };
  }
  if (calisan && calisan.klasor === klasor) d.asamalar[calisan.asama] = { ...(d.asamalar[calisan.asama] || {}), durum: 'calisiyor' };
  if (kuyruk.some(k => k.klasor === klasor)) d.kuyrukta = kuyruk.filter(k => k.klasor === klasor).map(k => k.asama);
  return d;
}

function durumYaz(klasor, d) {
  const { kuyrukta, ...kalici } = d;
  fs.mkdirSync(path.dirname(durumYolu(klasor)), { recursive: true });
  fs.writeFileSync(durumYolu(klasor), JSON.stringify(kalici, null, 2));
}

function slug(s) {
  const harita = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  return s.toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, c => harita[c]).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'video';
}

// Gösterim bedeni ipucu: istek metninde "çocuk eli", "erkek kolu", "ayak", "sırt", "çimdik" gibi bir ifade varsa
// senaryo aşamasına beden kilidi önerisi olarak geçer ({beden}; beden-kilidi/BEDEN-KILIDI.md). Karar yine senaryonundur.
const BEDEN_IPUCLARI = [ // \p{L}: Türkçe harfler (ı, ğ, ş) de kelimenin parçası
  { kod: 'B1 çocuk eli', re: /(^|\s)(çocu[kğ]\p{L}*|bebe[kğ]\p{L}*)\s+(el|eli|elin\p{L}*|elle\p{L}*|parma\p{L}*)(?=\s|$)/u },
  { kod: 'çocuk ayağı (kilit yok: B1 çocuk eliyle aynı ten, B3 ayak kadrajı; raporda belirt)', re: /(^|\s)(çocu[kğ]\p{L}*|bebe[kğ]\p{L}*)\s+aya[kğ]\p{L}*(?=\s|$)/u },
  { kod: 'B2 yetişkin erkek ön kol', re: /(^|\s)(erke[kğ]\p{L}*\s+(kol\p{L}*|el|eli|elin\p{L}*|bile[kğ]\p{L}*)|ön\s?kol\p{L}*|elin?\s+(üst|sırt)\p{L}*|çimdi[kğ]\p{L}*)(?=\s|$)/u },
  { kod: 'B3 yetişkin ayak', re: /(^|\s)(aya[kğ]\p{L}*|topu[kğ]\p{L}*)(?=\s|$)/u },
  { kod: 'B4 yetişkin sırt', re: /(^|\s)(sırt\p{L}*|bel|bele|beli|beline|belde|belden)(?=\s|$)/u },
];
function bedenIpucu(...metinler) {
  const m = ' ' + metinler.filter(Boolean).join(' ').toLocaleLowerCase('tr').replace(/[^\p{L}\p{N}\s]+/gu, ' ') + ' ';
  const bulunan = [];
  for (const b of BEDEN_IPUCLARI) {
    const e = m.match(b.re);
    // "çocuk ayağı" yetişkin ayak ipucunu, "çocuk eli" erkek kolu ipucunu tetiklemesin
    if (!e || bulunan.some(x => x.ifade.includes(e[0].trim()))) continue;
    bulunan.push({ kod: b.kod, ifade: e[0].trim() });
  }
  return bulunan.map(x => `${x.kod} (istekte: "${x.ifade}")`).join('; ');
}

// onaylar: 'yok' = tam otomatik (Claude denetime göre karar verir, yalnız bitmiş video gelir) | 'iki' = kareler/kesitler + teslimde onay.
// Varsayılanlar .env'den: VARSAYILAN_MOD, VARSAYILAN_ONAY.
// Özel istek (yalnız eğitmen anlatımı): Gamze Hoca'nın bu videoya özel serbest isteği ("eller hiç durmasın", "masada yeşil reyhan da olsun",
// "ses kendinden emin, güven veren olsun"). {klasor}/OZEL-ISTEK.md'ye eklenir, eğitim bölümünün her aşama istemine girer, öğrenmeye kaydedilir.
const OZEL_ISTEK = 'OZEL-ISTEK.md';
const OZEL_BOLUMLER = ['egitim'];
const ozelIstekYolu = klasor => path.join(guvenliYol(klasor), OZEL_ISTEK);
function ozelIstekOku(klasor) {
  try { return fs.readFileSync(ozelIstekYolu(klasor), 'utf8').split(/^## /m).slice(1).map(s => s.replace(/^[^\n]*\n/, '').trim()).filter(Boolean); }
  catch { return []; }
}
function ozelIstekEkle(klasor, metin, kaynak = 'yazı') {
  const d = durumOku(klasor);
  if (!OZEL_BOLUMLER.includes(d.bolum)) throw new Error('Özel istek yalnız eğitmen anlatımı videolarında kullanılır.');
  metin = (metin || '').trim();
  if (!metin) throw new Error('Özel istek boş.');
  const yol = ozelIstekYolu(klasor);
  if (!fs.existsSync(yol)) fs.writeFileSync(yol, `# Gamze Hoca'nın özel isteği — ${d.konu}\n\nBu videoya özel. Değişmez kurallarla (CLAUDE.md) çelişmedikçe her aşama kendi işine düşeni uygular.\n`);
  fs.appendFileSync(yol, `\n## ${new Date().toLocaleString('tr-TR')} · ${kaynak}\n\n${metin}\n`);
  ogrenme.kaydet({ tur: 'ozel-istek', klasor, konu: d.konu, bolum: d.bolum, not: metin });
  return ozelIstekOku(klasor);
}
function ozelIstekSil(klasor) {
  const d = durumOku(klasor);
  if (d.otomatik || Object.keys(d.asamalar || {}).length) throw new Error('Bu video başladı; özel istek artık "Düzelt" ile verilir.');
  fs.rmSync(ozelIstekYolu(klasor), { force: true });
}

function yeniKlasor({ bolum, konu, mod, sure, butce, onaylar, ipucu, ozelIstek }) {
  if (!bolumBul(bolum) || !konu?.trim()) throw new Error('bölüm ve konu gerekli');
  mod = (mod || process.env.VARSAYILAN_MOD) === 'kredili' ? 'kredili' : 'kredisiz';
  onaylar = (onaylar || process.env.VARSAYILAN_ONAY) === 'iki' ? 'iki' : 'yok';
  sure = Math.min(SURE.cok, Math.max(SURE.en, Math.round(Number(sure) || SURE.varsayilan)));
  const no = videoKlasorleri().reduce((m, k) => Math.max(m, Number(k.match(/^video-(\d+)/)[1])), 0) + 1;
  const ad = `video-${String(no).padStart(2, '0')}-${slug(konu)}`;
  fs.mkdirSync(guvenliYol(ad), { recursive: true });
  butce = mod === 'kredili' ? (Number(butce) > 0 ? Number(butce) : tahminiKredi(bolum, sure, mod)) : 0;
  const beden = bedenIpucu(konu, ipucu);
  durumYaz(ad, { bolum, konu: konu.trim(), mod, sure, butce, onaylar, ...(beden ? { beden } : {}), harcanan: 0, olusturma: new Date().toISOString(), kaynaklar: [], asamalar: {} });
  if (ozelIstek?.trim() && OZEL_BOLUMLER.includes(bolum)) ozelIstekEkle(ad, ozelIstek, 'Stüdyo');
  return ad;
}

// Henüz başlamamış videonun modunu/süresini/onay biçimini değiştirir (Telegram ayar kartı, özel istek). Bütçe yeniden hesaplanır.
function ayarDegistir(klasor, { mod, sure, onaylar }) {
  const d = durumOku(klasor);
  if (d.otomatik || Object.keys(d.asamalar || {}).length) throw new Error('Bu video başladı; ayarı artık değişmez.');
  if (mod) d.mod = mod === 'kredili' ? 'kredili' : 'kredisiz';
  if (sure) d.sure = Math.min(SURE.cok, Math.max(SURE.en, Math.round(Number(sure))));
  if (onaylar) d.onaylar = onaylar === 'iki' ? 'iki' : 'yok';
  d.butce = d.mod === 'kredili' ? tahminiKredi(d.bolum, d.sure, d.mod) : 0;
  durumYaz(klasor, d);
  return d;
}

// Gamze'nin çekimini referans-videolar/ altına kaydeder ve videonun kaynaklarına ekler.
function kaynakEkle(klasor, ad, akis) {
  ad = path.basename(ad || '').replace(/[^\w.\-]+/g, '_');
  if (!/\.(mp4|mov|m4v|webm)$/i.test(ad)) return Promise.reject(new Error('yalnız video dosyası'));
  const hedef = guvenliYol(path.join('referans-videolar', ad));
  fs.mkdirSync(path.dirname(hedef), { recursive: true });
  return new Promise((ok, hata) => {
    const yaz = fs.createWriteStream(hedef);
    akis.pipe(yaz);
    yaz.on('error', hata);
    yaz.on('finish', () => {
      const d = durumOku(klasor);
      const goreli = 'referans-videolar/' + ad;
      d.kaynaklar = [...new Set([...(d.kaynaklar || []), goreli])];
      durumYaz(klasor, d);
      ok(goreli);
    });
  });
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

// Bu aşamada tarayıcı (Playwright) gerekiyor mu? Kredili modda yalnız görsel arama anahtarı yoksa referans araması için.
// Ses her iki modda ElevenLabs MCP ile üretilir.
function tarayiciGerekli(mod, asama) {
  if (mod !== 'kredili') return true;
  return asama === 'senaryo' && !process.env.SERPER_API_KEY && !process.env.PIXABAY_API_KEY;
}

// 30 sn'yi aşan video kaç parçada üretilir: "tek parça" ya da "2 parça (~30 + ~30 sn)".
function parcalar(sure) {
  const n = Math.ceil(sure / SURE.parca);
  if (n === 1) return 'tek parça';
  const taban = Math.floor(sure / n), artan = sure - taban * n;
  return `${n} parça (${Array.from({ length: n }, (_, i) => '~' + (taban + (i < artan ? 1 : 0))).join(' + ')} sn)`;
}

// Otomatik akışın iş girişi: başlatılamayan iş (ör. bütçe bitti) sunucuyu düşürmez, hata kapısına düşer.
function isEkle(is) {
  if (calisan) { kuyruk.push(is); return 'kuyruk'; }
  try { calistir(is); } catch (e) { hataBildir(is.klasor, is.asama, e.message); return 'hata'; }
  return 'basladi';
}

// Aşamanın kredi başlangıç kaydı: Claude aşamanın ilk çalışmasında TopView bakiyesini buraya yazar; yarıda kalıp sürdürülen
// çalışma aynı kaydı kullanır, böylece kesilen çalışmada harcanan kredi kaybolmaz. Aşama bitince ya da sıfırdan başlarken silinir.
const krediKaydi = (klasor, asama) => path.join(guvenliYol(klasor), '.arayuz', `kredi-${asama}.json`);

// TopView'a gönderilmiş ama sonucu indirilmemiş görevler (.arayuz/topview-dosyalar.json → gorevler[]).
function bekleyenGorevler(klasor, asama) {
  try {
    const t = JSON.parse(fs.readFileSync(path.join(guvenliYol(klasor), '.arayuz', 'topview-dosyalar.json'), 'utf8'));
    return (t.gorevler || []).filter(g => (!g.asama || g.asama === asama) && !['indirildi', 'hata', 'iptal'].includes(g.durum));
  } catch { return []; }
}

// Eğitmen anlatımı aşamalarına eklenen özel istek bloğu (diğer bölümlerde boş).
function ozelIstekBlogu(klasor, d) {
  if (!OZEL_BOLUMLER.includes(d.bolum)) return '';
  const istekler = ozelIstekOku(klasor);
  if (!istekler.length) return '';
  return `\n\nGAMZE HOCA'NIN BU VİDEOYA ÖZEL İSTEĞİ (${klasor}/${OZEL_ISTEK}; sesli/yazılı, otomatik deşifre olabilir; birden fazlaysa hepsi geçerli, çelişirse en sondaki): `
    + 'her aşama kendi işine düşeni harfiyen uygular (senaryo: metin, konu nesnesi, süre · ses: ton, duygu etiketleri, hız · kareler: masa/nesne · video: el hareketleri, jest yoğunluğu · kurgu: görsel). '
    + `Süre ve kredili/kredisiz ayarı sunucuda zaten uygulandı (${d.sure} sn, mod yukarıda); onları yeniden yorumlama. CLAUDE.md değişmez kurallarıyla çelişen kısım (yüz, takı, sağlık iddiası…) UYGULANMAZ, raporda EKSIK olarak nedeniyle yazılır. `
    + 'Denetimde ve UYUM puanında bu isteğe uyum da ölçülür.\n'
    + istekler.map(s => '> ' + s.replace(/\n/g, '\n> ')).join('\n');
}

function calistir({ klasor, asama, not, krediOnay, krediLimit, otoDeneme, surdur }) {
  if (calisan) throw new Error(`Şu an çalışan bir iş var: ${calisan.klasor} · ${calisan.asama}`);
  const d = durumOku(klasor);
  const b = bolumBul(d.bolum);
  const a = b.asamalar.find(x => x.id === asama);
  if (!a) throw new Error('aşama yok');
  // Yarıda kalmış aşama hangi yoldan başlatılırsa başlatılsın (açılış, "Devam", elle) sürdürme kipinde çalışır.
  surdur = !!surdur || d.asamalar[asama]?.durum === 'yarida';
  const krediHarcar = d.mod === 'kredili' && a.kredili;
  // Otomatik akışta bütçe baştan onaylıdır; elle çalıştırmada kutu işaretlenmeli.
  const kalan = d.otomatik ? (d.butce || 0) - d.harcanan : Number(krediLimit) || 0;
  if (krediHarcar && !d.otomatik && !krediOnay) throw new Error('Bu aşama kredili: önce kredi onay kutusunu işaretleyin.');
  if (krediHarcar && kalan <= 0) throw new Error(`Kredi bütçesi bitti (bütçe ${d.butce}, harcanan ${d.harcanan}).`);

  const t = tanim();
  const tarayici = tarayiciGerekli(d.mod, asama);
  let modKurali = t.modlar[d.mod].kural;
  if (d.mod === 'kredili' && tarayici) modKurali += ' İSTİSNA: görsel arama anahtarı olmadığı için yalnız gerçek referans araması (Bing Görseller) için tarayıcı kullanılabilir.';
  const doldur = s => s.replaceAll('{klasor}', klasor).replaceAll('{konu}', d.konu || '').replaceAll('{bolum}', `${b.ad} (${b.sistem})`)
    .replaceAll('{kaynaklar}', (d.kaynaklar || []).join(', ') || 'referans-videolar/ altındaki ilgili çekim')
    .replaceAll('{not}', (not || '').trim() || 'yok').replaceAll('{sure}', String(d.sure)).replaceAll('{planSayisi}', String(planSayisi(d.sure))).replaceAll('{parcalar}', parcalar(d.sure))
    .replaceAll('{butce}', String(d.otomatik ? d.butce : kalan)).replaceAll('{harcanan}', String(d.otomatik ? d.harcanan : 0))
    .replaceAll('{asamaIdleri}', b.asamalar.map(x => x.id).join(', ')).replaceAll('{kalan}', String(Math.max(0, Math.round(kalan * 100) / 100)))
    .replaceAll('{asama}', asama).replaceAll('{beden}', d.beden || 'yok');

  const logDir = path.join(guvenliYol(klasor), '.arayuz');
  fs.mkdirSync(logDir, { recursive: true });
  const logYolu = path.join(logDir, `${asama}.log`);
  let surdurBlogu = '';
  if (surdur) {
    // Kesilen çalışmanın günlüğü silinmesin: neyin gönderildiği orada yazıyor.
    let eskiLog = '';
    if (fs.existsSync(logYolu)) { eskiLog = `.arayuz/${asama}.yarida-${Date.now()}.log`; fs.renameSync(logYolu, path.join(guvenliYol(klasor), eskiLog)); }
    const gorevler = bekleyenGorevler(klasor, asama);
    surdurBlogu = '\n\nSÜRDÜRME — BU AŞAMA YARIDA KALMIŞTI (sunucu kapandı). Baştan başlama: yukarıdaki SÜRDÜRME kuralını uygula, hazır olanı koru, kaldığın yerden devam et.'
      + (eskiLog ? ` Kesilen çalışmanın günlüğü: {klasor}/${eskiLog} — önce onu oku (en son ne yapılıyordu, hangi görev gönderildi).` : '')
      + (gorevler.length ? `\nGÖNDERİLMİŞ, SONUCU ALINMAMIŞ TopView görevleri (YENİ GÖREV AÇMA; önce bunları sorgula — kredisizde topview_list_board_tasks / topview_query_task, kredilide topview_query_task; bitmişse indir, sürüyorsa bekle, hata verdiyse durumunu 'hata' yap):\n${gorevler.map(g => '- ' + JSON.stringify(g)).join('\n')}` : '')
      + (fs.existsSync(krediKaydi(klasor, asama)) ? `\nKREDİ: .arayuz/kredi-${asama}.json kesilen çalışmanın başlangıç bakiyesidir; ÜZERİNE YAZMA. Kesilen çalışmada harcanan = o başlangıç − şimdiki bakiye; bu aşamada harcayabileceğin kalan = {kalan} − bu tutar. HARCANAN_KREDI = başlangıç − son bakiye (iki çalışmanın toplamı).` : '');
  } else fs.rmSync(krediKaydi(klasor, asama), { force: true }); // sıfırdan çalışma: eski kayıt hesabı bozmasın
  const istem = doldur(t.ortak).replace('ÜRETİM MODU: {mod}', 'ÜRETİM MODU: ' + doldur(modKurali))
    + '\n\nAŞAMA — ' + a.ad + ':\n' + doldur(t.surdurme) + (a.surdur ? ' Bu aşamada: ' + doldur(a.surdur) : '') + '\n' + doldur(a.talimat) + doldur(surdurBlogu)
    + '\n\nRAPOR SONU (sunucu okur, bu sırayla): denetimde bulduğun her eksik için bir `EKSIK: <kısa, kullanıcının anlayacağı dille>` satırı (en fazla 6); '
    + '`UYUM: <0-100>` — çıktının isteğe (senaryo, CLAUDE.md kuralları, kullanıcı notu) genel uyum yüzdesi, denetçi raporlarına dayanarak dürüstçe; '
    + '`SONUC: TAMAM` ya da `SONUC: SORUN` (denetimden geçmeyen kare/video, bütçe ya da Sınırsız mod nedeniyle yapılamayan gönderim, eksik çıktı varsa SORUN); gerekiyorsa `GERI: <aşama-id>`; en son `HARCANAN_KREDI: <sayı>`.'
    + ozelIstekBlogu(klasor, d)
    + '\nKREDİ PAYI: kredili üretimi (video, Video Edit, ücretli görsel) bu aşama içinde kendiliğinden YENİDEN GÖNDERME — denetim kötüyse düşük UYUM ve EKSIK yaz, yeniden üretme kararı hattındır. Kredisiz işlerde (Sınırsız kareler) en fazla 1 düzeltme turu yap.';

  const log = fs.createWriteStream(logYolu);
  log.write(`# ${new Date().toLocaleString('tr-TR')} · ${klasor} · ${a.ad} · ${t.modlar[d.mod].ad} · ${d.sure} sn${surdur ? ' · SÜRDÜRME' : ''}\n# Not: ${(not || '').trim() || '-'}\n\n`);

  const araclar = TEMEL_ARACLAR + (tarayici ? ',mcp__playwright' : '');
  const yasak = d.mod === 'kredili' ? [] : ['--disallowedTools', KREDILI_MCP.join(',')];
  const proc = spawn('claude', ['-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits', '--allowedTools', araclar, ...yasak],
    { cwd: KOK, shell: true, windowsHide: true });
  proc.stdin.end(istem + ogrenme.istemBlogu());
  let kalanSatir = '', sonuc = '';
  proc.stdout.on('data', parca => {
    kalanSatir += parca.toString('utf8');
    const satirlar = kalanSatir.split('\n'); kalanSatir = satirlar.pop();
    for (const s of satirlar) {
      if (!s.trim()) continue;
      try { const o = JSON.parse(s); const g = gunlukSatiri(o); if (g) log.write(g + '\n'); if (o.type === 'result') sonuc = o.result || ''; }
      catch { log.write(s + '\n'); }
    }
  });
  proc.stderr.on('data', p => log.write('[stderr] ' + p.toString('utf8')));
  calisan = { klasor, asama, proc, baslangic: Date.now() };
  d.asamalar[asama] = { durum: 'calisiyor', baslangic: new Date().toISOString(), deneme: otoDeneme ? d.asamalar[asama]?.deneme || 0 : 0, ...(surdur ? { surdurme: true } : {}) };
  durumYaz(klasor, d);
  olaylar.emit('asama', { klasor, asama, ad: a.ad, durum: 'basladi' });
  proc.on('close', kod => {
    log.end(`\n# bitti · çıkış kodu ${kod}\n`);
    const durduruldu = !!calisan?.durduruldu, gecis = calisan?.gecis;
    const sure = Math.round((Date.now() - calisan.baslangic) / 60000);
    calisan = null;
    if (gecis) { // krediliye geçiş: aynı aşama kredili olarak yeniden (kredisiz günlük saklanır)
      try { fs.renameSync(logYolu, path.join(logDir, `${asama}.kredisiz-${Date.now()}.log`)); } catch {}
      const dd = durumOku(klasor); delete dd.asamalar[asama]; durumYaz(klasor, dd);
      kuyruk.unshift({ klasor, asama, not: gecis.not });
    } else asamaBitti(klasor, a, { kod, durduruldu, sonuc, sure });
    while (!calisan && kuyruk.length) isEkle(kuyruk.shift());
  });
}

function hataBildir(klasor, asama, mesaj) {
  const d = durumOku(klasor);
  d.asamalar[asama] = { ...(d.asamalar[asama] || {}), durum: 'hata', ozet: mesaj };
  if (d.otomatik) d.bekleyen = { asama, tur: 'hata', zaman: new Date().toISOString() };
  durumYaz(klasor, d);
  olaylar.emit('onay', { klasor, asama, tur: 'hata', ozet: mesaj });
}

function asamaBitti(klasor, a, { kod, durduruldu, sonuc, sure }) {
  const d = durumOku(klasor);
  const k = sonuc.match(/HARCANAN_KREDI:\s*([\d.,]+)/);
  if (k) d.harcanan = Math.round((d.harcanan + Number(k[1].replace(',', '.'))) * 100) / 100;
  if (k || !durduruldu) fs.rmSync(krediKaydi(klasor, a.id), { force: true }); // harcama durum.json'a geçti
  const sorun = /SONUC:\s*SORUN/i.test(sonuc);
  const durum = durduruldu ? 'durduruldu' : kod === 0 ? 'bitti' : 'hata';
  const deneme = d.asamalar[a.id]?.deneme || 0;
  // Uyum payı: çıktı isteğe ESIK_UYUM (varsayılan %70) ve üstü uyuyorsa düzeltme yapılmaz, eksikler teslimde listelenir.
  // Uyum yazılmamışsa kredi harcamamak için yeterli sayılır.
  const uyum = Number(sonuc.match(/UYUM:\s*%?\s*(\d+)/i)?.[1] ?? NaN);
  const eksikler = [...sonuc.matchAll(/^\s*EKSIK:\s*(.+)$/gim)].map(m => m[1].trim()).slice(0, 6);
  const agirSorun = sorun && uyum < (Number(process.env.ESIK_UYUM) || 70);
  d.asamalar[a.id] = { durum, bitis: new Date().toISOString(), ozet: sonuc.slice(0, 4000), deneme,
    ...(sorun ? { sorun: true } : {}), ...(Number.isNaN(uyum) ? {} : { uyum }), ...(eksikler.length ? { eksikler } : {}) };
  if (durduruldu) { d.otomatik = false; durumYaz(klasor, d); return; }
  const ozet = sonuc.replace(/\n*(SONUC|HARCANAN_KREDI|GERI|UYUM|EKSIK):.*$/gim, '').trim();
  if (!d.otomatik) { durumYaz(klasor, d); olaylar.emit('asama', { klasor, asama: a.id, ad: a.ad, durum, sure, ozet }); return; }
  // Claude notun daha önceki bir aşamada giderilmesi gerektiğine karar verdiyse (GERI: <id>) oradan yeniden başla (en fazla 2 kez).
  const geri = sonuc.match(/GERI:\s*([a-z]+)/i)?.[1];
  const asamalar = bolumBul(d.bolum).asamalar, i = asamalar.findIndex(x => x.id === geri);
  if (durum !== 'hata' && i >= 0 && i < asamalar.findIndex(x => x.id === a.id) && (d.geriSayisi || 0) < 2) {
    d.geriSayisi = (d.geriSayisi || 0) + 1;
    for (const x of asamalar.slice(i)) delete d.asamalar[x.id];
    durumYaz(klasor, d);
    olaylar.emit('asama', { klasor, asama: geri, ad: asamalar[i].ad, durum: 'geri' });
    return isEkle({ klasor, asama: geri, not: d.sonNot || ozet.slice(0, 800) });
  }
  // Tam otomatikte Claude karar verir: hata ya da uyum payının altındaki sorun YALNIZ 1 kez (raporu not olarak) yeniden denenir.
  // Payın üstündeki sorun ve tükenen deneme → mevcut çıktıyla devam, eksikler teslim mesajında; hata ise durup haber verir.
  if (d.onaylar === 'yok' && (durum === 'hata' || agirSorun) && deneme < 1) {
    d.asamalar[a.id].deneme = deneme + 1;
    durumYaz(klasor, d);
    olaylar.emit('asama', { klasor, asama: a.id, ad: a.ad, durum: 'yeniden', sure });
    return isEkle({ klasor, asama: a.id, otoDeneme: true, not: `Önceki deneme ${durum === 'hata' ? 'hata verdi' : `denetimden geçmedi (uyum %${uyum})`}; ${eksikler.length ? 'eksikler: ' + eksikler.join('; ') : 'raporu: ' + ozet.slice(0, 1500)} — bunları gider.` });
  }
  if (sorun || eksikler.length) (d.uyarilar = d.uyarilar || []).push(
    `${a.ad}${Number.isNaN(uyum) ? '' : ` (uyum %${uyum})`}: ${eksikler.length ? eksikler.join('; ') : ozet.slice(0, 300)}`);
  // Hata her zaman durur; onaylı akışta payın altındaki sorunda ve onay kapısında da durulur.
  const tur = durum === 'hata' ? 'hata' : d.onaylar === 'yok' ? null : agirSorun ? 'sorun' : a.onay ? 'onay' : null;
  if (tur) {
    d.bekleyen = { asama: a.id, tur, zaman: new Date().toISOString() };
    durumYaz(klasor, d);
    return olaylar.emit('onay', { klasor, asama: a.id, tur, ozet, sure, onay: a.onay, mod: d.mod, harcanan: d.harcanan, butce: d.butce });
  }
  durumYaz(klasor, d);
  olaylar.emit('asama', { klasor, asama: a.id, ad: a.ad, durum, sure });
  sonrakiniBaslat(klasor);
}

function sonrakiAsama(d) { return bolumBul(d.bolum).asamalar.find(a => d.asamalar[a.id]?.durum !== 'bitti'); }

function sonrakiniBaslat(klasor) {
  const d = durumOku(klasor);
  const s = sonrakiAsama(d);
  if (!s) {
    d.otomatik = false; d.teslim = new Date().toISOString();
    durumYaz(klasor, d);
    const son = bolumBul(d.bolum).asamalar.at(-1);
    ogrenme.kaydet({ tur: 'teslim', klasor, konu: d.konu, bolum: d.bolum, mod: d.mod, sure: d.sure, uyarilar: d.uyarilar || [],
      uyumlar: Object.fromEntries(Object.entries(d.asamalar).filter(([, x]) => x.uyum != null).map(([k, x]) => [k, x.uyum])) });
    ogrenme.ogren();
    return olaylar.emit('bitti', { klasor, konu: d.konu, mod: d.mod, harcanan: d.harcanan, butce: d.butce, uyarilar: d.uyarilar || [],
      gonder: son.onay?.gonder || ['teslim/*.mp4', 'teslim/ACIKLAMA.txt'], onayli: d.onaylar === 'iki' });
  }
  isEkle({ klasor, asama: s.id });
}

// Uçtan uca akışı başlatır (ya da kaldığı yerden sürdürür).
function otomatikBaslat(klasor) {
  const d = durumOku(klasor);
  if (d.bolum === 'cekim' && !(d.kaynaklar || []).length) throw new Error('Önce Gamze\'nin çekimini yükleyin.');
  if (d.bekleyen) throw new Error('Bu video onay bekliyor.');
  if (calisan?.klasor === klasor || kuyruk.some(k => k.klasor === klasor)) throw new Error('Bu video zaten çalışıyor.');
  d.otomatik = true;
  durumYaz(klasor, d);
  sonrakiniBaslat(klasor);
}

// Onay kapısı kararı: devam | duzelt (not ile aynı aşamayı yeniden) | tekrar | iptal.
function onayVer({ klasor, karar, not }) {
  const d = durumOku(klasor);
  const bek = d.bekleyen;
  if (!bek) throw new Error('Bu video onay beklemiyor.');
  d.bekleyen = null;
  ogrenme.kaydet({ tur: karar === 'iptal' ? 'iptal' : karar === 'duzelt' ? 'onay-duzelt' : 'onay-devam', klasor, konu: d.konu, asama: bek.asama, ...(karar === 'duzelt' ? { not } : {}) });
  if (karar === 'iptal') { d.otomatik = false; durumYaz(klasor, d); return 'iptal'; }
  d.otomatik = true;
  if (karar === 'devam' && bek.tur !== 'hata') {
    if (d.asamalar[bek.asama]) d.asamalar[bek.asama].onay = new Date().toISOString();
    durumYaz(klasor, d);
    sonrakiniBaslat(klasor);
    return 'devam';
  }
  durumYaz(klasor, d);
  return isEkle({ klasor, asama: bek.asama, not: karar === 'duzelt' ? not : '' });
}

// kaynak: 'eksik' = teslimde listelenen eksiklerin düzeltilmesi (öğrenme için ayrı kaydedilir).
function duzelt({ klasor, not, kaynak }) {
  if (!not?.trim()) throw new Error('Düzeltme notu gerekli.');
  if (calisan?.klasor === klasor || kuyruk.some(k => k.klasor === klasor)) throw new Error('Bu video zaten çalışıyor.');
  const d = durumOku(klasor);
  const son = bolumBul(d.bolum).asamalar.at(-1);
  ogrenme.kaydet({ tur: kaynak === 'eksik' ? 'eksik-duzelt' : 'duzelt', klasor, konu: d.konu, bolum: d.bolum, not: not.trim() });
  Object.assign(d, { otomatik: true, bekleyen: null, teslim: null, uyarilar: [], geriSayisi: 0, sonNot: not.trim() });
  durumYaz(klasor, d);
  return isEkle({ klasor, asama: son.id, not: not.trim() });
}

function durdur() {
  kuyruk.length = 0;
  if (calisan) { calisan.durduruldu = true; spawn('taskkill', ['/pid', String(calisan.proc.pid), '/T', '/F']); }
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

// Önceki oturumdan "çalışıyor" kalmış aşamalar yarıda kesilmiştir → "yarida" (hata değil). Sürdürme açılışta, Telegram bağlandıktan sonra.
const surdurulecek = []; // { klasor, asama | null }  (asama null: kuyrukta beklerken kapanmış otomatik iş)
for (const k of videoKlasorleri()) {
  try {
    const d = JSON.parse(fs.readFileSync(durumYolu(k), 'utf8'));
    let yarida = null;
    for (const [id, a] of Object.entries(d.asamalar || {})) if (a.durum === 'calisiyor') {
      Object.assign(a, { durum: 'yarida', ozet: 'Sunucu kapandığı için yarıda kaldı; kaldığı yerden sürdürülüyor.', kesilme: new Date().toISOString() });
      yarida = id;
    }
    if (yarida) fs.writeFileSync(durumYolu(k), JSON.stringify(d, null, 2));
    if (d.otomatik && !d.bekleyen && !d.teslim) surdurulecek.push({ klasor: k, asama: yarida });
  } catch {}
}

// Otomatik işleri sırayla kuyruğa verir (tek seferde tek iş; isEkle). Onay bekleyenler beklemeye devam eder.
// Sürdürme de deneme sayılır: aşama zaten 1 kez yeniden denendiyse sürdürülmez, hata kapısına düşer (sonsuz döngü yok).
function acilistaSurdur() {
  surdurulecek.sort((x, y) => (y.asama ? 1 : 0) - (x.asama ? 1 : 0)); // yarıda kalan önce, kuyrukta bekleyenler sonra
  for (const { klasor, asama } of surdurulecek) {
    try {
      const d = durumOku(klasor);
      if (!asama) { olaylar.emit('surduruluyor', { klasor, konu: d.konu, ad: sonrakiAsama(d)?.ad }); sonrakiniBaslat(klasor); continue; }
      const a = bolumBul(d.bolum).asamalar.find(x => x.id === asama);
      const deneme = d.asamalar[asama].deneme || 0;
      if (deneme >= 1) {
        // Durum "yarida" kalır: "Tekrar dene" (onayVer → isEkle → calistir) sürdürme kipinde başlar.
        const ozet = 'Sunucu kapandığı için yarıda kaldı; bu aşama zaten yeniden denenmişti, kendiliğinden sürdürülmedi. "Tekrar dene" ile kaldığı yerden devam eder.';
        d.asamalar[asama].ozet = ozet;
        d.bekleyen = { asama, tur: 'hata', zaman: new Date().toISOString() };
        durumYaz(klasor, d);
        olaylar.emit('onay', { klasor, asama, tur: 'hata', ozet });
        continue;
      }
      d.asamalar[asama].deneme = deneme + 1;
      durumYaz(klasor, d);
      olaylar.emit('surduruluyor', { klasor, konu: d.konu, ad: a.ad, asama });
      console.log(`Sürdürülüyor: ${klasor} · ${a.ad} (yarıda kalmıştı)`);
      isEkle({ klasor, asama, otoDeneme: true, surdur: true });
    } catch (e) { console.log('Sürdürülemedi:', klasor, e.message); }
  }
}

const durumListesi = () => ({
  calisan: calisan && { klasor: calisan.klasor, asama: calisan.asama, baslangic: calisan.baslangic },
  kuyruk: kuyruk.map(k => ({ klasor: k.klasor, asama: k.asama })),
  videolar: videoKlasorleri().map(k => ({ klasor: k, ...durumOku(k) }))
});

const sunucu = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const q = Object.fromEntries(u.searchParams);
  try {
    if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/index.html'))
      return dosyaGonder(req, res, path.join(ARAYUZ, 'public', 'index.html'));
    if (u.pathname === '/api/tanim') return json(res, 200, { ...tanim(), sure: SURE });
    if (u.pathname === '/api/tahmin') return json(res, 200, { kredi: tahminiKredi(q.bolum, Number(q.sure) || SURE.varsayilan, q.mod), plan: planSayisi(Number(q.sure) || SURE.varsayilan) });
    if (u.pathname === '/api/videolar' && req.method === 'GET') return json(res, 200, durumListesi());
    if (u.pathname === '/api/videolar' && req.method === 'POST') return json(res, 200, { klasor: yeniKlasor(await govdeOku(req)) });
    if (u.pathname === '/api/yukle' && req.method === 'POST') return json(res, 200, { yol: await kaynakEkle(q.klasor, q.ad, req) });
    if (u.pathname === '/api/calistir' && req.method === 'POST') { calistir(await govdeOku(req)); return json(res, 200, { ok: true }); }
    if (u.pathname === '/api/otomatik' && req.method === 'POST') { otomatikBaslat((await govdeOku(req)).klasor); return json(res, 200, { ok: true }); }
    if (u.pathname === '/api/onay' && req.method === 'POST') return json(res, 200, { sonuc: onayVer(await govdeOku(req)) });
    if (u.pathname === '/api/duzelt' && req.method === 'POST') return json(res, 200, { sonuc: duzelt(await govdeOku(req)) });
    if (u.pathname === '/api/tercihler' && req.method === 'GET') return json(res, 200, { kurallar: ogrenme.kurallar(), kalibrasyon: ogrenme.kalibrasyon() });
    if (u.pathname === '/api/tercihler/unut' && req.method === 'POST') return json(res, 200, { silinen: ogrenme.unut((await govdeOku(req)).no) });
    if (u.pathname === '/api/durdur' && req.method === 'POST') { durdur(); return json(res, 200, { ok: true }); }
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

if (process.env.TELEGRAM_BOT_TOKEN) {
  const { telegramBaslat } = await import('./telegram.mjs');
  telegramBaslat({
    KOK, olaylar, SURE, tanim, bolumBul, eslesen, durumOku, tahminiKredi, planSayisi, bedenIpucu,
    yeniKlasor, ayarDegistir, ozelIstekEkle, ozelIstekOku, ozelIstekSil, OZEL_BOLUMLER, krediliyeGec, takilmaErtele, kaynakEkle, otomatikBaslat, onayVer, duzelt, durdur, durumListesi, ogrenme,
    mesgul: () => !!calisan
  });
}

acilistaSurdur(); // Telegram dinleyicileri bağlandıktan sonra: "sürdürülüyor" mesajı kaybolmasın
