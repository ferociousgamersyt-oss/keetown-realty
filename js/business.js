/* Keetown for Business landing page: packages and steps come from KTCorp so the page and the portal never disagree. */
(function () {
  const $ = s => document.querySelector(s), C = KTCorp, A = KTAuth;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  $('#relSteps').innerHTML = C.STAGES.map(s => `<li>${esc(s)}</li>`).join('');
  $('#offSteps').innerHTML = C.OFFICE_STAGES.map(s => `<li>${esc(s)}</li>`).join('');
  $('#pkgs').innerHTML = Object.entries(C.PACKAGES).map(([k, p], i) => `<article class="plan${i === 1 ? ' pop' : ''}">${i === 1 ? '<span class="ribbon">Most chosen</span>' : ''}
    <h3>${esc(p.name)}</h3><p class="tag">${esc(p.blurb)}</p><div class="pr"><b>${inr(p.fee)}</b><small>per move, indicative · excl. GST</small></div>
    <ul>${p.services.map(s => `<li>${esc(C.SERVICES[s][0])}</li>`).join('')}</ul><a href="login.html?role=company" class="btn ${i === 1 ? 'btn-gold' : 'btn-line'}">Choose ${esc(p.name)}</a></article>`).join('');
  const bg = $('#burger'); if (bg) bg.onclick = () => { const o = $('#navLinks').classList.toggle('open'); bg.setAttribute('aria-expanded', o); };
  $('#bForm').onsubmit = e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    const L = A.read('keetown_leads', []);
    L.unshift({ id: 'k' + Date.now(), name: d.name, phone: d.phone.replace(/\D/g, '').slice(-10), intent: d.need === 'Office space' ? 'office' : 'relocation', locality: '', budget: '', note: `${d.company} · ${d.need}${d.scale ? ' · ' + d.scale : ''}`, source: window.KTTrack ? KTTrack.source() : 'Website', channel: 'business_page', attrib: window.KTTrack ? KTTrack.attribution() : {}, stage: 'new', created: new Date().toISOString() });
    A.write('keetown_leads', L); window.KTTrack && KTTrack.event('lead_created', { intent: 'business', source: 'business_page' });
    $('#bMsg').textContent = 'Opening WhatsApp…';
    window.open(KT.wa(`Hi Keetown Realty, I'm ${d.name} from ${d.company}. We need: ${d.need}${d.scale ? ' (' + d.scale + ')' : ''}. Please share a plan and rate card.`), '_blank', 'noopener'); e.target.reset();
  };
})();
