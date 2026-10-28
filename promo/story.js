/* Keetown "One team. Every property need." — story ad, in the sticker-UI style of the XLNC AI film:
 * dotted paper, ink-outlined cards with hard shadows, a cursor that actually uses the product, one scene per client,
 * everything assembling inside a house, and an "Interested? Tap below" end card for the platform's button.
 * Deterministic: KS.render(t) draws frame t. Aspects: 16:9 (1920×1080), 9:16 (1080×1920), 4:5 (1080×1350). */
window.KS = (function () {
  const INK = '#0f1b33', BG = '#f3f6fc', A = '#2f5fb3', NAVY = '#1e4386', SKY = '#a9c4ee', SOFT = '#e7eefa', WHITE = '#fff', OK = '#1d8a5f';
  const DISP = '"Outfit", Inter, system-ui, sans-serif', UI = 'Inter, system-ui, sans-serif';
  const SC = [
    { id: 'problem', d: 6.0 }, { id: 'brand', d: 3.4 },
    { id: 'tenants', d: 6.0, tag: 'For tenants', mode: 'replace', h1: [['Homes'], ['that', 'fit.']], h2: [['Verified.'], ['Matched.', 1]] },
    { id: 'buyers', d: 6.0, tag: 'For buyers', h1: [['Papers', 'first.']], h2: [['Token', 1, 'later.', 1]] },
    { id: 'owners', d: 6.0, tag: 'Property management', h1: [['Rent', 'on', 'time.']], h2: [['Home', 1], ['cared', 1, 'for.', 1]] },
    { id: 'builders', d: 6.0, tag: 'For builders', h1: [['Upload', 'once.']], h2: [['Sell', 1, 'faster.', 1]] },
    { id: 'companies', d: 6.0, tag: 'For companies', h1: [['Relocate'], ['the', 'team.']], h2: [['Not', 1, 'the', 1], ['stress.', 1]] },
    { id: 'house', d: 6.0 }, { id: 'end', d: 5.2 }
  ];
  let acc = 0; SC.forEach(s => { s.t0 = acc; acc += s.d; }); const DURATION = acc;

  /* ---------- easing ---------- */
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const seg = (t, a, d) => clamp((t - a) / d);
  const out3 = x => 1 - Math.pow(1 - clamp(x), 3);
  const io = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
  const back = x => { x = clamp(x); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const lerp = (a, b, p) => a + (b - a) * p;
  const rnd = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  let W, H, ctx, ASP, logo, logoW, mark, snaps = {}, L;
  const F = (w, px, fam = UI) => `${w} ${px}px ${fam}`;

  /* ---------- layout per aspect ---------- */
  function layout() {
    if (ASP === '16:9') return { hx: 120, ey: 330, hy: 470, hs: 118, lh: 124, stage: { x: 880, y: 150, s: 1.26 }, center: { x: W / 2, y: H / 2 }, logoH: 64, logoY: 64 };
    if (ASP === '4:5') return { hx: 84, ey: 150, hy: 262, hs: 92, lh: 96, stage: { x: (W - 760) / 2, y: 600, s: 1 }, center: { x: W / 2, y: H * .46 }, logoH: 56, logoY: 56 };
    return { hx: 84, ey: 300, hy: 430, hs: 116, lh: 122, stage: { x: (W - 760 * 1.26) / 2, y: 760, s: 1.26 }, center: { x: W / 2, y: H * .44 }, logoH: 60, logoY: 140 };
  }

  /* ---------- primitives (drawn in the current transform) ---------- */
  function path(x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function card(x, y, w, h, o = {}) {
    // playful: soft coloured shadow, no ink outline
    const r = (o.r ?? 20) * 1.15, sh = o.sh ?? 7; ctx.save();
    if (sh) { ctx.shadowColor = 'rgba(30,67,134,' + (sh > 4 ? .26 : .18) + ')'; ctx.shadowBlur = sh * 4.5; ctx.shadowOffsetY = sh * 1.8; }
    path(x, y, w, h, r); ctx.fillStyle = o.fill || WHITE; ctx.fill(); ctx.shadowColor = 'transparent';
    if (o.dash) { ctx.setLineDash(o.dash); ctx.lineWidth = 3; ctx.strokeStyle = SKY; ctx.stroke(); } else if (!o.noline && (o.fill || WHITE) === WHITE) { ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(30,67,134,.1)'; ctx.stroke(); }
    ctx.restore();
  }
  function text(s, x, y, o = {}) { ctx.font = F(o.w || 600, o.s || 22, o.f || UI); ctx.fillStyle = o.c || INK; ctx.textAlign = o.al || 'left'; ctx.textBaseline = o.bl || 'alphabetic'; ctx.fillText(s, x, y); }
  function tw(s, o = {}) { ctx.font = F(o.w || 600, o.s || 22, o.f || UI); return ctx.measureText(s).width; }
  function pill(x, y, label, o = {}) {
    const s = o.s || 20, pad = o.pad || 18, w = tw(label, { w: 700, s }) + pad * 2, h = s * 2.1;
    card(x, y, w, h, { r: h / 2, fill: o.fill || SOFT, sh: (o.fill && o.fill !== WHITE && o.fill !== SOFT) ? 3 : 0, noline: true });
    text(label, x + w / 2, y + h / 2 + 1, { w: 700, s, c: o.c || INK, al: 'center', bl: 'middle' }); return w;
  }
  // scale an element in from its centre with an overshoot (p = 0..1)
  function pop(cx, cy, p, fn, rot = 0) { if (p <= 0) return; const s = back(p); ctx.save(); ctx.globalAlpha *= clamp(p * 3); ctx.translate(cx, cy); ctx.rotate(rot * (1 - out3(p))); ctx.scale(s, s); ctx.translate(-cx, -cy); fn(); ctx.restore(); }
  function rise(p, dy, fn) { if (p <= 0) return; ctx.save(); ctx.globalAlpha *= clamp(p * 2); ctx.translate(0, (1 - out3(p)) * dy); fn(); ctx.restore(); }
  function tick(x, y, r, p, fill = A) {
    if (p <= 0) return; const s = back(clamp(p * 1.4)); ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = fill === A ? '#2fae7a' : fill; ctx.fill();
    const q = clamp((p - .35) / .5); if (q > 0) { ctx.beginPath(); ctx.moveTo(-r * .42, 0); const mx = -r * .1, my = r * .32; if (q < .4) ctx.lineTo(lerp(-r * .42, mx, q / .4), lerp(0, my, q / .4)); else { ctx.lineTo(mx, my); ctx.lineTo(lerp(mx, r * .45, (q - .4) / .6), lerp(my, -r * .35, (q - .4) / .6)); } ctx.strokeStyle = WHITE; ctx.lineWidth = r * .26; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); }
    ctx.restore();
  }
  function cursor(x, y, click = 0) {
    ctx.save(); ctx.translate(x, y);
    if (click > 0 && click < 1) { ctx.beginPath(); ctx.arc(0, 0, 10 + click * 34, 0, 7); ctx.strokeStyle = `rgba(47,95,179,${1 - click})`; ctx.lineWidth = 4; ctx.stroke(); }
    const s = click > 0 && click < .35 ? .86 : 1; ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 34); ctx.lineTo(9, 26); ctx.lineTo(16, 40); ctx.lineTo(22, 37); ctx.lineTo(15, 23); ctx.lineTo(26, 22); ctx.closePath();
    ctx.fillStyle = WHITE; ctx.fill(); ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
  }
  // cursor travelling along keyframes [[t,x,y],…] with clicks at times
  function cursorPath(t, keys, clicks = []) {
    if (t < keys[0][0]) return; let k = keys.length - 1; for (let i = 0; i < keys.length - 1; i++) if (t < keys[i + 1][0]) { k = i; break; }
    let x, y; if (k === keys.length - 1) [, x, y] = keys[k]; else { const [t0, x0, y0] = keys[k], [t1, x1, y1] = keys[k + 1], p = io((t - t0) / (t1 - t0)); x = lerp(x0, x1, p); y = lerp(y0, y1, p); }
    const c = clicks.map(ct => (t - ct) / .45).find(v => v >= 0 && v < 1) ?? 0; cursor(x, y, c);
  }
  function bubble(x, y, s, o = {}) { const size = o.s || 21, w = tw(s, { w: 600, s: size }) + 40, h = size * 2.3; card(x, y, w, h, { r: 16, fill: o.fill || WHITE, sh: 5 });
    ctx.beginPath(); ctx.moveTo(x + 22, y + h - 1); ctx.lineTo(x + 18, y + h + 14); ctx.lineTo(x + 38, y + h - 1); ctx.fillStyle = o.fill || WHITE; ctx.fill(); text(s, x + 20, y + h / 2 + 1, { w: 600, s: size, bl: 'middle', c: o.c || INK }); return w; }
  function bars(x, y, w, h, p, vals) { const bw = w / vals.length; vals.forEach((v, i) => { const q = out3(seg(p, i * .08, .5)); card(x + i * bw + 4, y + h - v * h * q, bw - 10, v * h * q, { r: 6, sh: 0, noline: true, fill: i === vals.length - 1 ? '#5a55d8' : '#cfe0fb' }); }); }
  function houseIcon(x, y, w, h) { ctx.save(); path(x, y, w, h, 14); ctx.fillStyle = SOFT; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = A;
    const cx = x + w / 2, by = y + h * .78, s = Math.min(w, h) * .34; ctx.beginPath(); ctx.moveTo(cx - s, by); ctx.lineTo(cx - s, by - s * .9); ctx.lineTo(cx, by - s * 1.6); ctx.lineTo(cx + s, by - s * .9); ctx.lineTo(cx + s, by); ctx.closePath(); ctx.fillStyle = SKY; ctx.fill(); ctx.stroke();
    ctx.fillStyle = WHITE; ctx.fillRect(cx - s * .25, by - s * .55, s * .5, s * .55); ctx.strokeRect(cx - s * .25, by - s * .55, s * .5, s * .55); ctx.restore(); }

  /* ---------- frame-level pieces ---------- */
  function background(t) {
    // playful: soft gradient with drifting pastel shapes (no dots)
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#f6f9ff'); g.addColorStop(.55, '#eaf1fd'); g.addColorStop(1, '#f3f0ff'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const blob = (x, y, r, c1, c2) => { const rg = ctx.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r); rg.addColorStop(0, c1); rg.addColorStop(1, c2); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
    const m = Math.min(W, H);
    ctx.globalAlpha = .5; blob(W * .92 + Math.sin(t * .4) * 20, H * .08 + Math.cos(t * .3) * 20, m * .3, '#dbe7fb', 'rgba(169,196,238,0)'); blob(W * .05 + Math.cos(t * .35) * 18, H * .92, m * .24, '#e2f6ee', 'rgba(191,232,214,0)'); ctx.globalAlpha = 1;
    [[.47, .1, 22, '#ffd98a', 0], [.06, .58, 16, '#c9b8ff', 1], [.55, .9, 11, '#8fd3b4', 2], [.95, .5, 13, '#ffc2c9', 3]].forEach(([x, y, r, c, i]) => { ctx.save(); ctx.globalAlpha = .75; ctx.fillStyle = c; ctx.translate(W * x + Math.sin(t * .8 + i) * 14, H * y + Math.cos(t * .7 + i) * 16); ctx.rotate(t * .3 + i);
      if (i % 2) { path(-r, -r, r * 2, r * 2, r * .5); ctx.fill(); } else { ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); } ctx.restore(); });
  }
  function brandCorner(a = 1) { if (!logo) return; ctx.save(); ctx.globalAlpha = a; const h = L.logoH, w = h * logoW; ctx.drawImage(logo, ASP === '16:9' ? W - w - 70 : 70, L.logoY, w, h); ctx.restore(); }
  function eyebrow(label, p) {
    if (p <= 0) return; const y = L.ey, x = L.hx, q = out3(p);
    ctx.save(); ctx.strokeStyle = A; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-10, y - 12); ctx.quadraticCurveTo((x - 22) * .5, y - 22, (x - 22) * q, y - 12); ctx.stroke();
    ctx.fillStyle = A; ctx.beginPath(); ctx.arc((x - 22) * q, y - 12, 9, 0, 7); ctx.fill();
    ctx.globalAlpha = clamp((p - .3) * 2); ctx.font = F(700, ASP === '4:5' ? 30 : 36, UI); ctx.fillStyle = A; const s = label.toUpperCase(); let cx = x;
    for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + 4; } ctx.restore();
  }
  // lines: [[word, accent?], …] per line; each word pops in, exit drops words down
  function headline(lines, t, start = 0, exit = 99, size = L.hs, lh = L.lh, x0 = L.hx, y0 = L.hy, align = 'left') {
    let i = 0; ctx.save(); ctx.font = F(800, size, DISP); ctx.textBaseline = 'alphabetic';
    lines.forEach((line, li) => {
      const words = []; line.forEach((w, k) => { if (typeof w === 'string') words.push([w, line[k + 1] === 1]); });
      const width = words.reduce((a, [w]) => a + ctx.measureText(w + ' ').width, 0); let x = align === 'center' ? x0 - width / 2 : x0;
      words.forEach(([w, acc]) => {
        const p = seg(t, start + i * .09, .45), e = seg(t, exit + i * .03, .25), y = y0 + li * lh;
        if (p > 0 && e < 1) { ctx.save(); ctx.globalAlpha = clamp(p * 2.5) * (1 - e); const s = back(p); ctx.translate(x, y + e * 60); ctx.scale(1, s); ctx.fillStyle = acc ? A : INK; ctx.fillText(w, 0, (1 - s) * 30); ctx.restore(); }
        x += ctx.measureText(w + ' ').width; i++;
      });
    });
    ctx.restore();
  }
  // size headline lines so n lines never run into the stage (tall formats stack headline above the UI)
  function fit(n) { if (ASP === '16:9') { const lh = Math.min(L.lh, 640 / n); return [lh * .95, lh]; } const room = L.stage.y - 50 - (L.hy - L.hs * .78); const lh = Math.min(L.lh, room / n); return [lh * .95, lh]; }
  function stage(fn, opacity = 1) { const s = L.stage; ctx.save(); ctx.globalAlpha *= opacity; ctx.translate(s.x, s.y); ctx.scale(s.s, s.s); fn(); ctx.restore(); }
  // a hand-drawn marker loop, drawn progressively (p 0..1)
  function scribble(cx, cy, rx, ry, p, wob = 0) {
    if (p <= 0) return; ctx.save(); ctx.strokeStyle = A; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); const n = Math.floor(120 * clamp(p));
    for (let i = 0; i <= n; i++) { const a = -2.2 + i / 120 * Math.PI * 2.25, r = 1 + .05 * Math.sin(i * .35 + wob) + i / 120 * .08; const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.stroke(); ctx.restore();
  }

  /* ---------- client UIs (stage coordinates, 760 × 600) ---------- */
  const UIS = {
    tenants(t) {
      rise(seg(t, .2, .5), 40, () => {
        card(10, 0, 560, 230); text('FIND A HOME', 34, 42, { w: 800, s: 16, c: A });
        [['📍  Near Financial District', 34, 64], ['₹  Up to 45,000 / month', 34, 116], ['2 BHK · Family', 34, 168]].forEach(([s, x, y], i) => pop(x + 120, y + 20, seg(t, .5 + i * .18, .5), () => pill(x, y, s, { s: 19 })));
        const pressed = t > 2.0 && t < 2.25; pop(450, 186, seg(t, 1.0, .5), () => { ctx.save(); if (pressed) { ctx.translate(2, 2); } pill(372, 164, 'Find my matches', { s: 18, fill: A, c: WHITE, sh: pressed ? 1 : 4 }); ctx.restore(); });
      });
      const m = (y, p, name, sub, pct, verified) => rise(p, 60, () => {
        card(40, y, 700, 160); houseIcon(64, y + 22, 150, 116); text(name, 240, y + 58, { w: 800, s: 28, f: DISP }); text(sub, 240, y + 94, { w: 500, s: 19, c: '#45536a' });
        if (verified) pill(240, y + 108, '✓ Verified owner', { s: 15, fill: SOFT, sh: 2 });
        const rp = out3(seg(t, 2.5, 1)); ctx.save(); ctx.lineWidth = 12; ctx.strokeStyle = SOFT; ctx.beginPath(); ctx.arc(668, y + 80, 44, 0, 7); ctx.stroke(); ctx.strokeStyle = A; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(668, y + 80, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct / 100 * rp); ctx.stroke(); ctx.restore();
        text(Math.round(pct * rp) + '%', 668, y + 89, { w: 800, s: 24, f: DISP, al: 'center' });
      });
      m(422, seg(t, 2.65, .6), '2BHK · Kondapur', '₹39,500 / month · 3.1 km', 89, false);
      m(262, seg(t, 2.25, .6), '2BHK · Gachibowli', '₹42,000 / month · 1.8 km to office', 94, true);
      pop(560, 590, seg(t, 3.7, .5), () => pill(430, 568, '✓ Visit booked · Sat 11:00', { s: 18, fill: A, c: WHITE }), .2);
      cursorPath(t, [[1.3, 820, 640], [1.95, 520, 200], [2.6, 540, 230], [3.4, 600, 470]], [2.0]);
    },
    buyers(t) {
      rise(seg(t, .2, .5), 40, () => {
        card(20, 0, 400, 560); text('LEGAL CHECK · FLAT 1204', 46, 44, { w: 800, s: 16, c: A });
        ['Title deed', 'RERA registration', 'Encumbrance (EC)', 'Building approvals', 'Society NOC'].forEach((s, i) => { const y = 84 + i * 84; ctx.fillStyle = SOFT; path(46, y, 348, 64, 14); ctx.fill(); text(s, 70, y + 40, { w: 600, s: 21 }); tick(362, y + 32, 18, seg(t, .9 + i * .32, .5)); });
      });
      rise(seg(t, 1.3, .6), 50, () => {
        card(450, 120, 300, 270); text('YOUR COSTS, UPFRONT', 474, 160, { w: 800, s: 15, c: A });
        [['Price', '₹1.20 Cr', 1.5], ['Registration ~6%', '₹7.2 L', 1.8], ['Total', '₹1.27 Cr', 2.2]].forEach(([k, v, at], i) => rise(seg(t, at, .4), 16, () => { const y = 214 + i * 56; if (i === 2) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(474, y - 30); ctx.lineTo(726, y - 30); ctx.stroke(); }
          text(k, 474, y, { w: i === 2 ? 800 : 500, s: 19, c: i === 2 ? INK : '#45536a' }); text(v, 726, y, { w: 800, s: i === 2 ? 26 : 20, f: DISP, al: 'right' }); }));
      });
      const sp = seg(t, 3.1, .45); if (sp > 0) { ctx.save(); const s = lerp(1.7, 1, out3(sp)) + (sp > .9 ? 0 : 0); ctx.globalAlpha = clamp(sp * 3); ctx.translate(230, 500 + Math.sin(sp * 30) * (1 - sp) * 6); ctx.rotate(-.12); ctx.scale(s, s);
        path(-150, -36, 300, 72, 10); ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = A; ctx.stroke(); text('✓ LEGALLY CLEARED', 0, 2, { w: 900, s: 26, c: A, al: 'center', bl: 'middle', f: DISP }); ctx.restore(); }
      pop(600, 470, seg(t, 3.9, .5), () => pill(476, 446, 'Token only after this ✓', { s: 17, fill: A, c: WHITE }));
    },
    owners(t) {
      rise(seg(t, .1, .6), 50, () => {   // phone
        card(30, 0, 300, 600, { r: 44, fill: WHITE }); ctx.fillStyle = '#d7e2f5'; path(130, 16, 100, 22, 11); ctx.fill();
        text('9:41', 180, 120, { w: 800, s: 64, f: DISP, al: 'center' }); text('Friday, 5 December', 180, 152, { w: 500, s: 17, c: '#45536a', al: 'center' });
        [['Rent received · ₹45,000', 'Flat 1204, Kokapet · on time', .8], ['Leak fixed', 'Plumber visited · photo attached', 2.0], ['GHMC tax paid', 'Receipt saved to your documents', 3.2]].forEach(([a, b, at], i) => {
          const p = seg(t, at, .55); rise(p, -40, () => { const y = 196 + i * 112; card(46, y, 268, 96, { r: 18, sh: 4 }); ctx.fillStyle = A; path(62, y + 16, 26, 26, 7); ctx.fill(); text('K', 75, y + 35, { w: 800, s: 16, c: WHITE, al: 'center' }); text('KEETOWN', 98, y + 34, { w: 700, s: 12, c: '#45536a' }); text('now', 298, y + 34, { w: 500, s: 12, c: '#45536a', al: 'right' }); text(a, 62, y + 62, { w: 700, s: 16 }); text(b, 62, y + 82, { w: 500, s: 13, c: '#45536a' }); });
        });
      });
      rise(seg(t, 1.2, .6), 50, () => {
        card(370, 90, 380, 380); text('OWNER STATEMENT · NOVEMBER', 394, 132, { w: 800, s: 15, c: A });
        [['Rent', '₹45,000', 'Paid'], ['Repairs', '−₹1,800', 'Approved'], ['Net to you', '₹43,200', '']].forEach(([k, v, tag], i) => rise(seg(t, 1.5 + i * .3, .4), 14, () => { const y = 182 + i * 54; text(k, 394, y, { w: i === 2 ? 800 : 500, s: 19, c: i === 2 ? INK : '#45536a' }); text(v, 600, y, { w: 800, s: 20, f: DISP, al: 'right' }); if (tag) pill(616, y - 24, tag, { s: 13, fill: tag === 'Paid' ? A : SOFT, c: tag === 'Paid' ? WHITE : INK, sh: 2, pad: 12 }); }));
        bars(394, 350, 330, 100, seg(t, 2.2, 1.4), [.45, .6, .55, .75, .7, .9]);
      });
    },
    builders(t) {
      const drag = io(seg(t, 1.3, .9)), drop = t > 2.2;
      if (!drop) rise(seg(t, .2, .5), 40, () => { ctx.save(); ctx.translate(lerp(0, 430, drag), lerp(0, 60, drag)); ctx.rotate(drag * .05); const s = lerp(1, .55, drag); ctx.scale(s, s);
        card(10, 30, 400, 330); text('inventory.csv', 34, 70, { w: 800, s: 18, f: DISP }); const cols = [['Project', 34], ['Unit', 170], ['BHK', 240], ['Price', 310]];
        cols.forEach(([c, x]) => text(c, x, 108, { w: 700, s: 14, c: A })); for (let r = 0; r < 6; r++) { const y = 140 + r * 34; ctx.fillStyle = r % 2 ? WHITE : SOFT; ctx.fillRect(26, y - 22, 368, 32); [['Lakeview', 34], [`A-${12 + r}0${r % 2 + 1}`, 170], [String(2 + r % 2), 240], [`₹${95 + r * 6} L`, 310]].forEach(([v, x]) => text(v, x, y, { w: 500, s: 15 })); }
        text('… 2,000 rows', 34, 350, { w: 600, s: 14, c: '#45536a' }); ctx.restore(); });
      rise(seg(t, .5, .5), 40, () => {
        card(430, 40, 320, 250, { fill: drop ? WHITE : SOFT, dash: drop ? null : [10, 8] });
        if (!drop) { text('Drop your CSV here', 590, 170, { w: 700, s: 20, al: 'center' }); text('Excel · Google Sheets', 590, 200, { w: 500, s: 15, c: '#45536a', al: 'center' }); }
        else { const p = out3(seg(t, 2.3, 1.1)); text(p < 1 ? 'Checking every row…' : '2,000 units live ✓', 456, 110, { w: 800, s: 20, f: DISP, c: p < 1 ? INK : A }); card(456, 140, 268, 30, { r: 15, sh: 0, lw: 2.5, fill: SOFT }); if (p > 0) card(456, 140, Math.max(30, 268 * p), 30, { r: 15, sh: 0, lw: 2.5, fill: A });
          text(Math.round(2000 * p).toLocaleString('en-IN') + ' / 2,000', 456, 210, { w: 600, s: 16, c: '#45536a' }); if (p >= 1) pop(590, 250, seg(t, 3.45, .4), () => pill(500, 228, 'Re-upload = update', { s: 14, fill: SOFT, sh: 2 })); }
      });
      if (drop) rise(seg(t, 2.5, .5), 40, () => { card(10, 30, 390, 540); text('LIVE ON KEETOWN', 34, 74, { w: 800, s: 15, c: A });
        [['A-1201', '3 BHK', '₹1.10 Cr'], ['A-1202', '2 BHK', '₹82 L'], ['B-0904', '3 BHK', '₹1.04 Cr'], ['B-0905', '2 BHK', '₹79 L'], ['C-1501', '4 BHK', '₹1.62 Cr'], ['C-1502', '3 BHK', '₹1.18 Cr']].forEach(([u, b, pr], i) => pop(34 + (i % 2) * 180 + 82, 100 + Math.floor(i / 2) * 150 + 64, seg(t, 2.75 + i * .14, .45), () => {
          const x = 34 + (i % 2) * 180, y = 100 + Math.floor(i / 2) * 150; card(x, y, 164, 132, { r: 14, sh: 3, lw: 2.5 }); houseIcon(x + 10, y + 10, 144, 56); text(u + ' · ' + b, x + 12, y + 92, { w: 700, s: 14 }); text(pr, x + 12, y + 116, { w: 800, s: 16, f: DISP, c: A }); })); });
      rise(seg(t, 3.6, .6), 50, () => { card(430, 330, 320, 250); text('NEW BUYER ENQUIRIES', 454, 370, { w: 800, s: 15, c: A }); const n = Math.round(24 * out3(seg(t, 3.8, 1.2))); text(String(n), 454, 450, { w: 800, s: 70, f: DISP }); text('verified · this week', 548, 445, { w: 500, s: 16, c: '#45536a' }); bars(454, 470, 270, 90, seg(t, 3.8, 1.2), [.3, .45, .4, .6, .7, .85, 1]); });
      cursorPath(t, [[1.0, 800, 600], [1.3, 200, 200], [2.2, 610, 230], [3.0, 700, 520]], [1.3]);
    },
    companies(t) {
      rise(seg(t, .2, .5), 40, () => { card(10, 0, 350, 170); ctx.fillStyle = SKY; ctx.beginPath(); ctx.arc(64, 60, 30, 0, 7); ctx.fill(); text('P', 64, 70, { w: 800, s: 26, f: DISP, al: 'center' });
        text('Priya · Engineer', 108, 54, { w: 800, s: 21, f: DISP }); text('Bengaluru → Hyderabad', 108, 82, { w: 500, s: 15, c: '#45536a' }); pill(34, 112, 'Allowance ₹45,000', { s: 15, fill: SOFT, sh: 2 }); pill(214, 112, '2 Nov', { s: 15, sh: 2 }); });
      const locked = t > 1.95;
      rise(seg(t, .6, .5), 50, () => { card(10, 200, 350, 380); text('HOMES NEAR THE OFFICE', 34, 240, { w: 800, s: 15, c: A });
        [['0.8 km', '₹42,000'], ['1.6 km', '₹44,500'], ['2.9 km', '₹39,000']].forEach(([d, r], i) => { const y = 262 + i * 100; ctx.fillStyle = i === 0 && locked ? '#dfe9f8' : SOFT; path(30, y, 310, 84, 14); ctx.fill(); houseIcon(42, y + 12, 70, 60); text(d, 126, y + 36, { w: 800, s: 19, f: DISP }); text(r + ' / mo', 126, y + 62, { w: 500, s: 15, c: '#45536a' });
          const lab = i === 0 && locked ? 'Locked ✓' : 'Lock'; pill(250 - (lab.length > 4 ? 26 : 0), y + 22, lab, { s: 14, fill: i === 0 && locked ? A : WHITE, c: i === 0 && locked ? WHITE : INK, sh: 2, pad: 14 }); }); });
      rise(seg(t, 2.35, .55), 50, () => { const ok = t > 3.35; card(390, 40, 360, 200); text('HR APPROVAL', 414, 80, { w: 800, s: 15, c: A }); text('Priya locked a 2BHK', 414, 118, { w: 800, s: 21, f: DISP }); text('0.8 km from office · ₹42,000', 414, 146, { w: 500, s: 15, c: '#45536a' });
        if (!ok) { pill(414, 170, 'Decline', { s: 15, sh: 2 }); pill(530, 170, 'Approve', { s: 15, fill: A, c: WHITE, sh: 3 }); } else pop(520, 190, seg(t, 3.35, .4), () => pill(414, 170, '✓ Approved', { s: 16, fill: OK, c: WHITE })); });
      rise(seg(t, 3.7, .55), 50, () => { card(390, 280, 360, 200); text('RENT FROM ALLOWANCE', 414, 320, { w: 800, s: 15, c: A }); const p = out3(seg(t, 3.9, .9));
        card(414, 346, 312, 40, { r: 20, sh: 0, lw: 2.5, fill: SOFT }); if (p > 0) card(414, 346, Math.max(40, 312 * p), 40, { r: 20, sh: 0, lw: 2.5, fill: A }); text('Company pays ₹42,000', 414, 424, { w: 700, s: 18 }); text('You pay ₹0', 414, 452, { w: 700, s: 18, c: A }); });
      cursorPath(t, [[1.0, 800, 620], [1.9, 300, 300], [2.5, 340, 330], [3.3, 600, 228], [4.0, 680, 520]], [1.95, 3.3]);
    }
  };
  const CLIENT_IDS = ['tenants', 'buyers', 'owners', 'builders', 'companies'];

  /* ---------- scenes ---------- */
  function problem(t) {
    background(t); brandCorner(.9);
    const out = io(seg(t, 5.45, .55));
    const [hs, lh] = fit(2); headline([['Listings'], ['here.']], t, .2, 1.8, hs, lh);
    headline([['Brokers…'], ['everywhere.', 1]], t, 2.35, 5.45, hs, lh);
    const items = [['Is it still available?', 20, 0], ['Owner not picking up', 400, 40], ['Pay the token first?', 0, 330], ['Broker fee = 2 months', 420, 360], ['Are the papers clear?', 40, 440], ['Rent reminder… again', 400, 470], ['Who manages my flat?', 110, 545], ['Photos look fake', 470, 560]];
    stage(() => {
      ctx.save(); ctx.translate(380, 300); ctx.scale(1 - out * .6, 1 - out * .6); ctx.globalAlpha *= 1 - out; ctx.translate(-380, -300);
      [[40, 100, 'r'], [440, 140, 'l']].forEach(([x, y], i) => pop(x + 120, y + 90, seg(t, .3 + i * .3, .5), () => { card(x, y, 250, 190, { r: 18, sh: 5 }); houseIcon(x + 16, y + 16, 218, 100); text(i ? '2BHK · ₹38k?' : '3BHK · call for price', x + 18, y + 150, { w: 700, s: 18 }); text('Posted 4 months ago', x + 18, y + 174, { w: 500, s: 13, c: '#8a94a6' }); }, i ? .1 : -.08));
      items.forEach(([s, x, y], i) => pop(x + 100, y + 20, seg(t, .5 + i * .42, .45), () => bubble(x, y, s, { s: 20 }), (rnd(i) - .5) * .5));
      scribble(390, 300, 395, 320, seg(t, 4.1, .9), 1.3);
      ctx.restore();
    });
  }
  function brand(t) {
    background(t); const c = L.center, s = ASP === '16:9' ? 1 : 1.1, drop = seg(t, 0, .8);
    pop(c.x, c.y - 120 * s, drop, () => { ctx.save(); ctx.translate(c.x, c.y - 120 * s - (1 - out3(drop)) * 260); const r = 110 * s; ctx.shadowColor = 'rgba(30,67,134,.3)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 18; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = WHITE; ctx.fill(); ctx.shadowColor = 'transparent'; if (mark) { const mh = r * 1.15, mw = mh * mark.width / mark.height; ctx.drawImage(mark, -mw / 2, -mh / 2, mw, mh); } ctx.restore(); });
    const name = 'Keetown Realty', n = Math.floor(clamp((t - .7) / .7) * name.length); ctx.font = F(800, 96 * s, DISP); const full = ctx.measureText(name).width;
    text(name.slice(0, n), c.x - full / 2, c.y + 90 * s, { w: 800, s: 96 * s, f: DISP }); if (n < name.length && t > .6 && Math.floor(t * 4) % 2) { ctx.fillStyle = A; ctx.fillRect(c.x - full / 2 + tw(name.slice(0, n), { w: 800, s: 96 * s, f: DISP }) + 6, c.y + 20 * s, 8, 80 * s); }
    rise(seg(t, 1.5, .5), 20, () => { ctx.font = F(700, 46 * s, DISP); const a = 'One team. ', b = 'Every property need.', wa = ctx.measureText(a).width, wb = ctx.measureText(b).width, x = c.x - (wa + wb) / 2;
      text(a, x, c.y + 170 * s, { w: 700, s: 46 * s, f: DISP }); text(b, x + wa, c.y + 170 * s, { w: 700, s: 46 * s, f: DISP, c: A }); });
  }
  function clientScene(sc, t) {
    background(t); brandCorner(); eyebrow(sc.tag, seg(t, .05, .6));
    const swap = 2.9, exitAll = sc.d - .35, ex = io(seg(t, exitAll, .35));
    if (sc.mode === 'replace') { const [hs, lh] = fit(Math.max(sc.h1.length, sc.h2.length)); headline(sc.h1, t, .15, swap, hs, lh); headline(sc.h2, t, swap + .5, exitAll, hs, lh); }
    else { const [hs, lh] = fit(sc.h1.length + sc.h2.length); headline(sc.h1, t, .15, exitAll, hs, lh); headline(sc.h2, t, swap, exitAll, hs, lh, L.hx, L.hy + sc.h1.length * lh); }
    stage(() => { ctx.save(); ctx.translate(0, -ex * 80); ctx.globalAlpha *= 1 - ex; UIS[sc.id](t); ctx.restore(); });
  }
  function house(t) {
    background(t); brandCorner();
    const [h3, l3] = fit(3), [h4, l4] = fit(ASP === '16:9' ? 4 : 3);
    headline([['It', 'all', 'runs'], ['on', 'one'], ['platform.', 1]], t, .1, 2.9, h3, l3);
    headline(ASP === '16:9' ? [['Verified', 'people.'], ['Clear', 'papers.'], ['No', 1], ['surprises.', 1]] : [['Verified', 'people.'], ['Clear', 'papers.'], ['No', 1, 'surprises.', 1]], t, 3.4, 99, h4 * (ASP === '16:9' ? .86 : 1), l4 * (ASP === '16:9' ? .86 : 1));
    stage(() => {
      // one platform: the Keetown mark in the middle, every client connected to it (no house)
      const W2 = 200, H2 = W2 * 600 / 760, cx = 380, cy = 300;
      const slots = [[20, 0, 'tenants', 'Verified. Matched.'], [280, 0, 'buyers', 'Papers first.'], [540, 0, 'owners', 'Rent on time.'],
        [20, 392, 'builders', 'Upload once.'], [280, 392, 'companies', 'Relocate the team.'], [540, 392, 'communities', 'Exclusive desks.']];
      slots.forEach(([x, y, id], i) => {   // connector lines grow out of the centre
        const p = out3(seg(t, .5 + i * .12, .7)); if (p <= 0) return; const top = y === 0, ex = x + W2 / 2, ey = top ? y + H2 + 70 : y - 10;
        ctx.save(); ctx.strokeStyle = 'rgba(47,95,179,.55)'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.setLineDash([2, 10]); ctx.beginPath();
        const mx = lerp(cx, ex, .5), my = lerp(cy, ey, .5) + (top ? -20 : 20); for (let k = 0; k <= 30 * p; k++) { const u = k / 30, x1 = (1 - u) * (1 - u) * cx + 2 * (1 - u) * u * mx + u * u * ex, y1 = (1 - u) * (1 - u) * cy + 2 * (1 - u) * u * my + u * u * ey; k ? ctx.lineTo(x1, y1) : ctx.moveTo(x1, y1); }
        ctx.stroke(); ctx.restore();
        if (p >= 1) { ctx.fillStyle = A; ctx.beginPath(); ctx.arc(ex, ey, 6, 0, 7); ctx.fill(); }
      });
      // soft pulse behind the centre mark
      const pul = (t * .8) % 1; ctx.save(); ctx.globalAlpha = .35 * (1 - pul) * clamp(seg(t, .3, .4)); ctx.fillStyle = SKY; ctx.beginPath(); ctx.arc(cx, cy, 58 + pul * 60, 0, 7); ctx.fill(); ctx.restore();
      pop(cx, cy, seg(t, .2, .6), () => { ctx.shadowColor = 'rgba(30,67,134,.3)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; ctx.beginPath(); ctx.arc(cx, cy, 62, 0, 7); ctx.fillStyle = WHITE; ctx.fill(); ctx.shadowColor = 'transparent'; if (mark) { const h = 72, w = h * mark.width / mark.height; ctx.drawImage(mark, cx - w / 2, cy - h / 2, w, h); } });
      slots.forEach(([x, y, id, label], i) => pop(x + W2 / 2, y + H2 / 2, seg(t, .9 + i * .18, .5), () => {
        card(x, y, W2, H2, { r: 14, sh: 5 }); if (snaps[id]) { ctx.save(); path(x + 4, y + 4, W2 - 8, H2 - 8, 12); ctx.clip(); ctx.drawImage(snaps[id], x + 4, y + 4, W2 - 8, H2 - 8); ctx.restore(); }
        else { ctx.save(); ctx.translate(x + 20, y + 30); [[0, 20], [56, 6], [112, 20]].forEach(([hx, hy]) => houseIcon(hx, hy, 46, 72)); ctx.restore(); }
        const ly = y === 0 ? y + H2 + 26 : y + H2 + 26; text((id === 'communities' ? 'For communities' : SC.find(s => s.id === id).tag).toUpperCase(), x + W2 / 2, ly, { w: 800, s: 12, c: A, al: 'center' });
        text(label, x + W2 / 2, ly + 24, { w: 800, s: 18, f: DISP, al: 'center' }); }, (i % 2 ? .06 : -.06)));
    });
  }
  function end(t) {
    background(t); const c = L.center, s = ASP === '16:9' ? .9 : 1, top = ASP === '16:9' ? c.y - 300 : ASP === '4:5' ? 170 : 330;
    pop(W / 2, top + 50, seg(t, 0, .6), () => { if (logo) { const h = 110 * s, w = h * logoW; ctx.drawImage(logo, W / 2 - w / 2, top, w, h); } });
    headline([['Interested?', 1]], t, .35, 99, 150 * s, 0, W / 2, top + 290 * s, 'center');
    rise(seg(t, .9, .5), 20, () => text('Tell us what you need. We call you back within a working day.', W / 2, top + 362 * s, { w: 600, s: (ASP === '16:9' ? 34 : 30) * s, al: 'center', c: '#45536a' }));
    const chips = ['Rent', 'Buy', 'Sell', 'Property management', 'Build', 'Relocate'], ch = 84 * s, gx = 22, rows = ASP === '16:9' ? [chips] : [chips.slice(0, 3), chips.slice(3)];
    let n = 0; rows.forEach((row, r) => { ctx.font = F(800, 34 * s, DISP); const ws = row.map(l => Math.max(170 * s, ctx.measureText(l).width + 64 * s)), tot = ws.reduce((a, b) => a + b, 0) + gx * (row.length - 1); let x = W / 2 - tot / 2; const y = top + 430 * s + r * (ch + 22);
      row.forEach((label, k) => { const cw = ws[k], i = n++, cx = x; pop(cx + cw / 2, y + ch / 2, seg(t, 1.1 + i * .1, .5), () => { card(cx, y, cw, ch, { r: ch / 2, sh: 5, fill: label === 'Property management' ? '#e2f6ee' : i % 2 ? WHITE : SOFT }); text(label, cx + cw / 2, y + ch / 2 + 2, { w: 800, s: 34 * s, f: DISP, al: 'center', bl: 'middle' }); }, (rnd(i + 3) - .5) * .4); x += cw + gx; }); });
    const ay = ASP === '16:9' ? H - 230 : ASP === '4:5' ? H - 300 : H - 640, bob = Math.abs(Math.sin(t * 4)) * 20, ap = seg(t, 2.0, .5);
    rise(ap, 30, () => {
      ctx.font = F(800, 48 * s, DISP); const a = 'Tap ', b = '“I’m interested”', c2 = ' below', wa = ctx.measureText(a).width, wb = ctx.measureText(b).width, wc = ctx.measureText(c2).width, x = W / 2 - (wa + wb + wc) / 2;
      text(a, x, ay, { w: 800, s: 48 * s, f: DISP }); text(b, x + wa, ay, { w: 800, s: 48 * s, f: DISP, c: A }); text(c2, x + wa + wb, ay, { w: 800, s: 48 * s, f: DISP });
      ctx.save(); ctx.translate(W / 2, ay + 30 + bob); ctx.strokeStyle = A; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 86); ctx.moveTo(-36, 52); ctx.lineTo(0, 88); ctx.lineTo(36, 52); ctx.stroke(); ctx.restore();
      text('or WhatsApp +91 63017 78084', W / 2, ay + 170, { w: 600, s: 28 * s, al: 'center', c: '#45536a' });
    });
  }

  /* ---------- setup + render ---------- */
  const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  async function prepare(canvas, aspect) {
    ASP = aspect; [W, H] = aspect === '16:9' ? [1920, 1080] : aspect === '4:5' ? [1080, 1350] : [1080, 1920]; canvas.width = W; canvas.height = H; ctx = canvas.getContext('2d'); L = layout();
    logo = await load('../assets/brand/logo.svg'); logoW = logo ? logo.width / logo.height : 2.5; mark = await load('../assets/brand/mark.svg');
    if (document.fonts) { await Promise.all(['800 80px Outfit', '700 40px Outfit', '500 20px Inter', '600 20px Inter', '700 20px Inter', '800 20px Inter'].map(f => document.fonts.load(f))); await document.fonts.ready; }
    // still images of each client's finished UI, used when everything assembles inside the house
    const keep = ctx; for (const id of CLIENT_IDS) { const c = document.createElement('canvas'); c.width = 760; c.height = 600; ctx = c.getContext('2d'); ctx.fillStyle = BG; ctx.fillRect(0, 0, 760, 600); UIS[id](5.4); snaps[id] = c; } ctx = keep;
  }
  function render(t) {
    t = clamp(t, 0, DURATION - 1e-3); const sc = SC.find(s => t >= s.t0 && t < s.t0 + s.d), lt = t - sc.t0;
    ctx.save(); ({ problem, brand, house, end }[sc.id] || (l => clientScene(sc, l)))(lt); ctx.restore();
  }
  return { prepare, render, DURATION, SC };
})();
