/* Homepage hero: a live, clickable version of the ad. Each client tab plays a short demo where a cursor uses
 * the product (find matches, run a legal check, drop a CSV, lock and approve a home…). It cycles on its own until
 * the visitor picks a tab. All text is real HTML so search engines read every service. */
(function () {
  const stage = document.getElementById('khStage'); if (!stage) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const tabs = $$('.kh-tabs [data-k]'), panels = $$('.kp', stage), cur = $('#khCursor'), bar = $('.kh-prog i');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // demo scripts: [action, target, class to add after, wait ms before next]
  const S = {
    tenants: [['click', '[data-click]', 's2', 1500], ['wait', null, 's3', 1800]],
    buyers: [['click', '[data-click]', 's2', 1500], ['wait', null, 's3', 1800]],
    owners: [['wait', null, 's2', 1200], ['wait', null, 's3', 2200]],
    sellers: [['click', '[data-click]', 's2', 1300], ['wait', null, 's3', 2000]],
    builders: [['drag', '.kcsv', 's2', 1500], ['wait', null, 's3', 2000]],
    companies: [['click', '[data-lock]', 's2', 1300], ['click', '[data-approve]', 's3', 2000]],
    communities: [['wait', null, 's2', 1300], ['wait', null, 's3', 2200]]
  };
  const ORDER = tabs.map(t => t.dataset.k);
  let k = ORDER[0], auto = !reduce, run = 0, pos = { x: 0, y: 0 }, timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const center = el => { const a = el.getBoundingClientRect(), b = stage.getBoundingClientRect(); return { x: a.left - b.left + a.width * .6, y: a.top - b.top + a.height * .55 }; };
  function moveTo(p, ms = 700) { const from = `translate(${pos.x}px,${pos.y}px)`, to = `translate(${p.x}px,${p.y}px)`; pos = p; cur.style.opacity = 1; return cur.animate([{ transform: from }, { transform: to }], { duration: ms, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }).finished; }
  function click(el) { cur.classList.remove('click'); void cur.offsetWidth; cur.classList.add('click'); el.classList.add('press'); setTimeout(() => el.classList.remove('press'), 220); }

  async function play(panel, id) {
    const steps = S[panel.dataset.k] || []; let total = 900;
    for (const [act, sel, cls, wait] of steps) total += wait + (act === 'wait' ? 0 : 800);
    if (bar) { bar.getAnimations().forEach(a => a.cancel()); if (auto) bar.animate([{ width: '0%' }, { width: '100%' }], { duration: total + 2200, fill: 'forwards' }); else bar.style.width = '0'; }
    const r = stage.getBoundingClientRect(); pos = { x: r.width + 20, y: r.height * .8 }; cur.style.opacity = 0;
    await new Promise(res => later(res, 900)); if (id !== run) return;
    for (const [act, sel, cls, wait] of steps) {
      const el = sel && panel.querySelector(sel);
      if (act === 'click' && el) { await moveTo(center(el)); if (id !== run) return; click(el); }
      if (act === 'drag' && el) { const drop = panel.querySelector('.kdrop'); await moveTo(center(el)); if (id !== run) return; click(el);
        const a = center(el), b = center(drop); el.animate([{ transform: 'none' }, { transform: `translate(${b.x - a.x}px,${b.y - a.y}px) rotate(3deg)` }], { duration: 750, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }); await moveTo(b, 750); if (id !== run) return; el.getAnimations().forEach(x => x.cancel()); }
      panel.classList.add(cls); if (cls === 's2') { const li = panel.querySelector('[data-lock]'); if (li) { li.closest('li').classList.add('locked'); li.textContent = 'Locked ✓'; } }
      if (cls === 's3') { const ap = panel.querySelector('[data-approve]'); if (ap) ap.textContent = '✓ Approved'; }
      await new Promise(res => later(res, wait)); if (id !== run) return;
    }
    cur.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    if (auto) later(() => { if (id === run) show(ORDER[(ORDER.indexOf(k) + 1) % ORDER.length]); }, 2200);
  }
  function reset(panel) { panel.classList.remove('on', 's2', 's3'); const li = panel.querySelector('[data-lock]'); if (li) { li.closest('li').classList.remove('locked'); li.textContent = 'Lock'; } const ap = panel.querySelector('[data-approve]'); if (ap) ap.textContent = 'Approve'; panel.querySelectorAll('.kcsv').forEach(e => e.getAnimations().forEach(a => a.cancel())); }
  function show(next, user) {
    clear(); run++; if (user) auto = false; k = next;
    tabs.forEach(t => { const on = t.dataset.k === k; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; if (on && user === 'key') t.focus(); });
    panels.forEach(p => { const on = p.dataset.k === k; reset(p); p.hidden = !on; if (on) { void p.offsetWidth; p.classList.add('on'); } });
    const panel = panels.find(p => p.dataset.k === k);
    if (reduce) { panel.classList.add('s2', 's3'); cur.style.opacity = 0; return; }
    play(panel, run);
  }
  tabs.forEach((t, i) => { t.onclick = () => show(t.dataset.k, true); t.onkeydown = e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); show(ORDER[(i + d + ORDER.length) % ORDER.length], 'key'); } }; });
  // replay a tab's demo when the visitor clicks inside it
  stage.addEventListener('click', e => { if (e.target.closest('a')) return; auto = false; show(k); });
  // only run while the hero is on screen
  let started = false; new IntersectionObserver(([en]) => { if (en.isIntersecting && !started) { started = true; show(k); } else if (!en.isIntersecting) { clear(); run++; } else if (started) show(k); }, { threshold: .25 }).observe(stage);
  const want = new URLSearchParams(location.search).get('for'); if (want && ORDER.includes(want)) k = want;
})();
/* How we help cards: rise in as they scroll into view (and never stay hidden) */
(function () {
  const cards = [...document.querySelectorAll('.hw')]; if (!cards.length) return;
  const show = c => c.classList.add('in');
  if (!('IntersectionObserver' in window)) return cards.forEach(show);
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { threshold: .15 });
  cards.forEach(c => io.observe(c)); setTimeout(() => cards.forEach(show), 4000);
})();
