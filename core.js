'use strict';
/* =====================================================================
   MARMARA KOLEJİ | FEN LİSESİ — Vector Laboratory
   core.js : state, vector mathematics, DOM helpers, SVG workspace engine
   Vector DATA (tail, comp in grid units, y up) is kept separate from
   screen coordinates; only Workspace converts between the two.
   ===================================================================== */
const NS = 'http://www.w3.org/2000/svg';

const store = {
  lang: 'tr', mod: 1,
  opts: { grid: true, snapGrid: true, snapHT: false, mag: false, adv: false, guides: true },
  concepts: {}, score: 0
};
try { const l = localStorage.getItem('vl_lang'); if (l === 'en' || l === 'tr') store.lang = l; } catch (e) { /* storage may be blocked */ }

/* bilingual text: always call inside render functions so the language switch is instant */
const tx = (tr, en) => (store.lang === 'tr' ? tr : en);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
let _id = 0; const uid = () => 'v' + (++_id);
const clone = o => JSON.parse(JSON.stringify(o));

const fmt = (n, d = 2) => {
  let s = String(Math.round(n * 10 ** d) / 10 ** d);
  if (s === '-0') s = '0';
  return store.lang === 'tr' ? s.replace('.', ',') : s;
};
const kLabel = k => ({ '1': '1', '-1': '−1', '2': '2', '3': '3', '-3': '−3', '0.5': '½', '-0.5': '−½', '-2': '−2', '0': '0' })[String(k)] || fmt(k);

const COL = ['#e63946', '#1d7fd6', '#2a9d8f', '#f4a100', '#8e44ad', '#e76f51', '#2d6a4f', '#c2185b'];
const RCOL = '#0b2a4a';

/* ---------------- vector mathematics (components only) ---------------- */
const V = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  scale: (a, k) => ({ x: a.x * k, y: a.y * k }),
  len: a => Math.hypot(a.x, a.y),
  dot: (a, b) => a.x * b.x + a.y * b.y,
  cross: (a, b) => a.x * b.y - a.y * b.x,
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  eq: (a, b, tol = 0.3) => Math.hypot(a.x - b.x, a.y - b.y) <= tol,
  sum: vs => vs.reduce((s, v) => V.add(s, v.comp), { x: 0, y: 0 }),
  deg: a => ((Math.atan2(a.y, a.x) * 180 / Math.PI) + 360) % 360,
  parallel: (a, b) => Math.abs(V.cross(a, b)) <= 0.06 * V.len(a) * V.len(b) + 1e-9
};
const head = v => ({ x: v.tail.x + v.comp.x, y: v.tail.y + v.comp.y });
const mk = (name, tail, comp, color, extra) => Object.assign({ id: uid(), name, color, tail: { ...tail }, comp: { ...comp } }, extra || {});
const nextName = vs => { const used = new Set(vs.map(v => v.name)); for (const c of 'ABCDEFGHIJKLMNOPQSTUVWXYZ') if (!used.has(c)) return c; return 'V' + vs.length; };

/* relation of Y with respect to X: zero | equal | opposite | scalar | none */
function relation(X, Y) {
  if (V.len(Y) <= 0.3) return { kind: 'zero', k: 0 };
  if (V.len(X) <= 0.3) return { kind: 'none' };
  if (V.eq(X, Y)) return { kind: 'equal', k: 1 };
  if (V.eq(X, V.scale(Y, -1))) return { kind: 'opposite', k: -1 };
  if (V.parallel(X, Y)) return { kind: 'scalar', k: V.dot(X, Y) / V.dot(X, X) };
  return { kind: 'none' };
}

function permutations(arr) {
  if (arr.length <= 1) return [arr.slice()];
  const out = [];
  arr.forEach((x, i) => permutations(arr.slice(0, i).concat(arr.slice(i + 1))).forEach(p => out.push([x, ...p])));
  return out;
}
/* best head-to-tail ordering of items (each tail must meet the previous head) */
function chainOrder(items, tol = 0.35) {
  let best = { links: -1, order: items };
  for (const p of permutations(items)) {
    let l = 0;
    for (let i = 0; i < p.length - 1; i++) if (V.dist(head(p[i]), p[i + 1].tail) <= tol) l++;
    if (l > best.links) best = { links: l, order: p };
  }
  return { order: best.order, links: best.links, ok: best.links === items.length - 1 };
}

/* ---------------- DOM helper ---------------- */
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs || {}) {
    const v = attrs[k];
    if (v === false || v == null) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(c)); }
  return e;
}
function showFb(el, kind, lines) {
  el.className = 'fb ' + kind;
  el.innerHTML = lines.map(l => `<div>${l}</div>`).join('');
}
const okL = s => `<span class="ok">✓</span> ${s}`;
const badL = s => `<span class="bad">✗</span> ${s}`;
const infoL = s => `<span class="inf">ℹ</span> ${s}`;

function toast(msg) {
  const t = h('div', { class: 'toast' }, msg);
  (document.getElementById('app') || document.body).append(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2600);
}

/* learning-summary concept tracking */
const CONCEPTS = [
  ['position', 'Bir vektörün konumu değişse de büyüklüğü ve yönü değişmez', 'Moving a vector does not change its magnitude or direction'],
  ['equal', 'Eşit vektörleri tanıma ve oluşturma', 'Recognising and building equal vectors'],
  ['opposite', 'Zıt vektörleri tanıma ve oluşturma', 'Recognising and building opposite vectors'],
  ['scalarPos', 'Pozitif skalerle çarpma (yön korunur)', 'Positive scalar multiplication (sense preserved)'],
  ['scalarNeg', 'Negatif skalerle çarpma (yön ters döner)', 'Negative scalar multiplication (sense reversed)'],
  ['zeroVec', 'Sıfır vektörü', 'The zero vector'],
  ['headToTail', 'Uç uca ekleme yöntemi', 'Head-to-tail method'],
  ['resultant', 'Bileşke vektörü oluşturma', 'Constructing a resultant vector'],
  ['parallelogram', 'Paralelkenar yöntemi', 'Parallelogram method'],
  ['commutative', 'A + B = B + A (toplama sırası önemsiz)', 'A + B = B + A (order does not matter)'],
  ['zeroResultant', 'Bileşkesi sıfır olan vektörler (kapalı çokgen)', 'Vectors with a zero resultant (closed polygon)'],
  ['teacher', 'Öğretmen etkinliğini çözme', 'Solving a teacher-made challenge']
];
function mark(k) {
  if (store.concepts[k]) return;
  store.concepts[k] = true;
  const c = CONCEPTS.find(x => x[0] === k);
  if (c) toast('⭐ ' + tx(c[1], c[2]));
}

/* ---------------- undo / redo ---------------- */
class Hist {
  constructor(get, set) { this.get = get; this.set = set; this.reset(); }
  reset() { this.u = [JSON.stringify(this.get())]; this.i = 0; }
  push() {
    const s = JSON.stringify(this.get());
    if (s === this.u[this.i]) return;
    this.u = this.u.slice(0, this.i + 1); this.u.push(s); this.i = this.u.length - 1;
  }
  undo() { if (this.i > 0) { this.i--; this.set(JSON.parse(this.u[this.i])); } }
  redo() { if (this.i < this.u.length - 1) { this.i++; this.set(JSON.parse(this.u[this.i])); } }
}

/* =====================================================================
   Workspace : SVG grid + draggable vector arrows
   Dragging a vector body changes ONLY its tail (comp is never touched), so
   magnitude and direction are preserved exactly. Dragging the head handle
   changes only comp. Drawing on empty space creates a new vector.
   ===================================================================== */
class Workspace {
  constructor(host, o) {
    this.o = Object.assign({
      W: 26, H: 16, S: 40, interactive: true, draw: 'none', minLen: 0.9,
      editHead: () => false, canMove: () => true, snapTail: false,
      onCommit: () => { }, onSelect: () => { }, onDraw: null, onMove: null, onClick: null,
      overlay: null, vecStyle: null
    }, o);
    this.sel = null; this.hl = new Set(); this.drag = null; this.draft = null;
    const { W, H, S } = this.o;
    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('viewBox', `0 0 ${W * S} ${H * S}`);
    this.svg.setAttribute('class', 'ws');
    host.innerHTML = ''; host.append(this.svg);
    this.svg.addEventListener('pointerdown', e => this.down(e));
    this.svg.addEventListener('pointermove', e => this.move(e));
    this.svg.addEventListener('pointerup', e => this.up(e));
    this.svg.addEventListener('pointercancel', e => this.up(e));
    this.render();
  }
  get vs() { return this.o.model.vectors; }
  sx(x) { return x * this.o.S; }
  sy(y) { return (this.o.H - y) * this.o.S; }
  pt(e) {
    const p = this.svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform(this.svg.getScreenCTM().inverse());
    return { x: q.x / this.o.S, y: this.o.H - q.y / this.o.S };
  }
  snap(p) {
    let { x, y } = p;
    if (store.opts.snapGrid) { x = Math.round(x); y = Math.round(y); }
    return { x: clamp(x, 0, this.o.W), y: clamp(y, 0, this.o.H) };
  }
  select(id) { this.sel = id; this.render(); }

  /* ---- pointer handling ---- */
  down(e) {
    if (e.button > 0) return;
    const p = this.pt(e);
    const el = e.target.closest ? e.target.closest('[data-id]') : null;
    try { this.svg.setPointerCapture(e.pointerId); } catch (x) { }
    if (el) {
      const v = this.vs.find(x => x.id === el.dataset.id);
      if (!v) return;
      this.sel = v.id; this.o.onSelect(v); if (this.o.onClick) this.o.onClick(v);
      let mode = null;
      if (this.o.interactive) {
        if (e.target.dataset && e.target.dataset.part === 'head' && this.o.editHead(v)) mode = 'head';
        else if (this.o.canMove(v)) mode = 'move';
      }
      this.drag = { mode, v, p0: p, tail0: { ...v.tail }, moved: false };
    } else {
      this.sel = null; this.o.onSelect(null);
      if (this.o.interactive && this.o.draw !== 'none') {
        const a = this.snap(p); this.drag = { mode: 'draw', a, b: a, moved: false }; this.draft = this.drag;
      }
    }
    this.render();
  }
  move(e) {
    const d = this.drag; if (!d || !d.mode) return;
    const p = this.pt(e);
    if (d.mode === 'move') this.moveVec(d, p);
    else if (d.mode === 'head') { const q = this.snap(p); d.v.comp = { x: q.x - d.v.tail.x, y: q.y - d.v.tail.y }; }
    else d.b = this.snap(p);
    d.moved = true; this.render();
    if (this.o.onMove) this.o.onMove(d.v);
  }
  up() {
    const d = this.drag; this.drag = null; this.draft = null;
    if (!d) return;
    if (d.mode === 'draw') {
      const comp = V.sub(d.b, d.a);
      if (V.len(comp) >= this.o.minLen && this.o.onDraw) this.o.onDraw({ tail: d.a, comp });
    } else if (d.moved) this.o.onCommit(d.v);
    this.render();
  }
  moveVec(d, p) {
    const v = d.v, c = v.comp, { W, H } = this.o;
    let tx_ = d.tail0.x + (p.x - d.p0.x), ty = d.tail0.y + (p.y - d.p0.y);
    if (store.opts.snapGrid) { tx_ = Math.round(tx_); ty = Math.round(ty); }
    if (store.opts.snapHT || this.o.snapTail) {         // magnetic snapping
      let best = null, bd = 0.8;
      for (const o2 of this.vs) {
        if (o2 === v || o2.ghost) continue;
        const h2 = head(o2);
        if (store.opts.snapHT) {
          let dd = Math.hypot(tx_ - h2.x, ty - h2.y);                     // my tail -> their head
          if (dd < bd) { bd = dd; best = { x: h2.x, y: h2.y }; }
          dd = Math.hypot(tx_ + c.x - o2.tail.x, ty + c.y - o2.tail.y);   // my head -> their tail
          if (dd < bd) { bd = dd; best = { x: o2.tail.x - c.x, y: o2.tail.y - c.y }; }
        }
        if (this.o.snapTail) {
          const dd = Math.hypot(tx_ - o2.tail.x, ty - o2.tail.y);         // tail -> tail
          if (dd < bd) { bd = dd; best = { x: o2.tail.x, y: o2.tail.y }; }
        }
      }
      if (best) { tx_ = best.x; ty = best.y; }
    }
    v.tail = {
      x: clamp(tx_, Math.max(0, -c.x), Math.min(W, W - c.x)),
      y: clamp(ty, Math.max(0, -c.y), Math.min(H, H - c.y))
    };
  }

  /* ---- SVG string helpers (also used by module overlays) ---- */
  arrow(tail, comp, col, o = {}) {
    const w = o.w || 5, x1 = this.sx(tail.x), y1 = this.sy(tail.y), x2 = this.sx(tail.x + comp.x), y2 = this.sy(tail.y + comp.y);
    const len = Math.hypot(x2 - x1, y2 - y1), dash = o.dash ? ` stroke-dasharray="${o.dash}"` : '', op = o.op == null ? 1 : o.op;
    if (len < 3) return `<circle cx="${x1}" cy="${y1}" r="7" fill="#fff" stroke="${col}" stroke-width="3" opacity="${op}"/>`;
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len, hl = Math.min(8 + w * 3, len * 0.55), hw = 4 + w * 1.1;
    const bx = x2 - ux * hl, by = y2 - uy * hl;
    return `<g opacity="${op}"><line x1="${x1}" y1="${y1}" x2="${bx}" y2="${by}" stroke="${col}" stroke-width="${w}"${dash}/>` +
      `<polygon points="${x2},${y2} ${bx - uy * hw},${by + ux * hw} ${bx + uy * hw},${by - ux * hw}" fill="${col}"/></g>`;
  }
  line(a, b, col, o = {}) {
    return `<line x1="${this.sx(a.x)}" y1="${this.sy(a.y)}" x2="${this.sx(b.x)}" y2="${this.sy(b.y)}" stroke="${col}" stroke-width="${o.w || 2}" ${o.dash ? `stroke-dasharray="${o.dash}"` : ''} opacity="${o.op == null ? 1 : o.op}"/>`;
  }
  dot(p, col, r = 6) { return `<circle cx="${this.sx(p.x)}" cy="${this.sy(p.y)}" r="${r}" fill="${col}"/>`; }
  text(p, s, col, o = {}) {
    return `<text x="${this.sx(p.x)}" y="${this.sy(p.y)}" fill="${col}" font-size="${o.size || 16}" font-weight="${o.weight || 700}" text-anchor="${o.anchor || 'middle'}" paint-order="stroke" stroke="#fff" stroke-width="4" stroke-linejoin="round">${esc(s)}</text>`;
  }
  label(v) {
    const o = store.opts, bits = [];
    if (o.mag) bits.push(`|${v.name}|=${fmt(V.len(v.comp))}`);
    if (o.adv) bits.push(`(${fmt(v.comp.x, 1)}, ${fmt(v.comp.y, 1)})`);
    return bits.join('  ');
  }

  vec(v) {
    const S = this.o.S, col = v.color || '#1d7fd6', hd = head(v);
    const x1 = this.sx(v.tail.x), y1 = this.sy(v.tail.y), x2 = this.sx(hd.x), y2 = this.sy(hd.y);
    const len = Math.hypot(x2 - x1, y2 - y1), sel = this.sel === v.id;
    const st = this.o.vecStyle ? this.o.vecStyle(v) : {};
    const op = v.ghost ? 0.45 : (st.op == null ? 1 : st.op);
    const editable = this.o.interactive && this.o.editHead(v);
    let g = `<g data-id="${v.id}">`;
    if (this.hl.has(v.id)) g += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffc400" stroke-opacity=".55" stroke-width="22" stroke-linecap="round"/>`;
    if (sel) g += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-opacity=".2" stroke-width="18" stroke-linecap="round"/>`;
    g += this.arrow(v.tail, v.comp, col, { w: 5, dash: v.dashed ? '9 7' : null, op });
    g += `<circle cx="${x1}" cy="${y1}" r="5.5" fill="#fff" stroke="${col}" stroke-width="3" opacity="${op}"/>`;   // tail = hollow dot
    if (sel && editable) g += `<circle cx="${x2}" cy="${y2}" r="13" fill="none" stroke="${col}" stroke-width="2" stroke-dasharray="3 3"/>`;
    // invisible hit areas (tail/body first, head handle on top)
    g += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#000" stroke-opacity="0" stroke-width="24" pointer-events="stroke"/>`;
    g += `<circle cx="${x1}" cy="${y1}" r="12" fill="#000" fill-opacity="0" pointer-events="all" data-part="body"/>`;
    g += `<circle cx="${x2}" cy="${y2}" r="15" fill="#000" fill-opacity="0" pointer-events="all" data-part="head"/>`;
    if (!v.noLabel) {
      let ux = 1, uy = 0; if (len > 3) { ux = (x2 - x1) / len; uy = (y2 - y1) / len; }
      let nx = uy, ny = -ux; if (ny > 0.001 || (Math.abs(ny) <= 0.001 && nx < 0)) { nx = -nx; ny = -ny; }
      const off = len > 3 ? 20 : 20, lx = (x1 + x2) / 2 + nx * off, ly = (y1 + y2) / 2 + ny * off;
      g += `<text x="${lx}" y="${ly + 5}" fill="${col}" font-size="19" font-weight="800" text-anchor="middle" paint-order="stroke" stroke="#fff" stroke-width="5" stroke-linejoin="round" opacity="${op}">${esc(v.name)}${len < 3 ? ' = 0' : ''}</text>`;
      const d = this.label(v);
      if (d) g += `<text x="${lx}" y="${ly + 23}" fill="#35505f" font-size="13" font-weight="600" text-anchor="middle" paint-order="stroke" stroke="#fff" stroke-width="4" stroke-linejoin="round">${esc(d)}</text>`;
    }
    return g + '</g>';
  }

  render() {
    const { W, H, S } = this.o;
    let s = `<rect width="${W * S}" height="${H * S}" fill="#fff"/>`;
    if (store.opts.grid) {
      for (let i = 0; i <= W; i++) s += `<line x1="${i * S}" y1="0" x2="${i * S}" y2="${H * S}" stroke="${i % 5 === 0 ? '#bfd9e2' : '#e3edf1'}" stroke-width="${i % 5 === 0 ? 1.6 : 1}"/>`;
      for (let j = 0; j <= H; j++) s += `<line x1="0" y1="${j * S}" x2="${W * S}" y2="${j * S}" stroke="${j % 5 === 0 ? '#bfd9e2' : '#e3edf1'}" stroke-width="${j % 5 === 0 ? 1.6 : 1}"/>`;
    }
    s += `<rect width="${W * S}" height="${H * S}" fill="none" stroke="#9fc3d0" stroke-width="3"/>`;
    if (store.opts.adv && store.opts.grid) {
      for (let i = 5; i < W; i += 5) s += `<text x="${i * S + 3}" y="${H * S - 5}" font-size="12" fill="#6d8a97">${i}</text>`;
      for (let j = 5; j < H; j += 5) s += `<text x="4" y="${this.sy(j) - 3}" font-size="12" fill="#6d8a97">${j}</text>`;
    }
    if (this.o.overlay) s += this.o.overlay(this) || '';
    const vs = this.vs.filter(v => v.visible !== false);
    for (const v of vs) if (v.id !== this.sel) s += this.vec(v);
    const sv = vs.find(v => v.id === this.sel); if (sv) s += this.vec(sv);
    if (this.draft) {
      const d = this.draft;
      s += this.arrow(d.a, V.sub(d.b, d.a), '#7a8d99', { w: 4, dash: '8 6' }) + this.dot(d.a, '#7a8d99', 5);
    }
    this.svg.innerHTML = s;
  }
}

/* ---------------- shared lab layout: toolbar + workspace + side panel ---------------- */
function makeLab(root, cfg) {
  const o = store.opts;
  const wsbox = h('div', { class: 'wsbox' }), tb = h('div', { class: 'toolbar' }), side = h('div', { class: 'side' });
  const ws = new Workspace(wsbox, Object.assign({ model: cfg.model }, cfg.ws));
  const refresh = () => { if (cfg.refresh) cfg.refresh(); };
  const btn = (label, fn, cls = '') => h('button', { class: 'btn ' + cls, type: 'button', onclick: fn }, label);
  const histDo = fn => () => { fn(); ws.sel = null; ws.render(); refresh(); };
  if (cfg.hist) tb.append(btn('↶ ' + tx('Geri Al', 'Undo'), histDo(() => cfg.hist.undo())), btn('↷ ' + tx('Yinele', 'Redo'), histDo(() => cfg.hist.redo())));
  if (cfg.onReset) tb.append(btn('⟲ ' + tx('Sıfırla', 'Reset'), cfg.onReset));
  const tog = (key, label) => {
    const b = h('button', { class: 'btn tog' + (o[key] ? ' on' : ''), type: 'button', 'aria-pressed': o[key] ? 'true' : 'false' }, label);
    b.addEventListener('click', () => { o[key] = !o[key]; b.classList.toggle('on', o[key]); b.setAttribute('aria-pressed', o[key]); ws.render(); refresh(); });
    return b;
  };
  tb.append(tog('grid', tx('Izgara', 'Grid')), tog('snapGrid', tx('Izgaraya Yapış', 'Snap to Grid')));
  if (cfg.ht) tb.append(tog('snapHT', tx('Uç Uca Yapış', 'Snap Head-to-Tail')));
  tb.append(tog('mag', tx('Büyüklükleri Göster', 'Show Magnitudes')), tog('adv', tx('Gelişmiş Gösterim', 'Advanced Display')));
  tb.append(btn('⛶ ' + tx('Tam Ekran', 'Fullscreen'), toggleFullscreen));
  root.append(h('div', { class: 'lab' }, h('div', { class: 'wscol' }, tb, wsbox), side));
  return { ws, side, wsbox };
}
function toggleFullscreen() {
  const el = document.getElementById('app');
  if (document.fullscreenElement) document.exitFullscreen();
  else if (el.requestFullscreen) el.requestFullscreen().catch(() => toast(tx('Tam ekran desteklenmiyor', 'Fullscreen is not supported')));
}

/* ---------------- shared checking logic ---------------- */

/* B should equal k·A (position of B is irrelevant) */
function checkScalar(A, B, k, nA = 'A', nB = 'B') {
  const la = V.len(A), lb = V.len(B), tol = 0.3, lines = [];
  const kl = kLabel(k), want = Math.abs(k) * la;
  if (k === 0) {
    const ok = lb <= tol;
    lines.push(ok ? okL(tx('Sıfır vektörünün büyüklüğü 0’dır: ucu ile kuyruğu aynı noktadadır.', 'The zero vector has magnitude 0: its head and tail are at the same point.'))
      : badL(tx(`${nB} hâlâ bir büyüklüğe sahip. Sıfır vektörünün ucu ile kuyruğu çakışır.`, `${nB} still has a magnitude. For the zero vector the head and tail coincide.`)));
    return { ok, lines };
  }
  const magOk = Math.abs(lb - want) <= tol;
  if (lb <= tol) {
    lines.push(badL(tx(`${nB} neredeyse bir nokta. Büyüklüğü |${nB}| = ${kLabel(Math.abs(k))}|${nA}| olmalı.`, `${nB} is almost a point. Its magnitude must be |${nB}| = ${kLabel(Math.abs(k))}|${nA}|.`)));
    return { ok: false, lines };
  }
  lines.push(magOk ? okL(tx(`Büyüklük doğru: |${nB}| = ${kLabel(Math.abs(k))}·|${nA}|.`, `Magnitude is correct: |${nB}| = ${kLabel(Math.abs(k))}·|${nA}|.`))
    : badL(tx(`Büyüklük hatalı: |${nB}| şu an |${nA}|’nın ${fmt(lb / la)} katı; ${kLabel(Math.abs(k))} katı olmalı.`, `Magnitude is wrong: |${nB}| is currently ${fmt(lb / la)} times |${nA}|; it should be ${kLabel(Math.abs(k))} times.`)));
  const par = V.parallel(A, B);
  lines.push(par ? okL(tx(`Doğrultu doğru: ${nB}, ${nA} ile paralel.`, `Line of action is correct: ${nB} is parallel to ${nA}.`))
    : badL(tx(`Doğrultu hatalı: ${nB}, ${nA} ile paralel değil. Skalerle çarpma vektörün doğrultusunu değiştirmez.`, `Line of action is wrong: ${nB} is not parallel to ${nA}. Scalar multiplication never changes the line of action.`)));
  let senseOk = false;
  if (par) {
    senseOk = (V.dot(A, B) > 0) === (k > 0);
    lines.push(senseOk ? okL(k > 0 ? tx('Yön doğru: pozitif skaler yönü korur.', 'Sense is correct: a positive scalar keeps the sense.') : tx('Yön doğru: negatif skaler yönü ters çevirir.', 'Sense is correct: a negative scalar reverses the sense.'))
      : badL(k > 0 ? tx(`Yön hatalı: ${kl} pozitif olduğu için ${nB}, ${nA} ile aynı yönde olmalı.`, `Sense is wrong: ${kl} is positive, so ${nB} must point the same way as ${nA}.`)
        : tx(`Yön hatalı: ${kl} negatif olduğu için ${nB}, ${nA}’ya zıt yönde olmalı.`, `Sense is wrong: ${kl} is negative, so ${nB} must point opposite to ${nA}.`)));
  }
  return { ok: magOk && par && senseOk, lines };
}

/* items: the vectors to be added; R: student's resultant (or null); zeroFlag: "R = 0" ticked */
function checkSum(items, R, zeroFlag) {
  const exp = V.sum(items), zeroExp = V.len(exp) < 0.3, lines = [], n = items.length;
  const ch = chainOrder(items);
  lines.push(ch.ok ? okL(tx('Vektörler uç uca eklenmiş: her vektörün kuyruğu öncekinin ucuna değiyor.', 'The vectors are joined head-to-tail: each tail meets the previous head.'))
    : badL(tx(`Uç uca ekleme tamamlanmadı (${Math.max(0, ch.links)}/${n - 1} bağlantı doğru). Her vektörün kuyruğu, bir öncekinin ucuna değmeli.`, `Head-to-tail is not complete (${Math.max(0, ch.links)}/${n - 1} joints correct). Each tail must touch the previous head.`)));
  let rOk = false;
  if (zeroExp) {
    if (zeroFlag && !R) { rOk = true; lines.push(okL(tx('Doğru! Zincir kapandı: son vektörün ucu, ilk vektörün kuyruğuna geliyor; bileşke sıfır vektörüdür.', 'Correct! The chain closes: the last head returns to the first tail, so the resultant is the zero vector.'))); }
    else if (R) lines.push(badL(tx('Bu vektörlerde başlangıç ve bitiş noktası aynı olabilir; çizilecek bir ok yoktur. Bileşke hakkında ne söylersiniz?', 'For these vectors the start and end points can coincide, so there is no arrow to draw. What does that say about the resultant?')));
    else lines.push(badL(tx('Bileşke vektörü henüz belirlemediniz. Zincirin başlangıcı ile bitişine bakın.', 'You have not decided on the resultant yet. Compare the start and the end of the chain.')));
  } else if (zeroFlag) {
    lines.push(badL(tx('“R = 0” dediniz ama zincirin başlangıç ve bitiş noktaları farklı. Bileşke, ilk kuyruktan son uca çizilen vektördür.', 'You ticked “R = 0” but the chain starts and ends at different points. The resultant runs from the first tail to the last head.')));
  } else if (!R) {
    lines.push(badL(tx('Bileşke vektör R henüz çizilmedi. Boş bir alanda sürükleyerek R’yi çizin.', 'The resultant R has not been drawn yet. Drag on an empty area to draw R.')));
  } else {
    const d = V.dist(R.comp, exp);
    if (d <= 0.35) {
      rOk = true;
      lines.push(okL(tx('Bileşke vektör R doğru: büyüklüğü, doğrultusu ve yönü beklenenle aynı.', 'Resultant R is correct: its magnitude, line of action and sense all match.')));
    } else if (V.eq(R.comp, V.scale(exp, -1), 0.35)) {
      lines.push(badL(tx('R ters yönde çizilmiş. Bileşke, ilk vektörün kuyruğundan son vektörün ucuna doğrudur.', 'R points the wrong way. The resultant runs from the first tail to the last head.')));
    } else if (Math.abs(V.len(R.comp) - V.len(exp)) <= 0.35) {
      lines.push(badL(tx('R’nin büyüklüğü doğru ama doğrultusu/yönü hatalı. Başlangıç ve bitiş noktalarını kontrol edin.', 'R has the right magnitude but the wrong direction. Check its start and end points.')));
    } else if (V.parallel(R.comp, exp) && V.dot(R.comp, exp) > 0) {
      lines.push(badL(V.len(R.comp) < V.len(exp) ? tx('R’nin yönü doğru ama çok kısa; zincirin bitiş noktasına kadar uzatın.', 'R points the right way but is too short; extend it to the end of the chain.')
        : tx('R’nin yönü doğru ama çok uzun; zincirin bitiş noktasında durmalı.', 'R points the right way but is too long; it should stop at the end of the chain.')));
    } else lines.push(badL(tx('R’nin büyüklüğü ve yönü beklenenden farklı. Zincirin başlangıcından bitişine bakın.', 'R differs from the expected magnitude and direction. Look from the start of the chain to its end.')));
    if (rOk && ch.ok) {
      const startOk = V.dist(R.tail, ch.order[0].tail) <= 0.5;
      lines.push(startOk ? okL(tx('R, zincirin başlangıç noktasından çizilmiş.', 'R starts at the beginning of the chain.'))
        : infoL(tx('R doğru; konumu önemli değil. (İstenirse ilk vektörün kuyruğundan başlatmak bileşkeyi daha anlaşılır yapar.)', 'R is correct; its position does not matter. (Starting it at the first tail makes the picture clearer.)')));
    }
  }
  return { pass: ch.ok && rOk, lines, exp, chain: ch };
}

/* component-based working shown only after "Show Result" */
function sumWorking(items) {
  const e = V.sum(items), jn = (k, name) => items.map(v => (k === 'x' ? v.comp.x : v.comp.y)).map(a => a < 0 ? `(${fmt(a, 1)})` : fmt(a, 1)).join(' + ');
  const names = k => items.map(v => v.name + k).join(' + ');
  return [
    `R<sub>x</sub> = ${names('<sub>x</sub>')} = ${jn('x')} = <b>${fmt(e.x, 1)}</b>`,
    `R<sub>y</sub> = ${names('<sub>y</sub>')} = ${jn('y')} = <b>${fmt(e.y, 1)}</b>`,
    `|R| = √(R<sub>x</sub>² + R<sub>y</sub>²) = √(${fmt(e.x * e.x + e.y * e.y, 1)}) = <b>${fmt(V.len(e))}</b>`
  ];
}
