/* Keetown premium homepage. */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { properties, localities, loc, fmt, url } = KT, M = KTMotion, reduce = M.reduce;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hasGSAP = !!(window.gsap && window.ScrollTrigger); if (hasGSAP) { gsap.registerPlugin(ScrollTrigger); ScrollTrigger.config({ ignoreMobileResize: true }); }
  // always start at the top so pinned/scrubbed sections measure correctly
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; if (!location.hash) scrollTo(0, 0);
  const K = window.KP, H = window.KAds && KAds.H;
  const onScreen = (el, cb) => new IntersectionObserver(([e]) => cb(e.isIntersecting), { rootMargin: '100px' }).observe(el);

  /* ---------------- static wiring ---------------- */
  $('#cPhone').textContent = KT.brand.phoneDisplay; $('#fRera').textContent = KT.brand.reraNo;
  $$('.hero-facts [data-count]')[1].dataset.count = properties.length;
  localities.forEach(l => $('#fLoc').add(new Option(l.name, l.id)));

  /* ---------------- intro + start ---------------- */
  const intro = $('#intro'), first = !sessionStorage.getItem('kt_intro');
  function go() {
    M.start().then(() => hasGSAP && ScrollTrigger.refresh());
    if (!reduce) {
      const h1 = $('.hero2 [data-split]'); M.split(h1); M.revealSplit(h1, 150);
      $$('.hero2 [data-fade]').forEach((el, i) => M.revealFade(el, 500 + i * 140));
    }
  }
  if (first && !reduce) { sessionStorage.setItem('kt_intro', 1); setTimeout(() => { intro.classList.add('out'); setTimeout(() => intro.classList.add('gone'), 1000); go(); }, 1250); }
  else { intro.classList.add('gone'); go(); }

  /* ---------------- nav ---------------- */
  const nav = $('#hnav'); let lastY = 0;
  const onScroll = y => { nav.classList.toggle('scrolled', y > 40); nav.classList.toggle('hide', y > 400 && y > lastY && !nav.classList.contains('menu')); lastY = y; };
  addEventListener('scroll', () => onScroll(scrollY), { passive: true });
  $('#burger').onclick = () => { const o = $('#navLinks').classList.toggle('open'); nav.classList.toggle('menu', o); $('#burger').setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : ''; };
  $$('#navLinks a').forEach(a => a.addEventListener('click', () => { $('#navLinks').classList.remove('open'); nav.classList.remove('menu'); document.body.style.overflow = ''; }));

  /* ---------------- finder ---------------- */
  const f = $('#finder'), thumb = $('.f-thumb'), BUD = { buy: [[50, '₹50 L'], [100, '₹1 Cr'], [200, '₹2 Cr'], [300, '₹3 Cr'], [500, '₹5 Cr']], rent: [[20000, '₹20,000'], [30000, '₹30,000'], [50000, '₹50,000'], [75000, '₹75,000'], [100000, '₹1,00,000']], commercial: [[50, '₹50 L / ₹50k'], [100, '₹1 Cr / ₹1 L'], [500, '₹5 Cr']] };
  function intent() {
    const v = f.intent.value, lab = $(`.f-intent input[value="${v}"]`).parentElement;
    thumb.style.width = lab.offsetWidth + 'px'; thumb.style.transform = `translateX(${lab.offsetLeft - 4}px)`;
    $('#fBud').innerHTML = '<option value="">Any budget</option>' + BUD[v].map(([a, t]) => `<option value="${a}">Up to ${t}</option>`).join('');
  }
  $$('.f-intent input').forEach(i => i.onchange = intent); requestAnimationFrame(intent); addEventListener('load', intent); addEventListener('resize', intent);
  f.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(f)), q = new URLSearchParams({ intent: d.intent }); if (d.loc) q.set('loc', d.loc); if (d.bmax) q.set('bmax', d.bmax); if (d.beds) q.set('beds', d.beds === '4' ? '4,5' : d.beds); location.href = 'properties.html?' + q; };

  /* ---------------- hero: services by client type ---------------- */
  (function services() {
    const S = {
      tenant: { t: 'Rent a verified home, then live in it without hassle.', l: ['Verified owners and homes', 'Prime matches to your budget and commute', 'Agreement and police verification', 'Rent reminders, UPI pay and HRA receipts', 'Repair requests the owner sees instantly'], search: 'rent', cta: [['login.html?role=tenant', 'Get prime matches']] },
      buyer: { t: 'Buy with every paper checked before you pay a token.', l: ['Legal-first title and approval checks', 'Planned site visits', 'EMI and 6% registration planned upfront', 'Payment milestones tracked to possession', 'Handover and mutation checklist'], search: 'buy', cta: [['login.html?role=buyer', 'Tell us what you need']] },
      owner: { t: 'Own it. Don’t worry about it. Complete property management.', l: ['Tenant sourcing, rent collection and renewals', 'Maintenance, repairs and vendor coordination', 'Utilities, tax and documentation support', 'Regular statements, clear visibility', 'NRI concierge with video inspections'], cta: [['management.html', 'See management plans'], ['post-property.html', 'Post property free']] },
      seller: { t: 'Secondary sales: the right price, verified buyers, clean paperwork.', l: ['Owner-side pricing guidance', 'Buyer matching with verified buyers', 'Legal and documentation coordination', 'Support through to registration', 'Every offer tracked in your portal'], cta: [['post-property.html', 'List your property free'], ['login.html?role=seller', 'Get a price opinion']] },
      builder: { t: 'Primary sales: developer partnerships that sell launches.', l: ['Project launches and curated inventory', 'RERA-checked listings', 'Verified buyer leads', 'Site visits coordinated', 'End-to-end booking support'], cta: [['login.html?role=builder', 'Partner with us']] },
      community: { t: 'An exclusive desk for your gated community.', l: ['Exclusive Rental Desk: listing, screening, onboarding', 'Exclusive Secondary Sales Desk for resident homes', 'Controlled, resident-friendly visits', 'Respect for residents, owners and RWAs', 'Property management for owners'], cta: [['#', 'Talk to us about a community desk']], wa: 'Hi Keetown Realty, I would like to discuss an exclusive rental / resale desk for our gated community.' },
      company: { t: 'Relocate employees and find office space with one partner.', l: ['Employee relocation, door to door', 'Temporary stay and verified homes', 'Managed offices and leased floors', 'Company-leased housing and its management', 'One portal for HR to track every move'], cta: [['business.html', 'Keetown for Business'], ['login.html?role=company', 'Company login']] }
    };
    const tabs = $$('.svc2-tabs [data-c]'), list = $('#svcList'), title = $('#svcT'), cta = $('#svcCta');
    function show(k, focus) {
      const d = S[k]; tabs.forEach(b => { const on = b.dataset.c === k; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
      title.textContent = d.t; list.innerHTML = d.l.map(x => `<li>${esc(x)}</li>`).join('');
      cta.innerHTML = d.cta.map(([h, t], i) => `<a class="${i || d.search ? 'svc2-ln' : 'f-go svc2-go'}" href="${d.wa && !i ? KT.wa(d.wa) : h}"${d.wa && !i ? ' target="_blank" rel="noopener"' : ''}>${esc(t)}${i || d.search ? ' →' : ''}</a>`).join('');
      f.hidden = !d.search; $('#svc2').classList.toggle('search', !!d.search);
      if (d.search) { const r = f.querySelector(`.f-intent input[value="${d.search}"]`); r.checked = true; intent(); }
      if (!reduce) $('#svcPanel').animate([{ opacity: .3, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
    tabs.forEach((b, i) => { b.onclick = () => show(b.dataset.c); b.onkeydown = e => { const n = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (n) { e.preventDefault(); show(tabs[(i + n + tabs.length) % tabs.length].dataset.c, true); } }; });
    show('tenant');
  })();

  /* ---------------- hero: living isometric Hyderabad ---------------- */
  (function hero() {
    const cv = $('#city'); if (!cv || !H) return; const ctx = cv.getContext('2d');
    let W, Ht, dpr, mob; const size = () => { dpr = Math.min(1.5, devicePixelRatio || 1); W = cv.clientWidth; Ht = cv.clientHeight; cv.width = W * dpr; cv.height = Ht * dpr; mob = W < 900; snapOk = false; };
    const snap = document.createElement('canvas'), sc = snap.getContext('2d'); let snapOk = false; size(); addEventListener('resize', size);
    let tx = 0, ty = 0, mx = 0, my = 0; $('#hero').addEventListener('pointermove', e => { tx = e.clientX / innerWidth - .5; ty = e.clientY / innerHeight - .5; });
    const P = Array.from({ length: 46 }, (_, i) => { const r = Math.sin(i * 91.7) * 1e4; const q = r - Math.floor(r); return { x: (Math.sin(i * 12.9) + 1) / 2, y: q, s: .4 + ((i * 37) % 10) / 10, v: .004 + q * .01, p: i }; });
    let vis = true; onScreen($('#hero'), v => { vis = v; if (v) requestAnimationFrame(loop); });
    const t0 = performance.now(); let last = 0;
    const geo = () => { const s = Math.min(W / 1440, Ht / 900) * (mob ? .62 : .8); return { s, cx: mob ? W * .62 : W * .77, by: mob ? Ht * .98 : Ht * .84 }; };
    function drawCity(c, t) { const g = geo(); return H.city(c, g.cx, g.by, g.s, t, .4, { n: 4, seed: 9, tall: 1.25, pin: false }); }
    function loop(now) {
      if (!vis) return; if (now - last < 33) { requestAnimationFrame(loop); return; } last = now;
      const t = reduce ? 6 : (now - t0) / 1000; mx += (tx - mx) * .06; my += (ty - my) * .06;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, Ht);
      // drifting lights
      P.forEach(p => { const y = ((p.y - t * p.v * .4) % 1 + 1) % 1, x = p.x * W + Math.sin(t * .4 + p.p) * 14 + mx * 20 * p.s; const a = .15 + .35 * (.5 + .5 * Math.sin(t * 1.3 + p.p)); ctx.fillStyle = `rgba(169,196,238,${a * p.s})`; ctx.beginPath(); ctx.arc(x, y * Ht, 1.1 + p.s, 0, 7); ctx.fill(); });
      const g = geo();
      // glow under the city
      const gl = ctx.createRadialGradient(g.cx, g.by - 120 * g.s, 0, g.cx, g.by - 120 * g.s, 520 * g.s); gl.addColorStop(0, 'rgba(54,105,178,.45)'); gl.addColorStop(1, 'rgba(54,105,178,0)'); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, Ht);
      ctx.save(); ctx.translate(mx * -26, my * -14); if (mob) ctx.globalAlpha = .42;
      let pinAt;
      if (t < 3.2) pinAt = drawCity(ctx, t);           // rising: draw live
      else {                                            // settled: cache a snapshot, refresh for window twinkle
        if (!snapOk) { snap.width = cv.width; snap.height = cv.height; sc.setTransform(dpr, 0, 0, dpr, 0, 0); snap.pin = drawCity(sc, t); snapOk = true; }   // draw the settled city once, then reuse it
        ctx.setTransform(1, 0, 0, 1, mx * -26 * dpr, my * -14 * dpr); ctx.drawImage(snap, 0, 0); ctx.setTransform(dpr, 0, 0, dpr, mx * -26 * dpr, my * -14 * dpr); pinAt = snap.pin;
      }
      if (pinAt && t > 1.6) { const k = Math.min(1, (t - 1.6) / .6), bob = Math.sin(t * 2.2) * 9; ctx.beginPath(); ctx.ellipse(pinAt[0], pinAt[1] - 6, 26 * g.s * (1 + .2 * Math.sin(t * 2.2)), 9 * g.s, 0, 0, 7); ctx.fillStyle = 'rgba(169,196,238,.35)'; ctx.fill(); H.pin(ctx, pinAt[0], pinAt[1] - 18 * g.s - bob - (1 - k) * 200, 2.3 * g.s, '#ffffff'); }
      ctx.restore();
      if (!reduce) requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  })();

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
    ScrollTrigger.create({ trigger: '.story-steps', start: 'top 55%', end: 'bottom 60%', scrub: .6,
      onUpdate: s => { want = s.progress; if (!queued) { queued = true; requestAnimationFrame(paint); } } });
    let want = 0, drawn = -1, queued = false;
    function paint() { queued = false; if (Math.abs(want - drawn) < .0015) return; drawn = want; const f = Math.min(MAP.length - .001, want * MAP.length), i = Math.floor(f), local = f - i; draw(i, Math.min(dur(i) - .35, .25 + local * 1.25 * dur(i))); }
  })();

  /* ---------------- localities: pinned horizontal reel ---------------- */
  (function locs() {
    const rail = $('#locRail'), lo = Math.min(...localities.map(l => l.sale[0])), hi = Math.max(...localities.map(l => l.sale[1]));
    rail.innerHTML = localities.map((l, i) => `<a class="lcard2" href="${url.locality(l)}"><svg class="lc2-pin" viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="14" fill="none" stroke="#a9c4ee" stroke-width="1.5"/><circle cx="22" cy="22" r="4" fill="#a9c4ee"/></svg>
      <div><span class="lc2-n">${String(i + 1).padStart(2, '0')}</span><div class="lc2-name">${esc(l.name.replace(' / HITEC City', ''))}</div><div class="lc2-zone">${esc(l.zone)}</div></div>
      <div class="lc2-band"><small>Apartments · per sq.ft</small><b>₹${l.sale[0].toLocaleString('en-IN')} – ₹${l.sale[1].toLocaleString('en-IN')}</b><div class="lc2-bar"><i style="left:${(l.sale[0] - lo) / (hi - lo) * 100}%;width:${Math.max(3, (l.sale[1] - l.sale[0]) / (hi - lo) * 100)}%"></i></div><small>2BHK rent ₹${l.rent2[0]}k–${l.rent2[1]}k · yield ~${l.yield}%</small></div>
      <span class="lc2-go">Read the guide →</span></a>`).join('');
    if (reduce || !hasGSAP || innerWidth < 1000) { rail.style.overflowX = 'auto'; rail.style.width = 'auto'; rail.style.scrollSnapType = 'x mandatory'; return; }
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
