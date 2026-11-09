/* 叠光 LumaStack · 动效卡渲染器
   来源：jeszhou/overlay-studio 最新版 20 张卡 + 社区 6 张 + motiontemplates/385712 B1–B4 原生文字场景
   纯 Canvas 2D，零依赖。每张卡按时间 t 真实绘制，含入场、停留、退场与数值缓动。 */
(function () {
  'use strict';
  const H = {};
  H.clamp = (v, a, b) => Math.max(a, Math.min(b, Number(v) || 0));
  H.lerp = (a, b, t) => a + (b - a) * t;
  H.easeOutExpo = x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
  H.easeOutCubic = x => 1 - Math.pow(1 - x, 3);
  H.easeInOutCubic = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  H.rgba = (hex, a) => { const h = String(hex || '#ffffff').replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
  H.font = (size, weight, mono) => (weight || 400) + ' ' + size + 'px ' + (mono ? '"Geist Mono","Noto Sans SC",monospace' : 'Geist,"Noto Sans SC","Microsoft YaHei",sans-serif');
  H.rr = (ctx, x, y, w, h, r) => { r = Math.min(r || 0, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  H.color = (v, env, def) => {
    if (!v) return def || (env.theme === 'dark' ? '#eef2f8' : '#141a24');
    if (v === 'accent') return env.accent; if (v === 'orange') return env.orange;
    if (v === 'ink') return env.theme === 'dark' ? '#eef2f8' : '#141a24';
    if (v === 'muted') return env.theme === 'dark' ? 'rgba(230,238,250,.62)' : 'rgba(20,30,50,.62)';
    if (v === 'faint') return env.theme === 'dark' ? 'rgba(230,238,250,.34)' : 'rgba(20,30,50,.34)';
    if (v === 'panel') return env.theme === 'dark' ? 'rgba(22,28,38,.86)' : 'rgba(255,255,255,.9)';
    if (v === 'panel2') return env.theme === 'dark' ? 'rgba(30,38,52,.9)' : 'rgba(240,244,250,.95)';
    return v;
  };
  H.text = (ctx, str, x, y, size, color, opt) => {
    opt = opt || {}; ctx.save(); ctx.fillStyle = color; ctx.font = H.font(size, opt.weight, opt.mono);
    ctx.textAlign = opt.align || 'left'; ctx.textBaseline = opt.baseline || 'alphabetic';
    if (opt.shadow) { ctx.shadowColor = opt.shadow; ctx.shadowBlur = opt.shadowBlur || 24; }
    const lines = String(str == null ? '' : str).split('\n');
    const lh = opt.lineHeight || size * 1.35;
    lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lh));
    ctx.restore();
  };
  H.wrap = (ctx, str, maxW, size, weight) => {
    ctx.save(); ctx.font = H.font(size, weight);
    const out = [], words = Array.from(String(str || ''));
    let line = '';
    for (const ch of words) { if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; }
    if (line) out.push(line); ctx.restore(); return out;
  };
  H.prog = (t, dur, delay) => H.easeOutExpo(H.clamp((t - (delay || 0)) / dur, 0, 1));

  /* 通用图层绘制：每个图层按 delay 依次入场，整卡前后各 0.5s 淡入淡出 */
  function layer(ctx, L, lt, a, p, env) {
    const x = L.x || 0, y = L.y || 0, w = L.w || 0, h = L.h || 0;
    const rise = (1 - a) * (L.rise == null ? 22 : L.rise);
    const col = H.color(L.color || 'ink', env);
    const acc = H.color(L.accent || 'accent', env);
    const pr = L.prog != null ? H.clamp(L.prog, 0, 1) : H.prog(lt, L.speed || 1.4, 0);
    ctx.save(); ctx.translate(0, rise);
    if (L.glow) { ctx.shadowColor = acc; ctx.shadowBlur = L.glow; }
    switch (L.type) {
      case 'panel': {
        H.rr(ctx, x, y, w, h, L.r == null ? 18 : L.r);
        ctx.fillStyle = H.color(L.fill || 'panel', env); ctx.fill();
        if (L.stroke !== false) { ctx.lineWidth = L.lw || 2; ctx.strokeStyle = L.strokeColor ? H.color(L.strokeColor, env) : H.color('faint', env); ctx.stroke(); }
        break;
      }
      case 'line': {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
        ctx.lineWidth = L.lw || 2; ctx.strokeStyle = L.strokeColor ? H.color(L.strokeColor, env) : H.color('faint', env);
        ctx.globalAlpha *= (L.alpha == null ? .8 : L.alpha); ctx.stroke(); break;
      }
      case 'text': {
        const size = L.size || 42, maxW = L.maxW || 0;
        const str = String(L.text == null ? '' : L.text);
        const lines = maxW ? str.split('\n').flatMap(s => H.wrap(ctx, s, maxW, size, L.weight)) : str.split('\n');
        const lh = L.lineHeight || size * 1.3;
        lines.forEach((ln, i) => H.text(ctx, ln, x, y + i * lh, size, col, { weight: L.weight, align: L.align, mono: L.mono, shadow: L.shadow, shadowBlur: L.shadowBlur, lineHeight: lh }));
        break;
      }
      case 'words': {
        const ws = String(L.text || '').split(/\s+/).filter(Boolean);
        const size = L.size || 54; let cx = x;
        ws.forEach((wd, i) => {
          const la = H.clamp((lt - i * (L.stagger || .12)) / .4, 0, 1);
          ctx.save(); ctx.globalAlpha *= la; ctx.translate(0, (1 - H.easeOutCubic(la)) * 26);
          H.text(ctx, wd, cx, y, size, i % 3 === 0 ? acc : col, { weight: L.weight || 600 });
          cx += ctx.measureText(wd).width + size * .34; ctx.restore();
        });
        break;
      }
      case 'counter': {
        const val = Math.round(H.clamp(L.num || 0, 0, 1e9) * pr);
        const s = L.decimals ? val.toFixed(L.decimals) : String(val);
        H.text(ctx, L.prefix || '', x, y, L.size || 120, col, { weight: 700, mono: true, shadow: acc, shadowBlur: 34 });
        const w0 = ctx.measureText ? 0 : 0;
        H.text(ctx, s, x + (L.prefix ? (L.prefix.length * (L.size || 120) * .6) : 0), y, L.size || 120, acc, { weight: 700, mono: true, shadow: acc, shadowBlur: 34 });
        if (L.unit) H.text(ctx, L.unit, x + (L.unitX || 260), y, (L.size || 120) * .32, col, { weight: 500 });
        break;
      }
      case 'ring': {
        const cx = x + w / 2, cy = y + h / 2, r = Math.min(w, h) / 2 - 12, n = L.ticks || 100;
        ctx.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const ang = -Math.PI / 2 + i / n * Math.PI * 2;
          const lit = i / n < pr * (L.value == null ? 1 : H.clamp(L.value / (L.max || 100), 0, 1));
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(ang) * (r - 26), cy + Math.sin(ang) * (r - 26));
          ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
          ctx.lineWidth = lit ? 7 : 4; ctx.strokeStyle = lit ? acc : H.color('faint', env); ctx.globalAlpha = lit ? 1 : .55; ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(cx, cy, r - 44, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = H.color('faint', env); ctx.stroke();
        const v = Math.round((L.value == null ? 82 : L.value) * pr);
        H.text(ctx, String(v) + (L.unit || ''), cx, cy + 24, L.numSize || 96, acc, { weight: 700, mono: true, align: 'center', shadow: acc, shadowBlur: 30 });
        if (L.label) H.text(ctx, L.label, cx, cy + 96, 26, col, { weight: 500, align: 'center' });
        break;
      }
      case 'bars': {
        const items = L.items || []; const max = Math.max(...items.map(i => i.v), 1);
        items.forEach((it, i) => {
          const by = y + i * (L.gap || 62), bw = (w || 600) * (it.v / max) * pr;
          H.text(ctx, it.k, x, by + 18, 26, col, { weight: 500 });
          H.rr(ctx, x + (L.labelW || 180), by, w - (L.labelW || 180), 26, 6); ctx.fillStyle = H.color('faint', env); ctx.globalAlpha = .28; ctx.fill(); ctx.globalAlpha = 1;
          H.rr(ctx, x + (L.labelW || 180), by, Math.max(4, bw), 26, 6); ctx.fillStyle = i === 0 ? acc : H.color(L.barColor || 'accent', env); ctx.globalAlpha = .9; ctx.fill(); ctx.globalAlpha = 1;
          H.text(ctx, String(it.v), x + w + 16, by + 20, 24, acc, { weight: 600, mono: true });
        });
        break;
      }
      case 'curve': {
        const pts = L.points || []; if (pts.length < 2) break;
        const n = Math.max(2, Math.floor(pts.length * pr));
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < n; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.lineWidth = L.lw || 5; ctx.strokeStyle = acc; ctx.lineJoin = 'round'; ctx.stroke();
        for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 7))) { ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], 6, 0, Math.PI * 2); ctx.fillStyle = acc; ctx.fill(); }
        break;
      }
      case 'particles': {
        const n = L.count || 46, cx = x + w / 2, cy = y + h / 2;
        for (let i = 0; i < n; i++) {
          const ang = i / n * Math.PI * 2 + (L.spin || 0), d = (L.radius || 260) * pr * (.4 + (i % 7) / 10);
          const px = cx + Math.cos(ang) * d, py = cy + Math.sin(ang) * d;
          ctx.beginPath(); ctx.arc(px, py, 3 + (i % 4), 0, Math.PI * 2); ctx.fillStyle = i % 3 ? acc : env.orange; ctx.globalAlpha = .9 * (1 - pr * .5); ctx.fill();
        }
        ctx.globalAlpha = 1; break;
      }
      case 'grid': {
        ctx.fillStyle = H.color('faint', env);
        for (let gx = x; gx < x + w; gx += (L.step || 60)) for (let gy = y; gy < y + h; gy += (L.step || 60)) { ctx.globalAlpha = .3; ctx.fillRect(gx, gy, 3, 3); }
        ctx.globalAlpha = 1; break;
      }
      case 'scan': {
        const sy = y + ((lt * (L.speed || 180)) % h);
        ctx.fillStyle = acc; ctx.globalAlpha = .5; ctx.fillRect(x, sy, w, 3); ctx.globalAlpha = 1; break;
      }
      case 'pill': {
        const label = String(L.text || ''); ctx.font = H.font(L.size || 24, 600);
        const tw = ctx.measureText(label).width + 36;
        H.rr(ctx, x, y, tw, L.height || 42, (L.height || 42) / 2); ctx.fillStyle = L.fill ? H.color(L.fill, env) : acc; ctx.globalAlpha = L.fillAlpha || .16; ctx.fill(); ctx.globalAlpha = 1;
        ctx.lineWidth = 2; ctx.strokeStyle = acc; ctx.stroke();
        H.text(ctx, label, x + 18, y + (L.height || 42) / 2 + 8, L.size || 24, acc, { weight: 600 }); break;
      }
      case 'progress': {
        H.rr(ctx, x, y, w, L.height || 10, 5); ctx.fillStyle = H.color('faint', env); ctx.globalAlpha = .3; ctx.fill(); ctx.globalAlpha = 1;
        H.rr(ctx, x, y, Math.max(4, w * pr), L.height || 10, 5); ctx.fillStyle = acc; ctx.fill();
        if (L.marks) L.marks.forEach(m => { const mx = x + w * m.t; ctx.beginPath(); ctx.arc(mx, y + (L.height || 10) / 2, 7, 0, Math.PI * 2); ctx.fillStyle = H.color('panel2', env); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = acc; ctx.stroke(); H.text(ctx, m.label, mx, y - 14, 20, col, { align: 'center', weight: 500 }); });
        break;
      }
      case 'terminal': {
        H.rr(ctx, x, y, w, h, 12); ctx.fillStyle = '#0a0e16'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = H.color('faint', env); ctx.stroke();
        ['#ff6a45', '#f5c451', '#5ad48a'].forEach((c, i) => { ctx.beginPath(); ctx.arc(x + 26 + i * 22, y + 24, 6, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); });
        (L.lines || []).forEach((ln, i) => { const la = H.clamp((lt - i * .18) / .35, 0, 1); ctx.save(); ctx.globalAlpha *= la; H.text(ctx, ln, x + 26, y + 66 + i * 34, 20, i === 0 ? acc : '#a8b6cc', { mono: true, weight: 500 }); ctx.restore(); });
        break;
      }
      case 'checklist': {
        (L.items || []).forEach((it, i) => {
          const iy = y + i * (L.gap || 60), la = H.clamp((lt - i * .22) / .4, 0, 1);
          ctx.save(); ctx.globalAlpha *= la;
          H.rr(ctx, x, iy, 30, 30, 7); ctx.lineWidth = 2; ctx.strokeStyle = acc; ctx.stroke();
          if (la > .7) { ctx.beginPath(); ctx.moveTo(x + 7, iy + 15); ctx.lineTo(x + 13, iy + 22); ctx.lineTo(x + 24, iy + 8); ctx.lineWidth = 3; ctx.strokeStyle = acc; ctx.stroke(); }
          H.text(ctx, it, x + 48, iy + 24, 28, col, { weight: 500 }); ctx.restore();
        });
        break;
      }
      case 'stamp': {
        const sc = .6 + .4 * H.easeOutExpo(H.clamp(lt / .5, 0, 1));
        ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate((L.rotate || -.14) + (1 - sc) * .4); ctx.scale(sc, sc);
        H.rr(ctx, -w / 2, -h / 2, w, h, 14); ctx.lineWidth = 8; ctx.strokeStyle = acc; ctx.stroke(); ctx.globalAlpha *= .18; ctx.fillStyle = acc; ctx.fill(); ctx.globalAlpha = 1 / sc;
        H.text(ctx, L.text || '', 0, 18, L.size || 64, acc, { align: 'center', weight: 700 }); ctx.restore(); break;
      }
      case 'chips': {
        let cx = x, cy = y; ctx.font = H.font(24, 500);
        (L.items || []).forEach((it, i) => {
          const tw = ctx.measureText(it).width + 36;
          if (cx + tw > x + (L.maxW || 1000)) { cx = x; cy += 56; }
          const la = H.clamp((lt - i * .12) / .35, 0, 1); ctx.save(); ctx.globalAlpha *= la;
          H.rr(ctx, cx, cy, tw, 40, 20); ctx.fillStyle = acc; ctx.globalAlpha *= .14; ctx.fill(); ctx.globalAlpha = la; ctx.lineWidth = 2; ctx.strokeStyle = acc; ctx.stroke();
          H.text(ctx, it, cx + 18, cy + 27, 24, col, { weight: 500 }); ctx.restore(); cx += tw + 12;
        });
        break;
      }
      case 'focus': {
        const c = L.len || 44; ctx.lineWidth = 5; ctx.strokeStyle = acc;
        [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]].forEach(([px, py, sx, sy]) => {
          ctx.beginPath(); ctx.moveTo(px + sx * c, py); ctx.lineTo(px, py); ctx.lineTo(px, py + sy * c); ctx.stroke();
        });
        ctx.setLineDash([12, 12]); ctx.lineWidth = 2; ctx.globalAlpha = .5; ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
        break;
      }
      case 'orbit': {
        const cx = x + w / 2, cy = y + h / 2;
        for (let k = 0; k < (L.rings || 3); k++) { ctx.beginPath(); ctx.arc(cx, cy, (L.radius || 180) + k * 52, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = H.color('faint', env); ctx.globalAlpha = .5; ctx.stroke(); }
        ctx.globalAlpha = 1;
        for (let i = 0; i < (L.dots || 8); i++) { const ang = lt * (L.speed || .6) + i / (L.dots || 8) * Math.PI * 2, r = (L.radius || 180) + (i % 3) * 52; ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 7, 0, Math.PI * 2); ctx.fillStyle = i % 2 ? acc : env.orange; ctx.fill(); }
        break;
      }
      case 'timeline': {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineWidth = 3; ctx.strokeStyle = H.color('faint', env); ctx.stroke();
        (L.items || []).forEach((it, i) => {
          const nx = x + (i + .5) / (L.items.length) * w, la = H.clamp((lt - i * .25) / .4, 0, 1);
          ctx.save(); ctx.globalAlpha *= la; ctx.beginPath(); ctx.arc(nx, y, 12, 0, Math.PI * 2); ctx.fillStyle = acc; ctx.fill();
          H.text(ctx, it, nx, y - 28, 24, col, { align: 'center', weight: 600 }); ctx.restore();
        });
        break;
      }
      case 'compare': {
        const half = (w - 40) / 2;
        [[x, L.left], [x + half + 40, L.right]].forEach(([bx, txt], i) => {
          H.rr(ctx, bx, y, half, h, 14); ctx.fillStyle = H.color(i ? 'panel2' : 'panel', env); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = i ? H.color('faint', env) : acc; ctx.stroke();
          H.text(ctx, i ? '另一种做法' : '当前做法', bx + 24, y + 44, 24, acc, { weight: 600 });
          H.text(ctx, String(txt || ''), bx + 24, y + 100, 30, col, { weight: 500 });
        });
        break;
      }
      case 'ticks': {
        for (let i = 0; i < (L.count || 24); i++) { const ty = y + i * (h / (L.count || 24)); const lit = i / (L.count || 24) < pr; ctx.fillStyle = lit ? acc : H.color('faint', env); ctx.globalAlpha = lit ? 1 : .4; ctx.fillRect(x, ty, lit ? 26 : 14, 3); }
        ctx.globalAlpha = 1; break;
      }
      case 'badge': {
        ctx.beginPath(); ctx.arc(x, y, L.r || 34, 0, Math.PI * 2); ctx.fillStyle = acc; ctx.globalAlpha = .18; ctx.fill(); ctx.globalAlpha = 1; ctx.lineWidth = 3; ctx.strokeStyle = acc; ctx.stroke();
        H.text(ctx, String(L.text || '1'), x, y + 10, 30, acc, { align: 'center', weight: 700 }); break;
      }
    }
    ctx.restore();
  }

  function render(ctx, t, p, env, dur, layers) {
    const gIn = H.easeOutCubic(H.clamp(t / .5, 0, 1));
    const gOut = H.easeOutCubic(H.clamp((dur - t) / .5, 0, 1));
    const g = Math.min(gIn, gOut);
    ctx.save();
    const spec = typeof layers === 'function' ? layers(p, env) : layers;
    for (const L of spec) {
      const delay = L.delay || 0, lt = t - delay;
      if (lt < 0) continue;
      const a = H.easeOutCubic(H.clamp(lt / (L.in || .45), 0, 1));
      ctx.save(); ctx.globalAlpha = g * (L.alpha == null ? 1 : L.alpha) * a;
      layer(ctx, L, lt, a, p, env);
      ctx.restore();
    }
    ctx.restore();
  }

  const R = {}, SH = {}, NA = {}, G = [];
  const C = (key, label, type, extra) => Object.assign({ key, label, type: type || 'text' }, extra || {});
  const TXT = (k, l) => C(k, l, 'text');
  const NUM = (k, l, min, max, step) => C(k, l, 'range', { min, max, step });
  const SEL = (k, l, opts) => C(k, l, 'select', { options: opts.map(o => typeof o === 'string' ? { label: o, value: o } : o) });
  const COL = (k, l) => C(k, l, 'color');
  const TOG = (k, l) => C(k, l, 'toggle');
  const L = (type, extra) => Object.assign({ type }, extra || {});

  function def(store, id, name, group, desc, dur, defaults, controls, layers) {
    store[id] = {
      name, group, description: desc, duration: dur, defaults, controls,
      draw(ctx, t, p, env) { render(ctx, t, Object.assign({}, defaults, p || {}), env, dur, layers); },
    };
  }

  /* ═════ 20 张原版动效卡 + 6 张社区扩展 ═════ */
  def(R, 'chapter-bar', '章节进度条', '常驻层', '把整条视频分成几章，进度随播放位置推进。', 6,
    { chapters: '开场 0 | 问题 1.5 | 做法 3 | 结论 4.5', accent: '#339cff', theme: 'dark' },
    [TXT('chapters', '章节与时间点'), COL('accent', '强调色'), SEL('theme', '底色', ['dark', 'light'])],
    (p, e) => {
      const rows = String(p.chapters).split('|').map(s => s.trim());
      return [
        L('panel', { x: 90, y: 900, w: 1740, h: 92, r: 16, fill: 'panel' }),
        L('progress', { x: 130, y: 968, w: 1660, height: 8, delay: .1, speed: 5, marks: rows.map(r => ({ t: Math.min(.98, (Number(r.split(/\s+/).pop()) || 0) / 6), label: r.split(/\s+/)[0] })) }),
        ...rows.map((r, i) => L('text', { x: 130 + i * (1660 / rows.length), y: 938, size: 22, text: r.split(/\s+/)[0], color: 'muted', delay: .2 + i * .12, rise: 10, weight: 500 })),
      ];
    });

  def(R, 'pin-board', '要点钉板', '常驻层', '三条要点像便签一样钉在画面上。', 6,
    { title: '这期讲三件事', points: '卡片提前做好|AI 只挑卡|改动不用重做', accent: '#ff6a45' },
    [TXT('title', '小标题'), TXT('points', '要点，用竖线分隔'), COL('accent', '强调色')],
    (p, e) => {
      const pts = String(p.points).split('|');
      return [
        L('pill', { x: 96, y: 96, text: p.title, size: 26 }),
        ...pts.map((t, i) => L('panel', { x: 110 + (i % 2) * 30, y: 220 + i * 220, w: 720, h: 150, r: 14, fill: 'panel2', delay: .2 + i * .2, rise: 30, strokeColor: 'accent' })),
        ...pts.map((t, i) => L('badge', { x: 160 + (i % 2) * 30, y: 295 + i * 220, text: String(i + 1), r: 28, delay: .3 + i * .2 })),
        ...pts.map((t, i) => L('text', { x: 220 + (i % 2) * 30, y: 310 + i * 220, size: 34, text: t, weight: 600, delay: .35 + i * .2, rise: 20 })),
      ];
    });

  def(R, 'caption-track', '双语字幕层', '常驻层', '中英两行字幕跟随时间推进，重点词高亮。', 6,
    { lines: '把字幕变成动效层|Turn subtitles into motion', kicker: '字幕 / CAPTIONS', accent: '#339cff' },
    [TXT('lines', '两行字幕，用竖线分隔'), TXT('kicker', '小标签'), COL('accent', '强调色')],
    (p, e) => {
      const ls = String(p.lines).split('|');
      return [
        L('pill', { x: 96, y: 880, text: p.kicker, size: 20 }),
        L('panel', { x: 96, y: 920, w: 1728, h: 118, r: 14, fill: 'panel', delay: .1 }),
        ...ls.map((t, i) => L('text', { x: 128, y: 968 + i * 46, size: i ? 26 : 40, text: t, color: i ? 'muted' : 'ink', weight: i ? 400 : 600, delay: .25 + i * .18, rise: 16, maxW: 1640 })),
        L('line', { x: 96, y: 912, w: 1728, h: 0, lw: 3, strokeColor: 'accent', delay: .15 }),
      ];
    });

  def(R, 'stat-proof', '数据实证', '证据实证', '用一个大数字配一条证据说明，数字缓动跳到目标值。', 6,
    { value: 63.7, unit: '%', label: '的创作者每周都要改动效', source: '来自 1,204 份问卷', accent: '#339cff' },
    [NUM('value', '数值', 0, 100, .1), TXT('unit', '单位'), TXT('label', '说明'), TXT('source', '来源'), COL('accent', '强调色')],
    (p, e) => [
      L('panel', { x: 120, y: 250, w: 1680, h: 580, r: 24, fill: 'panel' }),
      L('pill', { x: 168, y: 300, text: '数据实证 / PROOF', size: 22 }),
      L('counter', { x: 168, y: 560, num: p.value, unit: p.unit, size: 150, decimals: 1, unitX: 430, delay: .2 }),
      L('text', { x: 172, y: 660, size: 38, text: p.label, weight: 600, delay: .5, maxW: 1500 }),
      L('line', { x: 168, y: 710, w: 1540, h: 0, delay: .65 }),
      L('text', { x: 168, y: 762, size: 24, text: p.source, color: 'muted', delay: .75 }),
    ]);

  def(R, 'ring-metric', '刻度数据环', '数据指标', '100 格刻度环逐格点亮，中心数字指数缓动计数。', 6,
    { value: 82, max: 100, unit: '%', label: '让重点被看见', kicker: 'ATTENTION', accent: '#ff6a45' },
    [NUM('value', '数值', 0, 1000, 1), NUM('max', '满值', 1, 1000, 1), TXT('unit', '单位'), TXT('label', '说明'), TXT('kicker', '小标签'), COL('accent', '强调色')],
    (p, e) => [
      L('panel', { x: 600, y: 180, w: 720, h: 720, r: 28, fill: 'panel' }),
      L('pill', { x: 652, y: 226, text: p.kicker, size: 22 }),
      L('ring', { x: 690, y: 280, w: 540, h: 540, value: p.value, max: p.max, unit: p.unit, label: p.label, ticks: 100, delay: .15, speed: 1.8 }),
      L('text', { x: 960, y: 852, size: 22, text: p.label, color: 'muted', align: 'center', delay: .8 }),
    ]);

  def(R, 'odometer', '数字翻滚计数器', '数据指标', '大号数字从零翻滚到目标值，带单位与说明。', 6,
    { value: 28416, unit: '次', label: '本期动效被复用', prefix: '', accent: '#339cff' },
    [NUM('value', '数值', 0, 999999, 1), TXT('unit', '单位'), TXT('label', '说明'), TXT('prefix', '前缀'), COL('accent', '强调色')],
    (p, e) => [
      L('panel', { x: 140, y: 330, w: 1640, h: 420, r: 24, fill: 'panel' }),
      L('text', { x: 190, y: 420, size: 24, text: p.label, color: 'muted', weight: 500, delay: .1 }),
      L('counter', { x: 190, y: 620, num: p.value, prefix: p.prefix, unit: p.unit, size: 150, delay: .2, speed: 2.2, unitX: 1180 }),
      L('ticks', { x: 1760, y: 380, h: 320, count: 22, delay: .3, speed: 1.6 }),
    ]);

  def(R, 'rank-bars', '排名条形', '数据指标', '多项排名横向条形依次长出，第一名高亮。', 6,
    { title: '最常改的地方', items: '颜色 82|位置 64|字号 47|时长 31', accent: '#339cff' },
    [TXT('title', '标题'), TXT('items', '名称 数值，用竖线分隔'), COL('accent', '强调色')],
    (p, e) => {
      const items = String(p.items).split('|').map(s => { const m = s.trim().split(/\s+/); return { k: m[0], v: Number(m[1]) || 50 }; });
      return [
        L('panel', { x: 130, y: 200, w: 1660, h: 680, r: 24, fill: 'panel' }),
        L('text', { x: 180, y: 290, size: 40, text: p.title, weight: 600, delay: .1 }),
        L('bars', { x: 200, y: 370, w: 1180, gap: 116, items, labelW: 170, delay: .25, speed: 1.8 }),
      ];
    });

  def(R, 'growth-curve', '增长曲线', '数据指标', '折线从左往右画出，节点依次点亮。', 6,
    { title: '复用次数逐月变化', values: '12|20|18|34|41|58|72|91', accent: '#ff6a45' },
    [TXT('title', '标题'), TXT('values', '数值，用竖线分隔'), COL('accent', '强调色')],
    (p, e) => {
      const vals = String(p.values).split('|').map(Number), max = Math.max(...vals, 1);
      const pts = vals.map((v, i) => [220 + i * (1480 / Math.max(1, vals.length - 1)), 760 - (v / max) * 480]);
      return [
        L('panel', { x: 130, y: 180, w: 1660, h: 720, r: 24, fill: 'panel' }),
        L('grid', { x: 200, y: 250, w: 1520, h: 540, step: 70 }),
        L('text', { x: 180, y: 270, size: 38, text: p.title, weight: 600, delay: .1 }),
        L('curve', { points: pts, delay: .25, speed: 2.4 }),
        L('text', { x: 1740, y: 300, size: 60, text: String(vals.at(-1)), color: 'orange', align: 'right', weight: 700, mono: true, delay: 1.4 }),
      ];
    });

  def(R, 'versus-card', '双栏对比', '对比取舍', '左右两块对照，最后给一句结论。', 6,
    { heading: '两种做法', left: '让 AI 现场发挥', right: '从做好的卡里挑', conclusion: '选能改的那个', accent: '#339cff' },
    [TXT('heading', '标题'), TXT('left', '左边'), TXT('right', '右边'), TXT('conclusion', '结论'), COL('accent', '强调色')],
    (p, e) => [
      L('text', { x: 960, y: 220, size: 48, text: p.heading, align: 'center', weight: 600, delay: .1 }),
      L('compare', { x: 140, y: 300, w: 1640, h: 400, left: p.left, right: p.right, delay: .25 }),
      L('pill', { x: 800, y: 790, text: p.conclusion, size: 30, delay: .9 }),
    ]);

  def(R, 'quote-lockup', '金句定格', '金句观点', '一句话压满画面，逐词浮现后定格。', 6,
    { text: '你说了算', kicker: 'KEY IDEA', author: '叠光工作台', accent: '#ff6a45' },
    [TXT('text', '金句'), TXT('kicker', '小标签'), TXT('author', '署名'), COL('accent', '强调色')],
    (p, e) => [
      L('grid', { x: 80, y: 80, w: 1760, h: 920, step: 90 }),
      L('pill', { x: 140, y: 250, text: p.kicker, size: 24 }),
      L('text', { x: 140, y: 560, size: 116, text: p.text, weight: 700, delay: .2, maxW: 1640, lineHeight: 140, shadow: 'accent', shadowBlur: 30 }),
      L('line', { x: 140, y: 640, w: 620, h: 0, lw: 4, strokeColor: 'accent', delay: .8 }),
      L('text', { x: 140, y: 720, size: 28, text: p.author, color: 'muted', delay: 1 }),
    ]);

  def(R, 'punch-pill', '强调胶囊', '金句观点', '短词被胶囊框住，带轻微弹入。', 5,
    { text: '零 token', sub: '改一次不用重新生成', accent: '#ff6a45' },
    [TXT('text', '强调词'), TXT('sub', '补充说明'), COL('accent', '强调色')],
    (p, e) => [
      L('stamp', { x: 560, y: 360, w: 800, h: 220, text: p.text, size: 88, rotate: -.06, delay: .1 }),
      L('text', { x: 960, y: 700, size: 34, text: p.sub, align: 'center', color: 'muted', delay: .6 }),
    ]);

  def(R, 'step-timeline', '步骤时间线', '步骤流程', '一条横线串起几个步骤，节点依次亮起。', 6,
    { title: '三步出片', steps: '挑卡片|对时间|导透明层', accent: '#339cff' },
    [TXT('title', '标题'), TXT('steps', '步骤，用竖线分隔'), COL('accent', '强调色')],
    (p, e) => {
      const items = String(p.steps).split('|');
      return [
        L('panel', { x: 120, y: 300, w: 1680, h: 480, r: 24, fill: 'panel' }),
        L('text', { x: 180, y: 400, size: 44, text: p.title, weight: 600, delay: .1 }),
        L('timeline', { x: 220, y: 600, w: 1480, items, delay: .3 }),
        ...items.map((it, i) => L('text', { x: 220 + (i + .5) / items.length * 1480, y: 690, size: 24, text: '0' + (i + 1) + ' · ' + it, align: 'center', color: 'muted', delay: .5 + i * .25 })),
      ];
    });

  def(R, 'checklist', '清单勾选', '步骤流程', '清单逐条打勾，节奏清楚。', 6,
    { title: '发布前检查', items: '占位文案都换掉|时间没有越界|没有快闪|留了空白段', accent: '#5ad48a' },
    [TXT('title', '标题'), TXT('items', '条目，用竖线分隔'), COL('accent', '强调色')],
    (p, e) => {
      const items = String(p.items).split('|');
      return [
        L('panel', { x: 160, y: 200, w: 1600, h: 680, r: 24, fill: 'panel' }),
        L('text', { x: 210, y: 300, size: 42, text: p.title, weight: 600, delay: .1 }),
        L('checklist', { x: 220, y: 380, gap: 118, items, delay: .3 }),
      ];
    });

  def(R, 'term-card', '术语卡', '教程标注', '一个术语配一段解释，适合讲概念。', 6,
    { term: '透明动效层', en: 'Overlay layer', definition: '只含动效、背景透明的画面层，盖在原片上不改变原片一帧。', accent: '#339cff' },
    [TXT('term', '术语'), TXT('en', '英文'), TXT('definition', '解释'), COL('accent', '强调色')],
    (p, e) => [
      L('panel', { x: 160, y: 260, w: 1600, h: 560, r: 24, fill: 'panel' }),
      L('pill', { x: 210, y: 310, text: '术语 / TERM', size: 20 }),
      L('text', { x: 210, y: 450, size: 76, text: p.term, weight: 700, delay: .15 }),
      L('text', { x: 214, y: 510, size: 26, text: p.en, color: 'muted', mono: true, delay: .35 }),
      L('line', { x: 210, y: 560, w: 1500, h: 0, delay: .45 }),
      L('text', { x: 210, y: 640, size: 32, text: p.definition, maxW: 1480, lineHeight: 48, delay: .6 }),
    ]);

  def(R, 'ui-callout', '界面标注', '教程标注', '聚焦框圈住画面一块区域，配说明标签。', 6,
    { label: '点这里改颜色', hint: '改哪变哪，别的地方一个像素不动', accent: '#339cff' },
    [TXT('label', '标注'), TXT('hint', '说明'), COL('accent', '强调色')],
    (p, e) => [
      L('grid', { x: 60, y: 60, w: 1800, h: 960, step: 64 }),
      L('focus', { x: 620, y: 340, w: 700, h: 380, len: 56, delay: .1 }),
      L('pill', { x: 620, y: 260, text: p.label, size: 26, delay: .5 }),
      L('line', { x: 970, y: 302, w: 0, h: 38, lw: 3, strokeColor: 'accent', delay: .55 }),
      L('text', { x: 620, y: 790, size: 30, text: p.hint, color: 'muted', delay: .7 }),
    ]);

  def(R, 'blur-text', '模糊进场文字', '文字进场', '文字从模糊和下方浮上来，逐行出现。', 5,
    { text: '口播视频最头疼的|是后期动效', accent: '#339cff' },
    [TXT('text', '文字，用竖线分行'), COL('accent', '强调色')],
    (p, e) => {
      const ls = String(p.text).split('|');
      return [
        L('panel', { x: 200, y: 300, w: 1520, h: 480, r: 24, fill: 'panel' }),
        ...ls.map((t, i) => L('text', { x: 260, y: 460 + i * 130, size: 78, text: t, weight: 700, delay: .15 + i * .3, rise: 46, shadow: 'accent', shadowBlur: 24 })),
      ];
    });

  def(R, 'type-shift', '打字机位移', '文字进场', '逐字打出标题，光标跟着走。', 5,
    { text: '叠光 LUMASTACK', kicker: 'TYPING', accent: '#ff6a45' },
    [TXT('text', '文字'), TXT('kicker', '小标签'), COL('accent', '强调色')],
    (p, e) => [
      L('pill', { x: 180, y: 380, text: p.kicker, size: 22 }),
      L('words', { x: 180, y: 590, size: 82, text: p.text, stagger: .16, delay: .2 }),
      L('line', { x: 180, y: 640, w: 1000, h: 0, lw: 2, delay: 1.2 }),
    ]);

  def(R, 'entity-chips', '人物名牌', '人物锚定', '人名与身份以标签形式贴出。', 5,
    { name: '一页枝鸥', role: '口播创作者', tags: '每周更新|知识区|AI native', accent: '#339cff' },
    [TXT('name', '姓名'), TXT('role', '身份'), TXT('tags', '标签，用竖线分隔'), COL('accent', '强调色')],
    (p, e) => [
      L('panel', { x: 120, y: 700, w: 900, h: 250, r: 20, fill: 'panel' }),
      L('badge', { x: 190, y: 790, text: '◆', r: 34, delay: .15 }),
      L('text', { x: 250, y: 800, size: 48, text: p.name, weight: 700, delay: .25 }),
      L('text', { x: 252, y: 852, size: 26, text: p.role, color: 'muted', delay: .4 }),
      L('chips', { x: 250, y: 880, maxW: 700, items: String(p.tags).split('|'), delay: .55 }),
    ]);

  def(R, 'focus-card', '运镜聚焦框', '场景 · 运镜', '四角取景框缓慢收拢，像镜头推近。', 5,
    { label: '把镜头推到这句话', accent: '#ff6a45' },
    [TXT('label', '说明'), COL('accent', '强调色')],
    (p, e) => [
      L('grid', { x: 60, y: 60, w: 1800, h: 960, step: 80 }),
      L('focus', { x: 380, y: 240, w: 1160, h: 600, len: 70, delay: .1 }),
      L('scan', { x: 380, y: 240, w: 1160, h: 600, speed: 200, delay: .2 }),
      L('pill', { x: 380, y: 900, text: p.label, size: 26, delay: .6 }),
    ]);

  def(R, 'terminal-3d', '终端演示', '场景 · B-roll', '终端窗口逐行打出命令与结果。', 6,
    { title: '叠光 · 构建', lines: '$ npm run build|✓ 26 张动效卡已就绪|✓ 逐帧渲染器就绪|✓ 导出管线就绪|→ 开始制作', accent: '#5ad48a' },
    [TXT('title', '标题'), TXT('lines', '终端行，用竖线分隔'), COL('accent', '强调色')],
    (p, e) => [
      L('panel', { x: 220, y: 200, w: 1480, h: 680, r: 18, fill: 'panel' }),
      L('text', { x: 270, y: 280, size: 28, text: p.title, color: 'muted', mono: true, delay: .1 }),
      L('terminal', { x: 270, y: 320, w: 1380, h: 500, lines: String(p.lines).split('|'), delay: .25 }),
    ]);

  /* 社区 6 张 */
  def(R, 'constellation', '星点连线', '社区扩展', '节点之间按时间连成一张网。', 6,
    { title: '关系网', accent: '#339cff' },
    [TXT('title', '标题'), COL('accent', '强调色')],
    (p, e) => [
      L('panel', { x: 160, y: 160, w: 1600, h: 760, r: 24, fill: 'panel' }),
      L('text', { x: 210, y: 250, size: 40, text: p.title, weight: 600, delay: .1 }),
      L('orbit', { x: 460, y: 300, w: 1000, h: 560, radius: 150, rings: 3, dots: 9, speed: .7, delay: .2 }),
      L('particles', { x: 460, y: 300, w: 1000, h: 560, count: 36, radius: 220, delay: .4, speed: 1.6 }),
    ]);

  def(R, 'flow-timeline', '流动时间线', '社区扩展', '光点沿时间轴流动，节点依次点亮。', 6,
    { title: '内容流动', steps: '字幕|编排|微调|导出', accent: '#ff6a45' },
    [TXT('title', '标题'), TXT('steps', '节点，用竖线分隔'), COL('accent', '强调色')],
    (p, e) => {
      const items = String(p.steps).split('|');
      return [
        L('panel', { x: 120, y: 320, w: 1680, h: 440, r: 24, fill: 'panel' }),
        L('text', { x: 180, y: 420, size: 40, text: p.title, weight: 600, delay: .1 }),
        L('progress', { x: 200, y: 600, w: 1480, height: 12, delay: .25, speed: 3.2, marks: items.map((s, i) => ({ t: (i + .5) / items.length, label: s })) }),
        L('scan', { x: 200, y: 480, w: 1480, h: 130, speed: 90, delay: .3 }),
      ];
    });

  def(R, 'marker-highlight', '马克笔高亮', '社区扩展', '一道粗笔刷从左往右扫过重点词。', 5,
    { text: '改一个字就行', accent: '#f5c451' },
    [TXT('text', '重点文字'), COL('accent', '强调色')],
    (p, e) => [
      L('panel', { x: 160, y: 380, w: 1600, h: 320, r: 20, fill: 'panel' }),
      L('text', { x: 220, y: 560, size: 84, text: p.text, weight: 700, delay: .15 }),
      { type: 'panel', x: 214, y: 476, w: 1500, h: 100, r: 8, fill: p.accent, alpha: .34, delay: .5, in: .7, prog: H.prog(0, 1, 0) },
    ]);

  def(R, 'neon-trace', '霓虹描边', '社区扩展', '文字轮廓被一道霓虹光逐段描出。', 6,
    { text: '叠光', accent: '#ff6a45' },
    [TXT('text', '文字'), COL('accent', '强调色')],
    (p, e) => [
      L('grid', { x: 80, y: 80, w: 1760, h: 920, step: 70 }),
      L('text', { x: 960, y: 580, size: 200, text: p.text, align: 'center', weight: 700, color: 'faint', delay: .1, shadow: 'accent', shadowBlur: 40 }),
      L('orbit', { x: 560, y: 260, w: 800, h: 560, radius: 230, rings: 2, dots: 6, speed: .9, delay: .2 }),
      L('particles', { x: 560, y: 260, w: 800, h: 560, count: 28, radius: 260, delay: .5 }),
    ]);

  def(R, 'particle-burst', '粒子迸发', '社区扩展', '中心炸开一圈粒子，配合标题落定。', 5,
    { text: '重点来了', accent: '#ff6a45' },
    [TXT('text', '标题'), COL('accent', '强调色')],
    (p, e) => [
      L('particles', { x: 460, y: 240, w: 1000, h: 620, count: 64, radius: 340, delay: .1, speed: 1.2 }),
      L('text', { x: 960, y: 600, size: 96, text: p.text, align: 'center', weight: 700, delay: .5, shadow: 'accent', shadowBlur: 36 }),
    ]);

  def(R, 'stamp-slam', '印章砸落', '社区扩展', '一枚印章从上方砸下并回弹定格。', 5,
    { text: '已核对', accent: '#ff6a45' },
    [TXT('text', '印章文字'), COL('accent', '强调色')],
    (p, e) => [
      L('grid', { x: 80, y: 80, w: 1760, h: 920, step: 80 }),
      L('stamp', { x: 610, y: 340, w: 700, h: 320, text: p.text, size: 96, rotate: -.12, delay: .1 }),
      L('text', { x: 960, y: 790, size: 28, text: '事实核对完成', color: 'muted', align: 'center', delay: .8 }),
    ]);

  /* 用途分组 */
  const groupTable = [
    ['常驻层', ['chapter-bar', 'pin-board', 'caption-track']],
    ['证据实证', ['stat-proof']],
    ['数据指标', ['ring-metric', 'odometer', 'rank-bars', 'growth-curve']],
    ['对比取舍', ['versus-card']],
    ['金句观点', ['quote-lockup', 'punch-pill']],
    ['步骤流程', ['step-timeline', 'checklist']],
    ['教程标注', ['term-card', 'ui-callout']],
    ['文字进场', ['blur-text', 'type-shift']],
    ['人物锚定', ['entity-chips']],
    ['场景 · 运镜', ['focus-card']],
    ['场景 · B-roll', ['terminal-3d']],
    ['社区扩展', ['constellation', 'flow-timeline', 'marker-highlight', 'neon-trace', 'particle-burst', 'stamp-slam']],
  ];
  groupTable.forEach(([title, ids]) => G.push({ title, ids }));

  /* ═════ 6 个官方扩展示例（独立于工程，参数各不相同） ═════ */
  def(SH, 'showcase:ring-metric', '刻度数据环 · 扩展示例', '数据表达', '计数、注水与刻度同步，比单一圆环更有细节。', 5.5,
    { value: 82, max: 100, label: '让重点被看见', kicker: 'ATTENTION', accent: '#ff6a45' },
    [NUM('value', '数值', 0, 100, .1), NUM('max', '满值', 1, 1000, 1), TXT('label', '说明'), TXT('kicker', '小标签')],
    (p, e) => [L('panel', { x: 600, y: 180, w: 720, h: 720, r: 28, fill: 'panel' }), L('pill', { x: 652, y: 226, text: p.kicker, size: 22 }), L('ring', { x: 690, y: 280, w: 540, h: 540, value: p.value, max: p.max, label: p.label, unit: '%', ticks: 100, delay: .1, speed: 2 })]);

  def(SH, 'showcase:growth-curve', '增长曲线 · 扩展示例', '数据表达', '折线带节点标注，右上角给出终值。', 6,
    { title: '复用次数逐月变化', values: '12|20|18|34|41|58|72|91' },
    [TXT('title', '标题'), TXT('values', '数值，用竖线分隔')],
    (p, e) => { const v = String(p.values).split('|').map(Number), m = Math.max(...v, 1); return [L('panel', { x: 130, y: 180, w: 1660, h: 720, r: 24, fill: 'panel' }), L('grid', { x: 200, y: 250, w: 1520, h: 540, step: 70 }), L('text', { x: 180, y: 270, size: 38, text: p.title, weight: 600, delay: .1 }), L('curve', { points: v.map((n, i) => [220 + i * (1480 / (v.length - 1)), 760 - n / m * 480]), delay: .2, speed: 2.4 }), L('counter', { x: 1400, y: 320, num: v.at(-1), size: 78, delay: 1.2 })]; });

  def(SH, 'showcase:constellation', '星点连线 · 扩展示例', '关系表达', '多个节点围绕中心旋转并连成关系网。', 6,
    { title: '内容关系网', dots: 9 },
    [TXT('title', '标题'), NUM('dots', '节点数', 3, 16, 1)],
    (p, e) => [L('panel', { x: 160, y: 160, w: 1600, h: 760, r: 24, fill: 'panel' }), L('text', { x: 210, y: 250, size: 40, text: p.title, weight: 600, delay: .1 }), L('orbit', { x: 460, y: 300, w: 1000, h: 560, radius: 160, rings: 3, dots: p.dots, speed: .8, delay: .2 }), L('particles', { x: 460, y: 300, w: 1000, h: 560, count: 40, radius: 230, delay: .4 })]);

  def(SH, 'showcase:flow-timeline', '流动时间线 · 扩展示例', '流程表达', '光点沿轴流动，四个节点依次点亮。', 6,
    { title: '内容流动', steps: '字幕|编排|微调|导出' },
    [TXT('title', '标题'), TXT('steps', '节点，用竖线分隔')],
    (p, e) => { const it = String(p.steps).split('|'); return [L('panel', { x: 120, y: 320, w: 1680, h: 440, r: 24, fill: 'panel' }), L('text', { x: 180, y: 420, size: 40, text: p.title, weight: 600, delay: .1 }), L('progress', { x: 200, y: 600, w: 1480, height: 12, delay: .2, speed: 3, marks: it.map((s, i) => ({ t: (i + .5) / it.length, label: s })) }), L('scan', { x: 200, y: 480, w: 1480, h: 130, speed: 90, delay: .3 })]; });

  def(SH, 'showcase:marker-highlight', '马克笔高亮 · 扩展示例', '重点表达', '一道粗笔刷从左往右扫过重点词。', 5,
    { text: '改一个字就行', color: '#f5c451' },
    [TXT('text', '重点文字'), COL('color', '笔刷颜色')],
    (p, e) => [L('panel', { x: 160, y: 380, w: 1600, h: 320, r: 20, fill: 'panel' }), L('text', { x: 220, y: 560, size: 84, text: p.text, weight: 700, delay: .1 }), { type: 'panel', x: 214, y: 476, w: 1500, h: 100, r: 8, fill: p.color, alpha: .34, delay: .45, in: .8 }]);

  def(SH, 'showcase:neon-trace', '霓虹描边 · 扩展示例', '文字表达', '文字轮廓被霓虹光逐段描出。', 6,
    { text: '叠光', accent: '#ff6a45' },
    [TXT('text', '文字'), COL('accent', '强调色')],
    (p, e) => [L('grid', { x: 80, y: 80, w: 1760, h: 920, step: 70 }), L('text', { x: 960, y: 580, size: 200, text: p.text, align: 'center', weight: 700, color: 'faint', delay: .1, shadow: 'accent', shadowBlur: 40 }), L('orbit', { x: 560, y: 260, w: 800, h: 560, radius: 230, rings: 2, dots: 6, speed: .9, delay: .2 }), L('particles', { x: 560, y: 260, w: 800, h: 560, count: 28, radius: 260, delay: .5 })]);

  /* ═════ B1–B4 原生文字场景（MotionGit 385712 等价重建） ═════ */
  const nativeLayer = (id, name, desc, dur, defaults, controls, layers) => def(NA, id, name, '科技场景', desc, dur, defaults, controls, layers);

  nativeLayer('B1', '一个关键词', '讲一个核心词，配一句解释，金属科技风标题。', 8,
    { keyword: '创作', explanation: '把你的想法\n变成清晰的视觉故事', kicker: 'ONE IDEA' },
    [TXT('keyword', '关键词'), TXT('explanation', '解释，可换行'), TXT('kicker', '小标签')],
    (p, e) => [
      L('grid', { x: 60, y: 60, w: 1800, h: 960, step: 80 }),
      L('scan', { x: 60, y: 60, w: 1800, h: 960, speed: 130, delay: .1 }),
      L('pill', { x: 160, y: 210, text: p.kicker, size: 22 }),
      L('text', { x: 160, y: 560, size: 168, text: p.keyword, weight: 700, delay: .2, shadow: 'accent', shadowBlur: 44, lineHeight: 180, maxW: 1600 }),
      L('line', { x: 160, y: 620, w: 720, h: 0, lw: 4, strokeColor: 'accent', delay: .7 }),
      L('text', { x: 164, y: 740, size: 44, text: p.explanation, color: 'muted', weight: 500, delay: .85, lineHeight: 62, maxW: 1500 }),
      L('ticks', { x: 1760, y: 300, h: 480, count: 20, delay: .3, speed: 2 }),
    ]);

  nativeLayer('B2', '一到五点', '一个标题带最多五个要点，逐条入场。', 10,
    { heading: '三步出片', points: '挑卡片|对时间|导透明层' },
    [TXT('heading', '标题'), TXT('points', '要点，用竖线分隔')],
    (p, e) => {
      const pts = String(p.points).split('|').slice(0, 5);
      return [
        L('grid', { x: 60, y: 60, w: 1800, h: 960, step: 80 }),
        L('text', { x: 140, y: 260, size: 92, text: p.heading, weight: 700, delay: .15, shadow: 'accent', shadowBlur: 30 }),
        L('line', { x: 140, y: 320, w: 1640, h: 0, lw: 3, delay: .4 }),
        ...pts.map((t, i) => L('badge', { x: 170, y: 430 + i * 120, text: String(i + 1), r: 30, delay: .5 + i * .22 })),
        ...pts.map((t, i) => L('text', { x: 240, y: 448 + i * 120, size: 46, text: t, weight: 600, delay: .55 + i * .22, rise: 20 })),
      ];
    });

  nativeLayer('B3', '两方对比', '左右两个角度对照，最后给一句结论。', 10,
    { heading: '一起完成创作', left: '科技场景', right: '原有动效', conclusion: '改字、调顺序，保存自己的工程' },
    [TXT('heading', '标题'), TXT('left', '左'), TXT('right', '右'), TXT('conclusion', '结论')],
    (p, e) => [
      L('text', { x: 960, y: 200, size: 72, text: p.heading, align: 'center', weight: 700, delay: .15 }),
      L('compare', { x: 140, y: 290, w: 1640, h: 440, left: p.left, right: p.right, delay: .3 }),
      L('panel', { x: 340, y: 800, w: 1240, h: 130, r: 16, fill: 'panel2', delay: 1 }),
      L('text', { x: 960, y: 880, size: 38, text: p.conclusion, align: 'center', weight: 600, delay: 1.1 }),
    ]);

  nativeLayer('B4', '总结行动', '总结一句，再给一个明确的下一步。', 8,
    { summary: '一份工程，反复用', action: '现在打开工作台' },
    [TXT('summary', '总结'), TXT('action', '行动')],
    (p, e) => [
      L('grid', { x: 60, y: 60, w: 1800, h: 960, step: 80 }),
      L('pill', { x: 160, y: 240, text: 'SUMMARY / 总结', size: 22 }),
      L('text', { x: 160, y: 520, size: 110, text: p.summary, weight: 700, delay: .2, maxW: 1600, shadow: 'accent', shadowBlur: 32 }),
      L('stamp', { x: 1080, y: 640, w: 640, h: 180, text: p.action, size: 52, rotate: -.05, delay: .7 }),
      L('line', { x: 160, y: 600, w: 900, h: 0, lw: 4, strokeColor: 'accent', delay: .55 }),
    ]);

  window.CardRenderers = R;
  window.ShowcaseRenderers = SH;
  window.NativeRenderers = NA;
  window.CardGroups = G;
  window.CardHelpers = H;
})();
