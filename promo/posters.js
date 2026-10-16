/* Keetown ad posters — light theme (white / cool grey, one blue accent).
 * Every poster is a pure function of time: draw(ctx, W, H, t). The still PNG is the frame at
 * STILL seconds; the animated version is 0..DUR seconds. No randomness outside seeded generators. */
window.KAds = (function () {
  const K = KP;
  const C = { ink: '#0f2147', blue: '#3669b2', blue2: '#1e4386', sky: '#9dbbe6', tint: '#e9f0fa', mist: '#4f6286', line: '#d6e0ef', wa: '#128c4a', white: '#ffffff' };
  const F = '"Inter", system-ui, sans-serif';
  const { clamp, p, eout, eio, back } = K;
  const DUR = 8, STILL = 6.5;
  const io = (t, a, d = .6) => eout(p(t, a, a + d));
  const WA = new Path2D('M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3z');

  /* ---------- primitives ---------- */
  function rr(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  const lift = (ctx, a = .14, blur = 40, oy = 14) => { ctx.shadowColor = `rgba(11,27,58,${a})`; ctx.shadowBlur = blur; ctx.shadowOffsetY = oy; };
  const unlift = ctx => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; };
  function setFont(ctx, size, weight, ls = 0) { ctx.font = `${weight} ${size}px ${F}`; if ('letterSpacing' in ctx) ctx.letterSpacing = ls + 'px'; }
  function T(ctx, s, x, y, o = {}) {
    const { size = 40, weight = 600, color = C.ink, align = 'left', ls = 0, alpha = 1 } = o;
    ctx.save(); ctx.globalAlpha *= alpha; setFont(ctx, size, weight, ls); ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillText(s, x, y); ctx.restore();
  }
  function tw(ctx, s, size, weight, ls = 0) { ctx.save(); setFont(ctx, size, weight, ls); const w = ctx.measureText(s).width; ctx.restore(); return w; }
  function para(ctx, s, x, y, o = {}) {
    const { size = 34, weight = 400, color = C.mist, maxW = 900, lh = 1.38, alpha = 1 } = o, lines = []; let l = '';
    s.split(' ').forEach(w => { const c = l ? l + ' ' + w : w; if (tw(ctx, c, size, weight) > maxW && l) { lines.push(l); l = w; } else l = c; }); lines.push(l);
    lines.forEach((ln, i) => T(ctx, ln, x, y + i * size * lh, { size, weight, color, alpha })); return lines.length * size * lh;
  }
  function pin(ctx, x, y, s, col = C.blue) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-6, -10, -16, -18, -16, -30); ctx.arc(0, -30, 16, Math.PI, 0); ctx.bezierCurveTo(16, -18, 6, -10, 0, 0); ctx.closePath();
    ctx.fillStyle = col; ctx.fill(); ctx.beginPath(); ctx.arc(0, -30, 6.5, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
  }

  /* ---------- components ---------- */
  function header(ctx, W, t, x0 = 0) {
    const k = io(t, 0, .5); ctx.save(); ctx.globalAlpha *= k; ctx.translate(x0, (1 - k) * -16);
    K.brandLogo(ctx, 52, 40, 104);
    const s = 'Hyderabad', w = tw(ctx, s, 24, 600) + 74; rr(ctx, W - 64 - w, 66, w, 58, 29); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
    pin(ctx, W - 64 - w + 32, 108, .7); T(ctx, s, W - 64 - w + 54, 104, { size: 24, weight: 600 }); ctx.restore();
  }
  function kicker(ctx, s, x, y, t, t0) {
    const k = io(t, t0, .5); if (k <= 0) return; const w = tw(ctx, s, 22, 700, 3) + 58;
    ctx.save(); ctx.globalAlpha *= k; ctx.translate(x - (1 - k) * 30, y);
    rr(ctx, 0, 0, w, 46, 23); ctx.fillStyle = C.tint; ctx.fill(); ctx.beginPath(); ctx.arc(24, 23, 6, 0, 7); ctx.fillStyle = C.blue; ctx.fill();
    T(ctx, s, 40, 31, { size: 22, weight: 700, color: C.blue, ls: 3 }); ctx.restore();
  }
  // lines: [[text, highlight?], ...] per line. Lines rise out of a mask; highlights get a marker wipe.
  function headline(ctx, lines, x, y, size, t, t0) {
    const lh = size * 1.06, ls = -size * .035; let yy = y;
    lines.forEach((segs, i) => {
      const hasHl = segs.some(s => s[1]), k = eout(p(t, t0 + i * .14, t0 + i * .14 + .75)), base = yy + size * .84;
      ctx.save(); ctx.beginPath(); ctx.rect(x - 40, yy - size * .1, 4000, lh + size * .22); ctx.clip(); ctx.translate(0, (1 - k) * lh * 1.1);
      let cx = x;
      segs.forEach(([s, hl]) => {
        const w = tw(ctx, s, size, 800, ls);
        if (hl) {
          const pad = size * .14, kh = eio(p(t, t0 + .6 + i * .14, t0 + 1.1 + i * .14)), top = yy + size * .04;
          T(ctx, s, cx + pad, base, { size, weight: 800, color: C.blue, ls });
          ctx.save(); rr(ctx, cx, top, (w + pad * 2) * kh, size * 1.02, size * .18); ctx.fillStyle = C.blue; ctx.fill(); ctx.clip();
          T(ctx, s, cx + pad, base, { size, weight: 800, color: '#fff', ls }); ctx.restore(); cx += w + pad * 2;
        } else { T(ctx, s, cx, base, { size, weight: 800, color: C.ink, ls }); cx += w; }
      });
      ctx.restore(); yy += lh + (hasHl ? size * .1 : 0);
    });
    return yy - y;
  }
  function chip(ctx, x, y, o, t, t0, phase = 0) {
    const k = back(p(t, t0, t0 + .55)); if (k <= 0) return;
    const fy = Math.sin(t * 1.3 + phase) * 6 * clamp((t - t0 - .6) / .8);
    const wT = Math.max(tw(ctx, o.title, 30, 700, -.3), o.sub ? tw(ctx, o.sub, 22, 500) : 0), h = o.sub ? 100 : 84, w = h + wT + 34;
    ctx.save(); ctx.translate(x, y + fy); ctx.globalAlpha *= clamp(k); ctx.translate(0, h / 2); ctx.scale(.7 + .3 * k, .7 + .3 * k); ctx.translate(0, -h / 2);
    lift(ctx); rr(ctx, 0, 0, w, h, 26); ctx.fillStyle = '#fff'; ctx.fill(); unlift(ctx); ctx.strokeStyle = C.line; ctx.lineWidth = 1.5; ctx.stroke();
    const r = h / 2 - 16; ctx.beginPath(); ctx.arc(h / 2, h / 2, r, 0, 7); ctx.fillStyle = o.icon === 'ok' ? C.blue : C.tint; ctx.fill();
    if (o.icon === 'ok') K.check(ctx, h / 2, h / 2, r * .9, p(t, t0 + .3, t0 + .8), '#fff', 5); else K.icon(ctx, o.icon, h / 2, h / 2, r * 1.15, C.blue, t);
    T(ctx, o.title, h + 4, o.sub ? 46 : 53, { size: 30, weight: 700, ls: -.3 }); if (o.sub) T(ctx, o.sub, h + 4, 78, { size: 22, weight: 500, color: C.mist });
    ctx.restore();
  }
  // isometric city block on a ground plate; returns nothing. s = scale, n = grid size
  function city(ctx, cx, by, s, t, t0, o = {}) {
    const a = Math.cos(Math.PI / 6), b = .5, n = o.n || 3, cell = 120 * s, P = (U, V) => [cx + (U - V) * a, by - (U + V) * b];
    const kp = io(t, t0, .6);
    if (o.plate !== false && kp > 0) {
      const pad = 26 * s, E = n * cell + pad; ctx.save(); ctx.globalAlpha *= kp;
      const pts = [P(-pad, -pad), P(E, -pad), P(E, E), P(-pad, E)]; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(...q) : ctx.moveTo(...q)); ctx.closePath();
      lift(ctx, .12, 50, 22); ctx.fillStyle = '#f5f8ff'; ctx.fill(); unlift(ctx); ctx.strokeStyle = 'rgba(54,105,178,.35)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.strokeStyle = 'rgba(54,105,178,.12)'; ctx.lineWidth = 1.2; for (let i = 1; i < n; i++) { ctx.beginPath(); ctx.moveTo(...P(i * cell, -pad)); ctx.lineTo(...P(i * cell, E)); ctx.moveTo(...P(-pad, i * cell)); ctx.lineTo(...P(E, i * cell)); ctx.stroke(); }
      ctx.restore();
    }
    let sd = o.seed || 5; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const towers = []; for (let gu = 0; gu < n; gu++) for (let gv = 0; gv < n; gv++) { const keep = r() > .12, h = (100 + r() * 220) * s * (o.tall || 1), w = (64 + r() * 34) * s, d = (64 + r() * 34) * s, lit = r() * 10; if (keep) towers.push({ gu, gv, h, w, d, lit }); }
    towers.sort((A, B) => (B.gu + B.gv) - (A.gu + A.gv));
    let pinAt = null;
    towers.forEach((q, i) => {
      const U = q.gu * cell + (cell - q.w) / 2, V = q.gv * cell + (cell - q.d) / 2, [x, y] = P(U, V), kh = eout(p(t, t0 + .25 + i * .07, t0 + 1.05 + i * .07));
      if (kh > 0) K.isoBox(ctx, x, y, q.w, q.d, q.h * kh, 1, t, q.lit);
      if (q.gu === 1 && q.gv === 1) pinAt = [x + (q.w - q.d) * a / 2, y - (q.w + q.d) * b / 2 - q.h * kh];
    });
    if (o.pin === false) return pinAt;
    if (pinAt) { const kp2 = back(p(t, t0 + 1.2, t0 + 1.7)); if (kp2 > 0) { const bob = Math.sin(t * 2.4) * 8 * clamp(t - t0 - 1.7); ctx.save(); ctx.globalAlpha *= clamp(kp2); ctx.beginPath(); ctx.ellipse(pinAt[0], pinAt[1] - 4, 16 * s * 1.6, 6 * s * 1.6, 0, 0, 7); ctx.fillStyle = 'rgba(54,105,178,.18)'; ctx.fill(); pin(ctx, pinAt[0], pinAt[1] - 12 - bob, 1.6 * s * kp2 + .001); ctx.restore(); } }
  }
  function band(ctx, W, H, yL, yR, t, t0) {
    const k = eio(p(t, t0, t0 + .9)); if (k <= 0) return; const a = H - (H - yL) * k, b = H - (H - yR) * k;
    ctx.save(); ctx.beginPath(); ctx.moveTo(0, a); ctx.lineTo(W, b); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    const g = ctx.createLinearGradient(0, Math.min(a, b), W, H); g.addColorStop(0, C.blue); g.addColorStop(1, C.blue2); ctx.fillStyle = g; ctx.fill(); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.10)'; ctx.lineWidth = 2; for (let i = 1; i < 9; i++) { const o = i * 46 + ((t * 18) % 46); ctx.beginPath(); ctx.moveTo(0, a + o); ctx.lineTo(W, b + o); ctx.stroke(); }
    ctx.restore();
  }
  function cta(ctx, x, y, label, t, t0) {
    const k = back(p(t, t0, t0 + .55)); if (k <= 0) return; const h = 104, w = tw(ctx, label, 34, 700, -.3) + 150, pulse = 1 + Math.sin((t - t0) * 4) * .018 * clamp(t - t0 - .6);
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(k * pulse, k * pulse); ctx.translate(-w / 2, -h / 2);
    lift(ctx, .25, 40, 16); rr(ctx, 0, 0, w, h, h / 2); ctx.fillStyle = '#fff'; ctx.fill(); unlift(ctx);
    ctx.beginPath(); ctx.arc(h / 2 + 2, h / 2, 36, 0, 7); ctx.fillStyle = C.wa; ctx.fill(); ctx.save(); ctx.translate(h / 2 + 2 - 20, h / 2 - 20); ctx.scale(40 / 24, 40 / 24); ctx.fillStyle = '#fff'; ctx.fill(WA); ctx.restore();
    T(ctx, label, h + 14, h / 2 + 12, { size: 34, weight: 700, ls: -.3 }); ctx.restore();
  }
  function foot(ctx, W, H, t, t0) {
    const k = io(t, t0, .5); T(ctx, KT.brand.phoneDisplay + '  ·  WhatsApp', 64, H - 46, { size: 26, weight: 600, color: '#fff', alpha: k });
    T(ctx, KT.brand.reraNo, W - 64, H - 46, { size: 18, weight: 500, color: '#fff', align: 'right', alpha: k * .75 });
  }
  function dash(ctx, x, y, w, t, t0, rot = 0) {
    const k = eout(p(t, t0, t0 + .8)); if (k <= 0) return; const S = w / 560, h = 520 * S;
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot * Math.PI / 180 * k); ctx.translate(-w / 2, -h / 2 + (1 - k) * 140); ctx.globalAlpha *= k;
    lift(ctx, .18, 60, 24); rr(ctx, 0, 0, w, h, 32 * S); ctx.fillStyle = '#fff'; ctx.fill(); unlift(ctx); ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
    ctx.scale(S, S);
    T(ctx, 'OWNER STATEMENT', 32, 56, { size: 18, weight: 700, color: C.blue, ls: 2 }); T(ctx, 'Kokapet 3BHK · October', 32, 94, { size: 28, weight: 800, ls: -.4 });
    rr(ctx, 560 - 32 - 128, 40, 128, 44, 22); ctx.fillStyle = C.tint; ctx.fill(); T(ctx, 'On time', 560 - 32 - 64, 69, { size: 20, weight: 700, color: C.blue, align: 'center' });
    const kc = eio(p(t, t0 + .5, t0 + 1.9));
    [['Rent received', 85000], ['Repairs', 2400], ['Net to you', 76880]].forEach(([l, v], i) => { const cx = 32 + i * 172; T(ctx, l, cx, 148, { size: 18, weight: 500, color: C.mist }); T(ctx, '₹' + Math.round(v * kc).toLocaleString('en-IN'), cx, 186, { size: 30, weight: 800, color: i === 2 ? C.blue : C.ink, ls: -.5 }); });
    const gx = 32, gy = 214, gw = 496, gh = 110, pts = [.7, .58, .64, .44, .5, .32, .36, .14], kl = eio(p(t, t0 + .7, t0 + 2.1));
    ctx.strokeStyle = 'rgba(11,27,58,.06)'; ctx.lineWidth = 1.5; for (let i = 0; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(gx, gy + i * gh / 3); ctx.lineTo(gx + gw, gy + i * gh / 3); ctx.stroke(); }
    const n = pts.length - 1, upto = kl * n, path = []; for (let i = 0; i <= Math.floor(upto); i++) path.push([gx + i / n * gw, gy + pts[i] * gh]);
    if (upto % 1 > 0 && upto < n) { const i = Math.floor(upto), f = upto - i; path.push([gx + (i + f) / n * gw, gy + (pts[i] + (pts[i + 1] - pts[i]) * f) * gh]); }
    if (path.length > 1) {
      ctx.beginPath(); path.forEach((q, i) => i ? ctx.lineTo(...q) : ctx.moveTo(...q)); ctx.lineTo(path.at(-1)[0], gy + gh); ctx.lineTo(gx, gy + gh); ctx.closePath();
      const g = ctx.createLinearGradient(0, gy, 0, gy + gh); g.addColorStop(0, 'rgba(54,105,178,.22)'); g.addColorStop(1, 'rgba(54,105,178,0)'); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); path.forEach((q, i) => i ? ctx.lineTo(...q) : ctx.moveTo(...q)); ctx.strokeStyle = C.blue; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
      const e = path.at(-1); ctx.beginPath(); ctx.arc(e[0], e[1], 8, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = C.blue; ctx.lineWidth = 4; ctx.stroke();
    }
    ['Rent received on the 3rd', 'GHMC tax paid · receipt filed', 'Pre-monsoon check booked'].forEach((s, i) => {
      const yy = gy + gh + 56 + i * 48, kk = p(t, t0 + 1.4 + i * .35, t0 + 1.9 + i * .35);
      ctx.beginPath(); ctx.arc(46, yy - 8, 15, 0, 7); ctx.fillStyle = kk > 0 ? C.blue : C.tint; ctx.fill(); if (kk > 0) K.check(ctx, 46, yy - 8, 15, kk, '#fff', 4);
      T(ctx, s, 74, yy, { size: 22, weight: 600, alpha: .35 + .65 * clamp(kk * 2) });
    });
    T(ctx, 'Illustrative', 528, 500, { size: 15, weight: 500, color: C.mist, align: 'right' });
    ctx.restore();
  }
  function listing(ctx, x, y, w, t, t0, rot = 0) {
    const k = eout(p(t, t0, t0 + .8)); if (k <= 0) return; const S = w / 600, h = 640 * S;
    const pr = KT.properties.find(q => q.id === 'p1'), l = KT.loc(pr.loc);
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot * Math.PI / 180 * k); ctx.translate(-w / 2, -h / 2 + (1 - k) * 160); ctx.globalAlpha *= k; ctx.scale(S, S);
    lift(ctx, .2, 70, 28); rr(ctx, 0, 0, 600, 640, 32); ctx.fillStyle = '#fff'; ctx.fill(); unlift(ctx); ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
    ctx.save(); rr(ctx, 0, 0, 600, 640, 32); ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 0, 310); g.addColorStop(0, '#eef4ff'); g.addColorStop(1, '#c4d8fb'); ctx.fillStyle = g; ctx.fillRect(0, 0, 600, 310);
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; for (let i = 0; i < 6; i++) { ctx.beginPath(); for (let xx = 0; xx <= 600; xx += 12) { const yy = 40 + i * 48 + Math.sin(xx * .012 + i + t * .4) * 10; xx ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } ctx.stroke(); }
    city(ctx, 300, 292, .5, t, t0 + .35, { n: 3, seed: 3, tall: .62 });
    ctx.restore();
    rr(ctx, 24, 24, 168, 44, 22); ctx.fillStyle = C.blue; ctx.fill(); K.check(ctx, 50, 46, 14, 1, '#fff', 3.5); T(ctx, 'VERIFIED', 70, 54, { size: 18, weight: 700, color: '#fff', ls: 2 });
    rr(ctx, 600 - 24 - 118, 24, 118, 44, 22); ctx.fillStyle = '#fff'; ctx.fill(); T(ctx, 'RERA ✓', 600 - 24 - 59, 54, { size: 18, weight: 700, color: C.blue, align: 'center' });
    T(ctx, pr.title, 28, 366, { size: 31, weight: 800, ls: -.5 });
    T(ctx, `${l.name} · ${pr.facing} facing · ${pr.area.toLocaleString('en-IN')} sq.ft`, 28, 402, { size: 20, weight: 500, color: C.mist });
    const price = KT.fmt.price(pr); T(ctx, price, 28, 468, { size: 48, weight: 800, color: C.blue, ls: -1 }); T(ctx, KT.fmt.perSqft(pr), 40 + tw(ctx, price, 48, 800, -1), 466, { size: 20, weight: 500, color: C.mist });
    let cx = 28; [KT.fmt.bhk(pr), 'Possession Dec 2027', pr.amen[0]].forEach(s => { const w2 = tw(ctx, s, 18, 600) + 28; rr(ctx, cx, 492, w2, 38, 19); ctx.fillStyle = C.tint; ctx.fill(); T(ctx, s, cx + 14, 517, { size: 18, weight: 600, color: C.ink }); cx += w2 + 10; });
    rr(ctx, 28, 556, 260, 60, 30); ctx.fillStyle = C.wa; ctx.fill(); ctx.save(); ctx.translate(50, 572); ctx.scale(28 / 24, 28 / 24); ctx.fillStyle = '#fff'; ctx.fill(WA); ctx.restore(); T(ctx, 'WhatsApp', 90, 595, { size: 24, weight: 700, color: '#fff' });
    rr(ctx, 304, 556, 268, 60, 30); ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.stroke(); T(ctx, 'View details', 438, 595, { size: 24, weight: 700, align: 'center' });
    ctx.restore();
  }
  function bars(ctx, x, y, w, t, t0) {
    const k = eout(p(t, t0, t0 + .7)); if (k <= 0) return; const h = 410;
    ctx.save(); ctx.translate(x, y + (1 - k) * 80); ctx.globalAlpha *= k;
    lift(ctx, .16, 60, 24); rr(ctx, 0, 0, w, h, 32); ctx.fillStyle = '#fff'; ctx.fill(); unlift(ctx); ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
    T(ctx, 'GROSS RENTAL YIELD · INDICATIVE', 36, 58, { size: 18, weight: 700, color: C.blue, ls: 2 });
    const rows = [['Kokapet', 2.8, 'High growth'], ['Gachibowli', 3.2, 'IT demand'], ['Kondapur', 3.3, 'Mid-premium'], ['Miyapur', 3.4, 'Metro-linked']];
    rows.forEach((r, i) => {
      const yy = 112 + i * 64, kb = eio(p(t, t0 + .4 + i * .18, t0 + 1.4 + i * .18)), bx = 300, bw = w - bx - 150;
      T(ctx, r[0], 36, yy + 6, { size: 28, weight: 700, ls: -.3 }); T(ctx, r[2], 36, yy + 32, { size: 17, weight: 500, color: C.mist });
      rr(ctx, bx, yy - 16, bw, 30, 15); ctx.fillStyle = C.tint; ctx.fill();
      const fw = Math.max(30, bw * (r[1] / 3.6) * kb); const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, C.sky); g.addColorStop(1, C.blue); rr(ctx, bx, yy - 16, fw, 30, 15); ctx.fillStyle = g; ctx.fill();
      T(ctx, (r[1] * kb).toFixed(1) + '%', w - 36, yy + 8, { size: 30, weight: 800, color: C.blue, align: 'right' });
    });
    T(ctx, '17 micro-markets tracked · live rates shared per project', 36, h - 24, { size: 18, weight: 500, color: C.mist });
    ctx.restore();
  }

  /* ---------- posters ---------- */
  const P = {};
  P['trust-feed'] = { W: 1080, H: 1350, draw(ctx, W, H, t) {
    K.bg(ctx, W, H, t, { labels: false }); band(ctx, W, H, 1070, 900, t, .3); city(ctx, 790, 1196, .92, t, .5, { seed: 7 });
    header(ctx, W, t); kicker(ctx, 'WHY TRUST KEETOWN', 64, 186, t, .05);
    headline(ctx, [[['Verified people.']], [['Legal-first ']], [['checks.', 1]]], 64, 262, 100, t, .15);
    chip(ctx, 64, 650, { icon: 'ok', title: 'DigiLocker-verified', sub: 'Tenants · owners · sellers' }, t, 1.5, 0);
    chip(ctx, 64, 772, { icon: 'doc', title: 'RERA · HMDA · Title', sub: 'Checked before any token' }, t, 1.75, 1.6);
    chip(ctx, 64, 894, { icon: 'rupee', title: '~6% registration', sub: 'Planned upfront, no surprises' }, t, 2.0, 3.1);
    cta(ctx, 64, 1150, 'Message us on WhatsApp', t, 2.5); foot(ctx, W, H, t, 2.8);
  } };
  P['manage-feed'] = { W: 1080, H: 1350, draw(ctx, W, H, t) {
    K.bg(ctx, W, H, t, { labels: false }); band(ctx, W, H, 1080, 930, t, .3);
    header(ctx, W, t); kicker(ctx, 'PROPERTY MANAGEMENT', 64, 186, t, .05);
    headline(ctx, [[['Own in Hyderabad.']], [['Live ', 0], ['anywhere.', 1]]], 64, 262, 96, t, .15);
    dash(ctx, 486, 560, 540, t, 1.0, -2.5);
    chip(ctx, 64, 610, { icon: 'rain', title: 'Monsoon audits', sub: 'Pre & post-rain checks' }, t, 1.6, 0);
    chip(ctx, 64, 732, { icon: 'tax', title: 'Tax & bills', sub: 'GHMC · HMWSSB · power' }, t, 1.85, 1.7);
    chip(ctx, 64, 854, { icon: 'shield', title: 'Verified tenants', sub: 'ID & employer checked' }, t, 2.1, 3.3);
    cta(ctx, 64, 1160, 'Get a free property audit', t, 2.6); foot(ctx, W, H, t, 2.9);
  } };
  P['story-trust'] = { W: 1080, H: 1920, draw(ctx, W, H, t) {
    K.bg(ctx, W, H, t, { labels: false }); band(ctx, W, H, 1600, 1430, t, .3);
    header(ctx, W, t); kicker(ctx, 'HYDERABAD · BUY · RENT · MANAGE', 64, 220, t, .05);
    headline(ctx, [[['Verified homes.']], [['Realistic ', 0], ['advice.', 1]]], 64, 300, 100, t, .15);
    listing(ctx, 170, 720, 760, t, .9, -3);
    chip(ctx, 600, 596, { icon: 'doc', title: 'Title checked', sub: 'RERA · HMDA · EC' }, t, 1.9, 1.2);
    chip(ctx, 40, 1000, { icon: 'ok', title: 'DigiLocker-verified', sub: 'Every lister, every time' }, t, 2.2, 0);
    cta(ctx, 64, 1690, 'Message us on WhatsApp', t, 2.7); foot(ctx, W, H, t, 3.0);
  } };
  P['story-manage'] = { W: 1080, H: 1920, draw(ctx, W, H, t) {
    K.bg(ctx, W, H, t, { labels: false }); band(ctx, W, H, 1640, 1480, t, .3);
    header(ctx, W, t); kicker(ctx, 'FOR OWNERS & NRIs', 64, 220, t, .05);
    headline(ctx, [[['We manage it']], [['like it’s ', 0], ['ours.', 1]]], 64, 300, 110, t, .15);
    dash(ctx, 130, 680, 820, t, .9, 2);
    chip(ctx, 50, 1500, { icon: 'rain', title: 'Monsoon-ready', sub: 'Seepage audits' }, t, 2.0, 0);
    chip(ctx, 520, 1540, { icon: 'rupee', title: 'Rent on time', sub: 'Straight to your account' }, t, 2.25, 2);
    cta(ctx, 64, 1700, 'Get a free property audit', t, 2.7); foot(ctx, W, H, t, 3.0);
  } };
  P['square-rent'] = { W: 1080, H: 1080, draw(ctx, W, H, t) {
    K.bg(ctx, W, H, t, { labels: false }); band(ctx, W, H, 890, 760, t, .3); city(ctx, 850, 1000, .7, t, .5, { seed: 11 });
    header(ctx, W, t); kicker(ctx, 'FOR TENANTS', 64, 180, t, .05);
    headline(ctx, [[['Move in with']], [['confidence.', 1]]], 64, 252, 88, t, .15);
    chip(ctx, 64, 500, { icon: 'ok', title: 'Verified owners', sub: 'Identity-checked listings' }, t, 1.4, 0);
    chip(ctx, 64, 616, { icon: 'doc', title: 'Clause-checked lease', sub: 'Lock-in · deposit · exit' }, t, 1.65, 1.5);
    chip(ctx, 64, 732, { icon: 'home', title: 'Photo move-in report', sub: 'Fair deposit refunds' }, t, 1.9, 3);
    cta(ctx, 64, 900, 'Chat on WhatsApp', t, 2.4);
    T(ctx, KT.brand.phoneDisplay, W - 64, H - 40, { size: 22, weight: 600, color: '#fff', align: 'right', alpha: io(t, 2.7) });
  } };
  P['square-invest'] = { W: 1080, H: 1080, draw(ctx, W, H, t) {
    K.bg(ctx, W, H, t, { labels: false }); band(ctx, W, H, 900, 780, t, .3);
    header(ctx, W, t); kicker(ctx, 'FOR INVESTORS', 64, 180, t, .05);
    headline(ctx, [[['Know the ', 0], ['numbers', 1]], [['before you buy.']]], 64, 252, 84, t, .15);
    bars(ctx, 64, 470, 952, t, 1.1);
    cta(ctx, 64, 910, 'Ask for a shortlist', t, 2.4);
    T(ctx, KT.brand.phoneDisplay, W - 64, H - 40, { size: 22, weight: 600, color: '#fff', align: 'right', alpha: io(t, 2.7) });
  } };
  // panoramic carousel: one 5400×1350 canvas, sliced into 5 slides
  const SLIDES = [
    { k: 'SWIPE →', h: [[['Why Hyderabad']], [['trusts ', 0], ['Keetown.', 1]]], b: 'Four things we do differently. Swipe through.' },
    { k: '01 · VERIFIED PEOPLE', h: [[['Every lister']], [['is ', 0], ['verified.', 1]]], b: 'Tenants, owners and sellers verify with DigiLocker, so every enquiry is genuine.', chip: { icon: 'ok', title: 'DigiLocker-verified', sub: 'Before listing or contact' } },
    { k: '02 · LEGAL-FIRST', h: [[['Checks before']], [['any ', 0], ['token.', 1]]], b: 'RERA, HMDA/DTCP approvals, title chain and EC, before money moves.', chip: { icon: 'doc', title: 'Title & approvals', sub: 'Documented for you' } },
    { k: '03 · MANAGEMENT', h: [[['Managed for']], [['Hyderabad.', 1]]], b: 'Monsoon audits, water and power bills, GHMC tax and a monthly owner statement.', chip: { icon: 'rain', title: 'Monsoon-ready', sub: 'Pre & post-rain checks' } },
    { k: '04 · YOUR MOVE', h: [[['Browse free.']], [['Verify ', 0], ['to list.', 1]]], b: 'Login with mobile OTP. WhatsApp or email alerts only if you opt in.', cta: true }
  ];
  P['carousel'] = { W: 5400, H: 1350, slides: 5, draw(ctx, W, H, t) {
    K.bg(ctx, W, H, t, { labels: false }); K.skyline(ctx, W, H + 30, t, { rise: 1, scale: .72 });
    // route line connecting the slides
    const ry = x => 900 + Math.sin(x * .0016) * 40; ctx.save(); ctx.strokeStyle = C.blue; ctx.lineWidth = 5; ctx.setLineDash([2, 14]); ctx.lineCap = 'round'; ctx.beginPath(); for (let x = 540; x <= W - 540; x += 20) x === 540 ? ctx.moveTo(x, ry(x)) : ctx.lineTo(x, ry(x)); ctx.stroke(); ctx.restore();
    SLIDES.forEach((s, i) => {
      const ox = i * 1080; header(ctx, 1080, t, ox);
      if (i > 0) { ctx.save(); setFont(ctx, 300, 800, -10); ctx.textAlign = 'right'; ctx.strokeStyle = 'rgba(54,105,178,.16)'; ctx.lineWidth = 3; ctx.strokeText(String(i).padStart(2, '0'), ox + 1040, 470); ctx.restore(); }
      kicker(ctx, s.k, ox + 64, 250, t, .25); const hh = headline(ctx, s.h, ox + 64, 326, 96, t, .15);
      para(ctx, s.b, ox + 64, 326 + hh + 56, { size: 34, maxW: 900, alpha: io(t, 1.2) });
      if (s.chip) chip(ctx, ox + 64, 700, s.chip, t, 1.6, i);
      if (s.cta) cta(ctx, ox + 64, 690, 'Message us on WhatsApp', t, 1.8);
      if (i === 0) { const k = back(p(t, 1.6, 2.1)); ctx.save(); ctx.globalAlpha *= clamp(k); rr(ctx, ox + 64, 700, 240, 84, 42); ctx.fillStyle = C.blue; ctx.fill(); T(ctx, 'Swipe  →', ox + 184 + Math.sin(t * 3) * 6, 754, { size: 30, weight: 700, color: '#fff', align: 'center' }); ctx.restore(); }
      const x = ox + 540, y = ry(x); ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = C.blue; ctx.lineWidth = 5; ctx.stroke(); T(ctx, String(i + 1), x, y + 10, { size: 26, weight: 800, color: C.blue, align: 'center' });
    });
  } };

  function render(cv, id, t) { if (window.KBrand && !KBrand.logo) console.warn('brand not loaded'); const d = P[id]; cv.width = d.W; cv.height = d.H; const ctx = cv.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); d.draw(ctx, d.W, d.H, t); return cv; }
  return { P, render, DUR, STILL, C, H: { T, tw, rr, lift, unlift, setFont, para, pin, header, kicker, headline, chip, city, band, cta, foot } };
})();
