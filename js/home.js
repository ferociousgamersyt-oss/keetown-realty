/* Keetown premium homepage. */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { properties, localities, loc, fmt, url } = KT, M = KTMotion, reduce = M.reduce;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hasGSAP = !!(window.gsap && window.ScrollTrigger); if (hasGSAP) { gsap.registerPlugin(ScrollTrigger); ScrollTrigger.config({ ignoreMobileResize: true }); }
  // always start at the top so pinned/scrubbed sections measure correctly
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; if (!location.hash) scrollTo(0, 0);
  if (window.KTInv) KTInv.mergePublic();   // homepage collection shows what is actually on the market
  const K = window.KP, H = window.KAds && KAds.H;
  const onScreen = (el, cb) => new IntersectionObserver(([e]) => cb(e.isIntersecting), { rootMargin: '100px' }).observe(el);

  /* ---------------- static wiring ---------------- */
  $('#cPhone').textContent = KT.brand.phoneDisplay; $('#fRera').textContent = KT.brand.reraNo;

  /* ---------------- intro + start ---------------- */
  M.start().then(() => hasGSAP && ScrollTrigger.refresh());   // hero text is visible at once (no intro curtain) for speed and search

  /* ---------------- nav ---------------- */
  const nav = $('#hnav'); let lastY = 0;
  const onScroll = y => { nav.classList.toggle('scrolled', y > 40); nav.classList.toggle('hide', y > 400 && y > lastY && !nav.classList.contains('menu')); lastY = y; };
  addEventListener('scroll', () => onScroll(scrollY), { passive: true });
  $('#burger').onclick = () => { const o = $('#navLinks').classList.toggle('open'); nav.classList.toggle('menu', o); $('#burger').setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : ''; };
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => { $('#navLinks').classList.remove('open'); nav.classList.remove('menu'); document.body.style.overflow = ''; }));

  /* ---------------- marquee (speeds up with scroll) ---------------- */
  (function marquee() {
    const t = $('#mq'), items = localities.map(l => `<span>${esc(l.name.replace(' / HITEC City', ''))}</span><i>·</i>`).join(''); t.innerHTML = items + items;
    if (reduce) return; let x = 0, v = 0, prev = scrollY, w = 0; const measure = () => w = t.scrollWidth / 2; measure(); addEventListener('resize', measure);
    let vis = true; onScreen(t, s => vis = s);
    (function tick() { const dy = scrollY - prev; prev = scrollY; v += (Math.abs(dy) * .15 - v) * .1; if (vis) { x -= .6 + v; if (-x >= w) x += w; t.style.transform = `translate3d(${x}px,0,0)`; } requestAnimationFrame(tick); })();
  })();

  /* ---------------- statement: words light up as you scroll ---------------- */
  (function statement() {
    const el = $('.statement'); el.innerHTML = el.textContent.split(' ').map(w => `<span class="wd">${esc(w)}</span>`).join(' ');
    const wds = $$('.wd', el); let lit = 0; if (reduce || !hasGSAP) { wds.forEach(w => w.style.opacity = 1); return; }
    ScrollTrigger.create({ trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true, onUpdate: s => { const n = Math.round(s.progress * wds.length); if (n === lit) return; for (let i = Math.min(n, lit); i < Math.max(n, lit); i++) wds[i].style.opacity = i < n ? 1 : .14; lit = n; } });
  })();

  /* ---------------- collection carousel ---------------- */
  const track = $('#track'), cursor = $('#cursor');
  function collection(mode) {
    const list = properties.filter(p => p.mode === mode && p.type !== 'Commercial').sort((a, b) => (b.prime - a.prime) || (b.verified - a.verified) || (b.price - a.price)).slice(0, 8);
    track.innerHTML = list.map(p => { const l = loc(p.loc); return `<a class="pcard" href="${url.property(p)}"><div class="pc-img">${KTArt({ ...p, id: p.id + 'h' }, 400, 500)}<div class="pc-tags">${p.prime ? '<span>Prime</span>' : ''}${p.verified ? '<span>Verified</span>' : ''}</div><div class="pc-price">${fmt.price(p)}</div></div><div class="pc-body"><p class="pc-loc">${esc(l.name)}</p><h3>${esc(p.title)}</h3><div class="pc-spec"><span>${fmt.bhk(p)}</span><span>${p.area.toLocaleString('en-IN')} ${p.unit}</span>${p.facing !== '—' ? `<span>${p.facing} facing</span>` : ''}</div></div></a>`; }).join('');
    track.scrollLeft = 0;
    if (!reduce) $$('.pcard', track).forEach((c, i) => c.animate([{ opacity: 0, transform: 'translateX(40px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: i * 70, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
    hoverCursor();
  }
  $$('.ctabs button').forEach(b => b.onclick = () => { $$('.ctabs button').forEach(x => x.setAttribute('aria-selected', x === b)); collection(b.dataset.mode); });
  const step = () => (track.querySelector('.pcard')?.offsetWidth || 360) + 24;
  $('#prev').onclick = () => track.scrollBy({ left: -step(), behavior: 'smooth' }); $('#next').onclick = () => track.scrollBy({ left: step(), behavior: 'smooth' });
  (function drag() { let down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = track.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 4) { moved = true; track.classList.add('drag'); } track.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { if (!down) return; down = false; setTimeout(() => track.classList.remove('drag'), 0); });
    track.addEventListener('click', e => { if (moved) { e.preventDefault(); moved = false; } }, true); })();
  function hoverCursor() {
    if (matchMedia('(hover:none)').matches) return;
    $$('.pcard').forEach(c => { c.onmouseenter = () => { cursor.classList.add('on'); if (!following) { following = true; kx = cx; ky = cy; requestAnimationFrame(follow); } }; c.onmouseleave = () => cursor.classList.remove('on'); });
  }
  let cx = 0, cy = 0, kx = 0, ky = 0, following = false;
  function follow() { kx += (cx - kx) * .2; ky += (cy - ky) * .2; cursor.style.translate = `${kx}px ${ky}px`; if (cursor.classList.contains('on') || Math.abs(cx - kx) + Math.abs(cy - ky) > .5) requestAnimationFrame(follow); else following = false; }
  addEventListener('pointermove', e => { cx = e.clientX; cy = e.clientY; if (!following && cursor.classList.contains('on')) { following = true; requestAnimationFrame(follow); } }, { passive: true });
  collection('sale');

  /* ---------------- story: scroll-scrubbed motion graphics ---------------- */
  (function story() {
    const cv = $('#storyCv'); if (!cv || !K || !K.SCENEFNS) return; const ctx = cv.getContext('2d'); K.noCaption = true;
    const MAP = [0, 1, 2, 4, 5], steps = $$('.step'), dots = $('#stageDots'); dots.innerHTML = MAP.map(() => '<i></i>').join('');
    const dur = i => K.SCENES[MAP[i]][1] - K.SCENES[MAP[i]][0];
    let curI = -1;
    function draw(i, lt) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.save(); ctx.translate(0, -440); K.SCENEFNS[MAP[i]](ctx, lt); ctx.restore();
      if (i !== curI) { curI = i; steps.forEach((s, j) => s.classList.toggle('on', j === i)); $$('i', dots).forEach((d, j) => d.classList.toggle('on', j === i)); }
    }
    if (reduce || !hasGSAP) { draw(0, dur(0) - .5); steps.forEach(s => s.classList.add('on')); return; }
    draw(0, .2);
    let want = 0, drawn = -1, queued = false;
    ScrollTrigger.create({ trigger: '.story-steps', start: 'top 55%', end: 'bottom 60%', scrub: .6,
      onUpdate: s => { want = s.progress; if (!queued) { queued = true; requestAnimationFrame(paint); } } });
    function paint() { queued = false; if (Math.abs(want - drawn) < .0015) return; drawn = want; const f = Math.min(MAP.length - .001, want * MAP.length), i = Math.floor(f), local = f - i; draw(i, Math.min(dur(i) - .35, .25 + local * 1.25 * dur(i))); }
  })();

  /* ---------------- localities: pinned horizontal reel ---------------- */
  (function locs() {
    const rail = $('#locRail'), lo = Math.min(...localities.map(l => l.sale[0])), hi = Math.max(...localities.map(l => l.sale[1]));
    rail.innerHTML = localities.map((l, i) => `<a class="lcard2" href="${url.locality(l)}"><svg class="lc2-pin" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="14" fill="none" stroke="#a9c4ee" stroke-width="1.5"/><circle cx="22" cy="22" r="4" fill="#a9c4ee"/></svg>
      <div><span class="lc2-n">${String(i + 1).padStart(2, '0')}</span><div class="lc2-name">${esc(l.name.replace(' / HITEC City', ''))}</div><div class="lc2-zone">${esc(l.zone)}</div></div>
      <div class="lc2-band"><small>Apartments · per sq.ft</small><b>₹${l.sale[0].toLocaleString('en-IN')} – ₹${l.sale[1].toLocaleString('en-IN')}</b><div class="lc2-bar"><i style="left:${(l.sale[0] - lo) / (hi - lo) * 100}%;width:${Math.max(3, (l.sale[1] - l.sale[0]) / (hi - lo) * 100)}%"></i></div><small>2BHK rent ₹${l.rent2[0]}k–${l.rent2[1]}k · yield ~${l.yield}%</small></div>
      <span class="lc2-go">Read the guide →</span></a>`).join('');
    // no pinning: the page never stops; the rail is a swipe/drag carousel instead
    rail.classList.add('free'); rail.style.overflowX = 'auto'; rail.style.width = 'auto'; rail.style.scrollSnapType = 'x proximity';
    let down = false, sx = 0, sl = 0;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; sx = e.clientX; sl = rail.scrollLeft; rail.style.scrollSnapType = 'none'; });
    addEventListener('pointermove', e => { if (down) rail.scrollLeft = sl - (e.clientX - sx); });
    addEventListener('pointerup', () => { if (down) { down = false; rail.style.scrollSnapType = 'x proximity'; } });
    return;
    gsap.to(rail, { x: () => -(rail.scrollWidth - innerWidth), ease: 'none', scrollTrigger: { trigger: '#locs', start: 'top top', end: () => '+=' + (rail.scrollWidth - innerWidth), pin: '.locs-pin', scrub: .8, anticipatePin: 1, invalidateOnRefresh: true } });
  })();

  /* ---------------- management sparkline ---------------- */
  onScreen($('.dash2'), v => { if (v) { const l = $('.sp-line'); if (reduce) l.style.strokeDashoffset = 0; else l.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1800, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' }); } });

  /* ---------------- calculator ---------------- */
  (function calc() {
    const g = id => +$('#' + id).value, o = (id, v) => $('#' + id).textContent = v, inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
    const run = () => { const price = g('cPrice'), dp = g('cDown'), r = g('cRate') / 1200, n = g('cYears') * 12, loan = price * 1e5 * (1 - dp / 100), emi = loan * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
      o('oPrice', fmt.lakh(price)); o('oDown', dp + '%'); o('oRate', g('cRate').toFixed(2) + '%'); o('oYears', g('cYears') + ' yrs'); o('rEmi', inr(emi)); o('rCash', fmt.lakh(Math.round((price * dp / 100 + price * KT.registrationRate) * 100) / 100)); };
    $$('.calc-card input').forEach(i => i.oninput = run); run();
  })();

  /* ---------------- CTA: flowing contours ---------------- */
  (function cta() {
    const cv = $('#ctaCv'), ctx = cv.getContext('2d'); let W, Ht, dpr, vis = false; const size = () => { dpr = Math.min(1.5, devicePixelRatio || 1); W = cv.clientWidth; Ht = cv.clientHeight; cv.width = W * dpr; cv.height = Ht * dpr; }; size(); addEventListener('resize', size);
    const t0 = performance.now();
    let lastC = 0;
    function draw(now) {
      if (vis && !reduce && now - lastC < 33) { requestAnimationFrame(draw); return; } lastC = now;
      const t = reduce ? 0 : (now - t0) / 1000; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, Ht);
      for (let k = 0; k < 22; k++) { ctx.beginPath(); for (let x = -10; x <= W + 10; x += 16) { const y = Ht * .08 + k * Ht / 21 + Math.sin(x * .004 + k * .5 + t * .25) * 28 + Math.sin(x * .011 - k * .3 - t * .18) * 10; x < 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.strokeStyle = `rgba(169,196,238,${k % 5 === 0 ? .2 : .07})`; ctx.lineWidth = k % 5 === 0 ? 1.4 : 1; ctx.stroke(); }
      if (vis && !reduce) requestAnimationFrame(draw);
    }
    onScreen(cv, v => { vis = v; if (v) requestAnimationFrame(draw); }); requestAnimationFrame(draw);
  })();

  if (hasGSAP) { addEventListener('load', () => ScrollTrigger.refresh()); document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh()); }
})();
