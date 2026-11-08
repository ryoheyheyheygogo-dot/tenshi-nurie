/* 天使のぬりえ（Godotなし版）
 * 画面：タイトル → えらぶ → ぬりえ ／ ひみつ（じぶんだけの てんし）
 * 1280x720 を基準に作り、画面の大きさに合わせて拡大縮小する（横長・縦長にも広がる）。
 * 保存はこの端末のブラウザの中だけ（localStorage）。外には送らない。
 */
'use strict';

// LINE の中の ブラウザで開いた時は、Safari・Chrome で 開きなおす（写真の保存などが うまく動かないため）
if (/ Line\//i.test(navigator.userAgent) && location.search.indexOf('openExternalBrowser=1') < 0) {
  location.replace(location.pathname + (location.search ? location.search + '&' : '?') + 'openExternalBrowser=1' + location.hash);
}

// ======================= 設定 =======================
const BASE_W = 1280, BASE_H = 720;
const IMG_DIR = 'assets/img/';

// ぬりえの絵（required は「全部ぬれた」の判定に使う部分）
const LEVELS = {
  easy: { line: 'easy_line', regions: 'easy_regions', count: 19, stars: 1,
    required: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19] },
  // ふつう：マリアさまと、手を あわせる 子ども（いただいた 線画から 数字を 消して、パーツごとに 36こに 分けたもの。ベールは 頭と 前の布で べつべつ、ひだは たての 線だけ。もよう・背景の 線・マリアさまの 足は なし。子どもの 白目は ぬれない）
  normal: { line: 'normal_line', regions: 'normal_regions', count: 37, stars: 2,
    required: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37] },   // ぬれる所 ぜんぶ ぬったら できあがり
  hard: { line: 'hard_line', regions: 'hard_regions', count: 67, stars: 3,
    required: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67] },
};
// できた！の時の「絵が動き出す」設定（wings：羽ばたく部分の番号と、付け根の位置）
LEVELS.easy.alive = { float: 26, wings: [{ id: 11, pivot: [0.345, 0.62], dir: -1 }, { id: 12, pivot: [0.705, 0.62], dir: 1 }], around: 1 };
LEVELS.normal.alive = { float: 10 };   // 空は ないので、雲・鳥は 出さない
LEVELS.hard.alive = { float: 10, sky: true };
// ひみつ（じぶんだけの てんし）：顔のない園章の天使。白い絵を、塗っても・描いてもよい
const SECRET = { line: 'angel_line', regions: 'secret_regions', count: 19, mask: 'angel_draw_mask', stars: 4,
  alive: { wings: [{ id: 5, pivot: [0.33, 0.66], dir: -1 }, { id: 6, pivot: [0.7, 0.66], dir: 1 }], around: 1 } };
const ORDER = ['easy', 'normal', 'hard'];
const UNDER_CONSTRUCTION = [];   // 改修中（まだ遊べない）。イラストができたら外す
const SECRET_KEY = 'secret';
const NAMES = { easy: 'やさしい', normal: 'ふつう', hard: 'むずかしい', secret: 'じぶんだけの てんし' };
const CARD_COLORS = { easy: '#ffe3a3', normal: '#bfe8c4', hard: '#c9d7ff', secret: '#e2c6ff' };

// ふつうの色
const COLORS = [
  '#ff4d4d', '#ff9a3c', '#ffd93b',
  '#8ee05a', '#2fb36d', '#4cc3ff',
  '#3b6cff', '#a46bff', '#ff8fcf',
  '#9b6a45', '#ffffff', '#4a4a4a',
];
// 園章の色（えんじ・かみ・はだ・ひかりのわ・ふく）
const CREST_COLORS = ['#7a2820', '#c9733d', '#e4bccb', '#efeb8e', '#93b5d8'];
// タイトルの 絵の 色（「むずかしい」は タイトルと 同じ 絵なので）：空・ようちえんの かべ・看板の 木・れんが・生けがき・葉っぱ・芝・道・コンクリート・やね
const TITLE_COLORS = ['#49aefd', '#fef3cc', '#e9b673', '#8e4a3e', '#3f6b2a', '#8fbf4f', '#e3c84a', '#6f6b6e', '#d8d4cc', '#b9a48e'];
// じぶんだけの てんし の色（黒っぽい色が先頭）
const DRAW_COLORS = [
  '#3a3a3a', '#ff4d4d', '#ff9a3c',
  '#ffd93b', '#8ee05a', '#2fb36d',
  '#4cc3ff', '#3b6cff', '#a46bff',
  '#ff8fcf', '#9b6a45', '#ffffff',
];
// はだいろ（うすい・ふつう・こい）
const SKIN_COLORS = ['#ffdcc2', '#f0b48a', '#a86f4c'];
// たのしい色（ミント・ラベンダー・ショッキングピンク・レモン・サーモン）
const FUN_COLORS = ['#5fe3c0', '#c3a6ff', '#ff2e97', '#fff35c', '#ff8a6b'];
// とくべつな色（きん・ぎん・にじ・きらきら・みずたま）
const SPECIAL_COLORS = ['gold', 'silver', 'rainbow', 'glitter', 'dots'];
const SPECIAL_CSS = {
  gold: 'linear-gradient(135deg,#a8780a 0%,#ffe37a 35%,#c9930f 55%,#fff1b0 75%,#b8860b 100%)',
  silver: 'linear-gradient(135deg,#8e959c 0%,#f4f6f8 35%,#a9b0b7 55%,#ffffff 75%,#8e959c 100%)',
  rainbow: 'linear-gradient(135deg,#ff4d4d,#ff9a3c,#ffd93b,#8ee05a,#4cc3ff,#3b6cff,#a46bff)',
  glitter: 'radial-gradient(circle at 30% 30%,#fff 0 9%,transparent 11%),radial-gradient(circle at 70% 55%,#fff 0 7%,transparent 9%),radial-gradient(circle at 42% 78%,#fff 0 6%,transparent 8%),#ff7ac8',
  dots: 'radial-gradient(circle,#fff 0 23%,transparent 26%) 0 0/50% 50%,#ff5c7a',
};
const PEN_SIZES = [0.012, 0.03];   // ペンの太さ（絵の大きさに対する割合。拡大中は細くなる）

// ---- 色の作り方（ふつうの色は1色。とくべつな色は場所によって色が変わる） ----
function hslToRgb(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return [f(0), f(8), f(4)];
}
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t | 0, a[1] + (b[1] - a[1]) * t | 0, a[2] + (b[2] - a[2]) * t | 0]; }
/** 色 → (x, y) の場所の色 [r,g,b] を返す関数。W, H は絵の大きさ */
function colorFn(c, W, H) {
  if (c[0] === '#') { const rgb = hexToRgb(c); return () => rgb; }
  const S = Math.max(W, H) / 1000;   // 絵の大きさに合わせて模様の大きさをそろえる
  switch (c) {
    case 'gold':
    case 'silver': {
      const dark = c === 'gold' ? [176, 128, 10] : [132, 140, 150];
      const light = c === 'gold' ? [255, 228, 120] : [242, 245, 249];
      const shine = c === 'gold' ? [255, 249, 214] : [255, 255, 255];
      return (x, y) => {
        const v = 0.5 + 0.5 * Math.sin((x + y) * 0.03 / S);
        const w = 0.5 + 0.5 * Math.sin((x - y * 0.6) * 0.08 / S);
        const t = v * 0.75 + w * 0.25;
        return t > 0.9 ? mix(light, shine, (t - 0.9) * 10) : mix(dark, light, t / 0.9);
      };
    }
    case 'rainbow':
      return (x, y) => hslToRgb(((x / W + y / H) * 360 * 1.2) % 360, 0.9, 0.62);
    case 'glitter': {
      const base = [255, 122, 200];
      return (x, y) => {
        const h = ((((x / (2 * S)) | 0) * 73856093) ^ (((y / (2 * S)) | 0) * 19349663)) >>> 0;
        const k = h % 41;
        return k === 0 ? [255, 255, 255] : k === 1 ? [255, 214, 240] : k === 2 ? [255, 236, 140] : base;
      };
    }
    case 'starry': {   // ほしぞら：こい青のグラデーションに、白・黄色の星
      return (x, y) => {
        const h = ((((x / (3 * S)) | 0) * 73856093) ^ (((y / (3 * S)) | 0) * 19349663)) >>> 0;
        const k = h % 53;
        if (k === 0) return [255, 255, 255];
        if (k === 1) return [255, 230, 110];
        const t = (y / H) * 0.7 + 0.15 * Math.sin(x * 0.01 / S);
        return mix([27, 31, 92], [70, 52, 150], Math.max(0, Math.min(1, t)));
      };
    }
    case 'dots': {
      const cell = 28 * S, r2 = (cell * 0.28) * (cell * 0.28);
      return (x, y) => {
        const row = Math.floor(y / cell);
        const ox = (row % 2) * cell / 2;
        const dx = ((x + ox) % cell) - cell / 2, dy = (y % cell) - cell / 2;
        return dx * dx + dy * dy < r2 ? [255, 255, 255] : [255, 92, 122];
      };
    }
  }
  return () => [255, 255, 255];
}
SPECIAL_CSS.starry = 'radial-gradient(circle at 28% 30%,#fff 0 7%,transparent 9%),radial-gradient(circle at 70% 58%,#ffe066 0 6%,transparent 8%),radial-gradient(circle at 40% 76%,#fff 0 4%,transparent 6%),linear-gradient(160deg,#1b1f5c,#46349a)';
function swatchBg(c) { return SPECIAL_CSS[c] || c; }

// タイトル
const POPS = [   // 画像, 横の位置, 足元の高さ, 画面の高さに対する大きさ, 出る順の遅れ秒
  ['pop_ribbon', 0.14, 0.99, 0.62, 0.35],
  ['pop_blocks', 0.50, 0.99, 0.24, 0.55],
  ['pop_baton', 0.86, 0.99, 0.62, 0.75],
];
const KID_FRAMES = 4, KID_FPS = 9, KID_TAPS = 5;
const KID_START_Y = 0.60, KID_END_Y = 1.10, KID_H_START = 0.03, KID_H_END = 1.0, KID_RUN_TIME = 4.0;
const LOGO_WIDTH = 570, LOGO_TOP = -14;

const IMAGES = [
  'title_scene.jpg', 'title_logo.png', 'title_logo_big.webp', 'kid_walk.png', 'kid_angry.png',
  'pop_ribbon.png', 'pop_blocks.png', 'pop_baton.png',
  'icon_again.png', 'icon_clear.png', 'icon_done.png', 'icon_home.png', 'icon_save.png',
  'icon_star.png', 'icon_sun.png', 'icon_undo.png', 'icon_zoom_in.png', 'icon_zoom_out.png', 'icon_photo.png',
  'easy_line.png', 'easy_regions.png', 'normal_line.png', 'normal_regions.png',
  'hard_line.png', 'hard_regions.png',
  'angel_line.png', 'angel_draw_mask.png', 'secret_regions.png', 'icon_fill.png',
  'sel_left.webp', 'sel_right.webp', 'imp_angel.webp', 'ico_flower.png', 'ico_leaf.png', 'ico_dove.png',
];
const SE_FILES = ['paint', 'click', 'click2', 'click3', 'click4', 'click5', 'undo', 'start', 'save', 'fanfare', 'tap', 'secret'];

// ======================= 共通の道具 =======================
const stage = document.getElementById('stage');
const view = { w: BASE_W, h: BASE_H, scale: 1 };
const IMG = {};          // 読みこんだ画像（名前 → Image）
const state = { secret: false };
let cur = null;          // いまの画面
let token = 0;           // 画面が変わったら増える（古いタイマーを止めるため）

function px(v) { return v + 'px'; }
function src(name) { return IMG[name] ? IMG[name].src : IMG_DIR + name + '.png'; }
function el(tag, cls, style, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (style && style.inset !== undefined) {   // 古い iPhone（iOS 14.4 まで）は inset が きかないので、上下左右に わける
    const v = style.inset;
    style = Object.assign({}, style, { top: v, right: v, bottom: v, left: v });
    delete style.inset;
  }
  if (style) Object.assign(e.style, style);
  if (parent) parent.appendChild(e);
  return e;
}
function pic(name, cls, style, parent) {
  const e = el('img', cls, style, parent);
  e.src = src(name);
  e.draggable = false;
  e.alt = '';
  return e;
}
/** ふちどり文字：うしろに ふちの文字、前に ふつうの文字を重ねる（どの ブラウザ でも 同じに 見える。古い Android の Chrome は paint-order が きかないため） */
function outlineText(parent, text, w, c) {
  parent.textContent = '';
  const wrap = el('span', 'olw', null, parent);
  const back = el('span', 'olb', { WebkitTextStroke: w + ' ' + c, color: c }, wrap);
  back.textContent = text;
  const front = el('span', 'olf', null, wrap);
  front.textContent = text;
  return wrap;
}
function label(text, size, color, style, parent) {
  style = Object.assign({}, style || {});
  const sw = style.WebkitTextStrokeWidth || px(Math.round(size * 0.36)), sc = style.WebkitTextStrokeColor || '#fff';
  delete style.WebkitTextStrokeWidth; delete style.WebkitTextStrokeColor;
  const e = el('div', 'lbl', Object.assign({ fontSize: px(size), color: color }, style), parent);
  outlineText(e, text, sw, sc);
  return e;
}
function later(ms, f) {
  const t = token;
  setTimeout(() => { if (t === token) f(); }, ms);
}
/**
 * さわって離したら fn。click を使わないのは、iPhone で続けてさわった時に
 * 画面が拡大（ダブルタップ拡大）されないよう、touchend を止めているため。
 */
function onTap(e, fn) {
  let downId = null;
  e.addEventListener('pointerdown', (ev) => { downId = ev.pointerId; });
  e.addEventListener('pointercancel', () => { downId = null; });
  e.addEventListener('pointerup', (ev) => {
    if (ev.pointerId !== downId) return;
    downId = null;
    ev.stopPropagation();
    fn(ev);
  });
}
function rand(a, b) { return a + Math.random() * (b - a); }
function bounce(e) {
  e.classList.remove('bounce');
  void e.offsetWidth;
  e.classList.add('bounce');
}
/** 絵（アイコン）だけの丸いボタン */
function iconButton(parent, icon, d, color, pos, action, sound) {
  const b = el('div', 'btn', Object.assign({ width: px(d), height: px(d), background: color }, pos), parent);
  pic(icon, null, null, b);
  onTap(b, () => {
    bounce(b);
    if (sound !== false) se('click');
    action();
  });
  return b;
}
/** できた！の画面の、大きな「写真に保存」ボタン（まわりに光の輪が広がる） */
function photoButton(parent, left, bottom, action) {
  const D = 150;
  const wrap = el('div', null, { position: 'absolute', left: left, bottom: bottom, width: px(D), height: px(D) }, parent);
  for (let i = 0; i < 2; i++) {
    el('div', 'photoring', { animationDelay: (i * 0.8) + 's' }, wrap);
  }
  const b = iconButton(wrap, 'icon_photo', D, '#ff5a8a', { left: '0', top: '0', borderWidth: '8px' }, action);
  b.classList.add('photobtn');
  return b;
}
function hexToRgb(h) {
  return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
}

// ---------- 画面の大きさ ----------
// iPhone の切りかき（ノッチ）や 角の丸みに、ボタンが かくれないよう、その分を あけて表示する
const safeProbe = (() => {
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
    'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(d);
  return d;
})();
let lastLayoutKey = '';
function layout() {
  // 文字を入力している間は、キーボードで画面の高さが変わっても 大きさを変えない（Android は キーボードで画面が ちぢむ）
  if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
  const cs = getComputedStyle(safeProbe);
  const it = parseFloat(cs.paddingTop) || 0, ir = parseFloat(cs.paddingRight) || 0, ib = parseFloat(cs.paddingBottom) || 0, il = parseFloat(cs.paddingLeft) || 0;
  const vw = window.innerWidth - il - ir, vh = window.innerHeight - it - ib;
  const lk = [vw, vh, il, it].join(',');
  if (lk === lastLayoutKey) return;   // 大きさが かわっていない時は なにもしない
  lastLayoutKey = lk;
  view.ox = il; view.oy = it;
  stage.style.left = px(il); stage.style.top = px(it);
  const s = Math.min(vw / BASE_W, vh / BASE_H);
  view.scale = s;
  view.w = vw / s;
  view.h = vh / s;
  stage.style.width = px(view.w);
  stage.style.height = px(view.h);
  stage.style.transform = 'scale(' + s + ')';
  if (cur && cur.onResize) cur.onResize();
}
window.addEventListener('resize', layout);
window.addEventListener('orientationchange', () => { setTimeout(layout, 200); setTimeout(layout, 700); });
if (window.visualViewport) window.visualViewport.addEventListener('resize', layout);
document.addEventListener('fullscreenchange', () => { setTimeout(layout, 50); setTimeout(layout, 400); });
document.addEventListener('webkitfullscreenchange', () => { setTimeout(layout, 50); setTimeout(layout, 400); });
// 機種や 全画面の 切りかえで resize が おくれたり 来なかったりする。ときどき 大きさを たしかめる
setInterval(layout, 600);

let curFn = null;
function go(screenFn, arg) {
  token++;
  if (cur && cur.dispose) cur.dispose();
  // iPhone は、絵（canvas）の メモリに上限がある。画面を かえる時に すぐ かえす
  stage.querySelectorAll('canvas').forEach((c) => { c.width = 0; c.height = 0; });
  stage.innerHTML = '';
  curFn = screenFn;
  const root = el('div', 'screen', null, stage);
  cur = screenFn(root, arg) || {};
}

// ---------- 効果音 ----------
let ac = null;
const SE = {};
const CLICKS = [];
function initAudio() {
  // iPhone の マナーモード（消音スイッチ）でも、Android と同じように 音量ボタンの大きさで鳴らす（声とそろえる）
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* なにもしない */ }
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
}
function decodeAudio(buf) {
  return new Promise((ok) => {
    try { ac.decodeAudioData(buf, ok, () => ok(null)); } catch (e) { ok(null); }
  });
}
let audioUnlocked = false;
function unlockAudio() {
  if (!ac) return;
  if (ac.state !== 'running') ac.resume();
  if (!audioUnlocked) {   // iPhone は、さわった時に一度音を鳴らすと、以後鳴るようになる
    audioUnlocked = true;
    try {
      const b = ac.createBuffer(1, 1, 22050);
      const s = ac.createBufferSource();
      s.buffer = b; s.connect(ac.destination); s.start(0);
    } catch (e) { /* なにもしない */ }
  }
}
function se(name, pitch, volDb) {
  if (!ac || ac.state !== 'running') return;
  const buf = name === 'click' ? CLICKS[Math.floor(Math.random() * CLICKS.length)] : SE[name];
  if (!buf) return;
  const s = ac.createBufferSource();
  s.buffer = buf;
  s.playbackRate.value = pitch || 1;
  const g = ac.createGain();
  g.gain.value = Math.pow(10, (volDb || 0) / 20);
  s.connect(g); g.connect(ac.destination);
  s.start(0);
}

// 声のせりふ（録音する時は、この名前で assets/voice/<名前>.mp3 を作り、voices.json に名前をならべる）
const VOICE_LINES = {
  select: 'どの絵に する？',
  nurie: '好きな色で、ぬってね。',
  draw: '自分だけの 天使を つくろう。',
  done: 'できたね！ すてき！',
  angel_gold: '金の 天使だ！', angel_silver: '銀の 天使だ！', angel_rainbow: '虹の 天使だ！',
  angel_glitter: 'きらきら 天使だ！', angel_dots: '水玉の 天使だ！', angel_starry: '星空の 天使だ！',
  draw_done: 'すてきな 天使！',
  smile: 'にっこり 天使！ うれしそう！',
  secret: 'ひみつの 部屋へ、ようこそ。',
  stamp: 'かくしスタンプ、みーつけた！',
  stamp_all: 'ぜんぶ 見つけたね！ 星空の色が ふえたよ。',
  album: '記念写真が、とれるよ。',
  celebrate75: '天使幼稚園、七十五周年、おめでとう！',
  party75: '当日は、パーティを するよ！ この画面を、受付の人に 見せてね！',
  hint_dance: '選ぶ画面の 三人の子。順番に さわると…？',
  hint_birds: 'むずかしい の お空を、本物みたいな 色に すると…？',
  hint_gold: 'やさしい の天使を、お日さまみたいに 光る色 ひとつで。',
  hint_silver: 'やさしい の天使を、お月さまみたいに 光る色 ひとつで。',
  hint_blueveil: 'マリアさまの ベールに 似合うのは、海や お空みたいな 色かも。',
  hint_room: '走ってくる 男の子。なんども さわると…？',
  hint_melody: '色を 選ぶ 順番。雨のあとの お空と 同じ 順番で。',
  hint_rainbow: 'やさしい の天使を、雨のあとに 出る 色 ひとつで。',
  hint_face: '自分だけの 天使。お顔が あったら うれしいね。',
  hint_osoroi: 'マリアさまと 子ども。おそろいの 服に なったら なかよし。',
  hint_glitter: 'やさしい の天使を、星みたいに きらっと する色 ひとつで。',
  hint_dots: 'やさしい の天使を、ぽつぽつ もようの 色 ひとつで。',
  hint_goldkid: '走ってくる 男の子。ときどき ようすが ちがうよ。',
  hint_fireworks: '左上の マーク。七 と 五 を、ひとつずつ、わけて 教えて あげよう。',
  hint_goldpair: 'マリアさまと 子どもの 頭に、光を のせて みよう。',
};
// ---------- 声（女性の 短い声） ----------
// assets/voice/voices.json に のっている名前の 録音（assets/voice/<名前>.mp3）があれば それを使い、
// なければ 端末の読み上げ（日本語の 女性の声）で話す。録音を あとから足すだけで 切りかわる。
const voice = (() => {
  const rec = {};
  const said = {};
  let jaVoice = null;
  const MALE = /otoya|hattori|ichiro|keita|daichi|naoki/i;
  const FEMALE = /kyoko|o-ren|nanami|ayumi|haruka|sayaka|mizuki|female|女性|google 日本語/i;
  function pickVoice() {
    if (!window.speechSynthesis) return;
    const vs = speechSynthesis.getVoices().filter((v) => /^ja/i.test(v.lang) && !MALE.test(v.name));
    jaVoice = vs.find((v) => FEMALE.test(v.name)) || vs[0] || null;
  }
  if (window.speechSynthesis) {
    pickVoice();
    try { speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch (e) { speechSynthesis.onvoiceschanged = pickVoice; }
    // iPhone は、さわった時に一度 話しておくと、そのあと話せるようになる
    let primed = false;
    const prime = () => {
      if (primed) return;
      primed = true;
      try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) { /* なにもしない */ }
    };
    document.addEventListener('pointerup', prime, true);
    document.addEventListener('touchend', prime, true);
  }
  return {
    /** 録音を読みこむ（decode：ArrayBuffer → 音） */
    load(decode) {
      fetch('assets/voice/voices.json').then((r) => (r.ok ? r.json() : [])).then((list) => {
        (list || []).forEach((k) => fetch('assets/voice/' + k + '.mp3').then((r) => (r.ok ? r.arrayBuffer() : null))
          .then((b) => (b ? decode(b) : null)).then((buf) => { if (buf) rec[k] = buf; }).catch(() => {}));
      }).catch(() => {});
    },
    /** key の声を出す。once：この遊んでいる間に1回だけ。play：録音を鳴らす関数 */
    say(key, opt) {
      opt = opt || {};
      if (opt.once && said[key]) return;
      said[key] = true;
      if (rec[key] && opt.play) { opt.play(rec[key]); return; }
      const text = VOICE_LINES[key];
      if (!text || !window.speechSynthesis) return;
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ja-JP';
        if (jaVoice) u.voice = jaVoice;
        u.rate = 1.0; u.pitch = 1.25; u.volume = 1;
        speechSynthesis.speak(u);
      } catch (e) { /* 話せない端末では なにもしない */ }
    },
  };
})();

/** 声を出す（録音があれば録音を、効果音と同じしくみで鳴らす） */
function say(key, opt) {
  voice.say(key, Object.assign({ play: (buf) => { if (!ac || ac.state !== 'running') return; const s = ac.createBufferSource(); s.buffer = buf; s.connect(ac.destination); s.start(0); } }, opt || {}));
}

// ---------- 全画面（Android など。iPhone はホーム画面に追加で全画面） ----------
function goFullscreen() {
  if (!window.matchMedia || !window.matchMedia('(pointer: coarse)').matches) return; // パソコンではしない
  if (document.fullscreenElement || document.webkitFullscreenElement) return;
  const d = document.documentElement;
  const req = d.requestFullscreen || d.webkitRequestFullscreen;
  if (!req) return;
  try {
    const p = req.call(d, { navigationUI: 'hide' });
    if (p && p.then) {
      p.then(() => {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      }).catch(() => {});
    }
  } catch (e) { /* 対応していない */ }
}
document.addEventListener('pointerdown', unlockAudio, true);
document.addEventListener('touchend', unlockAudio, true);
document.addEventListener('pointerup', goFullscreen, true);
document.addEventListener('contextmenu', (e) => e.preventDefault());
// ページ全体の拡大（ブラウザのピンチ拡大）をさせない。拡大は、ぬりえ・てんしの絵だけ（makeZoom）
['gesturestart', 'gesturechange', 'gestureend'].forEach((t) => document.addEventListener(t, (e) => e.preventDefault(), { passive: false }));
// 指でなぞった時に、ページがスクロールしたり、ぐにゃっと動いたりしないようにする（このゲームはスクロール不要）
document.addEventListener('touchmove', (e) => { if (e.target && e.target.tagName === 'INPUT') return; if (e.cancelable) e.preventDefault(); }, { passive: false });
document.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
// 続けてさわった時の拡大（ダブルタップ拡大）を止める。ボタンは onTap（pointerup）で動くので影響しない
document.addEventListener('touchend', (e) => { if (e.target && e.target.tagName === 'INPUT') return; if (e.cancelable) e.preventDefault(); }, { passive: false });

// ---------- 保存（この端末のブラウザの中だけ） ----------
const STORE_KEY = 'tenshi_nurie_save_v1';
function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
}
function writeStore(o) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(o)); return true; } catch (e) { return false; }
}
function saveThumb(key, dataUrl) {
  try { localStorage.setItem('tenshi_nurie_thumb_' + key, dataUrl); return true; } catch (e) { return false; }
}
function loadThumb(key) {
  try { return localStorage.getItem('tenshi_nurie_thumb_' + key); } catch (e) { return null; }
}

// ---------- かくし すたんぷ ----------
// とくべつな天使（やさしいを全部同じ とくべつな色で塗る）
const SPECIAL_ANGELS = {
  gold: { name: 'きんの てんし！', fill: '#ffd23f', stroke: '#8a5a00', glow: ['#ffd23f', '#ffb300'], move: 'fly' },
  silver: { name: 'ぎんの てんし！', fill: '#ffffff', stroke: '#5b6470', glow: ['#ffffff', '#9aa3ad'], move: 'spin' },
  rainbow: { name: 'にじの てんし！', fill: '#ffffff', stroke: '#a46bff', glow: null, move: 'fly' },
  glitter: { name: 'きらきら てんし！', fill: '#ffffff', stroke: '#ff2e97', glow: ['#ffffff', '#ff7ac8'], move: 'shake' },
  dots: { name: 'みずたまの てんし！', fill: '#ffffff', stroke: '#ff5c7a', glow: ['#ffffff', '#ff8fa3'], move: 'boing' },
  starry: { name: 'ほしぞらの てんし！', fill: '#ffe066', stroke: '#1b1f5c', glow: ['#ffe066', '#5b6cff'], move: 'fly' },   // ぜんぶ そろった ごほうびの色
};
// かくし すたんぷ（むずかしさ順。lv：1＝みつけやすい ★／2＝ちょっと むずかしい ★★／3＝とても むずかしい ★★★）
const STAMPS = [
  { id: 'dance', lv: 1, img: 'pop_ribbon' },    // 3人のダンス（リボン → つみき → バトン の順にタッチ）
  { id: 'birds', lv: 1, bird: true },           // むずかしい の空を青で塗って できた！
  { id: 'gold', lv: 1, swatch: 'gold' },        // やさしい を全部 きん
  { id: 'silver', lv: 1, swatch: 'silver' },    // やさしい を全部 ぎん
  { id: 'blueveil', lv: 1, pic: 'normal_line', bg: '#4c8dff' },   // ふつう：マリアさまの ベールを 青で できた！
  { id: 'room', lv: 2, img: 'kid_angry' },      // ひみつの へや（走る男の子を5回）
  { id: 'melody', lv: 2, text: '♪', bg: 'linear-gradient(135deg,#ff4d4d,#ff9a3c,#ffd93b,#8ee05a,#4cc3ff,#a46bff)' },   // 色を にじの順に
  { id: 'rainbow', lv: 2, swatch: 'rainbow' },  // やさしい を全部 にじ
  { id: 'face', lv: 2, heart: true },           // じぶんだけの てんし に顔を描く（ひみつのへや の先）
  { id: 'osoroi', lv: 2, pair: true },          // ふつう：子どもの ふく（左右）と マリアさまの ふくを 同じ色で できた！
  { id: 'glitter', lv: 3, swatch: 'glitter' },  // やさしい を全部 きらきら
  { id: 'dots', lv: 3, swatch: 'dots' },        // やさしい を全部 みずたま
  { id: 'goldkid', lv: 3, kid: true },          // ときどき（10回に1回）走ってくる 金色の男の子
  { id: 'fireworks', lv: 3, text: '75' },       // 園章を7回 → 5回（大人むけ）
  { id: 'goldpair', lv: 3, pic: 'normal_line', swatch: 'gold' },   // ふつう：ベールと 子どもの かみを きん で できた！
];
// ふつう（マリアさま）の 部分の 番号（normal_regions.png と 対応）
const NORMAL_PART = {"veil": 21, "chair": 11, "robeL": 17, "robeR": 32, "dress": 30, "skirt_a": 27, "skirt_b": 28, "skirt_d": 29, "skirt_a_0.5": 36, "dress_v": 31};
// ヒント（すたんぷ帳で、まだ見つけていない すたんぷを押すと出る。2行）。こたえ ではなく、ヒントだけ
const STAMP_HINTS = {
  dance: ['えらぶ がめんの 3にんの こ', 'じゅんばんに さわると…？'],
  birds: ['「むずかしい」の おそら', 'ほんものみたいな いろに すると…？'],
  gold: ['「やさしい」の てんしを', 'おひさまみたいに ひかる いろ ひとつで'],
  silver: ['「やさしい」の てんしを', 'おつきさまみたいに ひかる いろ ひとつで'],
  blueveil: ['マリアさまの ベールに にあうのは', 'うみや おそらみたいな いろかも'],
  room: ['はしってくる おとこのこ', 'なんども さわると…？'],
  melody: ['いろを えらぶ じゅんばん', 'あめの あとの おそらと おなじ じゅんばんで'],
  rainbow: ['「やさしい」の てんしを', 'あめの あとに でる いろ ひとつで'],
  face: ['じぶんだけの てんし', 'かおが あったら うれしいね'],
  osoroi: ['マリアさまと こども', 'おそろいの ふくに なったら なかよし'],
  glitter: ['「やさしい」の てんしを', 'ほしみたいに きらっと する いろ ひとつで'],
  dots: ['「やさしい」の てんしを', 'ぽつぽつ もようの いろ ひとつで'],
  goldkid: ['はしってくる おとこのこ', 'ときどき ようすが ちがうよ'],
  fireworks: ['ひだりうえの マーク。「7」と「5」を', 'ひとつずつ、わけて おしえて あげよう'],
  goldpair: ['マリアさまと こどもの あたまに', 'ひかりを のせて みよう'],
};
// 見つけた すたんぷを 押すと、どうやって 見つけたかを 出す（2行）
const STAMP_DONE = {
  dance: ['えらぶ がめんの 3にんの こを', 'じゅんばんに さわって ダンス！'],
  birds: ['「むずかしい」の おそらを あおく ぬって', 'とりが とんで いったよ'],
  gold: ['「やさしい」の てんしを', 'ぜんぶ「きん」で ぬったよ'],
  silver: ['「やさしい」の てんしを', 'ぜんぶ「ぎん」で ぬったよ'],
  blueveil: ['マリアさまの ベールを', 'あおい いろで ぬったよ'],
  room: ['はしってくる おとこのこを 5かい さわって', 'ひみつの へやを みつけたよ'],
  melody: ['いろを にじの じゅんばんに えらんで', 'メロディが ながれたよ'],
  rainbow: ['「やさしい」の てんしを', 'ぜんぶ「にじ」で ぬったよ'],
  face: ['じぶんだけの てんしに', 'にっこり おかおを かいたよ'],
  osoroi: ['マリアさまと こどもを', 'おそろいの いろの ふくに したよ'],
  glitter: ['「やさしい」の てんしを', 'ぜんぶ「きらきら」で ぬったよ'],
  dots: ['「やさしい」の てんしを', 'ぜんぶ「みずたま」で ぬったよ'],
  goldkid: ['ときどき はしってくる', 'きんいろの おとこのこを つかまえたよ'],
  fireworks: ['ひだりうえの マークを 7かい・5かい おして', '75の はなびを あげたよ'],
  goldpair: ['マリアさまの ベールと こどもの かみを', '「きん」で ぬって ひかりを のせたよ'],
};
const LV_COLORS = { 1: '#e3f5d0', 2: '#fff0c2', 3: '#ffdbe3' };
/** むずかしさの星（★〜★★★）を横にならべる */
function lvStars(parent, lv, size, style) {
  const row = el('div', null, Object.assign({ position: 'absolute', display: 'flex', gap: '2px', pointerEvents: 'none' }, style || {}), parent);
  for (let i = 0; i < lv; i++) pic('icon_star', null, { width: px(size), height: px(size) }, row);
  return row;
}
function stampsGot() { return loadStore().stamps || {}; }
function stampCount() { const g = stampsGot(); return STAMPS.filter((t) => g[t.id]).length; }
function starryUnlocked() { return stampCount() === STAMPS.length; }
const GOLD_FILTER = 'sepia(1) saturate(5) hue-rotate(-12deg) brightness(1.12) drop-shadow(0 0 6px #ffd23f)';
const HEART_SVG = '<svg viewBox="0 0 40 36" width="100%" height="100%"><path d="M20 34 C6 24 1 17 1 10.5 C1 4.8 5.6 1 10.6 1 C14.6 1 18 3.4 20 7 C22 3.4 25.4 1 29.4 1 C34.4 1 39 4.8 39 10.5 C39 17 34 24 20 34 Z" fill="#ff4d8a" stroke="#fff" stroke-width="2.5"/></svg>';
const BIRD_SVG = '<svg viewBox="0 0 40 16" width="100%" height="100%"><path d="M2 12 Q11 1 20 11 Q29 1 38 12" fill="none" stroke="#2b2b3a" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
/** 王冠の絵 */
function crown(parent, w, style) {
  const d = el('div', null, Object.assign({ position: 'absolute', width: px(w), height: px(w * 0.7), pointerEvents: 'none' }, style || {}), parent);
  d.innerHTML = '<svg viewBox="0 0 100 70" width="100%" height="100%"><path d="M8 62 L4 18 L28 38 L50 6 L72 38 L96 18 L92 62 Z" fill="#ffd23f" stroke="#b8860b" stroke-width="5" stroke-linejoin="round"/>' +
    '<circle cx="50" cy="44" r="7" fill="#ff4d8a"/><circle cx="26" cy="50" r="5" fill="#4cc3ff"/><circle cx="74" cy="50" r="5" fill="#8ee05a"/></svg>';
  return d;
}
/** スタンプ1つの絵（はんこ風の丸）。got でなければ、うすい影と「？」 */
function stampIcon(parent, t, size, got, style) {
  const c = el('div', null, Object.assign({
    position: 'absolute', width: px(size), height: px(size), borderRadius: '50%', overflow: 'hidden', boxSizing: 'border-box',
    border: (size * 0.06) + 'px ' + (got ? 'solid #e53935' : 'dashed #b9aea0'), background: '#fffaf0',
  }, style || {}), parent);
  const inner = el('div', null, { position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }, c);
  if (t.img) pic(t.img, null, { width: '86%', height: '86%', objectFit: 'contain' }, inner);
  else if (t.pic) {   // 絵（ふつう）の うしろに 色
    inner.style.background = t.swatch ? swatchBg(t.swatch) : t.bg;
    pic(t.pic, null, { width: '84%', height: '84%', objectFit: 'contain' }, inner);
  } else if (t.pair) {   // おそろい：同じ色の ハート 2つ
    inner.style.background = '#ffe9a8';
    [[0.14, 0.3], [0.5, 0.3]].forEach((q) => {
      const h = el('div', null, { position: 'absolute', left: (q[0] * 100) + '%', top: (q[1] * 100) + '%', width: '36%', height: '33%' }, inner);
      h.innerHTML = HEART_SVG;
    });
  }
  else if (t.kid) {   // 金色の男の子（走る絵の1こま目）
    const sh = IMG.kid_walk, ch = size * 0.8, cw = ch * (sh.naturalWidth / KID_FRAMES) / sh.naturalHeight;
    el('div', null, { width: px(cw), height: px(ch), backgroundImage: 'url(' + src('kid_walk') + ')', backgroundSize: (KID_FRAMES * 100) + '% 100%',
      imageRendering: 'pixelated', filter: GOLD_FILTER }, inner);
  } else if (t.heart) {   // にっこり てんし：顔のない天使に、ハート
    inner.style.background = '#ffe3f0';
    pic('angel_line', null, { position: 'absolute', width: '92%', height: '92%', objectFit: 'contain' }, inner);
    const h = el('div', null, { position: 'absolute', left: '33%', top: '36%', width: '34%', height: '31%' }, inner);
    h.innerHTML = HEART_SVG;
  } else if (t.bird) {
    inner.style.background = 'linear-gradient(#4cc3ff,#a9e3ff)';
    [[0.18, 0.3, 0.42], [0.52, 0.52, 0.3], [0.3, 0.68, 0.24]].forEach((b) => {
      const d = el('div', null, { position: 'absolute', left: (b[0] * 100) + '%', top: (b[1] * 100) + '%', width: (b[2] * 100) + '%', height: (b[2] * 40) + '%' }, inner);
      d.innerHTML = BIRD_SVG;
    });
  } else if (t.text) {
    inner.style.background = t.bg || '#1b1446';
    const tx = el('div', null, { fontFamily: 'TitlePop, Nurie, sans-serif', fontSize: px(size * 0.42), color: t.bg ? '#ffffff' : '#ffd23f' }, inner);
    tx.textContent = t.text;
  } else {
    inner.style.background = swatchBg(t.swatch);
    pic('easy_line', null, { width: '92%', height: '92%', objectFit: 'contain' }, inner);
  }
  if (!got) {
    inner.style.filter = 'grayscale(1)';
    inner.style.opacity = '0.18';
    const q = el('div', null, { position: 'absolute', inset: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: px(size * 0.5), color: '#b9aea0' }, c);
    q.textContent = '？';
  }
  return c;
}
/** かくしを見つけたら、スタンプを押す（はじめての時だけ「ぽん！」） */
function awardStamp(id, root) {
  if (!STAMPS.find((q) => q.id === id)) return;   // すたんぷに入っていないもの
  const st = loadStore();
  st.stamps = st.stamps || {};
  if (st.stamps[id]) return;
  st.stamps[id] = Date.now();
  writeStore(st);
  document.querySelectorAll('.stampcount').forEach((e) => { e.textContent = stampCount() + '/' + STAMPS.length; });   // 右上のボタンの数も
  const t = STAMPS.find((q) => q.id === id);
  if (!t || !root.isConnected) return;
  say('stamp');
  const layer = el('div', null, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '40' }, root);
  const back = el('div', null, { position: 'absolute', inset: '0', background: 'rgba(255,255,255,0.82)' }, layer);
  back.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
  const S = 240;
  const ttl = label('かくし すたんぷ！', 60, '#e53935', { left: '0', right: '0', top: px(view.h / 2 - S / 2 - 100) }, layer);
  const ic = stampIcon(layer, t, S, true, { left: px(view.w / 2 - S / 2), top: px(view.h / 2 - S / 2), transform: 'rotate(-12deg)' });
  const n = stampCount();
  const cnt = label(n + ' / ' + STAMPS.length, 48, '#404073', { left: '0', right: '0', top: px(view.h / 2 + S / 2 + 20) }, layer);
  const lvRow = lvStars(layer, t.lv, 54, { left: px(view.w / 2 + S / 2 - 10), top: px(view.h / 2 - S / 2 - 10) });
  lvRow.animate([{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 350, delay: 500, fill: 'both', easing: 'cubic-bezier(0.34,1.56,0.64,1)' });
  ic.animate([{ transform: 'scale(2.6) rotate(-30deg)', opacity: 0 }, { transform: 'scale(0.92) rotate(-12deg)', opacity: 1, offset: 0.7 }, { transform: 'scale(1) rotate(-12deg)', opacity: 1 }],
    { duration: 420, easing: 'ease-in' });
  [ttl, cnt].forEach((e) => e.animate([{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 400, delay: 300, fill: 'both' }));
  setTimeout(() => { se('undo', 0.6); sparkle(layer, view.w / 2, view.h / 2, 14); }, 300);
  setTimeout(() => se('save'), 450);
  setTimeout(() => {
    layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).onfinish = () => {
      layer.remove();
      if (n === STAMPS.length && root.isConnected) celebrate75(root);   // ぜんぶ そろった！ → 75しゅうねんの おいわい
    };
  }, 2200);
}
/** クレジット（声・フォント） */
function showCredits(root) {
  const ov = el('div', null, { position: 'absolute', inset: '0', background: 'rgba(20,15,50,0.72)', zIndex: '70' }, root);
  const PW = 1020, PH = 640;
  const panel = el('div', null, { position: 'absolute', left: px(view.w / 2 - PW / 2), top: px(Math.max(10, view.h / 2 - PH / 2)), width: px(PW), height: px(PH),
    background: '#fffaf0', borderRadius: '28px', border: '6px solid #c9b8a0', boxSizing: 'border-box', padding: '22px 44px', color: '#403333',
    fontSize: '23px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }, ov);
  const h = el('div', null, { fontSize: '38px', color: '#c45d7a', textAlign: 'center', marginBottom: '8px' }, panel);
  h.textContent = 'クレジット';
  const body = el('div', null, null, panel);
  body.textContent =
    '【声】\n' +
    '音声合成：Open JTalk\n' +
    '声のデータ：HTS voice「tohoku-f01」\n' +
    '　© 2015 東北大学 伊藤・能勢研究室\n' +
    '　ライセンス：CC BY 4.0　https://creativecommons.org/licenses/by/4.0/\n' +
    '　このゲームの せりふを 作り、音の 大きさ・前後の 無音を ととのえて 使っています。\n\n' +
    '【フォント】\n' +
    'Noto Sans CJK（SIL Open Font License 1.1）\n' +
    'Mochiy Pop One（SIL Open Font License 1.1）';
  const f = el('div', null, { position: 'absolute', left: '0', right: '0', bottom: '14px', textAlign: 'center', fontSize: '22px', color: '#8a7a66' }, panel);
  f.textContent = 'さわると とじるよ';
  panel.animate([{ transform: 'scale(0.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 250, easing: 'ease-out' });
  ov.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  onTap(ov, () => { se('click'); ov.remove(); });
}
/** すたんぷ ぜんぶ：15この すたんぷが あつまって 1つの メダルに なり、75しゅうねんを おいわい */
function celebrate75(root) {
  const W = view.w, H = view.h, cx = W / 2, cy = H / 2 + 6;
  const layer = el('div', null, { position: 'absolute', inset: '0', zIndex: '60', overflow: 'hidden' }, root);
  const bg = el('div', null, { position: 'absolute', inset: '0', background: 'radial-gradient(circle at 50% 50%, #3a2a8c 0%, #170f45 60%, #0b0826 100%)' }, layer);
  bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, fill: 'both' });
  // 花火（canvas）
  const cv = el('canvas', null, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' }, layer);
  cv.width = Math.round(W); cv.height = Math.round(H);
  const g = cv.getContext('2d');
  const parts = [];
  const PAL = ['#ff4d4d', '#ffd93b', '#4cc3ff', '#8ee05a', '#ff8fcf', '#a46bff', '#ffffff', '#ff9a3c'];
  function burst(x, y, big) {
    se('paint', rand(0.45, 0.6), -4);
    const c1 = PAL[Math.floor(Math.random() * PAL.length)], c2 = PAL[Math.floor(Math.random() * PAL.length)];
    const n = big ? 90 : 60;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * 2 * i / n + rand(-0.05, 0.05), v = rand(big ? 260 : 180, big ? 420 : 320);
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(1.1, 1.6), age: 0, c: i % 3 ? c1 : c2 });
    }
  }
  let run = true, last = performance.now();
  const step = (now) => {
    if (!run || !layer.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.age += dt;
      if (q.age > q.life) { parts.splice(i, 1); continue; }
      q.vx *= 0.97; q.vy = q.vy * 0.97 + 260 * dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      g.globalAlpha = Math.max(0, 1 - q.age / q.life); g.fillStyle = q.c;
      g.beginPath(); g.arc(q.x, q.y, 4, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);

  // 1) 15この すたんぷが 輪に なって あらわれる
  const S = 92, R = Math.min(H * 0.36, 250);
  const ring = el('div', null, { position: 'absolute', left: px(cx), top: px(cy), width: '0', height: '0' }, layer);
  const icons = STAMPS.map((t, i) => {
    const a = -Math.PI / 2 + Math.PI * 2 * i / STAMPS.length;
    const x = Math.cos(a) * R, y = Math.sin(a) * R;
    const ic = stampIcon(ring, t, S, true, { left: px(x - S / 2), top: px(y - S / 2) });
    ic.animate([{ transform: 'scale(0) rotate(-40deg)', opacity: 0 }, { transform: 'scale(1.15) rotate(8deg)', opacity: 1, offset: 0.7 }, { transform: 'scale(1) rotate(0deg)', opacity: 1 }],
      { duration: 380, delay: 200 + i * 70, easing: 'ease-out', fill: 'both' });
    setTimeout(() => se('tap', 0.9 + i * 0.05, -6), 200 + i * 70);
    return { ic: ic, x: x, y: y };
  });
  const T1 = 200 + STAMPS.length * 70 + 450;   // ならび おわり
  // 2) くるくる 回りながら まん中へ あつまる
  ring.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 1500, delay: T1, easing: 'cubic-bezier(0.5,0,0.8,0.4)', fill: 'forwards' });
  icons.forEach((o, i) => {
    o.ic.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + px(-o.x) + ',' + px(-o.y) + ') scale(0.35)', opacity: 0.9 }],
      { duration: 1100, delay: T1 + 400 + i * 12, easing: 'cubic-bezier(0.6,0,0.9,0.5)', fill: 'forwards' });
  });
  setTimeout(() => se('undo', 0.5, -2), T1 + 300);
  const T2 = T1 + 1550;   // あつまった！
  // 3) ピカッ → メダル
  const flash = el('div', null, { position: 'absolute', inset: '0', background: '#ffffff', opacity: '0', pointerEvents: 'none' }, layer);
  flash.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 0 }], { duration: 900, delay: T2, fill: 'both' });
  setTimeout(() => { ring.remove(); se('fanfare'); say('celebrate75'); }, T2 + 120);
  const E = Math.min(290, H * 0.42);
  const grp = el('div', null, { position: 'absolute', inset: '0', pointerEvents: 'none' }, layer);   // メダルの まとまり（あとで 上へ すこし うごかす）
  // うしろで まわる 光
  const rays = el('div', null, { position: 'absolute', left: px(cx - E * 1.6), top: px(cy - E * 1.6), width: px(E * 3.2), height: px(E * 3.2), borderRadius: '50%', pointerEvents: 'none',
    background: 'repeating-conic-gradient(rgba(255,230,120,0.38) 0deg 9deg, rgba(255,230,120,0) 9deg 22.5deg)',
    WebkitMaskImage: 'radial-gradient(circle, #000 30%, transparent 70%)', maskImage: 'radial-gradient(circle, #000 30%, transparent 70%)' }, grp);
  rays.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: T2, fill: 'both' });
  rays.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 24000, iterations: Infinity });
  const medal = el('div', null, { position: 'absolute', left: px(cx - E / 2), top: px(cy - E / 2 - 10), width: px(E), height: px(E), borderRadius: '50%', boxSizing: 'border-box',
    border: '10px solid #fff6c8', background: SPECIAL_CSS.gold, boxShadow: '0 0 40px 10px rgba(255,214,80,0.7), inset 0 0 0 8px #b8860b' }, grp);
  pic('title_logo', null, { position: 'absolute', left: '12%', top: '12%', width: '76%', height: '76%', objectFit: 'contain' }, medal);
  medal.animate([{ transform: 'scale(0) rotate(-200deg)', opacity: 0 }, { transform: 'scale(1.15) rotate(10deg)', opacity: 1, offset: 0.7 }, { transform: 'scale(1) rotate(0deg)', opacity: 1 }],
    { duration: 800, delay: T2 + 80, easing: 'ease-out', fill: 'both' });
  medal.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }], { duration: 700, delay: T2 + 900, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
  setTimeout(() => sparkle(layer, cx, cy, 18), T2 + 300);
  // 4) 文字
  const top = label('てんしようちえん', Math.min(64, H * 0.085), '#ffffff', { left: '0', right: '0', top: px(Math.max(14, cy - E / 2 - 112)), WebkitTextStrokeColor: '#c45d7a' }, layer);
  const bottom = label('75しゅうねん おめでとう！', Math.min(76, H * 0.1), '#ffd23f', { left: '0', right: '0', top: px(cy + E / 2 + 22), WebkitTextStrokeColor: '#e8590c' }, grp);
  top.animate([{ transform: 'translateY(-40px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 600, delay: T2 + 600, easing: 'ease-out', fill: 'both' });
  bottom.animate([{ transform: 'scale(0.3)', opacity: 0 }, { transform: 'scale(1.1)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 700, delay: T2 + 900, easing: 'ease-out', fill: 'both' });
  // 紙ふぶき と 花火
  setTimeout(() => {
    for (let i = 0; i < 70; i++) {
      const dur = rand(2.6, 4.2);
      const c = el('div', 'confetti', { background: PAL[i % PAL.length], width: px(rand(12, 22)), height: px(rand(18, 30)), left: (Math.random() * 100) + '%', top: px(-40),
        animationDuration: dur + 's', animationDelay: (-Math.random() * dur) + 's', pointerEvents: 'none' }, layer);
      c.style.setProperty('--dist', px(Math.max(H, 1000) + 80)); c.style.setProperty('--rot', rand(-8, 8) + 'rad');
    }
  }, T2 + 200);
  for (let i = 0; i < 12; i++) setTimeout(() => { if (layer.isConnected) burst(rand(W * 0.08, W * 0.92), rand(H * 0.1, H * 0.45), i % 3 === 0); }, T2 + 400 + i * 650);
  // 5) パーティの ごあんない：メダルを すこし 上へ。下から カードが のぼってくる
  const T3 = T2 + 3400, LIFT = Math.min(150, H * 0.2);
  top.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: T3, fill: 'forwards' });
  grp.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(' + px(-LIFT) + ') scale(0.82)' }], { duration: 700, delay: T3, easing: 'ease-in-out', fill: 'forwards' });
  const CW = Math.min(980, W - 40), CH = Math.min(250, H * 0.36);
  const card = el('div', null, { position: 'absolute', left: px((W - CW) / 2), bottom: '20px', width: px(CW), height: px(CH), borderRadius: '30px', boxSizing: 'border-box',
    background: 'linear-gradient(#fffaf0, #fff0d6)', border: '8px solid #ffd23f', boxShadow: '0 0 0 5px #fff, 0 12px 30px rgba(0,0,0,0.35)', pointerEvents: 'none', zIndex: '5' }, layer);
  card.animate([{ transform: 'translateY(' + px(CH + 60) + ')' }, { transform: 'translateY(-14px)', offset: 0.8 }, { transform: 'translateY(0)' }], { duration: 800, delay: T3 + 200, easing: 'ease-out', fill: 'both' });
  card.animate([{ boxShadow: '0 0 0 5px #fff, 0 0 18px 4px rgba(255,214,80,0.6)' }, { boxShadow: '0 0 0 5px #fff, 0 0 36px 14px rgba(255,214,80,0.95)' }],
    { duration: 900, delay: T3 + 1000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
  const fz = (n) => Math.round(n * CH / 250);
  label('15こ ぜんぶ みつけたね！ よく がんばりました！', fz(34), '#c45d7a', { left: '0', right: '0', top: px(fz(16)) }, card);
  label('とうじつは 75しゅうねんの パーティを するよ！', fz(40), '#5b4640', { left: '0', right: '0', top: px(fz(70)) }, card);
  label('この がめんを うけつけの ひとに みせてね！', fz(46), '#e8590c', { left: '0', right: '0', top: px(fz(128)), WebkitTextStrokeColor: '#fff6c8' }, card);
  const st = loadStore(), when = st.allStampsAt || Date.now();
  if (!st.allStampsAt) { st.allStampsAt = when; writeStore(st); }
  const d = new Date(when);
  label('15/15 たっせい　' + d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate(), fz(24), '#8a7a66', { left: '0', right: '0', top: px(fz(192)) }, card);
  // ゆびさし（うけつけへ）
  [-1, 1].forEach((sd) => {
    const st2 = el('div', null, { position: 'absolute', top: px(CH / 2 - 26), width: '52px', height: '52px', pointerEvents: 'none',
      left: sd < 0 ? '-26px' : px(CW - 26) }, card);
    st2.innerHTML = '<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M20 2 L25 15 L39 15 L28 24 L32 38 L20 30 L8 38 L12 24 L1 15 L15 15 Z" fill="#ffe27a" stroke="#d9a400" stroke-width="2.4" stroke-linejoin="round"/></svg>';
    st2.animate([{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(' + (sd * 30) + 'deg) scale(1.25)' }], { duration: 700, iterations: Infinity, direction: 'alternate' });
  });
  setTimeout(() => { if (layer.isConnected) { say('party75'); sparkle(layer, W / 2, H - CH / 2, 16); se('save'); } }, T3 + 900);
  // とじかた（うけつけで 見せるので、自動では とじない）
  const info = label('ほしぞらの いろが つかえるよ！　さわると もどるよ', 22, '#ffffff', { left: '0', right: '0', top: '8px', WebkitTextStrokeColor: '#1b1f5c' }, layer);
  info.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: T3 + 2500, fill: 'both' });
  let closable = false;
  setTimeout(() => { closable = true; }, T3 + 2500);
  function close() {
    if (!layer.isConnected) return;
    layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }).onfinish = () => { run = false; layer.remove(); };
  }
  layer.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  onTap(layer, () => { if (closable) { se('click'); close(); } });
}
function makeSwatchDot(parent, x, y, d) {
  const b = el('div', null, { position: 'absolute', left: px(x), top: px(y), width: px(d), height: px(d), borderRadius: '50%', border: '4px solid #fff', boxSizing: 'border-box', background: swatchBg('starry') }, parent);
  b.animate([{ transform: 'scale(0)' }, { transform: 'scale(1.2)' }, { transform: 'scale(1)' }], { duration: 500, delay: 1100, fill: 'both' });
  return b;
}
/** スタンプ帳（えらぶ画面の右上のボタン） */
function openStampBook(root) {
  const got = stampsGot(), n = stampCount(), all = n === STAMPS.length;
  const ov = el('div', null, { position: 'absolute', inset: '0', background: 'rgba(20,15,50,0.72)', zIndex: '30' }, root);
  const PW = 900, PH = 600;
  const panel = el('div', null, {
    position: 'absolute', left: px(view.w / 2 - PW / 2), top: px(Math.max(10, view.h / 2 - PH / 2)), width: px(PW), height: px(PH),
    background: '#fff6e0', borderRadius: '36px', border: '8px solid #e53935', boxSizing: 'border-box',
  }, ov);
  panel.animate([{ transform: 'scale(0.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300, easing: 'cubic-bezier(0.34,1.56,0.64,1)' });
  label('かくし すたんぷ', 54, '#e53935', { left: '0', right: '0', top: '20px' }, panel);
  label(n + ' / ' + STAMPS.length, 40, '#404073', { right: '36px', top: '30px' }, panel);
  // むずかしさごとに1段（左に ★〜★★★、右に その段の すたんぷ）
  const S = 100, gapX = 30, rowH = S + 26, top0 = 100, sx0 = 200;
  [1, 2, 3].forEach((lv, r) => {
    const y = top0 + r * rowH;
    el('div', null, { position: 'absolute', left: '22px', right: '22px', top: px(y - 6), height: px(S + 12), borderRadius: px((S + 12) / 2), background: LV_COLORS[lv] }, panel);
    lvStars(panel, lv, 44, { left: px(30 + (3 - lv) * 23), top: px(y + S / 2 - 22) });
    STAMPS.filter((t) => t.lv === lv).forEach((t, k) => {
      const i = r * 5 + k;
      const ic = stampIcon(panel, t, S, !!got[t.id], { left: px(sx0 + k * (S + gapX)), top: px(y), transform: got[t.id] ? 'rotate(' + ((i % 3) - 1) * 8 + 'deg)' : '' });
      ic.animate([{ transform: 'scale(0)' }, { transform: ic.style.transform || 'scale(1)' }], { duration: 300, delay: 60 * i, easing: 'cubic-bezier(0.34,1.56,0.64,1)', fill: 'backwards' });
      if (!got[t.id] && STAMP_HINTS[t.id]) {   // まだの すたんぷ：押すと ヒント
        ic.classList.add('hintable');
        ic.style.cursor = 'pointer';
        ic.addEventListener('pointerdown', (ev) => ev.stopPropagation());
        onTap(ic, () => { se('tap', 1.3); showHint(t.id, ic); });
      } else if (got[t.id] && STAMP_DONE[t.id]) {   // 見つけた すたんぷ：押すと、どうやって 見つけたか
        ic.style.cursor = 'pointer';
        ic.addEventListener('pointerdown', (ev) => ev.stopPropagation());
        onTap(ic, () => { se('tap', 1.5); showDone(t.id, ic); });
      }
    });
  });
  let footer = null;
  function showHint(id, ic) {
    if (footer) footer.remove();
    footer = el('div', null, { position: 'absolute', left: '0', right: '0', bottom: '0', height: '96px' }, panel);
    const h = STAMP_HINTS[id];
    label(h[0], 32, '#c45d7a', { left: '0', right: '0', top: '6px' }, footer);
    label(h[1], 32, '#c45d7a', { left: '0', right: '0', top: '48px' }, footer);
    footer.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 250 });
    panel.querySelectorAll('.hintsel').forEach((e) => e.classList.remove('hintsel'));
    ic.classList.add('hintsel');
    say('hint_' + id);
  }
  function showDone(id, ic) {
    if (footer) footer.remove();
    footer = el('div', null, { position: 'absolute', left: '0', right: '0', bottom: all ? '62px' : '0', height: '96px', background: '#fff6e0' }, panel);
    const h = STAMP_DONE[id];
    label(h[0], 30, '#2e7d4f', { left: '0', right: '0', top: '8px' }, footer);
    label(h[1], 30, '#2e7d4f', { left: '0', right: '0', top: '48px' }, footer);
    footer.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 250 });
    panel.querySelectorAll('.hintsel').forEach((e) => e.classList.remove('hintsel'));
    ic.animate([{ transform: ic.style.transform + ' scale(1)' }, { transform: ic.style.transform + ' scale(1.15)' }, { transform: ic.style.transform + ' scale(1)' }], { duration: 300 });
  }
  if (all) {
    crown(panel, 120, { left: '30px', top: '-56px', transform: 'rotate(-14deg)' });
    footer = label('ぜんぶ みつけたね！ よく がんばりました！', 30, '#e64d73', { left: '0', right: '0', bottom: '66px' }, panel);
    const pb = el('div', null, { position: 'absolute', left: '50%', bottom: '10px', width: '340px', marginLeft: '-170px', height: '50px', borderRadius: '25px', background: SPECIAL_CSS.gold,
      border: '4px solid #fff', boxShadow: '0 3px 0 rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', color: '#5a3a00', cursor: 'pointer' }, panel);
    pb.textContent = '75しゅうねんの おいわい';
    pb.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    onTap(pb, () => { bounce(pb); se('click'); ov.remove(); celebrate75(root); });
  } else {
    footer = el('div', null, { position: 'absolute', left: '0', right: '0', bottom: '0', height: '96px' }, panel);
    const hasHint = STAMPS.some((t) => !got[t.id] && STAMP_HINTS[t.id]);
    label(n > 0 ? (hasHint ? 'すたんぷを おすと せつめい、？を おすと ヒント' : 'すたんぷを おすと せつめい') : (hasHint ? 'どこに かくれて いるかな？ ？を おすと ヒント' : 'どこに かくれて いるかな？'), 30, '#8a7a66', { left: '0', right: '0', top: '34px' }, footer);
  }
  // リセット（左上）：2回 おすと すたんぷを ぜんぶ けす（まちがえて 消さないように）
  const rb = el('div', null, { position: 'absolute', left: '24px', top: '24px', width: '150px', height: '62px', boxSizing: 'border-box', borderRadius: '31px', background: '#ece3d3',
    border: '4px solid #fff', boxShadow: '0 3px 0 rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    fontSize: '26px', lineHeight: '1.05', color: '#8a7a66', cursor: 'pointer', whiteSpace: 'pre' }, panel);
  rb.textContent = 'リセット';
  let armed = 0;
  rb.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  onTap(rb, () => {
    if (performance.now() - armed < 4000) {
      const st = loadStore(); st.stamps = {}; delete st.allStampsAt; writeStore(st);
      document.querySelectorAll('.stampcount').forEach((e) => { e.textContent = '0/' + STAMPS.length; });
      se('undo');
      ov.remove();
      if (curFn === selectScreen) go(selectScreen); else openStampBook(root);
      return;
    }
    armed = performance.now();
    se('click');
    rb.textContent = 'もう1かい\nおすと けす';
    rb.style.fontSize = '20px'; rb.style.background = '#ffd6d6'; rb.style.color = '#c62828';
    setTimeout(() => { armed = 0; rb.textContent = 'リセット'; rb.style.fontSize = '26px'; rb.style.background = '#ece3d3'; rb.style.color = '#8a7a66'; }, 4000);
  });
  // パネルの 中を さわっても とじない（とじるのは 外 か ×）
  panel.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  const xb = el('div', null, { position: 'absolute', right: '-26px', top: '-26px', width: '64px', height: '64px', borderRadius: '50%', background: '#e53935',
    border: '5px solid #fff', boxSizing: 'border-box', color: '#fff', fontSize: '36px', lineHeight: '52px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 3px 0 rgba(0,0,0,0.15)' }, panel);
  xb.textContent = '×';
  onTap(xb, () => { se('click'); ov.remove(); });
  onTap(ov, () => { se('click'); ov.remove(); });
}
function stampButton(root, pos) {
  const n = stampCount(), all = n === STAMPS.length;
  const b = el('div', 'btn', Object.assign({ width: '96px', height: '96px', background: '#fffaf0', borderColor: '#e53935', flexDirection: 'column' }, pos), root);
  const tx = el('div', 'stampcount', { fontSize: '30px', color: '#e53935', lineHeight: '1' }, b);
  tx.textContent = n + '/' + STAMPS.length;
  const st = el('div', null, { fontSize: '20px', color: '#e53935', lineHeight: '1.2' }, b);
  st.textContent = 'すたんぷ';
  if (all) crown(b, 64, { left: '10px', top: '-40px', transform: 'rotate(-12deg)' });
  onTap(b, () => { bounce(b); se('click'); openStampBook(root); });
  return b;
}

// ---------- きねん しゃしん（ぜんぶの絵を「できた！」にすると、とれる） ----------
function albumKeys() { return ORDER.filter((k) => UNDER_CONSTRUCTION.indexOf(k) < 0).concat([SECRET_KEY]); }
function markDone(key) {
  const st = loadStore();
  st.done = st.done || {};
  st.done[key] = true;
  writeStore(st);
}
function albumReady() { const d = loadStore().done || {}; return albumKeys().every((k) => d[k]); }
function loadImg(srcUrl) {
  return new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = srcUrl; });
}
/** 3枚の絵を並べた、75周年の記念写真 */
function loadAlbumImages() {
  return Promise.all(albumKeys().map((k) => {
    const th = loadThumb('done_' + k) || loadThumb(k);
    return th ? loadImg(th) : Promise.resolve(IMG[(k === SECRET_KEY ? SECRET : LEVELS[k]).line]);
  }));
}
function makeAlbumPhoto(ims, name) {
  const keys = albumKeys();
  const PW = 1800, PH = 1180 + (name ? 100 : 0), M = 70, G = 40, n = keys.length;
  const box = (PW - M * 2 - G * (n - 1)) / n;
  const c = document.createElement('canvas');
  c.width = PW; c.height = PH;
  const x = c.getContext('2d');
  const bg = x.createLinearGradient(0, 0, 0, PH);
  bg.addColorStop(0, '#a9d9fd'); bg.addColorStop(1, '#fff4dc');
  x.fillStyle = bg; x.fillRect(0, 0, PW, PH);
  for (let i = 0; i < 120; i++) {   // 紙ふぶき
    x.fillStyle = COLORS[i % 10]; x.save();
    x.translate(Math.random() * PW, Math.random() * PH); x.rotate(Math.random() * 6);
    x.fillRect(-7, -11, 14, 22); x.restore();
  }
  const L = IMG.title_logo_big, lh = 300, lw = lh * L.naturalWidth / L.naturalHeight;
  x.drawImage(L, (PW - lw) / 2, 16, lw, lh);
  const top = 340;
  keys.forEach((k, i) => {
    const bx = M + i * (box + G);
    x.fillStyle = '#ffffff'; x.fillRect(bx, top, box, box);
    const im = ims[i];
    if (im) {
      const s = Math.min(box / im.naturalWidth, box / im.naturalHeight), w = im.naturalWidth * s, h = im.naturalHeight * s;
      x.drawImage(im, bx + (box - w) / 2, top + (box - h) / 2, w, h);
    }
    x.strokeStyle = '#ffb300'; x.lineWidth = 12; x.strokeRect(bx - 6, top - 6, box + 12, box + 12);
    x.font = '52px Nurie'; x.textAlign = 'center'; x.textBaseline = 'top';
    x.lineJoin = 'round'; x.strokeStyle = '#ffffff'; x.lineWidth = 16;
    x.strokeText(NAMES[k], bx + box / 2, top + box + 22); x.fillStyle = '#403333'; x.fillText(NAMES[k], bx + box / 2, top + box + 22);
  });
  if (name) drawName(x, name, PW / 2, PH - 60, 64);
  const t = '75しゅうねん きねん', ty = PH - 150 - (name ? 100 : 0);
  x.font = '84px Nurie'; x.lineWidth = 26; x.strokeStyle = '#ffffff';
  x.strokeText(t, PW / 2, ty); x.fillStyle = '#e64d73'; x.fillText(t, PW / 2, ty);
  x.font = '40px Nurie'; x.lineWidth = 12; x.strokeText(photoDate(), PW / 2, ty + 96); x.fillStyle = '#8a7a66'; x.fillText(photoDate(), PW / 2, ty + 96);
  const B = IMG.title_logo;
  x.drawImage(B, 60, ty - 40, 160, 160);
  draw75Badge(x, PW - 140, ty + 40, 95);
  return c;
}
function albumButton(root, pos) {
  const wrap = el('div', null, Object.assign({ position: 'absolute', width: '96px', height: '96px' }, pos), root);
  for (let i = 0; i < 2; i++) el('div', 'photoring', { animationDelay: (i * 0.8) + 's' }, wrap);
  let ims = null;
  loadAlbumImages().then((r) => { ims = r; });
  const b = iconButton(wrap, 'icon_photo', 96, '#ffb300', { left: '0', top: '0' }, () => {
    askName(root, (name) => {
      if (ims) sharePhoto(canvasBlobSync(makeAlbumPhoto(ims, name)));
      else loadAlbumImages().then((r) => sharePhoto(canvasBlobSync(makeAlbumPhoto(r, name))));
    });
  });
  crown(wrap, 54, { left: '20px', top: '-34px' });
  return b;
}

// ---------- 演出 ----------
function sparkle(layer, x, y, count) {
  for (let i = 0; i < count; i++) {
    const s = pic('icon_star', null, { position: 'absolute', width: '40px', height: '40px', left: px(x - 20), top: px(y - 20) }, layer);
    const a = Math.random() * Math.PI * 2, r = rand(50, 150);
    const anim = s.animate([
      { transform: 'translate(0,0) rotate(0rad)', opacity: 1 },
      { transform: 'translate(' + px(Math.cos(a) * r) + ',' + px(Math.sin(a) * r) + ') rotate(' + rand(-3, 3) + 'rad)', opacity: 0 },
    ], { duration: 600, easing: 'ease-out', fill: 'forwards' });
    anim.onfinish = () => s.remove();
  }
}
function flashSaved(root, panelW) {
  const f = el('div', null, { position: 'absolute', inset: '0', background: 'rgba(255,255,255,0.85)', pointerEvents: 'none' }, root);
  f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).onfinish = () => f.remove();
  const m = label('ほぞんしたよ！', 64, '#8c4dd9', { left: '0', right: px(panelW), top: '42%' }, root);
  m.animate([{ opacity: 1 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 1600, fill: 'forwards' }).onfinish = () => m.remove();
}
/** 色のボタンを並べる（5列）：いつもの色＋はだいろ／たのしい色／とくべつな色（金のわく）／園章の色（えんじのわく） */
// かくし：色を「あか → だいだい → きいろ → みどり → あお → むらさき」の順に押すと、にじの メロディ
const RAINBOW_SEQ = [['#ff4d4d'], ['#ff9a3c'], ['#ffd93b'], ['#8ee05a', '#2fb36d'], ['#4cc3ff', '#3b6cff'], ['#a46bff']];
function rainbowMelody(root, panel) {
  const notes = [1, 1.12, 1.26, 1.33, 1.5, 1.68, 1.89, 2];   // ド レ ミ ファ ソ ラ シ ド
  notes.forEach((n, i) => setTimeout(() => se('tap', n), 300 + i * 170));
  // 大きな にじ
  const W = Math.min(900, view.w - 340), H = W * 0.5;
  const arc = el('div', null, { position: 'absolute', left: px((view.w - 300 - W) / 2), top: px(view.h / 2 - H / 2), width: px(W), height: px(H), pointerEvents: 'none', zIndex: '25' }, root);
  const cols = ['#ff4d4d', '#ff9a3c', '#ffd93b', '#8ee05a', '#4cc3ff', '#3b6cff', '#a46bff'];
  arc.innerHTML = '<svg viewBox="0 0 200 100" width="100%" height="100%">' + cols.map((c, i) =>
    '<path d="M' + (10 + i * 7) + ' 100 A' + (90 - i * 7) + ' ' + (90 - i * 7) + ' 0 0 1 ' + (190 - i * 7) + ' 100" fill="none" stroke="' + c + '" stroke-width="7.4"/>').join('') + '</svg>';
  arc.animate([{ clipPath: 'inset(0 100% 0 0)', opacity: 1 }, { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: 0.4 }, { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: 0.8 }, { clipPath: 'inset(0 0 0 0)', opacity: 0 }],
    { duration: 3000, fill: 'forwards' }).onfinish = () => arc.remove();
  sparkle(root, view.w - 150, view.h / 2, 12);
  setTimeout(() => awardStamp('melody', root), 3000);
}
/** 横長の画面（スマホ）で、絵の横に余りがあれば、右のパネルを広げて色のボタンを大きくする */
function panelWidth(picAspect) { return view.w - 24 - (view.h - 32) * picAspect >= 420 ? 420 : 300; }
/** ぬりえ用：絵の よこに あまった はばを パネルに まわす（380〜620）。パネルが ひろいほど 色ボタンが 大きくなる */
function panelWidthFlex(picAspect, minW) { return Math.round(Math.max(minW || 380, Math.min(620, view.w - 24 - (view.h - 32) * picAspect))); }
function buildPalette(panel, panelW, baseColors, sw, gap, top, onPick, maxBottom, extra) {
  const items = [];
  let rbStep = 0, rbAt = 0;
  const rbCheck = (c) => {
    const now = performance.now();
    if (now - rbAt > 5000) rbStep = 0;
    rbAt = now;
    if (RAINBOW_SEQ[rbStep].indexOf(c) >= 0) rbStep++;
    else if (RAINBOW_SEQ[rbStep - 1] && RAINBOW_SEQ[rbStep - 1].indexOf(c) >= 0) { /* 同じ色をもう一度：そのまま */ }
    else rbStep = RAINBOW_SEQ[0].indexOf(c) >= 0 ? 1 : 0;
    if (rbStep === RAINBOW_SEQ.length) { rbStep = 0; rainbowMelody(panel.parentElement, panel); }
  };
  const groups = [
    { colors: baseColors.concat(SKIN_COLORS) },
    { colors: FUN_COLORS },
    { colors: starryUnlocked() ? SPECIAL_COLORS.concat(['starry']) : SPECIAL_COLORS, frame: 'special' },
    { colors: CREST_COLORS, frame: 'crest' },
  ];
  if (extra) groups.push(extra);
  let cols = panelW >= 420 ? 6 : 5;
  if (maxBottom) {
    // 色ボタンを できるだけ 大きく：列の数を かえて、はば・高さに いちばん 大きく おさまる 大きさを えらぶ
    gap = 10;
    let best = null;
    for (let c = 5; c <= 10; c++) {
      const rows = groups.reduce((a, g) => a + Math.ceil(g.colors.length / c), 0);
      const byW = (panelW - 36 - gap * (c - 1)) / c;
      const byH = (maxBottom - top - 18 * (groups.length - 1) - gap * (rows - groups.length)) / rows;
      const size = Math.min(byW, byH, 112);
      if (!best || size > best.size + 0.5) best = { c: c, size: size };
    }
    cols = best.c; sw = Math.floor(best.size);
  }
  const gridW = sw * cols + gap * (cols - 1);
  const x0 = (panelW - gridW) / 2;
  let y = top, idx = 0;
  const all = [];
  groups.forEach((g) => {
    const rows = Math.ceil(g.colors.length / cols);
    if (g.frame) {
      const box = el('div', 'palframe ' + g.frame, {
        left: px(x0 - 7), top: px(y - 7), width: px(gridW + 14), height: px(rows * sw + (rows - 1) * gap + 14),
      }, panel);
      if (g.frame === 'crest') pic('title_logo', 'crestmark', { left: '-14px', top: '-14px', width: '30px', height: '30px' }, box);
      if (g.frame === 'special') pic('icon_star', 'crestmark', { left: '-14px', top: '-14px', width: '30px', height: '30px' }, box);
      if (g.frame === 'title') pic('title_scene', 'crestmark', { left: '-16px', top: '-16px', width: '34px', height: '34px', objectFit: 'cover', border: '2px solid #fff' }, box);
    }
    g.colors.forEach((c, j) => {
      const r = Math.floor(j / cols), k = j % cols;
      const i = idx++;
      all.push(c);
      items.push(makeSwatch(panel, c, sw, x0 + k * (sw + gap), y + r * (sw + gap), () => { onPick(i); rbCheck(c); }));
    });
    y += rows * sw + (rows - 1) * gap + 18;
  });
  return { items: items, all: all, bottom: y - 18 };
}
function makeSwatch(panel, color, sw, x, y, onTapFn) {
  const b = el('div', 'sw', { left: px(x), top: px(y), width: px(sw), height: px(sw), background: swatchBg(color) }, panel);
  onTap(b, () => onTapFn());
  return b;
}
function markSelected(items, i) {
  items.forEach((b, k) => b.classList.toggle('sel', k === i));
}

// ======================= 写真に保存 =======================
/** 写真用の画像：絵＋まわりの枠＋下にタイトルロゴ */
/** とくべつな色の背景（金・銀・にじはグラデーション、きらきら・みずたまは模様） */
function specialFill(x, c, W, H) {
  const g = x.createLinearGradient(0, 0, W, H);
  if (c === 'gold' || c === 'silver') {
    const cs = c === 'gold' ? ['#b8860b', '#ffe37a', '#c9930f', '#fff1b0', '#a8780a'] : ['#7d858d', '#f4f6f8', '#a9b0b7', '#ffffff', '#7d858d'];
    [0, 0.3, 0.5, 0.75, 1].forEach((o, i) => g.addColorStop(o, cs[i]));
    return g;
  }
  if (c === 'rainbow') {
    ['#ff4d4d', '#ff9a3c', '#ffd93b', '#8ee05a', '#4cc3ff', '#3b6cff', '#a46bff'].forEach((col, i) => g.addColorStop(i / 6, col));
    return g;
  }
  const T = 224, tile = document.createElement('canvas');
  tile.width = T; tile.height = T;
  const tc = tile.getContext('2d'), im = tc.createImageData(T, T), fn = colorFn(c, 1000, 1000);
  for (let yy = 0; yy < T; yy++) for (let xx = 0; xx < T; xx++) {
    const v = fn(xx, yy), o = (yy * T + xx) * 4;
    im.data[o] = v[0]; im.data[o + 1] = v[1]; im.data[o + 2] = v[2]; im.data[o + 3] = 255;
  }
  tc.putImageData(im, 0, 0);
  return x.createPattern(tile, 'repeat');
}
function makePhotoCanvas(picW, picH, drawPic, gold, name) {
  const PW = 1200, pad = 50, w = PW - pad * 2, h = Math.round(w * picH / picW), logoH = 230, nameH = name ? 90 : 0;
  const c = document.createElement('canvas');
  c.width = PW; c.height = pad + h + logoH + nameH;
  const x = c.getContext('2d');
  // gold：とくべつな天使の時は、その色（'gold' 'silver' 'rainbow' 'glitter' 'dots'）の背景とわく、四すみに星
  x.fillStyle = gold ? specialFill(x, gold, PW, c.height) : '#fff4dc';
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = '#ffffff'; x.fillRect(pad, pad, w, h);
  drawPic(x, pad, pad, w, h);
  x.strokeStyle = gold ? '#fff6c8' : '#ffb300'; x.lineWidth = 12; x.strokeRect(pad - 6, pad - 6, w + 12, h + 12);
  if (gold) {
    const S = IMG.icon_star;
    [[pad - 40, pad - 40], [PW - pad - 50, pad - 40], [pad - 40, pad + h - 50], [PW - pad - 50, pad + h - 50]].forEach((q) => x.drawImage(S, q[0], q[1], 90, 90));
  }
  const L = IMG.title_logo_big;
  const lh = logoH - 24, lw = lh * L.naturalWidth / L.naturalHeight;
  x.drawImage(L, (PW - lw) / 2, pad + h + 12, lw, lh);
  const B = IMG.title_logo;
  x.drawImage(B, 40, pad + h + 50, 140, 140);
  x.drawImage(B, PW - 180, pad + h + 50, 140, 140);
  draw75Badge(x, PW - pad - 80, pad + 80, 96);
  x.font = '30px Nurie, sans-serif'; x.textAlign = 'right'; x.textBaseline = 'bottom'; x.lineJoin = 'round';
  x.lineWidth = 8; x.strokeStyle = '#ffffff'; x.strokeText(photoDate(), PW - pad - 20, pad + h - 14);
  x.fillStyle = '#8a7a66'; x.fillText(photoDate(), PW - pad - 20, pad + h - 14);
  if (name) drawName(x, name, PW / 2, pad + h + logoH + 30, 60);
  return c;
}
/** 写真の 75しゅうねん バッジ（金の まる）と 日づけ */
function photoDate() { const d = new Date(); return d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate(); }
function draw75Badge(x, cx, cy, r) {
  x.save();
  x.shadowColor = 'rgba(120,80,0,0.35)'; x.shadowBlur = r * 0.12; x.shadowOffsetY = r * 0.05;
  const g = x.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, '#a8780a'); g.addColorStop(0.35, '#ffe37a'); g.addColorStop(0.55, '#c9930f'); g.addColorStop(0.75, '#fff1b0'); g.addColorStop(1, '#b8860b');
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
  x.restore();
  x.lineWidth = r * 0.08; x.strokeStyle = '#ffffff'; x.beginPath(); x.arc(cx, cy, r * 0.96, 0, Math.PI * 2); x.stroke();
  x.lineWidth = r * 0.03; x.strokeStyle = '#8a5a00'; x.beginPath(); x.arc(cx, cy, r * 0.8, 0, Math.PI * 2); x.stroke();
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  const t = (str, y, size, fill, stroke, font) => {
    x.font = size + 'px ' + (font || 'Nurie') + ', sans-serif'; x.lineWidth = size * 0.22; x.strokeStyle = stroke; x.strokeText(str, cx, y);
    x.fillStyle = fill; x.fillText(str, cx, y);
  };
  t('75', cy - r * 0.12, r * 0.72, '#ffffff', '#b8600b', 'TitlePop, Nurie');
  t('しゅうねん', cy + r * 0.45, r * 0.24, '#7a3d00', '#fff6c8');
}
function canvasToBlob(c) { return new Promise((ok) => c.toBlob((b) => ok(b), 'image/png')); }
/** すぐに画像にする（iPhone は、押した直後でないと共有メニューが開かないため） */
function canvasBlobSync(c) {
  const b = atob(c.toDataURL('image/png').split(',')[1]), u = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return new Blob([u], { type: 'image/png' });
}
/** 写真の下に「〇〇 さく」 */
function drawName(x, name, cx, y, size) {
  x.font = size + 'px Nurie, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  x.lineWidth = size * 0.3; x.strokeStyle = '#ffffff'; x.strokeText(name + ' さく', cx, y);
  x.fillStyle = '#403333'; x.fillText(name + ' さく', cx, y);
}
/**
 * 写真に名前を入れる（おうちの人向け）。入れた名前はこの端末に覚えておく。
 * done(name) は、OK／なまえなし を押した時に呼ぶ（そのまま共有するので、押した時に呼ぶ）
 */
function askName(root, done) {
  const st = loadStore();
  const ov = el('div', null, { position: 'absolute', inset: '0', background: 'rgba(20,15,50,0.6)', zIndex: '50' }, root);
  const PW = 760, PH = 300;
  const box = el('div', null, { position: 'absolute', left: px(view.w / 2 - PW / 2), top: '30px', width: px(PW), height: px(PH), background: '#fff6e0',
    borderRadius: '30px', border: '8px solid #ff5a8a', boxSizing: 'border-box' }, ov);
  label('しゃしんに なまえを いれる？', 40, '#e64d73', { left: '0', right: '0', top: '18px' }, box);
  const inp = el('input', null, { position: 'absolute', left: '40px', right: '40px', top: '96px', height: '76px', fontSize: '44px', padding: '0 20px',
    borderRadius: '18px', border: '5px solid #ffb300', boxSizing: 'border-box', fontFamily: 'Nurie, sans-serif', background: '#fff',
    userSelect: 'text', WebkitUserSelect: 'text', touchAction: 'auto' }, box);
  inp.type = 'text'; inp.maxLength = 12; inp.placeholder = 'なまえ'; inp.value = st.childName || '';
  inp.setAttribute('autocomplete', 'off');
  ['pointerdown', 'pointerup', 'touchstart'].forEach((t) => inp.addEventListener(t, (e) => e.stopPropagation()));
  const finish = (name) => {
    const s2 = loadStore(); s2.childName = name; writeStore(s2);
    inp.blur(); ov.remove();
    setTimeout(layout, 350);   // キーボードが とじてから、画面の大きさを もどす
    done(name);
  };
  const mk = (text, color, left, fn) => {
    const b = el('div', 'namebtn', { left: px(left), background: color }, box);
    b.textContent = text;
    onTap(b, () => { se('click'); fn(); });
  };
  mk('なまえなし', '#9a8fb0', 40, () => finish(''));
  mk('OK', '#2fb36d', PW - 16 - 40 - 300, () => finish(inp.value.trim()));
  onTap(ov, () => { inp.blur(); ov.remove(); setTimeout(layout, 350); });   // 外をさわったら やめる
  onTap(box, () => {});
  setTimeout(() => { try { inp.focus(); } catch (e) { /* なにもしない */ } }, 50);
}
/** スマホは「共有」から写真に保存（iPhone は「画像を保存」）。パソコンはダウンロード */
function sharePhoto(blob) {
  if (!blob) return;
  const d = new Date(), z = (n) => String(n).padStart(2, '0');   // 日本の日付（toISOString は世界標準時なので朝9時前は前の日になる）
  const name = 'tenshi_nurie_' + d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()) + '.png';
  const file = typeof File !== 'undefined' ? new File([blob], name, { type: 'image/png' }) : null;
  // iPhone・iPad：共有メニューから「画像を保存」で 写真アプリへ（iPhone は ダウンロードでは 写真アプリに入らない）
  // Android・パソコン：ダウンロード（Android は 共有メニューに「保存」が ないことが多いため。ダウンロードした写真は ギャラリーに出る）
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && file && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file] }).catch(() => {});
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

// ======================= 絵の拡大（ズーム） =======================
/**
 * 絵を大きくして見る。2本指で広げる／ちぢめる・動かす、マウスのホイール、ルーペのボタン。
 * 1本指の操作は h に渡す。mode 'tap'：さわって離したら h.tap（拡大中は1本指で動かせる）
 *                      mode 'draw'：h.start / h.move / h.end（2本指になったら h.cancel）
 */
function makeZoom(root, area, box, h) {
  const MAX = 3;
  let z = 1, tx = 0, ty = 0;
  const pts = new Map();
  let pinch = null, single = null, multi = false;
  area.style.overflow = 'hidden';
  area.style.touchAction = 'none';
  box.style.transformOrigin = '0 0';
  const TOUCH = 'ontouchstart' in window;   // スマホ・タブレットは、2本指の操作をタッチの情報で行う（iPhone でも確実に）
  let tp = null;
  function tl(tc) {
    const r = area.getBoundingClientRect();
    return [(tc.clientX - r.left) / view.scale, (tc.clientY - r.top) / view.scale];
  }
  function findTouch(list, id) { for (let i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i]; return null; }
  // iPhone で、なぞった時にブラウザが画面を動かして、線が途中で切れるのを防ぐ ＋ 2本指で拡大・移動
  area.addEventListener('touchstart', (e) => {
    if (e.cancelable) e.preventDefault();
    if (h.enabled && !h.enabled()) return;
    if (e.touches.length >= 2 && !tp) {
      // 描く画面：長い線を描いている途中に触れた指（手のひら等）は無視
      if (h.mode === 'draw' && single && performance.now() - single.t0 > 900 && single.dist > 90) return;
      if (h.mode === 'draw') h.cancel();
      multi = true;
      pinch = null;
      const a = tl(e.touches[0]), b = tl(e.touches[1]);
      tp = { d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, m0: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], z0: z, tx0: tx, ty0: ty,
        ids: [e.touches[0].identifier, e.touches[1].identifier] };
    }
  }, { passive: false });
  area.addEventListener('touchmove', (e) => {
    if (!tp) return;
    const ta = findTouch(e.touches, tp.ids[0]), tb = findTouch(e.touches, tp.ids[1]);
    if (!ta || !tb) return;
    const a = tl(ta), b = tl(tb);
    const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    zoomAt(tp.z0 * d / tp.d0, tp.m0[0], tp.m0[1], tp.z0, tp.tx0 + (m[0] - tp.m0[0]), tp.ty0 + (m[1] - tp.m0[1]));
  }, { passive: false });
  const touchUp = (e) => {
    if (tp && e.touches.length < 2) tp = null;
    if (e.touches.length === 0 && pts.size === 0) multi = false;
  };
  area.addEventListener('touchend', touchUp);
  area.addEventListener('touchcancel', touchUp);

  function local(ev) {
    const r = area.getBoundingClientRect();
    return [(ev.clientX - r.left) / view.scale, (ev.clientY - r.top) / view.scale];
  }
  function clampAxis(L, W, A) { return W >= A ? Math.min(0, Math.max(A - W, L)) : (A - W) / 2; }
  function apply() {
    if (z <= 1.001) { z = 1; tx = 0; ty = 0; } else {
      const bl = box.offsetLeft, bt = box.offsetTop;
      tx = clampAxis(bl + tx, box.offsetWidth * z, area.clientWidth) - bl;
      ty = clampAxis(bt + ty, box.offsetHeight * z, area.clientHeight) - bt;
    }
    box.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + z + ')';
    btnOut.style.display = z > 1 ? 'flex' : 'none';
  }
  function zoomAt(nz, x, y, z0, tx0, ty0) {
    nz = Math.max(1, Math.min(MAX, nz));
    const bl = box.offsetLeft, bt = box.offsetTop;
    tx = x - (x - (bl + tx0)) * nz / z0 - bl;
    ty = y - (y - (bt + ty0)) * nz / z0 - bt;
    z = nz;
    apply();
  }
  function center() { return [area.clientWidth / 2, area.clientHeight / 2]; }
  function animateTo(nz) {   // ボタンのときは、なめらかに
    const c = center(), z0 = z, tx0 = tx, ty0 = ty, t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 220), e = 1 - Math.pow(1 - k, 3);
      zoomAt(z0 + (nz - z0) * e, c[0], c[1], z0, tx0, ty0);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  area.addEventListener('pointerdown', (ev) => {
    if (h.enabled && !h.enabled()) return;
    // 描く画面：2本目の指が来たら、拡大・移動の操作にする（かきかけの短い線は取り消し）。
    // ただし、長い線を描いている途中（0.9秒以上かつ長く動いた後）に触れた指（手のひら等）は無視して、線を止めない
    if (h.mode === 'draw' && pts.size >= 1) {
      if (single && performance.now() - single.t0 > 900 && single.dist > 90) return;
    }
    pts.set(ev.pointerId, local(ev));
    try { area.setPointerCapture(ev.pointerId); } catch (e) { /* なにもしない */ }
    if (pts.size === 1) {
      multi = false;
      const p = pts.get(ev.pointerId);
      single = { id: ev.pointerId, x0: p[0], y0: p[1], lx: p[0], ly: p[1], moved: false, t0: performance.now(), dist: 0, cx: ev.clientX, cy: ev.clientY };
      if (h.mode === 'draw') h.start(ev);
    } else if (pts.size === 2 && !TOUCH) {   // パソコン等（タッチの情報がない時）だけ、ここで2本指を扱う
      multi = true;
      if (h.mode === 'draw') h.cancel();
      const ab = Array.from(pts.values());
      pinch = { d0: Math.hypot(ab[0][0] - ab[1][0], ab[0][1] - ab[1][1]) || 1, m0: [(ab[0][0] + ab[1][0]) / 2, (ab[0][1] + ab[1][1]) / 2], z0: z, tx0: tx, ty0: ty };
    }
  });
  area.addEventListener('pointermove', (ev) => {
    if (!pts.has(ev.pointerId)) return;
    const p = local(ev);
    pts.set(ev.pointerId, p);
    if (pinch && pts.size >= 2) {
      const ab = Array.from(pts.values());
      const d = Math.hypot(ab[0][0] - ab[1][0], ab[0][1] - ab[1][1]);
      const m = [(ab[0][0] + ab[1][0]) / 2, (ab[0][1] + ab[1][1]) / 2];
      zoomAt(pinch.z0 * d / pinch.d0, pinch.m0[0], pinch.m0[1], pinch.z0, pinch.tx0 + (m[0] - pinch.m0[0]), pinch.ty0 + (m[1] - pinch.m0[1]));
      return;
    }
    if (!single || ev.pointerId !== single.id || multi) return;
    if (h.mode === 'draw') { single.dist = Math.max(single.dist, Math.hypot(p[0] - single.x0, p[1] - single.y0)); h.move(ev); return; }
    if (!single.moved && Math.hypot(p[0] - single.x0, p[1] - single.y0) > 14) single.moved = true;
    if (single.moved && z > 1) { tx += p[0] - single.lx; ty += p[1] - single.ly; apply(); }
    single.lx = p[0]; single.ly = p[1];
  });
  function up(ev) {
    if (!pts.has(ev.pointerId)) return;
    pts.delete(ev.pointerId);
    if (pts.size < 2) pinch = null;
    if (single && ev.pointerId === single.id) {
      if (!multi) {
        if (h.mode === 'draw') h.end();
        else if (ev.type === 'pointerup') {
          // 小さい子は「トン」ではなく「こすって」塗ることが多い。拡大していない時は、動かしても さわった所を塗る
          if (!single.moved) h.tap(ev);
          else if (z <= 1.001) h.tap({ clientX: single.cx, clientY: single.cy });
        }
      }
      single = null;
    }
    if (pts.size === 0) multi = false;
  }
  area.addEventListener('pointerup', up);
  area.addEventListener('pointercancel', up);
  area.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    if (h.enabled && !h.enabled()) return;
    const p = local(ev);
    zoomAt(z * Math.pow(1.0015, -ev.deltaY), p[0], p[1], z, tx, ty);
  }, { passive: false });

  // ルーペのボタン（絵の左下）
  const btnIn = iconButton(root, 'icon_zoom_in', 84, '#26a69a', { left: '28px', bottom: '28px' }, () => {
    if (h.enabled && !h.enabled()) return;
    animateTo(Math.min(MAX, z * 1.7));
  });
  const btnOut = iconButton(root, 'icon_zoom_out', 84, '#26a69a', { left: '124px', bottom: '28px', display: 'none' }, () => animateTo(1));
  return {
    reset() { z = 1; apply(); },
    scale() { return z; },
    refresh: apply,
    hideButtons() { btnIn.style.display = 'none'; btnOut.style.display = 'none'; },
  };
}

// ======================= タイトル =======================
function titleScreen(root) {
  state.secret = false;
  let alive = true;
  let raf = 0;

  pic('title_scene', null, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover' }, root);
  const crest = pic('title_logo', null, { position: 'absolute', left: '14px', top: '14px', width: '110px', height: '110px' }, root);
  // かくし：左上の園章を7回たたいて、少しまってから5回たたくと「75」の花火
  const crestHit = el('div', null, { position: 'absolute', left: '6px', top: '6px', width: '126px', height: '126px', borderRadius: '50%', cursor: 'pointer' }, root);
  let crestGroups = [], crestLast = 0, fireworksOn = false;
  crestHit.addEventListener('pointerdown', (ev) => {
    ev.stopPropagation();
    const now = performance.now();
    if (now - crestLast > 800) { crestGroups.push(0); if (crestGroups.length > 2) crestGroups.shift(); }
    crestLast = now;
    crestGroups[crestGroups.length - 1]++;
    const n = crestGroups[crestGroups.length - 1];
    se('tap', 0.9 + 0.06 * n, -4);
    crest.animate([{ transform: 'scale(1)' }, { transform: 'scale(0.86)' }, { transform: 'scale(1)' }], { duration: 160 });
    if (!fireworksOn && crestGroups.length === 2 && crestGroups[0] === 7 && n === 5) {
      crestGroups = [];
      fireworks75();
    }
  });
  function fireworks75() {
    fireworksOn = true;
    const layer = el('div', null, { position: 'absolute', inset: '0', pointerEvents: 'none', zIndex: '20' }, root);
    const dim = el('div', null, { position: 'absolute', inset: '0', background: '#0b0a2a' }, layer);
    dim.animate([{ opacity: 0 }, { opacity: 0.72 }], { duration: 500, fill: 'forwards' });
    const cv = el('canvas', null, { position: 'absolute', inset: '0', width: '100%', height: '100%' }, layer);
    const W = Math.round(view.w), H = Math.round(view.h);
    cv.width = W; cv.height = H;
    const cx = cv.getContext('2d');
    const parts = [];
    const PAL = ['#ff4d4d', '#ffd93b', '#4cc3ff', '#8ee05a', '#ff8fcf', '#a46bff', '#ffffff', '#ff9a3c'];
    function burst(x, y, big) {
      se('paint', rand(0.45, 0.6), -2);
      const col = PAL[Math.floor(Math.random() * PAL.length)], col2 = PAL[Math.floor(Math.random() * PAL.length)];
      const n = big ? 90 : 60;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * 2 * i / n + rand(-0.05, 0.05), v = rand(big ? 260 : 180, big ? 420 : 320);
        parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(1.1, 1.6), age: 0, c: i % 3 ? col : col2 });
      }
    }
    for (let i = 0; i < 9; i++) later(300 + i * 420, () => burst(rand(W * 0.12, W * 0.88), rand(H * 0.12, H * 0.5), i % 3 === 0));
    // 大きな「75」と「しゅうねん！」
    const big = label('75', 230, '#ffd23f', { left: '0', right: '0', top: '18%', fontFamily: 'TitlePop, Nurie, sans-serif', WebkitTextStrokeWidth: '30px', WebkitTextStrokeColor: '#e8590c' }, layer);
    const sub = label('しゅうねん', 72, '#ffffff', { left: '0', right: '0', top: '58%', WebkitTextStrokeColor: '#e8590c' }, layer);
    const omd = label('おめでとう！', 84, '#ffd23f', { left: '0', right: '0', top: '73%', WebkitTextStrokeColor: '#e8590c' }, layer);
    omd.animate([{ transform: 'scale(0.3)', opacity: 0 }, { transform: 'scale(1.12)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], { duration: 650, delay: 1600, easing: 'ease-out', fill: 'both' });
    omd.animate([{ transform: 'rotate(-3deg)' }, { transform: 'rotate(3deg)' }], { duration: 500, delay: 2300, iterations: 6, direction: 'alternate', easing: 'ease-in-out' });
    big.animate([{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: 700, delay: 600, easing: 'ease-out', fill: 'both' });
    big.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }], { duration: 600, delay: 1300, iterations: 6, direction: 'alternate' });
    sub.animate([{ transform: 'translateY(40px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 500, delay: 1100, easing: 'ease-out', fill: 'both' });
    later(700, () => se('fanfare'));
    let last = performance.now(), t0 = last, fr = 0;
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      cx.globalCompositeOperation = 'destination-out';
      cx.fillStyle = 'rgba(0,0,0,0.25)'; cx.fillRect(0, 0, W, H);   // 光の尾が少し残る
      cx.globalCompositeOperation = 'lighter';
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.age += dt;
        if (q.age > q.life) { parts.splice(i, 1); continue; }
        q.vx *= 0.97; q.vy = q.vy * 0.97 + 260 * dt;
        q.x += q.vx * dt; q.y += q.vy * dt;
        cx.globalAlpha = Math.max(0, 1 - q.age / q.life);
        cx.fillStyle = q.c;
        cx.beginPath(); cx.arc(q.x, q.y, 4, 0, Math.PI * 2); cx.fill();
      }
      cx.globalAlpha = 1;
      if (now - t0 < 6000 && alive) fr = requestAnimationFrame(step);
    };
    fr = requestAnimationFrame(step);
    later(5200, () => {
      layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, fill: 'forwards' }).onfinish = () => { cancelAnimationFrame(fr); layer.remove(); fireworksOn = false; awardStamp('fireworks', root); };
    });
  }

  // パッと出る園児3人（タップすると、ぴょん）
  // 位置はすべて数値（px）で決める（どのスマホのブラウザでも同じ場所に出るように）
  const popPlacers = [];
  const popKids = [];   // かくし：リボン → つみき → バトン の順にタッチすると、3人で踊る
  let danceStep = 0, danceAt = 0, dancing = false;
  POPS.forEach((p, idx) => {
    const im = IMG[p[0]];
    const h = 720 * p[3];
    const w = h * (im.naturalWidth || 400) / (im.naturalHeight || 500);
    const hop = el('div', null, { position: 'absolute', width: px(w), height: px(h) }, root);
    const place = () => { hop.style.left = px(view.w * p[1] - w / 2); hop.style.top = px(view.h * p[2] - h); };
    place();
    popPlacers.push(place);
    const sway = el('div', null, { position: 'absolute', left: '0', top: '0', width: px(w), height: px(h), transformOrigin: '50% 100%' }, hop);
    const kidImg = pic(p[0], null, {
      position: 'absolute', left: '0', top: '0', width: px(w), height: px(h), transformOrigin: '50% 100%',
      imageRendering: 'pixelated', transform: 'scale(0)', pointerEvents: 'auto', cursor: 'pointer',
    }, sway);
    later(p[4] * 1000, () => {
      se('tap', 1.2 + p[4]);
      const a = kidImg.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }],
        { duration: 450, easing: 'cubic-bezier(0.34,1.56,0.64,1)', fill: 'forwards' });
      a.onfinish = () => {
        sway.animate([{ transform: 'rotate(0.035rad)' }, { transform: 'rotate(-0.035rad)' }],
          { duration: 1100, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
      };
    });
    popKids.push({ hop: hop, sway: sway, img: kidImg });
    kidImg.addEventListener('pointerdown', () => {
      if (dancing) return;
      se('tap', 1.4);
      hop.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-40px)', easing: 'ease-in' }, { transform: 'translateY(0)' }],
        { duration: 300, easing: 'ease-out' });
      const now = performance.now();
      if (now - danceAt > 4000) danceStep = 0;   // 4秒あいたら、はじめから
      danceAt = now;
      danceStep = idx === danceStep ? danceStep + 1 : (idx === 0 ? 1 : 0);
      if (danceStep === POPS.length) { danceStep = 0; later(250, dance); }
    });
  });
  function dance() {
    dancing = true;
    const notes = [1, 1.12, 1.26, 1.5, 1.26, 1.5, 1.68, 2];   // ド レ ミ ソ ミ ソ ラ ド
    notes.forEach((n, i) => later(i * 220, () => se('tap', n)));
    later(notes.length * 220, () => se('fanfare', 1, -4));
    const D = 3200;
    // リボンの子：くるくる回る
    popKids[0].img.animate([{ transform: 'scale(1) rotateY(0turn)' }, { transform: 'scale(1) rotateY(3turn)' }], { duration: D, easing: 'ease-in-out' });
    // みんな：リズムよくジャンプ（少しずつずらす）
    popKids.forEach((k, i) => {
      const kf = [];
      for (let j = 0; j <= 8; j++) kf.push({ transform: 'translateY(' + (j % 2 ? -46 : 0) + 'px)', easing: j % 2 ? 'ease-in' : 'ease-out' });
      k.hop.animate(kf, { duration: D, delay: i * 110 });
      if (i > 0) {
        k.sway.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-0.18rad)' }, { transform: 'rotate(0.18rad)' }, { transform: 'rotate(-0.18rad)' },
          { transform: 'rotate(0.18rad)' }, { transform: 'rotate(0)' }], { duration: D, delay: i * 110, easing: 'ease-in-out' });
      }
    });
    // 紙ふぶき
    const cfLayer = el('div', null, { position: 'absolute', inset: '0', pointerEvents: 'none' }, root);
    for (let i = 0; i < 60; i++) {
      const dur = rand(2.2, 3.6);
      const cf = el('div', 'confetti', {
        background: COLORS[Math.floor(Math.random() * 10)], width: px(rand(12, 22)), height: px(rand(18, 30)),
        left: (Math.random() * 100) + '%', top: px(-40 - Math.random() * 300), animationDuration: dur + 's', animationIterationCount: '1',
      }, cfLayer);
      cf.style.setProperty('--dist', px(view.h + 400));
      cf.style.setProperty('--rot', rand(-8, 8) + 'rad');
    }
    later(D + 600, () => { cfLayer.remove(); dancing = false; awardStamp('dance', root); });
  }

  // タイトルロゴ（男の子が走り終わったら上から落ちてくる）
  const logoIm = IMG.title_logo_big;
  const logoH = LOGO_WIDTH * logoIm.naturalHeight / logoIm.naturalWidth;
  const logoBox = el('div', null, { position: 'absolute', left: '50%', top: px(LOGO_TOP), width: px(LOGO_WIDTH), height: px(logoH), marginLeft: px(-LOGO_WIDTH / 2), visibility: 'hidden' }, root);
  const logoImg = pic('title_logo_big', null, { width: '100%', height: '100%' }, logoBox);
  let logoShown = false;
  function dropLogo(quick) {
    if (logoShown) return;
    logoShown = true;
    logoBox.style.visibility = 'visible';
    // すたーとボタンは、ロゴが落ちてきた後にぽんっと出る（男の子が走っている間は、男の子をたたきやすいように出さない）
    later(quick ? 150 : 650, () => {
      start.style.visibility = 'visible';
      start.animate([{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 400, easing: 'cubic-bezier(0.34,1.56,0.64,1)' });
    });
    se('save');
    const from = -(logoH + 40 + LOGO_TOP);
    const a = logoBox.animate([
      { transform: 'translateY(' + px(from) + ')', easing: 'ease-in' },
      { transform: 'translateY(0)', offset: 0.45, easing: 'ease-out' },
      { transform: 'translateY(-50px)', offset: 0.65, easing: 'ease-in' },
      { transform: 'translateY(0)', offset: 0.82, easing: 'ease-out' },
      { transform: 'translateY(-14px)', offset: 0.91, easing: 'ease-in' },
      { transform: 'translateY(0)' },
    ], { duration: 900, fill: 'forwards' });
    a.onfinish = () => {
      logoImg.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.03)' }],
        { duration: 1200, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    };
  }

  // クレジット（右下に 小さく。おとなが 見る用）
  const cr = el('div', null, { position: 'absolute', right: '12px', bottom: '10px', zIndex: '15', padding: '4px 14px', borderRadius: '16px',
    background: 'rgba(255,255,255,0.75)', color: '#6b6b80', fontSize: '20px', cursor: 'pointer' }, root);
  cr.textContent = 'クレジット';
  cr.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  onTap(cr, () => { se('click'); showCredits(root); });

  // すたーと
  const start = el('div', 'startbtn', { visibility: 'hidden' }, root);
  outlineText(start, 'すたーと', '14px', '#e8590c');
  onTap(start, () => {
    if (going) return;
    se('start');
    go(selectScreen);
  });

  // 走る男の子（真ん中で極小 → 真ん中のまま大きくなって消える。1回だけ）
  const sheet = IMG.kid_walk;
  const cellW = sheet.naturalWidth / KID_FRAMES, cellH = sheet.naturalHeight;
  const kid = el('div', 'kid', {
    width: px(cellW), height: px(cellH), backgroundImage: 'url(' + src('kid_walk') + ')',
    backgroundSize: px(sheet.naturalWidth) + ' ' + px(cellH), backgroundRepeat: 'no-repeat', display: 'none',
  }, root);
  // 男の子は最初とても小さいので、さわれる範囲を男の子より大きくする（見えない当たり判定）
  const kidHit = el('div', null, { position: 'absolute', display: 'none', borderRadius: '50%', cursor: 'pointer' }, root);
  const fx = el('div', null, { position: 'absolute', inset: '0', pointerEvents: 'none' }, root);

  let running = false, t0 = 0, taps = 0, wiggleAt = -1, going = false;
  let kidScale = 1, feetX = 0, feetY = 0;
  function placeKid(t, now) {
    const e = Math.pow(t, 2.4);
    kidScale = (KID_H_START + (KID_H_END - KID_H_START) * e) * view.h / cellH;
    feetX = view.w * 0.5;
    feetY = (KID_START_Y + (KID_END_Y - KID_START_Y) * e) * view.h;
    let rot = 0;
    if (wiggleAt >= 0) {
      const d = (now - wiggleAt) / 200;
      if (d < 1) rot = 0.25 * Math.sin(d * Math.PI * 2) * (1 - d);
    }
    kid.style.left = px(feetX - cellW / 2);
    kid.style.top = px(feetY - cellH);
    kid.style.transform = 'scale(' + kidScale + ') rotate(' + rot + 'rad)';
    kid.style.opacity = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2;
    const hw = Math.max(cellW * kidScale * 1.3, 150), hh = Math.max(cellH * kidScale * 1.1, 170);
    Object.assign(kidHit.style, { left: px(feetX - hw / 2), top: px(feetY - cellH * kidScale * 0.5 - hh / 2), width: px(hw), height: px(hh) });
  }
  function tick(now) {
    if (!alive || !running) return;
    const t = Math.min(1, (now - t0) / (KID_RUN_TIME * 1000));
    const f = Math.floor((now - t0) / 1000 * KID_FPS) % KID_FRAMES;
    kid.style.backgroundPosition = px(-f * cellW) + ' 0';
    placeKid(t, now);
    if (t >= 1) {
      running = false;
      kid.style.display = 'none';
      kidHit.style.display = 'none';
      dropLogo();
      return;
    }
    raf = requestAnimationFrame(tick);
  }
  // 男の子の ほかの 所を さわったら、走るのを またずに すぐ すたーと が 出る（はやく あそびたい 子のため）
  function skipIntro() {
    if (going || logoShown) return;
    if (goldKid) return;   // 金色の 男の子の 時は、ほかを さわっても 走りぬけるまで 待つ（見のがさないように）
    running = false;
    cancelAnimationFrame(raf);
    kid.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).onfinish = () => { kid.style.display = 'none'; };
    kidHit.style.display = 'none';
    dropLogo(true);
  }
  root.addEventListener('pointerdown', () => skipIntro());
  // かくし：ときどき 金色の男の子が走ってくる。たたくとスタンプ
  // まだ スタンプが ない子：4回に1回くらい＋3回つづけて 出なかったら 次は かならず。もらった あとは 10回に1回くらい
  const kst = loadStore();
  const hasGoldStamp = !!(kst.stamps && kst.stamps.goldkid);
  const kidMiss = kst.goldKidMiss || 0;
  const goldKid = hasGoldStamp ? Math.random() < 0.1 : (kidMiss >= 3 || Math.random() < 0.25);
  kst.goldKidMiss = goldKid ? 0 : kidMiss + 1;
  writeStore(kst);
  if (goldKid) kid.style.filter = GOLD_FILTER;
  let goldAwarded = false;
  later(800, () => {
    if (logoShown || going) return;
    running = true;
    if (goldKid) { se('secret', 1.4, -8); }
    kid.style.display = 'block';
    kidHit.style.display = 'block';
    t0 = performance.now();
    placeKid(0, t0);
    raf = requestAnimationFrame(tick);
  });
  kidHit.addEventListener('pointerdown', (ev) => {
    ev.stopPropagation();
    if (going || !running) return;
    taps++;
    se('tap', 1.0 + 0.1 * taps);
    if (goldKid && !goldAwarded) {   // 金色の男の子をつかまえた！（スタンプは、ひみつのへや に行くじゃまをしないよう、走り終わってから）
      goldAwarded = true;
      sparkle(fx, feetX, feetY - cellH * kidScale * 0.5, 14);
      se('save');
      const wait = () => {
        if (going) state.pendingStamp = 'goldkid';   // そのまま ひみつのへや へ：むこうで見せる
        else if (running) later(300, wait);
        else awardStamp('goldkid', root);
      };
      later(300, wait);
    }
    wiggleAt = performance.now();
    sparkle(fx, feetX, feetY - cellH * kidScale * 0.5, 2);
    if (taps >= KID_TAPS) enterSecret();
  });

  // 裏モードへ：本気の顔になって、左へ猛ダッシュ
  function enterSecret() {
    going = true;
    running = false;
    cancelAnimationFrame(raf);
    se('secret');
    const dispH = cellH * kidScale;
    kid.style.display = 'none';
    kidHit.style.display = 'none';
    const ang = IMG.kid_angry;
    const aw = ang.naturalWidth, ah = ang.naturalHeight;
    const sc = dispH * 1.1 / ah;
    const wrap = el('div', null, { position: 'absolute', left: px(feetX), top: px(feetY), width: '0', height: '0' }, root);
    const face = pic('kid_angry', null, { position: 'absolute', left: px(-aw / 2), top: px(-ah), width: px(aw), height: px(ah), transformOrigin: '50% 100%', transform: 'scale(' + sc + ')' }, wrap);
    root.appendChild(fx);
    sparkle(fx, feetX, feetY - dispH * 0.5, 16);
    face.animate([{ transform: 'scale(' + sc + ')' }, { transform: 'scale(' + (sc * 1.2) + ')' }],
      { duration: 120, easing: 'cubic-bezier(0.34,1.56,0.64,1)', fill: 'forwards' });
    const kf = [{ transform: 'translateX(0)' }];
    for (let i = 0; i < 6; i++) kf.push({ transform: 'translateX(' + (i % 2 === 0 ? 8 : -8) + 'px)' });
    kf.push({ transform: 'translateX(0)' });
    wrap.animate(kf, { duration: 350, delay: 120, fill: 'forwards' }).onfinish = () => {
      wrap.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(' + px(-feetX - aw * sc * 1.5) + ')' }],
        { duration: 450, easing: 'ease-in', fill: 'forwards' });
    };
    const dark = el('div', null, { position: 'absolute', inset: '0', background: 'rgba(31,20,64,0)' }, root);
    const msg = label('ひみつの へやへ ようこそ', 56, '#ffe666', { left: '0', right: '0', top: '50%', marginTop: '-34px', opacity: '0', WebkitTextStrokeColor: '#401a73' }, root);
    later(900, () => {
      dark.animate([{ background: 'rgba(31,20,64,0)' }, { background: 'rgba(31,20,64,0.9)' }], { duration: 800, fill: 'forwards' });
      msg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 800, fill: 'forwards' });
      say('secret');
    });
    later(2700, () => {
      state.secret = true;
      state.justSecret = true;
      go(selectScreen);
    });
  }

  return {
    dispose() { alive = false; cancelAnimationFrame(raf); },
    onResize() { popPlacers.forEach((f) => f()); },
  };
}

// ======================= えらぶ画面 =======================
function selectScreen(root) {
  const secret = state.secret;
  el('div', null, { position: 'absolute', inset: '0', background: secret ? '#2b2350' : 'linear-gradient(#faf3eb, #f5ede3)' }, root);
  if (!secret) {   // かべ・左右の かざり（葉っぱ・まるい 色）・木の たな
    el('div', null, { position: 'absolute', left: '0', right: '0', bottom: '0', height: '92px',
      background: 'linear-gradient(#f6dcb6 0px, #efc99c 6px, #e9bf8e 60%, #d79c5e 100%)', boxShadow: '0 -2px 0 rgba(160,110,60,0.18)' }, root);
    el('div', null, { position: 'absolute', left: '0', top: '0', height: '100%', aspectRatio: '365 / 724', backgroundImage: 'url(' + src('sel_left') + ')',
      backgroundSize: '100% 100%', pointerEvents: 'none' }, root);
    el('div', null, { position: 'absolute', right: '0', top: '0', height: '100%', aspectRatio: '377 / 724', backgroundImage: 'url(' + src('sel_right') + ')',
      backgroundSize: '100% 100%', pointerEvents: 'none' }, root);
  }
  if (secret) {   // またたく星
    for (let i = 0; i < 40; i++) {
      const d = rand(3, 7);
      el('div', 'twinkle', {
        width: px(d), height: px(d), left: (Math.random() * 100) + '%', top: (Math.random() * 100) + '%',
        animationDuration: rand(1.2, 3.2) + 's', animationDelay: (-Math.random() * 3) + 's',
      }, root);
    }
  }
  if (!secret) later(400, () => say('select', { once: true }));
  label(secret ? 'ひみつの へや' : 'どの えに する？', secret ? 56 : 60, secret ? '#ffe066' : '#5b4640',
    Object.assign({ left: '0', right: '0', top: '22px' }, secret ? { WebkitTextStrokeColor: '#4d2680' } : { WebkitTextStrokeColor: '#fffaf2', WebkitTextStrokeWidth: '10px' }), root);
  if (!secret) {   // 題の 左右の 色の 線（きらっ）
    [[-1, ['#f9d26e', '#9fd0f5', '#f5a3a3']], [1, ['#f5a3a3', '#f9d26e', '#9fd0f5']]].forEach(([sd, cols]) => {
      cols.forEach((c, i) => {
        el('div', null, { position: 'absolute', left: 'calc(50% + ' + (sd * 300 - 20) + 'px)', top: px(38 + i * 18), width: '40px', height: '9px', borderRadius: '5px', background: c,
          transform: 'rotate(' + (sd * (i - 1) * -16) + 'deg)', pointerEvents: 'none' }, root);
      });
    });
  }

  const keys = secret ? [SECRET_KEY] : ORDER;
  const cardW = secret ? 420 : 380, cardH = secret ? 520 : 510, gap = secret ? 36 : 34;
  const cards = [];
  keys.forEach((key) => cards.push(makeCard(root, key, cardW, cardH)));

  function place() {
    const total = keys.length * cardW + (keys.length - 1) * gap;
    const x0 = (view.w - total) / 2;
    const areaTop = 118, areaH = view.h - 118 - (secret ? 30 : 40);
    const y = areaTop + Math.max(0, (areaH - cardH) / 2);
    cards.forEach((c, i) => { c.style.left = px(x0 + i * (cardW + gap)); c.style.top = px(y); });
  }
  place();

  if (secret) {   // 表へもどる（裏モードにだけある）
    iconButton(root, 'icon_sun', 110, '#ffb300', { left: '20px', top: '14px' }, () => {
      state.secret = false;
      go(titleScreen);
    });
  } else {
    iconButton(root, 'icon_home', 96, '#ff9a3c', { left: '20px', top: '14px' }, () => go(titleScreen));
  }
  // 右上：かくし すたんぷ帳。ぜんぶの絵を「できた！」にしたら、きねん しゃしん のボタンも出る
  stampButton(root, { right: '20px', top: '14px' });
  if (albumReady()) {
    albumButton(root, { right: '132px', top: '14px' });
    const st = loadStore();
    if (!st.albumTold) {   // はじめての時だけ、お知らせ
      st.albumTold = true;
      writeStore(st);
      later(600, () => say('album'));
      const tip = label('きねん しゃしんが とれるよ！', 34, '#e64d73', { right: '20px', top: '124px' }, root);
      tip.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: 5000, fill: 'forwards' });
      later(400, () => se('fanfare', 1.2, -6));
    }
  }
  if (secret && state.justSecret) {   // ひみつの へや に はじめて来た
    state.justSecret = false;
    later(500, () => awardStamp('room', root));
  }
  if (state.pendingStamp) {   // 金色の男の子をたたいて、そのまま ひみつのへや に来た時：スタンプを見せる
    const id = state.pendingStamp;
    state.pendingStamp = null;
    later(3000, () => awardStamp(id, root));
  }
  return { onResize: place };
}

const CARD_LOOK = {
  easy: { bg: 'linear-gradient(#fde29a, #fbd06e)', tape: 'rgba(255,236,170,0.75)', icon: 'ico_flower' },
  normal: { bg: 'linear-gradient(#d6eecb, #bfe2b0)', tape: 'rgba(220,240,205,0.75)', icon: 'ico_leaf' },
  hard: { bg: 'linear-gradient(#dcebfd, #a9cdf6)', tape: 'rgba(205,226,250,0.8)', icon: 'ico_dove' },
};
const WAVE_MASK = 'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22 preserveAspectRatio=%22none%22><path d=%22M0 0H100V93 Q87.5 86 75 93 T50 93 T25 93 T0 93Z%22 fill=%22black%22/></svg>")';
function makeCard(root, key, w, h) {
  const isSecret = key === SECRET_KEY;
  if (!isSecret && CARD_LOOK[key]) return makeCardSoft(root, key, w, h);
  const info = isSecret ? SECRET : LEVELS[key];
  const card = el('div', 'card', { width: px(w), height: px(h), background: CARD_COLORS[key], borderColor: isSecret ? '#ffd966' : '#fff' }, root);
  const paper = el('div', 'paper', null, card);
  const thumb = loadThumb(key);
  const p = el('img', 'pic', null, paper);
  p.src = src(info.line);   // えらぶ 画面は いつも まっしろな 線画（前に ぬった 色は 出さない）
  if (thumb) {   // 保存した絵には、カメラの印
    pic('icon_save', null, { position: 'absolute', right: '6px', top: '6px', width: '44px', height: '44px', filter: 'hue-rotate(250deg) saturate(1.4)' }, paper);
  }
  const stars = el('div', null, { position: 'absolute', left: '0', right: '0', top: '336px', height: '72px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }, card);
  for (let i = 0; i < info.stars; i++) pic('icon_star', null, { width: '60px', height: '60px' }, stars);
  label(NAMES[key], isSecret ? 40 : 44, '#403333', { left: '0', right: '0', top: '414px' }, card);

  if (UNDER_CONSTRUCTION.indexOf(key) >= 0) {   // 改修中：うすくして帯。押しても開かない
    card.style.filter = 'brightness(0.8)';
    el('div', null, { position: 'absolute', inset: '0', background: 'rgba(255,255,255,0.65)' }, paper);
    const tape = el('div', 'tape', null, paper);
    tape.textContent = 'かいしゅうちゅう';
    onTap(card, () => {
      se('undo', 1.2);
      card.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(0)' }], { duration: 250 });
    });
  } else {
    onTap(card, () => {
      bounce(card);
      se('click');
      setTimeout(() => {
        if (isSecret) go(drawScreen, { fresh: false });
        else go(nurieScreen, { key: key, fresh: false });
      }, 180);
    });
  }
  return card;
}

/** 1まいめ・2まいめ を えらぶ（どちらかに 保存が ある時だけ） */
function chooseSlot(root, key) {
  const info = LEVELS[key];
  const ov = el('div', null, { position: 'absolute', inset: '0', background: 'rgba(60,40,30,0.55)', zIndex: '35' }, root);
  const PW = 860, PH = 520;
  const panel = el('div', null, { position: 'absolute', left: px(view.w / 2 - PW / 2), top: px(Math.max(8, view.h / 2 - PH / 2)), width: px(PW), height: px(PH),
    background: '#fffaf1', borderRadius: '36px', border: '6px solid #fff', boxSizing: 'border-box', boxShadow: '0 10px 24px rgba(0,0,0,0.2)' }, ov);
  panel.animate([{ transform: 'scale(0.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 250, easing: 'ease-out' });
  label('どちらに ぬる？', 48, '#5b4640', { left: '0', right: '0', top: '18px' }, panel);
  [1, 2].forEach((sl, i) => {
    const has = slotSaved(key, sl);
    const c = el('div', null, { position: 'absolute', left: px(46 + i * 400), top: '100px', width: '360px', height: '390px', borderRadius: '28px', cursor: 'pointer',
      background: CARD_LOOK[key] ? CARD_LOOK[key].bg : '#fde29a', boxShadow: '0 6px 0 rgba(0,0,0,0.1)' }, panel);
    const paper = el('div', null, { position: 'absolute', left: '18px', right: '18px', top: '18px', height: '262px', background: '#fff', borderRadius: '18px', overflow: 'hidden' }, c);
    const im = el('img', null, { position: 'absolute', left: '8px', top: '8px', width: 'calc(100% - 16px)', height: 'calc(100% - 16px)', objectFit: 'contain' }, paper);
    im.src = has ? loadThumb(slotKey(key, sl)) : src(info.line);
    if (!has) el('div', null, { position: 'absolute', inset: '0', background: 'rgba(255,255,255,0.55)' }, paper);
    label(sl + 'まいめ', 40, '#4e3329', { left: '0', right: '0', top: '290px' }, c);
    label(has ? 'つづきから' : 'あたらしく', 28, has ? '#2e7d4f' : '#c45d7a', { left: '0', right: '0', top: '340px' }, c);
    c.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    onTap(c, () => { bounce(c); se('click'); setTimeout(() => go(nurieScreen, { key: key, slot: sl, fresh: false }), 160); });
  });
  panel.addEventListener('pointerdown', (ev) => ev.stopPropagation());
  onTap(ov, () => { se('click'); ov.remove(); });
}
/** えらぶ画面の カード（やわらかい 色・テープ・なみの 紙・星3つ・名前の おび） */
function makeCardSoft(root, key, w, h) {
  const info = LEVELS[key], look = CARD_LOOK[key];
  const card = el('div', 'card', { position: 'absolute', width: px(w), height: px(h), borderRadius: '40px', background: look.bg, cursor: 'pointer',
    border: '6px solid rgba(255,255,255,0.85)', boxSizing: 'border-box', boxShadow: '0 10px 18px rgba(120,90,60,0.18)' }, root);
  const paper = el('div', null, { position: 'absolute', left: '22px', right: '22px', top: '22px', height: '296px', background: '#fff', borderRadius: '24px',
    WebkitMaskImage: WAVE_MASK, maskImage: WAVE_MASK, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', overflow: 'hidden' }, card);
  const p = el('img', null, { position: 'absolute', left: '10px', right: '10px', top: '10px', bottom: '24px', width: 'calc(100% - 20px)', height: 'calc(100% - 34px)', objectFit: 'contain' }, paper);
  p.src = src(info.line);   // えらぶ 画面は いつも まっしろな 線画
  p.draggable = false;
  if (loadThumb(key) || loadThumb(slotKey(key, 2))) pic('icon_save', null, { position: 'absolute', right: '8px', top: '8px', width: '40px', height: '40px', filter: 'hue-rotate(250deg) saturate(1.4)' }, paper);
  // テープ（左上）
  el('div', null, { position: 'absolute', left: '4px', top: '14px', width: '84px', height: '30px', background: look.tape, transform: 'rotate(-38deg)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)', pointerEvents: 'none' }, card);
  // 星（むずかしさ）：3つ のうち いくつ 光るか
  const stars = el('div', null, { position: 'absolute', left: '0', right: '0', top: '326px', height: '62px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }, card);
  for (let i = 0; i < 3; i++) {
    pic('icon_star', null, Object.assign({ width: '56px', height: '56px' }, i < info.stars ? {} : { filter: 'grayscale(1) brightness(1.25)', opacity: '0.45' }), stars);
  }
  // 名前の おび
  const pill = el('div', null, { position: 'absolute', left: '22px', right: '22px', top: '398px', height: '82px', borderRadius: '41px', background: '#fffaf1',
    boxShadow: '0 3px 6px rgba(120,90,60,0.12)' }, card);
  pic(look.icon, null, { position: 'absolute', left: '14px', top: '9px', width: '64px', height: '64px', objectFit: 'contain' }, pill);
  const nm = el('div', null, { position: 'absolute', left: '64px', right: '10px', top: '0', bottom: '0', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: NAMES[key].length > 4 ? '42px' : '46px', color: '#4e3329' }, pill);
  nm.textContent = NAMES[key];
  if (UNDER_CONSTRUCTION.indexOf(key) >= 0) {
    card.style.filter = 'brightness(0.85)';
    onTap(card, () => { se('undo', 1.2); card.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(0)' }], { duration: 250 }); });
  } else {
    onTap(card, () => {
      bounce(card);
      se('click');
      setTimeout(() => {
        if (!slotSaved(key, 1) && !slotSaved(key, 2)) go(nurieScreen, { key: key, slot: 1, fresh: false });
        else chooseSlot(root, key);
      }, 180);
    });
  }
  return card;
}

// ======================= ぬりえ =======================
const regionCache = {};
/** 部分の番号の画像を読み、番号ごとの点の一覧を作る（1回だけ） */
function getRegions(key) {
  if (regionCache[key]) return regionCache[key];
  const info = key === SECRET_KEY ? SECRET : LEVELS[key];
  const im = IMG[info.regions];
  const w = im.naturalWidth, h = im.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingEnabled = false;
  x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, w, h).data;
  const n = info.count;
  const ids = new Uint16Array(w * h);
  const counts = new Uint32Array(n + 1);
  const bbox = new Int32Array((n + 1) * 4);
  for (let i = 0; i <= n; i++) { bbox[i * 4] = w; bbox[i * 4 + 1] = h; bbox[i * 4 + 2] = -1; bbox[i * 4 + 3] = -1; }
  for (let i = 0, p = 0; i < w * h; i++, p += 4) {
    let id = d[p] + d[p + 1] * 256;
    if (id > n) id = 0;
    ids[i] = id;
    counts[id]++;
    const px_ = i % w, py_ = (i / w) | 0, b = id * 4;
    if (px_ < bbox[b]) bbox[b] = px_;
    if (py_ < bbox[b + 1]) bbox[b + 1] = py_;
    if (px_ > bbox[b + 2]) bbox[b + 2] = px_;
    if (py_ > bbox[b + 3]) bbox[b + 3] = py_;
  }
  const start = new Uint32Array(n + 2);
  for (let i = 0; i <= n; i++) start[i + 1] = start[i] + counts[i];
  const fillPos = start.slice(0, n + 1);
  const list = new Uint32Array(w * h);
  for (let i = 0; i < w * h; i++) list[fillPos[ids[i]]++] = i;
  return (regionCache[key] = { w: w, h: h, n: n, ids: ids, start: start, list: list, bbox: bbox });
}

/** 1つの 絵に 2まいまで 保存できる（1まいめは これまでと 同じ 名前） */
function slotKey(key, slot) { return slot === 2 ? key + '_2' : key; }
function slotSaved(key, slot) { return !!loadThumb(slotKey(key, slot)); }
function nurieScreen(root, arg) {
  const key = arg.key, slot = arg.slot === 2 ? 2 : 1, SK = slotKey(key, slot);
  const info = LEVELS[key];
  const R = getRegions(key);
  const PANEL_W = panelWidthFlex(R.w / R.h, key === 'hard' ? 460 : 380), WIDE = PANEL_W >= 420, builtH = view.h;   // むずかしいは 色が 多いので パネルを 広めに
  const TAP_RADIUS = 18;
  let allColors = [];
  let currentColor = 0;
  let finished = false;
  const undoStack = [];
  const painted = new Set();
  let dirty = false;   // 保存してから塗ったか（ホームに戻る時・できた！の時に自動で保存する）
  const palette = [];   // 部分の番号 → 色（'#rrggbb'）
  for (let i = 0; i <= R.n; i++) palette.push('#ffffff');

  el('div', null, { position: 'absolute', inset: '0', background: '#fff4dc' }, root);
  const area = el('div', null, { position: 'absolute', left: '16px', top: '16px', right: px(PANEL_W + 8), bottom: '16px' }, root);
  const box = el('div', null, { position: 'absolute', cursor: 'pointer' }, area);
  const canvas = el('canvas', null, { position: 'absolute', inset: '0', width: '100%', height: '100%' }, box);
  canvas.width = R.w; canvas.height = R.h;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(R.w, R.h);
  const buf = imgData.data;
  for (let i = 0; i < R.w * R.h; i++) {
    if (R.ids[i] > 0) { const p = i * 4; buf[p] = 255; buf[p + 1] = 255; buf[p + 2] = 255; buf[p + 3] = 255; }
  }
  pic(info.line, null, { position: 'absolute', inset: '0', width: '100%', height: '100%' }, box);

  function fit() {
    const aw = area.clientWidth, ah = area.clientHeight;
    const s = Math.min(aw / R.w, ah / R.h);
    const bw = R.w * s, bh = R.h * s;
    Object.assign(box.style, { width: px(bw), height: px(bh), left: px((aw - bw) / 2), top: px((ah - bh) / 2) });
  }
  fit();

  function fillRegion(id, col) {
    palette[id] = col;
    const fn = colorFn(col, R.w, R.h);
    for (let k = R.start[id]; k < R.start[id + 1]; k++) {
      const q = R.list[k], p = q * 4;
      const c = fn(q % R.w, (q / R.w) | 0);
      buf[p] = c[0]; buf[p + 1] = c[1]; buf[p + 2] = c[2]; buf[p + 3] = 255;
    }
  }
  function setRegion(id, col) {
    fillRegion(id, col);
    const b = id * 4;
    if (R.bbox[b + 2] >= 0) ctx.putImageData(imgData, 0, 0, R.bbox[b], R.bbox[b + 1], R.bbox[b + 2] - R.bbox[b] + 1, R.bbox[b + 3] - R.bbox[b + 1] + 1);
  }

  // 保存してある色を読みこむ（続きから）
  if (!arg.fresh) {
    const st = loadStore();
    const cols = st.colors && st.colors[SK];
    const savedPainted = (st.painted && st.painted[SK]) || [];
    // 前回「できた！」まで いった絵は、つぎは まっさらから（1か所ぬっただけで すぐ「できた！」に ならないように）。
    // できた絵は カードと アルバムの 写真に のこっている
    const wasDone = info.required.every((r) => savedPainted.indexOf(r) >= 0);
    if (cols && cols.length === R.n + 1 && !wasDone) {
      for (let i = 1; i <= R.n; i++) if (cols[i] && cols[i] !== '#ffffff') fillRegion(i, cols[i]);
      savedPainted.forEach((id) => painted.add(id));
    }
  }
  ctx.putImageData(imgData, 0, 0);
  later(500, () => say('nurie', { once: true }));
  const slotTag = el('div', null, { position: 'absolute', left: '22px', top: '16px', zIndex: '5', padding: '2px 14px', borderRadius: '16px', background: 'rgba(255,255,255,0.85)',
    color: '#8a7a66', fontSize: '22px', pointerEvents: 'none' }, root);
  slotTag.textContent = slot + 'まいめ';

  // 右のパネル
  const panel = el('div', null, { position: 'absolute', right: '0', top: '0', bottom: '0', width: px(PANEL_W), background: '#ffe1a8' }, root);
  // 上に ボタン 4つ（ホーム・もどす・ほぞん・できた）。下は ぜんぶ 色に つかう（色ボタンを 大きく）
  const BTN = 78, bx = (i) => px(14 + i * (PANEL_W - 28 - BTN) / 3);
  iconButton(panel, 'icon_home', BTN, '#ff9a3c', { left: bx(0), top: '12px' }, () => { calmAngel(); if (dirty) save(true); go(selectScreen); });
  iconButton(panel, 'icon_undo', BTN, '#4cc3ff', { left: bx(1), top: '12px' }, undo, false);
  const pal = buildPalette(panel, PANEL_W, COLORS, WIDE ? 60 : 50, WIDE ? 7 : 6, 104, (i) => pick(i, true), view.h - 12,
    key === 'hard' ? { colors: TITLE_COLORS, frame: 'title' } : null);
  allColors = pal.all;
  iconButton(panel, 'icon_save', BTN, '#a46bff', { left: bx(2), top: '12px' }, () => save(), false);
  iconButton(panel, 'icon_done', BTN, '#ff5a8a', { left: bx(3), top: '12px' }, tryDone, false);

  function pick(i, sound) {
    if (sound) se('click', 0.8 + 0.03 * i);
    currentColor = i;
    markSelected(pal.items, i);
  }
  pick(0, false);

  // 塗る：絵をさわると、その部分がまるごと塗られる。線の上でも近くの部分を探す
  function regionAt(x, y) {
    if (x < 0 || y < 0 || x >= R.w || y >= R.h) return 0;
    return R.ids[y * R.w + x];
  }
  function findRegion(x, y, radius) {
    let id = regionAt(x, y);
    if (id > 0) return id;
    for (let r = 2; r <= radius; r += 2) {
      for (let k = 0; k < 16; k++) {
        const a = Math.PI * 2 * k / 16;
        id = regionAt(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r));
        if (id > 0) return id;
      }
    }
    return 0;
  }
  function paintAt(ev) {
    if (finished) return;
    const rc = box.getBoundingClientRect();
    const ix = Math.floor((ev.clientX - rc.left) / rc.width * R.w);
    const iy = Math.floor((ev.clientY - rc.top) / rc.height * R.h);
    const stagePxPerImgPx = rc.width / view.scale / R.w;
    const id = findRegion(ix, iy, Math.ceil(TAP_RADIUS / stagePxPerImgPx));
    if (id <= 0) return;
    const col = allColors[currentColor];
    const prev = palette[id];
    if (prev === col && painted.has(id)) return;
    undoStack.push([id, prev, painted.has(id)]);
    if (mischief.has(id)) mischief.delete(id);   // 子どもが ぬりなおした 所は、いたずらから はずす
    setRegion(id, col);
    painted.add(id);
    dirty = true;
    se('paint', rand(0.9, 1.15));
    if (info.required.every((r) => painted.has(r))) celebrate();
  }
  const zoom = makeZoom(root, area, box, { mode: 'tap', tap: paintAt, enabled: () => !finished });

  // 「できた」を 押した時、まだ ぬっていない 所が あれば、その 所を やさしく 光らせて 知らせる。
  // もういちど（4びょう いないに）押したら、そのまま できあがり（白の ままに したい 子も いるので）
  let doneAsked = 0, hintLayer = null;
  function tryDone() {
    if (finished) return;
    calmAngel();
    const left = info.required.filter((r) => !painted.has(r));
    if (left.length === 0 || performance.now() - doneAsked < 4000) { if (hintLayer) hintLayer.remove(); celebrate(); return; }
    doneAsked = performance.now();
    se('tap', 1.2);
    if (hintLayer) hintLayer.remove();
    hintLayer = layerCanvas();
    const hx = hintLayer.getContext('2d');
    hx.fillStyle = '#ffd23f'; hx.fillRect(0, 0, R.w, R.h);
    hx.globalCompositeOperation = 'destination-in';
    const set = new Set(left);
    hx.drawImage(maskCanvas(maskOf((id) => set.has(id))), 0, 0);
    hintLayer.style.mixBlendMode = 'multiply';
    const a = hintLayer.animate([{ opacity: 0 }, { opacity: 0.7 }, { opacity: 0 }], { duration: 900, iterations: 3, easing: 'ease-in-out' });
    const hl = hintLayer;
    a.onfinish = () => { hl.remove(); if (hintLayer === hl) hintLayer = null; };
    const tip = el('div', null, { position: 'absolute', left: '0', right: px(PANEL_W), bottom: '18px', height: '84px', zIndex: '6', pointerEvents: 'none' }, root);
    label('まだ しろい ところが あるよ', 34, '#c45d7a', { left: '0', right: '0', top: '0' }, tip);
    label('もういちど おすと できあがり', 26, '#8a7a66', { left: '0', right: '0', top: '46px' }, tip);
    tip.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: 3600, fill: 'forwards' }).onfinish = () => tip.remove();
  }

  // ===== かくし：天使の いたずら =====
  // 30びょう なにも さわらないと、いたずら天使が とんできて、かってに でたらめな 色で ぬっていく。
  // 天使を タッチすると ぴゅーっと にげて、いたずらで ぬられた 色は もとに もどる。
  const mischief = new Map();   // 部分の 番号 → もとの 色
  let angel = null, angelTimer = 0, lastAct = performance.now();
  root.addEventListener('pointerdown', () => { lastAct = performance.now(); }, true);
  const IMP_COLORS = COLORS.concat(FUN_COLORS);
  function angelPos(x, y, ms) {   // 絵の 中の 位置（画素）へ 天使の 筆先を うごかす
    const rc = box.getBoundingClientRect(), sc = rc.width / R.w / view.scale;
    const tx = x * sc - 95, ty = y * sc - 118;
    const a = angel;
    const from = a.pos || [tx + 300, ty - 300];
    a.pos = [tx, ty];
    a.el.animate([{ transform: 'translate(' + px(from[0]) + ',' + px(from[1]) + ')' }, { transform: 'translate(' + px(tx) + ',' + px(ty) + ')' }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
  }
  function angelPaint() {
    if (!angel || finished) return;
    const ids = [];
    for (let i = 1; i <= R.n; i++) if (R.start[i + 1] - R.start[i] > 400) ids.push(i);
    const id = ids[Math.floor(Math.random() * ids.length)];
    const q = R.list[R.start[id] + Math.floor(Math.random() * (R.start[id + 1] - R.start[id]))];
    angelPos(q % R.w, (q / R.w) | 0, 700);
    later(720, () => {
      if (!angel || finished) return;
      if (!mischief.has(id)) mischief.set(id, palette[id]);
      setRegion(id, IMP_COLORS[Math.floor(Math.random() * IMP_COLORS.length)]);
      se('paint', rand(1.3, 1.6));
      angel.el.animate([{ filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.2)) brightness(1)' }, { filter: 'drop-shadow(0 0 14px #fff6c8) brightness(1.15)' }, { filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.2)) brightness(1)' }], { duration: 300 });
      if (Math.random() < 0.3) se('tap', rand(1.6, 1.9), -6);   // くすくす
    });
    angelTimer = setTimeout(angelPaint, 1300);
  }
  function summonAngel() {
    if (angel || finished) return;
    // タイトルの 天使（くもに のって とんでくる）
    const el2 = el('div', null, { position: 'absolute', left: '0', top: '0', width: '190px', height: '140px', zIndex: '8', cursor: 'pointer',
      filter: 'drop-shadow(0 6px 6px rgba(0,0,0,0.2))' }, box);
    const im = pic('imp_angel', null, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }, el2);
    im.animate([{ transform: 'translateY(0) rotate(-4deg)' }, { transform: 'translateY(-8px) rotate(4deg)' }], { duration: 420, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    angel = { el: el2, pos: null };
    se('secret', 1.5, -6);
    el2.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); chaseAngel(); });
    angelPaint();
  }
  function restoreMischief() {
    mischief.forEach((col, id) => setRegion(id, col));
    mischief.clear();
  }
  /** にげる（タッチされた）：ぴゅーっと とんでいき、色が もとに もどる */
  function chaseAngel() {
    if (!angel) return;
    clearTimeout(angelTimer);
    const a = angel; angel = null;
    se('undo', 1.6); se('start', 1.5, -4);
    const p = a.pos || [0, 0];
    a.el.animate([{ transform: 'translate(' + px(p[0]) + ',' + px(p[1]) + ') rotate(0)' }, { transform: 'translate(' + px(p[0] + 60) + ',' + px(p[1] - 40) + ') rotate(-20deg)', offset: 0.2 },
      { transform: 'translate(' + px(p[0] + 900) + ',' + px(p[1] - 700) + ') rotate(40deg) scale(0.4)' }], { duration: 900, easing: 'ease-in', fill: 'forwards' }).onfinish = () => a.el.remove();
    // 色が 1つずつ ぽんぽん もどる
    const back = Array.from(mischief.entries()); mischief.clear();
    back.forEach(([id, col], i) => later(150 + i * 90, () => { setRegion(id, col); se('click', 1.4); }));
    lastAct = performance.now();
  }
  /** すぐに しずめる（ホーム・できた・画面の 作りなおし の 前） */
  function calmAngel() {
    clearTimeout(angelTimer);
    if (angel) { angel.el.remove(); angel = null; }
    restoreMischief();
  }
  const impT = setInterval(() => {
    if (!root.isConnected) { clearInterval(impT); return; }
    if (!angel && !finished && performance.now() - lastAct > (arg.impWait || 30000)) summonAngel();
  }, 1000);

  // はじめて ぬりえを ひらいた 時だけ、大きな 手が「いろを えらぶ → ここを タッチ」を 1回 やって 見せる（さわると すぐ おわる）
  (function fingerDemo() {
    let seen = false;
    try { seen = !!localStorage.getItem('tenshi_nurie_demo'); } catch (e) { seen = true; }
    if (seen || arg.noDemo) return;
    try { localStorage.setItem('tenshi_nurie_demo', '1'); } catch (e) { /* なにもしない */ }
    const HW = 170, HH = 187;
    const hand = el('div', null, { position: 'absolute', left: '0', top: '0', width: px(HW), height: px(HH), zIndex: '60', pointerEvents: 'none', opacity: '0',
      transformOrigin: '30% 5%', filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.22))' }, root);
    hand.innerHTML = '<svg viewBox="0 0 100 110" width="100%" height="100%"><path d="M30 8 c0-7 12-7 12 0 v38 h2 v-30 c0-7 12-7 12 0 v30 h2 v-24 c0-7 12-7 12 0 v28 h2 v-16 c0-7 12-7 12 0 v40 c0 26-16 40-36 40 c-16 0-26-8-34-22 l-14-24 c-4-7 5-13 11-7 l11 12 z" fill="#ffe0c8" stroke="#c98a6a" stroke-width="4" stroke-linejoin="round"/></svg>';
    let stop = false, cur = [view.w + 60, view.h * 0.7];
    const toLocal = (r) => [(r.left + r.width / 2 - (view.ox || 0)) / view.scale, (r.top + r.height / 2 - (view.oy || 0)) / view.scale];
    const put = (p) => { hand.style.transform = 'translate(' + px(p[0] - HW * 0.3) + ',' + px(p[1] - 6) + ')'; };
    const move = (to, ms) => new Promise((ok) => {
      if (stop) { ok(); return; }
      const from = cur.slice(); const t0 = performance.now();
      const st = (now) => {
        const k = stop ? 1 : Math.min(1, (now - t0) / ms), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        cur = [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e]; put(cur);
        if (k < 1) requestAnimationFrame(st); else ok();
      };
      requestAnimationFrame(st);
    });
    const wait = (ms) => new Promise((ok) => setTimeout(ok, stop ? 0 : ms));
    const press = (at) => {
      hand.animate([{ transform: hand.style.transform + ' scale(1)' }, { transform: hand.style.transform + ' scale(0.86)' }, { transform: hand.style.transform + ' scale(1)' }], { duration: 360 });
      const ring = el('div', null, { position: 'absolute', left: px(at[0] - 30), top: px(at[1] - 30), width: '60px', height: '60px', borderRadius: '50%', border: '6px solid #ffd23f',
        boxSizing: 'border-box', zIndex: '59', pointerEvents: 'none' }, root);
      ring.animate([{ transform: 'scale(0.4)', opacity: 1 }, { transform: 'scale(1.6)', opacity: 0 }], { duration: 600, easing: 'ease-out' }).onfinish = () => ring.remove();
    };
    root.addEventListener('pointerdown', () => { stop = true; hand.style.opacity = '0'; }, { capture: true, once: true });
    later(900, async () => {
      if (stop) return;
      put(cur); hand.style.transition = 'opacity 0.4s'; hand.style.opacity = '1';
      const sw = pal.items[0].getBoundingClientRect();
      // いちばん 大きい 部分の まん中あたり
      let best = info.required[0], bn = 0;
      info.required.forEach((id) => { const n = R.start[id + 1] - R.start[id]; if (n > bn) { bn = n; best = id; } });
      const b = R.bbox[best * 4], bb = [R.bbox[best * 4], R.bbox[best * 4 + 1], R.bbox[best * 4 + 2], R.bbox[best * 4 + 3]];
      let tx = (bb[0] + bb[2]) / 2, ty = (bb[1] + bb[3]) / 2;
      if (R.ids[Math.round(ty) * R.w + Math.round(tx)] !== best) { const q = R.list[R.start[best] + Math.floor(bn / 2)]; tx = q % R.w; ty = (q / R.w) | 0; }
      const br = canvas.getBoundingClientRect();
      const target = toLocal({ left: br.left + tx / R.w * br.width, top: br.top + ty / R.h * br.height, width: 0, height: 0 });
      const swp = toLocal(sw);
      for (let rep = 0; rep < 2 && !stop; rep++) {
        await move(swp, 1100); await wait(250); if (!stop) press(swp); await wait(600);
        await move(target, 1300); await wait(250); if (!stop) press(target); await wait(900);
      }
      await move([view.w + 80, cur[1] - 60], 900);
      hand.style.opacity = '0';
      later(500, () => hand.remove());
    });
  })();

  function undo() {
    if (finished || undoStack.length === 0) return;
    const e = undoStack.pop();
    se('undo');
    setRegion(e[0], e[1]);
    if (!e[2]) painted.delete(e[0]);
    dirty = true;
  }

  // 保存（1つの絵に1枚。上書き）。quiet：自動保存（音・文字を出さない）
  function save(quiet) {
    const st = loadStore();
    st.colors = st.colors || {}; st.painted = st.painted || {};
    st.colors[SK] = palette.slice();
    st.painted[SK] = Array.from(painted);
    const ok1 = writeStore(st);
    const tw = Math.min(R.w, 640), th = Math.round(R.h * tw / R.w);
    const t = document.createElement('canvas');
    t.width = tw; t.height = th;
    const tx = t.getContext('2d');
    tx.fillStyle = '#ffffff'; tx.fillRect(0, 0, tw, th);
    tx.drawImage(canvas, 0, 0, tw, th);
    tx.drawImage(IMG[info.line], 0, 0, tw, th);
    const url = t.toDataURL('image/jpeg', 0.85);
    const ok2 = saveThumb(SK, url);
    if (finished) saveThumb('done_' + key, url);   // できた絵は アルバム用に べつに のこす（ぬりなおしても 消えない）
    if (ok1 && ok2) dirty = false;
    if (quiet === true) return;
    if (ok1 && ok2) { se('save'); flashSaved(root, PANEL_W); } else { se('undo', 0.7); }
  }

  // できた！
  function celebrate() {
    if (finished) return;
    calmAngel();
    finished = true;
    se('fanfare');
    zoom.reset();
    zoom.hideButtons();
    save(true);   // できた絵は自動で保存（えらぶ画面のカード・アルバムにも出る）
    markDone(key);
    // かくし：天使（やさしい）を全部同じ とくべつな色（きん・ぎん・にじ・きらきら・みずたま）で塗ると、とくべつな天使
    const c0 = palette[info.required[0]];
    const golden = key === 'easy' && SPECIAL_ANGELS[c0] && info.required.every((id) => palette[id] === c0) ? c0 : null;
    const sp = golden ? SPECIAL_ANGELS[golden] : null;
    if (golden) later(4200, () => awardStamp(golden, root));
    // かくし（ふつう）：マリアさまの ベールが 青／おそろいの ふく／ベールと 子どもの かみが きん
    if (key === 'normal') {
      const P = NORMAL_PART, c = (k) => palette[P[k]];
      const found = [];
      if (['#4cc3ff', '#3b6cff', '#93b5d8'].indexOf(c('veil')) >= 0) found.push('blueveil');
      const rc = c('robeL');
      if (rc !== '#ffffff' && rc === c('robeR') && ['dress', 'dress_v', 'skirt_a', 'skirt_a_0.5', 'skirt_b', 'skirt_d'].some((k) => P[k] && c(k) === rc)) found.push('osoroi');
      if (c('veil') === 'gold' && c('chair') === 'gold') found.push('goldpair');
      found.forEach((id, i) => later(4200 + i * 2600, () => awardStamp(id, root)));
    }
    // 絵を「できたね！」とボタンの間におさめて、文字やボタンで隠れないようにする
    area.style.top = '112px';
    area.style.bottom = '150px';
    fit();
    zoom.refresh();
    panel.classList.add('dim');
    // 写真用の画像を先に作っておく（ボタンを押した時にすぐ保存できるように）
    let photoBlob = null;
    const drawPhotoPic = (x, px0, py0, w, h) => { x.drawImage(canvas, px0, py0, w, h); x.drawImage(IMG[info.line], px0, py0, w, h); };
    const photo = makePhotoCanvas(R.w, R.h, drawPhotoPic, golden);
    canvasToBlob(photo).then((b) => { photoBlob = b; });
    bringToLife(golden);

    const layer = el('div', null, { position: 'absolute', inset: '0', pointerEvents: 'none' }, root);
    for (let i = 0; i < 50; i++) {
      const dur = rand(2.2, 4.0);
      const cf = el('div', 'confetti', {
        background: COLORS[Math.floor(Math.random() * 10)], width: px(rand(12, 22)), height: px(rand(18, 30)),
        left: (Math.random() * 100) + '%', top: px(-40), animationDuration: dur + 's', animationDelay: (-Math.random() * dur) + 's',
      }, layer);
      cf.style.setProperty('--dist', px(Math.max(view.h, 1000) + 80));
      cf.style.setProperty('--rot', rand(-8, 8) + 'rad');
    }
    const cxs = (d) => 'calc((100% - ' + PANEL_W + 'px) / 2 + ' + d + 'px)';
    const text = sp ? sp.name : 'できたね！';
    const fs = Math.min(84, (view.w - PANEL_W - 200) / text.length);   // 長い名前は少し小さく（画面からはみ出さない）
    const msg = sp
      ? label(text, fs, sp.fill, { left: '0', right: px(PANEL_W), top: '10px', WebkitTextStrokeColor: sp.stroke }, layer)
      : label(text, fs, '#e64d73', { left: '0', right: px(PANEL_W), top: '10px' }, layer);
    later(400, () => say(golden ? 'angel_' + golden : 'done'));
    msg.animate([{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 500, easing: 'cubic-bezier(0.34,1.56,0.64,1)', fill: 'forwards' });
    const half = fs * text.length / 2;
    [-half - 80, half + 10].forEach((dx) => {
      const s = pic('icon_star', null, { position: 'absolute', width: '70px', height: '70px', left: cxs(dx), top: '22px' }, layer);
      s.animate([{ transform: 'rotate(0turn) scale(1)' }, { transform: 'rotate(0.5turn) scale(1.2)' }], { duration: 900, iterations: Infinity, direction: 'alternate' });
    });
    const btns = el('div', null, { position: 'absolute', inset: '0' }, root);
    // ボタンは3つ（もういちど・しゃしん・ホーム）。絵は自動で保存ずみなので、ほぞんボタンは出さない。
    // しゃしんは真ん中に大きく、光の輪でぴかぴか（おうちの人が写真に残しやすいように）
    iconButton(btns, 'icon_again', 110, '#2fb36d', { left: cxs(-235), bottom: '30px' }, () => go(nurieScreen, { key: key, slot: slot, fresh: true }));
    photoButton(btns, cxs(-75), '14px', () => askName(root, (name) => {
      if (!name) { if (photoBlob) sharePhoto(photoBlob); else canvasToBlob(photo).then(sharePhoto); return; }
      sharePhoto(canvasBlobSync(makePhotoCanvas(R.w, R.h, drawPhotoPic, golden, name)));
    }));
    iconButton(btns, 'icon_home', 110, '#ff9a3c', { left: cxs(125), bottom: '30px' }, () => go(selectScreen));
    btns.style.pointerEvents = 'none';
    Array.from(btns.children).forEach((b) => { b.style.pointerEvents = 'auto'; });
  }

  // ---------- できた！：絵が動き出す ----------
  let lifeRaf = 0;
  function maskOf(test) {
    const m = new Uint8Array(R.w * R.h);
    for (let i = 0; i < m.length; i++) if (test(R.ids[i])) m[i] = 1;
    return m;
  }
  function dilate(m, r) {
    const w = R.w, h = R.h, tm = new Uint8Array(w * h), out = new Uint8Array(w * h);
    const ps = new Int32Array(Math.max(w, h) + 1);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) ps[x + 1] = ps[x] + m[y * w + x];
      for (let x = 0; x < w; x++) tm[y * w + x] = ps[Math.min(w, x + r + 1)] - ps[Math.max(0, x - r)] > 0 ? 1 : 0;
    }
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) ps[y + 1] = ps[y] + tm[y * w + x];
      for (let y = 0; y < h; y++) out[y * w + x] = ps[Math.min(h, y + r + 1)] - ps[Math.max(0, y - r)] > 0 ? 1 : 0;
    }
    return out;
  }
  function layerCanvas() {
    const c = el('canvas', null, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' }, box);
    c.width = R.w; c.height = R.h;
    return c;
  }
  function maskCanvas(m) {
    const c = document.createElement('canvas');
    c.width = R.w; c.height = R.h;
    const x = c.getContext('2d'), im = x.createImageData(R.w, R.h);
    for (let i = 0; i < m.length; i++) if (m[i]) im.data[i * 4 + 3] = 255;
    x.putImageData(im, 0, 0);
    return c;
  }
  function bringToLife(golden) {
    const alive = info.alive || {};
    // 絵全体：ぴょんと跳ねて、ふわふわ浮かぶ（天使は高く）
    const fl = alive.float || 10;
    let jump;
    const sp = golden ? SPECIAL_ANGELS[golden] : null;
    const cx = 16 + area.clientWidth / 2, cy = 112 + area.clientHeight / 2;
    if (sp) {
      se('secret');
      // 光（にじは、光の色がぐるぐる変わる）
      const ds = (a, b, r) => 'drop-shadow(0 0 ' + r + 'px ' + a + ') drop-shadow(0 0 ' + (r * 2.3) + 'px ' + b + ')';
      if (sp.glow) {
        area.animate([{ filter: ds(sp.glow[0], sp.glow[1], 10) }, { filter: ds(sp.glow[0], sp.glow[1], 26) }],
          { duration: 700, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
      } else {
        const hues = ['#ff4d4d', '#ff9a3c', '#ffd93b', '#8ee05a', '#4cc3ff', '#a46bff', '#ff4d4d'];
        area.animate(hues.map((h) => ({ filter: ds(h, h, 20) })), { duration: 2100, iterations: Infinity });
      }
      sparkle(root, cx, cy, 24);
    }
    if (sp && sp.move === 'spin') {
      // ぎん：コインのように、くるくる回る
      later(1600, () => { sparkle(root, cx, cy, 24); se('save'); });
      jump = area.animate([
        { transform: 'translateY(0) rotateY(0turn)' },
        { transform: 'translateY(-50px) rotateY(1turn)', offset: 0.45, easing: 'ease-in-out' },
        { transform: 'translateY(-50px) rotateY(3turn)', offset: 0.8, easing: 'ease-out' },
        { transform: 'translateY(0) rotateY(3turn)' },
      ], { duration: 2600 });
    } else if (sp && sp.move === 'shake') {
      // きらきら：ぷるぷる震えて、ぴょーん。そのあと、ずっと星がふる
      jump = area.animate([
        { transform: 'translate(0,0)' }, { transform: 'translate(-8px,0)', offset: 0.05 }, { transform: 'translate(8px,0)', offset: 0.1 },
        { transform: 'translate(-8px,0)', offset: 0.15 }, { transform: 'translate(8px,0)', offset: 0.2 }, { transform: 'translate(-8px,0)', offset: 0.25 },
        { transform: 'translate(0,0) scale(1)', offset: 0.32 }, { transform: 'translate(0,-90px) scale(1.08)', offset: 0.62, easing: 'ease-in' },
        { transform: 'translate(0,0) scale(1)' },
      ], { duration: 1800, easing: 'ease-out' });
      const rain = () => {
        sparkle(root, rand(20, view.w - PANEL_W - 20), rand(120, view.h - 160), 3);
        later(160, rain);
      };
      later(1000, rain);
    } else if (sp && sp.move === 'boing') {
      // みずたま：ぼよよーんと弾んで、シャボン玉のような水玉がのぼっていく
      area.style.transformOrigin = '50% 100%';
      jump = area.animate([
        { transform: 'translateY(0) scale(1,1)' }, { transform: 'translateY(0) scale(1.18,0.82)', offset: 0.15 },
        { transform: 'translateY(-80px) scale(0.88,1.14)', offset: 0.4 }, { transform: 'translateY(0) scale(1.12,0.88)', offset: 0.62 },
        { transform: 'translateY(-24px) scale(0.96,1.04)', offset: 0.8 }, { transform: 'translateY(0) scale(1,1)' },
      ], { duration: 1600, easing: 'ease-in-out' });
      const bubble = () => {
        const d = rand(20, 56), x0 = rand(30, view.w - PANEL_W - 60);
        const b = el('div', null, {
          position: 'absolute', left: px(x0), top: px(view.h - 120), width: px(d), height: px(d), borderRadius: '50%', pointerEvents: 'none',
          background: Math.random() < 0.5 ? 'rgba(255,92,122,0.75)' : 'rgba(255,255,255,0.85)', border: '3px solid #fff', boxSizing: 'border-box',
        }, root);
        b.animate([{ transform: 'translate(0,0)', opacity: 0 }, { opacity: 1, offset: 0.1 }, { transform: 'translate(' + rand(-60, 60) + 'px,' + (-view.h * 0.8) + 'px)', opacity: 0 }],
          { duration: rand(2600, 4000), easing: 'ease-out' }).onfinish = () => b.remove();
        later(220, bubble);
      };
      later(600, bubble);
    } else if (sp) {
      // きん・にじ：光りながら空へ飛んでいき、上からふわっと戻ってくる
      const up = -(view.h + 150);
      later(2300, () => { sparkle(root, cx, cy, 30); se('save'); });
      jump = area.animate([
        { transform: 'translateY(0) scale(1)' },
        { transform: 'translateY(30px) scale(0.96)', offset: 0.08, easing: 'ease-out' },
        { transform: 'translateY(' + up + 'px) scale(1.05)', offset: 0.4, easing: 'ease-in' },
        { transform: 'translateY(' + up + 'px) scale(1.05)', offset: 0.52 },
        { transform: 'translateY(-60px) scale(1.08)', offset: 0.85, easing: 'ease-out' },
        { transform: 'translateY(0) scale(1)' },
      ], { duration: 3400, easing: 'linear' });
    }
    if (!sp) {
      jump = area.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-40px) scale(1.04)' }, { transform: 'translateY(0) scale(1)' }],
        { duration: 600, easing: 'ease-out' });
    }
    jump.onfinish = () => {
      area.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(' + (-fl) + 'px)' }],
        { duration: 1300, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    };
    // 塗った絵＋線を1枚にした「舞台」
    const scene = layerCanvas();
    const sx = scene.getContext('2d');
    sx.drawImage(canvas, 0, 0);
    sx.drawImage(IMG[info.line], 0, 0, R.w, R.h);
    // 羽ばたく羽（天使）
    if (alive.wings) {
      const sd = sx.getImageData(0, 0, R.w, R.h);
      const ringFn = colorFn(palette[alive.around] || '#ffffff', R.w, R.h);
      const keep = new Set([0, alive.around]);
      alive.wings.forEach((wg) => keep.add(wg.id));
      const near = dilate(maskOf((id) => !keep.has(id)), 7);
      alive.wings.forEach((wg) => {
        const wm = dilate(maskOf((id) => id === wg.id), 5);
        const sp = layerCanvas();
        const spx = sp.getContext('2d'), spd = spx.createImageData(R.w, R.h);
        for (let i = 0; i < wm.length; i++) {
          if (!wm[i]) continue;
          const o = i * 4;
          spd.data[o] = sd.data[o]; spd.data[o + 1] = sd.data[o + 1]; spd.data[o + 2] = sd.data[o + 2]; spd.data[o + 3] = 255;
          if (!near[i]) {   // 羽の下は、まわりの色でうめておく（羽が動いてもすき間が見えない）
            const c = ringFn(i % R.w, (i / R.w) | 0);
            sd.data[o] = c[0]; sd.data[o + 1] = c[1]; sd.data[o + 2] = c[2]; sd.data[o + 3] = 255;
          }
        }
        spx.putImageData(spd, 0, 0);
        sp.style.transformOrigin = (wg.pivot[0] * 100) + '% ' + (wg.pivot[1] * 100) + '%';
        sp.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(' + (wg.dir * 12) + 'deg)' }],
          { duration: 420, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
      });
      sx.putImageData(sd, 0, 0);
      // 羽は舞台より手前に
      Array.from(box.querySelectorAll('canvas')).slice(-alive.wings.length).forEach((c) => box.appendChild(c));
    }
    // 空に雲が流れる（建物の絵）
    let skyCv = null, skyMask = null;
    if (alive.sky) {
      let best = 0, bestN = 0;
      for (let id = 1; id <= R.n; id++) {
        const n = R.start[id + 1] - R.start[id];
        if (R.bbox[id * 4 + 1] <= 4 && n > bestN) { best = id; bestN = n; }
      }
      if (best) { skyMask = maskCanvas(maskOf((id) => id === best)); skyCv = layerCanvas(); }
      // かくし：空を青っぽい色で塗ると、鳥のむれが飛んでいく
      if (best && ['#4cc3ff', '#3b6cff', '#93b5d8', '#5fe3c0'].indexOf(palette[best]) >= 0) {
        const flock = () => {
          const y0 = rand(6, 26), n = 5 + Math.floor(Math.random() * 3), dur = rand(5200, 7200);
          for (let i = 0; i < n; i++) {
            const w = rand(6.5, 9.5);
            const b = el('div', null, { position: 'absolute', left: '-10%', top: (y0 + (i % 2 ? 4 : 0) + i * 1.6) + '%', width: w + '%', height: (w * 0.4) + '%', pointerEvents: 'none' }, box);
            b.innerHTML = BIRD_SVG;
            const sv = b.firstChild;
            sv.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(-0.5)' }], { duration: rand(260, 340), iterations: Infinity, direction: 'alternate' });
            b.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(' + px(box.clientWidth * 1.25) + ',' + px(rand(-30, 30)) + ')' }],
              { duration: dur, delay: i * 160 + (i % 2) * 120, easing: 'linear', fill: 'backwards' }).onfinish = () => b.remove();
          }
          later(dur + rand(800, 2000), flock);
        };
        later(900, flock);
        later(3500, () => awardStamp('birds', root));
      }
    }
    // キラーンと光が走る
    const shine = layerCanvas();
    const shineMask = maskCanvas(maskOf((id) => id > 0));
    const shx = shine.getContext('2d');
    const clouds = [0, 1, 2, 3].map((i) => ({ x: Math.random() * R.w, y: R.h * (0.06 + 0.07 * i), s: R.w * rand(0.06, 0.1), v: R.w * rand(0.02, 0.045) }));
    const t0 = performance.now();
    let last = t0;
    const step = (now) => {
      const dt = (now - last) / 1000; last = now;
      const t = ((now - t0) / 1000) % 3.2;
      shx.clearRect(0, 0, R.w, R.h);
      if (t < 1.4) {
        const k = t / 1.4, cx = -0.3 * R.w + k * 1.6 * R.w;
        const g = shx.createLinearGradient(cx - R.w * 0.15, 0, cx + R.w * 0.15, R.h * 0.3);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        shx.globalCompositeOperation = 'source-over';
        shx.fillStyle = g; shx.fillRect(0, 0, R.w, R.h);
        shx.globalCompositeOperation = 'destination-in';
        shx.drawImage(shineMask, 0, 0);
        shx.globalCompositeOperation = 'source-over';
      }
      if (skyCv) {
        const cx2 = skyCv.getContext('2d');
        cx2.clearRect(0, 0, R.w, R.h);
        cx2.fillStyle = 'rgba(255,255,255,0.92)';
        clouds.forEach((c) => {
          c.x += c.v * dt;
          if (c.x - c.s * 2 > R.w) c.x = -c.s * 2;
          [[0, 0, 1], [-0.8, 0.25, 0.7], [0.8, 0.25, 0.75], [0.3, -0.35, 0.7]].forEach((b) => {
            cx2.beginPath(); cx2.arc(c.x + b[0] * c.s, c.y + b[1] * c.s, c.s * b[2] * 0.7, 0, Math.PI * 2); cx2.fill();
          });
        });
        cx2.globalCompositeOperation = 'destination-in';
        cx2.drawImage(skyMask, 0, 0);
        cx2.globalCompositeOperation = 'source-over';
      }
      lifeRaf = requestAnimationFrame(step);
    };
    lifeRaf = requestAnimationFrame(step);
    // とくべつな色のところに、きらきら星
    let stars = 0;
    for (let id = 1; id <= R.n && stars < 30; id++) {
      if (SPECIAL_COLORS.indexOf(palette[id]) < 0) continue;
      const n = R.start[id + 1] - R.start[id];
      for (let k = 0; k < 2 && stars < 30; k++, stars++) {
        const q = R.list[R.start[id] + Math.floor(Math.random() * n)];
        const d = rand(4, 7);
        pic('icon_star', 'sparkle', {
          width: d + '%', left: ((q % R.w) / R.w * 100 - d / 2) + '%', top: (((q / R.w) | 0) / R.h * 100 - d / 2) + '%',
          animationDuration: rand(0.5, 1.0) + 's', pointerEvents: 'none',
        }, box);
      }
    }
  }

  return {
    onResize: () => {
      // 画面の 大きさが かわって（全画面・向き・ほかの 機種）色の パネルの はばが かわる時は、ぬった 色を のこして 作りなおす
      const nw = panelWidthFlex(R.w / R.h, key === 'hard' ? 460 : 380);
      if (!finished && (Math.abs(nw - PANEL_W) > 4 || Math.abs(view.h - builtH) > 4)) { calmAngel(); save(true); go(nurieScreen, { key: key, slot: slot, fresh: false }); return; }
      fit(); zoom.refresh();
    },
    dispose() { cancelAnimationFrame(lifeRaf); clearInterval(impT); clearTimeout(angelTimer); },
  };
}

// ======================= じぶんだけの てんし（裏モード） =======================
function drawScreen(root, arg) {
  const PANEL_W = panelWidth(1), WIDE = PANEL_W >= 420, INK = 1536, builtH = view.h;
  let allColors = [];
  const patterns = {};   // とくべつな色の模様（金・銀・きらきら・みずたま）
  function patternFor(c) {
    if (patterns[c]) return patterns[c];
    const T = 192, tile = document.createElement('canvas');
    tile.width = T; tile.height = T;
    const tc = tile.getContext('2d'), im = tc.createImageData(T, T), fn = colorFn(c, 1000, 1000);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const v = fn(x, y), o = (y * T + x) * 4;
      im.data[o] = v[0]; im.data[o + 1] = v[1]; im.data[o + 2] = v[2]; im.data[o + 3] = 255;
    }
    tc.putImageData(im, 0, 0);
    return (patterns[c] = ictx.createPattern(tile, 'repeat'));
  }
  let currentColor = 0, pen = 0, finished = false;
  let tool = 'fill';  // 'fill'（さわった所を塗る）／'pen'（線を描く）
  let strokes = [];   // { c: 色, w: 太さ, p: [x,y,x,y...]（0〜1の位置） }
  let drawing = null;
  let dirty = false;  // 保存してから描いた・塗ったか（ホームに戻る時・できた！の時に自動で保存する）
  const history = []; // もどす用：{ t: 's' }（線）／{ t: 'f', id, prev }（塗り）
  const R = getRegions(SECRET_KEY);
  const palette = [];
  for (let i = 0; i <= R.n; i++) palette.push('#ffffff');

  el('div', null, { position: 'absolute', inset: '0', background: '#2b2350' }, root);
  const area = el('div', null, { position: 'absolute', left: '16px', top: '16px', right: px(PANEL_W + 8), bottom: '16px' }, root);
  const paper = el('div', null, { position: 'absolute', touchAction: 'none' }, area);
  // 塗る層（白い天使。部分ごとに色を塗る）
  const fillCv = el('canvas', null, { position: 'absolute', inset: '0', width: '100%', height: '100%' }, paper);
  fillCv.width = R.w; fillCv.height = R.h;
  const fctx = fillCv.getContext('2d');
  const fimg = fctx.createImageData(R.w, R.h);
  const fbuf = fimg.data;
  function fillRegion(id, col) {
    palette[id] = col;
    const fn = colorFn(col, R.w, R.h);
    for (let k = R.start[id]; k < R.start[id + 1]; k++) {
      const q = R.list[k], o = q * 4, c = fn(q % R.w, (q / R.w) | 0);
      fbuf[o] = c[0]; fbuf[o + 1] = c[1]; fbuf[o + 2] = c[2]; fbuf[o + 3] = 255;
    }
  }
  function putRegion(id) {
    const b = id * 4;
    if (R.bbox[b + 2] >= 0) fctx.putImageData(fimg, 0, 0, R.bbox[b], R.bbox[b + 1], R.bbox[b + 2] - R.bbox[b] + 1, R.bbox[b + 3] - R.bbox[b + 1] + 1);
  }
  function resetFill() {
    for (let id = 1; id <= R.n; id++) fillRegion(id, '#ffffff');
    fctx.putImageData(fimg, 0, 0);
  }
  const ink = el('canvas', null, {
    position: 'absolute', inset: '0', width: '100%', height: '100%',
    WebkitMaskImage: 'url(' + src(SECRET.mask) + ')', maskImage: 'url(' + src(SECRET.mask) + ')',
    WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
  }, paper);
  ink.width = INK; ink.height = INK;
  const ictx = ink.getContext('2d');
  pic(SECRET.line, null, { position: 'absolute', inset: '0', width: '100%', height: '100%' }, paper);

  function fit() {
    const aw = area.clientWidth, ah = area.clientHeight;
    const s = Math.min(aw, ah);
    Object.assign(paper.style, { width: px(s), height: px(s), left: px((aw - s) / 2), top: px((ah - s) / 2) });
  }
  fit();

  function rainbowAt(i) { const c = hslToRgb((i * 9) % 360, 0.9, 0.6); return 'rgb(' + c + ')'; }
  function styleFor(s, segIndex) {
    let st = s.c;
    if (s.c === 'rainbow') st = rainbowAt(segIndex || 0);
    else if (s.c[0] !== '#') st = patternFor(s.c);
    ictx.strokeStyle = st; ictx.fillStyle = st;
    ictx.lineWidth = s.w * INK; ictx.lineCap = 'round'; ictx.lineJoin = 'round';
  }
  function drawStroke(s) {
    styleFor(s, 0);
    const p = s.p;
    if (p.length <= 2) {
      ictx.beginPath(); ictx.arc(p[0] * INK, p[1] * INK, s.w * INK / 2, 0, Math.PI * 2); ictx.fill();
      return;
    }
    if (s.c === 'rainbow') {   // にじ：少しずつ色が変わる線
      for (let i = 2; i < p.length; i += 2) {
        styleFor(s, i / 2);
        ictx.beginPath(); ictx.moveTo(p[i - 2] * INK, p[i - 1] * INK); ictx.lineTo(p[i] * INK, p[i + 1] * INK); ictx.stroke();
      }
      return;
    }
    ictx.beginPath();
    ictx.moveTo(p[0] * INK, p[1] * INK);
    for (let i = 2; i < p.length; i += 2) ictx.lineTo(p[i] * INK, p[i + 1] * INK);
    ictx.stroke();
  }
  function redraw() {
    ictx.clearRect(0, 0, INK, INK);
    strokes.forEach(drawStroke);
  }

  resetFill();
  if (!arg.fresh) {
    const st = loadStore();
    if (st.drawing && Array.isArray(st.drawing[SECRET_KEY])) strokes = st.drawing[SECRET_KEY];
    let cols = st.colors && st.colors[SECRET_KEY];
    if (cols && cols.length === 30) {   // 文字の 部分を まとめる前（29こ）の 保存を 引きつぐ：1字＝1か所に
      const old = cols, MAP = { 21: 17, 22: 17, 23: 18, 20: 19, 24: 19, 25: 19, 26: 19, 27: 19, 28: 19, 29: 19 };
      cols = old.slice(0, R.n + 1);
      for (let o = 20; o <= 29; o++) if (old[o] && old[o] !== '#ffffff' && (!cols[MAP[o]] || cols[MAP[o]] === '#ffffff')) cols[MAP[o]] = old[o];
    }
    if (cols && cols.length === R.n + 1) {
      for (let id = 1; id <= R.n; id++) if (cols[id] && cols[id] !== '#ffffff') fillRegion(id, cols[id]);
      fctx.putImageData(fimg, 0, 0);
    }
    redraw();
  }

  function posOf(ev) {
    const rc = paper.getBoundingClientRect();
    return [Math.round((ev.clientX - rc.left) / rc.width * 10000) / 10000, Math.round((ev.clientY - rc.top) / rc.height * 10000) / 10000];
  }
  function startStroke(ev) {
    if (finished) return;
    const q = posOf(ev);
    // 拡大しているときは、画面で見た太さが同じになるよう、ペンを細くする（細かいところを描きやすく）
    drawing = { c: allColors[currentColor], w: Math.round(PEN_SIZES[pen] / zoom.scale() * 100000) / 100000, p: [q[0], q[1]], id: ev.pointerId };
    drawStroke(drawing);
    se('paint', rand(1.1, 1.3), -6);
  }
  function moveStroke(ev) {
    if (!drawing || ev.pointerId !== drawing.id) return;
    const evs = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
    (evs.length ? evs : [ev]).forEach((e2) => {
      const q = posOf(e2);
      const p = drawing.p;
      const lx = p[p.length - 2], ly = p[p.length - 1];
      const dpx = Math.hypot(q[0] - lx, q[1] - ly) * paper.getBoundingClientRect().width;
      if (dpx < 2) return;
      styleFor(drawing, p.length / 2);
      ictx.beginPath(); ictx.moveTo(lx * INK, ly * INK); ictx.lineTo(q[0] * INK, q[1] * INK); ictx.stroke();
      p.push(q[0], q[1]);
    });
  }
  function endStroke() {
    if (!drawing) return;
    strokes.push({ c: drawing.c, w: drawing.w, p: drawing.p });
    history.push({ t: 's' });
    drawing = null;
    dirty = true;
  }
  function cancelStroke() {   // 2本指になったら、かきかけの線はなかったことに
    fillDown = null;
    if (!drawing) return;
    drawing = null;
    redraw();
  }
  // 塗る：さわって離した所の部分を、まるごと塗る（線の上でも近くの部分を探す）
  let fillDown = null;
  function regionAt(x, y) {
    if (x < 0 || y < 0 || x >= R.w || y >= R.h) return 0;
    return R.ids[y * R.w + x];
  }
  function fillAt(ev) {
    const rc = paper.getBoundingClientRect();
    const ix = Math.floor((ev.clientX - rc.left) / rc.width * R.w), iy = Math.floor((ev.clientY - rc.top) / rc.height * R.h);
    const radius = Math.ceil(18 / (rc.width / view.scale / R.w));
    let id = regionAt(ix, iy);
    for (let r = 2; id <= 0 && r <= radius; r += 2) {
      for (let k = 0; k < 16 && id <= 0; k++) {
        const a = Math.PI * 2 * k / 16;
        id = regionAt(Math.round(ix + Math.cos(a) * r), Math.round(iy + Math.sin(a) * r));
      }
    }
    if (id <= 0) return;
    const col = allColors[currentColor];
    if (palette[id] === col) return;
    history.push({ t: 'f', id: id, prev: palette[id] });
    fillRegion(id, col);
    putRegion(id);
    dirty = true;
    se('paint', rand(0.9, 1.15));
  }
  const zoom = makeZoom(root, area, paper, {
    mode: 'draw', enabled: () => !finished, cancel: cancelStroke,
    start: (ev) => {
      if (tool === 'pen') { startStroke(ev); return; }
      if (!finished) fillDown = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
    },
    move: (ev) => {
      if (tool === 'pen') { moveStroke(ev); return; }
      // こすっても、さわった所を塗る（1本指では画面は動かないので、取り消さない）
    },
    end: () => {
      if (tool === 'pen') { endStroke(); return; }
      if (fillDown) { fillAt({ clientX: fillDown.x, clientY: fillDown.y }); fillDown = null; }
    },
  });

  // 右のパネル
  const panel = el('div', null, { position: 'absolute', right: '0', top: '0', bottom: '0', width: px(PANEL_W), background: '#d9c8ff' }, root);
  iconButton(panel, 'icon_home', 80, '#ff9a3c', { left: '14px', top: '14px' }, () => { if (dirty) save(true); go(selectScreen); });
  iconButton(panel, 'icon_undo', 80, '#4cc3ff', { left: px(PANEL_W / 2 - 40), top: '14px' }, () => {
    if (finished) return;
    const h = history.pop();
    if (h && h.t === 'f') { se('undo'); fillRegion(h.id, h.prev); putRegion(h.id); dirty = true; return; }
    if (strokes.length === 0) return;
    se('undo'); strokes.pop(); redraw(); dirty = true;
  }, false);
  // ぜんぶけす：まちがえて押しても消えないよう、2回押した時だけ消す（1回目はボタンが赤くなってぷるぷる）
  let clearArmed = 0;
  const clearBtn = iconButton(panel, 'icon_clear', 80, '#9a8fb0', { left: px(PANEL_W - 94), top: '14px' }, () => {
    if (finished) return;
    const now = performance.now();
    if (now - clearArmed > 2500) {
      clearArmed = now;
      se('tap', 0.8);
      clearBtn.style.background = '#e53935';
      clearBtn.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(12deg)' }, { transform: 'rotate(-12deg)' },
        { transform: 'rotate(12deg)' }, { transform: 'rotate(-12deg)' }, { transform: 'rotate(0)' }], { duration: 400 });
      const tip = label('もう1かい おすと ぜんぶ けすよ', 36, '#c62828', { left: '0', right: px(PANEL_W), bottom: '24px', zIndex: '6' }, root);
      tip.animate([{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: 2500, fill: 'forwards' }).onfinish = () => tip.remove();
      later(2500, () => { if (performance.now() - clearArmed >= 2400) clearBtn.style.background = '#9a8fb0'; });
      return;
    }
    clearArmed = 0;
    clearBtn.style.background = '#9a8fb0';
    se('undo', 0.8); strokes = []; history.length = 0; redraw(); resetFill(); dirty = true;
  }, false);
  later(500, () => say('draw', { once: true }));
  const pal = buildPalette(panel, PANEL_W, DRAW_COLORS, WIDE ? 56 : (starryUnlocked() ? 44 : 50), WIDE ? 6 : (starryUnlocked() ? 5 : 6), 108, (i) => {
    se('click', 0.8 + 0.03 * i);
    currentColor = i;
    markSelected(pal.items, i);
  });
  allColors = pal.all;
  currentColor = 1;   // 最初はバケツなので、黒っぽい色ではなく赤から（ペンの黒はいちばん左）
  markSelected(pal.items, currentColor);

  // どうぐ：ぬる（バケツ）・ほそいペン・ふといペン
  const tools = [];
  [null, 16, 40].forEach((d, i) => {
    const b = el('div', null, {
      position: 'absolute', left: px((PANEL_W - 248) / 2 + i * (72 + 16)), top: px(pal.bottom + 16), width: '72px', height: '72px',
      borderRadius: '20px', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }, panel);
    if (d === null) {
      const ic = el('div', null, { width: '56px', height: '56px', borderRadius: '50%', background: '#4cc3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }, b);
      pic('icon_fill', null, { width: '40px', height: '40px' }, ic);
    } else {
      el('div', null, { width: px(d), height: px(d), borderRadius: '50%', background: '#333' }, b);
    }
    onTap(b, () => { se('click'); selectTool(i); });
    tools.push(b);
  });
  function selectTool(i) {
    if (i === 0) tool = 'fill'; else { tool = 'pen'; pen = i - 1; }
    tools.forEach((b, k) => {
      b.style.background = k === i ? '#ffffff' : '#d9ccf2';
      b.style.border = (k === i ? 6 : 2) + 'px solid #26194d';
    });
  }
  selectTool(0);

  iconButton(panel, 'icon_save', 100, '#a46bff', { left: '18px', bottom: '18px' }, () => save(), false);
  iconButton(panel, 'icon_done', 100, '#ff5a8a', { right: '18px', bottom: '18px' }, celebrate, false);

  function save(quiet) {
    const st = loadStore();
    st.drawing = st.drawing || {};
    st.drawing[SECRET_KEY] = strokes;
    st.colors = st.colors || {};
    st.colors[SECRET_KEY] = palette.slice();
    const ok1 = writeStore(st);
    const T = 512;
    const t = document.createElement('canvas'); t.width = T; t.height = T;
    const tx = t.getContext('2d');
    tx.fillStyle = '#ffffff'; tx.fillRect(0, 0, T, T);
    tx.drawImage(fillCv, 0, 0, T, T);
    const m = document.createElement('canvas'); m.width = T; m.height = T;
    const mx = m.getContext('2d');
    mx.drawImage(ink, 0, 0, T, T);
    mx.globalCompositeOperation = 'destination-in';
    mx.drawImage(IMG[SECRET.mask], 0, 0, T, T);
    tx.drawImage(m, 0, 0);
    tx.drawImage(IMG[SECRET.line], 0, 0, T, T);
    const url = t.toDataURL('image/jpeg', 0.88);
    const ok2 = saveThumb(SECRET_KEY, url);
    if (finished) saveThumb('done_' + SECRET_KEY, url);
    if (ok1 && ok2) dirty = false;
    if (quiet === true) return;
    if (ok1 && ok2) { se('save'); flashSaved(root, PANEL_W); } else { se('undo', 0.7); }
  }

  function celebrate() {
    if (finished) return;
    finished = true;
    se('fanfare');
    zoom.reset();
    zoom.hideButtons();
    save(true);   // できた絵は自動で保存（アルバム用にも）
    markDone(SECRET_KEY);
    // かくし：顔の中に、ペンで2つ以上 描いた（目など）か、長く描いたら「にっこり てんし」
    const FACE_ID = 4;
    let marks = 0, inside = 0;
    strokes.forEach((st) => {
      let n = 0;
      for (let i = 0; i < st.p.length; i += 2) {
        const ix = Math.floor(st.p[i] * R.w), iy = Math.floor(st.p[i + 1] * R.h);
        if (ix >= 0 && iy >= 0 && ix < R.w && iy < R.h && R.ids[iy * R.w + ix] === FACE_ID) n++;
      }
      if (n > 0) marks++;
      inside += n;
    });
    const smiling = marks >= 2 || inside >= 25;
    area.style.top = '112px';   // 絵を「すてきな てんし！」とボタンの間におさめる
    area.style.bottom = '160px';
    fit();
    zoom.refresh();
    panel.classList.add('dim');
    area.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-24px)' }],
      { duration: 1000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    const layer = el('div', null, { position: 'absolute', inset: '0' }, root);
    for (let i = 0; i < 28; i++) {
      const d = rand(24, 48);
      pic('icon_star', 'sparkle', {
        width: px(d), height: px(d), left: px(rand(0, view.w - PANEL_W - d)), top: px(rand(0, view.h - d)),
        animationDuration: rand(0.4, 0.9) + 's', pointerEvents: 'none',
      }, layer);
    }
    later(400, () => say(smiling ? 'smile' : 'draw_done'));
    label(smiling ? 'にっこり てんし！' : 'すてきな てんし！', 80, smiling ? '#ff8fcf' : '#ffd94d', { left: '0', right: px(PANEL_W), top: '20px', WebkitTextStrokeColor: '#4d2680' }, layer);
    if (smiling) {
      // うれしそうに左右にゆれて、顔からハートがふわふわ
      paper.style.transformOrigin = '50% 90%';
      paper.animate([{ transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }], { duration: 700, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
      later(300, () => se('secret', 1.3, -4));
      const heart = () => {
        const fx = area.offsetLeft + paper.offsetLeft + paper.offsetWidth * rand(0.42, 0.58);
        const fy = area.offsetTop + paper.offsetTop + paper.offsetHeight * 0.5;
        const d = rand(34, 64);
        const h = el('div', null, { position: 'absolute', left: px(fx - d / 2), top: px(fy - d / 2), width: px(d), height: px(d * 0.9), pointerEvents: 'none', zIndex: '5' }, layer);
        h.innerHTML = HEART_SVG;
        h.animate([{ transform: 'translate(0,0) scale(0.3)', opacity: 0 }, { transform: 'translate(' + rand(-40, 40) + 'px,-60px) scale(1)', opacity: 1, offset: 0.25 },
          { transform: 'translate(' + rand(-140, 140) + 'px,' + (-fy + 40) + 'px) scale(0.8)', opacity: 0 }], { duration: rand(2200, 3200), easing: 'ease-out' }).onfinish = () => h.remove();
        later(260, heart);
      };
      later(200, heart);
      later(3200, () => awardStamp('face', root));
    }
    const cxs = (d) => 'calc((100% - ' + PANEL_W + 'px) / 2 + ' + d + 'px)';
    let photoBlob = null;
    const drawPhotoPic = (x, px0, py0, w, h) => {
      x.fillStyle = '#ffffff'; x.fillRect(px0, py0, w, h);
      x.drawImage(fillCv, px0, py0, w, h);
      const m = document.createElement('canvas'); m.width = w; m.height = h;
      const mx = m.getContext('2d');
      mx.drawImage(ink, 0, 0, w, h);
      mx.globalCompositeOperation = 'destination-in';
      mx.drawImage(IMG[SECRET.mask], 0, 0, w, h);
      x.drawImage(m, px0, py0);
      x.drawImage(IMG[SECRET.line], px0, py0, w, h);
    };
    const photo = makePhotoCanvas(1, 1, drawPhotoPic);
    canvasToBlob(photo).then((b) => { photoBlob = b; });
    iconButton(layer, 'icon_again', 110, '#2fb36d', { left: cxs(-235), bottom: '40px' }, () => go(drawScreen, { fresh: true }));
    photoButton(layer, cxs(-75), '24px', () => askName(root, (name) => {
      if (!name) { if (photoBlob) sharePhoto(photoBlob); else canvasToBlob(photo).then(sharePhoto); return; }
      sharePhoto(canvasBlobSync(makePhotoCanvas(1, 1, drawPhotoPic, null, name)));
    }));
    iconButton(layer, 'icon_home', 110, '#ff9a3c', { left: cxs(125), bottom: '40px' }, () => go(selectScreen));
  }

  return {
    onResize: () => {
      if (!finished && (panelWidth(1) !== PANEL_W || Math.abs(view.h - builtH) > 4)) { save(true); go(drawScreen, { fresh: false }); return; }
      fit(); zoom.refresh();
    },
  };
}

// ======================= はじめる（読みこみ） =======================
function backTarget() {
  if (curFn === nurieScreen || curFn === drawScreen) return () => go(selectScreen);
  if (curFn === selectScreen) return () => { state.secret = false; go(titleScreen); };
  return null;   // タイトルでは、ふつうに ページを もどる
}
// Android の「もどる」ボタンや iPhone の スワイプで、まちがって ゲームから出ないよう、1つ前の画面に もどる
function setupBack() {
  try { history.pushState({ tenshi: 1 }, ''); } catch (e) { return; }
  window.addEventListener('popstate', () => {
    const t = backTarget();
    if (t) { try { history.pushState({ tenshi: 1 }, ''); } catch (e) { /* なにもしない */ } t(); }
    else history.back();
  });
}
async function boot() {
  setupBack();
  layout();
  initAudio();
  const bar = document.getElementById('loadbar');
  let done = 0;
  const total = IMAGES.length + SE_FILES.length + 1;
  const step = () => { done++; bar.style.width = Math.round(done / total * 100) + '%'; };

  const imgJobs = IMAGES.map((f) => new Promise((ok) => {
    const im = new Image();
    im.onload = () => { IMG[f.replace(/\.(png|jpg|webp)$/, '')] = im; step(); ok(); };
    im.onerror = () => { step(); ok(); };
    im.src = IMG_DIR + f;
  }));
  const seJobs = SE_FILES.map((n) => fetch('assets/se/' + n + '.wav')
    .then((r) => r.arrayBuffer())
    .then((b) => (ac ? decodeAudio(b) : null))
    .then((buf) => {
      if (buf) { if (n.indexOf('click') === 0) CLICKS.push(buf); if (n === 'click' || n.indexOf('click') !== 0) SE[n] = buf; }
      step();
    })
    .catch(() => step()));
  const fontJob = (document.fonts ? Promise.all([document.fonts.load('32px Nurie'), document.fonts.load('54px TitlePop')]) : Promise.resolve())
    .catch(() => {}).then(step);

  await Promise.all(imgJobs.concat(seJobs, [fontJob]));
  if (ac) voice.load((b) => decodeAudio(b));
  const ld = document.getElementById('loading');
  ld.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).onfinish = () => ld.remove();
  go(titleScreen);
}
boot();
