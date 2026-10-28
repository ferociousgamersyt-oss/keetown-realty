/* Public page for one builder-inventory unit: unit.html?id=bx… */
(function () {
  const box = document.getElementById('unit'); KTInv.mergePublic();
  const id = new URLSearchParams(location.search).get('id'), p = KT.byId(KT.properties, id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  if (!p) { box.innerHTML = `<div style="padding:80px 0"><h1>This unit is no longer available</h1><p class="sub">It may have been booked. <a href="properties.html" style="text-decoration:underline">See available homes →</a></p></div>`; return; }
  const l = KT.loc(p.loc) || {}, inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  document.title = p.title + ' — Keetown Realty';
  const sib = KT.properties.filter(x => x.fromBuilder && x.project === p.project && x.id !== p.id).slice(0, 6);
  const emi = p.mode === 'sale' ? (() => { const P = p.price * 1e5 * .8, r = .085 / 12, n = 240; return P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1); })() : 0;
  const spec = [['Type', `${p.beds ? p.beds + ' BHK ' : ''}${p.type}`], ['Area', p.area.toLocaleString('en-IN') + ' sq.ft'], ['Floor', p.floor ? p.floor + (p.totalFloors ? ' of ' + p.totalFloors : '') : '—'], ['Facing', p.facing || '—'], ['Status', p.status], ['Furnishing', p.furnishing || '—'], ['Car parks', p.parking || '—'], ['RERA', p.rera ? 'Registered' : '—']];
  box.innerHTML = `<nav class="crumbs" style="margin:22px 0 10px"><a href="index.html">Home</a> / <a href="properties.html?intent=${p.mode === 'rent' ? 'rent' : 'buy'}">${p.mode === 'rent' ? 'Rent' : 'Buy'}</a> / ${esc(l.name)}</nav>
    <div class="u-grid"><div><div class="u-art">${window.KTArt ? KTArt(p, 900, 520) : ''}<span class="u-tag">Direct from builder</span></div>
      <h1 class="u-h">${esc(p.title)}</h1><p class="sub">${esc(p.builder || 'Partner builder')} · ${esc(p.project)} · ${esc(l.name)}</p>
      <div class="u-spec">${spec.map(([k, v]) => `<div><small>${k}</small><b>${esc(v)}</b></div>`).join('')}</div>
      ${p.notes ? `<p class="val" style="margin-top:14px">${esc(p.notes)}</p>` : ''}
      <h2 class="u-h2">Location</h2><iframe class="u-map" loading="lazy" title="Map of ${esc(l.name)}" src="https://www.openstreetmap.org/export/embed.html?bbox=${l.lng - .02},${l.lat - .015},${l.lng + .02},${l.lat + .015}&layer=mapnik&marker=${l.lat},${l.lng}"></iframe><p class="fine">Approximate location (locality centre).</p></div>
      <aside class="u-side"><div class="u-card"><p class="kind">${p.mode === 'rent' ? 'Rent' : 'Price'}</p><div class="u-price">${p.mode === 'rent' ? inr(p.price) + '<small>/month</small>' : KT.fmt.lakh(p.price)}</div>
        ${p.mode === 'sale' ? `<p class="fine">₹${Math.round(p.price * 1e5 / p.area).toLocaleString('en-IN')}/sq.ft · EMI from about ${inr(emi)}/mo (80% loan, 8.5%, 20 yrs)</p>` : '<p class="fine">Deposit and maintenance as per the builder’s terms.</p>'}
        <button class="btn btn-gold wide" data-contact="${p.id}">Get details &amp; book a visit</button><a class="btn btn-line wide" href="${KT.wa(`Hi Keetown Realty, I'm interested in ${p.title} (unit ${p.id.toUpperCase()}).`)}" target="_blank" rel="noopener">WhatsApp us</a>
        <p class="fine">Verified partner builder. Keetown checks RERA and documents before you pay any token.</p></div></aside></div>
    ${sib.length ? `<h2 class="u-h2">More in ${esc(p.project)}</h2><div class="u-sib">${sib.map(x => `<a href="${KT.url.property(x)}"><b>${esc(x.title.split(' in ')[0])}</b><span>${x.mode === 'rent' ? inr(x.price) + '/mo' : KT.fmt.lakh(x.price)} · ${x.area} sq.ft${x.floor ? ' · floor ' + x.floor : ''}</span></a>`).join('')}</div>` : ''}`;
})();
