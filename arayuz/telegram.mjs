// Telegram botu — Gamze Hoca telefondan video başlatır; tam otomatikte yalnız bitmiş video gelir (istenirse "onaylı": kareler/kesitler + teslim).
// sunucu.mjs içinden başlar (.env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID). Bağımlılıksız: Node fetch + long polling.
// Yalnız TELEGRAM_CHAT_ID'deki sohbetlere cevap verir; kimlik boşsa yalnız "kimliğiniz şu" der.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';

const API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const DOSYA = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const IZINLI = new Set((process.env.TELEGRAM_CHAT_ID || '').split(',').map(s => s.trim()).filter(Boolean));
const YENIDEN_BASLAT = 75; // STUDYO-AC.bat bu çıkış koduyla sunucuyu yeniden açar

const YARDIM = `Komutlar:
Sesli anlatım (eğitmen videosu): bir bitkinin/konunun faydasını sesli mesajla kendi üslubunuzla anlatın. Ofisinizde, masada o bitkiyle (ör. taze ve kuru reyhan), elleriniz konuşmaya uyarak anlatan bir video hazırlanır; yüz görünmez. Ses dosyası gönderirseniz açıklamasına süre/mod yazabilirsiniz (ör. "30sn kredili").
/egitim <konu> [süre] [kredili] [onaylı] — sesli mesaj olmadan eğitmen videosu
   ör. /egitim reyhan 30sn
Sesli tarif: sesli mesajın açıklamasına "tarif" yazın; tarif videosu (mutfakta adım adım) hazırlanır.
/yeni <konu> [süre] [kredili] [onaylı] — tarif videosu başlatır
   ör. /yeni bal zencefil 20sn
   ör. /yeni zencefilli limon 45sn kredili
Çekim videosu: videoyu bu sohbete gönderin, açıklamasına konuyu yazın (ör. "hacamat 25sn").
Video linki: Instagram/TikTok/YouTube linkini yanına konuyla yazın (ör. "https://instagram.com/reel/… hacamat 25sn"). Video indirilir, eller ve ortam bizimkilerle değiştirilir; üstündeki yazı ve logolar kaldırılır.
Linkten yalnız tarif: linkin yanına "tarif" yazın (ör. "https://instagram.com/reel/… tarif 30sn"). Videodaki konuşma ve gönderi açıklaması okunur, tarif çıkarılır; görüntü kullanılmaz, video sıfırdan bizim mutfağımızda üretilir.
Linkten anlatım: linkin yanına "eğitim" yazın; konuşmadaki bilgi sizin üslubunuzla yeniden yazılır, ofisinizde eğitmen videosu olur.
Bedende gösterim: tarif bir bedende gösterilecekse isteğe yazın: "çocuk eli", "erkek kolu", "ön kol", "ayak", "sırt" (ör. "https://… tarif 25sn çocuk eli" ya da "/yeni çimdik testi erkek kolu 20sn"). Bu ipucu senaryoya geçer; o planda yüzsüz bir gösterim bedeni (el, ön kol, ayak, sırt) kullanılır.
/hocasesi [no] — sesli mesajınızdan çıkan son videoyu sizin kelimelerinizle ve ses tonunuzla (ElevenLabs) yeniden hazırlar; her cümle anlattığı plana oturur (ör. /hocasesi ya da /hocasesi 05). Eski video da kalır.
/durum — çalışan ve bekleyen işler
/tercihler — sistemin sizden öğrendikleri
/unut <no> — yanlış öğrenilen bir tercihi siler
/dur — çalışan işi durdurur
/guncelle — sistemi günceller ve yeniden başlatır

Süre 10-60 sn (30 sn üstü iki parçada üretilip birleştirilir). Varsayılan: 25 sn, kredisiz (TopView Sınırsız, 0 kredi). "kredili" yazarsanız tarayıcı açılmadan hızlı üretilir.
Tam otomatik: Claude her aşamayı kendi denetler, sorunluysa kendisi yeniden yapar; size yalnız bitmiş video gelir. Küçük kusurlar için tekrar tekrar üretmez (kredi payı): isteğe %70 ve üstü uyuyorsa videoyu gönderir, eksikleri yazar; "Eksikleri düzelt" derseniz düzeltir. Kendi notunuzla da düzelttirebilirsiniz, Claude hangi aşamadan başlayacağına kendisi karar verir.
"onaylı" yazarsanız o video kareler ve teslimde sizi bekler.

Ayar kartı: ne gönderirseniz gönderin (sesli mesaj, link, video, /egitim, /yeni) önce bir kart gelir: Kredisiz / Kredili, süre (15-60 sn), sesli mesaj ve linkte "Metni düzelt" (yanlış duyulan yeri yazarsınız), "Başlat" ve "İptal". 3 dk dokunmazsanız seçili ayarlarla kendiliğinden başlar.
Özel istek (yalnız eğitmen anlatımı): ayar kartında "Özel istek ekle"ye basın, isteğinizi yazın ya da sesli söyleyin (ör. "Kredili 51 saniye olacak. Eller konuşmaya çok uyumlu olsun, hiç durmasın. Masada yeşil taze reyhan da olsun. Ses kendinden emin, samimi, güven veren bir eğitmen tonunda olsun."). Kredili/kredisiz, süre ve "onaylı" kendiliğinden ayarlanır; kalanı senaryo, ses, kareler, video ve kurguda uygulanır. Aynı isteği birkaç videoda tekrarlarsanız kalıcı tercih olur.
Takılma: kredisiz modda bir aşama uzun süre biterse (Sınırsız kuyruk takılırsa) size "Kredili devam edilsin mi?" diye sorulur; hazır kısımlar korunur, kalanı kredili üretilir.`;

async function tg(yontem, govde) {
  const r = await fetch(`${API}/${yontem}`, govde instanceof FormData ? { method: 'POST', body: govde }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(govde || {}) });
  const v = await r.json();
  if (!v.ok) throw new Error(`${yontem}: ${v.description}`);
  return v.result;
}

const yaz = (chat, text, ek = {}) => tg('sendMessage', { chat_id: chat, text: text.slice(0, 4000), ...ek }).catch(e => console.log('Telegram:', e.message));
const herkese = (text, ek) => Promise.all([...IZINLI].map(c => yaz(c, text, ek)));

function dosyaForm(chat, alan, tam, ek = {}) {
  const f = new FormData();
  f.append('chat_id', String(chat));
  for (const [k, v] of Object.entries(ek)) f.append(k, typeof v === 'string' ? v : JSON.stringify(v));
  f.append(alan, new Blob([fs.readFileSync(tam)]), path.basename(tam));
  return f;
}

// Onay mesajıyla birlikte dosyaları gönderir: görseller albüm (10'arlı), video, metin dosyası içerik olarak.
async function dosyalariGonder(hat, chat, klasor, desenler) {
  const yollar = desenler.flatMap(d => hat.eslesen(klasor, d).slice(0, 20)).map(y => path.join(hat.KOK, y));
  const gorseller = yollar.filter(y => /\.(png|jpe?g|webp)$/i.test(y)).reverse(); // eslesen yeniden eskiye; albüm sırayla
  for (let i = 0; i < gorseller.length; i += 10) {
    const grup = gorseller.slice(i, i + 10).filter(y => fs.statSync(y).size < 10e6);
    if (grup.length === 1) { await tg('sendPhoto', dosyaForm(chat, 'photo', grup[0])).catch(e => yaz(chat, 'Görsel gönderilemedi: ' + e.message)); continue; }
    const f = new FormData();
    f.append('chat_id', String(chat));
    f.append('media', JSON.stringify(grup.map((y, j) => ({ type: 'photo', media: `attach://g${j}` }))));
    grup.forEach((y, j) => f.append(`g${j}`, new Blob([fs.readFileSync(y)]), path.basename(y)));
    await tg('sendMediaGroup', f).catch(e => yaz(chat, 'Görseller gönderilemedi: ' + e.message));
  }
  for (const y of yollar.filter(y => /\.mp4$/i.test(y)).slice(0, 1)) {
    const gonderilecek = fs.statSync(y).size > 49e6 ? telegramKopyasi(hat, klasor, y) : y;
    if (!gonderilecek) { await yaz(chat, `Video Telegram'a sığmıyor (50 MB). Bilgisayarda: ${path.relative(hat.KOK, y)}`); continue; }
    const ek = { supports_streaming: 'true', ...(gonderilecek !== y ? { caption: 'Telegram için küçültülmüş kopya; asıl dosya bilgisayarda teslim/ klasöründe.' } : {}) };
    await tg('sendVideo', dosyaForm(chat, 'video', gonderilecek, ek)).catch(e => yaz(chat, 'Video gönderilemedi: ' + e.message));
  }
  for (const y of yollar.filter(y => /\.(txt|md)$/i.test(y)).slice(0, 1)) await yaz(chat, fs.readFileSync(y, 'utf8'));
}

// 50 MB'yi aşan teslim videosundan Telegram'a sığan kopya (.arayuz/ altında; teslim klasörüne karışmaz).
function telegramKopyasi(hat, klasor, kaynak) {
  const hedef = path.join(hat.KOK, klasor, '.arayuz', 'telegram.mp4');
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', kaynak, '-vf', 'scale=-2:1280', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28',
    '-maxrate', '4M', '-bufsize', '8M', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', hedef], { windowsHide: true });
  return r.status === 0 && fs.existsSync(hedef) && fs.statSync(hedef).size < 49e6 ? hedef : null;
}

// Sesli mesaj ve "metin linki" türleri: hangi bölüme gider, hangi dosyaya yazılır (senaryo aşaması o dosyayı okur).
const TURLER = {
  egitim: { ne: 'anlatım', neyi: 'anlatımı', baslik: "Gamze Hoca'nın sesli anlatımı", dosya: 'SESLI-ANLATIM.md', klasor: 'sesli-anlatim', komut: '/egitim',
    mekan: 'ofisinizde eğitmen videosu olarak', linkNot: 'Bilgi (faydalar, kullanım biçimleri) buradan alınır.' },
  tarif: { ne: 'tarif', neyi: 'tarifi', baslik: "Gamze Hoca'nın sesli tarifi", dosya: 'SESLI-TARIF.md', klasor: 'sesli-tarif', komut: '/yeni',
    mekan: 'bizim mutfağımızda', linkNot: 'Tarif (malzeme, ölçü, sıra) buradan alınır.' }
};

// Mesajdaki tür etiketi: "tarif" → tarif, "eğitim/anlatım/fayda" → eğitim, yoksa null. Etiket metinden çıkarılır (konu sanılmasın).
function turEtiketi(metin) {
  let tur = null;
  const kalan = ` ${metin || ''} `
    .replace(/\s(sadece|yalnız|yalniz)?\s*(tarif|tarifi|tarifini)(?=\s)/i, () => { tur = 'tarif'; return ' '; })
    .replace(/\s(eğitim|egitim|eğitmen|egitmen|anlatım|anlatim|fayda|faydası|faydasi)(?=\s)/i, m => { if (tur) return m; tur = 'egitim'; return ' '; });
  return { tur, kalan: kalan.trim() };
}

const kisa = (s, n = 700) => (s || '').length > n ? s.slice(0, n) + '…' : (s || '');

// "/yeni bal zencefil 20sn kredili 40kredi onaylı" → { konu, sure, mod, butce, onaylar }
function ayristir(metin, SURE) {
  let s = ` ${metin} `, sure, mod, butce, onaylar;
  // \b Türkçe harfleri (ı, ü) tanımaz; kelime sınırı boşlukla aranır (metin iki yandan boşlukla sarılı).
  s = s.replace(/\s(\d+)\s*kredi(?=\s)/i, (_, n) => { butce = Number(n); return ' '; });
  s = s.replace(/\s(\d+)\s*(sn|s|saniye|sec)(?=\s)/i, (_, n) => { sure = Number(n); return ' '; });
  s = s.replace(/\s(kredili|hızlı|hizli)(?=\s)/i, () => { mod = 'kredili'; return ' '; });
  s = s.replace(/\s(kredisiz|ücretsiz|ucretsiz)(?=\s)/i, () => { mod = 'kredisiz'; return ' '; });
  s = s.replace(/\s(onaylı|onayli|onayla)(?=\s)/i, () => { onaylar = 'iki'; return ' '; });
  return { konu: s.trim().replace(/\s+/g, ' '), sure: sure || SURE.varsayilan, mod, butce, onaylar };
}

// Serbest özel istekten ayarlar ("Kredili 51 saniye olacak! … onaylı") → { mod, sure, onaylar }. Metin olduğu gibi kalır (istek dosyasına tamamı yazılır).
// Noktalama ve büyük harf önemsiz; whisper sayıyı yazıyla da yazabilir ("elli bir saniye", "bir dakika").
const ONLAR = { on: 10, yirmi: 20, otuz: 30, kırk: 40, kirk: 40, elli: 50, altmış: 60, altmis: 60 };
const BIRLER = { bir: 1, iki: 2, üç: 3, uc: 3, dört: 4, dort: 4, beş: 5, bes: 5, altı: 6, alti: 6, yedi: 7, sekiz: 8, dokuz: 9 };
function istekAyarlari(metin) {
  const s = ' ' + (metin || '').toLocaleLowerCase('tr').replace(/[^\p{L}\p{N}]+/gu, ' ') + ' ';
  const o = {};
  if (/\skredili\s/.test(s)) o.mod = 'kredili';
  else if (/\s(kredisiz|ücretsiz|ucretsiz)\s/.test(s)) o.mod = 'kredisiz';
  let m = s.match(/\s(\d{1,3})\s*(sn|saniye\p{L}*|saniyelik)\s/u);
  if (m) o.sure = Number(m[1]);
  else if ((m = s.match(new RegExp(`\\s(${Object.keys(ONLAR).join('|')})\\s*(${Object.keys(BIRLER).join('|')})?\\s*(sn|saniye\\p{L}*)\\s`, 'u')))) o.sure = ONLAR[m[1]] + (BIRLER[m[2]] || 0);
  else if (/\s(bir|1)\s*dakika\p{L}*\s/u.test(s)) o.sure = 60;
  else if (/\syarım\s*dakika\p{L}*\s/u.test(s)) o.sure = 30;
  if (/\s(onaylı|onayli)\s/.test(s)) o.onaylar = 'iki';
  else if (/\stam\s*otomatik\s/.test(s)) o.onaylar = 'yok';
  return o;
}

function baslatildiMetni(hat, klasor) {
  const d = hat.durumOku(klasor);
  const b = hat.bolumBul(d.bolum);
  const kredi = d.mod === 'kredili' ? `Kredili (bütçe ${d.butce} kredi)` : 'Kredisiz (0 kredi)';
  const ilk = b.asamalar.find(a => a.onay);
  const sonra = d.onaylar === 'iki' ? `${ilk.onay.baslik.toLowerCase().replace(/ hazır$/, '')} hazır olunca haber vereceğim.` : 'Bitince videoyu buraya göndereceğim; arada size bir şey sormayacağım.';
  return `Başladı: ${d.konu}\n${b.ad} · ${d.sure} sn · ${kredi}\n${sonra}`;
}

function dugmeler(klasor, tur, onay, kredisiz) {
  if (tur === 'hata') return [[{ text: 'Tekrar dene', callback_data: `t|${klasor}` }, { text: 'İptal', callback_data: `i|${klasor}` }],
    ...(kredisiz ? [[{ text: 'Kredili devam et', callback_data: `kg|${klasor}` }]] : [])];
  return [[{ text: tur === 'sorun' ? 'Yine de devam' : onay?.devam || 'Devam', callback_data: `d|${klasor}` }, { text: 'Düzelt', callback_data: `z|${klasor}` }],
    [{ text: 'İptal', callback_data: `i|${klasor}` }]];
}

function durumMetni(hat) {
  const v = hat.durumListesi();
  const satir = [];
  if (v.calisan) satir.push(`Çalışıyor: ${v.calisan.klasor} · ${v.calisan.asama} (${Math.round((Date.now() - v.calisan.baslangic) / 60000)} dk)`);
  for (const k of v.kuyruk) satir.push(`Sırada: ${k.klasor} · ${k.asama}`);
  for (const d of v.videolar.filter(x => x.bekleyen)) satir.push(`Onay bekliyor: ${d.klasor} · ${d.bekleyen.asama}`);
  return satir.join('\n') || 'Şu an çalışan iş yok.';
}

export function telegramBaslat(hat) {
  const notBekleyen = new Map(); // chat → { klasor, son } ("Düzelt"ten sonra gelen metin not olur; son = bitmiş videoya düzeltme)

  hat.olaylar.on('asama', o => {
    if (o.durum === 'basladi') return;
    const d = hat.durumOku(o.klasor);
    if (!d.otomatik && o.durum === 'bitti') return; // elle çalıştırılan aşamalarda sessiz
    if (o.durum === 'geri') return herkese(`Düzeltme için "${o.ad}" aşamasından yeniden yapıyorum · ${d.konu}`);
    if (d.onaylar === 'yok') return; // tam otomatikte ara mesaj yok
    herkese(`${o.ad}: ${o.durum === 'bitti' ? 'bitti' : o.durum}${o.sure != null ? ` (${o.sure} dk)` : ''} · ${d.konu}`);
  });

  hat.olaylar.on('onay', async o => {
    const d = hat.durumOku(o.klasor);
    const kredi = d.mod === 'kredili' ? `\nHarcanan: ${d.harcanan} / ${d.butce} kredi` : '';
    let baslik, sonraki = '';
    if (o.tur === 'hata') baslik = `Hata: ${o.asama} · ${d.konu}`;
    else if (o.tur === 'sorun') baslik = `Denetimde sorun: ${o.asama} · ${d.konu}`;
    else {
      baslik = `${o.onay.baslik} · ${d.konu}`;
      const b = hat.bolumBul(d.bolum), i = b.asamalar.findIndex(a => a.id === o.asama), s = b.asamalar[i + 1];
      if (s?.kredili) sonraki = d.mod === 'kredili' ? ` (≈ ${Math.round((s.saniyeBasina || 0) * d.sure)} kredi)` : ' (0 kredi, Sınırsız kuyruk)';
    }
    for (const chat of IZINLI) {
      if (o.tur === 'onay') await dosyalariGonder(hat, chat, o.klasor, o.onay.gonder);
      await yaz(chat, `${baslik}\n${kisa(o.ozet)}${kredi}\n\n${o.tur === 'onay' ? o.onay.soru + sonraki : 'Ne yapalım?'}`,
        { reply_markup: { inline_keyboard: dugmeler(o.klasor, o.tur, o.onay, d.mod !== 'kredili') } });
    }
  });

  // Kredisizde takılan aşama (sunucu bekçisi): kredili devam edilsin mi?
  hat.olaylar.on('takildi', o => {
    const neden = o.neden === 'sessiz' ? `${o.sessiz} dakikadır hiç ilerleme yok` : `${o.dk} dakikadır bitmedi`;
    herkese(`Takıldı gibi: ${o.konu} · "${o.ad}" aşaması kredisiz modda ${neden} (TopView Sınırsız kuyruğu bekletiyor olabilir).\n\n` +
      `Kredili devam edilsin mi? Hazır olan kısımlar korunur; kalan aşamalar kredili üretilir (en fazla ≈ ${o.kredi} kredi).`,
    { reply_markup: { inline_keyboard: [
      [{ text: `Kredili devam (≈ ${o.kredi} kredi)`, callback_data: `kg|${o.klasor}` }],
      [{ text: 'Kredisiz beklemeye devam', callback_data: `kw|${o.klasor}` }, { text: 'Durdur', callback_data: `kd|${o.klasor}` }]
    ] } });
  });

  hat.olaylar.on('surduruluyor', o => herkese(`Stüdyo yeniden açıldı; ${o.konu} işi ${o.ad ? `"${o.ad}" aşamasından` : 'kaldığı yerden'} sürüyor. Hazır olan kısımlar yeniden üretilmeyecek.`));

  hat.olaylar.on('ogrendi', o => herkese(`Sizden yeni şeyler öğrendim, bundan sonraki videolarda uygulayacağım:\n${o.yeniler.map(y => '- ' + y).join('\n')}\n\nTüm liste: /tercihler · yanlışsa: /unut <no>`));

  hat.olaylar.on('bitti', async o => {
    if (o.onayli) return herkese(`Tamamlandı: ${o.konu}. Teslim dosyası teslim/ klasöründe.`); // teslim zaten onayda gönderildi
    const kredi = o.mod === 'kredili' ? `\nHarcanan: ${o.harcanan} / ${o.butce} kredi` : '';
    const eksik = o.uyarilar.length;
    const uyari = eksik ? `\n\nGenel olarak isteğe uygun, ama şu noktalarda eksikler var:\n${o.uyarilar.map(u => '- ' + kisa(u, 220)).join('\n')}\n\nİsterseniz bunları düzeltmeye başlayabilirim${o.mod === 'kredili' ? ' (kredili modda ek kredi harcanabilir)' : ''}.` : '';
    const dugme = eksik ? [[{ text: 'Eksikleri düzelt', callback_data: `u|${o.klasor}` }], [{ text: 'Kendi notumla düzelt', callback_data: `n|${o.klasor}` }]]
      : [[{ text: 'Düzelt', callback_data: `n|${o.klasor}` }]];
    for (const chat of IZINLI) {
      await dosyalariGonder(hat, chat, o.klasor, o.gonder);
      await yaz(chat, `Hazır: ${o.konu}${kredi}${uyari}`, { reply_markup: { inline_keyboard: dugme } });
    }
  });

  // --- Ayar kartı: gelen her iş (sesli mesaj, link, çekim, /egitim, /yeni) önce düğmeli kartla gösterilir:
  // kredisiz/kredili, süre, (metin varsa) metni düzelt, başlat, iptal. TASLAK_DK dakika dokunulmazsa kendiliğinden başlar;
  // "Metni düzelt" beklerken sayaç durur. Kart bellektedir; Stüdyo yeniden açılırsa düğmeler yine çalışır ama sayaç çalışmaz.
  const TASLAK_DK = 3;
  const taslaklar = new Map();    // klasor → { chat, mid, ust, metin: { dosya, kelime } | null, duzeltme, zaman }
  const metinBekleyen = new Map(); // chat → klasor ("Metni düzelt"ten sonra gelen yazı)
  const ozelBekleyen = new Map();  // chat → klasor ("Özel istek ekle"den sonra gelen yazı ya da sesli mesaj; yalnız eğitmen anlatımı)

  function taslakKlavye(klasor) {
    const d = hat.durumOku(klasor), t = taslaklar.get(klasor);
    const sec = (b, s) => (b ? '✓ ' : '') + s;
    const kredili = d.mod === 'kredili';
    const sureDugme = n => ({ text: sec(d.sure === n, `${n} sn`), callback_data: `ks|${klasor}|${n}` });
    const satirlar = [
      [{ text: sec(!kredili, 'Kredisiz (0 kredi)'), callback_data: `km|${klasor}|0` },
        { text: sec(kredili, `Kredili (≈${hat.tahminiKredi(d.bolum, d.sure, 'kredili')} kredi)`), callback_data: `km|${klasor}|1` }],
      [15, 20, 25].map(sureDugme), [30, 45, 60].map(sureDugme)
    ];
    if (t?.metin) satirlar.push([{ text: 'Metni düzelt', callback_data: `kx|${klasor}` }]);
    if (hat.OZEL_BOLUMLER.includes(d.bolum)) satirlar.push([{ text: 'Özel istek ekle', callback_data: `ko|${klasor}` },
      ...(hat.ozelIstekOku(klasor).length ? [{ text: 'Özel isteği sil', callback_data: `kq|${klasor}` }] : [])]);
    satirlar.push([{ text: 'Başlat', callback_data: `kb|${klasor}` }, { text: 'İptal', callback_data: `kv|${klasor}` }]);
    return satirlar;
  }

  function taslakMetni(klasor) {
    const d = hat.durumOku(klasor), t = taslaklar.get(klasor), b = hat.bolumBul(d.bolum);
    const kredi = d.mod === 'kredili' ? `Kredili (bütçe ${d.butce} kredi)` : 'Kredisiz (0 kredi)';
    const sonra = d.onaylar === 'iki' ? 'Onaylı: kareler ve teslimde size soracağım.' : 'Başlayınca bitmiş videoyu göndereceğim; arada bir şey sormayacağım.';
    const duzeltme = t.duzeltme ? `\n\nDüzelttiğiniz metin kaydedildi (${t.duzeltme}); senaryo onu esas alacak.` : '';
    const istekler = hat.OZEL_BOLUMLER.includes(d.bolum) ? hat.ozelIstekOku(klasor) : [];
    const istek = istekler.length ? `\n\nÖzel isteğiniz (her aşamada uygulanacak):\n${istekler.map(s => '- ' + kisa(s, 500)).join('\n')}`
      : hat.OZEL_BOLUMLER.includes(d.bolum) ? '\n\nÖzel bir isteğiniz varsa (ses tonu, el hareketleri, masadakiler, süre…) "Özel istek ekle"ye basıp yazın ya da sesli söyleyin.' : '';
    return `${t.ust ? t.ust + duzeltme + '\n\n' : ''}Hazır: ${d.konu}\n${b.ad} · ${d.sure} sn · ${kredi}\n${sonra}${istek}\n\n` +
      `Değiştirmek istediğinizi aşağıdan seçip "Başlat"a basın. ${TASLAK_DK} dk dokunmazsanız bu ayarlarla kendiliğinden başlar.` +
      (hat.mesgul() ? '\n(Şu an başka bir iş çalışıyor; başlatınca sıraya girer.)' : '');
  }

  async function taslakGoster(chat, klasor, ust, metin = null) {
    const eski = taslaklar.get(klasor);
    if (eski?.mid) await tg('editMessageReplyMarkup', { chat_id: eski.chat, message_id: eski.mid, reply_markup: { inline_keyboard: [] } }).catch(() => {});
    taslaklar.set(klasor, { ...eski, chat, ust, metin, mid: null });
    const m = await yaz(chat, taslakMetni(klasor), { reply_markup: { inline_keyboard: taslakKlavye(klasor) } });
    taslaklar.get(klasor).mid = m?.message_id;
    taslakZamanla(klasor);
  }

  function taslakZamanla(klasor, dur = false) {
    const t = taslaklar.get(klasor);
    if (!t) return;
    clearTimeout(t.zaman);
    if (!dur) t.zaman = setTimeout(() => taslakBaslat(klasor, true).catch(e => console.log('Ayar kartı:', e.message)), TASLAK_DK * 60e3);
  }

  async function taslakGuncelle(klasor) {
    const t = taslaklar.get(klasor);
    if (!t?.mid) return;
    await tg('editMessageText', { chat_id: t.chat, message_id: t.mid, text: taslakMetni(klasor).slice(0, 4000), reply_markup: { inline_keyboard: taslakKlavye(klasor) } })
      .catch(e => { if (!/not modified/i.test(e.message)) console.log('Telegram:', e.message); });
  }

  function taslakKapat(klasor) {
    const t = taslaklar.get(klasor);
    if (!t) return null;
    clearTimeout(t.zaman);
    taslaklar.delete(klasor);
    for (const [c, k] of metinBekleyen) if (k === klasor) metinBekleyen.delete(c);
    for (const [c, k] of ozelBekleyen) if (k === klasor) ozelBekleyen.delete(c);
    if (t.mid) tg('editMessageReplyMarkup', { chat_id: t.chat, message_id: t.mid, reply_markup: { inline_keyboard: [] } }).catch(() => {});
    return t;
  }

  async function taslakBaslat(klasor, kendiliginden = false) {
    const t = taslakKapat(klasor);
    if (!t) return;
    try {
      const sirada = hat.mesgul();
      hat.otomatikBaslat(klasor);
      return yaz(t.chat, (kendiliginden ? `${TASLAK_DK} dk içinde değişiklik gelmedi, bu ayarlarla başlattım.\n` : '') +
        baslatildiMetni(hat, klasor) + (sirada ? '\n(Önceki iş bitince başlayacak.)' : ''));
    } catch (e) { return yaz(t.chat, 'Başlatılamadı: ' + e.message); }
  }

  // Stüdyo yeniden açıldıysa kart bellekte yoktur: klasör hiç başlamadıysa karttan yeniden kurulur.
  function taslakBul(klasor, chat, mid) {
    if (taslaklar.has(klasor)) return taslaklar.get(klasor);
    const d = hat.durumOku(klasor);
    if (!d.bolum || d.otomatik || Object.keys(d.asamalar || {}).length) return null;
    const tt = Object.values(TURLER).find(x => fs.existsSync(path.join(hat.KOK, klasor, x.dosya)));
    taslaklar.set(klasor, { chat, mid, ust: '', metin: tt ? { dosya: tt.dosya, kelime: 0 } : null });
    return taslaklar.get(klasor);
  }

  async function taslakDugme(q, chat, tur, klasor, deger) {
    const cevap = text => tg('answerCallbackQuery', { callback_query_id: q.id, ...(text ? { text } : {}) }).catch(() => {});
    const t = taslakBul(klasor, chat, q.message.message_id);
    if (!t) {
      await cevap('Bu kart artık geçerli değil: video başladı ya da iptal edildi.');
      return tg('editMessageReplyMarkup', { chat_id: chat, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
    }
    try {
      if (tur === 'km' || tur === 'ks') {
        hat.ayarDegistir(klasor, tur === 'km' ? { mod: deger === '1' ? 'kredili' : 'kredisiz' } : { sure: Number(deger) });
        await cevap();
        taslakZamanla(klasor);
        return taslakGuncelle(klasor);
      }
      await cevap();
      if (tur === 'kb') return taslakBaslat(klasor);
      if (tur === 'kv') { taslakKapat(klasor); return yaz(chat, `İptal edildi: ${hat.durumOku(klasor).konu}. Video başlatılmadı.`); }
      if (tur === 'kx') {
        ozelBekleyen.delete(chat);
        metinBekleyen.set(chat, klasor);
        taslakZamanla(klasor, true);
        return yaz(chat, 'Doğru metni yazıp gönderin. İki yol var:\n' +
          '1) Yukarıdaki metni kopyalayın, yanlış yerleri düzeltip tamamını gönderin.\n' +
          '2) Yalnız yanlış yeri yazın (ör. "odak değil odaklanma", "üç yaprak değil beş yaprak").\n' +
          'Siz yazana kadar video başlamaz.');
      }
      if (tur === 'ko') {
        metinBekleyen.delete(chat);
        ozelBekleyen.set(chat, klasor);
        taslakZamanla(klasor, true);
        return yaz(chat, 'Özel isteğinizi yazın ya da sesli mesajla söyleyin. Örnek:\n' +
          '"Kredili 51 saniye olacak. Ses ile el hareketleri çok uyumlu olsun, eller hiç durmasın. Masada yeşil taze reyhan da olsun. ' +
          'Ses kendinden emin, bilgili, tecrübeli, samimi ve güven veren bir eğitmen tonunda konuşsun."\n\n' +
          'İçinde "kredili/kredisiz", süre (ör. "51 saniye") ya da "onaylı" geçerse ayarlar kendiliğinden değişir. Siz gönderene kadar video başlamaz.');
      }
      if (tur === 'kq') {
        hat.ozelIstekSil(klasor);
        taslakZamanla(klasor);
        return taslakGuncelle(klasor);
      }
    } catch (e) { return yaz(chat, e.message); }
  }

  // "Özel istek ekle"den sonra gelen yazı (ya da deşifre edilmiş sesli mesaj): ayarları uygular, metnin tamamını OZEL-ISTEK.md'ye ekler.
  async function ozelIstekAl(chat, klasor, metin, kaynak = 'yazı') {
    ozelBekleyen.delete(chat);
    const t = taslaklar.get(klasor) || taslakBul(klasor, chat, null);
    if (!t) return yaz(chat, 'Bu video başladı; isteğinizi iş bitince "Düzelt" ile yazabilirsiniz.');
    try {
      const ayar = istekAyarlari(metin);
      if (Object.keys(ayar).length) hat.ayarDegistir(klasor, ayar);
      hat.ozelIstekEkle(klasor, metin, kaynak);
      const d = hat.durumOku(klasor);
      const uygulanan = [ayar.mod && (d.mod === 'kredili' ? `kredili (bütçe ${d.butce} kredi)` : 'kredisiz'), ayar.sure && `${d.sure} sn`,
        ayar.onaylar && (d.onaylar === 'iki' ? 'onaylı' : 'tam otomatik')].filter(Boolean);
      const sinir = ayar.sure && ayar.sure !== d.sure ? ` (süre ${hat.SURE.en}-${hat.SURE.cok} sn arası olabilir)` : '';
      return taslakGoster(chat, klasor, `Özel isteğiniz kaydedildi${kaynak === 'sesli' ? ` (sesinizden anladığım):\n"${kisa(metin, 1200)}"` : '.'}` +
        (uygulanan.length ? `\nAyar olarak uyguladım: ${uygulanan.join(', ')}${sinir}.` : ''), t.metin);
    } catch (e) { return yaz(chat, 'Özel istek kaydedilemedi: ' + e.message); }
  }

  // Özel istek sesli geldiyse: indir → whisper → ozelIstekAl.
  async function ozelIstekSesli(chat, klasor, ses) {
    if (ses.file_size > 20e6) return yaz(chat, 'Ses kaydı 20 MB\'den büyük; daha kısa bir kayıt gönderin.');
    const gecici = fs.mkdtempSync(path.join(os.tmpdir(), 'ozel-istek-'));
    try {
      await yaz(chat, 'İsteğinizi dinliyorum… (1-2 dk)');
      const f = await tg('getFile', { file_id: ses.file_id });
      const kayit = path.join(gecici, 'istek' + (path.extname(ses.file_name || f.file_path).toLowerCase() || '.ogg'));
      fs.writeFileSync(kayit, Buffer.from(await (await fetch(`${DOSYA}/${f.file_path}`)).arrayBuffer()));
      const { anlatim } = await desifreEt(kayit, gecici);
      if (anlatim.split(/\s+/).filter(Boolean).length < 2) { ozelBekleyen.set(chat, klasor); return yaz(chat, 'Kayıtta anlaşılır bir konuşma duyamadım; yeniden söyler ya da yazar mısınız?'); }
      return ozelIstekAl(chat, klasor, anlatim, 'sesli');
    } catch (e) { ozelBekleyen.set(chat, klasor); return yaz(chat, 'Sesli istek işlenemedi: ' + e.message + '\nYazarak da gönderebilirsiniz.'); }
    finally { fs.rmSync(gecici, { recursive: true, force: true }); }
  }

  // "Metni düzelt"ten sonra gelen yazı: metin dosyasının sonuna eklenir; senaryo aşaması bu bölümü esas alır.
  async function metinDuzelt(chat, klasor, yeni) {
    metinBekleyen.delete(chat);
    const t = taslaklar.get(klasor);
    if (!t) return yaz(chat, 'Bu video başladı; değişikliği iş bitince "Düzelt" ile yazabilirsiniz.');
    if (!t.metin) { const tt = Object.values(TURLER).find(x => fs.existsSync(path.join(hat.KOK, klasor, x.dosya))); if (tt) t.metin = { dosya: tt.dosya, kelime: 0 }; }
    if (!t.metin) return yaz(chat, 'Bu videoda düzeltilecek bir metin yok (sesli mesaj ya da linkten gelmedi).');
    const kelime = yeni.split(/\s+/).filter(Boolean).length;
    const tam = kelime >= Math.max(8, t.metin.kelime * 0.5);
    fs.appendFileSync(path.join(hat.KOK, klasor, t.metin.dosya), tam
      ? `\n## Gamze Hoca'nın düzelttiği metin (esas alınır)\n\nGamze Hoca otomatik deşifreyi kendisi düzeltti; aşağıdaki metin yukarıdaki deşifrenin YERİNE geçer (birden fazla düzeltme varsa en sondaki).\n\n${yeni}\n`
      : `\n## Gamze Hoca'nın düzeltmesi (esas alınır)\n\nOtomatik deşifrede şu yer(ler) yanlış duyulmuş; metni buna göre düzelt:\n\n${yeni}\n`);
    t.duzeltme = tam ? 'tam metin' : 'düzeltme notu';
    return taslakGoster(chat, klasor, `Düzeltme alındı:\n"${kisa(yeni, 1200)}"`, t.metin);
  }

  async function mesaj(m) {
    const chat = String(m.chat.id);
    const metin = (m.text || m.caption || '').trim();
    if (!IZINLI.has(chat)) {
      if (!IZINLI.size) return yaz(chat, `Sohbet kimliğiniz: ${chat}\n.env dosyasına TELEGRAM_CHAT_ID=${chat} yazıp Stüdyo'yu yeniden başlatın.`);
      return; // yabancılara cevap yok
    }
    const video = m.video || (m.document?.mime_type?.startsWith('video/') ? m.document : null);
    const ses = m.voice || m.audio || (m.document?.mime_type?.startsWith('audio/') ? m.document : null);
    // "Özel istek ekle"ye basıldıysa gelen ilk yazı ya da sesli mesaj o videonun isteğidir (yeni video sayılmaz).
    if (ozelBekleyen.has(chat) && !video && (ses || (metin && !metin.startsWith('/'))))
      return ses ? ozelIstekSesli(chat, ozelBekleyen.get(chat), ses) : ozelIstekAl(chat, ozelBekleyen.get(chat), metin);
    if (video) return cekimAl(chat, m, video, metin);
    if (ses) return sesliAl(chat, ses, metin);
    if (metinBekleyen.has(chat) && metin && !metin.startsWith('/')) return metinDuzelt(chat, metinBekleyen.get(chat), metin);
    if (notBekleyen.has(chat) && !metin.startsWith('/')) {
      const { klasor, son } = notBekleyen.get(chat); notBekleyen.delete(chat);
      try { const s = son ? hat.duzelt({ klasor, not: metin }) : hat.onayVer({ klasor, karar: 'duzelt', not: metin }); if (s !== 'hata') return yaz(chat, s === 'kuyruk' ? 'Not alındı, sıraya girdi.' : 'Not alındı, yeniden çalışıyor.'); }
      catch (e) { return yaz(chat, e.message); }
    }
    const link = metin.startsWith('/') ? null : metin.match(/https?:\/\/\S+/i)?.[0];
    if (link) return linkAl(chat, link, metin.replace(link, ' '));
    const [komut, ...geri] = metin.split(/\s+/);
    const arg = geri.join(' ');
    switch (komut.replace(/@.*$/, '').toLowerCase()) {
      case '/start': case '/yardim': case '/help': return yaz(chat, YARDIM);
      case '/durum': return yaz(chat, durumMetni(hat));
      case '/tercihler': {
        const k = hat.ogrenme.kurallar(), kal = hat.ogrenme.kalibrasyon();
        if (!k.length) return yaz(chat, 'Henüz öğrenilmiş tercih yok. Düzeltme notlarınızdan öğreniyorum; aynı istek iki videoda tekrarlanınca (ya da "hep böyle olsun" derseniz) kural olur.' + (kal ? '\n\n' + kal : ''));
        return yaz(chat, `Sizden öğrendiklerim:\n${k.join('\n')}${kal ? '\n\nKalibrasyon: ' + kal : ''}\n\nYanlış olanı silmek için: /unut <no>`);
      }
      case '/unut': {
        try { return yaz(chat, 'Unuttum: ' + hat.ogrenme.unut(arg.trim())); }
        catch (e) { return yaz(chat, e.message + ' Liste için /tercihler'); }
      }
      case '/dur': hat.durdur(); return yaz(chat, 'Durduruldu. Sıradaki işler de iptal edildi.');
      case '/yeni': case '/egitim': case '/eğitim': {
        const bolum = /^\/yeni/i.test(komut) ? 'tarif' : 'egitim';
        const p = ayristir(arg, hat.SURE);
        if (!p.konu) return yaz(chat, bolum === 'tarif' ? 'Konu yazın: /yeni bal zencefil 20sn' : 'Konu yazın: /egitim reyhan 30sn');
        try {
          const klasor = hat.yeniKlasor({ bolum, ...p });
          return taslakGoster(chat, klasor, '');
        } catch (e) { return yaz(chat, 'Başlatılamadı: ' + e.message); }
      }
      case '/guncelle': return guncelle(chat);
      case '/hocasesi': case '/kendisesim': return hocaSesi(chat, arg.trim());
      default: return yaz(chat, 'Anlamadım.\n\n' + YARDIM);
    }
  }

  async function cekimAl(chat, m, video, metin) {
    if (video.file_size > 20e6) return yaz(chat, 'Video 20 MB\'den büyük; Telegram botlar daha büyüğünü indiremiyor. Telefonda kısaltıp/sıkıştırıp gönderin ya da bilgisayardan Stüdyo\'ya yükleyin.');
    const p = ayristir(metin || 'çekim', hat.SURE);
    try {
      const klasor = hat.yeniKlasor({ bolum: 'cekim', ...p, konu: p.konu || 'çekim' });
      await yaz(chat, 'Video alınıyor…');
      const f = await tg('getFile', { file_id: video.file_id });
      const r = await fetch(`${DOSYA}/${f.file_path}`);
      const uzanti = path.extname(video.file_name || f.file_path).toLowerCase();
      await hat.kaynakEkle(klasor, klasor + (/^\.(mp4|mov|m4v|webm)$/.test(uzanti) ? uzanti : '.mp4'), Readable.fromWeb(r.body));
      return taslakGoster(chat, klasor, 'Çekim alındı; eller ve ortam bizimkilerle değiştirilecek.');
    } catch (e) { return yaz(chat, 'Çekim alınamadı: ' + e.message); }
  }

  // Video linki (Instagram, TikTok, YouTube…): indir → çekim videosu gibi Video Edit hattına girer.
  // Telegram'ın 20 MB sınırı burada yok. Videodaki yazı/logo/filigran Video Edit promptunda kaldırılır (cekim-donusturucu).
  // Linkin yanında "tarif" kelimesi varsa video kopyalanmaz: sesi deşifre edilir (+ gönderi açıklaması) → tarif videosu hattı.
  async function linkAl(chat, link, metin) {
    const { tur, kalan } = turEtiketi(metin);
    if (tur) return linkMetinAl(chat, link, kalan, tur);
    const gecici = fs.mkdtempSync(path.join(os.tmpdir(), 'link-video-'));
    try {
      await yaz(chat, 'Link alındı, video indiriliyor…');
      const { dosya } = await linkIndir(link, gecici);
      const p = ayristir(metin, hat.SURE);
      const klasor = hat.yeniKlasor({ bolum: 'cekim', ...p, konu: p.konu || 'çekim' });
      await hat.kaynakEkle(klasor, klasor + path.extname(dosya).toLowerCase(), fs.createReadStream(dosya));
      fs.writeFileSync(path.join(hat.KOK, klasor, 'KAYNAK-LINK.txt'), `${link}\n${new Date().toISOString()}\n`);
      return taslakGoster(chat, klasor, 'Video indirildi; eller ve ortam bizimkilerle değiştirilecek, üstündeki yazı ve logolar kaldırılacak.\n' +
        'Tarif ya da anlatım olarak istiyorsanız linki yanına "tarif" ya da "eğitim" yazarak yeniden gönderin.');
    } catch (e) { return yaz(chat, 'Linkteki video alınamadı: ' + e.message + '\nVideoyu dosya olarak da gönderebilirsiniz.'); }
    finally { fs.rmSync(gecici, { recursive: true, force: true }); }
  }

  // Önce yt-dlp (yerel, ücretsiz; uvx her seferinde güncel sürümü kullanır — site değişikliklerine karşı).
  // Olmazsa ve .env'de APIFY_TOKEN varsa Apify (Instagram / TikTok).
  // Dönüş: { dosya, aciklama } — aciklama gönderinin yazısı (caption/description), tarif çıkarırken kullanılır.
  async function linkIndir(link, dizin) {
    const bul = () => fs.readdirSync(dizin).find(f => /^video\.(mp4|mov|m4v|webm)$/i.test(f));
    let ytHata;
    try {
      // -S res:1080 → en çok 1080p (hat 720p kullanır; 4K gereksiz büyük). --js-runtimes node → YouTube için (Node zaten kurulu).
      await komut('uvx', ['yt-dlp@latest', '--no-playlist', '--no-progress', '--js-runtimes', 'node', '-f', 'bv*+ba/b', '-S', 'res:1080,ext:mp4:m4a',
        '--merge-output-format', 'mp4', '--write-info-json', '-o', path.join(dizin, 'video.%(ext)s'), link], 10 * 60e3);
      if (bul()) {
        let aciklama = '';
        try { const i = JSON.parse(fs.readFileSync(path.join(dizin, 'video.info.json'), 'utf8')); aciklama = [i.title, i.description].filter(Boolean).filter((s, n, a) => a.indexOf(s) === n).join('\n\n'); } catch {}
        return { dosya: path.join(dizin, bul()), aciklama };
      }
      ytHata = new Error('yt-dlp dosya bırakmadı');
    } catch (e) { ytHata = e; }
    if (!process.env.APIFY_TOKEN) throw ytHata;
    const { adres, aciklama } = await apifyVideoAdresi(link);
    const r = await fetch(adres);
    if (!r.ok) throw new Error(`Apify videosu indirilemedi (${r.status})`);
    const hedef = path.join(dizin, 'video.mp4');
    fs.writeFileSync(hedef, Buffer.from(await r.arrayBuffer()));
    return { dosya: hedef, aciklama };
  }

  async function apifyVideoAdresi(link) {
    const tiktok = /tiktok\.com/i.test(link);
    const aktor = tiktok ? 'clockworks~tiktok-scraper' : 'apify~instagram-scraper';
    const girdi = tiktok ? { postURLs: [link], shouldDownloadVideos: true, resultsPerPage: 1 }
      : { directUrls: [link], resultsType: 'posts', resultsLimit: 1 };
    const r = await fetch(`https://api.apify.com/v2/acts/${aktor}/run-sync-get-dataset-items?timeout=240`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.APIFY_TOKEN}` }, body: JSON.stringify(girdi)
    });
    if (!r.ok) throw new Error(`Apify hata verdi (${r.status}): ${kisa(await r.text(), 200)}`);
    // Aktörlerin alan adları değişebiliyor: öğede video adresi gibi duran ilk değeri al.
    const ara = (o, anahtar = '') => {
      if (typeof o === 'string') return /^https?:/.test(o) && (/\.mp4(\?|$)/i.test(o) || /video.*url|downloadaddr|mediaurls/i.test(anahtar)) ? o : null;
      if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { const s = ara(v, Array.isArray(o) ? anahtar : k); if (s) return s; }
      return null;
    };
    const veri = await r.json();
    const adres = ara(veri);
    if (!adres) throw new Error('Apify sonucunda video adresi yok (gönderi video olmayabilir ya da gizli hesap)');
    const oge = Array.isArray(veri) ? veri[0] : veri;
    const aciklama = typeof oge?.caption === 'string' ? oge.caption : typeof oge?.text === 'string' ? oge.text : '';
    return { adres, aciklama };
  }

  // Ses dosyasını (ses ya da video) whisper ile deşifre eder → { anlatim, desifre (klasör) }. Yerel, 0 kredi.
  async function desifreEt(kayit, gecici) {
    const desifre = path.join(gecici, 'desifre');
    try {
      await komut('uv', ['run', '--with', 'faster-whisper', '--with', 'ctranslate2<4.9', 'python', path.join(hat.KOK, 'araclar', 'desifre.py'), '--audio', kayit, '--out', desifre, '--model', 'medium'], 20 * 60e3);
    } catch (e) {
      // Windows Akıllı Uygulama Denetimi (Smart App Control) whisper'ın imzasız DLL'lerini (ctranslate2) engeller: WinError 4551.
      if (/WinError 4551|Uygulama Denetimi|Application Control/i.test(e.message)) throw new Error(
        "Windows'un Akıllı Uygulama Denetimi, sesi yazıya döken programı (whisper) engelliyor.\n" +
        'Bilgisayarda bir kez: Ayarlar → Gizlilik ve güvenlik → Windows Güvenliği → Uygulama ve tarayıcı denetimi → ' +
        'Akıllı Uygulama Denetimi ayarları → Kapalı. Sonra Stüdyo\'yu kapatıp yeniden açın ve sesli mesajı tekrar gönderin.');
      throw e;
    }
    const anlatim = fs.readFileSync(path.join(desifre, 'okunur.txt'), 'utf8').split(/\r?\n/).map(s => s.replace(/^\[[\d:.]+\]\s*/, '').trim()).filter(Boolean).join(' ');
    return { anlatim, desifre };
  }

  // Linkteki videonun sesinden (+ gönderi açıklamasından) bilgi çıkarır → tarif ya da eğitmen hattı. Videonun görüntüsü kullanılmaz.
  async function linkMetinAl(chat, link, metin, tur) {
    const t = TURLER[tur];
    const gecici = fs.mkdtempSync(path.join(os.tmpdir(), 'link-metin-'));
    try {
      await yaz(chat, `Link alındı, video indiriliyor; sonra ${t.neyi} dinleyeceğim… (2-5 dk sürebilir)`);
      const { dosya, aciklama } = await linkIndir(link, gecici);
      let anlatim = '', desifre = null;
      try { ({ anlatim, desifre } = await desifreEt(dosya, gecici)); }
      catch (e) { console.log('Link deşifresi:', e.message); } // sessiz video: ses izi yok olabilir; açıklama yetebilir
      const konusma = anlatim.split(/\s+/).filter(Boolean).length >= 5;
      const yazili = aciklama.trim().split(/\s+/).filter(Boolean).length >= 5;
      if (!konusma && !yazili) return yaz(chat, `Linkte konuşma bulamadım, gönderi açıklamasında da ${t.ne} yok. Sesli mesajla anlatabilir ya da ${t.komut} ile konuyu yazabilirsiniz.`);

      const p = ayristir(metin, hat.SURE);
      const konu = p.konu || await konuBul([anlatim, aciklama].filter(Boolean).join('\n'), tur);
      const klasor = hat.yeniKlasor({ bolum: tur, ...p, konu, ipucu: metin });
      const hedef = path.join(hat.KOK, klasor, t.klasor);
      fs.mkdirSync(hedef, { recursive: true });
      fs.copyFileSync(dosya, path.join(hedef, 'kaynak' + path.extname(dosya).toLowerCase()));
      if (desifre) for (const d of fs.readdirSync(desifre)) fs.copyFileSync(path.join(desifre, d), path.join(hedef, d));
      fs.writeFileSync(path.join(hat.KOK, klasor, 'KAYNAK-LINK.txt'), `${link}\n${new Date().toISOString()}\n`);
      fs.writeFileSync(path.join(hat.KOK, klasor, t.dosya),
        `# Linkten alınan ${t.ne}\n\nKaynak: ${link} (${new Date().toLocaleString('tr-TR')}) · video ve zamanlı deşifre: ${t.klasor}/\n` +
        `Not: Bu ${t.ne} Gamze Hoca'nın kendi sesi DEĞİL, başka bir hesabın videosundan alındı. ${t.linkNot} ` +
        `Cümleler kelimesi kelimesine kopyalanmaz, Gamze Hoca'nın üslubuyla (uslup/GAMZE-USLUP.md) yeniden yazılır. Videonun görüntüsü kullanılmaz.\n` +
        `Not: konuşma otomatik deşifredir; yanlış duyulmuş kelimeler olabilir. Konuşma ile açıklama çelişirse ölçüde açıklamadaki yazılı değer esas alınır.\n\n` +
        `## Videodaki konuşma\n\n${konusma ? anlatim : '(konuşma yok ya da anlaşılmadı)'}\n\n## Gönderi açıklaması\n\n${yazili ? aciklama.trim() : '(açıklama yok)'}\n`);
      const ozet = konusma ? `Videoda duyduğum:\n"${kisa(anlatim, 900)}"` : `Videoda konuşma yok; ${t.neyi} gönderi açıklamasından aldım.`;
      return taslakGoster(chat, klasor, `${ozet}\n\nYalnız ${t.ne} alındı; videonun görüntüsü kullanılmayacak, sıfırdan ${t.mekan} üretilecek.`,
        { dosya: t.dosya, kelime: [anlatim, aciklama].join(' ').split(/\s+/).filter(Boolean).length });
    } catch (e) { return yaz(chat, `Linkten ${t.ne} alınamadı: ` + e.message + '\nSesli mesajla da anlatabilirsiniz.'); }
    finally { fs.rmSync(gecici, { recursive: true, force: true }); }
  }

  // Sesli mesaj: kaydı indir → whisper ile deşifre (yerel, 0 kredi) → konu adı → video.
  // Varsayılan eğitmen anlatımı (SESLI-ANLATIM.md); açıklamada "tarif" yazıyorsa tarif videosu (SESLI-TARIF.md).
  // Senaryo aşaması içeriği o dosyadan kurar (asamalar.json).
  async function sesliAl(chat, ses, metin) {
    if (ses.file_size > 20e6) return yaz(chat, 'Ses kaydı 20 MB\'den büyük; Telegram botlar daha büyüğünü indiremiyor. Daha kısa bir kayıt gönderin.');
    const { tur: etiket, kalan } = turEtiketi(metin);
    const tur = etiket || 'egitim', t = TURLER[tur];
    const gecici = fs.mkdtempSync(path.join(os.tmpdir(), 'sesli-'));
    try {
      await yaz(chat, 'Ses kaydı alındı, dinliyorum… (1-3 dk sürebilir)');
      const f = await tg('getFile', { file_id: ses.file_id });
      const uzanti = path.extname(ses.file_name || f.file_path).toLowerCase() || '.ogg';
      const kayit = path.join(gecici, 'kayit' + uzanti);
      fs.writeFileSync(kayit, Buffer.from(await (await fetch(`${DOSYA}/${f.file_path}`)).arrayBuffer()));
      const { anlatim, desifre } = await desifreEt(kayit, gecici);
      if (anlatim.split(/\s+/).length < 5) return yaz(chat, 'Kayıtta anlaşılır bir konuşma duyamadım. Biraz daha yakından ve sessiz bir yerde tekrar gönderir misiniz?');

      const p = ayristir(kalan, hat.SURE); // açıklama yalnız seçenekler için (süre, kredili, onaylı); konu da yazılabilir
      // Eğitmen anlatımında Hoca'nın sözleri değişmeden, kendi sesiyle kullanılır (uslup/EGITMEN-CEKIM.md): süre kayıttan gelir.
      if (tur === 'egitim') {
        const sn = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', kayit], { encoding: 'utf8', windowsHide: true }).stdout);
        if (sn > 0) p.sure = Math.min(hat.SURE.cok, Math.max(hat.SURE.en, Math.ceil(sn)));
      }
      const konu = p.konu || await konuBul(anlatim, tur);
      const klasor = hat.yeniKlasor({ bolum: tur, ...p, konu, ipucu: kalan });
      const hedef = path.join(hat.KOK, klasor, t.klasor);
      fs.mkdirSync(hedef, { recursive: true });
      fs.copyFileSync(kayit, path.join(hedef, 'kayit' + uzanti));
      for (const d of fs.readdirSync(desifre)) fs.copyFileSync(path.join(desifre, d), path.join(hedef, d));
      fs.writeFileSync(path.join(hat.KOK, klasor, t.dosya),
        `# ${t.baslik}\n\nKaynak: Telegram sesli mesajı (${new Date().toLocaleString('tr-TR')}) · kayıt ve zamanlı deşifre: ${t.klasor}/\n` +
        `Not: otomatik deşifredir; yanlış duyulmuş kelimeler olabilir (şüpheliler: ${t.klasor}/supheli.txt).\n\n## Anlatım\n\n${anlatim}\n`);
      return taslakGoster(chat, klasor, `Anladığım ${t.ne}:\n"${kisa(anlatim, 1200)}"` +
        (etiket ? '' : '\n\nEğitmen videosu olarak hazırlanacak. Tarif videosu isterseniz kaydın açıklamasına "tarif" yazıp yeniden gönderin.') +
        (tur === 'egitim'
          ? '\n\nSözleriniz hiç değişmeden, kendi sesinizle kullanılacak; eller söylediklerinize göre hareket edecek. Yanlış duyduğum bir kelime varsa "Metni düzelt"e basın (yalnız altyazı düzelir, sesiniz aynı kalır).'
          : '\n\nYanlış duyduğum bir yer varsa "Metni düzelt"e basın.'),
        { dosya: t.dosya, kelime: anlatim.split(/\s+/).filter(Boolean).length });
    } catch (e) { return yaz(chat, 'Ses kaydı işlenemedi: ' + e.message); }
    finally { fs.rmSync(gecici, { recursive: true, force: true }); }
  }

  function komut(prog, args, sinir, girdi) {
    return new Promise((ok, hata) => {
      // shell: Windows'ta claude/uv .cmd olabilir; argümanlar tırnaklanır (boşluklu yol, boş --tools değeri).
      const p = spawn([prog, ...args.map(a => `"${a}"`)].join(' '), { cwd: hat.KOK, windowsHide: true, shell: true });
      let cikti = '';
      const z = setTimeout(() => { p.kill(); hata(new Error(`${prog} zaman aşımı`)); }, sinir);
      p.stdout.on('data', c => (cikti += c)); p.stderr.on('data', c => (cikti += c));
      p.on('error', e => { clearTimeout(z); hata(e); });
      p.on('close', kod => { clearTimeout(z); kod === 0 ? ok(cikti) : hata(new Error(`${prog} hata verdi: ${kisa(cikti.trim().split('\n').slice(-3).join(' '), 300)}`)); });
      if (girdi != null) p.stdin.end(girdi);
    });
  }

  // Anlatımdan kısa konu adı (klasör adı ve mesajlar için). Araçsız, kısa bir claude -p; olmazsa ilk kelimeler.
  async function konuBul(anlatim, tur = 'tarif') {
    const istem = tur === 'egitim'
      ? 'Aşağıdaki sesli anlatımın konusunu 1-4 kelimelik Türkçe bir adla yaz: anlatılan bitki/malzeme ve gerekirse konusu (ör. "reyhan", "reyhan ve odaklanma", "çörek otu yağı"). Yalnız adı yaz; tırnak, nokta, açıklama yok.\n\n'
      : 'Aşağıdaki sesli tarif anlatımının konusunu 2-5 kelimelik Türkçe bir tarif adıyla yaz (ör. "bal zencefil macunu"). Yalnız adı yaz; tırnak, nokta, açıklama yok.\n\n';
    try {
      const c = await komut('claude', ['-p', '--model', 'haiku', '--tools', '', '--strict-mcp-config'], 90e3, istem + anlatim.slice(0, 4000));
      const ad = c.trim().split('\n').pop().replace(/["'.*]/g, '').trim();
      if (ad && ad.length <= 60) return ad;
    } catch (e) { console.log('Konu adı çıkarılamadı:', e.message); }
    return anlatim.split(/\s+/).slice(0, 5).join(' ').replace(/[.,!?]/g, '') || (tur === 'egitim' ? 'sesli anlatım' : 'sesli tarif');
  }

  // Bitmiş videoyu Hoca'nın SÖZLERİYLE yeniden kurgular: Claude videoyu ve kaydı analiz eder, ElevenLabs Voice Changer ile
  // (kelime ve duygu Hoca'nın) ses üretir, cümleleri planlara yerleştirir (araclar/hoca-sesi.mjs). İstem: arayuz/hoca-sesi-istem.md.
  let hocaSesiCalisiyor = false;
  async function hocaSesi(chat, arg) {
    if (hocaSesiCalisiyor) return yaz(chat, 'Sizin sözlerinizle bir video zaten hazırlanıyor; bitince gönderirim.');
    if (hat.mesgul()) return yaz(chat, 'Şu an başka bir video üretiliyor (tarayıcı kullanılıyor). Bitince /hocasesi yazın.');
    const { videoSec, uygunVideolar, kayitBul } = await import(pathToFileURL(path.join(hat.KOK, 'araclar', 'hoca-sesi.mjs')).href + '?t=' + Date.now());
    const klasor = videoSec(arg);
    if (!klasor) {
      const u = uygunVideolar();
      return yaz(chat, u.length ? `Bu numarada sizin ses kaydınızla hazırlanmış bir video yok. Olanlar: ${u.join(', ')}`
        : 'Sizin sesli mesajınızdan hazırlanmış bitmiş bir video bulamadım. Sesli mesajla bir video başlatın; bittikten sonra /hocasesi yazın.');
    }
    const k = kayitBul(klasor), rel = f => path.relative(hat.KOK, f).split(path.sep).join('/');
    const istem = fs.readFileSync(path.join(hat.KOK, 'arayuz', 'hoca-sesi-istem.md'), 'utf8')
      .replaceAll('{klasor}', klasor).replaceAll('{kayit}', rel(k.kayit)).replaceAll('{desifre}', rel(k.desifre));
    hocaSesiCalisiyor = true;
    try {
      await yaz(chat, `${klasor}: videoyu ve kaydınızı inceliyorum. Sizin kelimeleriniz ve ses tonunuzla ElevenLabs sesi üretip her cümleyi anlattığı plana oturtacağım (10-30 dk)…`);
      const log = path.join(hat.KOK, klasor, '.arayuz');
      fs.mkdirSync(log, { recursive: true });
      const c = await komut('claude', ['-p', '--permission-mode', 'acceptEdits', '--allowedTools',
        'Bash,Read,Write,Edit,Glob,Grep,Skill,ToolSearch,mcp__elevenlabs,mcp__playwright'], 90 * 60e3, istem);
      fs.writeFileSync(path.join(log, 'hoca-sesi.log'), c);
      const cikti = c.match(/CIKTI:\s*(.+)\s*$/m)?.[1]?.trim();
      const rapor = c.replace(/\n*CIKTI:.*$/m, '').trim();
      if (!cikti || cikti === 'yok' || !fs.existsSync(cikti)) return yaz(chat, 'Sizin sözlerinizle hazırlanamadı.\n\n' + kisa(rapor, 1500));
      const gonderilecek = fs.statSync(cikti).size > 49e6 ? telegramKopyasi(hat, klasor, cikti) : cikti;
      if (gonderilecek) await tg('sendVideo', dosyaForm(chat, 'video', gonderilecek, { supports_streaming: 'true', caption: `Sizin sözlerinizle: ${klasor}` }))
        .catch(e => yaz(chat, 'Video gönderilemedi: ' + e.message));
      else await yaz(chat, `Hazır, ama Telegram'a sığmıyor (50 MB). Bilgisayarda: ${path.relative(hat.KOK, cikti)}`);
      return yaz(chat, kisa(rapor, 1500));
    } catch (e) { return yaz(chat, 'Sizin sözlerinizle hazırlanamadı: ' + e.message); }
    finally { hocaSesiCalisiyor = false; }
  }

  function guncelle(chat) {
    if (hat.mesgul()) return yaz(chat, 'Şu an çalışan bir iş var; bitince /guncelle yazın.');
    const p = spawn('git', ['pull', '--ff-only'], { cwd: hat.KOK, shell: true, windowsHide: true });
    let cikti = '';
    p.stdout.on('data', c => (cikti += c)); p.stderr.on('data', c => (cikti += c));
    p.on('close', async kod => {
      await yaz(chat, kod === 0 ? `Güncellendi:\n${kisa(cikti, 600)}\nYeniden başlıyor…` : `Güncellenemedi:\n${kisa(cikti, 800)}`);
      if (kod === 0) setTimeout(() => process.exit(YENIDEN_BASLAT), 1500);
    });
  }

  async function geriCagri(q) {
    const chat = String(q.message.chat.id);
    if (!IZINLI.has(chat)) return;
    const [tur, klasor, deger] = q.data.split('|');
    if (/^k[msbvxoq]$/.test(tur)) return taslakDugme(q, chat, tur, klasor, deger);
    await tg('answerCallbackQuery', { callback_query_id: q.id }).catch(() => {});
    await tg('editMessageReplyMarkup', { chat_id: chat, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
    try {
      if (tur === 'kg') {
        const s = hat.krediliyeGec(klasor), d = hat.durumOku(klasor);
        return yaz(chat, `Tamam, ${d.konu} kredili devam ediyor (bütçe ${d.butce} kredi). Hazır kısımlar korunuyor` +
          (s === 'kuyruk' ? '; önceki iş bitince başlayacak.' : s === 'hata' ? '' : '.'));
      }
      if (tur === 'kw') return yaz(chat, hat.takilmaErtele(klasor, 60) ? 'Tamam, kredisiz beklemeye devam. 1 saat sonra hâlâ bitmemişse yeniden sorarım.' : 'Bu aşama zaten bitmiş ya da durmuş.');
      if (tur === 'kd') { hat.durdur(); return yaz(chat, 'Durduruldu. İsterseniz Stüdyo\'dan kaldığı yerden sürdürebilirsiniz.'); }
      if (tur === 'z' || tur === 'n') { notBekleyen.set(chat, { klasor, son: tur === 'n' }); return yaz(chat, 'Neyi düzelteyim? Kısaca yazın (ör. "kavanoz daha küçük olsun", "altyazı büyüsün").'); }
      if (tur === 'u') {
        const liste = hat.durumOku(klasor).uyarilar || [];
        if (!liste.length) return yaz(chat, 'Bu videoda kayıtlı eksik yok.');
        const s = hat.duzelt({ klasor, kaynak: 'eksik', not: 'Teslimde bildirilen eksikleri gider:\n' + liste.join('\n') });
        return yaz(chat, s === 'kuyruk' ? 'Tamam, eksikleri düzeltmek için sıraya girdi.' : 'Tamam, eksikleri düzeltiyorum. Bitince yeni hâlini göndereceğim.');
      }
      const karar = { d: 'devam', t: 'tekrar', i: 'iptal' }[tur];
      const s = hat.onayVer({ klasor, karar });
      if (s === 'devam' && hat.durumOku(klasor).teslim && !hat.durumOku(klasor).otomatik) return; // son onay: "Tamamlandı" zaten gitti
      if (s === 'hata') return; // başlatılamadı; hata kapısı mesajı zaten gitti
      return yaz(chat, s === 'iptal' ? 'İptal edildi.' : s === 'kuyruk' ? 'Tamam, sıraya girdi.' : 'Tamam, devam ediyor.');
    } catch (e) { return yaz(chat, e.message); }
  }

  let ofset = 0;
  (async function dinle() {
    // Aynı bot daha önce webhook'lu bir programla kullanıldıysa getUpdates çalışmaz; webhook'u kaldır.
    await tg('deleteWebhook', { drop_pending_updates: false }).catch(e => console.log('Telegram webhook:', e.message));
    for (;;) {
      try {
        const g = await fetch(`${API}/getUpdates?timeout=50&offset=${ofset}`, { signal: AbortSignal.timeout(65000) }).then(r => r.json());
        if (g.error_code === 409) throw new Error('Bu bot token\'ı başka bir programda da açık (eski bot kapatılmalı): ' + g.description);
        if (!g.ok) throw new Error(g.description);
        for (const u of g.result) {
          ofset = u.update_id + 1;
          if (u.message) mesaj(u.message).catch(e => console.log('Telegram mesaj:', e.message));
          if (u.callback_query) geriCagri(u.callback_query).catch(e => console.log('Telegram düğme:', e.message));
        }
      } catch (e) { console.log('Telegram bağlantısı:', e.message); await new Promise(r => setTimeout(r, 5000)); }
    }
  })();
  console.log(`Telegram botu açık${IZINLI.size ? '' : ' (TELEGRAM_CHAT_ID boş: bota yazınca kimliğinizi söyler)'}`);
  tg('setMyCommands', { commands: [
    { command: 'egitim', description: 'Eğitmen anlatımı başlat: /egitim reyhan 30sn (sesli mesaj da olur)' },
    { command: 'yeni', description: 'Tarif videosu başlat: /yeni konu 20sn [kredili] (10-60 sn)' },
    { command: 'hocasesi', description: 'Son videoyu kendi sözlerimle ve tonumla hazırla: /hocasesi [no]' },
    { command: 'durum', description: 'Çalışan ve onay bekleyen işler' },
    { command: 'dur', description: 'Çalışan işi durdur' },
    { command: 'tercihler', description: 'Sistemin sizden öğrendikleri' },
    { command: 'unut', description: 'Yanlış öğrenilen tercihi sil: /unut 3' },
    { command: 'guncelle', description: 'Sistemi güncelle ve yeniden başlat' },
    { command: 'yardim', description: 'Komutlar' }
  ] }).catch(() => {});
}
