/* Keetown promo engine — canvas drawing helpers + the 37s vertical reel (1080x1920).
 * Pure function drawReel(ctx, t) so it can be previewed, scrubbed and recorded. */
window.KP = (function () {
  const C = { navy: '#0f2147', navy2: '#1e4386', gold: '#3669b2', gold2: '#1e4386', white: '#0f2147', mist: '#4f6286', teal: '#3669b2', wa: '#128c4a', red: '#e5484d' };
  const FONT = '"Inter", system-ui, sans-serif';
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const eio = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  const eout = x => 1 - Math.pow(1 - x, 3);
  const back = x => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function text(ctx, s, x, y, o = {}) {
    const { size = 48, weight = 600, color = C.white, align = 'left', alpha = 1, maxW = 0, lh = 1.2 } = o;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    const lines = [];
    if (maxW) { let line = ''; s.split(' ').forEach(w => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }); lines.push(line); } else lines.push(s);
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * lh)); ctx.restore(); return lines.length * size * lh;
  }
  function check(ctx, x, y, s, k, color = C.teal, w = 8) { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); const pts = [[x - s * .5, y], [x - s * .12, y + s * .4], [x + s * .5, y - s * .38]]; const l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]); const d = k * (l1 + l2); ctx.moveTo(...pts[0]); if (d <= l1) { const f = d / l1; ctx.lineTo(pts[0][0] + (pts[1][0] - pts[0][0]) * f, pts[0][1] + (pts[1][1] - pts[0][1]) * f); } else { ctx.lineTo(...pts[1]); const f = (d - l1) / l2; ctx.lineTo(pts[1][0] + (pts[2][0] - pts[1][0]) * f, pts[1][1] + (pts[2][1] - pts[1][1]) * f); } ctx.stroke(); ctx.restore(); }
  function cross(ctx, x, y, s, k, color = C.red, w = 7) { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - s / 2, y - s / 2); ctx.lineTo(x - s / 2 + s * Math.min(1, k * 2), y - s / 2 + s * Math.min(1, k * 2)); if (k > .5) { ctx.moveTo(x + s / 2, y - s / 2); ctx.lineTo(x + s / 2 - s * (k - .5) * 2, y - s / 2 + s * (k - .5) * 2); } ctx.stroke(); ctx.restore(); }

  // official artwork (preloaded by brand.js). logo(): mark only, fitted in an s×s box. brandLogo(): full lockup, height h.
  function logo(ctx, x, y, s, alpha = 1, white = false) {
    const im = window.KBrand && KBrand[white ? 'markWhite' : 'mark']; if (!im) return; const w = s * im.width / im.height;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(im, x + (s - w) / 2, y, w, s); ctx.restore();
  }
  function brandLogo(ctx, x, y, h, alpha = 1, white = false, align = 'left') {
    const im = window.KBrand && KBrand[white ? 'logoWhite' : 'logo']; if (!im) return 0; const w = h * im.width / im.height, x0 = align === 'center' ? x - w / 2 : x;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(im, x0, y, w, h); ctx.restore(); return w;
  }
  /* "Survey sheet" background: deep teal, drifting topographic contours, dot grid, soft aurora. */
  function bg(ctx, W, H, t, o = {}) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffffff'); g.addColorStop(.55, '#f1f6fe'); g.addColorStop(1, '#d9e6fb'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const aur = (cx, cy, r, col) => { const q = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); q.addColorStop(0, col); q.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = q; ctx.fillRect(0, 0, W, H); };
    aur(W * (.85 + Math.sin(t * .25) * .05), H * (.16 + Math.cos(t * .2) * .03), W * .8, 'rgba(54,105,178,.13)');
    aur(W * (.05 + Math.cos(t * .22) * .05), H * (.7 + Math.sin(t * .17) * .04), W * .75, 'rgba(96,165,250,.20)');
    ctx.save(); ctx.fillStyle = 'rgba(54,105,178,.16)'; for (let gy = 40; gy < H; gy += 60) for (let gx = 30; gx < W; gx += 60) ctx.fillRect(gx, gy, 2.4, 2.4); ctx.restore();
    const N = Math.ceil(H / 62);
    for (let k = 0; k < N; k++) {
      const y0 = k * 62 + 20, idx = k % 5 === 0; ctx.beginPath();
      for (let x = -10; x <= W + 10; x += 14) { const y = y0 + Math.sin(x * .0062 + k * .55 + t * .22) * 26 + Math.sin(x * .014 - k * .33 - t * .15) * 11; x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.strokeStyle = idx ? 'rgba(54,105,178,.26)' : 'rgba(54,105,178,.10)'; ctx.lineWidth = idx ? 2 : 1.2; ctx.stroke();
      if (idx && o.labels !== false) { ctx.save(); ctx.font = `600 18px ${FONT}`; ctx.fillStyle = 'rgba(54,105,178,.5)'; ctx.fillText((480 + (k / 5 | 0) * 20) + ' m', W - 110, y0 + Math.sin((W - 110) * .0062 + k * .55 + t * .22) * 26 - 8); ctx.restore(); }
    }
  }
  /* isometric wireframe tower */
  function isoBox(ctx, cx, by, w, d, h, s, tw, lit) {
    const a = Math.cos(Math.PI / 6), b = .5, P = (u, v, z) => [cx + (u - v) * a * s, by - (u + v) * b * s - z];
    const poly = (pts, fill, stroke) => { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); } };
    poly([P(0, 0, 0), P(0, d, 0), P(0, d, h), P(0, 0, h)], '#dbe7fb', 'rgba(54,105,178,.55)');
    poly([P(0, 0, 0), P(w, 0, 0), P(w, 0, h), P(0, 0, h)], '#c6d9f8', 'rgba(54,105,178,.7)');
    poly([P(0, 0, h), P(w, 0, h), P(w, d, h), P(0, d, h)], '#f4f8ff', 'rgba(54,105,178,.85)');
    const cols = Math.max(2, Math.floor(w / 26)), rows = Math.floor(h / 40);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const on = Math.sin(tw * 1.2 + r * 2.1 + c * 3.7 + lit) > .15; if (!on) continue; const u0 = (c + .25) * w / cols, u1 = (c + .75) * w / cols, z0 = 14 + r * 40, z1 = z0 + 18; poly([P(u0, 0, z0), P(u1, 0, z0), P(u1, 0, z1), P(u0, 0, z1)], 'rgba(54,105,178,.55)'); }
  }
  function skyline(ctx, W, baseY, t, o = {}) {
    const { rise = 1, alpha = 1, scale = 1 } = o; seed = 23;
    const rows = [[baseY - 170, .78, .55], [baseY - 40, 1, 1]];
    ctx.save(); ctx.globalAlpha *= alpha;
    rows.forEach(([by, sc, al], ri) => {
      ctx.save(); ctx.globalAlpha *= al; let x = -30 + ri * 40, i = 0;
      while (x < W + 60) { const w = (70 + rnd() * 70) * scale * sc, d = (60 + rnd() * 50) * scale * sc, h = (150 + rnd() * 300) * scale * sc; const k = eout(clamp((rise * 1.6 - Math.min(i, 12) * .06 - ri * .15))); const sx = (w + d) * Math.cos(Math.PI / 6) * scale * sc * .5;
        isoBox(ctx, x + sx, by, w / 1.2, d / 1.2, h * k, 1, t, i * 1.7 + ri); x += (w + d) * .78 + 8 + rnd() * 16; i++; }
      ctx.restore();
    });
    charminar(ctx, W / 2 - 150 * scale, baseY - 40, 300 * scale, 1);
    ctx.restore();
  }
  function charminar(ctx, x, baseY, w, a) { // wireframe Charminar
    const s = w / 240; ctx.save(); ctx.translate(x, baseY - 200 * s); ctx.scale(s, s); ctx.globalAlpha *= a; ctx.fillStyle = 'rgba(255,255,255,.97)'; ctx.strokeStyle = C.gold; ctx.lineWidth = 2.6;
    const R = (a, b, c, d) => { ctx.fillRect(a, b, c, d); ctx.strokeRect(a, b, c, d); };
    R(10, 70, 220, 130); R(24, 46, 192, 24); R(0, -24, 24, 224); R(216, -24, 24, 224);
    [[0], [216]].forEach(([mx]) => { ctx.beginPath(); ctx.moveTo(mx, -24); ctx.quadraticCurveTo(mx + 12, -58, mx + 24, -24); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(mx + 12, -48); ctx.lineTo(mx + 12, -66); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(105, 46); ctx.quadraticCurveTo(120, -2, 135, 46); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#bcd2f5'; [[88, 200, 64, 68], [36, 200, 32, 54], [172, 200, 32, 54]].forEach(([ax, ay, aw, ah]) => { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax, ay - ah); ctx.quadraticCurveTo(ax + aw / 2, ay - ah - aw * .9, ax + aw, ay - ah); ctx.lineTo(ax + aw, ay); ctx.closePath(); ctx.fill(); ctx.stroke(); }); ctx.restore();
  }
  function card(ctx, x, y, w, h, a = 1, fill = '#ffffff', stroke = '#d5e0f2') { ctx.save(); ctx.globalAlpha *= a; rr(ctx, x, y, w, h, 28); ctx.shadowColor = 'rgba(54,105,178,.16)'; ctx.shadowBlur = 36; ctx.shadowOffsetY = 12; ctx.fillStyle = fill; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
  function icon(ctx, kind, x, y, s, color = C.gold, t = 0) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 48, s / 48); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (kind === 'shield') { ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(18, -13); ctx.lineTo(18, 2); ctx.quadraticCurveTo(18, 15, 0, 22); ctx.quadraticCurveTo(-18, 15, -18, 2); ctx.lineTo(-18, -13); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(-2, 8); ctx.lineTo(9, -6); ctx.stroke(); }
    if (kind === 'doc') { ctx.strokeRect(-14, -20, 28, 40); ctx.beginPath(); ctx.moveTo(-8, -9); ctx.lineTo(8, -9); ctx.moveTo(-8, 0); ctx.lineTo(8, 0); ctx.moveTo(-8, 9); ctx.lineTo(2, 9); ctx.stroke(); }
    if (kind === 'rupee') { ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.stroke(); ctx.font = '700 26px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('₹', 0, 2); }
    if (kind === 'rain') { ctx.beginPath(); ctx.arc(-6, -6, 10, Math.PI * .5, Math.PI * 1.5); ctx.arc(6, -12, 12, Math.PI, 0); ctx.arc(14, -4, 8, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.stroke(); for (let i = 0; i < 3; i++) { const o = ((t * 30 + i * 9) % 22); ctx.beginPath(); ctx.moveTo(-12 + i * 12, 6 + o * .5); ctx.lineTo(-15 + i * 12, 14 + o * .5); ctx.stroke(); } }
    if (kind === 'bolt') { ctx.beginPath(); ctx.moveTo(6, -22); ctx.lineTo(-10, 4); ctx.lineTo(0, 4); ctx.lineTo(-6, 22); ctx.lineTo(10, -6); ctx.lineTo(0, -6); ctx.closePath(); ctx.stroke(); }
    if (kind === 'tax') { ctx.strokeRect(-18, -14, 36, 28); ctx.beginPath(); ctx.moveTo(-18, -4); ctx.lineTo(18, -4); ctx.moveTo(-10, 6); ctx.lineTo(-2, 6); ctx.stroke(); }
    if (kind === 'chart') { ctx.beginPath(); ctx.moveTo(-18, 16); ctx.lineTo(-18, -18); ctx.moveTo(-18, 16); ctx.lineTo(18, 16); ctx.moveTo(-12, 8); ctx.lineTo(-2, -2); ctx.lineTo(6, 4); ctx.lineTo(16, -12); ctx.stroke(); }
    if (kind === 'home') { ctx.beginPath(); ctx.moveTo(-20, 2); ctx.lineTo(0, -18); ctx.lineTo(20, 2); ctx.moveTo(-14, -2); ctx.lineTo(-14, 18); ctx.lineTo(14, 18); ctx.lineTo(14, -2); ctx.stroke(); }
    ctx.restore();
  }
  function fade(t, a, b, inD = .5, outD = .45) { return clamp((t - a) / inD) * clamp((b - t) / outD); }

  /* ===================== the reel ===================== */
  const W = 1080, H = 1920, DUR = 37;
  const SC = [[0, 4], [4, 9], [9, 14.5], [14.5, 19.5], [19.5, 27.5], [27.5, 32.5], [32.5, 37]];

  function drawReel(ctx, t) {
    bg(ctx, W, H, t);
    const sky = (a, rise) => skyline(ctx, W, H + 40, t, { rise, alpha: a, scale: 1.0 });

    // scene 0 — hook
    if (t < SC[0][1] + .6) {
      const a = fade(t, 0, SC[0][1], .01, .6); ctx.save(); ctx.globalAlpha = a;
      sky(1, p(t, 0, 2));
      ['Buying, renting', 'or owning in', 'Hyderabad?'].forEach((l, i) => { const k = eout(p(t, .3 + i * .35, .9 + i * .35)); text(ctx, l, 90, 520 + i * 150 + (1 - k) * 60, { size: 128, weight: 700, color: i === 2 ? C.gold : C.white, alpha: k }); });
      text(ctx, 'Here’s why people trust', 90, 1040, { size: 50, weight: 500, color: C.mist, alpha: eout(p(t, 1.8, 2.5)) });
      text(ctx, 'Keetown Realty.', 90, 1105, { size: 62, weight: 700, color: C.white, alpha: eout(p(t, 2.1, 2.8)) });
      brandLogo(ctx, 80, 130, 130, eout(p(t, .1, .7)));
      ctx.restore();
    }
    // scene 1 — 3 reasons
    let [a, b] = SC[1]; if (t >= a - .1 && t < b + .1) {
      const f = fade(t, a, b); ctx.save(); ctx.globalAlpha = f; const lt = t - a;
      text(ctx, 'WHY TRUST US', 90, 250, { size: 36, weight: 700, color: C.gold, alpha: eout(p(lt, 0, .5)) });
      text(ctx, 'Three things we never skip.', 90, 340, { size: 78, weight: 700, maxW: 900, alpha: eout(p(lt, .1, .7)), lh: 1.1 });
      const rows = [['shield', 'Verified people', 'Tenants, owners and sellers are verified through DigiLocker — so every enquiry is genuine.'], ['doc', 'Legal-first checks', 'RERA, HMDA/DTCP approvals, title and EC checked before any token money moves.'], ['rupee', 'No-surprise pricing', 'Registration (~6% in Telangana) and every cost planned upfront.']];
      rows.forEach((r, i) => { const k = back(p(lt, .9 + i * .7, 1.6 + i * .7)); const y = 600 + i * 380; card(ctx, 90, y + (1 - k) * 80, 900, 320, k); ctx.save(); ctx.globalAlpha *= k; ctx.translate(0, (1 - k) * 80);
        ctx.beginPath(); ctx.arc(190, y + 160, 62, 0, 7); ctx.fillStyle = 'rgba(54,105,178,.10)'; ctx.fill(); icon(ctx, r[0], 190, y + 160, 80); text(ctx, r[1], 290, y + 125, { size: 54, weight: 700 }); text(ctx, r[2], 290, y + 185, { size: 34, weight: 400, color: C.mist, maxW: 660, lh: 1.3 }); ctx.restore(); });
      ctx.restore();
    }
    // scene 2 — investors
    [a, b] = SC[2]; if (t >= a - .1 && t < b + .1) {
      const f = fade(t, a, b); ctx.save(); ctx.globalAlpha = f; const lt = t - a;
      text(ctx, 'FOR INVESTORS', 90, 250, { size: 36, weight: 700, color: C.gold, alpha: eout(p(lt, 0, .5)) });
      text(ctx, 'Know the numbers before you buy.', 90, 340, { size: 78, weight: 700, maxW: 900, lh: 1.1, alpha: eout(p(lt, .1, .7)) });
      const data = [['Kokapet', 2.8, 'High growth'], ['Gachibowli', 3.2, 'IT rental demand'], ['Kondapur', 3.3, 'Mid-premium'], ['Miyapur', 3.4, 'Metro-linked']];
      text(ctx, 'Indicative gross rental yield', 90, 620, { size: 34, weight: 500, color: C.mist, alpha: eout(p(lt, .6, 1)) });
      data.forEach((d, i) => { const y = 700 + i * 170, k = eio(p(lt, 1 + i * .3, 2.2 + i * .3)); text(ctx, d[0], 90, y, { size: 44, weight: 700 }); text(ctx, d[2], 90, y + 44, { size: 28, color: C.mist, weight: 400 });
        rr(ctx, 440, y - 40, 420, 54, 27); ctx.fillStyle = 'rgba(11,27,58,.08)'; ctx.fill(); rr(ctx, 440, y - 40, Math.max(54, 420 * (d[1] / 3.6) * k), 54, 27); const g = ctx.createLinearGradient(440, 0, 920, 0); g.addColorStop(0, '#9dbbe6'); g.addColorStop(1, '#3669b2'); ctx.fillStyle = g; ctx.fill();
        text(ctx, (d[1] * k).toFixed(1) + "%", 990, y + 2, { size: 40, weight: 700, align: 'right', color: C.gold }); });
      card(ctx, 90, 1420, 900, 260, eout(p(lt, 3, 3.6))); text(ctx, '17 micro-markets tracked', 130, 1510, { size: 52, weight: 700, alpha: eout(p(lt, 3.1, 3.7)) }); text(ctx, 'Realistic risk notes on every shortlist — not just the good news.', 130, 1575, { size: 34, color: C.mist, weight: 400, maxW: 820, lh: 1.3, alpha: eout(p(lt, 3.3, 3.9)) });
      text(ctx, 'Indicative ranges. Verified live rates shared per project.', 90, 1790, { size: 26, color: 'rgba(11,27,58,.55)', weight: 400, alpha: eout(p(lt, 3.6, 4.2)) });
      ctx.restore();
    }
    // scene 3 — tenants
    [a, b] = SC[3]; if (t >= a - .1 && t < b + .1) {
      const f = fade(t, a, b); ctx.save(); ctx.globalAlpha = f; const lt = t - a;
      text(ctx, 'FOR TENANTS', 90, 250, { size: 36, weight: 700, color: C.gold, alpha: eout(p(lt, 0, .5)) });
      text(ctx, 'Move in with confidence.', 90, 340, { size: 84, weight: 700, maxW: 900, lh: 1.1, alpha: eout(p(lt, .1, .7)) });
      // building
      ctx.save(); ctx.translate(540, 1000); const bw = 520, bh = 420; ctx.fillStyle = '#e6efff'; ctx.strokeStyle = C.gold; ctx.lineWidth = 3; const k = eout(p(lt, .4, 1.2)); ctx.globalAlpha *= k; ctx.fillRect(-bw / 2, -bh * k + 380, bw, bh * k); ctx.strokeRect(-bw / 2, -bh * k + 380, bw, bh * k);
      for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) { const on = Math.sin(lt * 2 + r * 1.7 + c * 2.3) > -.2 && lt > 1 + (r + c) * .08; ctx.fillStyle = on ? 'rgba(54,105,178,.78)' : 'rgba(11,27,58,.08)'; ctx.fillRect(-bw / 2 + 36 + c * 96, -bh + 380 + 40 + r * 92, 56, 58); } ctx.restore();
      const items = ['Genuine, verified owners', 'Clause-checked rental agreement', 'Photo condition report at move-in', 'WhatsApp support, when you need it'];
      items.forEach((s, i) => { const y = 1500 + i * 95, k = eout(p(lt, 1.4 + i * .5, 2 + i * .5)); ctx.save(); ctx.globalAlpha *= k; check(ctx, 130, y - 14, 44, p(lt, 1.6 + i * .5, 2.1 + i * .5), C.teal, 9); text(ctx, s, 190, y, { size: 44, weight: 600 }); ctx.restore(); });
      ctx.restore();
    }
    // scene 4 — management
    [a, b] = SC[4]; if (t >= a - .1 && t < b + .1) {
      const f = fade(t, a, b); ctx.save(); ctx.globalAlpha = f; const lt = t - a;
      text(ctx, 'PROPERTY MANAGEMENT', 90, 250, { size: 36, weight: 700, color: C.gold, alpha: eout(p(lt, 0, .5)) });
      text(ctx, 'Managed for Hyderabad’s real conditions.', 90, 340, { size: 76, weight: 700, maxW: 900, lh: 1.1, alpha: eout(p(lt, .1, .7)) });
      const tiles = [['rain', 'Monsoon audits', 'Pre & post-rain seepage checks'], ['bolt', 'Water & power', 'HMWSSB and electricity bills tracked'], ['tax', 'Tax & society', 'GHMC property tax, dues, NOCs'], ['chart', 'Owner statement', 'Rent, repairs and net — monthly']];
      tiles.forEach((tl, i) => { const k = back(p(lt, .9 + i * .45, 1.5 + i * .45)), x = 90 + (i % 2) * 460, y = 650 + Math.floor(i / 2) * 400 + (1 - k) * 60; card(ctx, x, y, 440, 360, k); ctx.save(); ctx.globalAlpha *= k; icon(ctx, tl[0], x + 80, y + 90, 76, C.gold, lt); text(ctx, tl[1], x + 36, y + 200, { size: 44, weight: 700 }); text(ctx, tl[2], x + 36, y + 252, { size: 30, weight: 400, color: C.mist, maxW: 370, lh: 1.3 }); ctx.restore(); });
      ['Let', 'Care', 'Prime NRI'].forEach((s, i) => { const k = back(p(lt, 3.4 + i * .3, 3.9 + i * .3)), w = i === 2 ? 300 : 210, x = 90 + (i === 0 ? 0 : i === 1 ? 230 : 460); ctx.save(); ctx.globalAlpha *= k; rr(ctx, x, 1500, w, 100, 50); ctx.fillStyle = i === 1 ? C.gold : 'rgba(54,105,178,.10)'; ctx.fill(); text(ctx, s, x + w / 2, 1566, { size: 44, weight: 700, align: 'center', color: i === 1 ? '#ffffff' : C.white }); ctx.restore(); });
      text(ctx, 'Plans for local owners and NRIs abroad.', 90, 1700, { size: 38, color: C.mist, weight: 500, alpha: eout(p(lt, 4.6, 5.2)) });
      ctx.restore();
    }
    // scene 5 — comparison
    [a, b] = SC[5]; if (t >= a - .1 && t < b + .1) {
      const f = fade(t, a, b); ctx.save(); ctx.globalAlpha = f; const lt = t - a;
      text(ctx, 'THE DIFFERENCE', 90, 250, { size: 36, weight: 700, color: C.gold, alpha: eout(p(lt, 0, .5)) });
      text(ctx, 'Not all “management” is management.', 90, 340, { size: 76, weight: 700, maxW: 900, lh: 1.1, alpha: eout(p(lt, .1, .7)) });
      text(ctx, 'Typical', 330, 640, { size: 36, weight: 700, color: C.mist, align: 'center', alpha: eout(p(lt, .6, 1)) }); text(ctx, 'Keetown', 760, 640, { size: 36, weight: 700, color: C.gold, align: 'center', alpha: eout(p(lt, .6, 1)) });
      const rows = [['Fees', 'Hidden markups', 'Itemised quote'], ['Screening', 'A phone call', 'ID, employer, references'], ['Visibility', '“All fine, sir”', 'Photos + monthly statement'], ['NRI support', 'Ask a relative', 'Video checks, e-sign']];
      rows.forEach((r, i) => { const y = 740 + i * 220, k = eout(p(lt, .9 + i * .5, 1.5 + i * .5)); ctx.save(); ctx.globalAlpha *= k; text(ctx, r[0].toUpperCase(), 90, y - 30, { size: 26, weight: 700, color: C.mist }); card(ctx, 90, y, 430, 150); card(ctx, 540, y, 450, 150, 1, 'rgba(54,105,178,.08)', 'rgba(54,105,178,.45)');
        cross(ctx, 140, y + 75, 26, p(lt, 1.2 + i * .5, 1.6 + i * .5)); text(ctx, r[1], 180, y + 88, { size: 34, weight: 500, color: C.mist, maxW: 320 }); check(ctx, 590, y + 78, 40, p(lt, 1.5 + i * .5, 2 + i * .5), C.teal, 8); text(ctx, r[2], 640, y + 88, { size: 34, weight: 600, maxW: 340 }); ctx.restore(); });
      ctx.restore();
    }
    // scene 6 — CTA
    [a, b] = SC[6]; if (t >= a - .1) {
      const f = clamp((t - a) / .5); ctx.save(); ctx.globalAlpha = f; const lt = t - a; sky(1, 1);
      const k = back(p(lt, .1, .8)); ctx.save(); ctx.translate(540, 470); ctx.scale(.85 + .15 * k, .85 + .15 * k); brandLogo(ctx, 0, -110, 220, clamp(k), false, 'center'); ctx.restore();
      text(ctx, 'Browse free.', 540, 780, { size: 110, weight: 700, align: 'center', alpha: eout(p(lt, .8, 1.4)) }); text(ctx, 'Verify to list.', 540, 910, { size: 110, weight: 700, align: 'center', color: C.gold, alpha: eout(p(lt, 1.1, 1.7)) });
      text(ctx, 'Login with mobile OTP · Verified with DigiLocker', 540, 1010, { size: 34, weight: 500, align: 'center', color: C.mist, alpha: eout(p(lt, 1.6, 2.2)) });
      const bk = back(p(lt, 1.9, 2.5)), pul = 1 + Math.sin(lt * 5) * .02; ctx.save(); ctx.translate(540, 1180); ctx.scale(bk * pul, bk * pul); rr(ctx, -380, -70, 760, 140, 70); ctx.fillStyle = C.wa; ctx.fill(); text(ctx, 'Message us on WhatsApp', 0, 14, { size: 50, weight: 700, align: 'center', color: '#ffffff' }); ctx.restore();
      text(ctx, KT.brand.phoneDisplay, 540, 1330, { size: 52, weight: 700, align: 'center', alpha: eout(p(lt, 2.4, 3)) });
      text(ctx, 'Hyderabad · Buy · Rent · Sell · Manage', 540, 1400, { size: 34, weight: 500, align: 'center', color: C.mist, alpha: eout(p(lt, 2.6, 3.2)) });
      text(ctx, KT.brand.reraNo, 540, 1850, { size: 24, weight: 400, align: 'center', color: 'rgba(11,27,58,.5)' });
      ctx.restore();
    }
    // progress bar
    ctx.fillStyle = 'rgba(11,27,58,.10)'; ctx.fillRect(0, H - 8, W, 8); ctx.fillStyle = C.gold; ctx.fillRect(0, H - 8, W * (t / DUR), 8);
  }
  return { C, FONT, clamp, p, eio, eout, back, rr, text, check, cross, logo, brandLogo, bg, skyline, charminar, card, icon, isoBox, drawReel, W, H, DUR };
})();
