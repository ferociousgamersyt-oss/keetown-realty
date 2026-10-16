(function () {
  const { brand, localities } = KT;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, g = typeof gsap !== 'undefined';
  if (g && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
  localities.forEach(l => $('#mLoc').add(new Option(l.name, l.id)));
  $('#fRera').textContent = brand.reraNo;
  addEventListener('scroll', () => { $('#progress').style.transform = `scaleX(${scrollY / (document.documentElement.scrollHeight - innerHeight)})`; }, { passive: true });
  if (g && !reduce) {
    const rv = (sel, trg, o = {}) => gsap.from(sel, { y: 28, opacity: 0, duration: .7, stagger: .08, ease: 'power2.out', scrollTrigger: { trigger: trg, start: 'top 85%' }, ...o });
    gsap.from('.m-hero .eyebrow, .m-hero h1, .m-hero .lede, .m-cta, .m-proof li, .svc-panel', { y: 24, opacity: 0, duration: .8, stagger: .08, ease: 'power2.out' });
    rv('.cond article', '#cond'); rv('.plan', '.plans'); rv('.addons div', '.addons'); rv('.cmp-r', '.cmp'); rv('#check li', '#check', { y: 0, x: 24 }); rv('#tl li', '#tl', { y: 0, x: -16 });
    const sp = $('#spark'), len = sp.getTotalLength();
    gsap.fromTo(sp, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: '.dash', start: 'top 80%' } });
  }
  $('#mForm').onsubmit = e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    try {
      const A = window.KTAuth, L = A ? A.read('keetown_leads', []) : [];
      L.unshift({ id: 'm' + Date.now(), name: d.name, phone: d.phone, intent: 'manage', locality: d.locality, budget: '', note: `${d.ptype} · owner based in ${d.where}`, source: window.KTTrack ? KTTrack.source() : 'Website', channel: 'management_audit', attrib: window.KTTrack ? KTTrack.attribution() : {}, stage: 'new', created: new Date().toISOString() });
      window.KTTrack && KTTrack.event('lead_created', { intent: 'manage', source: 'management_audit' });
      A && A.write('keetown_leads', L);
    } catch (_) {}
    const t = `Hi Keetown Realty, I'm ${d.name} (${d.phone}). I own a ${d.ptype} in ${d.locality ? KT.loc(d.locality).name : 'Hyderabad'} and live in ${d.where}. Please share a free property-management audit.`;
    $('#mMsg').textContent = 'Opening WhatsApp…'; window.open(KT.wa(t), '_blank', 'noopener'); e.target.reset();
  };
})();
