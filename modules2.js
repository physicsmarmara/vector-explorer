'use strict';
/* =====================================================================
   modules2.js : Modules 5-7 (teacher builder, predict-test-explain, test
   yourself) plus application shell (tabs, language switch, modals, boot).
   ===================================================================== */

function showModal(title, nodes) {
  const bg = h('div', { class: 'modal-bg', onclick: e => { if (e.target === bg) bg.remove(); } },
    h('div', { class: 'modal', role: 'dialog' }, h('h2', null, title), nodes, h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'btn dark', type: 'button', onclick: () => bg.remove() }, tx('Kapat', 'Close')))));
  document.getElementById('app').append(bg);
}

/* =====================================================================
   MODULE 5 — Teacher Challenge Builder
   ===================================================================== */
const K_LIST = [2, 3, 0.5, -0.5, -1, -2, -3];
const LSKEY = 'vl_challenges';
const lsGet = () => { try { return JSON.parse(localStorage.getItem(LSKEY) || '[]'); } catch (e) { return []; } };
const lsSet = a => { try { localStorage.setItem(LSKEY, JSON.stringify(a)); return true; } catch (e) { return false; } };

function defaultChallenge() {
  const comps = [{ x: 3, y: 2 }, { x: -2, y: 3 }, { x: 4, y: -1 }, { x: 1, y: -3 }, { x: -3, y: -2 }];
  const pos = [[2, 12], [12, 12], [20, 11], [4, 5], [14, 4]];
  const vectors = comps.map((c, i) => mk('ABCDE'[i], { x: pos[i][0], y: pos[i][1] }, c, COL[i], { fixed: true, movable: i % 2 === 0, include: i % 2 === 0 }));
  return {
    title: '', type: 'sum', k: 2, ref: 'A', vectors,
    textTr: 'A, C ve E vektörlerini uç uca ekleme yöntemiyle yeniden düzenleyin. Bileşke vektörü oluşturun.',
    textEn: 'Rearrange vectors A, C and E using the head-to-tail method. Construct their resultant vector.'
  };
}
const serialize = ch => ({
  v: 1, title: ch.title, textTr: ch.textTr, textEn: ch.textEn, type: ch.type, k: ch.k, ref: ch.ref,
  vectors: ch.vectors.map(v => ({ name: v.name, color: v.color, x: v.tail.x, y: v.tail.y, cx: v.comp.x, cy: v.comp.y, fixed: !!v.fixed, movable: v.movable !== false, include: !!v.include }))
});
function deserialize(o) {
  if (!o || typeof o !== 'object' || !Array.isArray(o.vectors) || !o.vectors.length || o.vectors.length > 20) throw new Error('bad');
  const num = (x, a, b) => { x = +x; if (!isFinite(x)) throw new Error('num'); return clamp(Math.round(x * 100) / 100, a, b); };
  const vectors = o.vectors.map(d => {
    const cx = num(d.cx, -25, 25), cy = num(d.cy, -15, 15);
    return mk(String(d.name || '?').slice(0, 3), { x: clamp(num(d.x, 0, 26), Math.max(0, -cx), Math.min(26, 26 - cx)), y: clamp(num(d.y, 0, 16), Math.max(0, -cy), Math.min(16, 16 - cy)) }, { x: cx, y: cy },
      /^#[0-9a-f]{6}$/i.test(d.color) ? d.color : COL[0], { fixed: !!d.fixed, movable: d.movable !== false, include: !!d.include });
  });
  return {
    title: String(o.title || '').slice(0, 80), textTr: String(o.textTr || '').slice(0, 600), textEn: String(o.textEn || '').slice(0, 600),
    type: o.type === 'scalar' ? 'scalar' : 'sum', k: K_LIST.includes(+o.k) ? +o.k : 2, ref: String(o.ref || vectors[0].name), vectors
  };
}
const b64e = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
const chText = ch => (store.lang === 'tr' ? (ch.textTr || ch.textEn) : (ch.textEn || ch.textTr)) || tx('(Yönerge yazılmamış)', '(No instruction written)');

function m5Init() {
  const s = store.m5 || (store.m5 = { mode: 'teacher' });
  if (!s.ch) { s.ch = defaultChallenge(); s.hist = new Hist(() => s.ch.vectors, v => { s.ch.vectors = v; }); }
  return s;
}
function m5StartStudent(s, preview = false) {   // preview: maker testing own challenge (may reveal the answer)
  s.preview = preview;
  const vectors = s.ch.vectors.map(v => Object.assign(clone(v), { id: uid(), role: 'main' }));
  s.sm = { vectors }; s.sinit = clone(vectors);
  s.shist = new Hist(() => s.sm.vectors, v => { s.sm.vectors = v; });
  s.zero = false; s.attempts = 0; s.hint = 0; s.shown = false; s.mode = 'student';
}

function modWrap5(root) {
  const s = m5Init();
  root.append(mhead(tx('Soru Hazırla', 'Make a Challenge'),
    tx('Boş alanda sürükleyerek kendi vektörlerinizi çizin, yönergeyi yazın, bağlantıyla veya dosyayla arkadaşlarınıza gönderin; çözücü modunda cevabı görmeden çözülür.', 'Draw your own vectors by dragging on empty space, write the instruction and send it to friends by link or file; they solve it in Solver Mode without seeing the answer.')));
  root.append(h('div', { class: 'sub-tabs' }, h('div', { class: 'seg', style: 'width:100%;max-width:520px' },
    h('button', { class: s.mode === 'teacher' ? 'on' : '', onclick: () => { s.mode = 'teacher'; rerender(); } }, '✏️ ' + tx('Soru Hazırla', 'Make')),
    h('button', { class: s.mode === 'student' ? 'on' : '', onclick: () => { m5StartStudent(s, true); rerender(); } }, '🎓 ' + tx('Çözücü Modu', 'Solver Mode')))));
  s.mode === 'teacher' ? m5Teacher(root, s) : m5Student(root, s);
}

function m5Teacher(root, s) {
  const ch = s.ch, W = 26, H = 16;
  const props = h('div'), listBox = h('div');
  const sel = () => lab.ws.vs.find(v => v.id === lab.ws.sel);
  const fit = v => {
    v.tail.x = clamp(v.tail.x, Math.max(0, -v.comp.x), Math.min(W, W - v.comp.x));
    v.tail.y = clamp(v.tail.y, Math.max(0, -v.comp.y), Math.min(H, H - v.comp.y));
  };
  const commit = () => { s.hist.push(); lab.ws.render(); renderProps(); };
  const lab = makeLab(root, {
    model: ch, hist: s.hist, ht: false,
    onReset: () => { s.ch = defaultChallenge(); s.hist = new Hist(() => s.ch.vectors, v => { s.ch.vectors = v; }); rerender(); },
    refresh: () => renderProps(),
    ws: {
      draw: 'free', editHead: () => true,
      onDraw: d => {      // draw your own vector by dragging on empty space
        const v = mk(nextName(ch.vectors), d.tail, d.comp, COL[ch.vectors.length % COL.length], { fixed: true, movable: true, include: ch.type === 'sum' });
        ch.vectors.push(v); fit(v); lab.ws.sel = v.id; commit(); rerender();
      },
      vecStyle: v => ({ op: ch.type === 'sum' && !v.include ? 0.55 : 1 }),
      onCommit: () => commit(), onSelect: () => setTimeout(renderProps)
    }
  });
  function num(label, get, set, min, max) {
    return h('label', { class: 'mut' }, label, h('input', { type: 'number', step: 1, min, max, value: get(), onchange: e => { const x = Math.round(+e.target.value); if (isFinite(x)) { set(clamp(x, min, max)); } commit(); } }));
  }
  function renderProps() {
    props.innerHTML = '';
    const v = sel();
    if (!v) { props.append(h('div', { class: 'mut' }, tx('Düzenlemek için bir vektör seçin.', 'Select a vector to edit its properties.'))); return; }
    const chk = (label, key, def) => { const i = h('input', { type: 'checkbox', onchange: e => { v[key] = e.target.checked; commit(); } }); i.checked = key === 'movable' ? v.movable !== false : !!v[key]; return h('label', { class: 'chk' }, i, label); };
    props.append(
      h('div', { class: 'grid2' },
        h('label', { class: 'mut' }, tx('Ad', 'Label'), h('input', { type: 'text', maxlength: 3, value: v.name, onchange: e => { const old = v.name; v.name = e.target.value.trim() || old; if (ch.ref === old) ch.ref = v.name; commit(); rerender(); } })),
        h('div', null, h('div', { class: 'mut' }, tx('Renk', 'Colour')), swatches(v.color, c => { v.color = c; commit(); }))),
      h('div', { class: 'grid2' },
        num(tx('Kuyruk x', 'Tail x'), () => v.tail.x, x => { v.tail.x = x; fit(v); }, 0, W), num(tx('Kuyruk y', 'Tail y'), () => v.tail.y, x => { v.tail.y = x; fit(v); }, 0, H),
        num(tx('Bileşen x', 'Component x'), () => v.comp.x, x => { v.comp.x = x; fit(v); }, -25, 25), num(tx('Bileşen y', 'Component y'), () => v.comp.y, x => { v.comp.y = x; fit(v); }, -15, 15)),
      chk(tx('Büyüklük ve yön kilitli (öğrenci değiştiremez)', 'Magnitude and direction locked (student cannot change)'), 'fixed'),
      chk(tx('Öğrenci bu vektörü sürükleyebilir', 'Student may drag this vector'), 'movable'),
      ch.type === 'sum' ? chk(tx('Toplama dâhil', 'Include in the sum'), 'include') : null,
      h('button', { class: 'btn danger sm', type: 'button', onclick: () => { s.ch.vectors = s.ch.vectors.filter(x => x !== v); lab.ws.sel = null; commit(); rerender(); } }, '✕ ' + tx('Bu vektörü sil', 'Delete this vector')));
  }
  const rerenderSelectsOnly = () => { };
  function renderList() {
    listBox.innerHTML = '';
    const list = lsGet();
    if (!list.length) listBox.append(h('div', { class: 'mut' }, tx('Henüz kayıtlı etkinlik yok.', 'No saved challenges yet.')));
    list.forEach(it => listBox.append(h('div', { class: 'chal' }, h('span', null, '📁 ' + (it.data.title || tx('Adsız', 'Untitled'))),
      h('span', { class: 'row' },
        h('button', { class: 'btn sm', type: 'button', onclick: () => { try { s.ch = deserialize(it.data); s.ch.id = it.id; s.hist = new Hist(() => s.ch.vectors, v => { s.ch.vectors = v; }); rerender(); } catch (e) { toast(tx('Etkinlik açılamadı', 'Could not open challenge')); } } }, tx('Aç', 'Open')),
        h('button', { class: 'btn sm danger', type: 'button', onclick: () => { lsSet(lsGet().filter(x => x.id !== it.id)); renderList(); } }, '✕')))));
  }
  const save = () => {
    if (!ch.title.trim()) ch.title = tx('Etkinlik ', 'Challenge ') + (lsGet().length + 1);
    const list = lsGet(), data = serialize(ch);
    if (!ch.id) ch.id = 'c' + Date.now();
    const i = list.findIndex(x => x.id === ch.id);
    if (i >= 0) list[i] = { id: ch.id, data }; else list.push({ id: ch.id, data });
    toast(lsSet(list) ? '💾 ' + tx('Etkinlik kaydedildi', 'Challenge saved') : tx('Tarayıcı depolaması kullanılamıyor; dosyaya aktarın.', 'Browser storage unavailable; export to a file instead.'));
    renderList(); titleIn.value = ch.title;
  };
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(serialize(ch), null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: 'vektor-etkinlik-' + (ch.title || 'etkinlik').replace(/[^\w\-çğıöşüÇĞİÖŞÜ]+/g, '_') + '.json' });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const fileIn = h('input', { type: 'file', accept: '.json,application/json', style: 'display:none', onchange: e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { s.ch = deserialize(JSON.parse(r.result)); s.hist = new Hist(() => s.ch.vectors, v => { s.ch.vectors = v; }); toast('📂 ' + tx('Etkinlik içe aktarıldı', 'Challenge imported')); rerender(); } catch (x) { toast(tx('Geçersiz etkinlik dosyası', 'Invalid challenge file')); } };
    r.readAsText(f);
  } });
  const link = () => {
    const url = location.href.split('#')[0] + '#c=' + b64e(JSON.stringify(serialize(ch)));
    const ta = h('textarea', { readonly: true, style: 'min-height:110px;font-size:12px' }, url);
    const done = ok => { if (ok) toast('🔗 ' + tx('Bağlantı kopyalandı', 'Link copied')); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(() => done(true), () => { });
    showModal(tx('Paylaşım bağlantısı', 'Share link'), [h('p', null, tx('Bu bağlantıyı açan öğrenciler etkinliği öğrenci modunda görür. Sunucu gerekmez; etkinlik bağlantının içindedir.', 'Students opening this link see the challenge in Student Mode. No server is needed; the challenge is stored inside the link.')), ta]);
    setTimeout(() => { ta.select(); }, 50);
  };
  const titleIn = h('input', { type: 'text', value: ch.title, placeholder: tx('Etkinlik adı', 'Challenge title'), oninput: e => { ch.title = e.target.value; } });
  const refSel = h('select', { onchange: e => { ch.ref = e.target.value; } }, ch.vectors.map(v => h('option', { value: v.name, selected: v.name === ch.ref }, v.name)));
  const kSel = h('select', { onchange: e => { ch.k = +e.target.value; } }, K_LIST.map(k => h('option', { value: k, selected: k === ch.k }, kLabel(k))));
  const typeSel = h('select', { onchange: e => { ch.type = e.target.value; rerender(); } },
    h('option', { value: 'sum', selected: ch.type === 'sum' }, tx('Bileşke: seçilen vektörleri toplat', 'Resultant: add the selected vectors')),
    h('option', { value: 'scalar', selected: ch.type === 'scalar' }, tx('Skalerle çarpma: X = k·A oluşturt', 'Scalar multiple: construct X = k·A')));
  const b = (label, fn, cls = '') => h('button', { class: 'btn ' + cls, type: 'button', onclick: fn }, label);
  lab.side.append(
    h('label', { class: 'mut' }, tx('Etkinlik adı', 'Challenge title'), titleIn),
    h('label', { class: 'mut' }, tx('Görev türü', 'Task type'), typeSel),
    ch.type === 'scalar' ? h('div', { class: 'grid2' }, h('label', { class: 'mut' }, tx('Referans vektör', 'Reference vector'), refSel), h('label', { class: 'mut' }, tx('Skaler k', 'Scalar k'), kSel)) : null,
    h('label', { class: 'mut' }, tx('Yönerge (Türkçe)', 'Instruction (Turkish)'), h('textarea', { oninput: e => { ch.textTr = e.target.value; } }, ch.textTr)),
    h('label', { class: 'mut' }, tx('Yönerge (İngilizce)', 'Instruction (English)'), h('textarea', { oninput: e => { ch.textEn = e.target.value; } }, ch.textEn)),
    h('div', { class: 'grid2' },
      b('＋ ' + tx('Vektör Ekle', 'Add Vector'), () => { const v = mk(nextName(ch.vectors), { x: rnd(3, 18), y: rnd(3, 11) }, { x: rnd(1, 4), y: rnd(-3, 3) || 2 }, COL[ch.vectors.length % COL.length], { fixed: true, movable: true, include: ch.type === 'sum' }); ch.vectors.push(v); lab.ws.sel = v.id; commit(); rerender(); }, 'pri'),
      b('▶ ' + tx('Öğrenci Olarak Dene', 'Preview as Student'), () => { m5StartStudent(s, true); rerender(); }, 'dark')),
    h('h3', null, tx('Seçili vektör özellikleri', 'Selected vector properties')), props,
    h('div', { class: 'grid2' },
      b('💾 ' + tx('Kaydet', 'Save'), save), b('📤 ' + tx('Dosyaya Aktar', 'Export JSON'), exportJson),
      b('📥 ' + tx('Dosyadan Aç', 'Import JSON'), () => fileIn.click()), b('🔗 ' + tx('Bağlantı Oluştur', 'Share Link'), link)),
    fileIn, h('h3', null, tx('Kayıtlı etkinlikler', 'Saved challenges')), listBox);
  renderProps(); renderList();
}

function m5Student(root, s) {
  if (!s.sm) m5StartStudent(s);
  const ch = s.ch, sc = ch.type === 'scalar', fbEl = h('div', { class: 'fb' }), info = h('div', { class: 'info-box' });
  const items = () => s.sm.vectors.filter(v => v.role === 'main' && v.include);
  const Rv = () => s.sm.vectors.find(v => v.role === 'R');
  const refV = () => s.sm.vectors.find(v => v.role === 'main' && v.name === ch.ref) || s.sm.vectors[0];
  const lab = makeLab(root, {
    model: s.sm, hist: s.shist, ht: true,
    onReset: () => { s.sm.vectors = clone(s.sinit); s.shist.reset(); s.zero = false; s.shown = false; s.attempts = 0; fbEl.className = 'fb'; rerender(); },
    refresh: () => { info.innerHTML = vecInfo(lab.ws.vs.find(v => v.id === lab.ws.sel)); },
    ws: {
      draw: 'R', minLen: 0.9,
      canMove: v => v.role === 'R' || v.movable !== false,
      editHead: v => v.role === 'R' || (v.role === 'main' && !v.fixed && v.movable !== false),
      vecStyle: v => ({ op: v.role === 'main' && v.movable === false ? 0.55 : 1 }),
      onDraw: d => { s.sm.vectors = s.sm.vectors.filter(v => v.role !== 'R'); const r = mk(sc ? 'X' : 'R', d.tail, d.comp, RCOL, { role: 'R' }); s.sm.vectors.push(r); lab.ws.sel = r.id; s.shist.push(); lab.ws.render(); },
      onCommit: () => { s.shist.push(); info.innerHTML = vecInfo(lab.ws.vs.find(v => v.id === lab.ws.sel)); },
      onSelect: v => { info.innerHTML = vecInfo(v); },
      overlay: ws => {
        if (!s.shown) return '';
        if (!sc) return items().length ? additionOverlay(ws, items(), '#00897b') : '';
        const A = refV(), c = V.scale(A.comp, ch.k), p = { x: clamp(A.tail.x, Math.max(0, -c.x), Math.min(26, 26 - c.x)), y: clamp(A.tail.y - 3, Math.max(0, -c.y), Math.min(16, 16 - c.y)) };
        return ws.arrow(p, c, '#00897b', { w: 6, dash: '10 6', op: .85 }) + ws.text({ x: p.x + c.x / 2, y: p.y + c.y / 2 + .8 }, 'X', '#00897b', { size: 20 });
      }
    }
  });
  const hints = () => sc ? [
    tx(`Referans vektör ${ch.ref}’yı inceleyin: ${moveWords(refV().comp)}.`, `Look at the reference vector ${ch.ref}: ${moveWords(refV().comp)}.`),
    tx(`X, ${ch.ref}’ya paralel olmalı; |X| = ${kLabel(Math.abs(ch.k))}|${ch.ref}|; k ${ch.k > 0 ? 'pozitif → yön aynı' : 'negatif → yön zıt'}.`, `X must be parallel to ${ch.ref}; |X| = ${kLabel(Math.abs(ch.k))}|${ch.ref}|; k is ${ch.k > 0 ? 'positive → same sense' : 'negative → opposite sense'}.`),
    tx('Boş alanda sürükleyerek X’i çizin; konumu önemli değil.', 'Drag on empty space to draw X; its position does not matter.')
  ] : [
    tx('Yönergede belirtilen vektörleri seçip sürükleyin; yalnızca onlar toplamaya katılır.', 'Drag the vectors named in the instruction; only those are added.'),
    tx('Bir vektörün kuyruğunu (içi boş nokta) diğerinin ucuna getirin. “Uç Uca Yapış”ı açabilirsiniz.', 'Put the tail (hollow dot) of one on the head of the next. You may switch on “Snap Head-to-Tail”.'),
    tx('Bileşke, ilk kuyruktan son uca çizilir: boş alanda sürükleyin.', 'The resultant runs from the first tail to the last head: drag on empty space.')
  ];
  const doCheck = () => {
    let r;
    s.attempts++;
    if (sc) {
      const R = Rv();
      if (!R) { showFb(fbEl, 'bad', [badL(tx('Önce X vektörünü boş alanda sürükleyerek çizin.', 'First draw vector X by dragging on empty space.'))]); return; }
      const c = checkScalar(refV().comp, R.comp, ch.k, ch.ref, 'X'); r = { pass: c.ok, lines: c.lines };
    } else if (!items().length) { showFb(fbEl, 'bad', [badL(tx('Bu etkinlikte toplanacak vektör seçilmemiş.', 'No vectors were selected for the sum in this challenge.'))]); return; } else r = checkSum(items(), Rv(), s.zero);
    showFb(fbEl, r.pass ? 'ok' : 'bad', r.lines.concat(r.pass ? [] : [infoL(tx('Düzeltip yeniden deneyin.', 'Fix it and try again.'))]));
    if (r.pass) { mark('teacher'); if (!sc) { mark('headToTail'); mark('resultant'); } }
    lab.ws.render(); showBtn.disabled = false;
  };
  const showBtn = h('button', { class: 'btn', type: 'button', disabled: s.attempts === 0, onclick: () => {
    s.shown = true; lab.ws.render();
    showFb(fbEl, 'info', sc ? [`<b>${tx('Çözüm', 'Solution')}</b>`, `X = ${kLabel(ch.k)}·${esc(ch.ref)} = (${fmt(refV().comp.x * ch.k, 1)}, ${fmt(refV().comp.y * ch.k, 1)})`] : [`<b>${tx('Çözüm', 'Solution')}</b>`].concat(sumWorking(items())));
  } }, '👁 ' + tx('Sonucu Göster', 'Show Result'));
  const zero = h('input', { type: 'checkbox', onchange: e => { s.zero = e.target.checked; } }); zero.checked = !!s.zero;
  lab.side.append(
    h('div', { class: 'task' }, ch.title ? h('div', { class: 'mut' }, esc(ch.title)) : null, h('div', { class: 'big' }, chText(ch))),
    h('div', { class: 'mut' }, sc ? tx('Cevap vektörünü boş alanda sürükleyerek çizin.', 'Draw your answer vector by dragging on empty space.') : tx('Vektörleri uç uca ekleyin ve bileşkeyi kendiniz çizin.', 'Join the vectors head-to-tail and draw the resultant yourself.')),
    sc ? null : h('label', { class: 'chk' }, zero, tx('Bileşke sıfır vektörüdür', 'The resultant is the zero vector')),
    h('div', { class: 'row' }, h('button', { class: 'btn pri', type: 'button', onclick: doCheck }, '✔ ' + tx('Kontrol Et', 'Check')), s.preview ? showBtn : null, hintBtn(s, hints, fbEl)),
    fbEl, h('h3', null, tx('Seçili vektör', 'Selected vector')), info);
  info.innerHTML = vecInfo(null);
}

/* =====================================================================
   MODULE 6 — Predict, Test, Explain
   ===================================================================== */
const ACTS = [
  { id: 'cancel', concept: 'zeroResultant',
    title: () => tx('Eşit ve zıt vektörler', 'Equal and opposite vectors'),
    q: () => tx('Eşit büyüklükte ve zıt yönlü iki vektör toplanırsa bileşke ne olur?', 'What happens to the resultant when two equal and opposite vectors are added?'),
    opts: () => [tx('Bileşke sıfır vektörüdür', 'The resultant is the zero vector'), tx('Bileşke, vektörlerden birine eşittir', 'The resultant equals one of the vectors'), tx('Bileşkenin büyüklüğü iki katına çıkar', 'The resultant has twice the magnitude'), tx('Bilinemez', 'It cannot be known')], ans: 0,
    exp: () => tx('A ve −A uç uca eklendiğinde ikinci vektörün ucu, birincinin kuyruğuna geri döner. Başlangıç ve bitiş noktası aynı olduğundan bileşke sıfır vektörüdür: A + (−A) = 0.', 'When A and −A are joined head-to-tail, the head of the second returns to the tail of the first. Start and end coincide, so the resultant is the zero vector: A + (−A) = 0.'),
    task: () => tx('A ve B vektörlerini sürükleyip uç uca getirin (kuyruk, öncekinin ucuna). Zincirin başlangıç ve bitişini gözleyin.', 'Drag A and B head-to-tail (tail onto the previous head). Observe where the chain starts and ends.'),
    setup: () => [mk('A', { x: 3, y: 4 }, { x: 4, y: 2 }, COL[0], { role: 'main' }), mk('B', { x: 15, y: 10 }, { x: -4, y: -2 }, COL[1], { role: 'main' })],
    ws: { ht: true, editHead: () => false },
    overlay: (ws, vs) => {
      const ch = chainOrder(vs); if (!ch.ok) return '';
      const st = ch.order[0].tail, en = head(ch.order[1]), same = V.dist(st, en) < 0.3;
      return ws.dot(st, '#0b2a4a', 8) + (same ? ws.text({ x: st.x, y: st.y - 1 }, tx('başlangıç = bitiş', 'start = end'), '#0b2a4a') : ws.dot(en, '#0b2a4a', 8) + ws.arrow(st, V.sub(en, st), '#00897b', { w: 6, op: .9 }));
    },
    read: vs => { const ch = chainOrder(vs); if (!ch.ok) return tx('Vektörler henüz uç uca değil.', 'The vectors are not joined head-to-tail yet.'); const e = V.sum(vs); return tx(`Zincirin başından sonuna: (${fmt(e.x, 1)}, ${fmt(e.y, 1)}) → |bileşke| = ${fmt(V.len(e))}`, `From chain start to end: (${fmt(e.x, 1)}, ${fmt(e.y, 1)}) → |resultant| = ${fmt(V.len(e))}`); } },
  { id: 'position', concept: 'position',
    title: () => tx('Konum ve vektör', 'Position and the vector'),
    q: () => tx('Bir vektörün konumunu değiştirirsek büyüklüğü veya yönü değişir mi?', 'Does changing the position of a vector change its magnitude or direction?'),
    opts: () => [tx('Yalnızca büyüklüğü değişir', 'Only the magnitude changes'), tx('Hem büyüklüğü hem yönü değişir', 'Both magnitude and direction change'), tx('Büyüklüğü ve yönü değişmez; yalnızca konumu değişir', 'Neither changes; only its position changes'), tx('Yalnızca yönü değişir', 'Only the direction changes')], ans: 2,
    exp: () => tx('Vektör; büyüklük, doğrultu ve yön ile tanımlanır. Başlangıç noktası bu tanımın parçası değildir. Bu yüzden paralel taşınan vektör aynı vektördür.', 'A vector is defined by magnitude, line of action and sense. Its starting point is not part of that definition, so a vector translated parallel to itself is still the same vector.'),
    task: () => tx('A vektörünü ızgarada farklı yerlere sürükleyin; soluk kopya ilk konumunu gösterir. Sağdaki ölçümlere bakın.', 'Drag A to different places; the faded copy shows the starting position. Watch the measurements.'),
    setup: () => [mk('A₀', { x: 3, y: 3 }, { x: 3, y: 2 }, COL[1], { role: 'ghost', ghost: true, noLabel: true }), mk('A', { x: 3, y: 3 }, { x: 3, y: 2 }, COL[1], { role: 'main' })],
    ws: { editHead: () => false, canMove: v => !v.ghost }, overlay: null,
    read: vs => { const a = vs.find(v => v.role === 'main'); return tx(`Kuyruk konumu: (${fmt(a.tail.x, 1)}, ${fmt(a.tail.y, 1)}) · |A| = ${fmt(V.len(a.comp))} · yön: ${moveWords(a.comp)}`, `Tail position: (${fmt(a.tail.x, 1)}, ${fmt(a.tail.y, 1)}) · |A| = ${fmt(V.len(a.comp))} · direction: ${moveWords(a.comp)}`); } },
  { id: 'commute', concept: 'commutative',
    title: () => tx('Toplama sırası', 'Order of addition'),
    q: () => tx('A + B ile B + A aynı bileşkeyi verir mi?', 'Does A + B produce the same resultant as B + A?'),
    opts: () => [tx('Evet, aynı bileşkeyi verir', 'Yes, the same resultant'), tx('Hayır, büyüklükleri farklı olur', 'No, the magnitudes differ'), tx('Büyüklükleri aynı, yönleri zıt olur', 'Same magnitude but opposite sense'), tx('A ve B’nin uzunluğuna bağlıdır', 'It depends on the lengths of A and B')], ans: 0,
    exp: () => tx('A’yı çizip ucundan B’yi çizmek ile B’yi çizip ucundan A’yı çizmek aynı noktaya ulaşır; iki yol bir paralelkenar oluşturur. Bileşke aynıdır: A + B = B + A.', 'Drawing A then B ends at the same point as drawing B then A; the two routes form a parallelogram. The resultant is the same: A + B = B + A.'),
    task: () => tx('A ve B’nin uçlarındaki halkalardan tutup değiştirin. Düz yol: A sonra B; kesikli yol: B sonra A.', 'Pull the rings at the heads of A and B. Solid route: A then B; dashed route: B then A.'),
    setup: () => [mk('A', { x: 6, y: 4 }, { x: 5, y: 1 }, COL[0], { role: 'main' }), mk('B', { x: 6, y: 4 }, { x: 1, y: 4 }, COL[1], { role: 'main' })],
    ws: { editHead: () => true, canMove: () => false },
    overlay: (ws, vs) => { const [A, B] = vs, O = A.tail, e = V.add(A.comp, B.comp);
      return ws.arrow(head(A), B.comp, B.color, { w: 4, op: .85 }) + ws.arrow(head(B), A.comp, A.color, { w: 4, dash: '8 6', op: .85 }) + ws.arrow(O, e, '#00897b', { w: 6, op: .8 }) + ws.text({ x: O.x + e.x / 2 - .8, y: O.y + e.y / 2 + .7 }, 'R', '#00897b', { size: 19 }); },
    read: vs => { const [A, B] = vs, p = V.add(A.comp, B.comp), q = V.add(B.comp, A.comp); return `A + B = (${fmt(p.x, 1)}, ${fmt(p.y, 1)}) &nbsp; · &nbsp; B + A = (${fmt(q.x, 1)}, ${fmt(q.y, 1)})`; } },
  { id: 'neg', concept: 'scalarNeg',
    title: () => tx('Negatif skaler', 'Negative scalar'),
    q: () => tx('Bir vektör negatif bir sayıyla çarpılırsa ne olur?', 'What happens when a vector is multiplied by a negative number?'),
    opts: () => [tx('Yönü ters döner; büyüklüğü |k| katı olur', 'Its sense reverses; its magnitude is multiplied by |k|'), tx('Yalnızca büyüklüğü değişir', 'Only its magnitude changes'), tx('Hiçbir şey değişmez', 'Nothing changes'), tx('Doğrultusu 90° döner', 'Its line of action turns by 90°')], ans: 0,
    exp: () => tx('Negatif skaler vektörün yönünü ters çevirir, doğrultusunu korur; büyüklük |k| ile çarpılır. Pozitif skaler yönü korur.', 'A negative scalar reverses the sense and keeps the line of action; the magnitude is multiplied by |k|. A positive scalar keeps the sense.'),
    task: () => tx('Kaydırıcıyla k değerini değiştirin; B = k·A vektörünü gözleyin. A’nın ucunu da değiştirebilirsiniz.', 'Change k with the slider and watch B = k·A. You may also change the head of A.'),
    setup: () => [mk('A', { x: 4, y: 11 }, { x: 4, y: 2 }, COL[0], { role: 'main' }), mk('B', { x: 4, y: 4 }, { x: 4, y: 2 }, COL[1], { role: 'B', noLabel: false })],
    ws: { editHead: v => v.role === 'main', canMove: v => v.role === 'main' },
    slider: true,
    sync: (vs, k) => { const A = vs[0], B = vs[1]; B.comp = V.scale(A.comp, k); B.tail.x = clamp(B.tail.x, Math.max(0, -B.comp.x), Math.min(26, 26 - B.comp.x)); B.tail.y = clamp(B.tail.y, Math.max(0, -B.comp.y), Math.min(16, 16 - B.comp.y)); },
    read: (vs, k) => { const r = relation(vs[0].comp, vs[1].comp); return tx(`k = ${fmt(k, 1)} · |A| = ${fmt(V.len(vs[0].comp))} · |B| = ${fmt(V.len(vs[1].comp))} · yön: ${k === 0 ? 'sıfır vektörü' : k > 0 ? 'A ile aynı' : 'A’ya zıt'}`, `k = ${fmt(k, 1)} · |A| = ${fmt(V.len(vs[0].comp))} · |B| = ${fmt(V.len(vs[1].comp))} · sense: ${k === 0 ? 'zero vector' : k > 0 ? 'same as A' : 'opposite to A'}`); } },
  { id: 'zero3', concept: 'zeroResultant',
    title: () => tx('Üç vektör, sıfır bileşke', 'Three vectors, zero resultant'),
    q: () => tx('Sıfırdan farklı üç vektörün bileşkesi sıfır olabilir mi?', 'Can three non-zero vectors produce a zero resultant?'),
    opts: () => [tx('Evet, uç uca eklendiğinde kapalı bir üçgen oluşturuyorlarsa', 'Yes, if joined head-to-tail they form a closed triangle'), tx('Hayır, imkânsızdır', 'No, it is impossible'), tx('Yalnızca üçü de eşitse', 'Only if all three are equal'), tx('Yalnızca birbirine dik iseler', 'Only if they are mutually perpendicular')], ans: 0,
    exp: () => tx('Uç uca eklenen vektörlerin zinciri başladığı noktaya geri dönerse bileşke sıfırdır. Üç vektör kapalı bir üçgen oluşturabilir: A + B + C = 0.', 'If a head-to-tail chain returns to its starting point, the resultant is zero. Three vectors can form a closed triangle: A + B + C = 0.'),
    task: () => tx('A, B, C’nin uçlarını sürükleyin. Kesikli zincir uç uca eklemeyi gösterir; zincirin sonu başlangıca dönebilir mi?', 'Drag the heads of A, B and C. The dashed chain shows the head-to-tail sum; can its end return to the start?'),
    setup: () => [mk('A', { x: 12, y: 8 }, { x: 4, y: 0 }, COL[0], { role: 'main' }), mk('B', { x: 12, y: 8 }, { x: -1, y: 3 }, COL[1], { role: 'main' }), mk('C', { x: 12, y: 8 }, { x: 0, y: -1 }, COL[2], { role: 'main' })],
    ws: { editHead: () => true, canMove: () => false },
    overlay: (ws, vs) => { const [A, B, C] = vs, O = A.tail, p1 = head(A), p2 = V.add(p1, B.comp), p3 = V.add(p2, C.comp);
      return ws.arrow(p1, B.comp, B.color, { w: 4, dash: '8 6', op: .85 }) + ws.arrow(p2, C.comp, C.color, { w: 4, dash: '8 6', op: .85 }) + ws.dot(O, '#0b2a4a', 8) + ws.dot(p3, '#e63946', 8); },
    read: vs => { const e = V.sum(vs), ok = V.len(e) < 0.3 && vs.every(v => V.len(v.comp) >= 0.9);
      return tx(`Zincirin sonu başlangıçtan (${fmt(e.x, 1)}, ${fmt(e.y, 1)}) uzakta · |bileşke| = ${fmt(V.len(e))}`, `Chain end is (${fmt(e.x, 1)}, ${fmt(e.y, 1)}) from the start · |resultant| = ${fmt(V.len(e))}`) + (ok ? '<br><b style="color:#1b9e5a">✓ ' + tx('Üç vektör de sıfırdan farklı ve bileşke sıfır!', 'All three are non-zero and the resultant is zero!') + '</b>' : ''); } }
];

function m6Init() {
  const s = store.m6 || (store.m6 = { i: 0, step: 0, pred: {}, expl: {}, models: {}, touched: {}, k: {} });
  const a = ACTS[s.i];
  if (!s.models[a.id]) { s.models[a.id] = { vectors: a.setup() }; if (a.sync) a.sync(s.models[a.id].vectors, s.k[a.id] == null ? 1 : s.k[a.id]); }
  return s;
}
function modWrap6(root) {
  const s = m6Init(), a = ACTS[s.i], model = s.models[a.id], step = s.step;
  root.append(mhead(tx('Tahmin Et, Dene, Açıkla', 'Predict, Test, Explain'), tx('Önce tahmin edin, sonra deneyin, gözleminizi açıklayın ve bilimsel açıklamayla karşılaştırın.', 'First predict, then experiment, explain what you saw and compare with the scientific explanation.')));
  root.append(h('div', { class: 'sub-tabs' }, ACTS.map((x, i) => h('button', { class: 'btn sm' + (i === s.i ? ' dark' : ''), type: 'button', onclick: () => { s.i = i; s.step = 0; rerender(); } }, `${i + 1}. ${x.title()}${s.expl[x.id + '_done'] ? ' ✓' : ''}`))));
  const labels = [tx('1 · Tahmin', '1 · Predict'), tx('2 · Dene', '2 · Test'), tx('3 · Açıkla', '3 · Explain'), tx('4 · Karşılaştır', '4 · Compare')];
  const k = () => (s.k[a.id] == null ? 1 : s.k[a.id]);
  const readout = h('div', { class: 'info-box' });
  const upd = () => { readout.innerHTML = a.read(model.vectors, k()); };
  const lab = makeLab(root, {
    model, hist: null, ht: !!a.ws.ht,
    onReset: () => { s.models[a.id] = { vectors: a.setup() }; if (a.sync) a.sync(s.models[a.id].vectors, k()); rerender(); },
    refresh: upd,
    ws: Object.assign({}, a.ws, {
      interactive: step >= 1 && step <= 2,
      overlay: a.overlay ? ws => a.overlay(ws, model.vectors) : null,
      onMove: () => { if (a.sync) a.sync(model.vectors, k()); upd(); },
      onCommit: () => { s.touched[a.id] = (s.touched[a.id] || 0) + 1; if (a.sync) a.sync(model.vectors, k()); lab.ws.render(); upd(); updDone(); }
    })
  });
  const doneBtn = h('button', { class: 'btn pri', type: 'button', onclick: () => { s.step = 2; rerender(); } }, tx('Gözlemimi tamamladım →', 'I have finished observing →'));
  function updDone() { doneBtn.disabled = !(s.touched[a.id] > 0); }
  lab.side.append(h('div', { class: 'steps' }, labels.map((l, i) => h('span', { class: i === step ? 'on' : i < step ? 'done' : '' }, l))));
  if (step === 0) {
    lab.side.append(h('div', { class: 'task' }, h('div', { class: 'big' }, a.q())), h('div', { class: 'mut' }, tx('Tahmininizi seçin. Henüz deneme yapmadan düşünün.', 'Choose your prediction before experimenting.')),
      h('div', null, a.opts().map((o, i) => h('label', { class: 'opt' + (s.pred[a.id] === i ? ' on' : '') }, h('input', { type: 'radio', name: 'pred', checked: s.pred[a.id] === i, onchange: () => { s.pred[a.id] = i; rerender(); } }), o))),
      h('button', { class: 'btn pri', type: 'button', disabled: s.pred[a.id] == null, onclick: () => { s.step = 1; rerender(); } }, tx('Denemeye geç →', 'Go to the experiment →')));
  } else if (step === 1) {
    lab.side.append(h('div', { class: 'task' }, h('div', { class: 'mut' }, tx('Deney', 'Experiment')), h('div', null, a.task())));
    if (a.slider) {
      const out = h('b', null, 'k = ' + fmt(k(), 1));
      lab.side.append(h('label', { class: 'mut' }, tx('Skaler k', 'Scalar k'), h('input', { type: 'range', min: -2, max: 2, step: 0.5, value: k(), oninput: e => { s.k[a.id] = +e.target.value; out.textContent = 'k = ' + fmt(k(), 1); a.sync(model.vectors, k()); lab.ws.render(); upd(); }, onchange: () => { s.touched[a.id] = (s.touched[a.id] || 0) + 1; updDone(); } }), out));
    }
    lab.side.append(h('h3', null, tx('Gözlem', 'Observation')), readout, doneBtn); upd(); updDone();
  } else if (step === 2) {
    const ta = h('textarea', { placeholder: tx('Ne gözlemlediniz? Neden böyle oldu?', 'What did you observe? Why did it happen?'), oninput: e => { s.expl[a.id] = e.target.value; rev.disabled = e.target.value.trim().length < 3; } });
    ta.value = s.expl[a.id] || '';
    const rev = h('button', { class: 'btn pri', type: 'button', disabled: (s.expl[a.id] || '').trim().length < 3, onclick: () => { s.step = 3; s.expl[a.id + '_done'] = true; mark(a.concept); rerender(); } }, tx('Bilimsel açıklamayı göster →', 'Reveal the scientific explanation →'));
    lab.side.append(h('div', { class: 'task' }, h('div', { class: 'big' }, tx('Gözleminizi kendi cümlelerinizle açıklayın.', 'Explain your observation in your own words.'))), ta, rev, h('button', { class: 'btn', type: 'button', onclick: () => { s.step = 1; rerender(); } }, tx('← Denemeye dön', '← Back to the experiment')));
  } else {
    const ok = s.pred[a.id] === a.ans;
    lab.side.append(
      h('div', { class: 'fb ' + (ok ? 'ok' : 'info') }, h('div', null, ok ? okL(tx('Tahmininiz bilimsel açıklamayla örtüşüyor.', 'Your prediction matches the scientific explanation.')) : infoL(tx('Tahmininiz farklıydı. Gözlemlerinizle karşılaştırın:', 'Your prediction was different. Compare it with your observations:'))),
        h('div', null, tx('Tahmininiz: ', 'Your prediction: ') + '“' + esc(a.opts()[s.pred[a.id]]) + '”')),
      h('div', { class: 'info-box' }, '<b>' + tx('Sizin açıklamanız', 'Your explanation') + ':</b> ' + esc(s.expl[a.id] || '')),
      h('div', { class: 'task' }, h('div', { class: 'mut' }, tx('Bilimsel açıklama', 'Scientific explanation')), h('div', null, a.exp())),
      h('div', { class: 'row' }, h('button', { class: 'btn pri', type: 'button', disabled: s.i === ACTS.length - 1, onclick: () => { s.i++; s.step = 0; rerender(); } }, tx('Sonraki etkinlik →', 'Next activity →')),
        h('button', { class: 'btn', type: 'button', onclick: () => { s.step = 1; rerender(); } }, tx('Tekrar dene', 'Experiment again'))));
  }
  if (step >= 2) { lab.side.append(h('h3', null, tx('Gözlem', 'Observation')), readout); upd(); }
}

/* =====================================================================
   MODULE 7 — Test Yourself
   ===================================================================== */
const LEVELS = [[1, 'Keşfet', 'Discover'], [2, 'Uygula', 'Apply'], [3, 'Meydan Oku', 'Challenge']];
const GOAL = 5;
const slotPos = (c, sx, sy) => ({ x: sx + Math.max(0, -c.x), y: sy + Math.max(0, -c.y) });
const rot90 = c => ({ x: -c.y, y: c.x });

/* explain why Y is not equal/opposite/multiple of X */
function whyNot(X, Y, nx, ny) {
  const lx = V.len(X), ly = V.len(Y), r = relation(X, Y);
  if (r.kind === 'equal') return tx(`${nx} ve ${ny} eşit vektörlerdir.`, `${nx} and ${ny} are equal vectors.`);
  if (r.kind === 'opposite') return tx(`${nx} ve ${ny} zıt vektörlerdir: büyüklükleri eşit, yönleri ters.`, `${nx} and ${ny} are opposite vectors: equal magnitudes, opposite senses.`);
  if (Math.abs(lx - ly) < 0.3) return tx(`${nx} ve ${ny}’nin büyüklükleri eşit ama doğrultuları farklı; eşit vektör değiller.`, `${nx} and ${ny} have equal magnitudes but different lines of action; they are not equal vectors.`);
  if (V.parallel(X, Y)) return tx(`${nx} ve ${ny} paralel ama büyüklükleri farklı (${ny} = ${fmt(r.k)}${nx}); eşit ya da zıt değiller.`, `${nx} and ${ny} are parallel but their magnitudes differ (${ny} = ${fmt(r.k)}${nx}); they are not equal or opposite.`);
  return tx(`${nx} ve ${ny}’nin hem doğrultuları hem büyüklükleri farklı.`, `${nx} and ${ny} differ in both line of action and magnitude.`);
}

function T_select(multi, kindSel) {         // find two equal / find the opposite
  const A = pick(REFS), names = shuffle(['A', 'B', 'C', 'D', 'E']);
  let list;
  if (kindSel === 'equal') { const sc = pick([2, 0.5]); list = [A, A, rot90(A), V.scale(A, sc), V.scale(A, -1)]; }
  else { list = [A, V.scale(A, -1), A, V.scale(A, pick([-2, -0.5])), rot90(A)]; }
  const slots = shuffle([[2, 10], [10, 10], [18, 10], [4, 3], [14, 3]]);
  let order = list.map((c, i) => i);
  if (kindSel === 'opp') order = [0, ...shuffle([1, 2, 3, 4])];   // vector 0 is the reference
  const vs = [];
  const nm = kindSel === 'opp' ? ['A', ...shuffle(['B', 'C', 'D', 'E'])] : names;
  list.forEach((c, i) => { const p = slotPos(c, slots[i][0], slots[i][1]); vs.push(mk(nm[i], p, c, COL[i], { gi: i })); });
  vs.sort((a, b) => a.name.localeCompare(b.name));
  const hl = new Set();
  return {
    model: { vectors: vs }, hl, solved: false,
    prompt: () => kindSel === 'equal' ? tx('Birbirine eşit olan iki vektörü seçin (tıklayın), sonra “Kontrol Et”e basın.', 'Click the two vectors that are equal to each other, then press “Check”.')
      : tx('A vektörünün zıt vektörünü seçin.', 'Select the opposite vector of A.'),
    hints: () => [tx('Eşit vektörlerin büyüklüğü, doğrultusu ve yönü aynıdır; konumları farklı olabilir.', 'Equal vectors share magnitude, line of action and sense; their positions may differ.'),
      tx('Kuyruktan uca kaç birim sağa/yukarı gidildiğini sayın ve karşılaştırın.', 'Count how many units right/up you go from tail to head and compare.'),
      kindSel === 'equal' ? tx('Aynı uzunlukta görünüp farklı yöne bakan vektörlere dikkat edin: onlar eşit değildir.', 'Beware of vectors that are the same length but point elsewhere: they are not equal.') : tx('Zıt vektör: aynı büyüklük, aynı doğrultu, ters yön.', 'Opposite vector: same magnitude, same line of action, reversed sense.')],
    ws: () => ({ interactive: false, onClick: v => { if (multi) { if (hl.has(v.id)) hl.delete(v.id); else { if (hl.size >= 2) hl.delete([...hl][0]); hl.add(v.id); } } else { hl.clear(); if (kindSel !== 'opp' || v.name !== 'A') hl.add(v.id); } } }),
    check: () => {
      const sel = vs.filter(v => hl.has(v.id));
      if (kindSel === 'equal') {
        if (sel.length < 2) return { ok: false, lines: [infoL(tx('İki vektör seçmelisiniz.', 'You need to select two vectors.'))] };
        const r = relation(sel[0].comp, sel[1].comp);
        return { ok: r.kind === 'equal', lines: [r.kind === 'equal' ? okL(whyNot(sel[0].comp, sel[1].comp, sel[0].name, sel[1].name)) : badL(whyNot(sel[0].comp, sel[1].comp, sel[0].name, sel[1].name))], concepts: ['equal', 'position'] };
      }
      if (!sel.length) return { ok: false, lines: [infoL(tx('Bir vektör seçin.', 'Select a vector.'))] };
      const r = relation(vs.find(v => v.name === 'A').comp, sel[0].comp);
      return { ok: r.kind === 'opposite', lines: [r.kind === 'opposite' ? okL(whyNot(vs.find(v => v.name === 'A').comp, sel[0].comp, 'A', sel[0].name)) : badL(whyNot(vs.find(v => v.name === 'A').comp, sel[0].comp, 'A', sel[0].name))], concepts: ['opposite'] };
    }
  };
}
function T_wrongRep() {
  const A = pick(REFS), k = pick([2, -1, -2, 3, 0.5, -0.5]), good = Math.random() < 0.5;
  let B = V.scale(A, k);
  if (!good) { const f = pick(['sense', 'len', 'dir']); B = f === 'sense' ? V.scale(A, -k) : f === 'len' ? V.scale(A, k + (Math.abs(k) < 1 ? Math.sign(k) * 1 : Math.sign(k))) : rot90(B); }
  if (V.len(B) > 15) B = V.scale(A, k);
  const vs = [mk('A', { x: 3 + Math.max(0, -A.x), y: 10 + Math.max(0, -A.y) - (A.y > 0 ? 0 : 0) }, A, COL[0]), mk('B', slotPos(B, 10, 3), B, COL[1])];
  const truth = checkScalar(A, B, k).ok;
  return {
    model: { vectors: vs }, solved: false,
    prompt: () => tx(`Şekilde “${eqText(k)}” gösterimi doğru mu çizilmiştir?`, `Is the relation “${eqText(k)}” drawn correctly in the figure?`),
    hints: () => [tx('Önce A’yı sonra B’yi “kaç birim sağa, kaç birim yukarı” diye okuyun.', 'Read A and then B as “how many units right, how many up”.'), tx('Üç şeye bakın: büyüklük, doğrultu (paralel mi?) ve yön.', 'Check three things: magnitude, line of action (parallel?) and sense.'), tx(`Skaler ${kLabel(k)} ${k > 0 ? 'pozitif: yön aynı' : 'negatif: yön ters'}.`, `The scalar ${kLabel(k)} is ${k > 0 ? 'positive: same sense' : 'negative: opposite sense'}.`)],
    ws: () => ({ interactive: false }),
    controls: ctx => [h('div', { class: 'row' }, [[true, tx('✔ Doğru çizilmiş', '✔ Drawn correctly')], [false, tx('✘ Hatalı çizilmiş', '✘ Drawn incorrectly')]].map(o => h('button', { class: 'btn pri', type: 'button', onclick: () => {
      const c = checkScalar(A, B, k), ok = o[0] === truth;
      ctx.submit({ ok, lines: [ok ? okL(tx('Doğru karar!', 'Correct decision!')) : badL(tx('Bu karar doğru değil.', 'That decision is not right.'))].concat(ok || true ? c.lines : []), concepts: [k > 0 ? 'scalarPos' : 'scalarNeg'] });
    } }, o[1])))],
    noCheck: true
  };
}
function T_scalar(correctMode) {
  const A = pick(REFS), k = pick(correctMode ? [-2, 2, -1, 3, 0.5] : [-0.5, 3, -2, 0.5, 2]);
  let B0 = { x: 1, y: 3 };
  if (correctMode) { const f = pick(['sense', 'len', 'dir']); const good = V.scale(A, k); B0 = f === 'sense' ? V.scale(good, -1) : f === 'len' ? V.scale(A, k + Math.sign(k) * 1) : rot90(good); if (V.len(B0) > 15) B0 = V.scale(A, -k); }
  const vs = [mk('A', slotPos(A, 3, 10), A, COL[0], { role: 'ref' }), mk('B', slotPos(B0, 12, 4), B0, COL[1], { role: 'ans' })];
  return {
    model: { vectors: vs }, solved: false,
    prompt: () => correctMode ? tx(`B vektörü “${eqText(k)}” olacak şekilde hatalı çizilmiş. Ucundan tutarak düzeltin.`, `B was drawn wrongly for “${eqText(k)}”. Fix it by pulling its head.`) : tx(`Oluşturun: ${eqText(k)}. B’nin ucunu sürükleyerek ayarlayın.`, `Construct: ${eqText(k)}. Adjust B by dragging its head.`),
    hints: () => [tx(`A: ${moveWords(A)}.`, `A: ${moveWords(A)}.`), tx(`B, A’ya paralel; büyüklük ${kLabel(Math.abs(k))} katı; ${k > 0 ? 'yön aynı' : 'yön ters'}.`, `B is parallel to A; magnitude ×${kLabel(Math.abs(k))}; ${k > 0 ? 'same sense' : 'opposite sense'}.`), tx(`B: ${moveWords(V.scale(A, k))}.`, `B: ${moveWords(V.scale(A, k))}.`)],
    ws: () => ({ editHead: v => v.role === 'ans' }),
    check: () => { const r = checkScalar(A, vs[1].comp, k); return { ok: r.ok, lines: r.lines, concepts: [k > 0 ? 'scalarPos' : 'scalarNeg'] }; }
  };
}
function T_chain(n, withR) {
  const vs = placeVectors(genComps(withR ? 'arb' : 'arb', n));
  return {
    model: { vectors: vs }, solved: false,
    prompt: () => withR ? tx(`${vs.map(v => v.name).join(' + ')} = R: vektörleri uç uca ekleyin ve R’yi çizin.`, `${vs.map(v => v.name).join(' + ')} = R: join the vectors head-to-tail and draw R.`) : tx('Üç vektörü uç uca olacak şekilde yerleştirin.', 'Arrange the three vectors head-to-tail.'),
    hints: () => [tx('Bir vektörün kuyruğunu başka bir vektörün ucuna getirin.', 'Bring the tail of one vector to the head of another.'), tx('“Uç Uca Yapış” seçeneği yakınlaştırınca vektörleri otomatik birleştirir.', '“Snap Head-to-Tail” joins vectors automatically when they come close.'), withR ? tx('R, ilk kuyruktan son uca çizilir.', 'R runs from the first tail to the last head.') : tx('Sıra önemli değil; her kuyruk bir öncekinin ucuna değmeli.', 'The order does not matter; every tail must touch a previous head.')],
    ws: () => withR ? ({ draw: 'R', editHead: v => v.role === 'R', onDraw: d => { vs.splice(0, vs.length, ...vs.filter(v => v.role !== 'R')); vs.push(mk('R', d.tail, d.comp, RCOL, { role: 'R' })); } }) : ({}),
    check: () => {
      const items = vs.filter(v => v.role === 'main');
      if (!withR) { const c = chainOrder(items); return { ok: c.ok, lines: [c.ok ? okL(tx('Harika! Her kuyruk bir önceki vektörün ucuna değiyor.', 'Great! Every tail touches the previous head.')) : badL(tx(`Henüz ${Math.max(0, c.links)}/${items.length - 1} bağlantı doğru.`, `Only ${Math.max(0, c.links)}/${items.length - 1} joints are correct.`))], concepts: ['headToTail'] }; }
      const r = checkSum(items, vs.find(v => v.role === 'R'), false); return { ok: r.pass, lines: r.lines, concepts: ['headToTail', 'resultant'] };
    },
    ht: true
  };
}
function T_zeroChain() {
  for (let t = 0; t < 100; t++) {
    const zero = Math.random() < 0.5, cs = genComps(zero ? 'zero' : 'arb', 3);
    let p = { x: 0, y: 0 }, pts = [p];
    cs.forEach(c => { p = V.add(p, c); pts.push(p); });
    const xs = pts.map(q => q.x), ys = pts.map(q => q.y), w = Math.max(...xs) - Math.min(...xs), hh = Math.max(...ys) - Math.min(...ys);
    if (w > 18 || hh > 11) continue;
    const ox = 13 - (Math.max(...xs) + Math.min(...xs)) / 2, oy = 8 - (Math.max(...ys) + Math.min(...ys)) / 2;
    const vs = []; let q = { x: Math.round(ox), y: Math.round(oy) };
    cs.forEach((c, i) => { vs.push(mk('ABC'[i], q, c, COL[i], { role: 'main' })); q = V.add(q, c); });
    return {
      model: { vectors: vs }, solved: false,
      prompt: () => tx('A, B ve C vektörleri uç uca eklenmiştir. Bileşkeleri sıfır mıdır?', 'A, B and C have been joined head-to-tail. Is their resultant zero?'),
      hints: () => [tx('Zincirin başladığı nokta ile bittiği noktaya bakın.', 'Look at where the chain starts and where it ends.'), tx('Bileşke, ilk kuyruktan son uca giden vektördür.', 'The resultant is the vector from the first tail to the last head.'), tx('Başlangıç ve bitiş aynı noktaysa bileşke sıfırdır.', 'If start and end coincide, the resultant is zero.')],
      ws: () => ({ interactive: false }),
      controls: ctx => [h('div', { class: 'row' }, [[true, tx('Evet, sıfır', 'Yes, zero')], [false, tx('Hayır, sıfır değil', 'No, not zero')]].map(o => h('button', { class: 'btn pri', type: 'button', onclick: () => {
        const ok = o[0] === zero;
        ctx.submit({ ok, lines: [ok ? okL(tx('Doğru!', 'Correct!')) : badL(tx('Tekrar bakın.', 'Look again.')), infoL(zero ? tx('Zincir başladığı noktaya geri döndü: kapalı çokgenin bileşkesi sıfırdır.', 'The chain returned to its start: a closed polygon has a zero resultant.') : tx('Zincirin sonu başlangıçtan farklı bir noktada: bileşke sıfırdan farklıdır.', 'The chain ends away from its start: the resultant is not zero.'))], concepts: ['zeroResultant', 'headToTail'] });
      } }, o[1])))], noCheck: true
    };
  }
  return T_zeroChain();
}
function T_commute() {
  const A = pick([{ x: 5, y: 1 }, { x: 4, y: 2 }, { x: 3, y: -1 }]), B = pick([{ x: 1, y: 4 }, { x: 2, y: 3 }, { x: -2, y: 3 }]);
  const vs = [mk('A', { x: 8, y: 6 }, A, COL[0]), mk('B', { x: 8, y: 6 }, B, COL[1])], t = { shown: false };
  return {
    model: { vectors: vs }, solved: false, t,
    prompt: () => tx('A + B ile B + A karşılaştırıldığında bileşkeler için ne söylenebilir? (Uçlardan tutup deneyebilirsiniz.)', 'What can be said about the resultants of A + B and B + A? (You may experiment by pulling the heads.)'),
    hints: () => [tx('A’yı çizip ucundan B’yi çizmeyi, sonra B’yi çizip ucundan A’yı çizmeyi düşünün.', 'Imagine drawing A then B from its head, and then B then A from its head.'), tx('İki yol bir paralelkenar oluşturur.', 'The two routes form a parallelogram.'), tx('Paralelkenarın karşı köşesi ikisi için de aynıdır.', 'The opposite corner of the parallelogram is the same for both.')],
    ws: () => ({ editHead: () => true, canMove: () => false, overlay: ws => t.shown ? ws.arrow(head(vs[0]), vs[1].comp, vs[1].color, { w: 4, op: .85 }) + ws.arrow(head(vs[1]), vs[0].comp, vs[0].color, { w: 4, dash: '8 6', op: .85 }) + ws.arrow(vs[0].tail, V.add(vs[0].comp, vs[1].comp), '#00897b', { w: 6, op: .8 }) : '' }),
    controls: ctx => [h('div', null, [[0, tx('Aynı bileşkeyi verir', 'Same resultant')], [1, tx('Büyüklükleri farklı olur', 'Different magnitudes')], [2, tx('Yönleri zıt olur', 'Opposite senses')]].map(o => h('button', { class: 'btn pri', style: 'display:block;width:100%;margin:5px 0', type: 'button', onclick: () => {
      const ok = o[0] === 0; t.shown = true; ctx.ws.render();
      ctx.submit({ ok, lines: [ok ? okL(tx('Doğru! Toplama sırası bileşkeyi değiştirmez.', 'Correct! The order of addition does not change the resultant.')) : badL(tx('Şekle bakın: iki yol aynı noktada bitiyor.', 'Look at the figure: both routes end at the same point.')), infoL(tx('A + B = B + A (vektör toplamı değişmelidir).', 'A + B = B + A (vector addition is commutative).'))], concepts: ['commutative'] });
    } }, o[1])))], noCheck: true
  };
}
function T_zeroConstruct() {
  const cs = genComps('arb', 2), A = cs[0], B = cs[1], need = V.scale(V.add(A, B), -1);
  const vs = [mk('A', { x: 3, y: 8 }, A, COL[0], { role: 'main' }), mk('B', { x: 3, y: 8 }, B, COL[1], { role: 'main' }), mk('C', slotPos({ x: 1, y: 1 }, 18, 6), { x: 1, y: 1 }, COL[2], { role: 'ans' })];
  return {
    model: { vectors: vs }, solved: false,
    prompt: () => tx('A, B ve C uç uca eklendiğinde bileşke sıfır olsun. C’yi (ucundan tutarak) uygun hâle getirin.', 'Make the resultant of A, B and C equal to zero. Adjust C by pulling its head.'),
    hints: () => [tx('Kesikli zincir A + B + C’yi gösterir. Zincirin sonu başlangıca dönmeli.', 'The dashed chain shows A + B + C. Its end must return to the start.'), tx('C, A + B bileşkesinin tam tersi olmalı.', 'C must be exactly opposite to the resultant of A + B.'), tx(`C: ${moveWords(need)}.`, `C: ${moveWords(need)}.`)],
    ws: () => ({ editHead: v => v.role === 'ans', canMove: v => v.role === 'ans', overlay: ws => { const C = vs[2], p = { x: 14, y: 8 }, p1 = V.add(p, vs[0].comp), p2 = V.add(p1, vs[1].comp);
      return ws.dot(p, '#0b2a4a', 8) + ws.arrow(p, vs[0].comp, COL[0], { w: 4, dash: '8 6', op: .8 }) + ws.arrow(p1, vs[1].comp, COL[1], { w: 4, dash: '8 6', op: .8 }) + ws.arrow(p2, C.comp, COL[2], { w: 4, dash: '8 6', op: .8 }); } }),
    check: () => {
      const e = V.sum(vs), ok = V.len(e) < 0.3 && V.len(vs[2].comp) >= 0.9;
      return { ok, lines: [ok ? okL(tx('A + B + C = 0: zincir kapandı.', 'A + B + C = 0: the chain closes.')) : badL(tx(`Bileşke hâlâ sıfır değil: |A + B + C| = ${fmt(V.len(e))}.`, `The resultant is not zero yet: |A + B + C| = ${fmt(V.len(e))}.`))], concepts: ['zeroResultant'] };
    }
  };
}
const TASKS = { 1: [() => T_select(true, 'equal'), () => T_select(false, 'opp'), () => T_wrongRep()], 2: [() => T_scalar(false), () => T_chain(3, false), () => T_zeroChain()], 3: [() => T_chain(4, true), () => T_commute(), () => T_scalar(true), () => T_zeroConstruct()] };

function m7Init() {
  const s = store.m7 || (store.m7 = { level: 1, idx: { 1: 0, 2: 0, 3: 0 }, solved: { 1: 0, 2: 0, 3: 0 }, task: null, tries: 0, hint: 0 });
  if (!s.task) m7New(s);
  return s;
}
function m7New(s) { const l = TASKS[s.level]; s.task = l[s.idx[s.level] % l.length](); s.tries = 0; s.hint = 0; s.fbLines = null; }
function modWrap7(root) {
  const s = m7Init(), T = s.task;
  root.append(mhead(tx('Kendini Test Et', 'Test Yourself'), tx('Sınırsız alıştırma: giriş gerekmez. Puan isteğe bağlıdır; asıl amaç kavramı anlamaktır.', 'Unlimited practice, no login. The score is optional — the goal is understanding.')));
  root.append(h('div', { class: 'sub-tabs' }, h('div', { class: 'seg', style: 'width:100%;max-width:640px' }, LEVELS.map(l => h('button', { class: s.level === l[0] ? 'on' : '', onclick: () => { s.level = l[0]; m7New(s); rerender(); } }, `${tx('Seviye', 'Level')} ${l[0]}: ${tx(l[1], l[2])}`)))));
  const fbEl = h('div', { class: 'fb' }), prog = h('div'), nextBtn = h('button', { class: 'btn' + (T.solved ? ' pri' : ''), type: 'button', onclick: () => { s.idx[s.level]++; m7New(s); rerender(); } }, tx('Sonraki görev →', 'Next task →'));
  const updProg = () => { prog.innerHTML = `<div class="row" style="justify-content:space-between"><b>⭐ ${tx('Puan', 'Score')}: ${store.score}</b><span class="mut">${tx('Seviye ilerlemesi', 'Level progress')}: ${Math.min(GOAL, s.solved[s.level])}/${GOAL}${s.solved[s.level] >= GOAL ? ' 🎉' : ''}</span></div><div class="prog"><i style="width:${Math.min(100, s.solved[s.level] / GOAL * 100)}%"></i></div>`; };
  const ctx = { submit: r => {
    s.tries++;
    showFb(fbEl, r.ok ? 'ok' : 'bad', r.lines.concat(r.ok ? [] : [infoL(tx('Düzeltip yeniden deneyebilirsiniz. Ceza yok.', 'You can fix it and try again. No penalty.'))]));
    if (r.ok && !T.solved) { T.solved = true; store.score += (s.tries === 1 && !s.hint) ? 10 : 5; s.solved[s.level]++; (r.concepts || []).forEach(mark); nextBtn.classList.add('pri'); updProg(); }
    lab.ws.render();
  } };
  const lab = makeLab(root, {
    model: T.model, hist: null, ht: !!T.ht,
    onReset: () => { m7New(s); rerender(); }, refresh: () => { },
    ws: Object.assign({}, T.ws(), { })
  });
  ctx.ws = lab.ws;
  if (T.hl) { lab.ws.hl = T.hl; const oc = lab.ws.o.onClick; lab.ws.o.onClick = v => { if (oc) oc(v); lab.ws.render(); }; }
  updProg();
  lab.side.append(prog, h('div', { class: 'task' }, h('div', { class: 'big' }, T.prompt())));
  if (T.controls) lab.side.append(...T.controls(ctx));
  const btns = h('div', { class: 'row' });
  if (!T.noCheck) btns.append(h('button', { class: 'btn pri', type: 'button', onclick: () => ctx.submit(T.check()) }, '✔ ' + tx('Kontrol Et', 'Check')));
  btns.append(hintBtn(s, T.hints, fbEl), nextBtn);
  lab.side.append(btns, fbEl);
  if (T.solved) showFb(fbEl, 'ok', [okL(tx('Bu görev tamamlandı. Sonraki göreve geçebilirsiniz.', 'Task completed. You can move on.'))]);
}

/* =====================================================================
   Application shell
   ===================================================================== */
const MODS = [
  null,
  { fn: modWrap1, tr: 'Vektörleri Tanıyalım', en: 'Understanding Vectors' },
  { fn: modWrap2, tr: 'Kendi Vektörünü Oluştur', en: 'Create Your Own Vector' },
  { fn: modWrap3, tr: 'Vektörleri Toplayalım', en: 'Vector Addition Laboratory' },
  { fn: modWrap4, tr: 'Paralelkenar Yöntemi', en: 'Parallelogram Method' },
  { fn: modWrap5, tr: 'Soru Hazırla', en: 'Make a Challenge' },
  { fn: modWrap6, tr: 'Tahmin Et, Dene, Açıkla', en: 'Predict, Test, Explain' },
  { fn: modWrap7, tr: 'Kendini Test Et', en: 'Test Yourself' }
];
function rerender() {
  document.documentElement.lang = store.lang;
  document.getElementById('title').textContent = tx('VEKTÖR LABORATUVARI', 'VECTOR LABORATORY');
  document.getElementById('subtitle').textContent = tx('Keşfet • Oluştur • Karşılaştır • Topla', 'Explore • Create • Compare • Add');
  document.getElementById('credit').textContent = tx('Marmara Koleji | Fen Lisesi — Hazırlayan: Mehtap Aydoğan', 'Marmara Koleji | Fen Lisesi — Prepared by Mehtap Aydoğan');
  document.getElementById('btn-gloss').textContent = '📘 ' + tx('Terimler', 'Glossary');
  document.getElementById('btn-sum').textContent = '⭐ ' + tx('Öğrenme Özeti', 'Learning Summary');
  document.getElementById('btn-tr').classList.toggle('on', store.lang === 'tr');
  document.getElementById('btn-en').classList.toggle('on', store.lang === 'en');
  const tabs = document.getElementById('tabs'); tabs.innerHTML = '';
  MODS.forEach((m, i) => { if (m) tabs.append(h('button', { class: i === store.mod ? 'on' : '', type: 'button', onclick: () => { store.mod = i; rerender(); } }, h('span', { class: 'n' }, i), tx(m.tr, m.en))); });
  const main = document.getElementById('main'); main.innerHTML = '';
  MODS[store.mod].fn(main);
}
function setLang(l) { store.lang = l; try { localStorage.setItem('vl_lang', l); } catch (e) { } rerender(); }

document.getElementById('btn-tr').addEventListener('click', () => setLang('tr'));
document.getElementById('btn-en').addEventListener('click', () => setLang('en'));
document.getElementById('btn-gloss').addEventListener('click', () => {
  const rows = [['Vektör', 'Vector'], ['Vektörün büyüklüğü', 'Vector magnitude'], ['Doğrultu', 'Line of action / Direction'], ['Yön', 'Sense / Orientation'], ['Eşit vektörler', 'Equal vectors'], ['Zıt vektörler', 'Opposite vectors'], ['Bileşke vektör', 'Resultant vector'], ['Uç uca ekleme yöntemi', 'Head-to-tail method'], ['Paralelkenar yöntemi', 'Parallelogram method'], ['Skalerle çarpma', 'Scalar multiplication'], ['Sıfır vektörü', 'Zero vector']];
  const def = [
    ['Büyüklüğü, doğrultusu ve yönü olan nicelik', 'A quantity with magnitude, line of action and sense'], ['|A| = √(Aₓ² + A_y²)', '|A| = √(Aₓ² + A_y²)'], ['Vektörün üzerinde bulunduğu doğru', 'The straight line along which the vector acts'],
    ['Doğru üzerinde hangi tarafa işaret ettiği', 'Which way along the line it points'], ['Büyüklük, doğrultu ve yönleri aynı', 'Same magnitude, line of action and sense'], ['Büyüklük ve doğrultu aynı, yön ters', 'Same magnitude and line of action, opposite sense'],
    ['Vektörlerin toplamı: R = A + B + …', 'The sum of vectors: R = A + B + …'], ['Kuyruk, öncekinin ucuna; R ilk kuyruktan son uca', 'Tail to previous head; R from first tail to last head'], ['Ortak kuyruklu iki vektörün köşegeni', 'Diagonal of the parallelogram of two vectors with a common tail'],
    ['k·A: büyüklük |k| katı; k < 0 ise yön ters', 'k·A: magnitude × |k|; sense reversed if k < 0'], ['Büyüklüğü 0 olan vektör', 'The vector with magnitude 0']];
  showModal(tx('Terimler', 'Glossary'), h('table', { class: 'glossary' }, h('tr', null, h('th', null, tx('Terim', 'Term')), h('th', null, tx('Anlamı', 'Meaning'))),
    rows.map((r, i) => h('tr', null, h('td', null, h('b', null, store.lang === 'tr' ? r[0] : r[1])), h('td', null, store.lang === 'tr' ? def[i][0] : def[i][1])))));
});
document.getElementById('btn-sum').addEventListener('click', () => {
  const got = CONCEPTS.filter(c => store.concepts[c[0]]).length;
  showModal(tx('Öğrenme Özeti', 'Learning Summary'), [
    h('p', null, tx(`Gösterdiğiniz kavramlar: ${got}/${CONCEPTS.length} · Puan: ${store.score}`, `Concepts demonstrated: ${got}/${CONCEPTS.length} · Score: ${store.score}`)),
    h('div', { class: 'prog' }, h('i', { style: `width:${got / CONCEPTS.length * 100}%` })),
    CONCEPTS.map(c => h('div', { class: 'concept' + (store.concepts[c[0]] ? ' got' : '') }, h('b', null, store.concepts[c[0]] ? '✓' : '·'), tx(c[1], c[2])))]);
});

(function boot() {
  const m = location.hash.match(/^#c=([\w\-]+)/);
  if (m) {
    try {
      const s = m5Init(); s.ch = deserialize(JSON.parse(b64d(m[1])));
      s.hist = new Hist(() => s.ch.vectors, v => { s.ch.vectors = v; });
      m5StartStudent(s); store.mod = 5;
    } catch (e) { console.warn('invalid challenge link', e); }
  }
  rerender();
})();
