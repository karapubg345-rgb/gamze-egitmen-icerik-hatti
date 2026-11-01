// Öğrenilen tercihler — Gamze Hoca'nın tepkilerinden kalıcı kurallar çıkarır, her aşamanın istemine ekler.
// ogrenilen/ (git dışında, yalnız bu bilgisayarda):
//   geri-bildirim.jsonl — her tepki bir satır (teslim, düzeltme, onay, unut)
//   TERCIHLER.md       — damıtılmış kurallar ("1. [kurgu] …") + "## Kalibrasyon"
//   ogrenme.log        — son damıtma görevinin günlüğü
// Damıtma: her teslimden sonra kısa, kredisiz bir `claude -p` görevi (yalnız dosya araçları, MCP yok).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const BASLIK = "# Gamze Hoca'nın öğrenilmiş tercihleri";

export function ogrenmeKur({ KOK, olaylar }) {
  const DIZIN = path.join(KOK, 'ogrenilen');
  const GUNLUK = path.join(DIZIN, 'geri-bildirim.jsonl');
  const TERCIH = path.join(DIZIN, 'TERCIHLER.md');
  let calisiyor = false, yeniden = false;

  function kaydet(kayit) {
    fs.mkdirSync(DIZIN, { recursive: true });
    fs.appendFileSync(GUNLUK, JSON.stringify({ zaman: new Date().toISOString(), ...kayit }) + '\n');
  }

  const dosya = () => { try { return fs.readFileSync(TERCIH, 'utf8'); } catch { return ''; } };
  const kurallar = () => dosya().split(/\r?\n/).filter(s => /^\d+\.\s/.test(s));
  const kalibrasyon = () => (dosya().split(/^## Kalibrasyon\s*$/m)[1] || '').trim();

  // Aşama istemine eklenecek blok (kural yoksa boş).
  function istemBlogu() {
    const k = kurallar();
    if (!k.length) return '';
    return "\n\nGAMZE HOCA'NIN ÖĞRENİLMİŞ TERCİHLERİ (önceki videolardaki tepkilerinden; bu aşamayı ilgilendirenlere uy, denetimde ve UYUM puanında da bunlara bak. "
      + "CLAUDE.md'deki değişmez kurallarla çelişirse değişmez kural kazanır):\n" + k.join('\n');
  }

  function unut(no) {
    const satirlar = dosya().split(/\r?\n/);
    const k = satirlar.filter(s => /^\d+\.\s/.test(s));
    const hedef = k[Number(no) - 1];
    if (!hedef) throw new Error(`${no} numaralı tercih yok.`);
    let n = 0;
    const yeni = satirlar.filter(s => s !== hedef).map(s => /^\d+\.\s/.test(s) ? s.replace(/^\d+\./, `${++n}.`) : s);
    fs.writeFileSync(TERCIH, yeni.join('\n'));
    kaydet({ tur: 'unut', kural: hedef.replace(/^\d+\.\s*/, '') });
    return hedef.replace(/^\d+\.\s*/, '');
  }

  // Damıtma görevi: aynı anda tek; çalışırken yeni teslim gelirse bitince bir kez daha.
  function ogren() {
    if (!fs.existsSync(GUNLUK)) return;
    if (calisiyor) { yeniden = true; return; }
    calisiyor = true;
    const esik = Number(process.env.ESIK_UYUM) || 70;
    const istem = `Gamze Eğitmen içerik hattı — ÖĞRENME görevi (video üretme, başka dosyaya dokunma, soru sorma).
Oku: ogrenilen/geri-bildirim.jsonl (Gamze Hoca'nın tepkileri, eskiden yeniye), varsa ogrenilen/TERCIHLER.md, ve CLAUDE.md'nin "Değişmez kurallar" bölümü.
Görev: ogrenilen/TERCIHLER.md'yi güncelle.
Kayıt türleri: teslim (video bitti: uyarilar = listelenen eksikler, uyumlar = aşama uyum puanları), duzelt (hocanın kendi notu), eksik-duzelt (listelenen eksiklerin düzeltilmesini istedi), onay-duzelt / onay-devam (onaylı akışta kararı), iptal, unut (hoca bu kuralı sildi).
Kurallar:
- Yalnız gelecekteki videolara uygulanabilir, genellenebilir tercih kural olur. Tek videoya özgü düzeltme ("bu videoda 3. kare") kural olmaz.
- Aynı yönde en az 2 AYRI videoda tepki → kural. Notta "hep / her zaman / bundan sonra / hiçbir zaman" gibi açık genel ifade varsa tek seferde kural.
- Yeni ve çelişen tepki eski kuralı günceller (kanıtını ve tarihini güncelle).
- "unut" kaydındaki kuralı, o tarihten SONRA yeni açık tepki gelmedikçe yeniden ekleme.
- CLAUDE.md değişmez kurallarıyla çelişen tercih EKLENMEZ; Kalibrasyon bölümünde kısaca belirt.
- Bir teslimde eksik listelenmiş ve o klasör için sonrasında hiç düzeltme kaydı yoksa (ve ondan sonra başka bir video başlamışsa) hoca o eksikleri kabul etmiş sayılır: o tür kusur onun için önemsiz → kural olarak değil Kalibrasyon'a yaz.
- Kalibrasyon: uyum puanlarını hocanın davranışıyla karşılaştır (ör. %75 alanları hep düzelttiriyor mu?). Şu anki eşik ESIK_UYUM=${esik}. En az 5 teslim varsa eşik için kısa öneri yaz; yoksa "veri az" yaz.
- En fazla 30 kural, her biri tek satır, kısa ve uygulanabilir, Türkçe.
Dosya biçimi TAM olarak:
${BASLIK}
1. [aşama-id ya da genel] kural metni (kanıt: N video; son: YYYY-AA-GG)
2. …
## Kalibrasyon
kısa metin
Bitince raporun sonunda yeni eklenen ya da anlamı değişen her kural için bir satır \`YENI: <kural metni>\` yaz; değişiklik yoksa tek satır \`YENI: yok\`.`;
    const log = fs.createWriteStream(path.join(DIZIN, 'ogrenme.log'));
    log.write(`# ${new Date().toLocaleString('tr-TR')} · öğrenme\n\n`);
    const proc = spawn('claude', ['-p', '--output-format', 'json', '--permission-mode', 'acceptEdits', '--strict-mcp-config',
      '--allowedTools', 'Read,Write,Edit,Glob,Grep'], { cwd: KOK, shell: true, windowsHide: true });
    proc.stdin.end(istem);
    let cikti = '';
    proc.stdout.on('data', p => (cikti += p));
    proc.stderr.on('data', p => log.write('[stderr] ' + p));
    proc.on('close', kod => {
      let sonuc = '';
      try { sonuc = JSON.parse(cikti).result || ''; } catch { sonuc = cikti; }
      log.end(sonuc + `\n\n# bitti · çıkış kodu ${kod}\n`);
      const yeniler = [...sonuc.matchAll(/^\s*YENI:\s*(.+)$/gim)].map(m => m[1].trim()).filter(s => !/^yok$/i.test(s));
      if (kod === 0 && yeniler.length) olaylar.emit('ogrendi', { yeniler, kurallar: kurallar() });
      calisiyor = false;
      if (yeniden) { yeniden = false; ogren(); }
    });
  }

  return { kaydet, ogren, istemBlogu, unut, kurallar, kalibrasyon };
}
