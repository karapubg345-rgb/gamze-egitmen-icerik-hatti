// Seedance 2.5 Omni Reference → Video Edit gönderimi (TopView web, Playwright uzantı modu).
// Ön koşul — TAZE yüklenmiş sayfa (?tool-type=video-edit); önceki görevin referansları
// küçük resim silinse de gider, bu yüzden her görevden önce sayfa yeniden yüklenir.
//   window.__b64_v  kaynak video (zorunlu)      → @Video1
//   window.__b64_i  eller referansı (zorunlu)   → @Image1
//   window.__b64_m  mekân referansı (zorunlu)   → @Image2
//   window.__b64_p  hasta referansı (isteğe bağlı) → @Image3
//   window.__prompt metin parçaları dizisi; parçaların ARASINA sırayla chip girer:
//     [p0, @Video1, p1, @Image1, p2, @Image2, p3, (@Image3, p4)]
// Çalıştır: browser_run_code_unsafe filename=araclar/topview/video-edit-gonder.js
// Sonra MUTLAKA topview_list_board_tasks: parameters.inputVideos = 1, duration = -1.
async (page) => {
  await page.waitForTimeout(1500);
  const mn = () => page.evaluate(() => { const s = [...document.querySelectorAll('span')].find(s => { const r = s.getBoundingClientRect(); return r.y > 120 && r.y < 155 && r.x < 300 && r.x > 100; }); return s ? s.innerText : '?'; });
  // Model seçici ilk açılışta geç yüklenir; panel Topview T1'e dönebilir.
  for (let t = 0; t < 3 && (await mn()) !== 'Seedance 2.5'; t++) {
    await page.mouse.move(300, 138); await page.mouse.down(); await page.mouse.up();
    let p = null;
    for (let k = 0; k < 8 && !p; k++) { await page.waitForTimeout(1000); p = await page.evaluate(() => { const e = [...document.querySelectorAll('*')].find(e => e.childElementCount === 0 && (e.innerText || '').trim() === 'Seedance 2.5' && e.getBoundingClientRect().x > 500 && e.getBoundingClientRect().width > 0); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); }
    if (p) { await page.mouse.click(p[0], p[1]); await page.waitForTimeout(2000); }
  }
  if ((await mn()) !== 'Seedance 2.5') return 'model ' + (await mn());
  const durum = await page.evaluate(() => ({ v: (window.__b64_v || '').length, i: (window.__b64_i || '').length, m: (window.__b64_m || '').length, p: (window.__b64_p || '').length, pr: (window.__prompt || []).length }));
  if (!durum.v || !durum.i || !durum.m) return 'eksik referans ' + JSON.stringify(durum);
  const hasP = durum.p > 1000;
  if (durum.pr !== (hasP ? 5 : 4)) return 'prompt parça sayısı yanlış ' + JSON.stringify(durum);
  await page.evaluate(() => {
    const mk = (b64, n, t) => { const bin = atob(b64); const arr = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) arr[k] = bin.charCodeAt(k); return new File([arr], n, { type: t }); };
    const ins = [...document.querySelectorAll('input[type=file]')]; const inp = ins[ins.length - 1];
    const dt = new DataTransfer();
    dt.items.add(mk(window.__b64_v, 'kaynak-video.mp4', 'video/mp4'));
    dt.items.add(mk(window.__b64_i, 'eller.jpg', 'image/jpeg'));
    dt.items.add(mk(window.__b64_m, 'mekan.jpg', 'image/jpeg'));
    if (window.__b64_p && window.__b64_p.length > 1000) dt.items.add(mk(window.__b64_p, 'hasta.jpg', 'image/jpeg'));
    inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const exp = hasP ? '@Video1,@Image1,@Image2,@Image3' : '@Video1,@Image1,@Image2';
  let tags = [];
  for (let k = 0; k < 30; k++) { await page.waitForTimeout(2000); tags = await page.evaluate(() => { const el = [...document.querySelectorAll('.tiptap.ProseMirror')].find(e => e.getBoundingClientRect().x < 520 && e.getBoundingClientRect().width > 0); const r = []; JSON.stringify(el.editor.getJSON(), (k, v) => { if (v && v.type === 'mentionChip') r.push(v.attrs.tag); return v; }); return r; }); if (tags.length >= exp.split(',').length) break; }
  if (tags.join(',') !== exp) return 'etiketler? ' + JSON.stringify(tags);
  const veBul = () => page.evaluate(() => { const e = [...document.querySelectorAll('*')].find(e => e.childElementCount === 0 && (e.innerText || '').trim() === 'Video Edit' && e.getBoundingClientRect().x < 520 && e.getBoundingClientRect().width > 0); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await veBul(); await page.waitForTimeout(800);
  const ve = await veBul();
  if (!ve) return 'Video Edit düğmesi yok';
  await page.mouse.click(ve[0], ve[1]); await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const ed = [...document.querySelectorAll('.tiptap.ProseMirror')].find(e => e.getBoundingClientRect().x < 520 && e.getBoundingClientRect().width > 0).editor;
    const c = []; JSON.stringify(ed.getJSON(), (k, v) => { if (v && v.type === 'mentionChip') c.push(v); return v; });
    const content = [];
    window.__prompt.forEach((s, k) => { content.push({ type: 'text', text: s }); if (k < c.length) content.push(c[k]); });
    ed.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content }] });
  });
  await page.waitForTimeout(1500);
  const ok = await page.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.x < 460 && r.width > 200 && /^\s*Generate/.test(b.innerText); }); const b = bs[bs.length - 1]; if (!b) return 'Generate yok'; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); if (!b.contains(top)) return 'Generate kapalı'; b.click(); return 'gonderildi'; });
  await page.waitForTimeout(6000);
  return JSON.stringify({ ok, tags, hasP, uzunluk: durum });
}
