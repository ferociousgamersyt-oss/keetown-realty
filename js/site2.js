/* Public site: top bar (menu + current page) and gentle reveal-on-scroll. */
(function () {
  const tb = document.querySelector('.tb'); if (tb) {
    const b = tb.querySelector('.tb-burger'); b && (b.onclick = () => { const o = tb.classList.toggle('open'); b.setAttribute('aria-expanded', o); });
    tb.querySelectorAll('.tb-links a').forEach(a => a.addEventListener('click', () => tb.classList.remove('open')));
    const here = location.pathname.replace(/\.html$/, '').replace(/\/$/, '/index'); tb.querySelectorAll('.tb-links a[href]').forEach(a => { const h = new URL(a.href).pathname.replace(/\.html$/, '').replace(/\/$/, '/index'); if (h === here) a.setAttribute('aria-current', 'page'); });
  }
  const fab = document.getElementById('fab'); if (fab && window.KT) fab.href = KT.wa('Hi Keetown Realty, I have a question.');
  document.querySelectorAll('[data-wa]').forEach(a => { if (window.KT) { a.href = KT.wa(a.dataset.wa); a.target = '_blank'; a.rel = 'noopener'; } });
  const els = [...document.querySelectorAll('.rv')]; if (!els.length) return;
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return els.forEach(e => e.classList.add('in'));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  els.forEach(e => io.observe(e)); setTimeout(() => els.forEach(e => e.classList.add('in')), 5000);
})();
