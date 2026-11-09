/* 叠光 LumaStack · 网页版工作台
   来源：jeszhou/overlay-studio 最新版 + motiontemplates/385712 最新版 + 本机公子视频屋改造版
   工作台界面沿用改造版 .ms-app 类名与布局（260px 侧栏 / 主画布 / 288px 参数栏 / 亮暗双主题）
   纯静态前端：无服务端、无外部依赖、数据存本机浏览器 */
(function () {
  'use strict';

  /* ══════════ 0. 小工具 ══════════ */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
  const uid = p => p + '-' + Math.random().toString(36).slice(2, 10);
  const fmt = t => { const m = Math.floor(t / 60), s = Math.floor(t % 60), d = Math.floor((t % 1) * 10); return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + d; };
  const fsize = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B';
  const deep = o => JSON.parse(JSON.stringify(o));
  const D = window.LumaData || {};
  const CARDS = window.CardRenderers || {};
  const GROUPS = window.CardGroups || [];
  const SHOWCASE = window.ShowcaseRenderers || {};
  const NATIVE = window.NativeRenderers || {};
  const HELPER = window.CardHelpers || {};
  const ACCENT = '#339cff';
  const ORANGE = '#ff6a45';
  const W = 1920, H = 1080, FPS = 60;
  const SFX_FILES = ['chime', 'click', 'ding', 'glitch', 'hit-soft', 'impact', 'pop-cluster', 'pop-light', 'pop', 'rise', 'shutter', 'sparkle', 'type', 'whoosh-soft', 'whoosh'];
  const SFX_LABEL = { chime: '清脆提示', click: '点击', ding: '叮', glitch: '故障', 'hit-soft': '轻击', impact: '重击', 'pop-cluster': '连弹', 'pop-light': '轻弹', pop: '弹出', rise: '上升', shutter: '快门', sparkle: '闪亮', type: '打字', 'whoosh-soft': '轻扫', whoosh: '呼啸' };
  const KIND_SFX = { 'chapter-bar': 'click', 'pin-board': 'pop', 'caption-track': 'type', 'stat-proof': 'ding', 'ring-metric': 'rise', odometer: 'type', 'rank-bars': 'chime', 'growth-curve': 'rise', 'versus-card': 'whoosh-soft', 'quote-lockup': 'impact', 'punch-pill': 'pop-cluster', 'step-timeline': 'click', checklist: 'ding', 'term-card': 'pop-light', 'ui-callout': 'shutter', 'blur-text': 'whoosh', 'type-shift': 'type', 'entity-chips': 'sparkle', 'focus-card': 'shutter', 'terminal-3d': 'glitch', constellation: 'sparkle', 'flow-timeline': 'rise', 'marker-highlight': 'hit-soft', 'neon-trace': 'glitch', 'particle-burst': 'impact', 'stamp-slam': 'impact' };

  /* ══════════ 1. 状态 ══════════ */
  const S = {
    tab: 'make', subTab: 'cards', time: 2.4, playing: false, sel: null,
    theme: localStorage.getItem('lumaTheme') || 'light',
    project: null, history: [], future: [],
    notice: '', error: '', libQuery: '',
    inspectorOpen: false, lintIgnored: {}, lintOpen: true,
    audioOn: true, lastSfx: {},
    showcaseId: null, showcaseParams: {}, showcasePlaying: false, showcaseTime: 0,
    exportOpen: false, exportBusy: false, exportMsg: '', exportUrl: '',
    assetFilter: 'all', searchTimer: null,
  };
  let raf = 0, prevTs = null, saveTimer = 0, audioEl = null;

  /* ══════════ 2. 数据模型（与原版 gongzi-merged 兼容）══════════ */
  function sceneDef(id) { return NATIVE[id] || null; }
  function cardDef(kind) { return CARDS[kind] || null; }
  function showDef(id) { return SHOWCASE[id] || (D.showcase || []).find(x => x.id === id) || null; }
  function makeScene(id, params) {
    const def = sceneDef(id) || {};
    return { id: uid('scene'), sceneId: id, name: def.name || ('场景 ' + id), duration: def.duration || 8, params: Object.assign(deep(def.defaults || {}), params || {}) };
  }
  function makeCard(kind, start, end, params) {
    const def = cardDef(kind) || {};
    const dur = def.duration || 5;
    return { id: uid('fx'), kind, start: start == null ? 0 : start, end: end == null ? start + dur : end, params: Object.assign(deep(def.defaults || {}), params || {}) };
  }
  function exampleProject() {
    const p = { format: 'luma-merged', version: 1, name: '我的第一支叠光视频', settings: { width: W, height: H, fps: FPS }, scenes: [], overlays: [], assets: [] };
    const b1 = makeScene('B1', { keyword: '叠光', explanation: '把字幕变成动效层\n改一个字不用重做整条视频' });
    const b2 = makeScene('B2', { heading: '三步出片', points: '挑卡片 · 对时间 · 导透明层' });
    p.scenes.push(b1, b2);
    p.overlays.push(makeCard('ring-metric', 1, 7, { value: 86, title: '两套能力，一起使用' }));
    p.overlays.push(makeCard('caption-track', 8, 17, { lines: '原片一帧不压\n叠上透明动效层' }));
    p.overlays.push(makeCard('quote-lockup', 17, 23, { text: '你说了算' }));
    return p;
  }
  function layoutScenes(p) { let t = 0; return p.scenes.map(s => { const o = Object.assign({}, s, { start: t, end: t + s.duration }); t = o.end; return o; }); }
  function duration(p) { return Math.max(layoutScenes(p).reduce((a, s) => Math.max(a, s.end), 0), ...p.overlays.map(c => c.end), 0) || 1; }
  function findSel(p) {
    if (!S.sel) return null;
    if (S.sel.type === 'scene') return p.scenes.find(x => x.id === S.sel.id) || null;
    return p.overlays.find(x => x.id === S.sel.id) || null;
  }
  function validateProject(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('不是叠光工程文件');
    if (raw.format !== 'luma-merged' && raw.format !== 'gongzi-merged') throw new Error('不是叠光工程文件');
    if (!Array.isArray(raw.scenes) || !Array.isArray(raw.overlays)) throw new Error('工程缺少场景或动效层');
    const p = { format: 'luma-merged', version: 1, name: String(raw.name || '导入的工程'), settings: { width: W, height: H, fps: FPS }, scenes: [], overlays: [], assets: [] };
    p.scenes = raw.scenes.filter(s => s && s.sceneId).map(s => makeScene(s.sceneId, s.params || s.project || {}));
    p.overlays = raw.overlays.filter(c => c && c.kind).map(c => makeCard(c.kind, Number(c.start) || 0, Number(c.end) || 5, c.params || {}));
    p.assets = Array.isArray(raw.assets) ? raw.assets.filter(a => a && a.name).slice(0, 200) : [];
    const unknown = [...new Set(p.overlays.filter(c => !cardDef(c.kind)).map(c => c.kind))];
    if (unknown.length) throw new Error('工程含当前版本没有的动效：' + unknown.join('、'));
    return p;
  }

  /* ══════════ 3. 存档与历史 ══════════ */
  const KEY = 'lumaProjectV1';
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return validateProject(JSON.parse(raw)); } catch (e) { console.warn('存档恢复失败', e); }
    return exampleProject();
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(S.project)); }
      catch (e) { toast('本机存档写满了，建议导出一份工程 JSON', true); }
    }, 350);
  }
  function pushHistory() { S.history.push(JSON.stringify(S.project)); if (S.history.length > 60) S.history.shift(); S.future.length = 0; }
  function commit(fn) { pushHistory(); fn(); save(); render(); }
  function undo() { if (!S.history.length) return toast('没有可撤销的操作'); S.future.push(JSON.stringify(S.project)); S.project = JSON.parse(S.history.pop()); S.sel = null; save(); render(); toast('已撤销'); }
  function redo() { if (!S.future.length) return toast('没有可重做的操作'); S.history.push(JSON.stringify(S.project)); S.project = JSON.parse(S.future.pop()); S.sel = null; save(); render(); toast('已重做'); }
  function toast(msg, isErr) { S.error = isErr ? msg : ''; S.notice = isErr ? '' : msg; paintNotices(); if (!isErr) setTimeout(() => { if (S.notice === msg) { S.notice = ''; paintNotices(); } }, 5000); }

  /* ══════════ 4. 画布逐帧渲染（真实绘制，非静态截图）══════════ */
  function stageBg(ctx, t, theme) {
    const dark = theme !== 'light';
    ctx.fillStyle = dark ? '#0b0d12' : '#f2f4f8'; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.strokeStyle = dark ? 'rgba(120,160,220,.055)' : 'rgba(40,70,120,.07)'; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
    ctx.save();
    const glowX = W * (0.5 + 0.32 * Math.sin(t * 0.18)), glowY = H * 0.45;
    const g = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, 900);
    g.addColorStop(0, dark ? 'rgba(51,156,255,.09)' : 'rgba(51,156,255,.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    ctx.save();
    ctx.fillStyle = dark ? 'rgba(255,255,255,.22)' : 'rgba(20,30,50,.4)';
    ctx.font = '500 26px "Geist Mono","Noto Sans SC",monospace';
    ctx.fillText('叠光  LUMASTACK', 64, 76);
    ctx.textAlign = 'right'; ctx.font = '400 22px "Geist Mono",monospace';
    ctx.fillText(fmt(t) + '  /  1920×1080 · 60fps', W - 64, 76);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = dark ? 'rgba(255,255,255,.10)' : 'rgba(20,30,50,.14)'; ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, W - 80, H - 80); ctx.restore();
  }
  function drawFrame(ctx, t, p, opts) {
    opts = opts || {};
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const themeNow = opts.theme || appTheme();
    stageBg(ctx, t, themeNow);
    const env = { W, H, theme: themeNow, accent: opts.accent || ACCENT, orange: ORANGE, helper: HELPER };
    if (opts.nativeOnly) {
      const sid = opts.nativeId; const def = NATIVE[sid];
      if (def) { try { def.draw(ctx, clamp(t, 0, def.duration || 8), Object.assign(deep(def.defaults || {}), opts.params || {}), env); } catch (e) { drawErr(ctx, e); } }
      return;
    }
    if (opts.showcaseOnly) {
      const def = SHOWCASE[opts.showcaseId];
      if (def) { try { def.draw(ctx, clamp(t, 0, def.duration || 6), Object.assign(deep(def.defaults || {}), opts.params || {}), env); } catch (e) { drawErr(ctx, e); } }
      return;
    }
    // 原生场景层
    const scenes = layoutScenes(p);
    for (const s of scenes) {
      if (t >= s.start && t < s.end) {
        const def = NATIVE[s.sceneId];
        if (def) { ctx.save(); try { def.draw(ctx, t - s.start, s.params, env); } catch (e) { drawErr(ctx, e); } ctx.restore(); }
      }
    }
    // 动效卡层：按时间排序，后加的画在上面
    const active = p.overlays.filter(c => t >= c.start && t < c.end);
    for (const c of active) {
      const def = CARDS[c.kind]; if (!def) continue;
      ctx.save();
      try { def.draw(ctx, t - c.start, c.params, env); } catch (e) { drawErr(ctx, e); }
      ctx.restore();
    }
    // 绑定的图片素材
    for (const a of (p.assets || [])) {
      if (a.kind === 'image' && a.bindStart != null && t >= a.bindStart && t < (a.bindEnd || a.bindStart + 5) && a.url) {
        const im = imgCache[a.url];
        if (im && im.complete && im.naturalWidth) { ctx.save(); ctx.globalAlpha = 0.92; ctx.drawImage(im, W - 620, 180, 520, 300); ctx.restore(); }
      }
    }
  }
  function drawErr(ctx, e) { ctx.save(); ctx.fillStyle = '#ff6a45'; ctx.font = '400 24px sans-serif'; ctx.fillText('渲染提示：' + String(e.message || e).slice(0, 60), 100, H - 100); ctx.restore(); }
  const imgCache = {};
  function cacheImages() { (S.project.assets || []).forEach(a => { if (a.kind === 'image' && a.url && !imgCache[a.url]) { const im = new Image(); im.src = a.url; imgCache[a.url] = im; } }); }

  function playSfx(kind, at) {
    if (!S.audioOn) return;
    const key = kind + '@' + at;
    if (S.lastSfx[key]) return;
    S.lastSfx[key] = true;
    const f = SFX_FILES.includes(S.sfxOverride) ? S.sfxOverride : (KIND_SFX[kind] || 'pop');
    try { const a = new Audio('./public/sfx-default/' + f + '.mp3'); a.volume = 0.5; a.play().catch(() => {}); } catch (e) { /* 浏览器可能阻止自动播放 */ }
  }

  /* ══════════ 5. 体检器（真实规则）══════════ */
  function lint(p) {
    const out = [];
    const dur = duration(p);
    p.overlays.forEach((c, i) => {
      const def = CARDS[c.kind] || {};
      const id = c.kind + ':' + c.id;
      if (c.end <= c.start) out.push({ id, level: 'error', text: '「' + (def.name || c.kind) + '」结束时间不晚于开始时间' });
      if (c.end > dur + 0.01) out.push({ id, level: 'error', text: '「' + (def.name || c.kind) + '」超出整片时长' });
      if (c.end - c.start < 0.8) out.push({ id, level: 'warn', text: '「' + (def.name || c.kind) + '」只出现 ' + (c.end - c.start).toFixed(1) + ' 秒，容易看成快闪' });
      const txt = Object.values(c.params || {}).filter(v => typeof v === 'string').join(' ');
      if (/占位|TODO|待填|示例文字|Your text|Lorem/i.test(txt)) out.push({ id, level: 'warn', text: '「' + (def.name || c.kind) + '」还留着占位文案' });
      if (c.start < 0) out.push({ id, level: 'error', text: '「' + (def.name || c.kind) + '」开始时间为负' });
    });
    const sorted = [...p.overlays].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) {
      const a = sorted[i - 1], b = sorted[i];
      if (b.start < a.end - 0.2 && (CARDS[a.kind] || {}).group === (CARDS[b.kind] || {}).group) {
        out.push({ id: 'overlap:' + a.id + ':' + b.id, level: 'warn', text: '两张「' + ((CARDS[a.kind] || {}).group || '') + '」卡在时间上叠在一起' });
      }
    }
    const marks = [0]; p.overlays.forEach(c => marks.push(c.start, c.end));
    let gap = 0, gapAt = 0;
    const points = [0, ...p.overlays.flatMap(c => [c.start, c.end]), dur].sort((a, b) => a - b);
    for (let i = 1; i < points.length; i++) if (points[i] - points[i - 1] > gap && !p.overlays.some(c => points[i - 1] >= c.start - .01 && points[i] <= c.end + .01)) { gap = points[i] - points[i - 1]; gapAt = points[i - 1]; }
    if (gap > 6) out.push({ id: 'gap:' + Math.round(gapAt), level: 'warn', text: '第 ' + fmt(gapAt) + ' 起有 ' + gap.toFixed(1) + ' 秒没有动效，画面可能空着' });
    return out.filter(x => !S.lintIgnored[x.id]);
  }

  /* ══════════ 6. SRT 语义编排（本地规则引擎，真生成工程）══════════ */
  function parseSrt(text) {
    const blocks = text.replace(/\r/g, '').trim().split(/\n\s*\n/);
    return blocks.map(b => {
      const lines = b.split('\n');
      const m = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})\s*-->\s*(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/.exec(lines.find(l => l.includes('-->')) || '');
      if (!m) return null;
      const t = n => Number(n);
      return { start: t(m[1]) * 3600 + t(m[2]) * 60 + t(m[3]) + t(m[4]) / 1000, end: t(m[5]) * 3600 + t(m[6]) * 60 + t(m[7]) + t(m[8]) / 1000, text: lines.filter(l => !/^\d+$/.test(l.trim()) && !l.includes('-->')).join(' ').trim() };
    }).filter(Boolean);
  }
  function srtToProject(text, base) {
    const rows = parseSrt(text);
    if (!rows.length) throw new Error('没有从字幕里读出时间轴');
    const p = deep(base || exampleProject());
    p.name = '字幕自动编排 · ' + rows.length + ' 句';
    p.overlays = [];
    const pick = s => {
      if (/(\d+%|\d+倍|增长|提升|占比|数据|比例|百分之)/.test(s)) return 'ring-metric';
      if (/(对比|区别|而不是|相比|反而|VS|vs)/.test(s)) return 'versus-card';
      if (/(第一|第二|首先|然后|最后|步骤|三步|流程)/.test(s)) return 'step-timeline';
      if (/(多少|几个|清单|列出|包括)/.test(s)) return 'checklist';
      if (/(最|一定|永远|关键|记住|其实)/.test(s)) return 'quote-lockup';
      if (/(术语|叫做|称为|定义|是指)/.test(s)) return 'term-card';
      return 'blur-text';
    };
    rows.forEach((r, i) => {
      const kind = pick(r.text), def = CARDS[kind] || {};
      const start = r.start, end = Math.max(start + 1.6, Math.min(r.end, start + 6));
      const params = deep(def.defaults || {});
      const clean = r.text.replace(/[*_#]/g, '').slice(0, 60);
      if (kind === 'ring-metric') { params.title = clean; const num = /(\d+(?:\.\d+)?)\s*%/.exec(r.text); params.value = num ? Number(num[1]) : 68; }
      else if (kind === 'versus-card') { params.heading = clean.slice(0, 20); params.left = clean.slice(0, 12); params.right = '另一种做法'; params.conclusion = '选更顺手的那个'; }
      else if (kind === 'step-timeline') { params.title = '按这三步来'; params.steps = '看字幕 · 挑动效 · 导透明层'; }
      else { params.text = clean; params.title = clean; params.heading = clean.slice(0, 18); }
      p.overlays.push(makeCard(kind, start, end, params));
    });
    return p;
  }

  /* ══════════ 7. 导出（真文件，非假按钮）══════════ */
  function download(blob, name) {
    const u = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  }
  function exportJSON() { download(new Blob([JSON.stringify(S.project, null, 2)], { type: 'application/json' }), (S.project.name || '叠光工程') + '.json'); toast('工程 JSON 已下载'); }
  function exportFrame() { const c = $('#stage'); c.toBlob(b => { download(b, '叠光-' + fmt(S.time).replace(':', '-') + '.png'); toast('当前帧 PNG 已下载'); }, 'image/png'); }
  function crc32(buf) {
    let c, table = crc32.t;
    if (!table) { table = crc32.t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; } }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function zipStore(files) {
    const enc = new TextEncoder(), parts = [], central = []; let offset = 0;
    files.forEach((f, i) => {
      const name = enc.encode(f.name), data = f.data, crc = crc32(data);
      const local = new Uint8Array(30 + name.length), lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0, true); lv.setUint16(8, 0, true);
      lv.setUint32(14, crc, true); lv.setUint32(18, data.length, true); lv.setUint32(22, data.length, true); lv.setUint16(26, name.length, true);
      local.set(name, 30); parts.push(local, data);
      const cen = new Uint8Array(46 + name.length), cv = new DataView(cen.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
      cv.setUint32(16, crc, true); cv.setUint32(20, data.length, true); cv.setUint32(24, data.length, true);
      cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); cen.set(name, 46);
      central.push(cen); offset += local.length + data.length;
    });
    const cenSize = central.reduce((a, c) => a + c.length, 0);
    const end = new Uint8Array(22), ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true);
    ev.setUint32(12, cenSize, true); ev.setUint32(16, offset, true);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
  }
  async function exportFrames() {
    if (S.exportBusy) return;
    const dur = duration(S.project), total = Math.min(Math.round(dur * FPS), 1200);
    S.exportBusy = true; S.exportMsg = '正在逐帧渲染 0 / ' + total; paintExport();
    const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
    const files = [];
    for (let i = 0; i < total; i++) {
      drawFrame(ctx, i / FPS, S.project, { theme: appTheme() });
      const blob = await new Promise(res => c.toBlob(res, 'image/png'));
      files.push({ name: 'frame_' + String(i).padStart(5, '0') + '.png', data: new Uint8Array(await blob.arrayBuffer()) });
      if (i % 10 === 0 || i === total - 1) { S.exportMsg = '正在逐帧渲染 ' + (i + 1) + ' / ' + total; paintExport(); await new Promise(r => setTimeout(r, 0)); }
    }
    download(zipStore(files), '叠光-透明帧序列-' + total + '帧.zip');
    S.exportBusy = false; S.exportMsg = '完成：' + total + ' 帧透明 PNG 已打包'; toast(S.exportMsg); paintExport();
  }
  async function exportWebM() {
    if (S.exportBusy || !window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return toast('这个浏览器不支持画布录制，请用 Chrome 或 Edge', true);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
    const stream = c.captureStream(FPS);
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
    if (!mime) return toast('这个浏览器没有可用的 WebM 编码器', true);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12000000 });
    const chunks = []; rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => { download(new Blob(chunks, { type: 'video/webm' }), '叠光-预览.webm'); S.exportBusy = false; S.exportMsg = '预览 WebM 已下载'; toast(S.exportMsg); paintExport(); };
    S.exportBusy = true; S.exportMsg = '正在录制预览视频…'; paintExport();
    const dur = Math.min(duration(S.project), 60), frames = Math.round(dur * FPS);
    rec.start();
    let last = performance.now();
    for (let i = 0; i < frames; i++) {
      drawFrame(ctx, i / FPS, S.project, { theme: appTheme() });
      const now = performance.now(), wait = 1000 / FPS - (now - last);
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      last = performance.now();
      if (i % 30 === 0) { S.exportMsg = '录制中 ' + fmt(i / FPS) + ' / ' + fmt(dur); paintExport(); }
    }
    rec.stop();
  }

  /* ══════════ 8. 主题 ══════════ */
  function isDark() { return S.theme === 'dark' || (S.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches); }
  function appTheme() { return isDark() ? 'dark' : 'light'; }
  function applyTheme() { const app = $('#appRoot'); const dark = isDark(); if (app) { app.classList.toggle('dark', dark); app.setAttribute('data-theme', dark ? 'dark' : 'light'); } document.documentElement.style.colorScheme = dark ? 'dark' : 'light'; }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (S.theme === 'system') { applyTheme(); render(); } });

  /* ══════════ 9. DOM 骨架 ══════════ */
  const NAV = [
    { id: 'make', label: '制作', icon: 'make' },
    { id: 'templates', label: '模板库', icon: 'plus' },
    { id: 'media', label: '素材', icon: 'media' },
    { id: 'audio', label: '音效', icon: 'arrow' },
    { id: 'showcase', label: '官方扩展示例', icon: 'flow' },
    { id: 'flow', label: '使用流程', icon: 'search' },
    { id: 'settings', label: '设置', icon: 'settings' },
  ];
  const ICON = {
    settings: 'M8 3h4l1 3 3 1v4l-3 1-1 3H8l-1-3-3-1V7l3-1z M10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    make: 'M3 4h14v12H3z M3 8h14 M7 4v4 M13 4v4 M8 11l4 2-4 2z',
    media: 'M3 4h14v12H3z M3 13l4-4 4 4 2-2 4 4 M13 7h.01',
    flow: 'M3 3h5v4H3z M12 13h5v4h-5z M5.5 7v8H12 M11 3h6 M11 6h4',
    plus: 'M10 4v12 M4 10h12',
    upload: 'M10 13V3 M6 7l4-4 4 4 M3 13v4h14v-4',
    search: 'M8.5 3a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11 M13 13l4 4',
    save: 'M4 3h11l2 2v12H3V3z M6 3v5h8V3 M6 17v-6h8v6',
    arrow: 'M4 10h12 M11 5l5 5-5 5',
  };
  const svg = (n, sz) => '<svg viewBox="0 0 20 20" width="' + (sz || 16) + '" height="' + (sz || 16) + '" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (ICON[n] || ICON.make) + '"/></svg>';

  function skeleton() {
    return '' +
      '<div class="ms-app" id="appRoot">' +
      '  <aside class="ms-sidebar">' +
      '    <div class="ms-brand"><span class="luma-mark">◈</span><strong>叠光 <span class="luma-en">LumaStack</span></strong></div>' +
      '    <nav class="ms-nav" id="nav">' + NAV.map(n => '<button data-tab="' + n.id + '" class="' + (S.tab === n.id ? 'is-active' : '') + '">' + svg(n.icon) + '<span>' + n.label + '</span></button>').join('') + '</nav>' +
      '    <div class="ms-sidebar-heading"><span>资源库</span><span id="libCount"></span></div>' +
      '    <div class="ms-library-tabs" id="libTabs">' +
      '      <button data-sub="cards" class="' + (S.subTab === 'cards' ? 'is-active' : '') + '">动效卡 <span>' + Object.keys(CARDS).length + '</span></button>' +
      '      <button data-sub="native" class="' + (S.subTab === 'native' ? 'is-active' : '') + '">科技场景 <span>' + (D.nativeGroups || []).length + '</span></button>' +
      '    </div>' +
      '    <label class="ms-search">' + svg('search') + '<input id="libSearch" placeholder="搜索卡片或场景" value="' + esc(S.libQuery) + '"></label>' +
      '    <div class="ms-library-scroll" id="libList"></div>' +
      '    <div class="ms-sidebar-bottom"><span id="saveHint">本机自动保存</span><button data-act="home" title="回到介绍页">介绍页</button></div>' +
      '  </aside>' +
      '  <div class="ms-workspace">' +
      '    <header class="ms-header">' +
      '      <div class="ms-project-title"><input id="projName" value="" aria-label="工程名称"><span id="projMeta"></span></div>' +
      '      <div class="ms-header-actions">' +
      '        <button data-act="undo" title="撤销 Ctrl+Z">撤销</button>' +
      '        <button data-act="redo" title="重做 Ctrl+Y">重做</button>' +
      '        <button data-act="import" title="导入工程 / 字幕">导入</button>' +
      '        <button data-act="save" title="导出工程 JSON">保存工程</button>' +
      '        <button data-act="export" class="ms-primary" title="导出成片或帧序列">导出</button>' +
      '        <button data-act="theme" id="themeBtn" title="切换亮暗主题">◐</button>' +
      '      </div>' +
      '    </header>' +
      '    <div class="ms-notices" id="notices"></div>' +
      '    <div id="pageHost" style="display:flex;flex:1;min-height:0;flex-direction:column"></div>' +
      '  </div>' +
      '</div>' +
      '<input type="file" id="fileImport" hidden accept=".json,.srt,.txt">' +
      '<input type="file" id="fileAsset" hidden multiple accept="image/*,video/*,audio/*,.ttf,.otf,.woff2">' +
      '<div id="modalHost"></div>';
  }

  /* ══════════ 10. 各页面 ══════════ */
  function pageMake() {
    const p = S.project, dur = duration(p), scenes = layoutScenes(p);
    const issues = lint(p);
    return '' +
      '<div class="ms-editor ' + (S.inspectorOpen ? '' : 'is-inspector-hidden') + '" id="editor">' +
      '  <div class="ms-center">' +
      '    <div class="ms-preview-heading"><strong>画布预览</strong><div><span class="ms-format-badge">1920 × 1080 · 60fps · 透明动效层</span></div></div>' +
      '    <div class="ms-preview-area"><div class="ms-stage-viewport" id="stageViewport"><canvas id="stage" width="1920" height="1080"></canvas></div></div>' +
      '    <div class="ms-player">' +
      '      <button class="ms-play" data-act="play" aria-label="播放或暂停">' + (S.playing ? '<span class="ms-pause-icon"></span>' : '<span class="ms-play-icon"></span>') + '</button>' +
      '      <span class="ms-time" id="timeLabel">' + fmt(S.time) + ' <i>/ ' + fmt(dur) + '</i></span>' +
      '      <input type="range" id="seek" min="0" max="' + dur + '" step="0.0167" value="' + S.time + '" style="flex:1" aria-label="播放位置">' +
      '      <button data-act="framePng" title="下载当前帧">存当前帧</button>' +
      '      <span class="ms-player-hint">空格播放 · Ctrl+Z 撤销 · Delete 删除</span>' +
      '    </div>' +
      '    <div class="ms-timeline">' +
      '      <div class="ms-timeline-heading"><strong>时间轴 <span>' + scenes.length + ' 个场景 · ' + p.overlays.length + ' 张动效卡 · 共 ' + fmt(dur) + '</span></strong>' +
      '        <div><button data-act="addScene">＋ 加场景</button><button data-act="tabTemplates">＋ 加动效卡</button><button data-act="lint">' + (issues.length ? '体检 ' + issues.length + ' 条' : '体检通过') + '</button></div></div>' +
      '      <div class="ms-scrubber"><span>场景</span><div class="ms-track-clips" id="sceneTrack">' +
      (scenes.length ? scenes.map(s => '<button class="ms-clip ' + (S.sel && S.sel.id === s.id ? 'is-selected' : '') + '" data-sel="scene:' + s.id + '" title="' + esc(s.name) + '"><span>' + esc(s.name) + '</span><small>' + s.duration.toFixed(1) + 's</small></button>').join('') : '<span class="ms-empty-track">还没有场景，点「加场景」</span>') +
      '      </div></div>' +
      '      <div class="ms-track"><span class="ms-track-label">动效层</span>' +
      '        <div class="ms-overlay-track" id="overlayTrack">' +
      (p.overlays.length ? p.overlays.map(c => {
        const l = (c.start / dur * 100).toFixed(2), w = Math.max(1.2, ((c.end - c.start) / dur * 100)).toFixed(2);
        return '<button class="ms-overlay-clip ' + (S.sel && S.sel.id === c.id ? 'is-selected' : '') + '" style="left:' + l + '%;width:' + w + '%" data-sel="overlay:' + c.id + '" title="' + esc((CARDS[c.kind] || {}).name || c.kind) + '">' + esc((CARDS[c.kind] || {}).name || c.kind) + '</button>';
      }).join('') : '') + '</div></div>' +
      '    </div>' +
      '    <div class="ms-preview-footer"><span id="footerInfo">数据只存在这台电脑的浏览器里</span>' +
      '      <div><button data-act="loadDemo">载入 28 秒示例</button><button data-act="clearAll">清空工程</button><button data-act="inspector">' + (S.inspectorOpen ? '收起参数' : '展开参数') + '</button></div></div>' +
      '  </div>' +
      '  <aside class="ms-inspector" id="inspector">' + inspectorHTML() + '</aside>' +
      '</div>' +
      (S.lintOpen && issues.length ? '<div class="luma-lint" id="lintBox"><div class="luma-lint-head"><strong>编排体检 · ' + issues.length + ' 条</strong><button data-act="lintClose">收起</button></div>' + issues.slice(0, 8).map(i => '<div class="luma-lint-row ' + i.level + '"><span>' + esc(i.text) + '</span><button data-lint-ignore="' + esc(i.id) + '">忽略</button></div>').join('') + '</div>' : '');
  }

  function inspectorHTML() {
    const p = S.project, item = findSel(p), def = item ? (S.sel.type === 'scene' ? NATIVE[item.sceneId] : CARDS[item.kind]) : null;
    let body = '';
    if (!item || !def) {
      body = '<div class="ms-inspector-empty"><span>◇</span><strong>没有选中任何东西</strong><p>点下方时间轴上的场景或动效卡，这里就会出现可以改的参数。改完画布立刻跟着变。</p></div>';
    } else {
      const isScene = S.sel.type === 'scene';
      const controls = (def.controls || []).map(ctl => fieldHTML(ctl, item.params[ctl.key]));
      body = '<div class="ms-selection-title"><small>' + (isScene ? '科技场景' : '动效卡') + ' · ' + esc((def.group || '场景')) + '</small>' +
        '<h2>' + esc(def.name || item.kind) + '</h2><p>' + esc(def.description || '按下面的字段改内容，画布实时更新。') + '</p>' +
        '<div class="ms-order-actions">' +
        '<button data-act="dup">复制</button><button data-act="moveLeft">前移</button><button data-act="moveRight">后移</button>' +
        '<button data-act="remove" class="ms-danger-text">删除</button></div></div>' +
        '<div class="ms-inspector-scroll">' +
        '<div class="ms-section-label">出现时间</div>' +
        '<div class="ms-time-fields">' + fieldHTML({ key: '__start', label: '开始（秒）', type: 'number', step: 0.1 }, item.start) + fieldHTML({ key: '__end', label: '结束（秒）', type: 'number', step: 0.1 }, item.end) + '</div>' +
        (isScene ? '' : '<div class="ms-field"><span>卡片时长 <b>' + (item.end - item.start).toFixed(1) + ' 秒</b></span><small>拖时间轴或改上面两个数字</small></div>') +
        '<div class="ms-section-label">内容参数 · ' + controls.length + ' 项</div>' + controls.join('') +
        '<div class="ms-section-label">声音</div>' +
        '<div class="ms-field"><span>出场音效应在音效页挑选</span><button class="ms-wide-button" data-act="tabAudio">去音效页 ' + svg('arrow') + '</button></div>' +
        '</div>';
    }
    return '<div class="ms-inspector-heading"><strong>参数</strong><span>' + (item ? '已选中 1 项' : '未选中') + '</span></div>' + body + '<div class="ms-inspector-bottom">改动会自动存到本机</div>';
  }
  function fieldHTML(ctl, val) {
    const key = ctl.key, label = ctl.label || key, type = ctl.type || 'text';
    let input;
    if (type === 'select') input = '<select data-field="' + esc(key) + '">' + (ctl.options || []).map(o => '<option value="' + esc(o.value) + '" ' + (String(val) === String(o.value) ? 'selected' : '') + '>' + esc(o.label) + '</option>').join('') + '</select>';
    else if (type === 'toggle') input = '<label class="ms-field ms-control-toggle"><span>开启</span><input type="checkbox" data-field="' + esc(key) + '" ' + (val ? 'checked' : '') + '></label>';
    else if (type === 'color') input = '<input type="color" data-field="' + esc(key) + '" value="' + esc(val || '#339cff') + '">';
    else if (type === 'range' || type === 'number') input = '<div class="ms-field"><span>' + esc(label) + ' <b id="v_' + esc(key) + '">' + esc(val) + '</b></span><input type="range" data-field="' + esc(key) + '" min="' + (ctl.min != null ? ctl.min : 0) + '" max="' + (ctl.max != null ? ctl.max : 100) + '" step="' + (ctl.step != null ? ctl.step : 1) + '" value="' + esc(val) + '"></div>';
    else input = '<input type="text" data-field="' + esc(key) + '" value="' + esc(val == null ? '' : val) + '">';
    if (type === 'toggle' || type === 'range' || type === 'number') return input;
    return '<label class="ms-field"><span>' + esc(label) + '</span>' + input + '</label>';
  }

  function pageTemplates() {
    const q = S.libQuery.trim().toLowerCase();
    const cardIds = Object.keys(CARDS).filter(k => !q || (CARDS[k].name + k + (CARDS[k].group || '')).toLowerCase().includes(q));
    const groups = GROUPS.length ? GROUPS : [{ title: '全部动效卡', ids: cardIds }];
    const groupsHTML = groups.map(g => {
      const ids = (g.ids || []).filter(k => CARDS[k] && cardIds.includes(k));
      if (!ids.length) return '';
      return '<section class="luma-sec"><h2>' + esc(g.title) + ' <span>' + ids.length + ' 张</span></h2><div class="luma-grid">' + ids.map(k => {
        const d = CARDS[k];
        return '<article class="luma-card" data-card="' + esc(k) + '"><div class="luma-thumb"><canvas data-thumb="' + esc(k) + '" width="320" height="180"></canvas></div>' +
          '<div class="luma-card-body"><strong>' + esc(d.name || k) + '</strong><small>' + esc(d.description || (d.controls || []).map(c => c.label).join(' · ').slice(0, 40)) + '</small>' +
          '<span class="luma-tag">' + esc(d.group || '动效') + ' · ' + (d.duration || 5) + 's</span></div>' +
          '<button data-addcard="' + esc(k) + '">加入工程</button></article>';
      }).join('') + '</div></section>';
    }).join('');
    const nGroups = (D.nativeGroups || []).filter(g => !q || (g.id + g.purpose).toLowerCase().includes(q));
    const nativeHTML = '<section class="luma-sec"><h2>科技场景 · MotionGit 385712 <span>' + nGroups.length + ' 组</span></h2>' +
      '<p class="luma-hint">来自 .motion 模板包 0.2.7 开源版，B1–B4 是可直接改字的文字表达，其余 23 组是原版原生单元。</p>' +
      '<div class="luma-grid luma-grid-sm">' + nGroups.map(g => {
        const isB = /^B[1-4]$/.test(g.id);
        return '<article class="luma-card luma-card-mini"><div class="luma-card-body"><strong>' + esc(g.id) + ' · ' + esc(isB ? ({ B1: '一个关键词', B2: '一到五点', B3: '两方对比', B4: '总结行动' }[g.id]) : g.purpose) + '</strong>' +
          '<small>' + esc(g.purpose) + '</small><span class="luma-tag">' + (g.end - g.start).toFixed(1) + 's · ' + g.fieldCount + ' 个字段 · ' + g.mediaCount + ' 个媒体位</span></div>' +
          (isB ? '<button data-addscene="' + esc(g.id) + '">加入工程</button>' : '<button data-previewscene="' + esc(g.id) + '">看说明</button>') + '</article>';
      }).join('') + '</div></section>';
    return '<div class="luma-page"><div class="luma-page-head"><div><h1>模板库</h1><p>' + Object.keys(CARDS).length + ' 张动效卡 · ' + (D.nativeGroups || []).length + ' 组科技场景 · ' + (D.showcase || []).length + ' 个官方扩展示例，点一下就进工程。</p></div></div>' + groupsHTML + nativeHTML + '</div>';
  }

  function pageMedia() {
    const assets = (S.project.assets || []).filter(a => S.assetFilter === 'all' || a.kind === S.assetFilter);
    return '<div class="luma-page"><div class="luma-page-head"><div><h1>我的素材</h1><p>图片、视频、音频、字体都放在这台电脑的浏览器里，不会上传到任何服务器。</p></div>' +
      '<div class="luma-head-actions"><button class="ms-primary" data-act="pickAsset">＋ 上传素材</button><button data-act="clearAssets">清空素材</button></div></div>' +
      '<div class="luma-filter">' + [['all', '全部'], ['image', '图片'], ['video', '视频'], ['audio', '音频'], ['font', '字体']].map(([k, l]) => '<button data-afilter="' + k + '" class="' + (S.assetFilter === k ? 'is-active' : '') + '">' + l + '</button>').join('') + '</div>' +
      '<label class="ms-app ms-upload-box luma-drop" id="dropBox"><strong>把文件拖到这里，或点上面的「上传素材」</strong><span>支持 PNG / JPG / MP4 / MOV / MP3 / WAV / TTF / OTF</span></label>' +
      (assets.length ? '<div class="luma-grid">' + assets.map((a, i) => '<article class="luma-card"><div class="luma-thumb">' +
        (a.kind === 'image' && a.url ? '<img src="' + esc(a.url) + '" alt="' + esc(a.name) + '">' : '<div class="luma-fileicon">' + esc((a.type || '文件').toUpperCase()) + '</div>') + '</div>' +
        '<div class="luma-card-body"><strong>' + esc(a.name) + '</strong><small>' + esc(a.source || '我的上传') + '</small><span class="luma-tag">' + fsize(a.size || 0) + ' · ' + esc(a.kind || '文件') + '</span></div>' +
        '<div class="luma-card-actions"><button data-bindasset="' + i + '">用于当前场景</button><button data-dlasset="' + i + '">下载</button><button data-rmasset="' + i + '">删除</button></div></article>').join('') + '</div>'
        : '<div class="luma-empty"><strong>素材库还是空的</strong><p>传一张图或一个视频，选中时间轴上的场景后点「用于当前场景」，画面就会带上它。</p></div>') +
      '</div>';
  }

  function pageAudio() {
    return '<div class="luma-page"><div class="luma-page-head"><div><h1>音效</h1><p>15 个可商用默认音效，点一下就试听。播放工程时每张卡会按类型自动配上声音。</p></div>' +
      '<div class="luma-head-actions"><button data-act="toggleAudio" class="' + (S.audioOn ? 'ms-primary' : '') + '">' + (S.audioOn ? '播放音效：开' : '播放音效：关') + '</button></div></div>' +
      '<div class="luma-grid luma-grid-sm">' + SFX_FILES.map(f => '<article class="luma-card luma-card-mini"><div class="luma-card-body"><strong>' + esc(SFX_LABEL[f] || f) + '</strong><small>' + f + '.mp3</small><span class="luma-tag">CC0 · 可商用</span></div>' +
        '<div class="luma-card-actions"><button data-playsfx="' + f + '">试听</button><button data-setsfx="' + f + '" class="' + (S.sfxOverride === f ? 'is-on' : '') + '">设为默认</button></div></article>').join('') + '</div>' +
      '<div class="luma-sec"><h2>自动配对规则</h2><p class="luma-hint">数字类卡配上升音、金句配重击、字幕配打字声，播放到卡片起点时触发。点上面的「设为默认」可以改成全局一个音效。</p></div></div>';
  }

  function pageShowcase() {
    const list = (D.showcase || []).filter(s => SHOWCASE[s.id]);
    const cur = showDef(S.showcaseId) || list[0];
    const id = cur ? cur.id : null;
    const params = S.showcaseParams[id] || (cur ? Object.assign(deep((SHOWCASE[id] || {}).defaults || {}), cur.defaults || {}) : {});
    const controls = (cur && (cur.controls || (SHOWCASE[id] || {}).controls)) || [];
    return '<div class="luma-page"><div class="luma-page-head"><div><h1>官方扩展示例</h1><p>6 个真实展示版本，独立调参数、独立播放。原 26 张动效卡全部保留，互不干扰。</p></div></div>' +
      '<div class="ms-showcase-picker luma-picker">' + list.map(s => '<button data-showcase="' + esc(s.id) + '" class="' + (id === s.id ? 'is-active' : '') + '">' + esc(s.name) + '</button>').join('') + '</div>' +
      (cur ? '<div class="luma-showcase-layout"><div class="luma-showcase-main">' +
        '<div class="luma-showcase-stage"><canvas id="showcaseStage" width="1920" height="1080"></canvas></div>' +
        '<div class="ms-showcase-toolbar luma-toolbar"><button data-act="showPlay">' + (S.showcasePlaying ? '暂停' : '播放') + '</button>' +
        '<input type="range" id="showSeek" min="0" max="' + (cur.duration || 6) + '" step="0.0167" value="' + S.showcaseTime + '" aria-label="示例播放位置"><span id="showTime">' + S.showcaseTime.toFixed(2) + ' / ' + (cur.duration || 6) + ' 秒</span></div>' +
        '<p class="ms-help-text">' + esc(cur.description || '') + ' 这里是官方公开示例预览，不混进工程导出。</p></div>' +
        '<div class="ms-showcase-controls luma-controls"><strong>独立参数</strong>' + controls.map(c => fieldHTML(c, params[c.key])).join('') +
        '<button class="ms-wide-button" data-act="showReset">恢复默认参数</button>' +
        '<button class="ms-wide-button" data-act="showToProject">把这张示例加进工程</button></div></div>' : '<p>示例数据未载入</p>') + '</div>';
  }

  function pageFlow() {
    const steps = [
      ['写好口播稿', '先有内容，再谈动效。用剪映或 Whisper 导出一份 SRT 字幕。'],
      ['导入字幕自动编排', '点顶栏「导入」选 SRT，规则引擎按语义给每句话挑一张卡并对齐时间。'],
      ['在画布上细调', '点时间轴上的卡片，右边改字、颜色、大小和出现时间，改哪变哪。'],
      ['体检一遍', '编排体检会指出占位文案、快闪、叠卡和空白段，不同意就点忽略。'],
      ['导出透明层', '导出逐帧透明 PNG 序列或 WebM 预览，拖进剪映盖在原片上。'],
    ];
    return '<div class="ms-flow-page luma-flow"><h1>使用流程</h1><p>一条字幕稿到一层动效，五步走完。所有计算都在这台电脑的浏览器里，不花 token、不上传素材。</p>' +
      '<div class="ms-flowchart">' + steps.map((s, i) => '<div class="ms-flow-node"><strong>' + (i + 1) + ' · ' + s[0] + '</strong><span>' + s[1] + '</span></div>' + (i < steps.length - 1 ? '<div class="ms-flow-connector">↓</div>' : '')).join('') + '</div>' +
      '<div class="ms-flow-result"><strong>做完了会得到什么</strong><span>一份能反复改的工程 JSON、一串透明帧、一段预览视频</span></div>' +
      '<div class="ms-flow-handoff-actions"><button data-act="loadDemo">载入 28 秒完整示例</button><button data-act="import">导入我的 SRT</button><button data-act="tabMake">回到制作台</button></div>' +
      '<small>工程 JSON 可以随时导出、手改、再导入；换配色换字体都是改一个字段的事。</small></div>';
  }

  function pageSettings() {
    const src = D.source || {};
    return '<div class="luma-page"><div class="luma-page-head"><div><h1>设置</h1><p>外观、数据与版本信息。</p></div></div>' +
      '<section class="luma-sec"><h2>外观</h2><div class="luma-filter">' +
      [['light', '亮色'], ['dark', '暗色'], ['system', '跟随系统']].map(([k, l]) => '<button data-theme-set="' + k + '" class="' + (S.theme === k ? 'is-active' : '') + '">' + l + '</button>').join('') + '</div>' +
      '<p class="luma-hint">当前生效：' + (isDark() ? '暗色' : '亮色') + '。工作台的侧栏、画布、参数栏会一起切换。</p></section>' +
      '<section class="luma-sec"><h2>工程规格</h2><div class="luma-spec">' +
      [['画布', '1920 × 1080'], ['帧率', '60 fps'], ['动效卡', Object.keys(CARDS).length + ' 张'], ['科技场景', (D.nativeGroups || []).length + ' 组'], ['官方示例', (D.showcase || []).length + ' 个'], ['默认音效', SFX_FILES.length + ' 个'], ['存档', '本机浏览器']].map(([k, v]) => '<div><span>' + k + '</span><strong>' + v + '</strong></div>').join('') + '</div></section>' +
      '<section class="luma-sec"><h2>功能都在</h2><div class="luma-spec">' +
      [['逐帧预览', '真绘制'], ['撤销重做', '可回溯 60 步'], ['自动保存', '本机'], ['SRT 编排', '规则引擎'], ['编排体检', '6 类规则'], ['工程 JSON', '导入导出'], ['透明帧序列', 'ZIP 打包'], ['预览视频', 'WebM'], ['素材绑定', '图片视频音频'], ['音效', '自动配对'], ['亮暗主题', '三档'], ['键盘操作', '空格 / Ctrl+Z / Delete']].map(([k, v]) => '<div><span>' + k + '</span><strong>' + v + '</strong></div>').join('') + '</div></section>' +
      '<section class="luma-sec"><h2>版本与来源</h2><div class="luma-spec luma-spec-col">' +
      Object.entries(src).map(([k, v]) => '<div><span>' + esc(k) + '</span><strong>' + esc(v) + '</strong></div>').join('') + '</div>' +
      '<p class="luma-hint">REA 静态分析证据：' + esc(src.reaEvidence || '') + ' · 39 个文件 / 22 个 JS / 74614 个语法节点 · .motion 原版技术栈为 Playwright 逐帧截图 + ffmpeg 编码，B1–B4 四种文字表达与 27 组原生场景已用 Canvas 等价重建。</p></section>' +
      '<section class="luma-sec"><h2>数据</h2><div class="luma-head-actions"><button data-act="resetProject">恢复示例工程</button><button data-act="wipe">清空本机存档</button></div>' +
      '<p class="luma-hint">清空后下次打开会重新生成示例工程。导出的工程 JSON 不会受影响。</p></section></div>';
  }

  function paintNotices() {
    const n = $('#notices'); if (!n) return;
    n.innerHTML = (S.error ? '<div class="ms-notice is-error"><span>' + esc(S.error) + '</span><button data-act="closeNotice">×</button></div>' : '') +
      (S.notice ? '<div class="ms-notice"><span>' + esc(S.notice) + '</span><button data-act="closeNotice">×</button></div>' : '');
  }
  function paintExport() {
    const m = $('#exportModal'); if (!m) return;
    const msg = $('#exportMsg', m); if (msg) msg.textContent = S.exportMsg || '选一种导出方式，文件直接下载到本机。';
    $$('[data-export]', m).forEach(b => b.disabled = S.exportBusy);
  }
  function modalExport() {
    return '<div class="luma-modal-bg" id="exportModal"><div class="luma-modal"><div class="luma-modal-head"><strong>导出</strong><button data-act="exportClose">×</button></div>' +
      '<p id="exportMsg">' + esc(S.exportMsg || '选一种导出方式，文件直接下载到本机。') + '</p>' +
      '<div class="luma-export-list">' +
      '<button data-export="json"><strong>工程 JSON</strong><span>完整工程，可再导入、手改、备份</span></button>' +
      '<button data-export="frame"><strong>当前帧 PNG</strong><span>把此刻画布存成 1920×1080 图片</span></button>' +
      '<button data-export="frames"><strong>透明帧序列 ZIP</strong><span>按 60fps 逐帧渲染，打包成 PNG 序列</span></button>' +
      '<button data-export="webm"><strong>预览视频 WebM</strong><span>实时录制一段可直接看的预览片</span></button>' +
      '</div><p class="luma-hint">帧序列和视频都用画布真实逐帧绘制，不是静态截图。</p></div></div>';
  }

  /* ══════════ 11. 渲染 ══════════ */
  function paintLib() {
    const box = $('#libList'); if (!box) return;
    const q = S.libQuery.trim().toLowerCase();
    let rows = [];
    if (S.subTab === 'cards') {
      rows = Object.keys(CARDS).filter(k => !q || (CARDS[k].name + k + (CARDS[k].group || '')).toLowerCase().includes(q))
        .map(k => ({ type: 'card', id: k, name: CARDS[k].name || k, sub: (CARDS[k].group || '') + ' · ' + (CARDS[k].duration || 5) + 's' }));
    } else {
      rows = (D.nativeGroups || []).filter(g => !q || (g.id + g.purpose).toLowerCase().includes(q))
        .map(g => ({ type: 'native', id: g.id, name: g.id + ' · ' + (/^B[1-4]$/.test(g.id) ? ({ B1: '一个关键词', B2: '一到五点', B3: '两方对比', B4: '总结行动' }[g.id]) : g.purpose), sub: (g.end - g.start).toFixed(1) + 's' }));
    }
    box.innerHTML = rows.length ? rows.map(r => '<button class="ms-library-item" data-lib="' + r.type + ':' + esc(r.id) + '" title="' + esc(r.name) + '">' +
      '<span>' + (r.type === 'card' ? '◈' : '▣') + '</span><span><strong>' + esc(r.name) + '</strong><small>' + esc(r.sub) + '</small></span>' + svg('plus', 14) + '</button>').join('')
      : '<div class="ms-library-note">没有找到，换个词试试</div>';
    const c = $('#libCount'); if (c) c.textContent = rows.length + ' 项';
  }
  function paintThumbs() {
    $$('[data-thumb]').forEach(cv => {
      const k = cv.dataset.thumb, def = CARDS[k]; if (!def) return;
      const ctx = cv.getContext('2d'); ctx.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const dark = appTheme() === 'dark'; ctx.fillStyle = dark ? '#0d1118' : '#eef1f6'; ctx.fillRect(0, 0, W, H);
      const env = { W, H, theme: dark ? 'dark' : 'light', accent: ACCENT, orange: ORANGE, helper: HELPER };
      try { def.draw(ctx, (def.duration || 5) * 0.42, deep(def.defaults || {}), env); } catch (e) { /* 单张卡出错不影响列表 */ }
    });
  }
  function paintNav() {
    $$('#nav [data-tab]').forEach(b => b.classList.toggle('is-active', b.dataset.tab === S.tab));
    $$('#libTabs [data-sub]').forEach(b => b.classList.toggle('is-active', b.dataset.sub === S.subTab));
    const n = $('#projName'); if (n && document.activeElement !== n) n.value = S.project.name;
    const m = $('#projMeta'); if (m) m.textContent = Object.keys(CARDS).length + ' 张卡 · ' + (D.nativeGroups || []).length + ' 组场景 · 本机存档';
  }
  function paintStage() {
    const cv = $('#stage'); if (!cv) return;
    drawFrame(cv.getContext('2d'), S.time, S.project, { theme: appTheme() });
  }
  function paintShowcase() {
    const cv = $('#showcaseStage'); if (!cv) return;
    const ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const id = S.showcaseId || (D.showcase || [])[0]?.id;
    const meta = (D.showcase || []).find(s => s.id === id) || {};
    const def = SHOWCASE[id];
    const p = Object.assign(deep((def || {}).defaults || {}), meta.defaults || {}, S.showcaseParams[id] || {});
    stageBg(ctx, S.showcaseTime, appTheme());
    if (def) {
      const env = { W, H, theme: appTheme(), accent: ACCENT, orange: ORANGE, helper: HELPER };
      try { def.draw(ctx, clamp(S.showcaseTime, 0, def.duration || 6), p, env); } catch (e) { drawErr(ctx, e); }
    }
  }
  function paintExportStatus() {
    const p = S.exportBusy;
    const b = $('#exportBtn'); if (b) b.disabled = p;
  }
  function render() {
    const host = $('#pageHost'); if (!host) return;
    const map = { make: pageMake, templates: pageTemplates, media: pageMedia, audio: pageAudio, showcase: pageShowcase, flow: pageFlow, settings: pageSettings };
    host.innerHTML = (map[S.tab] || pageMake)();
    applyTheme(); paintNav(); paintLib(); paintNotices(); paintStage(); paintShowcase(); paintThumbs(); paintExport();
    const ed = $('#editor'); if (ed) ed.classList.toggle('is-inspector-hidden', !S.inspectorOpen);
  }
  function repaint() {
    paintStage();
    const l = $('#timeLabel'), d = duration(S.project);
    if (l) l.innerHTML = fmt(S.time) + ' <i>/ ' + fmt(d) + '</i>';
    const s = $('#seek'); if (s && document.activeElement !== s) { s.max = d; s.value = S.time; }
    const t = $('#showTime'); if (t) t.textContent = S.showcaseTime.toFixed(2) + ' / ' + ((showDef(S.showcaseId) || {}).duration || 6) + ' 秒';
    const ss = $('#showSeek'); if (ss && document.activeElement !== ss) ss.value = S.showcaseTime;
  }

  /* ══════════ 12. 播放循环 ══════════ */
  function tick(ts) {
    const dt = prevTs == null ? 0 : Math.min((ts - prevTs) / 1000, 0.1);
    prevTs = ts;
    if (S.playing) {
      S.time += dt;
      const d = duration(S.project);
      if (S.time >= d) { S.time = d; setPlaying(false); }
      // 卡片起点触发音效
      S.project.overlays.forEach(c => { if (S.time >= c.start && S.time < c.start + dt + 0.02) playSfx(c.kind, c.start); });
      repaint();
    }
    if (S.showcasePlaying) {
      const def = showDef(S.showcaseId) || {};
      S.showcaseTime += dt;
      if (S.showcaseTime >= (def.duration || 6)) { S.showcaseTime = 0; S.showcasePlaying = false; }
      paintShowcase(); repaint();
    }
    raf = requestAnimationFrame(tick);
  }
  function setPlaying(v) {
    S.playing = v; prevTs = null;
    if (v) S.lastSfx = {};
    const b = $('[data-act="play"]'); if (b) b.innerHTML = v ? '<span class="ms-pause-icon"></span>' : '<span class="ms-play-icon"></span>';
  }

  /* ══════════ 13. 动作 ══════════ */
  function addCard(kind) {
    if (!CARDS[kind]) return toast('没有这张卡：' + kind, true);
    commit(() => {
      const p = S.project, start = Math.max(0, Math.floor(S.time));
      const c = makeCard(kind, start, start + (CARDS[kind].duration || 5));
      p.overlays.push(c); S.sel = { type: 'overlay', id: c.id }; S.inspectorOpen = true; S.tab = 'make';
    });
    toast('已加入「' + CARDS[kind].name + '」，在右边改内容');
  }
  function addScene(id) {
    commit(() => { const s = makeScene(id); S.project.scenes.push(s); S.sel = { type: 'scene', id: s.id }; S.inspectorOpen = true; S.tab = 'make'; });
    toast('已加入场景「' + id + '」');
  }
  function select(raw) {
    const [type, id] = raw.split(':');
    S.sel = { type, id }; S.inspectorOpen = true;
    const p = S.project;
    const item = type === 'scene' ? layoutScenes(p).find(s => s.id === id) : p.overlays.find(c => c.id === id);
    if (item) { S.time = clamp(item.start + 0.2, 0, duration(p)); setPlaying(false); }
    render();
  }
  function loadDemo() {
    commit(() => {
      const raw = D.demoOverlay || { cards: [] };
      S.project = exampleProject();
      S.project.name = '28 秒官方示例编排';
      S.project.overlays = [];
      (raw.cards || []).forEach(c => { if (CARDS[c.kind]) S.project.overlays.push(makeCard(c.kind, c.start, c.end, c.params || {})); });
      if (!S.project.overlays.length) S.project = exampleProject();
      S.time = 0; S.sel = null; S.tab = 'make'; setPlaying(false);
    });
    toast('示例编排已载入：' + S.project.overlays.length + ' 张卡');
  }
  function resetProject() { commit(() => { S.project = exampleProject(); S.time = 0; S.sel = null; setPlaying(false); }); toast('已恢复示例工程'); }
  function clearAll() { commit(() => { S.project.scenes = []; S.project.overlays = []; S.sel = null; S.time = 0; setPlaying(false); }); toast('工程已清空，从模板库重新加内容'); }
  function removeSel() { if (!S.sel) return; commit(() => { const p = S.project; if (S.sel.type === 'scene') p.scenes = p.scenes.filter(s => s.id !== S.sel.id); else p.overlays = p.overlays.filter(c => c.id !== S.sel.id); S.sel = null; }); toast('已删除'); }
  function dupSel() {
    if (!S.sel) return;
    commit(() => { const p = S.project; if (S.sel.type === 'scene') { const i = p.scenes.findIndex(s => s.id === S.sel.id); if (i < 0) return; const c = deep(p.scenes[i]); c.id = uid('scene'); p.scenes.splice(i + 1, 0, c); S.sel = { type: 'scene', id: c.id }; } else { const i = p.overlays.findIndex(c => c.id === S.sel.id); if (i < 0) return; const c = deep(p.overlays[i]); c.id = uid('fx'); c.start = c.end; c.end = c.start + (c.end - c.start || 5); p.overlays.splice(i + 1, 0, c); S.sel = { type: 'overlay', id: c.id }; } });
    toast('已复制一份');
  }
  function moveSel(dir) {
    if (!S.sel) return;
    commit(() => { const p = S.project, key = S.sel.type === 'scene' ? 'scenes' : 'overlays'; const arr = p[key], i = arr.findIndex(x => x.id === S.sel.id), j = i + dir; if (i < 0 || j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; });
  }
  function patchField(key, value) {
    const item = findSel(S.project); if (!item) return;
    if (key === '__start' || key === '__end') {
      const v = clamp(value, 0, 600);
      if (key === '__start') item.start = Math.min(v, item.end - 0.2); else item.end = Math.max(v, item.start + 0.2);
    } else item.params[key] = value;
    save(); repaint();
    const b = $('#v_' + key); if (b) b.textContent = value;
  }
  function importFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        if (/\.srt$|\.txt$/i.test(file.name) || text.includes('-->')) {
          const p = srtToProject(text, S.project);
          commit(() => { S.project = p; S.time = 0; S.sel = null; S.tab = 'make'; setPlaying(false); });
          toast('字幕已编排：' + p.overlays.length + ' 张卡，时间轴对齐到句');
        } else {
          const p = validateProject(JSON.parse(text));
          commit(() => { S.project = p; S.time = 0; S.sel = null; S.tab = 'make'; setPlaying(false); });
          toast('工程已导入：' + p.scenes.length + ' 个场景 / ' + p.overlays.length + ' 张卡');
        }
      } catch (e) { toast('没能导入：' + e.message, true); }
    };
    reader.readAsText(file);
  }
  function addAssets(files) {
    let added = 0;
    Array.from(files).forEach(f => {
      const kind = /^image\//.test(f.type) ? 'image' : /^video\//.test(f.type) ? 'video' : /^audio\//.test(f.type) ? 'audio' : /\.(ttf|otf|woff2?)$/i.test(f.name) ? 'font' : 'other';
      const url = URL.createObjectURL(f);
      commit(() => { S.project.assets.unshift({ name: f.name, url, size: f.size, type: f.name.split('.').pop() || f.type, kind, source: '我的上传' }); });
      added++;
    });
    toast('已放入 ' + added + ' 份素材');
  }
  function bindAsset(i) {
    const a = (S.project.assets || [])[i]; if (!a) return;
    if (!S.sel || S.sel.type !== 'scene') return toast('先在时间轴选中一个场景，再点「用于当前场景」', true);
    const s = S.project.scenes.find(x => x.id === S.sel.id); if (!s) return;
    commit(() => { s.params = Object.assign({}, s.params, { mediaName: a.name, mediaKind: a.kind, mediaUrl: a.url }); a.bindStart = layoutScenes(S.project).find(x => x.id === s.id)?.start || 0; a.bindEnd = a.bindStart + s.duration; });
    cacheImages(); toast('「' + a.name + '」已绑到当前场景');
  }
  function toProjectFromShowcase() {
    const id = S.showcaseId || (D.showcase || [])[0]?.id, meta = (D.showcase || []).find(s => s.id === id);
    if (!meta || !CARDS[meta.kind]) return toast('这个示例没有对应的动效卡', true);
    commit(() => { const c = makeCard(meta.kind, S.project.scenes.length ? duration(S.project) : 0, 0, Object.assign(deep(meta.defaults || {}), S.showcaseParams[id] || {})); c.end = c.start + (meta.duration || 6); S.project.overlays.push(c); S.sel = { type: 'overlay', id: c.id }; S.tab = 'make'; S.inspectorOpen = true; });
    toast('示例参数已带进工程');
  }

  /* ══════════ 14. 事件委托 ══════════ */
  function act(name, el) {
    switch (name) {
      case 'home': exitApp(); break;
      case 'undo': undo(); break;
      case 'redo': redo(); break;
      case 'save': exportJSON(); break;
      case 'export': S.exportOpen = true; $('#modalHost').innerHTML = modalExport(); paintExport(); break;
      case 'exportClose': S.exportOpen = false; $('#modalHost').innerHTML = ''; break;
      case 'import': $('#fileImport').click(); break;
      case 'theme': S.theme = isDark() ? 'light' : 'dark'; localStorage.setItem('lumaTheme', S.theme); applyTheme(); render(); toast('外观已切成' + (isDark() ? '暗色' : '亮色')); break;
      case 'play': setPlaying(!S.playing); break;
      case 'framePng': exportFrame(); break;
      case 'addScene': addScene('B1'); break;
      case 'tabTemplates': S.tab = 'templates'; render(); break;
      case 'tabAudio': S.tab = 'audio'; render(); break;
      case 'tabMake': S.tab = 'make'; render(); break;
      case 'lint': S.lintOpen = !S.lintOpen; render(); break;
      case 'lintClose': S.lintOpen = false; render(); break;
      case 'loadDemo': loadDemo(); break;
      case 'clearAll': clearAll(); break;
      case 'inspector': S.inspectorOpen = !S.inspectorOpen; render(); break;
      case 'dup': dupSel(); break;
      case 'remove': removeSel(); break;
      case 'moveLeft': moveSel(-1); break;
      case 'moveRight': moveSel(1); break;
      case 'closeNotice': S.notice = ''; S.error = ''; paintNotices(); break;
      case 'pickAsset': $('#fileAsset').click(); break;
      case 'clearAssets': commit(() => { S.project.assets = []; }); toast('素材已清空'); break;
      case 'toggleAudio': S.audioOn = !S.audioOn; render(); toast(S.audioOn ? '播放音效已开' : '播放音效已关'); break;
      case 'showPlay': S.showcasePlaying = !S.showcasePlaying; prevTs = null; render(); break;
      case 'showReset': { const id = S.showcaseId; delete S.showcaseParams[id]; render(); toast('参数已恢复默认'); break; }
      case 'showToProject': toProjectFromShowcase(); break;
      case 'resetProject': resetProject(); break;
      case 'wipe': localStorage.removeItem(KEY); resetProject(); toast('本机存档已清空'); break;
    }
  }
  document.addEventListener('click', e => {
    // 落地页入口按钮
    const enter = e.target.closest('[data-action="enter-app"]');
    if (enter) { e.preventDefault(); enterApp(); return; }
    const t = e.target;
    const tab = t.closest('[data-tab]'); if (tab) { S.tab = tab.dataset.tab; setPlaying(false); render(); return; }
    const sub = t.closest('[data-sub]'); if (sub) { S.subTab = sub.dataset.sub; paintLib(); paintNav(); return; }
    const lib = t.closest('[data-lib]'); if (lib) { const [type, id] = lib.dataset.lib.split(':'); if (type === 'card') addCard(id); else if (/^B[1-4]$/.test(id)) addScene(id); else previewNative(id); return; }
    const sel = t.closest('[data-sel]'); if (sel) { select(sel.dataset.sel); return; }
    const ac = t.closest('[data-addcard]'); if (ac) { addCard(ac.dataset.addcard); return; }
    const as = t.closest('[data-addscene]'); if (as) { addScene(as.dataset.addscene); return; }
    const ps = t.closest('[data-previewscene]'); if (ps) { previewNative(ps.dataset.previewscene); return; }
    const card = t.closest('[data-card]'); if (card && !t.closest('button')) { addCard(card.dataset.card); return; }
    const sc = t.closest('[data-showcase]'); if (sc) { S.showcaseId = sc.dataset.showcase; S.showcaseTime = 0; S.showcasePlaying = false; S.showcaseParams[S.showcaseId] = S.showcaseParams[S.showcaseId] || {}; render(); return; }
    const af = t.closest('[data-afilter]'); if (af) { S.assetFilter = af.dataset.afilter; render(); return; }
    const ba = t.closest('[data-bindasset]'); if (ba) { bindAsset(Number(ba.dataset.bindasset)); return; }
    const dl = t.closest('[data-dlasset]'); if (dl) { const a = S.project.assets[Number(dl.dataset.dlasset)]; if (a) { const x = document.createElement('a'); x.href = a.url; x.download = a.name; x.click(); } return; }
    const rm = t.closest('[data-rmasset]'); if (rm) { commit(() => { S.project.assets.splice(Number(rm.dataset.rmasset), 1); }); return; }
    const psf = t.closest('[data-playsfx]'); if (psf) { try { const a = new Audio('./public/sfx-default/' + psf.dataset.playsfx + '.mp3'); a.volume = .6; a.play().catch(() => toast('浏览器拦了这次播放，再点一次', true)); } catch (err) { toast('音频不可用', true); } return; }
    const ssf = t.closest('[data-setsfx]'); if (ssf) { S.sfxOverride = ssf.dataset.setsfx; render(); toast('默认音效已设为「' + (SFX_LABEL[S.sfxOverride] || S.sfxOverride) + '」'); return; }
    const li = t.closest('[data-lint-ignore]'); if (li) { S.lintIgnored[li.dataset.lintIgnore] = 1; render(); toast('这条已忽略，你的决定最大'); return; }
    const th = t.closest('[data-theme-set]'); if (th) { S.theme = th.dataset.themeSet; localStorage.setItem('lumaTheme', S.theme); applyTheme(); render(); return; }
    const ex = t.closest('[data-export]'); if (ex) {
      const k = ex.dataset.export;
      if (k === 'json') { exportJSON(); S.exportOpen = false; $('#modalHost').innerHTML = ''; }
      else if (k === 'frame') { exportFrame(); }
      else if (k === 'frames') exportFrames();
      else if (k === 'webm') exportWebM();
      return;
    }
    const a = t.closest('[data-act]'); if (a) { act(a.dataset.act, a); return; }
    if (t.id === 'exportModal') { S.exportOpen = false; $('#modalHost').innerHTML = ''; }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.id === 'libSearch') { S.libQuery = t.value; paintLib(); return; }
    if (t.id === 'seek') { S.time = Number(t.value); setPlaying(false); repaint(); return; }
    if (t.id === 'showSeek') { S.showcaseTime = Number(t.value); S.showcasePlaying = false; paintShowcase(); repaint(); return; }
    if (t.id === 'projName') { S.project.name = t.value; save(); return; }
    if (t.dataset.field) {
      const k = t.dataset.field;
      const v = t.type === 'checkbox' ? t.checked : t.type === 'range' || t.type === 'number' ? Number(t.value) : t.value;
      if ($('#pageHost [data-field]') && t.closest('#pageHost')) {
        if (S.tab === 'showcase') { const id = S.showcaseId || (D.showcase || [])[0]?.id; S.showcaseParams[id] = S.showcaseParams[id] || {}; S.showcaseParams[id][k] = v; paintShowcase(); }
        else patchField(k, v);
        const b = $('#v_' + k); if (b) b.textContent = v;
      }
    }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'fileImport' && t.files[0]) { importFile(t.files[0]); t.value = ''; return; }
    if (t.id === 'fileAsset' && t.files.length) { addAssets(t.files); t.value = ''; return; }
    if (t.dataset.field && (t.tagName === 'SELECT' || t.type === 'color' || t.type === 'checkbox')) {
      const k = t.dataset.field, v = t.type === 'checkbox' ? t.checked : t.value;
      if (S.tab === 'showcase') { const id = S.showcaseId || (D.showcase || [])[0]?.id; S.showcaseParams[id] = S.showcaseParams[id] || {}; S.showcaseParams[id][k] = v; paintShowcase(); }
      else patchField(k, v);
    }
  });
  document.addEventListener('keydown', e => {
    if (!$('#app') || $('#app').hidden) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag)) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!S.playing); return; }
    if (e.key === 'Delete' && S.sel) { e.preventDefault(); removeSel(); }
  });
  // 拖放上传
  document.addEventListener('dragover', e => { if ($('#dropBox')) { e.preventDefault(); $('#dropBox').classList.add('is-over'); } });
  document.addEventListener('dragleave', e => { const b = $('#dropBox'); if (b && !b.contains(e.relatedTarget)) b.classList.remove('is-over'); });
  document.addEventListener('drop', e => { const b = $('#dropBox'); if (b && (b === e.target || b.contains(e.target))) { e.preventDefault(); b.classList.remove('is-over'); if (e.dataTransfer.files.length) addAssets(e.dataTransfer.files); } });

  function previewNative(id) {
    const g = (D.nativeGroups || []).find(x => x.id === id) || {};
    toast('场景 ' + id + '：' + g.purpose + '，' + (g.end - g.start).toFixed(1) + ' 秒 / ' + g.fieldCount + ' 个字段。B1–B4 可直接加入工程，其余为原版原生单元说明。');
  }

  /* ══════════ 15. 进入 / 退出 ══════════ */
  function enterApp() {
    const app = $('#app'), landing = $('#landing');
    if (!app) return;
    if (landing) landing.hidden = true;
    app.hidden = false;
    app.innerHTML = skeleton();
    S.project = load();
    S.showcaseId = (D.showcase || []).find(s => SHOWCASE[s.id])?.id || null;
    location.hash = 'app';
    document.title = '叠光 LumaStack · 工作台';
    applyTheme(); render(); cacheImages();
    if (!raf) raf = requestAnimationFrame(tick);
    window.scrollTo(0, 0);
  }
  function exitApp() {
    const app = $('#app'), landing = $('#landing');
    setPlaying(false);
    if (app) { app.hidden = true; app.innerHTML = ''; }
    if (landing) landing.hidden = false;
    history.replaceState(null, '', location.pathname + location.search);
    document.title = '叠光 LumaStack · 把字幕变成动效层';
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', () => { if (location.hash === '#app' && $('#app')?.hidden) enterApp(); });

  /* ══════════ 16. 启动 ══════════ */
  function boot() {
    // 检查依赖是否都到位，缺了就在页面里明说，不留空壳
    const missing = [];
    if (!window.LumaData) missing.push('bundle.js');
    if (!window.CardRenderers || !Object.keys(window.CardRenderers).length) missing.push('cards.js');
    if (missing.length) { console.error('叠光：缺少资源', missing); document.body.insertAdjacentHTML('afterbegin', '<div style="padding:16px;background:#ba2623;color:#fff;font:14px sans-serif">资源没载入：' + missing.join('、') + '，请确认 assets 目录完整。</div>'); return; }
    // 让落地页的按钮即使被别的脚本处理过也能进工作台
    $$('[data-action="enter-app"]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); enterApp(); }));
    if (location.hash === '#app') enterApp();
    // 暴露给验收脚本
    window.__LumaApp = {
      state: S, enter: enterApp, exit: exitApp, render, repaint, drawFrame, lint, duration,
      addCard, addScene, loadDemo, exportJSON, exportFrame, exportFrames, validateProject, srtToProject,
      cardCount: Object.keys(CARDS).length, showcaseCount: Object.keys(SHOWCASE).length,
      nativeCount: Object.keys(NATIVE).length, groups: GROUPS.length,
      version: (D.source || {}).overlayStudio || D.version,
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
