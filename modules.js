'use strict';
/* =====================================================================
   modules.js : Modules 1-4  (understanding, create, addition, parallelogram)
   Each module keeps its own state object in `store` so the language switch
   re-renders the interface without losing the student's workspace.
   ===================================================================== */

const REFS = [{ x: 4, y: 2 }, { x: 4, y: -2 }, { x: -4, y: 2 }, { x: 2, y: 4 }, { x: -2, y: -4 }, { x: -4, y: -2 }];
const moveWords = c => {
  const p = [];
  if (c.x !== 0) p.push(tx(`${Math.abs(c.x)} birim ${c.x > 0 ? 'sağa' : 'sola'}`, `${Math.abs(c.x)} unit${Math.abs(c.x) === 1 ? '' : 's'} ${c.x > 0 ? 'right' : 'left'}`));
  if (c.y !== 0) p.push(tx(`${Math.abs(c.y)} birim ${c.y > 0 ? 'yukarı' : 'aşağı'}`, `${Math.abs(c.y)} unit${Math.abs(c.y) === 1 ? '' : 's'} ${c.y > 0 ? 'up' : 'down'}`));
  return p.join(tx(', ', ' and ')) || tx('hiç', 'nowhere');
};
const eqText = (k, n = 'A', m = 'B') => k === 0 ? `${m} = 0` : k === 1 ? `${m} = ${n}` : k === -1 ? `${m} = −${n}` : `${m} = ${kLabel(k)}${n}`.replace('= ½', '= ½').replace('−½', '−½');

function vecInfo(v) {
  if (!v) return `<span class="mut">${tx('Bir vektör seçin: büyüklüğü ve yönü burada görünür.', 'Select a vector to see its magnitude and direction here.')}</span>`;
  const c = v.comp, l = V.len(c);
  let s = `<b style="color:${v.color}">${esc(v.name)}</b> — ${tx('büyüklük', 'magnitude')}: |${esc(v.name)}| = √(${fmt(Math.abs(c.x), 1)}² + ${fmt(Math.abs(c.y), 1)}²) = <b>${fmt(l)}</b><br>`;
  s += l < 0.3 ? tx('Sıfır vektörü: doğrultusu ve yönü yoktur.', 'Zero vector: it has no direction or sense.') : `${tx('Kuyruktan uca', 'Tail to head')}: ${moveWords(c)}`;
  if (store.opts.adv && l >= 0.3) s += `<br>${esc(v.name)}<sub>x</sub> = ${fmt(c.x, 1)}, ${esc(v.name)}<sub>y</sub> = ${fmt(c.y, 1)}, θ = ${fmt(V.deg(c), 1)}°`;
  return s;
}

/* progressive hints (max 3) */
function hintBtn(s, getHints, fbEl) {
  const b = h('button', { class: 'btn', type: 'button' });
  const lab = () => { b.textContent = `💡 ${tx('İpucu', 'Hint')} (${s.hint || 0}/3)`; };
  b.addEventListener('click', () => {
    s.hint = Math.min(3, (s.hint || 0) + 1); lab();
    showFb(fbEl, 'info', getHints().slice(0, s.hint).map((t, i) => `💡 <b>${i + 1}/3</b> — ${t}`));
  });
  lab(); return b;
}
const swatches = (cur, fn) => h('div', { class: 'sw' }, COL.concat([RCOL]).map(c => h('button', { type: 'button', style: `background:${c}`, class: c === cur ? 'on' : '', 'aria-label': c, onclick: () => fn(c) })));
const mhead = (t, p) => h('div', { class: 'mhead' }, h('h2', null, t), h('p', null, p));

/* =====================================================================
   MODULE 1 — Understanding Vectors
   ===================================================================== */
function m1Init() {
  const s = store.m1 || (store.m1 = { tab: 'build', rel: 2, hint: 0, fb: null, cmpA: 0, cmpB: 1 });
  if (!s.model) m1New(s);
  if (!s.cmodel) m1Cmp(s);
  return s;
}
const M1K = [1, -1, 2, 3, 0.5, -2, -0.5, 0];
function m1New(s, keepRef) {
  const A = keepRef ? s.model.vectors[0].comp : pick(REFS);
  s.model = { vectors: [mk('A', { x: 3, y: 10 }, A, COL[0], { role: 'ref' }), mk('B', { x: 9, y: 3 }, { x: 1, y: 3 }, COL[1], { role: 'ans' })] };
  s.hist = new Hist(() => s.model.vectors, v => { s.model.vectors = v; });
  s.hint = 0; s.fb = null;
}
function m1Cmp(s) {
  const A = pick(REFS), ks = shuffle([2, 0.5, -2, -0.5]);
  const put = (c, sx, sy) => ({ x: sx + Math.max(0, -c.x), y: sy + Math.max(0, -c.y) });
  const D = V.scale(A, ks[0]), E = { x: -A.y, y: A.x }, Fv = V.scale(A, ks[1]);
  const list = shuffle([['B', A, 1], ['C', V.scale(A, -1), 2], ['D', D, 3], ['E', E, 4], ['F', Fv, 5]]);
  const slots = [[2, 11], [10, 11], [18, 11], [3, 3], [11, 3], [19, 3]];
  const vs = [mk('A', put(A, 2, 11), A, COL[0])];
  list.forEach((it, i) => { const c = it[1], p = put(c, slots[i + 1][0], slots[i + 1][1]); vs.push(mk(it[0], p, c, COL[(i + 1) % COL.length])); });
  vs.sort((a, b) => a.name.localeCompare(b.name));
  s.cmodel = { vectors: vs }; s.cmpA = 0; s.cmpB = 1;
  s.chist = new Hist(() => s.cmodel.vectors, v => { s.cmodel.vectors = v; });
}

function modWrap1(root) {
  const s = m1Init();
  root.append(mhead(tx('Vektörleri Tanıyalım', 'Understanding Vectors'),
    tx('Vektörleri sürükleyin, uçlarından tutup uzatın veya döndürün; büyüklük, doğrultu ve yönü karşılaştırın.', 'Drag vectors, stretch or rotate them by their heads, and compare magnitude, line of action and sense.')));
  root.append(h('div', { class: 'sub-tabs' }, h('div', { class: 'seg', style: 'width:100%;max-width:520px' },
    h('button', { class: s.tab === 'build' ? 'on' : '', onclick: () => { s.tab = 'build'; rerender(); } }, '🛠 ' + tx('Oluştur', 'Construct')),
    h('button', { class: s.tab === 'cmp' ? 'on' : '', onclick: () => { s.tab = 'cmp'; rerender(); } }, '🔍 ' + tx('Karşılaştır', 'Compare')))));
  s.tab === 'build' ? m1Build(root, s) : m1Compare(root, s);
}

function m1Build(root, s) {
  const fbEl = h('div', { class: 'fb' }), info = h('div', { class: 'info-box' });
  const k = M1K[s.rel];
  const lab = makeLab(root, {
    model: s.model, hist: s.hist,
    onReset: () => { m1New(s, true); rerender(); },
    refresh: () => { info.innerHTML = vecInfo(lab.ws.vs.find(v => v.id === lab.ws.sel)); },
    ws: { editHead: v => v.role === 'ans', onCommit: () => { s.hist.push(); info.innerHTML = vecInfo(lab.ws.vs.find(v => v.id === lab.ws.sel)); }, onSelect: v => { info.innerHTML = vecInfo(v); }, onMove: v => { info.innerHTML = vecInfo(v); } }
  });
  const A = () => s.model.vectors[0].comp;
  const relSel = h('select', { onchange: e => { s.rel = +e.target.value; m1New(s, true); rerender(); } },
    M1K.map((kk, i) => h('option', { value: i, selected: i === s.rel }, (kk === 1 ? tx('Eşit vektör', 'Equal vector') : kk === -1 ? tx('Zıt vektör', 'Opposite vector') : kk === 0 ? tx('Sıfır vektörü', 'Zero vector') : tx('Skalerle çarpma', 'Scalar multiplication')) + ':  ' + eqText(kk))));
  const hints = () => {
    const a = A(), tgt = V.scale(a, k);
    return [
      tx(`A’yı inceleyin: kuyruğundan ucuna ${moveWords(a)} gidiliyor. Büyüklüğü |A| = ${fmt(V.len(a))}.`, `Look at A: from its tail to its head you go ${moveWords(a)}. Its magnitude is |A| = ${fmt(V.len(a))}.`),
      k === 0 ? tx('Sıfır vektörünün ucu ile kuyruğu aynı noktadadır. B’nin ucunu kuyruğuna getirin.', 'The zero vector has its head on its tail. Bring the head of B onto its tail.')
        : tx(`B, A’ya paralel olmalı ve |B| = ${kLabel(Math.abs(k))}|A| olmalı. Skaler ${k > 0 ? 'pozitif: yön aynı kalır' : 'negatif: yön ters döner'}.`, `B must be parallel to A with |B| = ${kLabel(Math.abs(k))}|A|. The scalar is ${k > 0 ? 'positive: the sense stays the same' : 'negative: the sense reverses'}.`),
      k === 0 ? tx('B’yi sıfır vektörü yapmak için ucunu kuyruğunun üstüne sürükleyin.', 'Drag the head of B onto its tail.') : tx(`B’nin kuyruğundan ucuna ${moveWords(tgt)} gitmelisiniz.`, `From the tail of B to its head you should go ${moveWords(tgt)}.`)
    ];
  };
  lab.side.append(
    h('div', { class: 'task' }, h('div', null, tx('Görev', 'Task')), h('div', { class: 'big' }, tx('Oluştur: ', 'Construct: ') + eqText(k))),
    h('label', { class: 'mut' }, tx('İlişki seçin', 'Choose a relationship'), relSel),
    h('div', { class: 'mut' }, tx('B vektörünü sürükleyin (taşıma) ve ucundaki halkadan tutarak uzatın/döndürün.', 'Drag B to move it, and pull the ring at its head to stretch or rotate it.')),
    h('div', { class: 'row' },
      h('button', { class: 'btn pri', type: 'button', onclick: () => {
        const r = checkScalar(A(), s.model.vectors[1].comp, k);
        showFb(fbEl, r.ok ? 'ok' : 'bad', r.lines.concat(r.ok ? [infoL(tx('Konumun önemi yok: vektörler yer değiştirince büyüklük ve yön değişmez.', 'Position does not matter: moving a vector never changes its magnitude or direction.'))] : [infoL(tx('Tekrar deneyebilirsiniz; ceza yok.', 'Try again — there is no penalty.'))]));
        if (r.ok) { mark(k === 1 ? 'equal' : k === -1 ? 'opposite' : k === 0 ? 'zeroVec' : k > 0 ? 'scalarPos' : 'scalarNeg'); mark('position'); }
      } }, '✔ ' + tx('Vektörümü Kontrol Et', 'Check My Vector')),
      hintBtn(s, hints, fbEl),
      h('button', { class: 'btn', type: 'button', onclick: () => { m1New(s, false); rerender(); } }, '🎲 ' + tx('Yeni A', 'New A'))),
    fbEl,
    h('h3', null, tx('Seçili vektör', 'Selected vector')), info);
  info.innerHTML = vecInfo(null);
}

function m1Compare(root, s) {
  const out = h('div', { class: 'info-box' }), info = h('div', { class: 'info-box' });
  const upd = () => {
    const vs = s.cmodel.vectors, X = vs[s.cmpA], Y = vs[s.cmpB];
    const r = relation(X.comp, Y.comp), lx = V.len(X.comp), ly = V.len(Y.comp), n = X.name, m = Y.name;
    let rel;
    if (r.kind === 'equal') rel = tx(`<b>${m} = ${n}</b> → eşit vektörler (aynı büyüklük, aynı doğrultu, aynı yön).`, `<b>${m} = ${n}</b> → equal vectors (same magnitude, line of action and sense).`);
    else if (r.kind === 'opposite') rel = tx(`<b>${m} = −${n}</b> → zıt vektörler (aynı büyüklük, aynı doğrultu, ters yön).`, `<b>${m} = −${n}</b> → opposite vectors (same magnitude, same line of action, opposite sense).`);
    else if (r.kind === 'zero') rel = tx(`<b>${m} = 0</b> → sıfır vektörü.`, `<b>${m} = 0</b> → the zero vector.`);
    else if (r.kind === 'scalar') rel = tx(`<b>${m} = ${fmt(r.k)}${n}</b> → skalerle çarpma: paralel; ${r.k > 0 ? 'yönleri aynı' : 'yönleri zıt'}, büyüklük ${fmt(Math.abs(r.k))} katı.`, `<b>${m} = ${fmt(r.k)}${n}</b> → scalar multiple: parallel, ${r.k > 0 ? 'same sense' : 'opposite sense'}, magnitude × ${fmt(Math.abs(r.k))}.`);
    else rel = tx(`${m}, ${n}’nin bir katı değil (doğrultuları farklı).`, `${m} is not a multiple of ${n} (different lines of action).`);
    const par = lx > 0.3 && ly > 0.3 && V.parallel(X.comp, Y.comp);
    out.innerHTML = `|${n}| = ${fmt(lx)} &nbsp; |${m}| = ${fmt(ly)} → ${tx('büyüklükler', 'magnitudes')} ${Math.abs(lx - ly) < 0.3 ? tx('<b>eşit</b>', '<b>equal</b>') : tx('<b>farklı</b>', '<b>different</b>')}<br>` +
      `${tx('Doğrultu', 'Line of action')}: ${par ? tx('<b>paralel</b>', '<b>parallel</b>') : tx('<b>farklı</b>', '<b>different</b>')}` +
      (par ? ` &nbsp; ${tx('Yön', 'Sense')}: ${V.dot(X.comp, Y.comp) > 0 ? tx('<b>aynı</b>', '<b>same</b>') : tx('<b>zıt</b>', '<b>opposite</b>')}` : '') + `<br>${rel}`;
  };
  const lab = makeLab(root, {
    model: s.cmodel, hist: s.chist,
    onReset: () => { m1Cmp(s); rerender(); },
    refresh: () => { upd(); info.innerHTML = vecInfo(lab.ws.vs.find(v => v.id === lab.ws.sel)); },
    ws: { editHead: () => true, onCommit: () => { s.chist.push(); upd(); }, onMove: () => { upd(); }, onSelect: v => { info.innerHTML = vecInfo(v); } }
  });
  const opts = sel => s.cmodel.vectors.map((v, i) => h('option', { value: i, selected: i === sel }, v.name));
  lab.side.append(
    h('div', { class: 'task' }, h('div', { class: 'big' }, tx('Hangi vektörler eşit, zıt veya birbirinin katı?', 'Which vectors are equal, opposite or multiples of each other?'))),
    h('div', { class: 'grid2' },
      h('label', { class: 'mut' }, tx('1. vektör', 'Vector 1'), h('select', { onchange: e => { s.cmpA = +e.target.value; upd(); } }, opts(s.cmpA))),
      h('label', { class: 'mut' }, tx('2. vektör', 'Vector 2'), h('select', { onchange: e => { s.cmpB = +e.target.value; upd(); } }, opts(s.cmpB)))),
    out,
    h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: () => { m1Cmp(s); rerender(); } }, '🎲 ' + tx('Yeni Vektörler', 'New Vectors'))),
    h('div', { class: 'mut' }, tx('İpucu: Vektörleri sürükleyin; konum değişince büyüklük ve yön değişmez. Uçlarından tutarak uzunluk/yön değiştirin.', 'Tip: drag vectors around — position never changes magnitude or sense. Pull a head to change length or direction.')),
    h('h3', null, tx('Seçili vektör', 'Selected vector')), info);
  upd(); info.innerHTML = vecInfo(null);
}

/* =====================================================================
   MODULE 2 — Create Your Own Vector
   ===================================================================== */
function m2Init() {
  const s = store.m2 || (store.m2 = { model: { vectors: [] }, ci: 0, msg: '' });
  if (!s.hist) s.hist = new Hist(() => s.model.vectors, v => { s.model.vectors = v; });
  return s;
}
function modWrap2(root) {
  const s = m2Init(), W = 26, H = 16;
  root.append(mhead(tx('Kendi Vektörünü Oluştur', 'Create Your Own Vector'),
    tx('Boş alanda sürükleyerek vektör çizin: başlangıç noktasına basın, sürükleyin, bırakın.', 'Drag on empty space to draw a vector: press at the tail, drag, release at the head.')));
  const info = h('div', { class: 'info-box' }), msg = h('div', { class: 'fb' }), tools = h('div');
  const sel = () => lab.ws.vs.find(v => v.id === lab.ws.sel);
  const commit = () => { s.hist.push(); lab.ws.render(); lab.refresh(); };
  const say = t => showFb(msg, 'info', [infoL(t)]);
  const fit = v => {
    v.tail.x = clamp(v.tail.x, Math.max(0, -v.comp.x), Math.min(W, W - v.comp.x));
    v.tail.y = clamp(v.tail.y, Math.max(0, -v.comp.y), Math.min(H, H - v.comp.y));
  };
  const addVec = (tail, comp) => {
    const v = mk(nextName(s.model.vectors), tail, comp, COL[s.ci++ % COL.length]);
    s.model.vectors.push(v); fit(v); lab.ws.sel = v.id; commit(); return v;
  };
  const need = fn => () => { const v = sel(); if (!v) { say(tx('Önce bir vektör seçin.', 'Select a vector first.')); return; } fn(v); };
  const mul = k => need(v => {
    const c = V.scale(v.comp, k);
    if (Math.abs(c.x) > W || Math.abs(c.y) > H) { say(tx('Sonuç çalışma alanına sığmıyor.', 'The result does not fit in the workspace.')); return; }
    v.comp = c; fit(v); commit();
    say(tx(`${v.name} vektörü ${kLabel(k)} ile çarpıldı. ${k < 0 ? 'Negatif skaler yönü ters çevirir.' : 'Pozitif skaler yönü korur.'}`, `${v.name} was multiplied by ${kLabel(k)}. ${k < 0 ? 'A negative scalar reverses the sense.' : 'A positive scalar keeps the sense.'}`));
    mark(k > 0 ? 'scalarPos' : 'scalarNeg');
  });
  const lab = makeLab(root, {
    model: s.model, hist: s.hist,
    onReset: () => { s.model.vectors = []; s.ci = 0; lab.ws.sel = null; commit(); say(tx('Çalışma alanı temizlendi.', 'Workspace cleared.')); },
    refresh: () => { info.innerHTML = vecInfo(sel()); renderTools(); },
    ws: {
      draw: 'free', editHead: () => true,
      onDraw: d => { addVec(d.tail, d.comp); },
      onCommit: () => { s.hist.push(); lab.refresh(); }, onSelect: () => { setTimeout(() => { info.innerHTML = vecInfo(sel()); renderTools(); }); }, onMove: v => { info.innerHTML = vecInfo(v); }
    }
  });
  lab.refresh = () => { info.innerHTML = vecInfo(sel()); renderTools(); };
  function renderTools() {
    const v = sel(); tools.innerHTML = '';
    if (!v) return;
    tools.append(h('div', { class: 'grid2' },
      h('label', { class: 'mut' }, tx('Ad', 'Name'), h('input', { type: 'text', maxlength: 3, value: v.name, onchange: e => { v.name = e.target.value.trim() || v.name; commit(); } })),
      h('div', null, h('div', { class: 'mut' }, tx('Renk', 'Colour')), swatches(v.color, c => { v.color = c; commit(); }))));
  }
  const b = (label, fn, cls = '') => h('button', { class: 'btn ' + cls, type: 'button', onclick: fn }, label);
  lab.side.append(
    h('div', { class: 'task' }, tx('Boş alanda sürükleyerek yeni vektör çizin. Bir vektörü seçip taşıyın; ucundaki halkadan tutarak uzatın/döndürün.', 'Drag on empty space to draw. Select a vector to move it; pull the ring at its head to stretch or rotate.')),
    h('div', { class: 'grid2' },
      b('＋ ' + tx('Vektör Ekle', 'Add Vector'), () => addVec({ x: rnd(3, 12), y: rnd(3, 9) }, { x: rnd(2, 5), y: rnd(-3, 4) || 2 }), 'pri'),
      b('⧉ ' + tx('Çoğalt', 'Duplicate'), need(v => { const c = addVec({ x: v.tail.x + 1, y: v.tail.y - 1 }, v.comp); mark('position'); })),
      b('⇄ ' + tx('Ters Çevir', 'Reverse'), mul(-1)),
      b('✕ ' + tx('Sil', 'Delete'), need(v => { s.model.vectors = s.model.vectors.filter(x => x !== v); lab.ws.sel = null; commit(); }), 'danger'),
      b('× 2', mul(2)), b('× 3', mul(3)), b('× −2', mul(-2)), b('× ½', mul(0.5)), b('× −½', mul(-0.5)),
      b('⟲ ' + tx('Sıfırla', 'Reset'), () => { s.model.vectors = []; lab.ws.sel = null; commit(); })),
    tools, msg, h('h3', null, tx('Seçili vektör', 'Selected vector')), info,
    h('div', { class: 'mut' }, tx('Gösterim seçenekleri (Büyüklükleri Göster, Gelişmiş Gösterim) üstteki araç çubuğundadır.', 'Use the toolbar above to switch magnitudes and advanced display on or off.')));
  lab.refresh();
}

/* =====================================================================
   MODULE 3 — Vector Addition Laboratory (head-to-tail)
   ===================================================================== */
const PRESETS = [
  ['same', 'Aynı yönlü', 'Same direction'], ['opp', 'Zıt yönlü', 'Opposite directions'], ['perp', 'Dik', 'Perpendicular'],
  ['arb', 'Rastgele yönlü', 'Arbitrary'], ['zero', 'Bileşkesi sıfır', 'Zero resultant']
];
function genComps(preset, n) {
  const nz = (a, b) => { let v; do { v = rnd(a, b); } while (v === 0); return v; };
  for (let t = 0; t < 400; t++) {
    let cs = [];
    if (preset === 'same') { const d = pick([[1, 0], [0, 1], [1, 1], [1, -1], [2, 1]]), sg = Math.random() < .5 ? 1 : -1; for (let i = 0; i < n; i++) { const m = rnd(1, 3) * sg; cs.push({ x: d[0] * m, y: d[1] * m }); } }
    else if (preset === 'opp') { const d = pick([[1, 0], [0, 1], [1, 1], [2, 1], [1, -1]]); for (let i = 0; i < n; i++) { const m = nz(-3, 3); cs.push({ x: d[0] * m, y: d[1] * m }); } if (!(cs.some(c => c.x + c.y > 0) && cs.some(c => c.x + c.y < 0))) continue; }
    else if (preset === 'perp') { for (let i = 0; i < n; i++) cs.push(i % 2 === 0 ? { x: nz(-5, 5), y: 0 } : { x: 0, y: nz(-5, 5) }); }
    else if (preset === 'arb') { const m = n >= 4 ? 3 : 5; for (let i = 0; i < n; i++) cs.push({ x: rnd(-m, m), y: rnd(-m, m) }); }
    else { const m = n >= 4 ? 3 : 4; for (let i = 0; i < n - 1; i++) cs.push({ x: rnd(-m, m), y: rnd(-m, m) }); const s = V.sum(cs.map(c => ({ comp: c }))); cs.push({ x: -s.x, y: -s.y }); }
    if (cs.some(c => V.len(c) < 1 || V.len(c) > 7.5)) continue;
    const sm = V.sum(cs.map(c => ({ comp: c }))), L = V.len(sm);
    if (preset === 'zero' ? L > 1e-9 : L < 1.5) continue;
    if (preset === 'arb' && cs.some((c, i) => cs.some((d, j) => i < j && V.parallel(c, d)))) continue;
    return cs;
  }
  return preset === 'zero' ? [{ x: 3, y: 1 }, { x: -1, y: 3 }, { x: -2, y: -4 }].slice(0, Math.max(3, n)) : [{ x: 3, y: 1 }, { x: 1, y: 3 }, { x: 2, y: -2 }].slice(0, n);
}
function placeVectors(comps, namesFrom = 0) {
  const slots = shuffle([[1, 1], [9, 1], [18, 1], [1, 6], [9, 6], [18, 6], [1, 11], [9, 11], [18, 11]]);
  return comps.map((c, i) => mk(String.fromCharCode(65 + namesFrom + i), { x: slots[i][0] + Math.max(0, -c.x) + 1, y: slots[i][1] + Math.max(0, -c.y) + 1 }, c, COL[i % COL.length], { role: 'main' }));
}

function m3Init() {
  const s = store.m3 || (store.m3 = { n: 3, preset: 'arb', diff: 1 });
  if (!s.model) m3New(s, s.preset, s.n);
  return s;
}
function m3New(s, preset, n) {
  s.preset = preset; s.n = n;
  s.model = { vectors: placeVectors(genComps(preset, n)) };
  s.init = clone(s.model.vectors);
  s.hist = new Hist(() => s.model.vectors, v => { s.model.vectors = v; });
  s.zero = false; s.attempts = 0; s.hint = 0; s.shown = false; s.solved = false;
}
function additionOverlay(ws, items, color) {
  const o = items.slice(), start = o[0].tail;
  let s = '', p = { ...start };
  o.forEach(v => { s += ws.arrow(p, v.comp, v.color, { w: 4, dash: '8 6', op: .75 }); p = { x: p.x + v.comp.x, y: p.y + v.comp.y }; });
  const e = V.sum(o);
  if (V.len(e) < 0.3) s += ws.dot(start, color, 9) + ws.text({ x: start.x, y: start.y + 0.9 }, 'R = 0', color, { size: 18 });
  else s += ws.arrow(start, e, color, { w: 7, op: .9 }) + ws.text({ x: start.x + e.x / 2 - 0.6, y: start.y + e.y / 2 + 0.6 }, 'R', color, { size: 20 });
  return s;
}

function modWrap3(root) {
  const s = m3Init();
  root.append(mhead(tx('Vektörleri Toplayalım', 'Vector Addition Laboratory'),
    tx('Vektörleri sürükleyip uç uca ekleyin, sonra bileşke vektör R’yi kendiniz çizin.', 'Drag the vectors head-to-tail, then draw the resultant vector R yourself.')));
  const fbEl = h('div', { class: 'fb' }), info = h('div', { class: 'info-box' });
  const items = () => s.model.vectors.filter(v => v.role === 'main');
  const Rv = () => s.model.vectors.find(v => v.role === 'R');
  const lab = makeLab(root, {
    model: s.model, hist: s.hist, ht: true,
    onReset: () => { s.model.vectors = clone(s.init); s.hist.reset(); s.zero = false; s.shown = false; s.attempts = 0; fbEl.className = 'fb'; lab.ws.sel = null; rerender(); },
    refresh: () => { info.innerHTML = vecInfo(lab.ws.vs.find(v => v.id === lab.ws.sel)); },
    ws: {
      draw: 'R', editHead: v => v.role === 'R',
      onDraw: d => { s.model.vectors = s.model.vectors.filter(v => v.role !== 'R'); const r = mk('R', d.tail, d.comp, RCOL, { role: 'R' }); s.model.vectors.push(r); lab.ws.sel = r.id; s.hist.push(); lab.ws.render(); },
      onCommit: () => { s.hist.push(); info.innerHTML = vecInfo(lab.ws.vs.find(v => v.id === lab.ws.sel)); },
      onSelect: v => { info.innerHTML = vecInfo(v); },
      overlay: ws => s.shown ? additionOverlay(ws, items(), '#00897b') : ''
    }
  });
  const hints = () => [
    tx('Bir vektörü seçip sürükleyin. Taşırken büyüklüğü ve yönü değişmez; yalnızca konumu değişir.', 'Select and drag a vector. Moving it changes only its position, never its magnitude or direction.'),
    tx(`Bir vektörün kuyruğunu (içi boş nokta) başka bir vektörün ucuna (ok başı) getirin. “Uç Uca Yapış” seçeneği yardımcı olur. Sıra: ${items().map(v => v.name).join(' → ')} gibi olabilir.`, `Bring the tail (hollow dot) of one vector onto the head (arrowhead) of another. “Snap Head-to-Tail” helps. For example the order ${items().map(v => v.name).join(' → ')}.`),
    tx('Bileşke R, ilk vektörün kuyruğundan son vektörün ucuna çizilir. Boş bir alana basıp sürükleyerek R’yi çizin.', 'R runs from the tail of the first vector to the head of the last. Press on an empty spot and drag to draw R.')
  ];
  const doCheck = () => {
    const r = checkSum(items(), Rv(), s.zero);
    s.attempts++; s.solved = s.solved || r.pass;
    showFb(fbEl, r.pass ? 'ok' : 'bad', r.lines.concat(r.pass ? [infoL(tx('Bileşke, vektörlerin bileşenleri toplanarak da bulunur (“Sonucu Göster”).', 'The resultant can also be found by adding components (“Show Result”).'))] : [infoL(tx('Düzeltip yeniden deneyebilirsiniz.', 'Fix it and try again — no penalty.'))]));
    if (r.pass) { mark('headToTail'); mark('resultant'); if (s.preset === 'zero') mark('zeroResultant'); mark('position'); }
    lab.ws.render(); showBtn.disabled = false;
  };
  const showBtn = h('button', { class: 'btn', type: 'button', disabled: s.attempts === 0, onclick: () => {
    s.shown = true; lab.ws.render();
    showFb(fbEl, 'info', [`<b>${tx('Bileşke (bileşenlerle hesap)', 'Resultant (component calculation)')}</b>`].concat(sumWorking(items()), [infoL(tx('Kesikli çizgiler uç uca ekleme yöntemini, kalın ok bileşkeyi gösterir.', 'Dashed arrows show the head-to-tail chain; the thick arrow is the resultant.'))]));
  } }, '👁 ' + tx('Sonucu Göster', 'Show Result'));
  const pSel = h('select', { onchange: e => { m3New(s, e.target.value, s.n); rerender(); } }, PRESETS.map(p => h('option', { value: p[0], selected: p[0] === s.preset }, tx(p[1], p[2]))));
  const nSel = h('select', { onchange: e => { m3New(s, s.preset, +e.target.value); rerender(); } }, [2, 3, 4, 5].map(n => h('option', { value: n, selected: n === s.n }, n + ' ' + tx('vektör', 'vectors'))));
  const dSel = h('select', { onchange: e => { s.diff = +e.target.value; } }, [[1, 'Kolay', 'Easy'], [2, 'Orta', 'Medium'], [3, 'Zor', 'Hard']].map(d => h('option', { value: d[0], selected: d[0] === s.diff }, tx(d[1], d[2]))));
  const zero = h('input', { type: 'checkbox', onchange: e => { s.zero = e.target.checked; } });
  zero.checked = s.zero;
  lab.side.append(
    h('div', { class: 'task' }, h('div', { class: 'big' }, items().map(v => v.name).join(' + ') + ' = R'),
      h('div', { class: 'mut' }, tx('1) Vektörleri uç uca getirin  2) R’yi kendiniz çizin  3) Sonucu kontrol edin', '1) Join the vectors head-to-tail  2) Draw R yourself  3) Check the result'))),
    h('div', { class: 'grid2' },
      h('label', { class: 'mut' }, tx('Örnek türü', 'Example type'), pSel), h('label', { class: 'mut' }, tx('Vektör sayısı', 'Number of vectors'), nSel)),
    h('div', { class: 'row' },
      h('label', { class: 'mut', style: 'flex:1' }, tx('Zorluk', 'Difficulty'), dSel),
      h('button', { class: 'btn', type: 'button', onclick: () => {
        const d = s.diff, c = d === 1 ? [pick(['same', 'opp']), 2] : d === 2 ? [pick(['perp', 'arb', 'zero']), 3] : [pick(['arb', 'zero', 'arb']), rnd(4, 5)];
        m3New(s, c[0], c[1]); rerender();
      } }, '🎲 ' + tx('Rastgele Etkinlik', 'Random Challenge'))),
    h('label', { class: 'chk' }, zero, tx('Bileşke sıfır vektörüdür (R = 0)', 'The resultant is the zero vector (R = 0)')),
    h('div', { class: 'row' }, h('button', { class: 'btn pri', type: 'button', onclick: doCheck }, '✔ ' + tx('Sonucu Kontrol Et', 'Check Result')), showBtn, hintBtn(s, hints, fbEl)),
    fbEl, h('h3', null, tx('Seçili vektör', 'Selected vector')), info,
    store.opts.adv ? h('div', { class: 'info-box', html: `<table class="tbl"><tr><th></th><th>x</th><th>y</th></tr>${items().map(v => `<tr><td style="color:${v.color};font-weight:700">${esc(v.name)}</td><td>${fmt(v.comp.x, 1)}</td><td>${fmt(v.comp.y, 1)}</td></tr>`).join('')}</table>` }) : null);
  info.innerHTML = vecInfo(null);
}

/* =====================================================================
   MODULE 4 — Parallelogram method
   ===================================================================== */
function m4Init() {
  const s = store.m4 || (store.m4 = {});
  if (!s.model) m4New(s);
  return s;
}
function m4New(s) {
  const A = pick([{ x: 5, y: 1 }, { x: 4, y: 0 }, { x: 5, y: 2 }, { x: 6, y: 0 }]), B = pick([{ x: 1, y: 4 }, { x: 2, y: 3 }, { x: -1, y: 4 }, { x: 0, y: 5 }]);
  s.model = { vectors: [mk('A', { x: 4, y: 3 }, A, COL[0], { role: 'main' }), mk('B', { x: 14, y: 9 }, B, COL[1], { role: 'main' })] };
  s.init = clone(s.model.vectors);
  s.hist = new Hist(() => s.model.vectors, v => { s.model.vectors = v; });
  s.attempts = 0; s.hint = 0; s.shown = false; s.cmp = false;
}
function modWrap4(root) {
  const s = m4Init();
  root.append(mhead(tx('Paralelkenar Yöntemi', 'Parallelogram Method'),
    tx('İki vektörün kuyruğunu birleştirin, paralelkenarı tamamlayın ve köşegen olan bileşkeyi çizin.', 'Join the tails of two vectors, complete the parallelogram, and draw the diagonal as the resultant.')));
  const fbEl = h('div', { class: 'fb' });
  const f = (r, n) => s.model.vectors.find(v => v.role === r && (n == null || v.of === n));
  const mainV = n => s.model.vectors.find(v => v.role === 'main' && v.name === n);
  const lab = makeLab(root, {
    model: s.model, hist: s.hist,
    onReset: () => { s.model.vectors = clone(s.init); s.hist.reset(); s.attempts = 0; s.shown = false; s.cmp = false; fbEl.className = 'fb'; rerender(); },
    refresh: () => { },
    ws: {
      draw: 'R', snapTail: true, editHead: v => v.role === 'R',
      onDraw: d => { s.model.vectors = s.model.vectors.filter(v => v.role !== 'R'); const r = mk('R', d.tail, d.comp, RCOL, { role: 'R' }); s.model.vectors.push(r); lab.ws.sel = r.id; s.hist.push(); lab.ws.render(); },
      onCommit: () => { s.hist.push(); },
      overlay: ws => {
        const A = mainV('A'), B = mainV('B'); let o = '';
        if (!A || !B) return o;
        const tailsOk = V.dist(A.tail, B.tail) <= 0.35, O = A.tail;
        if (tailsOk && store.opts.guides && !s.shown) {                       // optional construction guides
          const ha = head(A), hb = head(B);
          o += ws.line(V.sub(ha, V.scale(B.comp, 1.5)), V.add(ha, V.scale(B.comp, 1.5)), '#7fb7c6', { dash: '4 7', w: 1.5 });
          o += ws.line(V.sub(hb, V.scale(A.comp, 1.5)), V.add(hb, V.scale(A.comp, 1.5)), '#7fb7c6', { dash: '4 7', w: 1.5 });
        }
        if (s.shown && tailsOk) {
          const ha = head(A), hb = head(B), E = V.add(ha, B.comp);
          o += `<polygon points="${[O, ha, E, hb].map(p => ws.sx(p.x) + ',' + ws.sy(p.y)).join(' ')}" fill="#12b5b0" fill-opacity=".10" stroke="#12b5b0" stroke-width="2" stroke-dasharray="6 5"/>`;
          o += ws.arrow(O, V.add(A.comp, B.comp), '#00897b', { w: 7, op: .85 }) + ws.text({ x: O.x + (A.comp.x + B.comp.x) / 2 - .7, y: O.y + (A.comp.y + B.comp.y) / 2 + .6 }, 'R', '#00897b', { size: 20 });
          if (s.cmp) {                                                          // head-to-tail comparison path
            o += ws.arrow(O, A.comp, '#f4a100', { w: 3, op: .9 }) + ws.arrow(ha, B.comp, '#f4a100', { w: 3, op: .9 });
          }
        }
        return o;
      }
    }
  });
  const hints = () => [
    tx('Önce A ve B’nin kuyruklarını (içi boş noktalar) aynı noktada birleştirin. “Kuyruğa Yapış” otomatik yardım eder.', 'First bring the tails (hollow dots) of A and B together. Tail snapping helps you.'),
    tx('Paralelkenarın karşılıklı kenarları paralel ve eşittir: A′ vektörünü B’nin ucuna, B′ vektörünü A’nın ucuna taşıyın.', 'Opposite sides of a parallelogram are parallel and equal: move A′ to the head of B, and B′ to the head of A.'),
    tx('Bileşke, ortak kuyruktan karşı köşeye çizilen köşegendir. Boş alanda sürükleyerek çizin.', 'The resultant is the diagonal from the common tail to the opposite corner. Drag on empty space to draw it.')
  ];
  const addCopy = n => {
    const o = mainV(n); if (f('copy', n)) return;
    const p = n === 'A' ? { x: 12, y: 2 } : { x: 3, y: 9 };
    const c = mk(n + '′', { x: clamp(p.x, Math.max(0, -o.comp.x), 26 - Math.max(0, o.comp.x)), y: clamp(p.y, Math.max(0, -o.comp.y), 16 - Math.max(0, o.comp.y)) }, o.comp, o.color, { role: 'copy', of: n, dashed: true });
    s.model.vectors.push(c); s.hist.push(); rerender();
  };
  const doCheck = () => {
    const A = mainV('A'), B = mainV('B'), cA = f('copy', 'A'), cB = f('copy', 'B'), R = f('R'), L = [];
    s.attempts++;
    const t = V.dist(A.tail, B.tail) <= 0.35;
    L.push(t ? okL(tx('A ve B ortak bir başlangıç noktasından çıkıyor.', 'A and B start from a common point.')) : badL(tx('A ve B’nin kuyrukları aynı noktada değil. Önce bir vektörün kuyruğunu diğerininkine getirin.', 'The tails of A and B are not at the same point. Bring one tail onto the other first.')));
    const sideA = cA && V.dist(cA.tail, head(B)) <= 0.5, sideB = cB && V.dist(cB.tail, head(A)) <= 0.5;
    L.push(!cA ? badL(tx('A′ kenarı henüz eklenmedi (“A′ Kenarını Ekle”).', 'Side A′ has not been added yet (“Add side A′”).')) : sideA ? okL(tx('A′ kenarı doğru: B’nin ucundan başlıyor.', 'Side A′ is correct: it starts at the head of B.')) : badL(tx('A′ kenarının kuyruğu B’nin ucuna değmiyor.', 'The tail of A′ does not touch the head of B.')));
    L.push(!cB ? badL(tx('B′ kenarı henüz eklenmedi (“B′ Kenarını Ekle”).', 'Side B′ has not been added yet (“Add side B′”).')) : sideB ? okL(tx('B′ kenarı doğru: A’nın ucundan başlıyor.', 'Side B′ is correct: it starts at the head of A.')) : badL(tx('B′ kenarının kuyruğu A’nın ucuna değmiyor.', 'The tail of B′ does not touch the head of A.')));
    const exp = V.add(A.comp, B.comp);
    let rOk = false;
    if (!R) L.push(badL(tx('Köşegen (bileşke) henüz çizilmedi. Ortak kuyruktan karşı köşeye sürükleyin.', 'The diagonal (resultant) is not drawn yet. Drag from the common tail to the opposite corner.')));
    else if (V.dist(R.comp, exp) <= 0.35 && V.dist(R.tail, A.tail) <= 0.5) { rOk = true; L.push(okL(tx('Köşegen doğru: R, ortak kuyruktan karşı köşeye gidiyor.', 'The diagonal is correct: R goes from the common tail to the opposite corner.'))); }
    else if (V.dist(R.comp, exp) <= 0.35) L.push(badL(tx('R’nin büyüklüğü ve yönü doğru ama ortak kuyruktan başlamıyor; paralelkenarın köşegeni olmalı.', 'R has the correct magnitude and direction but does not start at the common tail; it must be the parallelogram diagonal.')));
    else L.push(badL(tx('R, paralelkenarın köşegeni değil. A ve B’nin ortak kuyruğundan karşı köşeye çizin.', 'R is not the parallelogram diagonal. Draw it from the common tail to the opposite corner.')));
    const pass = t && sideA && sideB && rOk;
    showFb(fbEl, pass ? 'ok' : 'bad', L.concat(pass ? [infoL(tx('Şimdi “Sonucu Göster” ile uç uca ekleme yöntemiyle karşılaştırın.', 'Now use “Show Result” to compare with the head-to-tail method.'))] : [infoL(tx('Düzeltip yeniden deneyin.', 'Fix it and try again.'))]));
    if (pass) { mark('parallelogram'); mark('resultant'); mark('headToTail'); }
    showB.disabled = false;
  };
  const showB = h('button', { class: 'btn', type: 'button', disabled: s.attempts === 0, onclick: () => {
    const A = mainV('A'), B = mainV('B'), ha = head(A), hb = head(B);
    if (V.dist(A.tail, B.tail) > 0.35) { showFb(fbEl, 'info', [infoL(tx('Önce A ve B’nin kuyruklarını birleştirin.', 'First join the tails of A and B.'))]); return; }
    s.shown = true; s.cmp = true; lab.ws.render();
    const e1 = V.add(ha, B.comp), e2 = V.add(hb, A.comp);
    showFb(fbEl, 'info', [`<b>${tx('İki yöntemin karşılaştırması', 'Comparing the two methods')}</b>`,
      tx(`Uç uca: A’nın ucundan B çizilirse son nokta (${fmt(e1.x, 1)}, ${fmt(e1.y, 1)}).`, `Head-to-tail: drawing B from the head of A ends at (${fmt(e1.x, 1)}, ${fmt(e1.y, 1)}).`),
      tx(`Paralelkenar: köşegenin ucu (${fmt(e2.x, 1)}, ${fmt(e2.y, 1)}).`, `Parallelogram: the diagonal ends at (${fmt(e2.x, 1)}, ${fmt(e2.y, 1)}).`),
      okL(tx('İki yöntem aynı noktaya ulaşır: aynı bileşke vektörü bulunur. (Turuncu yol uç uca yöntemidir.)', 'Both methods reach the same point: the resultant is identical. (The orange path is the head-to-tail method.)'))].concat(sumWorking([A, B])));
  } }, '👁 ' + tx('Sonucu Göster', 'Show Result'));
  const guides = h('button', { class: 'btn tog' + (store.opts.guides ? ' on' : ''), type: 'button', onclick: e => { store.opts.guides = !store.opts.guides; e.target.classList.toggle('on', store.opts.guides); lab.ws.render(); } }, tx('Yardımcı Çizgiler', 'Construction Guides'));
  lab.side.append(
    h('div', { class: 'task' }, h('div', { class: 'big' }, tx('A + B = R  (paralelkenar)', 'A + B = R  (parallelogram)')),
      h('div', { class: 'mut' }, tx('1) A ve B’nin kuyruklarını birleştirin 2) Eksik kenarları ekleyip yerleştirin 3) Köşegen R’yi çizin', '1) Join the tails of A and B 2) Add and place the missing sides 3) Draw the diagonal R'))),
    h('div', { class: 'grid2' },
      h('button', { class: 'btn', type: 'button', disabled: !!f('copy', 'A'), onclick: () => addCopy('A') }, '＋ ' + tx('A′ Kenarını Ekle', 'Add side A′')),
      h('button', { class: 'btn', type: 'button', disabled: !!f('copy', 'B'), onclick: () => addCopy('B') }, '＋ ' + tx('B′ Kenarını Ekle', 'Add side B′'))),
    h('div', { class: 'row' }, guides),
    h('div', { class: 'row' }, h('button', { class: 'btn pri', type: 'button', onclick: doCheck }, '✔ ' + tx('Kontrol Et', 'Check')), showB, hintBtn(s, hints, fbEl),
      h('button', { class: 'btn', type: 'button', onclick: () => { m4New(s); rerender(); } }, '🎲 ' + tx('Yeni Vektörler', 'New Vectors'))),
    fbEl);
}
