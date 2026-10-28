/* Keetown ad campaign: "One team for every property need" — 30 s motion graphic.
 * Deterministic: KC.render(t) draws frame t (seconds), so it can be previewed live or rendered frame by frame to MP4.
 * Sizes: 9:16 (Reels / Stories / Shorts, 1080×1920) and 4:5 (feed, 1080×1350). Ends on "Interested? Tap below"
 * so it pairs with the platform's own "I'm interested" / "Learn more" button. Illustrations = the website's (js/visuals.js). */
window.KC = (function () {
  const C = { navy: '#1e4386', blue: '#3669b2', mid: '#0b1a33', sky: '#a9c4ee', ice: '#eef3fb', ink: '#14213a', muted: '#5c6b7d', white: '#fff' };
  const SCENES = [
    { kind: 'intro', d: 3.4 },
    { k: 'tenants', tag: 'For tenants', q: ['Looking to', 'rent a home?'], v: 'keys', pts: ['Verified owners only', 'Homes matched to your budget', 'Rent & repairs in one app'] },
    { k: 'buyers', tag: 'For buyers', q: ['Buying a', 'home?'], v: 'legal', pts: ['Title checked before any token', 'Every cost planned upfront', 'Tracked till you get the keys'] },
    { k: 'owners', tag: 'For owners & NRIs', q: ['Own a', 'property?'], v: 'report', pts: ['The right tenant, rent on time', 'Repairs, tax & bills handled', 'Complete property management'] },
    { k: 'builders', tag: 'For builders', q: ['Builder or', 'developer?'], v: 'launch', pts: ['Upload all your inventory at once', 'Verified buyer leads', 'Site visits to bookings'] },
    { k: 'companies', tag: 'For companies', q: ['Relocating', 'your team?'], v: 'relocation', pts: ['Homes near the office', 'Paid from the rent allowance', 'Office space, sorted'] },
    { kind: 'end', d: 4.6 }
  ];
  SCENES.forEach(s => { if (!s.d) s.d = 4.4; });
  let acc = 0; SCENES.forEach(s => { s.t0 = acc; acc += s.d; }); const DURATION = acc;

  /* ---------- helpers ---------- */
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const ease = x => 1 - Math.pow(1 - clamp(x), 4);                       // out-quart
  const easeIO = x => { x = clamp(x); return x < .5 ? 8 * x ** 4 : 1 - Math.pow(-2 * x + 2, 4) / 2; };
  const spring = x => { x = clamp(x); return 1 - Math.exp(-6 * x) * Math.cos(9 * x); };
  const seg = (t, a, d) => clamp((t - a) / d);
  let W = 1080, H = 1920, ctx, imgs = {}, logo = {};
  const font = (w, px, fam = 'Inter') => `${w} ${px}px ${fam === 'serif' ? '"Instrument Serif", Georgia, serif' : 'Inter, system-ui, sans-serif'}`;

  /* website illustrations → images (inline styles, final state) */
  const VSTYLE = `<style>.vbg{fill:#eef3fb}.vl{fill:none;stroke:#1e4386;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}.vl.thick{stroke-width:4}.vf{fill:#a9c4ee}.va{fill:#3669b2}.vw{fill:#fff}
    .vck{fill:none;stroke:#fff;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}.vck.big{stroke:#1e4386;stroke-width:4}.vt{font:700 13px Inter,sans-serif;fill:#1e4386}.vtw{font:700 9.5px Inter,sans-serif;fill:#fff}.vts{font:700 7.5px Inter,sans-serif;fill:#1e4386}
    .vlw{stroke:#fff;stroke-width:2.4;stroke-linecap:round}.vsig{fill:none;stroke:#3669b2;stroke-width:2.6;stroke-linecap:round}.vring{fill:none;stroke:#1e4386;stroke-width:5;stroke-linecap:round}.vstamp{fill:none;stroke:#3669b2;stroke-width:3}
    .vwin rect{fill:#fff}.vwin2 rect{fill:#3669b2}.dash{stroke-dasharray:3 5}</style>`;
  function loadImg(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }); }
  async function prepare(canvas, aspect) {
    W = 1080; H = aspect === '4:5' ? 1350 : 1920; canvas.width = W; canvas.height = H; ctx = canvas.getContext('2d');
    const keys = [...new Set(SCENES.filter(s => s.v).map(s => s.v).concat(['verify', 'rent', 'portal', 'office']))];
    await Promise.all(keys.map(async k => { const svg = KTVis.svg(k).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" ').replace(/(<svg[^>]*>)/, '$1' + VSTYLE); imgs[k] = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)); }));
    logo.color = await loadImg('../assets/brand/logo.svg'); logo.white = await loadImg('../assets/brand/logo-white.svg');
    if (document.fonts) { await document.fonts.load('400 80px "Instrument Serif"'); await document.fonts.load('italic 400 80px "Instrument Serif"'); await document.fonts.load('600 40px Inter'); await document.fonts.load('700 40px Inter'); await document.fonts.ready; }
  }
  const tall = () => H > 1500;
  const S = v => v * (tall() ? 1 : .82);   // scale type for 4:5

  function bgLight(t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f7f9fd'); g.addColorStop(1, '#e4ecf9'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    [[.15, .2, 380, 0], [.9, .55, 460, 1.7], [.3, .95, 420, 3.1]].forEach(([x, y, r, ph]) => {
      const cx = W * x + Math.sin(t * .35 + ph) * 40, cy = H * y + Math.cos(t * .3 + ph) * 50, rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      rg.addColorStop(0, 'rgba(169,196,238,.45)'); rg.addColorStop(1, 'rgba(169,196,238,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H); });
  }
  function bgDark(t) {
    ctx.fillStyle = C.mid; ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(W * .7, H * .35, 0, W * .7, H * .35, H * .7); rg.addColorStop(0, 'rgba(54,105,178,.55)'); rg.addColorStop(1, 'rgba(11,26,51,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(169,196,238,.07)'; ctx.lineWidth = 2;
    for (let k = 0; k < 9; k++) { ctx.beginPath(); for (let x = 0; x <= W; x += 20) { const y = H * .72 + k * 34 + Math.sin(x * .006 + k * .7 + t * .6) * 22; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
  }
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function logoTop(white, a = 1) { const L = white ? logo.white : logo.color; if (!L) return; ctx.globalAlpha = a; const h = S(74), w = h * L.width / L.height; ctx.drawImage(L, 72, tall() ? 150 : 70, w, h); ctx.globalAlpha = 1; }
  function progress(t) {   // story-style segments for the five client scenes
    const segs = SCENES.filter(s => s.k), y = tall() ? 118 : 44, gap = 10, w = (W - 144 - gap * 4) / 5;
    segs.forEach((s, i) => { const p = clamp((t - s.t0) / s.d); rr(72 + i * (w + gap), y, w, 6, 3); ctx.fillStyle = 'rgba(30,67,134,.15)'; ctx.fill(); if (p > 0) { rr(72 + i * (w + gap), y, w * p, 6, 3); ctx.fillStyle = C.navy; ctx.fill(); } });
  }
  // text that rises out of a mask line
  function riseText(txt, x, y, f, color, p, align = 'left') { ctx.save(); ctx.font = f; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; const m = ctx.measureText(txt), hgt = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent + 30;
    ctx.beginPath(); ctx.rect(align === 'center' ? x - m.width / 2 - 20 : x - 20, y - m.actualBoundingBoxAscent - 12, m.width + 60, hgt); ctx.clip(); ctx.fillStyle = color; ctx.fillText(txt, x, y + (1 - ease(p)) * hgt); ctx.restore(); }

  /* ---------- scenes ---------- */
  function intro(t) {
    bgDark(t);
    const base = tall() ? H * .6 : H * .62, bw = W / 9;
    for (let i = 0; i < 9; i++) {   // skyline rising
      const hh = [260, 380, 300, 520, 640, 460, 340, 420, 280][i] * (tall() ? 1 : .75), p = ease(seg(t, .15 + i * .07, 1)), x = i * bw + 6, h = hh * p;
      const g = ctx.createLinearGradient(0, base - hh, 0, base); g.addColorStop(0, 'rgba(169,196,238,.95)'); g.addColorStop(1, 'rgba(169,196,238,.25)'); ctx.fillStyle = g; rr(x, base - h, bw - 12, h, 6); ctx.fill();
      ctx.fillStyle = 'rgba(11,26,51,.45)'; for (let r = 0; r < Math.floor(h / 46); r++) for (let c = 0; c < 2; c++) if ((r + c + i) % 3) ctx.fillRect(x + 22 + c * 40, base - h + 26 + r * 46, 16, 20);
    }
    const pp = spring(seg(t, 1.2, 1.1)), px = 4.5 * bw, py = base - 640 * (tall() ? 1 : .75) - 40 - (1 - pp) * 300;   // pin drops on the tallest tower
    ctx.globalAlpha = clamp(seg(t, 1.2, .3)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(px, py + 70); ctx.bezierCurveTo(px - 60, py + 10, px - 46, py - 46, px, py - 46); ctx.bezierCurveTo(px + 46, py - 46, px + 60, py + 10, px, py + 70); ctx.fill();
    ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(px, py, 16, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    logoTop(true, ease(seg(t, .1, .6)));
    const ty = tall() ? H * .7 : H * .73;
    riseText('One team for every', 72, ty, font(400, S(96), 'serif'), '#fff', seg(t, .5, .9));
    riseText('property need.', 72, ty + S(104), font('italic 400', S(96), 'serif'), C.sky, seg(t, .7, .9));
    ctx.globalAlpha = ease(seg(t, 1.4, .7)); ctx.font = font(500, S(34)); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillText('Keetown Realty · Hyderabad', 72, ty + S(190)); ctx.globalAlpha = 1;
  }
  function client(s, t) {
    bgLight(t); progress(s.t0 + t); logoTop(false);
    const out = easeIO(seg(t, s.d - .45, .45)), dy = -out * 120; ctx.save(); ctx.globalAlpha = 1 - out; ctx.translate(0, dy);
    const top = tall() ? 320 : 160;
    // tag chip
    const tp = ease(seg(t, .05, .5)); ctx.font = font(700, S(26)); const tw = ctx.measureText(s.tag.toUpperCase()).width + 48;
    ctx.globalAlpha *= tp; rr(72 - (1 - tp) * 40, top, tw, S(54), S(27)); ctx.fillStyle = C.navy; ctx.fill(); ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.fillText(s.tag.toUpperCase(), 96 - (1 - tp) * 40, top + S(28)); ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1 - out;
    // headline
    riseText(s.q[0], 72, top + S(170), font(400, S(112), 'serif'), C.ink, seg(t, .15, .8));
    riseText(s.q[1], 72, top + S(290), font('italic 400', S(112), 'serif'), C.blue, seg(t, .3, .8));
    // illustration
    const vi = imgs[s.v], vp = spring(seg(t, .35, 1.1)), vw = tall() ? 760 : 600, vh = vw * .75, vx = tall() ? (W - vw) / 2 : W - vw - 10, vy = tall() ? top + 380 : top + 300;
    if (vi) { const f = Math.sin((s.t0 + t) * 1.6) * 8; ctx.save(); ctx.translate(vx + vw / 2, vy + vh / 2 + f); ctx.scale(.6 + .4 * vp, .6 + .4 * vp); ctx.globalAlpha *= clamp(vp * 1.4); ctx.drawImage(vi, -vw / 2, -vh / 2, vw, vh); ctx.restore(); }
    // bullets
    const by = tall() ? vy + vh + 70 : H - 80 - 3 * S(118);
    s.pts.forEach((p, i) => {
      const a = seg(t, 1.1 + i * .35, .6), y = by + i * S(118), x = 72;
      if (!tall()) { /* 4:5: bullets on the left, under the headline */ }
      ctx.save(); ctx.globalAlpha *= ease(a); ctx.translate((1 - ease(a)) * -60, 0);
      rr(x, y, W - 144, S(96), S(22)); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill(); ctx.strokeStyle = 'rgba(30,67,134,.1)'; ctx.lineWidth = 2; ctx.stroke();
      const cp = spring(seg(t, 1.25 + i * .35, .6)); ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(x + S(50), y + S(48), S(24) * cp, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = S(5); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(x + S(39), y + S(49)); ctx.lineTo(x + S(47), y + S(57)); ctx.lineTo(x + S(62), y + S(40)); if (cp > .5) ctx.stroke();
      ctx.font = font(600, S(tall() ? 38 : 30)); ctx.fillStyle = C.ink; ctx.textBaseline = 'middle'; ctx.fillText(p, x + S(96), y + S(49)); ctx.textBaseline = 'alphabetic'; ctx.restore();
    });
    ctx.restore();
  }
  function end(t) {
    bgDark(t); logoTop(true, ease(seg(t, 0, .5)));
    const cy = tall() ? H * .3 : H * .2;
    riseText('Interested?', W / 2, cy + S(40), font(400, S(150), 'serif'), '#fff', seg(t, .1, .8), 'center');
    ctx.globalAlpha = ease(seg(t, .5, .6)); ctx.font = font(500, S(40)); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.textAlign = 'center';
    ctx.fillText('Tell us what you need.', W / 2, cy + S(130)); ctx.fillText('We call you back within a working day.', W / 2, cy + S(184)); ctx.globalAlpha = 1;
    // client chips pop in a wrapped grid
    const chips = ['Rent', 'Buy', 'Manage', 'Sell', 'Build', 'Relocate'], cols = 3, cw = S(270), ch = S(88), gx = 22, gy = 22, x0 = (W - (cols * cw + (cols - 1) * gx)) / 2, y0 = cy + S(260);
    chips.forEach((c, i) => { const p = spring(seg(t, .8 + i * .1, .7)), x = x0 + (i % cols) * (cw + gx), y = y0 + Math.floor(i / cols) * (ch + gy);
      ctx.save(); ctx.translate(x + cw / 2, y + ch / 2); ctx.scale(p, p); rr(-cw / 2, -ch / 2, cw, ch, ch / 2); ctx.fillStyle = 'rgba(169,196,238,.14)'; ctx.fill(); ctx.strokeStyle = 'rgba(169,196,238,.45)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.font = font(600, S(36)); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c, 0, 2); ctx.restore(); });
    // "tap below" pointer, bouncing towards the platform's button
    const ay = (tall() ? H - 560 : H - 330) + Math.abs(Math.sin(t * 4)) * 26, ap = ease(seg(t, 1.6, .6));
    ctx.globalAlpha = ap; ctx.font = font(700, S(46)); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('Tap “I’m interested” below', W / 2, ay - S(30));
    ctx.strokeStyle = C.sky; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(W / 2, ay + 10); ctx.lineTo(W / 2, ay + 110); ctx.moveTo(W / 2 - 44, ay + 66); ctx.lineTo(W / 2, ay + 112); ctx.lineTo(W / 2 + 44, ay + 66); ctx.stroke();
    ctx.font = font(500, S(30)); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillText('or WhatsApp +91 63017 78084', W / 2, ay + S(190)); ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
  // cross-dissolve between scenes so cuts never feel abrupt
  function render(t) {
    t = clamp(t, 0, DURATION - 1e-3); const i = SCENES.findIndex(s => t >= s.t0 && t < s.t0 + s.d), s = SCENES[i], lt = t - s.t0;
    const draw = (sc, l) => sc.kind === 'intro' ? intro(l) : sc.kind === 'end' ? end(l) : client(sc, l);
    draw(s, lt);
    const fadeIn = .35; if (i > 0 && lt < fadeIn && (s.kind === 'end' || SCENES[i - 1].kind === 'intro')) { ctx.save(); ctx.globalAlpha = 1 - lt / fadeIn; ctx.fillStyle = s.kind === 'end' ? '#e4ecf9' : C.mid; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  }
  return { prepare, render, DURATION, SCENES };
})();
