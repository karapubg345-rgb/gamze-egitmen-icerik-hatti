// Telegram botu — Gamze Hoca telefondan video başlatır; tam otomatikte yalnız bitmiş video gelir (istenirse "onaylı": kareler/kesitler + teslim).
// sunucu.mjs içinden başlar (.env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID). Bağımlılıksız: Node fetch + long polling.
// Yalnız TELEGRAM_CHAT_ID'deki sohbetlere cevap verir; kimlik boşsa yalnız "kimliğiniz şu" der.
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { Readable } from 'node:stream';

const API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const DOSYA = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const IZINLI = new Set((process.env.TELEGRAM_CHAT_ID || '').split(',').map(s => s.trim()).filter(Boolean));
const YENIDEN_BASLAT = 75; // STUDYO-AC.bat bu çıkış koduyla sunucuyu yeniden açar

const YARDIM = `Komutlar:
/yeni <konu> [süre] [kredili] [onaylı] — tarif videosu başlatır
   ör. /yeni bal zencefil 20sn
   ör. /yeni zencefilli limon 45sn kredili
Çekim videosu: videoyu bu sohbete gönderin, açıklamasına konuyu yazın (ör. "hacamat 25sn").
/durum — çalışan ve bekleyen işler
/tercihler — sistemin sizden öğrendikleri
/unut <no> — yanlış öğrenilen bir tercihi siler
/dur — çalışan işi durdurur
/guncelle — sistemi günceller ve yeniden başlatır

Süre 10-60 sn (30 sn üstü iki parçada üretilip birleştirilir). Varsayılan: 25 sn, kredisiz (TopView Sınırsız, 0 kredi). "kredili" yazarsanız tarayıcı açılmadan hızlı üretilir.
Tam otomatik: Claude her aşamayı kendi denetler, sorunluysa kendisi yeniden yapar; size yalnız bitmiş video gelir. Küçük kusurlar için tekrar tekrar üretmez (kredi payı): isteğe %70 ve üstü uyuyorsa videoyu gönderir, eksikleri yazar; "Eksikleri düzelt" derseniz düzeltir. Kendi notunuzla da düzelttirebilirsiniz, Claude hangi aşamadan başlayacağına kendisi karar verir.
"onaylı" yazarsanız o video kareler ve teslimde sizi bekler.`;

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

function baslatildiMetni(hat, klasor) {
  const d = hat.durumOku(klasor);
  const b = hat.bolumBul(d.bolum);
  const kredi = d.mod === 'kredili' ? `Kredili (bütçe ${d.butce} kredi)` : 'Kredisiz (0 kredi)';
  const ilk = b.asamalar.find(a => a.onay);
  const sonra = d.onaylar === 'iki' ? `${ilk.onay.baslik.toLowerCase().replace(/ hazır$/, '')} hazır olunca haber vereceğim.` : 'Bitince videoyu buraya göndereceğim; arada size bir şey sormayacağım.';
  return `Başladı: ${d.konu}\n${b.ad} · ${d.sure} sn · ${kredi}\n${sonra}`;
}

function dugmeler(klasor, tur, onay) {
  if (tur === 'hata') return [[{ text: 'Tekrar dene', callback_data: `t|${klasor}` }, { text: 'İptal', callback_data: `i|${klasor}` }]];
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
        { reply_markup: { inline_keyboard: dugmeler(o.klasor, o.tur, o.onay) } });
    }
  });

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

  async function mesaj(m) {
    const chat = String(m.chat.id);
    const metin = (m.text || m.caption || '').trim();
    if (!IZINLI.has(chat)) {
      if (!IZINLI.size) return yaz(chat, `Sohbet kimliğiniz: ${chat}\n.env dosyasına TELEGRAM_CHAT_ID=${chat} yazıp Stüdyo'yu yeniden başlatın.`);
      return; // yabancılara cevap yok
    }
    const video = m.video || (m.document?.mime_type?.startsWith('video/') ? m.document : null);
    if (video) return cekimAl(chat, m, video, metin);
    if (notBekleyen.has(chat) && !metin.startsWith('/')) {
      const { klasor, son } = notBekleyen.get(chat); notBekleyen.delete(chat);
      try { const s = son ? hat.duzelt({ klasor, not: metin }) : hat.onayVer({ klasor, karar: 'duzelt', not: metin }); if (s !== 'hata') return yaz(chat, s === 'kuyruk' ? 'Not alındı, sıraya girdi.' : 'Not alındı, yeniden çalışıyor.'); }
      catch (e) { return yaz(chat, e.message); }
    }
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
      case '/yeni': {
        const p = ayristir(arg, hat.SURE);
        if (!p.konu) return yaz(chat, 'Konu yazın: /yeni bal zencefil 20sn');
        try {
          const sirada = hat.mesgul();
          const klasor = hat.yeniKlasor({ bolum: 'tarif', ...p });
          hat.otomatikBaslat(klasor);
          return yaz(chat, baslatildiMetni(hat, klasor) + (sirada ? '\n(Önceki iş bitince başlayacak.)' : ''));
        } catch (e) { return yaz(chat, 'Başlatılamadı: ' + e.message); }
      }
      case '/guncelle': return guncelle(chat);
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
      hat.otomatikBaslat(klasor);
      return yaz(chat, baslatildiMetni(hat, klasor));
    } catch (e) { return yaz(chat, 'Çekim alınamadı: ' + e.message); }
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
    const [tur, klasor] = q.data.split('|');
    await tg('answerCallbackQuery', { callback_query_id: q.id }).catch(() => {});
    await tg('editMessageReplyMarkup', { chat_id: chat, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
    try {
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
    { command: 'yeni', description: 'Tarif videosu başlat: /yeni konu 20sn [kredili] (10-60 sn)' },
    { command: 'durum', description: 'Çalışan ve onay bekleyen işler' },
    { command: 'dur', description: 'Çalışan işi durdur' },
    { command: 'tercihler', description: 'Sistemin sizden öğrendikleri' },
    { command: 'unut', description: 'Yanlış öğrenilen tercihi sil: /unut 3' },
    { command: 'guncelle', description: 'Sistemi güncelle ve yeniden başlat' },
    { command: 'yardim', description: 'Komutlar' }
  ] }).catch(() => {});
}
