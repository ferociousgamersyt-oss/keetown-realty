/* Site-wide motion: smooth scroll, line reveals, fade-ups, counters, page transitions.
 * Honours prefers-reduced-motion (everything renders statically). No dependency required;
 * uses GSAP/Lenis when present. */
window.KTMotion = (function () {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  if (!reduce) root.classList.add('motion');
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ease = 'cubic-bezier(.22,1,.36,1)';

  /* smooth scroll */
  let lenis = null;
  // Native scrolling everywhere: no scroll hijacking, so scrolling never lags or pauses. (Lenis kept off on purpose.)
  if (false) {
    lenis = new Lenis({ lerp: .14, smoothWheel: true, wheelMultiplier: 1, syncTouch: false });   // light smoothing: follows the wheel closely, native touch scrolling
    if (window.gsap && window.ScrollTrigger) { lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0); }
    else { const raf = t => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf); }
    document.addEventListener('click', e => { const a = e.target.closest('a[href^="#"]'); if (!a || a.getAttribute('href').length < 2) return; const el = document.querySelector(a.getAttribute('href')); if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -70 }); } });
  }

  /* split headings into masked lines */
  function split(el) {
    if (el.dataset.splitDone) return; el.dataset.splitDone = 1;
    const words = [];
    const walk = (n, wrapEm) => [...n.childNodes].forEach(c => {
      if (c.nodeType === 3) c.textContent.split(/(\s+)/).forEach(t => { if (!t) return; if (!t.trim()) { words.push(document.createTextNode(' ')); return; } const s = document.createElement('span'); s.className = 'w8'; if (wrapEm) { const em = document.createElement('em'); em.textContent = t; s.append(em); } else s.textContent = t; words.push(s); });
      else if (c.nodeName === 'BR') words.push('BR');
      else if (c.nodeName === 'EM') walk(c, true); else walk(c, wrapEm);
    });
    walk(el, false); el.innerHTML = '';
    words.forEach(w => { if (w === 'BR') el.append(document.createElement('br')); else el.append(w); });
    // group by rendered line
    const spans = $$('.w8', el), lines = []; let top = null, cur;
    spans.forEach(s => { const t = s.offsetTop; if (t !== top) { cur = []; lines.push(cur); top = t; } cur.push(s); });
    el.innerHTML = lines.map(l => `<span class="ln"><span>${l.map(s => s.outerHTML).join(' ')}</span></span>`).join('');
  }
  function revealSplit(el, delay = 0) {
    $$('.ln > span', el).forEach((s, i) => s.animate([{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }], { duration: 1100, delay: delay + i * 110, easing: ease, fill: 'forwards' }));
  }
  function revealFade(el, delay = 0) { el.animate([{ opacity: 0, transform: 'translateY(28px)' }, { opacity: 1, transform: 'none' }], { duration: 1000, delay, easing: ease, fill: 'forwards' }); }
  function count(el) {
    const n = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '', t0 = performance.now(), d = 1600;
    if (reduce) { el.textContent = pre + n.toLocaleString('en-IN') + suf; return; }
    const step = now => { const p = Math.min(1, (now - t0) / d), e = 1 - Math.pow(1 - p, 4); el.textContent = pre + Math.round(n * e).toLocaleString('en-IN') + suf; if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  // auto-tag common blocks on content pages
  const AUTO = '.pg .pd-sec, .pg .lst-head, .stats > div, .lgrid > .lcard, .nears > .near, .pg .faq details, .pg .grid > .card, .lc-hero > *';
  async function start() {
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) {} }
    if (!reduce) $$(AUTO).forEach(el => { if (!el.closest('#lgrid, #results, .portal-body')) el.setAttribute('data-fade', ''); });
    $$('[data-split]').forEach(el => { if (!reduce) split(el); });
    const seen = new WeakSet();
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting || seen.has(en.target)) return; seen.add(en.target); io.unobserve(en.target);
      const el = en.target, sib = el.parentElement ? [...el.parentElement.children].filter(x => x.hasAttribute('data-fade')).indexOf(el) : 0;
      if (el.hasAttribute('data-split')) { if (!reduce) revealSplit(el); }
      if (el.hasAttribute('data-fade')) { if (!reduce) revealFade(el, Math.max(0, sib) * 90); }
      $$('[data-count]', el).concat(el.dataset.count ? [el] : []).forEach(count);
    }), { rootMargin: '0px 0px -8% 0px', threshold: .12 });
    $$('[data-split], [data-fade], [data-count]').forEach(el => io.observe(el));
    requestAnimationFrame(() => curtain.classList.remove('in'));
  }

  /* page transitions (same-origin navigations) */
  const curtain = document.createElement('div'); curtain.className = 'pt-curtain' + (reduce || document.body.classList.contains('home') ? '' : ' in'); curtain.setAttribute('aria-hidden', 'true'); document.body.append(curtain);
  if (!reduce) {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (a.target === '_blank' || a.hasAttribute('download') || a.dataset.noTransition != null) return;
      const url = new URL(a.href, location.href); if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
      if (!/\.html$|\/$/.test(url.pathname)) return;
      e.preventDefault(); curtain.classList.add('in'); setTimeout(() => { location.href = a.href; }, 380);
    });
    addEventListener('pageshow', () => curtain.classList.remove('in'));
  }

  return { lenis: () => lenis, split, revealSplit, revealFade, count, start, reduce };
})();
// content pages start immediately; the homepage starts after its intro
if (!document.body.classList.contains('home')) document.addEventListener('DOMContentLoaded', () => KTMotion.start()), document.readyState !== 'loading' && KTMotion.start();
