/* "How we help" pages: the step path fills as you scroll, and the step you're reading lights up. */
(function () {
  const list = document.getElementById('hsteps'); if (!list) return;
  const steps = [...list.querySelectorAll('.hs')];
  let ticking = false;
  function update() {
    ticking = false; const r = list.getBoundingClientRect(), mid = innerHeight * .55;
    list.style.setProperty('--fill', Math.max(0, Math.min(1, (mid - r.top) / r.height)).toFixed(3));
    steps.forEach(s => { const b = s.getBoundingClientRect(); s.classList.toggle('lit', b.top < mid); });
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update); update();
})();
