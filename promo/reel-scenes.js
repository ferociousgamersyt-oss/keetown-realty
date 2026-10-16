/* Keetown trust reel v2 — visual storytelling: objects act out each point, one short caption per scene.
 * Pure function of time. Overrides KP.drawReel / KP.DUR (engine.js) and reuses poster helpers (posters.js). */
(function () {
  const K = KP, A = KAds, H = A.H, C = A.C;
  const { clamp, p, eout, eio, back } = K;
  const { T, tw, rr, lift, unlift, headline, city, pin } = H;
  const W = 1080, HGT = 1920, DUR = 41;
  const io = (t, a, d = .6) => eout(p(t, a, a + d));
  const lerp = (a, b, k) => a + (b - a) * k;
  const SC = [[0, 5.5], [5.5, 11.5], [11.5, 17.5], [17.5, 23], [23, 29], [29, 35.5], [35.5, 41]];
  const NAVY = '#0f2147', BLUE = C.blue, DEEP = C.blue2, TINT = C.tint, LINE = C.line, MIST = C.mist;

  /* ---------------- objects ---------------- */
  const circle = (ctx, x, y, r, fill) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = fill; ctx.fill(); };
  function phone(ctx, x, y, w, h, fn) {
    lift(ctx, .25, 70, 30); rr(ctx, x, y, w, h, 58); ctx.fillStyle = NAVY; ctx.fill(); unlift(ctx);
    const sx = x + 14, sy = y + 14, sw = w - 28, sh = h - 28;
    ctx.save(); rr(ctx, sx, sy, sw, sh, 46); ctx.fillStyle = '#fff'; ctx.fill(); ctx.clip(); fn(ctx, sx, sy, sw, sh); ctx.restore();
    rr(ctx, x + w / 2 - 60, y + 26, 120, 30, 15); ctx.fillStyle = NAVY; ctx.fill();
  }
  function avatar(ctx, x, y, r, k, col = BLUE, bg = '#e3ecfa') {
    if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    lift(ctx, .16, 30, 12); circle(ctx, 0, 0, r, bg); unlift(ctx);
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 4, 0, 7); ctx.clip(); circle(ctx, 0, -r * .2, r * .32, col); ctx.beginPath(); ctx.ellipse(0, r * .78, r * .62, r * .52, 0, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.restore();
    ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); ctx.restore();
  }
  function badge(ctx, x, y, r, k, ok = true) {
    const s = back(k); if (s <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    circle(ctx, 0, 0, r, ok ? BLUE : '#e5484d'); ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.stroke();
    ok ? K.check(ctx, 0, 1, r * .95, clamp(k * 1.5 - .3), '#fff', r * .2) : K.cross(ctx, 0, 0, r * .75, clamp(k * 1.5 - .3), '#fff', r * .2); ctx.restore();
  }
  function doc(ctx, x, y, w, h, title, rot = 0) {
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
    lift(ctx, .15, 34, 14); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(w - 44, 0); ctx.lineTo(w, 44); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill(); unlift(ctx);
    ctx.strokeStyle = LINE; ctx.lineWidth = 2; ctx.stroke(); ctx.beginPath(); ctx.moveTo(w - 44, 0); ctx.lineTo(w - 44, 44); ctx.lineTo(w, 44); ctx.closePath(); ctx.fillStyle = TINT; ctx.fill(); ctx.stroke();
    T(ctx, title, 22, 60, { size: 28, weight: 800 });
    ctx.fillStyle = '#dbe4f2'; for (let i = 0; i < 5; i++) { rr(ctx, 22, 92 + i * 30, (w - 44) * (i % 3 === 2 ? .55 : .9), 12, 6); ctx.fill(); }
    ctx.beginPath(); ctx.arc(54, h - 50, 26, 0, 7); ctx.strokeStyle = 'rgba(54,105,178,.4)'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
  }
  function magnifier(ctx, x, y, r, a = 1) {
    if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y);
    ctx.save(); ctx.rotate(Math.PI / 4); rr(ctx, r * .92, -r * .17, r * 1.15, r * .34, r * .17); ctx.fillStyle = NAVY; ctx.fill(); ctx.restore();
    circle(ctx, 0, 0, r, 'rgba(54,105,178,.14)'); ctx.lineWidth = r * .16; ctx.strokeStyle = NAVY; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * .66, Math.PI * 1.1, Math.PI * 1.45); ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = r * .09; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
  }
  function coin(ctx, x, y, r, spin = 0, a = 1) {
    if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(Math.max(.18, Math.abs(Math.cos(spin))), 1);
    lift(ctx, .2, 14, 6); circle(ctx, 0, 0, r, BLUE); unlift(ctx); ctx.beginPath(); ctx.arc(0, 0, r * .78, 0, 7); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = r * .09; ctx.stroke();
    T(ctx, '₹', 0, r * .37, { size: r * 1.05, weight: 800, color: '#fff', align: 'center' }); ctx.restore();
  }
  function padlock(ctx, x, y, s, open) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineWidth = 16; ctx.strokeStyle = open > .5 ? BLUE : NAVY; ctx.lineCap = 'round';
    ctx.save(); ctx.translate(0, -open * 38); ctx.beginPath(); ctx.moveTo(-30, -10); ctx.lineTo(-30, -48); ctx.arc(0, -48, 30, Math.PI, 0); ctx.lineTo(30, -10 + open * 30); ctx.stroke(); ctx.restore();
    lift(ctx, .2, 24, 10); rr(ctx, -58, -22, 116, 96, 20); ctx.fillStyle = open > .5 ? BLUE : NAVY; ctx.fill(); unlift(ctx);
    circle(ctx, 0, 18, 11, '#fff'); rr(ctx, -5, 20, 10, 26, 5); ctx.fill(); ctx.restore();
  }
  function wallet(ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); lift(ctx, .2, 30, 12); rr(ctx, -90, -62, 180, 124, 24); ctx.fillStyle = DEEP; ctx.fill(); unlift(ctx);
    rr(ctx, 18, -28, 84, 56, 18); ctx.fillStyle = BLUE; ctx.fill(); circle(ctx, 46, 0, 10, '#fff'); ctx.restore();
  }
  function house(ctx, x, y, s, glow = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (glow > 0) { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 220); g.addColorStop(0, `rgba(54,105,178,${.25 * glow})`); g.addColorStop(1, 'rgba(54,105,178,0)'); ctx.fillStyle = g; ctx.fillRect(-240, -240, 480, 480); }
    lift(ctx, .18, 30, 12); ctx.fillStyle = '#fff'; ctx.fillRect(-82, -16, 164, 110); unlift(ctx); ctx.strokeStyle = LINE; ctx.lineWidth = 3; ctx.strokeRect(-82, -16, 164, 110);
    ctx.beginPath(); ctx.moveTo(-104, -8); ctx.lineTo(0, -104); ctx.lineTo(104, -8); ctx.closePath(); ctx.fillStyle = DEEP; ctx.fill();
    rr(ctx, -22, 22, 44, 72, 8); ctx.fillStyle = BLUE; ctx.fill(); ctx.fillStyle = '#cfe0f7'; rr(ctx, -66, 6, 32, 32, 5); ctx.fill(); rr(ctx, 34, 6, 32, 32, 5); ctx.fill(); ctx.restore();
  }
  function cloud(ctx, x, y, s, col) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = col; [[-100, 20, 62], [-30, -26, 84], [64, 0, 72], [10, 34, 70], [120, 34, 50]].forEach(([cx, cy, r]) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); }); ctx.restore(); }
  function sun(ctx, x, y, r, rot, k) {
    if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(rot); ctx.strokeStyle = BLUE; ctx.lineWidth = 8; ctx.lineCap = 'round';
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3); ctx.lineTo(Math.cos(a) * r * 1.6, Math.sin(a) * r * 1.6); ctx.stroke(); }
    lift(ctx, .12, 30, 0); circle(ctx, 0, 0, r, '#fff'); unlift(ctx); ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); ctx.restore();
  }
  function globe(ctx, x, y, r, rot, k) {
    if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    lift(ctx, .16, 40, 14); circle(ctx, 0, 0, r, '#fff'); unlift(ctx);
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.clip(); ctx.strokeStyle = 'rgba(54,105,178,.55)'; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) { const ph = rot + i * Math.PI / 4; ctx.beginPath(); ctx.ellipse(0, 0, Math.abs(Math.sin(ph)) * r, r, 0, 0, 7); ctx.stroke(); }
    [-.5, 0, .5].forEach(f => { ctx.beginPath(); ctx.moveTo(-r, f * r); ctx.lineTo(r, f * r); ctx.stroke(); });
    ctx.fillStyle = 'rgba(54,105,178,.25)'; ctx.beginPath(); ctx.ellipse(Math.sin(rot) * r * .4, -r * .2, r * .35, r * .22, .4, 0, 7); ctx.fill(); ctx.restore();
    ctx.lineWidth = 6; ctx.strokeStyle = BLUE; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
    const a = rot * 2.2, px = Math.cos(a) * r * 1.35, py = Math.sin(a) * r * .45 - r * .2; // plane orbit
    ctx.save(); ctx.translate(px, py); ctx.rotate(a + Math.PI / 2 + .3); ctx.fillStyle = DEEP; ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(6, 6); ctx.lineTo(22, 12); ctx.lineTo(6, 14); ctx.lineTo(4, 24); ctx.lineTo(-4, 24); ctx.lineTo(-6, 14); ctx.lineTo(-22, 12); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.restore();
  }
  function camera(ctx, x, y, s, flash) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    lift(ctx, .22, 30, 12); rr(ctx, -92, -60, 184, 124, 24); ctx.fillStyle = NAVY; ctx.fill(); unlift(ctx); rr(ctx, -50, -80, 64, 28, 8); ctx.fill();
    circle(ctx, 0, 2, 42, BLUE); circle(ctx, 0, 2, 26, '#9dbbe6'); circle(ctx, 8, -6, 7, '#fff'); circle(ctx, 62, -34, 9, '#fff');
    if (flash > 0) { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 260); g.addColorStop(0, `rgba(255,255,255,${flash})`); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(-260, -260, 520, 520); }
    ctx.restore();
  }
  function polaroid(ctx, x, y, w, rot, a, v = 0) {
    if (a <= 0) return; const h = w * 1.18; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot);
    lift(ctx, .18, 22, 8); rr(ctx, -w / 2, -h / 2, w, h, 6); ctx.fillStyle = '#fff'; ctx.fill(); unlift(ctx);
    const ix = -w / 2 + 10, iy = -h / 2 + 10, iw = w - 20; ctx.fillStyle = '#dbe7fb'; ctx.fillRect(ix, iy, iw, iw);
    ctx.fillStyle = BLUE; if (v === 0) { rr(ctx, ix + iw * .15, iy + iw * .55, iw * .7, iw * .25, 8); ctx.fill(); } else if (v === 1) { ctx.fillRect(ix + iw * .3, iy + iw * .2, iw * .4, iw * .5); } else { circle(ctx, ix + iw * .5, iy + iw * .45, iw * .2, BLUE); }
    T(ctx, '✓', w / 2 - 20, h / 2 - 12, { size: 22, weight: 800, color: BLUE, align: 'center' }); ctx.restore();
  }
  function key(ctx, x, y, s, rot, a = 1) {
    if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.strokeStyle = DEEP; ctx.lineWidth = 12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-52, 0, 26, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(64, 0); ctx.moveTo(42, 0); ctx.lineTo(42, 22); ctx.moveTo(60, 0); ctx.lineTo(60, 16); ctx.stroke(); ctx.restore();
  }
  function pen(ctx, x, y, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); rr(ctx, -10, -150, 20, 130, 8); ctx.fillStyle = NAVY; ctx.fill(); ctx.beginPath(); ctx.moveTo(-10, -20); ctx.lineTo(10, -20); ctx.lineTo(0, 0); ctx.closePath(); ctx.fillStyle = BLUE; ctx.fill(); ctx.restore(); }
  function drop(ctx, x, y, s, col) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(0, -22); ctx.bezierCurveTo(12, -6, 16, 2, 16, 8); ctx.arc(0, 8, 16, 0, Math.PI); ctx.bezierCurveTo(-16, 2, -12, -6, 0, -22); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.restore(); }
  function wrench(ctx, x, y, s, col) { ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 4); ctx.scale(s, s); ctx.fillStyle = col; rr(ctx, -7, -4, 14, 40, 7); ctx.fill(); ctx.beginPath(); ctx.arc(0, -14, 15, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-5, -32, 10, 16); ctx.restore(); }
  function bubble(ctx, x, y, w, h, out, fill, k) {
    const s = back(k); if (s <= 0) return; ctx.save(); ctx.translate(out ? x + w : x, y + h); ctx.scale(s, s); ctx.translate(out ? -w : 0, -h);
    lift(ctx, .1, 16, 6); rr(ctx, 0, 0, w, h, 26); ctx.fillStyle = fill; ctx.fill(); unlift(ctx);
    ctx.beginPath(); if (out) { ctx.moveTo(w - 30, h - 2); ctx.lineTo(w + 10, h + 8); ctx.lineTo(w - 6, h - 26); } else { ctx.moveTo(30, h - 2); ctx.lineTo(-10, h + 8); ctx.lineTo(6, h - 26); } ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function qBubble(ctx, x, y, k, t, ph, mark = '?') {
    const s = back(k); if (s <= 0) return; const fy = Math.sin(t * 2 + ph) * 8; ctx.save(); ctx.translate(x, y + fy); ctx.scale(s, s);
    lift(ctx, .16, 24, 10); rr(ctx, -56, -56, 112, 100, 28); ctx.fillStyle = '#fff'; ctx.fill(); unlift(ctx); ctx.beginPath(); ctx.moveTo(-12, 42); ctx.lineTo(0, 66); ctx.lineTo(14, 42); ctx.closePath(); ctx.fill();
    T(ctx, mark, 0, 22, { size: 68, weight: 800, color: BLUE, align: 'center' }); ctx.restore();
  }
  const shadow = (ctx, x, y, rx, ry, a = .14) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 7); ctx.fillStyle = `rgba(15,33,71,${a})`; ctx.fill(); };
  const cap = (ctx, lines, lt) => K.noCaption ? 0 : headline(ctx, lines, 64, 200, 92, lt, .15);

  /* ---------------- scenes ---------------- */
  const S = [];
  // 1 — the search: confusion → Keetown pins the right home
  S.push((ctx, lt) => {
    cap(ctx, [[['Finding a home in']], [['Hyderabad?', 1]]], lt);
    const at = city(ctx, 560, 1580, 1.2, lt, .3, { seed: 7, pin: false }) || [560, 1000];
    K.charminar(ctx, 60, 1720, 230, io(lt, .9));
    [[300, 930, 1.2, 0], [560, 780, 1.45, 1.4], [820, 960, 1.7, 2.8]].forEach(([x, y, t0, ph]) => qBubble(ctx, x, y, p(lt, t0, t0 + .45) * (1 - p(lt, 3.3, 3.6)), lt, ph));
    const km = io(lt, 1.6, .3) * (1 - io(lt, 3.5, .3)), sweep = eio(p(lt, 1.6, 3.4));
    magnifier(ctx, lerp(240, 860, sweep), 1130 + Math.sin(sweep * Math.PI * 2) * 60, 92, km);
    const kd = p(lt, 3.6, 4.1); if (kd > 0) { const y = at[1] - 14 - (1 - eout(kd)) * 420; if (kd >= 1) { const rp = p(lt, 4.1, 5); ctx.beginPath(); ctx.ellipse(at[0], at[1] - 6, 30 + rp * 120, 10 + rp * 40, 0, 0, 7); ctx.strokeStyle = `rgba(54,105,178,${.6 * (1 - rp)})`; ctx.lineWidth = 4; ctx.stroke(); } pin(ctx, at[0], y, 2.6); }
    qBubble(ctx, at[0] + 120, at[1] - 210, p(lt, 4.2, 4.7), lt, 0, '✓');
  });
  // 2 — every person verified: OTP login, ID scan, avatars ticked, fake rejected
  S.push((ctx, lt) => {
    cap(ctx, [[['Every person']], [['verified.', 1]]], lt);
    const kp = eout(p(lt, .1, .8)), px = 330, py = 600 + (1 - kp) * 340;
    ctx.save(); ctx.globalAlpha *= kp;
    phone(ctx, px, py, 420, 780, (c, x, y, w, h) => {
      const ka = eio(p(lt, 2.4, 2.8));
      c.save(); c.translate(-ka * w, 0);
      rr(c, x + 28, y + 70, 90, 90, 22); c.fillStyle = TINT; c.fill(); avatar(c, x + 73, y + 115, 34, 1);
      T(c, 'Log in', x + 136, y + 128, { size: 36, weight: 800 });
      rr(c, x + 28, y + 196, w - 56, 76, 16); c.strokeStyle = LINE; c.lineWidth = 3; c.stroke(); T(c, '+91', x + 50, y + 245, { size: 28, weight: 700, color: MIST });
      const nd = Math.floor(clamp(p(lt, .8, 1.6)) * 10); T(c, '9876543210'.slice(0, nd), x + 112, y + 246, { size: 30, weight: 700, ls: 2 });
      const bw = (w - 56 - 50) / 6; for (let i = 0; i < 6; i++) { const bx = x + 28 + i * (bw + 10), on = lt > 1.75 + i * .08; rr(c, bx, y + 300, bw, 84, 14); c.strokeStyle = on ? BLUE : LINE; c.lineWidth = 3; c.stroke(); if (on) circle(c, bx + bw / 2, y + 342, 9, NAVY); }
      const pr = 1 - .06 * Math.sin(clamp(p(lt, 2.15, 2.4)) * Math.PI); c.save(); c.translate(x + w / 2, y + 456); c.scale(pr, pr); rr(c, -(w - 56) / 2, -38, w - 56, 76, 38); c.fillStyle = BLUE; c.fill(); T(c, 'Verify', 0, 11, { size: 30, weight: 700, color: '#fff', align: 'center' }); c.restore();
      c.restore();
      const kb = eout(p(lt, 2.45, 2.95)); c.save(); c.translate((1 - kb) * w, 0);
      const cx = x + 28, cy = y + 90, cw = w - 56, ch = 250; lift(c, .14, 24, 8); rr(c, cx, cy, cw, ch, 22); c.fillStyle = '#f3f7fd'; c.fill(); unlift(c); c.strokeStyle = LINE; c.lineWidth = 2; c.stroke();
      rr(c, cx, cy, cw, 50, 22); c.fillStyle = DEEP; c.fill(); c.fillRect(cx, cy + 30, cw, 20); rr(c, cx + 22, cy + 72, 110, 140, 14); c.fillStyle = '#d6e3f6'; c.fill(); avatar(c, cx + 77, cy + 142, 44, 1);
      c.fillStyle = '#c9d6ea'; [0, 1, 2, 3].forEach(i => { rr(c, cx + 154, cy + 86 + i * 34, i === 0 ? 150 : 200 - i * 30, 14, 7); c.fill(); });
      const ss = p(lt, 3.0, 3.8); if (ss > 0 && ss < 1) { const ly = cy + 50 + ss * (ch - 50); const g = c.createLinearGradient(0, ly - 30, 0, ly); g.addColorStop(0, 'rgba(54,105,178,0)'); g.addColorStop(1, 'rgba(54,105,178,.35)'); c.fillStyle = g; c.fillRect(cx, ly - 30, cw, 30); c.fillStyle = BLUE; c.fillRect(cx, ly - 3, cw, 4); }
      const ks = p(lt, 3.8, 4.3); if (ks > 0) { c.save(); c.translate(x + w / 2, y + 520); const sc = back(ks); c.scale(sc, sc); c.beginPath(); c.moveTo(0, -96); c.lineTo(82, -64); c.lineTo(82, 4); c.quadraticCurveTo(82, 70, 0, 102); c.quadraticCurveTo(-82, 70, -82, 4); c.lineTo(-82, -64); c.closePath(); c.fillStyle = BLUE; c.fill(); K.check(c, 0, 4, 64, p(lt, 4.0, 4.4), '#fff', 13); c.restore(); }
      c.restore();
    });
    ctx.restore();
    [['Tenant', 190], ['Owner', 410], ['Seller', 630]].forEach(([l, x], i) => { const k = back(p(lt, 4.2 + i * .15, 4.7 + i * .15)); avatar(ctx, x, 1600, 80, k); badge(ctx, x + 58, 1546, 30, p(lt, 4.6 + i * .2, 5.0 + i * .2)); T(ctx, l, x, 1730, { size: 30, weight: 700, align: 'center', alpha: clamp(k) }); });
    const kf = back(p(lt, 4.3, 4.8)), fall = eio(p(lt, 5.25, 5.95)); if (kf > 0) { ctx.save(); ctx.globalAlpha *= 1 - fall; ctx.translate(880, 1600 + fall * 300); ctx.rotate(fall * .9); avatar(ctx, 0, 0, 80, kf, '#9aa6b8', '#eceff4'); qBubble(ctx, 0, -6, kf * .9, 0, 0); badge(ctx, 58, -54, 30, p(lt, 4.8, 5.2), false); ctx.restore(); }
  });
  // 3 — papers checked before money moves
  S.push((ctx, lt) => {
    cap(ctx, [[['Papers checked']], [['before you ', 0], ['pay.', 1]]], lt);
    const docs = ['Title deed', 'RERA', 'HMDA', 'EC'], dx = i => 40 + i * 255, dy = 620;
    docs.forEach((d, i) => { const k = back(p(lt, .3 + i * .12, .9 + i * .12)); if (k <= 0) return; ctx.save(); ctx.globalAlpha *= clamp(k); ctx.translate(0, (1 - k) * 400); doc(ctx, dx(i), dy, 220, 300, d, (-6 + i * 4) * (1 - k) * Math.PI / 180 + (i % 2 ? .025 : -.025)); ctx.restore(); badge(ctx, dx(i) + 190, dy + 270, 38, p(lt, 1.95 + i * .6, 2.35 + i * .6)); });
    const ms = p(lt, 1.4, 4.0) * 4, mi = Math.min(3, Math.floor(ms)), mf = ms - mi; const mx = dx(mi) + 110 + (mi < 3 ? eio(clamp((mf - .7) / .3)) * 255 : 0), my = dy + 160 + Math.sin(mf * Math.PI * 2) * 40;
    magnifier(ctx, mx, my, 86, io(lt, 1.2, .3) * (1 - io(lt, 4.1, .3)));
    // payment lane: wallet → lock → house
    const ly = 1340; ctx.save(); ctx.setLineDash([4, 18]); ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(54,105,178,.5)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(230, ly); ctx.lineTo(780, ly); ctx.stroke(); ctx.restore();
    const kl = io(lt, .6); ctx.save(); ctx.globalAlpha *= kl; wallet(ctx, 150, ly, 1.2); house(ctx, 890, ly + 10, 1.3, io(lt, 5.2, .5)); ctx.restore();
    const open = eio(p(lt, 4.3, 4.7)); ctx.save(); ctx.globalAlpha *= kl; padlock(ctx, 520, ly + 6, 1.4, open); ctx.restore();
    const bt = p(lt, 1.0, 1.9); if (bt > 0 && bt < 1) { const f = bt < .55 ? eio(bt / .55) : 1 - eout((bt - .55) / .45); coin(ctx, 240 + f * 200, ly - 20 - Math.sin(Math.min(1, bt / .55) * Math.PI) * 50, 38, bt * 9); }
    for (let i = 0; i < 3; i++) { const c = p(lt, 4.6 + i * .2, 5.4 + i * .2); if (c <= 0) continue; const f = eio(c); coin(ctx, lerp(240, 860, f), ly - 30 - Math.sin(f * Math.PI) * 170, 38, f * 12, 1 - p(c, .92, 1)); }
  });
  // 4 — investors: monthly rent fills the jar while value climbs
  S.push((ctx, lt) => {
    cap(ctx, [[['Rent in.']], [['Value ', 0], ['up.', 1]]], lt);
    const kc = eio(p(lt, .4, 3.6)), x0 = 90, x1 = 990, pts = [[0, 0], [.12, .08], [.22, .05], [.35, .2], [.48, .18], [.6, .36], [.72, .33], [.84, .56], [1, .78]], gy0 = 1330, gh = 560;
    ctx.strokeStyle = 'rgba(15,33,71,.07)'; ctx.lineWidth = 2; for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(x0, gy0 - i * gh / 4); ctx.lineTo(x1, gy0 - i * gh / 4); ctx.stroke(); }
    const XY = q => [lerp(x0, x1, q[0]), gy0 - q[1] * gh], path = []; for (let i = 0; i < pts.length; i++) { if (pts[i][0] <= kc) path.push(XY(pts[i])); else { const a = pts[i - 1], b = pts[i], f = (kc - a[0]) / (b[0] - a[0]); path.push(XY([kc, a[1] + (b[1] - a[1]) * f])); break; } }
    if (path.length > 1) { ctx.beginPath(); path.forEach((q, i) => i ? ctx.lineTo(...q) : ctx.moveTo(...q)); ctx.lineTo(path.at(-1)[0], gy0); ctx.lineTo(x0, gy0); ctx.closePath(); const g = ctx.createLinearGradient(0, gy0 - gh, 0, gy0); g.addColorStop(0, 'rgba(54,105,178,.22)'); g.addColorStop(1, 'rgba(54,105,178,0)'); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); path.forEach((q, i) => i ? ctx.lineTo(...q) : ctx.moveTo(...q)); ctx.strokeStyle = BLUE; ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
      const e = path.at(-1), e2 = path.at(-2), ang = Math.atan2(e[1] - e2[1], e[0] - e2[0]); ctx.save(); ctx.translate(...e); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(26, 0); ctx.lineTo(-10, -18); ctx.lineTo(-10, 18); ctx.closePath(); ctx.fillStyle = BLUE; ctx.fill(); ctx.restore(); }
    const kb = eout(p(lt, .3, 1.2)); shadow(ctx, 300, 1640, 200, 40); K.isoBox(ctx, 290, 1650, 200, 150, 520 * kb, 1, lt, 3);
    const jx = 790, jy = 1360, jw = 230, jh = 300, arrived = Math.floor(clamp((lt - 1.2 - .55) / .32 + 1, 0, 10));
    ctx.save(); ctx.globalAlpha *= io(lt, .8); lift(ctx, .12, 30, 10); rr(ctx, jx - jw / 2, jy, jw, jh, 34); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fill(); unlift(ctx);
    for (let i = 0; i < arrived; i++) { ctx.beginPath(); ctx.ellipse(jx, jy + jh - 26 - i * 24, jw / 2 - 26, 16, 0, 0, 7); ctx.fillStyle = i % 2 ? BLUE : DEEP; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.stroke(); }
    rr(ctx, jx - jw / 2, jy, jw, jh, 34); ctx.strokeStyle = BLUE; ctx.lineWidth = 6; ctx.stroke(); rr(ctx, jx - jw / 2 - 12, jy - 26, jw + 24, 36, 12); ctx.fillStyle = DEEP; ctx.fill(); ctx.restore();
    for (let i = 0; i < 10; i++) { const c = p(lt, 1.2 + i * .32, 1.75 + i * .32); if (c <= 0 || c >= 1) continue; const f = eio(c); coin(ctx, lerp(380, jx, f), lerp(980, jy - 40, f) - Math.sin(f * Math.PI) * 260, 34, f * 10); }
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'], kcal = back(p(lt, .9, 1.4));
    if (kcal > 0) { ctx.save(); ctx.translate(jx + 120, jy - 190); ctx.scale(kcal, kcal); lift(ctx, .16, 24, 10); rr(ctx, -70, -70, 140, 140, 22); ctx.fillStyle = '#fff'; ctx.fill(); unlift(ctx); rr(ctx, -70, -70, 140, 44, 22); ctx.fillStyle = BLUE; ctx.fill(); ctx.fillRect(-70, -40, 140, 14);
      T(ctx, months[Math.min(11, arrived)], 0, -38, { size: 24, weight: 800, color: '#fff', align: 'center', ls: 2 }); T(ctx, String(arrived ? 1 : 1), 0, 46, { size: 58, weight: 800, align: 'center' }); ctx.restore(); }
  });
  // 5 — tenants: sign, key, door opens, condition photos
  S.push((ctx, lt) => {
    cap(ctx, [[['Move in,']], [['worry-free.', 1]]], lt);
    const fx = 470, fy = 650, fw = 440, fh = 760, kf = io(lt, .2);
    ctx.save(); ctx.globalAlpha *= kf;
    lift(ctx, .16, 40, 16); rr(ctx, fx - 26, fy - 26, fw + 52, fh + 26, 18); ctx.fillStyle = DEEP; ctx.fill(); unlift(ctx);
    const g = ctx.createLinearGradient(0, fy, 0, fy + fh); g.addColorStop(0, '#f3f8ff'); g.addColorStop(1, '#d6e4fa'); ctx.fillStyle = g; ctx.fillRect(fx, fy, fw, fh);
    rr(ctx, fx + 60, fy + 470, 320, 120, 28); ctx.fillStyle = BLUE; ctx.fill(); rr(ctx, fx + 40, fy + 430, 70, 170, 26); ctx.fill(); rr(ctx, fx + 330, fy + 430, 70, 170, 26); ctx.fill();
    ctx.fillStyle = 'rgba(54,105,178,.35)'; rr(ctx, fx + 120, fy + 120, 200, 150, 10); ctx.fill(); circle(ctx, fx + 380, fy + 360, 34, 'rgba(15,118,110,.0)');
    ctx.fillStyle = DEEP; ctx.fillRect(fx + 380, fy + 330, 8, 100); circle(ctx, fx + 384, fy + 320, 36, '#7fa6e3');
    const ang = eio(p(lt, 2.95, 3.75)) * 1.25, dw = fw * Math.cos(ang), sk = Math.sin(ang) * 46;
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + dw, fy - sk); ctx.lineTo(fx + dw, fy + fh + sk); ctx.lineTo(fx, fy + fh); ctx.closePath(); const dg = ctx.createLinearGradient(fx, 0, fx + fw, 0); dg.addColorStop(0, BLUE); dg.addColorStop(1, DEEP); ctx.fillStyle = dg; ctx.fill();
    if (dw > 60) { ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 4; ctx.strokeRect(fx + dw * .12, fy + 80 - sk * .4, dw * .76, 260); ctx.strokeRect(fx + dw * .12, fy + 400 - sk * .1, dw * .76, 280); circle(ctx, fx + dw - 44, fy + fh / 2, 16, '#fff'); }
    ctx.restore();
    // agreement + pen
    const ka = back(p(lt, .4, 1.0)); if (ka > 0) { ctx.save(); ctx.globalAlpha *= clamp(ka); ctx.translate(60 - (1 - ka) * 300, 1260); ctx.rotate(-.05);
      lift(ctx, .16, 30, 12); rr(ctx, 0, 0, 340, 430, 14); ctx.fillStyle = '#fff'; ctx.fill(); unlift(ctx); T(ctx, 'Agreement', 28, 62, { size: 30, weight: 800 }); ctx.fillStyle = '#dbe4f2'; for (let i = 0; i < 6; i++) { rr(ctx, 28, 92 + i * 30, i % 3 === 2 ? 170 : 284, 12, 6); ctx.fill(); }
      ctx.strokeStyle = LINE; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(28, 360); ctx.lineTo(312, 360); ctx.stroke();
      const ks = p(lt, 1.1, 2.0); ctx.beginPath(); for (let i = 0; i <= 60 * ks; i++) { const sx = 40 + i * 4, sy = 340 + Math.sin(i * .45) * 14 * Math.sin(i * .07); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); } ctx.strokeStyle = NAVY; ctx.lineWidth = 4; ctx.stroke();
      if (ks > 0 && ks < 1) pen(ctx, 40 + 60 * ks * 4, 340 + Math.sin(60 * ks * .45) * 14 * Math.sin(60 * ks * .07), .5);
      badge(ctx, 300, 50, 32, p(lt, 2.05, 2.45)); ctx.restore(); }
    // key flies to the lock and turns
    const kk = eio(p(lt, 2.2, 2.75)), ktn = eio(p(lt, 2.75, 3.0)), kx = lerp(250, fx + fw - 44, kk), ky = lerp(1280, fy + fh / 2, kk) - Math.sin(kk * Math.PI) * 160;
    key(ctx, kx, ky, 1, kk * Math.PI * 1.5 + ktn * Math.PI / 2, io(lt, 2.15, .2) * (1 - io(lt, 3.0, .3)));
    // condition-report photos
    const cam = io(lt, 3.6, .4); ctx.save(); ctx.globalAlpha *= cam; camera(ctx, 640, 1620, .95, [3.95, 4.45, 4.95].reduce((m, f) => Math.max(m, 1 - clamp(Math.abs(lt - f) / .14)), 0)); ctx.restore();
    [0, 1, 2].forEach(i => { const c = eout(p(lt, 4.0 + i * .5, 4.45 + i * .5)); polaroid(ctx, lerp(640, 860 + i * 60, c), lerp(1600, 1540 + i * 70, c), 120, (-.12 + i * .12) * c, c, i); });
  });
  // 6 — management: monsoon handled, rent and statements reach owners abroad, bills ticked
  S.push((ctx, lt) => {
    cap(ctx, [[['We look after it.']], [['Rain or ', 0], ['shine.', 1]]], lt);
    const bx = 470, by = 1560, kb = eout(p(lt, .1, .8)); shadow(ctx, 520, by - 10, 260, 50); K.isoBox(ctx, bx, by, 240, 190, 470 * kb, 1, lt, 5);
    const cin = eio(p(lt, .3, 1.0)), cout = eio(p(lt, 2.8, 3.4)), cx = lerp(-300, 500, cin) + cout * 900;
    const rain = p(lt, .9, 1.1) * (1 - p(lt, 2.8, 3.0)), dome = eout(p(lt, 1.5, 2.0)) * (1 - p(lt, 4.6, 5.2)), dcx = 500, dcy = by + 10, rx = 350, ry = 760 * dome;
    if (rain > 0) { ctx.save(); ctx.globalAlpha *= rain; ctx.strokeStyle = 'rgba(54,105,178,.75)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let j = 0; j < 46; j++) { const x = cx - 260 + (j * 53) % 560, y = 760 + ((lt * 1100 + j * 97) % 900), dx = (x - dcx) / rx, yDome = Math.abs(dx) < 1 && dome > 0 ? dcy - ry * Math.sqrt(1 - dx * dx) : 9999, yEnd = Math.min(1700, yDome);
        if (y < yEnd) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 34); ctx.stroke(); } else if (y < yEnd + 40) { ctx.beginPath(); ctx.arc(x, yEnd, 12 * (y - yEnd) / 40 + 2, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); } }
      ctx.restore(); }
    if (dome > 0) { ctx.save(); ctx.beginPath(); ctx.ellipse(dcx, dcy, rx * (.6 + .4 * dome), ry, 0, Math.PI, 0); ctx.fillStyle = 'rgba(54,105,178,.10)'; ctx.fill(); ctx.strokeStyle = 'rgba(54,105,178,.7)'; ctx.lineWidth = 5; ctx.stroke(); ctx.restore(); }
    cloud(ctx, cx, 700, 1.25, '#9fb2d1');
    const kw = back(p(lt, 2.2, 2.6)); if (kw > 0) { ctx.save(); ctx.translate(620, 1040); ctx.scale(kw, kw); lift(ctx, .2, 20, 8); circle(ctx, 0, 0, 52, '#fff'); unlift(ctx); wrench(ctx, 0, 0, 1.6, BLUE); ctx.restore(); badge(ctx, 660, 1000, 24, p(lt, 2.6, 3.0)); }
    sun(ctx, 860, 640, 56, lt * .6, back(p(lt, 3.0, 3.5)));
    globe(ctx, 860, 1030, 110, lt * .8, back(p(lt, 3.3, 3.8)));
    for (let i = 0; i < 4; i++) { const c = p(lt, 3.7 + i * .3, 4.5 + i * .3); if (c <= 0 || c >= 1) continue; const f = eio(c), x = lerp(560, 840, f), y = lerp(1120, 1040, f) - Math.sin(f * Math.PI) * 220; if (i === 2) { ctx.save(); ctx.translate(x, y); ctx.rotate(f * .6); lift(ctx, .16, 14, 6); rr(ctx, -30, -38, 60, 76, 8); ctx.fillStyle = '#fff'; ctx.fill(); unlift(ctx); ctx.fillStyle = '#c9d6ea'; for (let r = 0; r < 4; r++) ctx.fillRect(-20, -26 + r * 14, r === 3 ? 22 : 40, 6); ctx.restore(); } else coin(ctx, x, y, 32, f * 10); }
    [['drop', 330], ['bolt', 540], ['tax', 750]].forEach(([ic, x], i) => { const k = back(p(lt, 4.2 + i * .25, 4.65 + i * .25)); if (k <= 0) return; ctx.save(); ctx.translate(x, 1745); ctx.scale(k, k); lift(ctx, .16, 20, 8); circle(ctx, 0, 0, 58, '#fff'); unlift(ctx); if (ic === 'drop') drop(ctx, 0, 0, 1.4, BLUE); else K.icon(ctx, ic, 0, 0, 60, BLUE, lt); ctx.restore(); badge(ctx, x + 44, 1700, 22, p(lt, 4.55 + i * .25, 4.9 + i * .25)); });
  });
  // 7 — call to action: a real conversation
  S.push((ctx, lt) => {
    const kl = back(p(lt, .1, .7)); ctx.save(); ctx.translate(540, 300); ctx.scale(.85 + .15 * clamp(kl), .85 + .15 * clamp(kl)); K.brandLogo(ctx, 0, -95, 190, clamp(kl), false, 'center'); ctx.restore();
    const kp = eout(p(lt, .3, 1.0)); ctx.save(); ctx.globalAlpha *= kp; ctx.translate(0, (1 - kp) * 300);
    phone(ctx, 300, 470, 480, 860, (c, x, y, w, h) => {
      c.fillStyle = '#eef3fa'; c.fillRect(x, y, w, h); c.fillStyle = DEEP; c.fillRect(x, y, w, 120); avatar(c, x + 60, y + 72, 30, 1, BLUE, '#fff'); T(c, 'Keetown Realty', x + 106, y + 70, { size: 26, weight: 700, color: '#fff' }); T(c, 'online', x + 106, y + 98, { size: 18, weight: 500, color: '#c9d8f0' });
      const b1 = p(lt, .9, 1.3); bubble(c, x + w - 24 - 280, y + 160, 280, 70, true, '#d9e7fb', b1); if (b1 > .5) T(c, '3BHK in Kokapet?', x + w - 44, y + 205, { size: 22, weight: 600, align: 'right' });
      const typing = lt > 1.4 && lt < 2.0; if (typing) { rr(c, x + 24, y + 260, 110, 56, 26); c.fillStyle = '#fff'; c.fill(); for (let i = 0; i < 3; i++) circle(c, x + 56 + i * 24, y + 288 + Math.sin(lt * 10 + i) * 4, 7, '#9aa6b8'); }
      const b2 = p(lt, 2.0, 2.4); bubble(c, x + 24, y + 260, 330, 70, false, '#fff', b2); if (b2 > .5) T(c, 'Here are 3 verified homes', x + 46, y + 305, { size: 22, weight: 600 });
      const b3 = back(p(lt, 2.6, 3.1)); if (b3 > 0) { c.save(); c.translate(x + 24, y + 360); c.scale(b3, b3); lift(c, .12, 20, 8); rr(c, 0, 0, 380, 330, 24); c.fillStyle = '#fff'; c.fill(); unlift(c);
        c.save(); rr(c, 0, 0, 380, 330, 24); c.clip(); const g = c.createLinearGradient(0, 0, 0, 180); g.addColorStop(0, '#eef4ff'); g.addColorStop(1, '#c4d8fb'); c.fillStyle = g; c.fillRect(0, 0, 380, 180); city(c, 190, 172, .36, lt, 2.6, { seed: 3, tall: .7, pin: false, plate: true }); c.restore();
        rr(c, 16, 16, 132, 36, 18); c.fillStyle = BLUE; c.fill(); T(c, 'VERIFIED', 82, 41, { size: 16, weight: 700, color: '#fff', align: 'center', ls: 2 });
        T(c, '₹2.35 Cr', 20, 236, { size: 40, weight: 800, color: BLUE }); T(c, '3 BHK · Kokapet · East facing', 20, 274, { size: 20, weight: 500, color: MIST });
        rr(c, 20, 290, 160, 28, 14); c.fillStyle = TINT; c.fill(); T(c, 'New launch', 100, 310, { size: 16, weight: 600, align: 'center' }); c.restore(); }
      const b4 = p(lt, 3.4, 3.8); bubble(c, x + w - 24 - 260, y + 720, 260, 64, true, '#d9e7fb', b4); if (b4 > .5) T(c, 'Visit on Saturday?', x + w - 44, y + 762, { size: 22, weight: 600, align: 'right' });
    });
    ctx.restore();
    const label = 'Message us on WhatsApp', cw = tw(ctx, label, 34, 700, -.3) + 150; H.cta(ctx, 540 - cw / 2, 1420, label, lt, 3.0);
    T(ctx, 'Browse free · Verify to list', 540, 1640, { size: 44, weight: 800, align: 'center', alpha: io(lt, 3.4) });
    T(ctx, KT.brand.phoneDisplay, 540, 1710, { size: 34, weight: 600, align: 'center', color: MIST, alpha: io(lt, 3.6) });
    T(ctx, KT.brand.reraNo, 540, 1860, { size: 22, weight: 500, align: 'center', color: MIST, alpha: io(lt, 3.8) * .8 });
  });

  function drawReel(ctx, t) {
    ctx.save(); K.bg(ctx, W, HGT, t, { labels: false });
    const hl = 1 - clamp((t - SC[6][0]) / .4); if (hl > 0) K.brandLogo(ctx, 52, 40, 92, hl);
    S.forEach((fn, i) => {
      const [a, b] = SC[i]; if (t < a || t > b + .35) return;
      const fin = i === 0 ? 1 : clamp((t - a) / .35), fout = i === S.length - 1 ? 1 : clamp((b + .35 - t) / .35);
      ctx.save(); ctx.globalAlpha = fin * fout; ctx.translate(0, (1 - eout(fin)) * 50); fn(ctx, t - a); ctx.restore();
    });
    ctx.fillStyle = 'rgba(15,33,71,.08)'; ctx.fillRect(0, HGT - 8, W, 8); ctx.fillStyle = BLUE; ctx.fillRect(0, HGT - 8, W * (t / DUR), 8);
    ctx.restore();
  }
  K.drawReel = drawReel; K.DUR = DUR; K.SCENES = SC; K.SCENEFNS = S;
})();
