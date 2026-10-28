/* Keetown client portal. Opens straight after login. Role-specific tabs:
 * tenant: prime matches · my home & rent · shortlist · saved searches · visits
 * buyer : prime matches · my purchase · shortlist · saved searches · visits
 * owner : rentals & rent (reminders, ledger, tickets, documents) · my listings
 * seller/builder: my listings / projects */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const A = KTAuth, T = KTTen, M = KTMatch, { properties, loc, fmt, url } = KT;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  if (window.KTInv) KTInv.mergePublic();
  let u = A.user();
  if (!u) { location.replace('login.html'); return; }
  const R = A.ROLES[u.role], needDL = R.dl === 'required';
  const verified = () => !!(u.verified && u.verified.status);
  const canAct = () => !needDL || verified();
  const KS = 'keetown_portal_' + u.mobile, store = () => A.read(KS, { saved: [], visits: [] }), putStore = s => A.write(KS, s);
  // merge a guest shortlist into the account
  (function () { const g = A.read('keetown_guest', { saved: [] }); if (g.saved && g.saved.length) { const s = store(); s.saved = [...new Set([...(s.saved || []), ...g.saved])]; putStore(s); A.write('keetown_guest', { saved: [] }); } })();
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); };
  (function () {   // back from DigiLocker
    const q = new URLSearchParams(location.search).get('dl'); if (!q) return; history.replaceState(null, '', location.pathname + location.hash);
    setTimeout(() => toast({ ok: 'Verified with DigiLocker — prime matches unlocked', cancelled: 'DigiLocker was cancelled. You can verify any time.', failed: 'DigiLocker verification failed. Please try again.', unavailable: 'DigiLocker opens once our government partner approval is live. Our team will verify you by phone meanwhile.' }[q] || 'DigiLocker: ' + q), 400);
  })();
  const persist = () => { A.saveUser(u); u = A.user(); };
  const dlg = $('#pd'); dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  const isOwnerSide = ['owner', 'seller', 'builder'].includes(u.role);

  /* ---------------- header + nav ---------------- */
  const vBadge = () => verified() ? `<span class="badge-v ok">✓ ${u.verified.method === 'demo' ? 'Demo-verified' : u.verified.method === 'company' ? 'Verified by employer' : 'DigiLocker verified'}</span>` : needDL ? '<span class="badge-v no">Verification pending</span>' : '<span class="badge-v opt">Unverified</span>';
  function head() {
    const ib = T.inbox(u.mobile), n = ib.filter(x => x.unread).length;
    $('#who').innerHTML = `<div class="bell-w"><button class="bell" id="bell" aria-label="Notifications${n ? ', ' + n + ' unread' : ''}" aria-expanded="false"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>${n ? `<span class="bn">${n > 9 ? '9+' : n}</span>` : ''}</button>
      <div class="bell-pop" id="bellPop" hidden><div class="bp-h"><b>Notifications</b>${n ? '<button class="link" id="bellRead">Mark all read</button>' : ''}</div><ul>${ib.slice(0, 10).map(x => `<li class="${x.unread ? 'un' : ''} ${x.kind === 'issue' ? 'iss' : ''}" data-open-tn="${x.tid}"><span>${esc(x.text)}</span><small>${esc(x.title)} · ${T.fmtD(x.at)} · ${esc(x.by)}</small></li>`).join('') || '<li class="empty"><span>You are all caught up.</span></li>'}</ul></div></div>
      <div class="who-t"><b>${esc(u.profile.name || 'Welcome')}</b><small>${R.label} · +91 ${u.mobile}</small></div>${vBadge()}<button class="btn btn-line sm" id="logout">Log out</button>`;
    $('#logout').onclick = () => { A.logout(); location.href = 'index.html'; };
    const pop = $('#bellPop'); $('#bell').onclick = e => { e.stopPropagation(); pop.hidden = !pop.hidden; $('#bell').setAttribute('aria-expanded', !pop.hidden); };
    const br = $('#bellRead'); if (br) br.onclick = () => { T.markSeen(u.mobile); draw(); };
    $$('[data-open-tn]', pop).forEach(li => li.onclick = () => { T.markSeen(u.mobile); go(u.role === 'owner' || isOwnerSide ? 'rentals' : 'myhome'); });
  }
  document.addEventListener('click', e => { const p = $('#bellPop'); if (p && !p.hidden && !e.target.closest('.bell-w')) p.hidden = true; });
  const TABS = {
    tenant: [['home', 'Overview'], ['matches', 'Prime matches'], ['myhome', 'My home & rent'], ['saved', 'Shortlist'], ['searches', 'Saved searches'], ['visits', 'Visits'], ['settings', 'Settings']],
    buyer: [['home', 'Overview'], ['matches', 'Prime matches'], ['purchase', 'My purchase'], ['saved', 'Shortlist'], ['searches', 'Saved searches'], ['visits', 'Visits'], ['settings', 'Settings']],
    owner: [['home', 'Overview'], ['rentals', 'Rentals & rent'], ['mine', 'My listings'], ['settings', 'Settings']],
    seller: [['home', 'Overview'], ['mine', 'My listings'], ['settings', 'Settings']],
    builder: u.profile.staffOf ? [['inventory', 'Inventory'], ['upload', 'Bulk upload'], ['settings', 'Settings']] : [['home', 'Overview'], ['inventory', 'Inventory'], ['upload', 'Bulk upload'], ['team', 'Team'], ['mine', 'My projects'], ['settings', 'Settings']],
    admin: [['inventory', 'All inventory'], ['upload', 'Upload stock'], ['partners', 'Partner logins'], ['settings', 'Settings']],
    company: [['home', 'Overview'], ['moves', 'Employee moves'], ['newmove', 'Relocate an employee'], ['office', 'Office space'], ['newoffice', 'New office requirement'], ['billing', 'Billing'], ['settings', 'Settings']]
  }[u.role];
  if (window.KTCorp && u.role !== 'company' && KTCorp.relForEmployee(u.mobile).length) TABS.splice(1, 0, ['relocation', 'My relocation']);
  let tab = (location.hash || '#home').slice(1); if (!TABS.some(t => t[0] === tab)) tab = TABS[0][0];
  function nav() {
    const n = u.role === 'company' ? { moves: KTCorp.relForCompany(u.mobile).filter(r => r.status === 'Active' && r.stage < KTCorp.STAGES.length - 1).length } : { saved: store().saved.length, matches: verified() ? M.forUser(u, { primeOnly: true }).length : 0, rentals: T.forUser(u.mobile).filter(t => t.ownerMobile === u.mobile).reduce((a, t) => a + T.ledger(t).filter(r => r.status === 'overdue' || r.status === 'reported').length + t.tickets.filter(k => k.status === 'Open').length, 0), myhome: T.inbox(u.mobile).filter(x => x.unread).length };
    $('#pNav').innerHTML = TABS.map(([k, t]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}" ${tab === k ? 'aria-current="page"' : ''}>${t}${n[k] ? `<span class="n">${n[k]}</span>` : ''}</button>`).join('') + `<a class="p-ext" href="properties.html">Browse properties →</a>`;
    $$('#pNav button').forEach(b => b.onclick = () => go(b.dataset.t));
  }
  function go(t) { tab = t; history.replaceState(null, '', '#' + t); draw(); }
  function draw() { u = A.user(); head(); nav(); $('#pMain').innerHTML = V[tab](); (B[tab] || (() => {}))(); $('#pMain').focus({ preventScroll: true }); if (tab === 'myhome' || tab === 'rentals') setTimeout(() => T.markSeen(u.mobile), 1500); }
  const V = {}, B = {};
  addEventListener('hashchange', () => { const t = location.hash.slice(1); if (t !== tab && TABS.some(x => x[0] === t)) { tab = t; draw(); } });

  /* ---------------- shared pieces ---------------- */
  function verifyBanner() {
    if (verified()) return '';
    return `<div class="banner"><p><b>${needDL ? 'Verify with DigiLocker to unlock everything.' : 'Verify with DigiLocker for prime matches and priority service.'}</b> ${needDL ? `Verified ${R.short.toLowerCase()}s get prime matches, site visits and ${isOwnerSide ? 'live listings' : 'direct owner coordination'}.` : 'It takes about a minute.'}</p><button class="btn btn-gold" data-verify>Verify now</button></div>`;
  }
  function verifyDialog() {
    dlg.innerHTML = `<div class="m-body"><h2 class="dlg-h">Verify with DigiLocker</h2><p class="sub">You approve sharing on DigiLocker's own website. Keetown stores only your verified name and status — never your Aadhaar number.</p>${A.MODE === 'demo' ? `<p class="val"><b>Demo mode:</b> simulated verification, shown as "Demo-verified".</p><label class="fl">Name as on your ID<input id="dn" value="${esc(u.profile.name || '')}"></label>` : ''}<div class="acts"><button class="btn btn-gold" id="dv">Verify with DigiLocker</button><button class="btn btn-line" data-x>Cancel</button></div></div>`;
    dlg.showModal(); $('[data-x]', dlg).onclick = () => dlg.close();
    $('#dv', dlg).onclick = () => { if (A.MODE === 'live') return A.digilockerStart('/portal.html'); const n = $('#dn', dlg).value.trim(); if (!n) return; A.markVerified(u.mobile, n, 'demo'); u = A.user(); dlg.close(); window.KTTrack && KTTrack.event('verified', { role: u.role }); draw(); toast('Verified — prime matches unlocked'); };
  }
  function editDialog() {
    dlg.innerHTML = `<form class="m-body" id="edF" novalidate><h2 class="dlg-h">${esc(KTForms.FORMS[u.role].title)}</h2><p class="sub">${esc(KTForms.FORMS[u.role].sub)}</p>${KTForms.render(u.role, u.profile)}<p class="err" id="edE"></p><div class="acts"><button class="btn btn-gold" type="submit">Save</button><button class="btn btn-line" type="button" data-x>Cancel</button></div></form>`;
    dlg.showModal(); $('[data-x]', dlg).onclick = () => dlg.close();
    $('#edF').onsubmit = e => { e.preventDefault(); const { profile, error } = KTForms.read(e.target, u.role); if (error) return $('#edE').textContent = error; u.profile = { ...u.profile, ...profile }; u.quick = false; persist(); dlg.close(); draw(); toast('Saved — matches updated'); };
  }
  document.addEventListener('click', e => { if (e.target.closest('[data-verify]')) verifyDialog(); if (e.target.closest('[data-edit]')) editDialog(); if (e.target.closest('[data-go]')) go(e.target.closest('[data-go]').dataset.go); });
  const artOf = (p, w = 400, h = 250) => KTArt({ ...p, id: p.id + 'pt' + Math.random().toString(36).slice(2, 6) }, w, h);
  function reqSummary() {
    const p = u.profile, areas = (p.areas || []).map(id => loc(id)?.name).filter(Boolean).join(', ') || (p.locality ? loc(p.locality)?.name : '—');
    const money = (v, rent) => v == null || v === '' ? '' : rent ? inr(v) : fmt.lakh(+v);
    const rows = {
      tenant: [['Areas', areas], ['Rent', [money(p.budgetMin, 1), money(p.budgetMax, 1)].filter(Boolean).join(' – ') || p.budget || 'Any'], ['Bedrooms', p.bedsMin ? p.bedsMin + '+ BHK' : p.bhk || 'Any'], ['Furnishing', p.furnishing || 'Any'], ['Who', p.who || '—'], ['Move-in', p.movein ? T.fmtD(p.movein) : '—'], ['Pets', p.pets === 'yes' ? 'Yes' : 'No']],
      buyer: [['Areas', areas], ['Budget', [money(p.budgetMin), money(p.budgetMax)].filter(Boolean).join(' – ') || p.budget || 'Any'], ['Type', (p.types || []).join(', ') || p.bhk || 'Any'], ['Bedrooms', p.bedsMin ? p.bedsMin + '+ BHK' : 'Any'], ['Possession', p.possession || 'Any'], ['Purpose', p.purpose || '—'], ['Loan', p.loan || '—']],
      owner: [['Locality', areas], ['Society', p.society || '—'], ['Property', `${p.beds && p.beds !== '0' ? p.beds + ' BHK ' : ''}${p.ptype || ''}`], ['Expected rent', p.rent ? inr(p.rent) + '/mo' : '—'], ['Tenants', p.tenantPref || '—'], ['Available', p.available ? T.fmtD(p.available) : '—'], ['Management', p.manage ? 'Interested' : 'No']],
      seller: [['Locality', areas], ['Property', p.ptype || '—'], ['Size', p.size ? p.size + ' ' + (p.unit || 'sq.ft') : '—'], ['Expected price', p.price ? fmt.lakh(+p.price) : '—'], ['Status', p.status || '—'], ['Timeline', p.timeline || '—']],
      builder: [['Company', p.company || '—'], ['RERA', p.rera || '—'], ['Localities', areas], ['Type', p.pt || '—'], ['Units', p.units || '—']]
    }[u.role];
    return `<div class="pc"><h3>${isOwnerSide ? 'Your details' : 'Your requirement'}<button class="link" data-edit>Edit</button></h3><div class="kv2">${rows.map(([k, v]) => `<div><small>${k}</small><b>${esc(v || '—')}</b></div>`).join('')}</div></div>`;
  }
  function matchCard(x, locked) {
    const p = x.p, l = loc(p.loc), sv = store().saved.includes(p.id);
    return `<article class="mcard ${locked ? 'locked' : ''}"><a class="mc-art" href="${url.property(p)}" ${locked ? 'tabindex="-1" aria-hidden="true"' : ''}>${artOf(p)}</a>
      <div class="mc-body"><div class="mc-top"><span class="mpct" style="--p:${x.score}"><b>${x.score}%</b></span><div><p class="kind">${p.prime ? '★ Prime · ' : ''}${p.verified ? 'Verified' : ''}</p><h4><a href="${url.property(p)}">${esc(p.title)}</a></h4><p class="mc-sub">${esc(l.name)} · ${fmt.price(p)} · ${fmt.bhk(p)}</p></div></div>
      <ul class="why">${x.reasons.slice(0, 4).map(r => `<li class="ok">${esc(r)}</li>`).join('')}${x.misses.slice(0, 2).map(r => `<li class="no">${esc(r)}</li>`).join('')}</ul>
      ${locked ? '' : `<div class="mc-acts"><button class="btn btn-gold sm" data-contact="${p.id}">Contact</button><button class="btn btn-line sm" data-visit="${p.id}" ${canAct() ? '' : 'disabled'}>Book visit</button><button class="btn btn-line sm" data-sv="${p.id}" aria-pressed="${sv}">${sv ? '♥ Saved' : '♡ Save'}</button></div>`}</div></article>`;
  }
  function visitDialog(id) {
    const p = KT.byId(properties, id), today = new Date().toISOString().slice(0, 10);
    dlg.innerHTML = `<div class="m-body"><h2 class="dlg-h">Book a site visit</h2><p class="sub">${esc(p.title)}</p><label class="fl">Preferred date<input type="date" id="vDate" min="${today}"></label><label class="fl">Time<select id="vTime"><option>Morning (10–1)</option><option>Afternoon (1–4)</option><option>Evening (4–7)</option></select></label><div class="acts"><button class="btn btn-gold" id="vGo">Confirm request</button><button class="btn btn-line" data-x>Cancel</button></div></div>`;
    dlg.showModal(); $('[data-x]', dlg).onclick = () => dlg.close();
    $('#vGo', dlg).onclick = () => { const dt = $('#vDate', dlg).value; if (!dt) return toast('Choose a date'); const s = store(); s.visits.unshift({ id: Date.now(), pid: id, date: dt, time: $('#vTime', dlg).value, status: 'Requested' }); putStore(s); KTLead.addLead({ name: u.profile.name, phone: u.mobile, intent: p.mode === 'rent' ? 'rent' : 'buy', locality: p.loc, propertyId: p.id, budget: fmt.price(p), note: 'Site visit requested ' + dt, channel: 'visit' }); dlg.close(); go('visits'); toast('Visit requested — we confirm on WhatsApp'); };
  }
  function wireCards(root) {
    $$('[data-sv]', root).forEach(b => b.onclick = () => { const s = store(), i = s.saved.indexOf(b.dataset.sv); i < 0 ? s.saved.push(b.dataset.sv) : s.saved.splice(i, 1); putStore(s); draw(); toast(i < 0 ? 'Saved' : 'Removed'); });
    $$('[data-visit]', root).forEach(b => b.onclick = () => canAct() ? visitDialog(b.dataset.visit) : verifyDialog());
  }

  /* ---------------- overview ---------------- */
  V.home = () => {
    if (u.role === 'company') return V.bizhome();
    const first = (u.profile.name || '').split(' ')[0];
    let kpis = [], body = '';
    if (u.role === 'tenant' || u.role === 'buyer') {
      const prime = M.forUser(u, { primeOnly: true }), all = M.forUser(u);
      kpis.push([prime.length, verified() ? 'Prime matches' : 'Prime matches · verify to unlock', 'matches'], [all.length, 'All matches', 'matches'], [store().saved.length, 'Shortlisted', 'saved'], [store().visits.length, 'Visits requested', 'visits']);
      const tn = u.role === 'tenant' ? T.forUser(u.mobile).filter(t => t.tenantMobile === u.mobile)[0] : null;
      if (tn) { T.runAuto(tn); const r = T.current(tn); kpis.splice(1, 1, [inr(r.amount), r.status === 'paid' ? 'Rent paid' : `Rent ${r.status === 'overdue' ? 'overdue' : 'due ' + T.fmtD(r.due)}`, 'myhome']); }
      const pu = u.role === 'buyer' ? T.purchases(u.mobile)[0] : null;
      if (pu) { const nx = pu.plan.find(m => !m.paidOn); kpis.splice(1, 1, [nx ? inr(nx.amount) : 'All paid', nx ? 'Next: ' + nx.name : 'Payment plan', 'purchase']); }
      body = `<h2 class="sec-h">Your prime matches</h2>` + (prime.length ? (verified() ? `<div class="mgrid">${prime.slice(0, 3).map(x => matchCard(x)).join('')}</div><p><button class="btn btn-line sm" data-go="matches">See all ${prime.length} →</button></p>` : lockedTeaser(prime)) : `<div class="empty-box"><p>No prime matches yet for this requirement. Widen your areas or budget, or let us search off-market for you.</p><button class="btn btn-line" data-edit>Edit requirement</button></div>`);
    } else if (u.role === 'owner') {
      const ts = T.forUser(u.mobile).filter(t => t.ownerMobile === u.mobile); ts.forEach(T.runAuto);
      const cur = ts.map(t => T.current(t)), collected = cur.filter(r => r.status === 'paid').length;
      kpis.push([inr(ts.reduce((a, t) => a + T.rentFor(t, new Date().toISOString().slice(0, 7)), 0)), 'Monthly rent roll', 'rentals'], [`${collected}/${ts.length}`, 'Collected this cycle', 'rentals'], [cur.filter(r => r.status === 'overdue').length, 'Overdue', 'rentals'], [ts.reduce((a, t) => a + t.tickets.filter(k => k.status !== 'Resolved').length, 0), 'Open repairs', 'rentals']);
      const openIss = ts.flatMap(t => t.tickets.filter(k => k.status === 'Open').map(k => ({ t, k })));
      body = (openIss.length ? `<div class="banner alert"><p><b>${openIss.length} new issue${openIss.length > 1 ? 's' : ''} from your tenant${openIss.length > 1 ? 's' : ''}.</b> ${openIss.slice(0, 2).map(({ t, k }) => `${esc(k.cat)} (${esc(k.urgency)}) at ${esc(t.title)}`).join(' · ')}</p><button class="btn btn-gold" data-go="rentals">Review now</button></div>` : '') + (ts.length ? '' : `<div class="empty-box"><p><b>Manage your tenancy here.</b> Add your tenant to track rent, send reminders, handle repairs and keep documents in one place.</p><button class="btn btn-gold" data-go="rentals">Set up rentals</button></div>`);
    }
    if (u.role === 'builder' && I) { const inv = I.forBuilder(actingBuilder()); kpis.push([inv.length.toLocaleString('en-IN'), 'Units in inventory', 'inventory'], [inv.filter(x => x.status === 'Available').length.toLocaleString('en-IN'), 'Available units', 'inventory'], [I.myWorkers(u.mobile).length, 'Team members', 'team']); if (!invList) loadInv(); }
    if (isOwnerSide) { const subs = A.read('keetown_submissions', []).filter(x => x.mobile === u.mobile); kpis.push([subs.length, u.role === 'builder' ? 'Projects submitted' : 'Listings', 'mine']); }
    const code = 'KT' + (+u.mobile * 7).toString(36).toUpperCase(), refs = Object.values(A.users()).filter(x => x.attrib && x.attrib.first && x.attrib.first.ref === code).length;
    return `<h1>Welcome${first ? ', ' + esc(first) : ''}</h1><p class="sub">${R.label} portal</p>${verifyBanner()}
      ${u.quick ? `<div class="banner soft"><p><b>Complete your profile.</b> A few more details give you far better matches.</p><button class="btn btn-gold" data-edit>Complete profile</button></div>` : ''}
      <div class="kpis">${kpis.map(([v, l, t]) => `<button class="kpi" data-go="${t}"><b>${v}</b><span>${l}</span></button>`).join('')}</div>
      ${reqSummary()}${body}
      <div class="pc refer"><div><h3>Refer a friend</h3><p class="sub">Know someone moving to Hyderabad or letting out a flat? Share your link. ${refs ? `<b>${refs} joined</b> through you so far.` : ''}</p></div><div class="ref-row"><input readonly value="${location.origin}/index.html?ref=${code}" aria-label="Your referral link"><button class="btn btn-line sm" id="copyRef">Copy</button><a class="btn btn-wa sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('I use Keetown Realty for verified homes in Hyderabad: ' + location.origin + '/index.html?ref=' + code)}">Share</a></div></div>`;
  };
  B.home = () => { if (u.role === 'company') return B.bizhome(); wireCards($('#pMain')); const c = $('#copyRef'); if (c) c.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(c.previousElementSibling.value); toast('Link copied'); }; };
  function lockedTeaser(prime) {
    return `<div class="locked-w"><div class="mgrid blur">${prime.slice(0, 3).map(x => matchCard(x, true)).join('')}</div><div class="lock-cta"><p class="kind">${prime.length} prime ${prime.length === 1 ? 'match' : 'matches'} waiting</p><h3>Verify once to unlock your prime matches</h3><p>Prime matches are hand-picked, verified listings our algorithm ranks against your full requirement. We show them to verified clients only.</p><button class="btn btn-gold" data-verify>Verify with DigiLocker</button></div></div>`;
  }

  /* ---------------- prime matches ---------------- */
  let showAll = false;
  V.matches = () => {
    const prime = M.forUser(u, { primeOnly: true }), all = M.forUser(u), list = showAll ? all : prime;
    return `<h1>Prime matches</h1><p class="sub">Ranked automatically against your requirement: location (and distance to your preferred areas), budget, bedrooms, furnishing, move-in or possession date, tenant rules and listing quality.</p>${verifyBanner()}
      <div class="pc"><div class="row-i" style="border:0;padding:0"><div class="grow">${reqSummaryInline()}</div><button class="btn btn-line sm" data-edit>Edit requirement</button></div></div>
      ${verified() ? `<div class="seg-mini"><button class="${!showAll ? 'on' : ''}" data-all="0">Prime (${prime.length})</button><button class="${showAll ? 'on' : ''}" data-all="1">All matches (${all.length})</button></div>
        ${list.length ? `<div class="mgrid">${list.map(x => matchCard(x)).join('')}</div>` : `<div class="empty-box"><p>Nothing matches yet. Try widening your areas or budget — or ask us to search off-market.</p><a class="btn btn-wa" target="_blank" rel="noopener" href="${KT.wa('Hi Keetown, please search off-market for my requirement. My mobile: ' + u.mobile)}">Ask Keetown</a></div>`}`
        : (prime.length ? lockedTeaser(prime) : '<div class="empty-box"><p>Verify to see your prime matches.</p><button class="btn btn-gold" data-verify>Verify now</button></div>')}`;
  };
  function reqSummaryInline() { const w = M.requirement(u), areas = w.areas.map(a => loc(a)?.name).filter(Boolean).join(', ') || 'All Hyderabad'; const money = v => v == null ? '' : w.mode === 'rent' ? inr(v) : fmt.lakh(v / 1e5); return `<b>${w.mode === 'rent' ? 'Renting' : 'Buying'}</b> in ${esc(areas)} · ${[money(w.min), money(w.max)].filter(Boolean).join(' – ') || 'any budget'} · ${w.beds ? w.beds + '+ BHK' : 'any size'}${w.who ? ' · ' + esc(w.who) : ''}`; }
  B.matches = () => { wireCards($('#pMain')); $$('[data-all]').forEach(b => b.onclick = () => { showAll = b.dataset.all === '1'; draw(); }); };

  /* ---------------- tenant: my home & rent ---------------- */
  const pill = s => `<span class="st st-${s}">${{ paid: 'Paid', partial: 'Part-paid', reported: 'Awaiting owner', due: 'Due', overdue: 'Overdue', upcoming: 'Upcoming' }[s]}</span>`;
  const amtCell = x => x.received && x.status !== 'paid' ? `${inr(x.received)} <small class="mut">of ${inr(x.amount)}</small>` : inr(x.amount);
  V.myhome = () => {
    const ts = T.forUser(u.mobile).filter(t => t.tenantMobile === u.mobile); ts.forEach(T.runAuto);
    if (!ts.length) return `<h1>My home &amp; rent</h1><p class="sub">After you move in through Keetown, your tenancy appears here automatically — rent reminders, UPI payments, receipts for HRA, repair requests and documents.</p>
      <div class="empty-box"><p>Your owner adds the tenancy with your mobile number (+91 ${u.mobile}). Already moved in? You can also add it yourself.</p><div class="acts-row"><button class="btn btn-gold" id="addTn">Add my tenancy</button><button class="btn btn-line" id="demoTn">Explore with sample data</button></div></div>`;
    return `<h1>My home &amp; rent</h1>` + ts.map(t => {
      const t2 = T.get(t.id), r = T.current(t2), ag = T.agreement(t2), d = T.daysTo(r.due), up = T.upiLink(t2, r);
      return `<section class="tn" data-tn="${t2.id}">
        <div class="tn-head"><div><p class="kind">${t2.demo ? 'Sample tenancy · ' : ''}Owner: ${esc(t2.ownerName || '—')}</p><h2>${esc(t2.title)}</h2><p class="sub">${esc(t2.address || '')}</p></div>${t2.propertyId && KT.byId(properties, t2.propertyId) ? `<a class="btn btn-line sm" href="${url.property(KT.byId(properties, t2.propertyId))}">Property page</a>` : ''}</div>
        <div class="tn-grid">
          <div class="pc rentcard ${r.status}"><p class="kind">Rent · ${esc(r.label)}</p><p class="big">${inr(r.status === 'partial' ? r.balance : r.amount)}</p>${r.received && r.status !== 'paid' ? `<p class="fine">${inr(r.received)} of ${inr(r.amount)} received · balance ${inr(r.balance)}</p>` : ''}<p>${pill(r.status)} ${r.status === 'paid' ? 'Thank you!' : r.status === 'reported' ? 'Waiting for owner confirmation' : d < 0 ? `${-d} days overdue (due ${T.fmtD(r.due)})` : d === 0 ? 'Due today' : `Due ${T.fmtD(r.due)} · in ${d} days`}</p>
            ${['due', 'overdue', 'upcoming', 'partial'].includes(r.status) ? `<div class="acts-row">${up ? `<a class="btn btn-gold" href="${esc(up)}">Pay ${inr(r.balance || r.amount)} via UPI</a>` : ''}<button class="btn btn-line" data-report="${r.month}">I've paid</button></div>${t2.ownerUpi ? `<p class="fine">UPI ID: <b>${esc(t2.ownerUpi)}</b> <button class="link" data-copy="${esc(t2.ownerUpi)}">Copy</button> · The UPI button opens your payment app on a phone.</p>` : '<p class="fine">Your owner has not added a UPI ID yet.</p>'}` : ''}</div>
          <div class="pc"><p class="kind">Agreement</p><p><b>${T.fmtD(ag.start)}</b> → <b>${T.fmtD(ag.end)}</b></p><div class="agbar"><i style="width:${(ag.progress * 100).toFixed(0)}%"></i></div>
            <p class="fine">Lock-in until ${T.fmtD(ag.lockIn)} · ${ag.renewIn > 0 ? `renewal in ${ag.renewIn} days` : 'renewal due'} · rent after ${t2.escalationPct}% escalation: ${inr(ag.nextRent)}</p><p class="fine">Deposit held: ${inr(t2.deposit)}</p></div>
        </div>
        <div class="tn-grid">
          <div class="pc"><h3>Rent history</h3><table class="ledger"><thead><tr><th>Month</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${T.ledger(t2).map(x => `<tr><td>${esc(x.label)}</td><td>${amtCell(x)}</td><td>${pill(x.status)}</td><td>${x.status === 'paid' ? `<button class="link" data-rcpt="${x.month}">Receipt</button>` : ''}</td></tr>`).join('')}</tbody></table><p class="fine">Download receipts for HRA claims. Receipts generate once your owner confirms payment.</p></div>
          <div class="pc"><h3>Updates</h3><ul class="feed">${t2.notices.slice(0, 8).map(n => `<li><span>${esc(n.text)}</span><small>${T.fmtD(n.at)} · ${esc(n.by)}</small></li>`).join('') || '<li><span>No updates yet.</span></li>'}</ul></div>
        </div>
        <div class="tn-grid">
          <div class="pc"><h3>Property issues <button class="btn btn-gold sm" data-tkt>Report an issue</button></h3>${tickets(t2, false)}</div>
          <div class="pc"><h3>Documents</h3><ul class="docs">${t2.docs.map(dc => `<li><span>${esc(dc.name)}</span>${docPill(dc.status)}</li>`).join('')}</ul></div>
        </div></section>`;
    }).join('');
  };
  const docPill = s => `<span class="st ${/Pending/.test(s) ? 'st-due' : 'st-paid'}">${esc(s)}</span>`;
  const ago = iso => { const h = (Date.now() - new Date(iso)) / 36e5; return h < 1 ? Math.max(1, Math.round(h * 60)) + ' min ago' : h < 48 ? Math.round(h) + ' h ago' : Math.round(h / 24) + ' days ago'; };
  function tickets(t, owner) {
    if (!t.tickets.length) return `<p class="fine">${owner ? 'No issues raised. Your tenant can report problems from their portal and you are notified straight away.' : 'No requests. Report anything — leaks, electrical, appliances, pests — and your owner is notified straight away.'}</p>`;
    return `<ul class="tickets">${t.tickets.map(k => { const s = T.sla(k), cm = k.comments || [];
      return `<li class="${k.status === 'Resolved' ? 'done' : ''} ${k.urgency === 'Emergency' && k.status !== 'Resolved' ? 'emerg' : ''}"><div class="tk-h"><b>${esc(k.cat)}${k.room ? ` · <span class="mut">${esc(k.room)}</span>` : ''}</b><span class="st ${k.status === 'Resolved' ? 'st-paid' : k.urgency !== 'Normal' ? 'st-overdue' : 'st-due'}">${esc(k.status)}</span></div>
        <p>${esc(k.desc)}</p>
        <div class="tk-meta"><span class="tag-u u-${(k.urgency || 'Normal').toLowerCase()}">${esc(k.urgency)}</span><span>Raised ${ago(k.created)}</span>${k.status !== 'Resolved' ? `<span class="${s.breached ? 'warn' : s.met ? 'okc' : ''}">${s.met ? 'Responded within ' + s.target + ' h' : s.breached ? 'No response in ' + s.target + ' h target' : 'Response target ' + s.target + ' h'}</span>` : ''}${k.visit ? `<span>Visit: ${esc(k.visit)}</span>` : ''}${k.access ? '<span>Entry permitted</span>' : ''}${k.photos && k.photos.length ? `<span>${k.photos.length} photo${k.photos.length > 1 ? 's' : ''}</span>` : ''}</div>
        ${cm.length ? `<ul class="thread">${cm.map(c => `<li class="${c.by}"><b>${c.by === 'owner' ? 'Owner' : 'Tenant'}</b> ${esc(c.text)} <small>${ago(c.at)}</small></li>`).join('')}</ul>` : ''}
        ${k.status !== 'Resolved' ? `<form class="reply" data-cmt="${k.id}"><input name="txt" placeholder="${owner ? 'Reply to your tenant…' : 'Add details or reply…'}" aria-label="Reply"><button class="btn btn-line sm">Send</button></form>` : ''}
        ${owner ? `<div class="tk-acts"><select data-tkmove="${k.id}" aria-label="Update status">${['Open', 'Acknowledged', 'In progress', 'Resolved'].map(x => `<option ${x === k.status ? 'selected' : ''}>${x}</option>`).join('')}</select><button class="link" data-handover="${k.id}">Hand over to Keetown</button><a class="link" target="_blank" rel="noopener" href="https://wa.me/91${t.tenantMobile}?text=${encodeURIComponent('Hi ' + (t.tenantName || '') + ', about the ' + k.cat + ' issue at ' + t.title + ': ')}">WhatsApp tenant</a></div>` : ''}</li>`; }).join('')}</ul>`;
  }
  function tenancyForm(asOwner) {
    const p = u.profile, today = new Date().toISOString().slice(0, 10), rentals = properties.filter(x => x.mode === 'rent');
    dlg.innerHTML = `<form class="m-body" id="tnF" novalidate><h2 class="dlg-h">${asOwner ? 'Add a tenancy' : 'Add my tenancy'}</h2><p class="sub">${asOwner ? 'Your tenant sees this in their portal when they log in with the mobile number below.' : 'Your owner can confirm payments when they log in with their mobile number.'}</p>
      <label class="fl">Property<select name="pid"><option value="">Not listed on Keetown</option>${rentals.map(x => `<option value="${x.id}">${esc(x.title)}</option>`).join('')}</select></label>
      <div class="two"><label class="fl">Title *<input name="title" placeholder="e.g. 2BHK, Green Meadows, Kondapur" value="${asOwner && p.society ? esc((p.beds ? p.beds + 'BHK, ' : '') + p.society) : ''}"></label><label class="fl">Address<input name="address"></label></div>
      <div class="two"><label class="fl">${asOwner ? 'Tenant' : 'Owner'} name *<input name="otherName"></label><label class="fl">${asOwner ? 'Tenant' : 'Owner'} mobile *<input name="otherMobile" inputmode="numeric" maxlength="10"></label></div>
      <div class="two"><label class="fl">Monthly rent (₹) *<input name="rent" inputmode="numeric" value="${asOwner && p.rent ? esc(p.rent) : ''}"></label><label class="fl">Rent due day<select name="dueDay">${[1, 3, 5, 7, 10, 15].map(d => `<option ${d === 5 ? 'selected' : ''}>${d}</option>`).join('')}</select></label></div>
      <div class="two"><label class="fl">Deposit (₹)<input name="deposit" inputmode="numeric"></label><label class="fl">Agreement start *<input type="date" name="start" value="${today}"></label></div>
      <div class="two"><label class="fl">Term (months)<input name="termMonths" value="11" inputmode="numeric"></label><label class="fl">Lock-in (months)<input name="lockInMonths" value="6" inputmode="numeric"></label></div>
      <div class="two"><label class="fl">Annual escalation (%)<input name="escalationPct" value="5" inputmode="numeric"></label><label class="fl">Owner UPI ID (for rent)<input name="upi" placeholder="name@bank" value="${asOwner ? esc(p.upi || '') : ''}"></label></div>
      <p class="err" id="tnE"></p><div class="acts"><button class="btn btn-gold" type="submit">Save tenancy</button><button class="btn btn-line" type="button" data-x>Cancel</button></div></form>`;
    dlg.showModal(); $('[data-x]', dlg).onclick = () => dlg.close();
    const f = $('#tnF'); f.pid.onchange = () => { const x = KT.byId(properties, f.pid.value); if (x) { f.title.value = x.title; f.rent.value = x.price; } };
    f.onsubmit = e => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(f)), err = $('#tnE');
      if (!d.title.trim()) return err.textContent = 'Enter a title.'; if (!d.otherName.trim()) return err.textContent = 'Enter the name.'; if (!A.validMobile(d.otherMobile)) return err.textContent = 'Enter a valid 10-digit mobile.';
      if (!(+d.rent > 0)) return err.textContent = 'Enter the rent.'; if (d.upi && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(d.upi)) return err.textContent = 'UPI ID looks incorrect.';
      T.create({ propertyId: d.pid, title: d.title.trim(), address: d.address, loc: (KT.byId(properties, d.pid) || {}).loc || u.profile.locality || '', rent: d.rent, dueDay: d.dueDay, deposit: d.deposit, start: d.start, termMonths: d.termMonths, lockInMonths: d.lockInMonths, escalationPct: d.escalationPct, ownerUpi: d.upi,
        ownerMobile: asOwner ? u.mobile : d.otherMobile, ownerName: asOwner ? u.profile.name : d.otherName.trim(), tenantMobile: asOwner ? d.otherMobile : u.mobile, tenantName: asOwner ? d.otherName.trim() : u.profile.name });
      window.KTTrack && KTTrack.event('tenancy_created', { by: u.role }); dlg.close(); draw(); toast('Tenancy saved');
    };
  }
  function ticketForm(id) {
    const t = T.get(id);
    dlg.innerHTML = `<form class="m-body" id="tkF" novalidate><h2 class="dlg-h">Report a property issue</h2><p class="sub">${esc(t.title)} · goes straight to ${esc(t.ownerName || 'your owner')}</p>
      <div class="two"><label class="fl">What's the problem?<select name="cat">${['Plumbing / water', 'Electrical', 'Seepage / leak', 'Appliance', 'Doors / locks / windows', 'Pest control', 'Lift / common area', 'Internet / DTH', 'Other'].map(c => `<option>${c}</option>`).join('')}</select></label>
      <label class="fl">Where?<select name="room">${['Kitchen', 'Bathroom', 'Bedroom', 'Living room', 'Balcony', 'Whole flat', 'Common area', 'Other'].map(c => `<option>${c}</option>`).join('')}</select></label></div>
      <fieldset><legend>How urgent?</legend><div class="pills">${[['Normal', 'Normal · reply within 72 h'], ['High', 'High · within 24 h'], ['Emergency', 'Emergency · within 4 h']].map(([v, l], i) => `<label><input type="radio" name="urgency" value="${v}" ${i === 0 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
      <label class="fl">Describe it<textarea name="desc" rows="3" placeholder="e.g. Water leaking under the kitchen sink since this morning"></textarea></label>
      <div class="two"><label class="fl">Best time for a visit<select name="visit"><option value="">Any time</option><option>Morning (9–12)</option><option>Afternoon (12–4)</option><option>Evening (4–8)</option><option>Weekend only</option></select></label>
      <label class="fl">Photos (optional)<input type="file" name="photos" accept="image/*" multiple></label></div>
      <label class="chk"><input type="checkbox" name="access" checked><span>Technician may enter if I'm not home (with notice)</span></label>
      <p class="val" id="tkHint" hidden>Emergency issues also alert the Keetown team immediately.</p><p class="err" id="tkE"></p>
      <div class="acts"><button class="btn btn-gold" type="submit">Send to owner</button><button class="btn btn-line" type="button" data-x>Cancel</button></div></form>`;
    dlg.showModal(); $('[data-x]', dlg).onclick = () => dlg.close();
    const f = $('#tkF'); f.addEventListener('change', () => $('#tkHint').hidden = f.urgency.value !== 'Emergency');
    f.onsubmit = e => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(f)), photos = [...f.photos.files].map(x => x.name);
      if (!d.desc.trim() || d.desc.trim().length < 8) return $('#tkE').textContent = 'Please describe the issue (a sentence is enough).';
      const k = T.addTicket(T.get(id), { cat: d.cat, room: d.room, urgency: d.urgency, desc: d.desc.trim(), visit: d.visit, access: !!d.access, photos }, 'tenant');
      if (d.urgency !== 'Normal') KTLead.addLead({ name: u.profile.name, phone: u.mobile, intent: 'manage', locality: t.loc, propertyId: t.propertyId, note: `${d.urgency} issue: ${d.cat} (${d.room}) at ${t.title} — ${d.desc.trim().slice(0, 80)}`, channel: 'tenant_issue' });
      window.KTTrack && KTTrack.event('issue_raised', { urgency: d.urgency, cat: d.cat });
      const msg = `Hi ${t.ownerName || ''}, I've reported an issue at ${t.title} on Keetown: ${d.cat} (${d.room}) — ${d.urgency} priority. ${d.desc.trim()}${d.visit ? ' Best time: ' + d.visit + '.' : ''}`;
      dlg.innerHTML = `<div class="m-body sent"><div class="sent-ic" aria-hidden="true">✓</div><h2 class="dlg-h">Your owner has been notified</h2><p class="sub">"${esc(k.cat)}" is in their portal now${d.urgency !== 'Normal' ? ' and the Keetown team has been alerted' : ''}. Expected first response within ${T.SLA[d.urgency]} hours. You'll see every update here.</p>
        <div class="acts"><a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/91${t.ownerMobile}?text=${encodeURIComponent(msg)}">Also message owner on WhatsApp</a>${d.urgency === 'Emergency' ? `<a class="btn btn-gold" href="tel:+${KT.brand.phone}">Call Keetown now</a>` : ''}<button class="btn btn-line" data-x>Done</button></div></div>`;
      $('[data-x]', dlg).onclick = () => dlg.close(); draw();
    };
  }
  B.myhome = () => {
    const a = $('#addTn'); if (a) a.onclick = () => tenancyForm(false); const dm = $('#demoTn'); if (dm) dm.onclick = () => { T.demo(u); draw(); toast('Sample tenancy loaded'); };
    $$('[data-tn]').forEach(sec => {
      const id = sec.dataset.tn;
      $$('[data-report]', sec).forEach(b => b.onclick = () => {
        dlg.innerHTML = `<form class="m-body" id="rpF"><h2 class="dlg-h">Mark rent as paid</h2><p class="sub">Your owner gets a notification to confirm. Your receipt is issued after confirmation.</p><label class="fl">UPI / bank reference (UTR)<input name="ref" placeholder="e.g. 4291XXXXXX12"></label><div class="acts"><button class="btn btn-gold" type="submit">Confirm I've paid</button><button class="btn btn-line" type="button" data-x>Cancel</button></div></form>`;
        dlg.showModal(); $('[data-x]', dlg).onclick = () => dlg.close();
        $('#rpF').onsubmit = e => { e.preventDefault(); T.report(T.get(id), b.dataset.report, e.target.ref.value.trim()); dlg.close(); draw(); toast('Marked as paid — your owner will confirm'); };
      });
      $$('[data-rcpt]', sec).forEach(b => b.onclick = () => { const t = T.get(id); T.receipt(t, t.payments.find(p => p.month === b.dataset.rcpt)); });
      $$('[data-tkt]', sec).forEach(b => b.onclick = () => ticketForm(id));
      $$('[data-cmt]', sec).forEach(fm => fm.onsubmit = e => { e.preventDefault(); const v = fm.txt.value.trim(); if (!v) return; T.comment(T.get(id), fm.dataset.cmt, v, 'tenant'); draw(); toast('Sent to your owner'); });
    });
    $$('[data-copy]').forEach(b => b.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(b.dataset.copy); toast('UPI ID copied'); });
  };

  /* ---------------- owner: rentals & rent ---------------- */
  V.rentals = () => {
    const ts = T.forUser(u.mobile).filter(t => t.ownerMobile === u.mobile); ts.forEach(T.runAuto);
    const head = `<h1>Rentals &amp; rent</h1><p class="sub">Track rent, send reminders, confirm payments, handle repairs and keep tenancy documents — for every property you let out.</p>${verifyBanner()}
      <div class="acts-row" style="margin-bottom:18px"><button class="btn btn-gold" id="addTn">Add a tenancy</button>${ts.length ? '' : '<button class="btn btn-line" id="demoTn">Explore with sample data</button>'}<a class="btn btn-line" href="management.html">Let Keetown manage it</a></div>`;
    if (!ts.length) return head + `<div class="empty-box"><p>No tenancies yet. Add your tenant's name and mobile — they'll see rent due dates, reminders and receipts in their own portal.</p></div>`;
    return head + ts.map(t0 => {
      const t = T.get(t0.id), r = T.current(t), led = T.ledger(t), sch = T.schedule(t), paidYear = led.filter(x => x.status === 'paid' && x.month.startsWith(String(new Date().getFullYear()))).reduce((a, x) => a + x.amount, 0), ag = T.agreement(t);
      return `<section class="tn" data-tn="${t.id}">
        <div class="tn-head"><div><p class="kind">${t.demo ? 'Sample · ' : ''}Tenant: ${esc(t.tenantName)} · +91 ${t.tenantMobile.replace(/^(\d{2})\d{5}/, '$1•••••')}</p><h2>${esc(t.title)}</h2><p class="sub">${inr(t.rent)}/month · due on the ${t.dueDay}${['th', 'st', 'nd', 'rd'][t.dueDay % 10 > 3 || [11, 12, 13].includes(t.dueDay) ? 0 : t.dueDay % 10]} · agreement ends ${T.fmtD(ag.end)}${ag.renewIn <= 45 ? ` <b class="warn">· renewal in ${ag.renewIn} days</b>` : ''}</p></div>
          <div class="tn-stat">${pill(r.status)}<b>${inr(r.status === 'paid' ? r.amount : r.balance)}</b><small>${r.status === 'paid' ? 'received' : r.received ? 'balance' : 'due'} · ${esc(r.label)}</small></div></div>
        <div class="tn-grid">
          <div class="pc"><h3>This cycle</h3><div class="acts-row">${r.status === 'reported' ? `<button class="btn btn-gold" data-confirm="${r.month}">Confirm ${inr(r.balance || r.amount)} received</button><button class="btn btn-line" data-record="${r.month}">Record a different amount</button>` : r.status !== 'paid' ? `<button class="btn btn-gold" data-record="${r.month}">Record payment</button><a class="btn btn-wa" target="_blank" rel="noopener" data-remind="${r.month}" href="https://wa.me/91${t.tenantMobile}?text=${encodeURIComponent(T.reminderText(t, r))}">Send reminder</a>` : `<p>Rent received in full.</p><button class="link" data-rcpt="${r.month}">Receipt</button>`}</div>
            ${r.status !== 'paid' ? '<p class="fine">Paid you directly — cash, UPI, bank transfer or cheque? Use <b>Record payment</b>. Part-payments are fine; the balance stays due.</p>' : ''}
            <p class="fine">Reminders sent: ${t.reminders.filter(x => x.month === r.month).length} · Collected this year: ${inr(paidYear)}</p>
            <h4 class="mini-h">Automatic reminders</h4>
            <label class="chk"><input type="checkbox" data-auto="enabled" ${t.auto.enabled ? 'checked' : ''}><span>Remind my tenant automatically on WhatsApp</span></label>
            <div class="two"><label class="fl">Before due date<select data-auto="daysBefore">${[1, 2, 3, 5, 7].map(n => `<option value="${n}" ${t.auto.daysBefore === n ? 'selected' : ''}>${n} day${n > 1 ? 's' : ''} before</option>`).join('')}</select></label><label class="fl">If unpaid, repeat every<select data-auto="overdueEvery">${[1, 2, 3, 5, 7].map(n => `<option value="${n}" ${t.auto.overdueEvery === n ? 'selected' : ''}>${n} day${n > 1 ? 's' : ''}</option>`).join('')}</select></label></div>
            ${sch.length ? `<p class="fine">Next: ${sch.map(([d, l]) => `${T.fmtD(d)} (${esc(l)})`).join(' · ')}</p>` : ''}<p class="fine">In production these are sent by Keetown's WhatsApp Business account; in this demo they appear in the tenant's portal.</p></div>
          <div class="pc"><h3>Rent ledger</h3><table class="ledger"><thead><tr><th>Month</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${led.slice(0, 8).map(x => `<tr><td>${esc(x.label)}</td><td>${amtCell(x)}</td><td>${pill(x.status)}</td><td class="lacts">${x.status === 'reported' ? `<button class="link" data-confirm="${x.month}">Confirm</button> <button class="link" data-record="${x.month}">Record</button>` : x.status === 'paid' ? `<button class="link" data-rcpt="${x.month}">Receipt</button> <button class="link mutl" data-undo="${x.month}">Undo</button>` : `<button class="link" data-record="${x.month}">Record</button>${x.status === 'partial' ? ` <button class="link mutl" data-undo="${x.month}">Undo</button>` : ''}`}</td></tr>`).join('')}</tbody></table></div>
        </div>
        <div class="tn-grid">
          <div class="pc"><h3>Property issues ${t.tickets.filter(k => k.status === 'Open').length ? `<span class="st st-overdue">${t.tickets.filter(k => k.status === 'Open').length} new</span>` : ''}</h3>${tickets(t, true)}</div>
          <div class="pc"><h3>Documents</h3><ul class="docs">${t.docs.map((dc, i) => `<li><span>${esc(dc.name)}</span><select data-doc="${i}" aria-label="Status of ${esc(dc.name)}">${['Pending', 'Requested', 'Submitted', 'Signed', 'Verified', 'Completed'].map(s => `<option ${s === dc.status ? 'selected' : ''}>${s}</option>`).join('')}</select></li>`).join('')}</ul>
            <p class="fine">Invite your tenant: they log in at <b>${location.host}/login.html</b> with +91 ${t.tenantMobile} and see this tenancy automatically.</p></div>
        </div></section>`;
    }).join('');
  };
  /* Owner: record rent received directly (cash, UPI, bank, cheque), full or part. */
  function payDialog(id, month) {
    const t = T.get(id), open = T.ledger(t).filter(x => x.status !== 'paid'), today = new Date().toISOString().slice(0, 10);
    const pick = open.find(x => x.month === month) || open[0]; if (!pick) return toast('Nothing due');
    dlg.innerHTML = `<form class="m-body" id="payF" novalidate><h2 class="dlg-h">Record payment received</h2><p class="sub">${esc(t.title)} · ${esc(t.tenantName)}</p>
      <label class="fl">Rent month<select name="month">${open.map(x => `<option value="${x.month}" ${x.month === pick.month ? 'selected' : ''}>${esc(x.label)} — ${x.received ? 'balance ' + inr(x.balance) : inr(x.amount)}</option>`).join('')}</select></label>
      <div class="two"><label class="fl">Amount received (₹)<input name="amount" inputmode="numeric" value="${pick.balance || pick.amount}"></label><label class="fl">Date received<input type="date" name="date" value="${today}" max="${today}"></label></div>
      <label class="fl">How was it paid?<select name="via">${T.MODES.map(m => `<option>${m}</option>`).join('')}</select></label>
      <div class="two"><label class="fl" id="refL">Reference (UTR / cheque no.)<input name="ref" placeholder="Optional"></label><label class="fl">Note<input name="note" placeholder="e.g. paid in two parts"></label></div>
      <p class="val" id="payHint"></p><p class="err" id="payE"></p>
      <div class="acts"><button class="btn btn-gold" type="submit">Save payment</button><button class="btn btn-line" type="button" data-x>Cancel</button></div>
      <p class="fine">Your tenant sees this in their updates. A receipt is issued once the month is fully paid.</p></form>`;
    dlg.showModal(); $('[data-x]', dlg).onclick = () => dlg.close();
    const f = $('#payF'), rowOf = () => open.find(x => x.month === f.month.value);
    const hint = () => { const r = rowOf(), a = Math.round(+f.amount.value || 0), left = r.balance - a; $('#payHint').textContent = !a ? '' : left > 0 ? `Part-payment: ${inr(left)} will remain due for ${r.label}.` : left === 0 ? `This settles ${r.label} in full.` : ''; $('#refL').querySelector('input').placeholder = f.via.value === 'Cash' ? 'Not needed for cash' : 'Optional'; };
    f.month.onchange = () => { f.amount.value = rowOf().balance; hint(); }; f.amount.oninput = () => { f.amount.value = f.amount.value.replace(/[^\d]/g, ''); hint(); }; f.via.onchange = hint; hint();
    f.onsubmit = e => {
      e.preventDefault(); const r = rowOf(), a = Math.round(+f.amount.value), err = $('#payE');
      if (!(a > 0)) return err.textContent = 'Enter the amount received.';
      if (a > r.balance) return err.textContent = `That's more than the ${inr(r.balance)} due for ${r.label}. Record any advance against the next month.`;
      if (!f.date.value || f.date.value > today) return err.textContent = 'Choose the date you received it (not in the future).';
      const t2 = T.recordPayment(T.get(id), r.month, { amount: a, via: f.via.value, date: f.date.value, ref: f.ref.value.trim(), note: f.note.value.trim() });
      dlg.close(); draw(); toast(T.status(t2, r.month) === 'paid' ? 'Payment recorded — receipt issued to your tenant' : `Part-payment recorded — ${inr(r.balance - a)} still due`);
    };
  }
  B.rentals = () => {
    $('#addTn').onclick = () => tenancyForm(true); const dm = $('#demoTn'); if (dm) dm.onclick = () => { T.demo(u); draw(); toast('Sample tenancy loaded'); };
    $$('[data-tn]').forEach(sec => {
      const id = sec.dataset.tn;
      $$('[data-remind]', sec).forEach(a => a.addEventListener('click', () => { T.remind(T.get(id), a.dataset.remind, 'owner'); setTimeout(draw, 400); toast('Reminder logged and shown to your tenant'); }));
      $$('[data-confirm]', sec).forEach(b => b.onclick = () => { const t = T.confirm(T.get(id), b.dataset.confirm, 'UPI / bank'); draw(); toast(T.status(t, b.dataset.confirm) === 'paid' ? 'Payment confirmed — receipt issued to tenant' : 'Recorded'); });
      $$('[data-record]', sec).forEach(b => b.onclick = () => payDialog(id, b.dataset.record));
      $$('[data-undo]', sec).forEach(b => b.onclick = () => { const r = T.ledger(T.get(id)).find(x => x.month === b.dataset.undo); if (!confirm(`Remove the payment record for ${r.label}? Your tenant will see it as unpaid again.`)) return; T.undo(T.get(id), b.dataset.undo); draw(); toast('Payment record removed'); });
      $$('[data-rcpt]', sec).forEach(b => b.onclick = () => { const t = T.get(id); T.receipt(t, t.payments.find(p => p.month === b.dataset.rcpt)); });
      $$('[data-auto]', sec).forEach(i => i.onchange = () => { const t = T.get(id); t.auto[i.dataset.auto] = i.type === 'checkbox' ? i.checked : +i.value; T.save(t); draw(); });
      $$('[data-tkmove]', sec).forEach(s => s.onchange = () => { T.moveTicket(T.get(id), s.dataset.tkmove, s.value); draw(); toast('Your tenant has been notified'); });
      $$('[data-cmt]', sec).forEach(fm => fm.onsubmit = e => { e.preventDefault(); const v = fm.txt.value.trim(); if (!v) return; T.comment(T.get(id), fm.dataset.cmt, v, 'owner'); draw(); toast('Reply sent to your tenant'); });
      $$('[data-handover]', sec).forEach(b => b.onclick = () => { const t = T.get(id), k = t.tickets.find(x => x.id === b.dataset.handover); KTLead.addLead({ name: u.profile.name, phone: u.mobile, intent: 'manage', locality: t.loc, note: `Repair handover: ${k.cat} at ${t.title}`, channel: 'repair_handover' }); T.moveTicket(t, k.id, 'Acknowledged', 'Handed over to Keetown'); draw(); toast('Keetown will coordinate the repair'); });
      $$('[data-doc]', sec).forEach(s => s.onchange = () => { const t = T.get(id); t.docs[+s.dataset.doc].status = s.value; T.save(t); toast('Updated'); });
    });
  };

  /* ---------------- buyer: my purchase ---------------- */
  V.purchase = () => {
    const ps = T.purchases(u.mobile);
    if (!ps.length) return `<h1>My purchase</h1><p class="sub">Bought through Keetown? Track your payment plan, registration, documents and possession in one place.</p><div class="empty-box"><p>Add the property you've booked to start tracking.</p><div class="acts-row"><button class="btn btn-gold" id="addPu">Add my purchase</button><button class="btn btn-line" id="demoPu">Explore with sample data</button></div></div>`;
    return `<h1>My purchase</h1>` + ps.map(x => {
      const paid = x.plan.filter(m => m.paidOn).reduce((a, m) => a + m.pct, 0), nx = x.plan.find(m => !m.paidOn), dDone = x.docs.filter(d => d.status !== 'Pending').length;
      return `<section class="tn" data-pu="${x.id}"><div class="tn-head"><div><p class="kind">${x.demo ? 'Sample · ' : ''}${esc(x.stage)}</p><h2>${esc(x.title)}</h2><p class="sub">${fmt.lakh(x.price)} · booked ${T.fmtD(x.booking)}${x.possession ? ' · possession ' + esc(x.possession) : ''}</p></div><div class="tn-stat"><b>${paid}%</b><small>paid</small></div></div>
        <div class="tn-grid"><div class="pc"><h3>Payment plan</h3><div class="agbar"><i style="width:${paid}%"></i></div>${nx ? `<p class="fine">Next: <b>${esc(nx.name)}</b> · ${inr(nx.amount)} · due ${T.fmtD(nx.due)}</p>` : '<p class="fine">All milestones paid.</p>'}
          <table class="ledger"><thead><tr><th>Milestone</th><th>Amount</th><th>Due</th><th></th></tr></thead><tbody>${x.plan.map((m, i) => `<tr><td>${esc(m.name)} <small>(${m.pct}%)</small></td><td>${inr(m.amount)}</td><td>${T.fmtD(m.due)}</td><td>${m.paidOn ? '<span class="st st-paid">Paid</span>' : `<button class="link" data-paid="${i}">Mark paid</button>`}</td></tr>`).join('')}</tbody></table>
          <p class="fine">Plus stamp duty &amp; registration ≈ ${inr(x.registration)} (~6% in Telangana)${x.stage === 'Under construction' ? ' and GST as applicable' : ''}.</p></div>
          <div class="pc"><h3>Documents &amp; handover <small class="fine">${dDone}/${x.docs.length}</small></h3><ul class="docs">${x.docs.map((d, i) => `<li><span>${esc(d.name)}</span><select data-pdoc="${i}" aria-label="Status">${['Pending', 'Received', 'Done'].map(s => `<option ${s === d.status ? 'selected' : ''}>${s}</option>`).join('')}</select></li>`).join('')}</ul></div></div>
        <div class="banner soft"><p><b>Planning to rent it out?</b> List it free or let Keetown manage tenants, rent and repairs.</p><div class="acts-row"><a class="btn btn-gold" href="post-property.html">List for rent</a><a class="btn btn-line" href="management.html">Property management</a></div></div></section>`;
    }).join('') + `<p><button class="btn btn-line sm" id="addPu">Add another purchase</button></p>`;
  };
  function purchaseForm() {
    const sales = properties.filter(x => x.mode === 'sale');
    dlg.innerHTML = `<form class="m-body" id="puF" novalidate><h2 class="dlg-h">Add my purchase</h2><label class="fl">Property<select name="pid"><option value="">Not listed on Keetown</option>${sales.map(x => `<option value="${x.id}">${esc(x.title)} — ${fmt.price(x)}</option>`).join('')}</select></label>
      <div class="two"><label class="fl">Title *<input name="title"></label><label class="fl">Price (₹ lakh) *<input name="price" inputmode="numeric"></label></div>
      <div class="two"><label class="fl">Stage<select name="stage"><option>Ready to move</option><option>Under construction</option></select></label><label class="fl">Booking date<input type="date" name="booking" value="${new Date().toISOString().slice(0, 10)}"></label></div>
      <label class="fl">Expected possession<input name="possession" placeholder="e.g. Dec 2027"></label><p class="err" id="puE"></p>
      <div class="acts"><button class="btn btn-gold" type="submit">Start tracking</button><button class="btn btn-line" type="button" data-x>Cancel</button></div></form>`;
    dlg.showModal(); $('[data-x]', dlg).onclick = () => dlg.close(); const f = $('#puF');
    f.pid.onchange = () => { const x = KT.byId(properties, f.pid.value); if (x) { f.title.value = x.title; f.price.value = x.price; f.stage.value = x.construction === 'Under construction' ? 'Under construction' : 'Ready to move'; } };
    f.onsubmit = e => { e.preventDefault(); const d = Object.fromEntries(new FormData(f)); if (!d.title.trim() || !(+d.price > 0)) return $('#puE').textContent = 'Enter the title and price.'; T.createPurchase(u, { ...d, propertyId: d.pid, loc: (KT.byId(properties, d.pid) || {}).loc }); dlg.close(); draw(); toast('Purchase added'); };
  }
  B.purchase = () => {
    $$('#addPu').forEach(b => b.onclick = purchaseForm); const dm = $('#demoPu'); if (dm) dm.onclick = () => { const x = T.createPurchase(u, { demo: true, propertyId: 'p1', title: 'Skyline 3BHK at Kokapet (sample)', price: 235, stage: 'Under construction', booking: new Date(Date.now() - 200 * 864e5).toISOString().slice(0, 10), possession: 'Dec 2027', loc: 'kokapet' }); x.plan.slice(0, 3).forEach(m => m.paidOn = m.due); x.docs.slice(0, 3).forEach(d => d.status = 'Received'); T.savePurchase(x); draw(); toast('Sample purchase loaded'); };
    $$('[data-pu]').forEach(sec => { const id = sec.dataset.pu, get = () => T.purchases(u.mobile).find(x => x.id === id);
      $$('[data-paid]', sec).forEach(b => b.onclick = () => { const x = get(); x.plan[+b.dataset.paid].paidOn = new Date().toISOString().slice(0, 10); T.savePurchase(x); draw(); toast('Milestone marked paid'); });
      $$('[data-pdoc]', sec).forEach(s => s.onchange = () => { const x = get(); x.docs[+s.dataset.pdoc].status = s.value; T.savePurchase(x); draw(); }); });
  };

  /* ---------------- listings / projects ---------------- */
  V.mine = () => {
    const ss = A.read('keetown_submissions', []).filter(x => x.mobile === u.mobile), label = u.role === 'builder' ? 'project' : 'property';
    return `<h1>${u.role === 'builder' ? 'My projects' : 'My listings'}</h1><p class="sub">Every listing is checked by our team (ownership documents, approvals${u.role === 'builder' ? ', RERA and GST' : ''}) before it goes live.</p>${verifyBanner()}
      <p><a class="btn btn-gold" href="post-property.html">Post a ${label}</a></p>
      <div class="pc">${ss.map(x => `<div class="row-i"><div class="grow"><b>${esc(x.title)}</b><br><small>${esc(loc(x.loc)?.name || '')} · ${esc(x.type)} · ${x.mode === 'rent' ? inr(x.price) + '/mo' : fmt.lakh(x.price)}${x.quality ? ' · quality ' + x.quality + '%' : ''} · submitted ${T.fmtD(x.at)}</small></div><span class="st st-due">${esc(canAct() ? x.status : 'Waiting for your verification')}</span></div>`).join('') || `<p class="fine">No ${label}s yet.</p>`}</div>
      ${u.role === 'owner' ? '<div class="banner soft"><p><b>Already have a tenant?</b> Track rent, reminders and repairs in Rentals &amp; rent.</p><button class="btn btn-line" data-go="rentals">Open rentals</button></div>' : ''}`;
  };

  /* ---------------- shortlist / searches / visits ---------------- */
  V.saved = () => { const ids = store().saved, ps = ids.map(i => KT.byId(properties, i)).filter(Boolean), w = M.requirement(u); return `<h1>Shortlist</h1><p class="sub">Properties you've saved.</p>${ps.length ? `<div class="mgrid">${ps.map(p => matchCard({ p, ...M.score(p, w) })).join('')}</div>` : '<div class="empty-box"><p>Nothing saved yet — tap ♡ on any property.</p><a class="btn btn-gold" href="properties.html">Browse properties</a></div>'}`; };
  B.saved = () => wireCards($('#pMain'));
  V.searches = () => { const list = A.read('keetown_searches_' + u.mobile, []), c = u.consent || {}; return `<h1>Saved searches</h1><p class="sub">Alerts: ${c.whatsapp ? 'WhatsApp on' : 'WhatsApp off'} · ${c.email ? 'email on' : 'email off'} — change in Settings.</p><div class="pc">${list.map((s, i) => `<div class="row-i"><div class="grow"><b>${esc(s.title)}</b><br><small>Saved ${T.fmtD(s.at)}</small></div><a class="btn btn-line sm" href="properties.html${esc(s.q)}">Open</a><button class="link" data-del="${i}">Delete</button></div>`).join('') || '<p class="fine">No saved searches. Use "Save search" on the properties page.</p>'}</div>`; };
  B.searches = () => $$('[data-del]').forEach(b => b.onclick = () => { const k = 'keetown_searches_' + u.mobile, l = A.read(k, []); l.splice(+b.dataset.del, 1); A.write(k, l); draw(); });
  V.visits = () => { const vs = store().visits; return `<h1>Visits</h1><p class="sub">We confirm slots on WhatsApp.</p><div class="pc">${vs.map(v => { const p = KT.byId(properties, v.pid); return `<div class="row-i"><div class="grow"><b>${p ? esc(p.title) : v.pid}</b><br><small>${T.fmtD(v.date)} · ${esc(v.time)}</small></div><span class="st st-due">${esc(v.status)}</span><a class="btn btn-wa sm" target="_blank" rel="noopener" href="${KT.wa(`Hi Keetown, confirming my visit for ${p ? p.title : v.pid} on ${v.date} (${v.time}).`)}">WhatsApp</a></div>`; }).join('') || '<p class="fine">No visits yet.</p>'}</div>`; };

  /* ---------------- Keetown for Business (company / HR) ---------------- */
  const C = window.KTCorp;
  const fmtD = d => d ? T.fmtD(d) : '—';
  const team = r => A.MODE === 'demo' || (r && r.demo) || !!(A.session() && A.session().staff);   // who may act as the Keetown coordinator
  const locN = id => (KT.loc(id) || {}).name || '';
  const stepper = (stages, cur) => `<ol class="stp">${stages.map((s, i) => `<li class="${i < cur ? 'd' : i === cur ? 'c' : ''}"><i></i><span>${esc(s)}</span></li>`).join('')}</ol>`;
  const bar = p => `<span class="pbar" style="--p:${p}"><i></i></span>`;
  const svcTag = s => `<span class="tag ${s === 'Done' || s === 'Preferred' ? 'live' : s === 'In progress' ? 'pend' : ''}">${esc(s)}</span>`;
  const when = at => new Date(at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  const thread = (list, me) => `<ul class="thr">${list.map(c => `<li class="${c.by === me ? 'me' : ''}"><small>${c.by === 'keetown' ? 'Keetown coordinator' : c.by === 'hr' ? 'HR' : 'Employee'} · ${when(c.at)}</small><p>${esc(c.text)}</p></li>`).join('') || '<li class="none">No messages yet.</li>'}</ul>`;
  const pkgName = r => (C.PACKAGES[r.package] || { name: 'Custom' }).name;

  V.bizhome = () => {
    const rs = C.relForCompany(u.mobile), act = rs.filter(r => r.status === 'Active'), os = C.offForCompany(u.mobile);
    const live = act.filter(r => r.stage < C.STAGES.length - 1), arriving = live.filter(r => { const d = C.daysTo(r.arrival); return d != null && d >= 0 && d <= 30; });
    const settled = act.filter(r => r.stage === C.STAGES.length - 1), avg = settled.length ? Math.round(settled.reduce((a, r) => a + (new Date(r.settledOn || r.created) - new Date(r.created)) / 864e5, 0) / settled.length) : null;
    const first = (u.profile.name || '').split(' ')[0];
    return `<h1>Welcome${first ? ', ' + esc(first) : ''}</h1><p class="sub">${esc(u.profile.company || 'Your company')} · Keetown for Business</p>
      ${u.quick ? `<div class="banner soft"><p><b>Complete your company profile</b> so invoices and coordinators have the right details.</p><button class="btn btn-gold" data-edit>Complete profile</button></div>` : ''}
      <div class="kpis"><button class="kpi" data-go="moves"><b>${live.length}</b><span>Moves in progress</span></button><button class="kpi" data-go="moves"><b>${arriving.length}</b><span>Arriving in 30 days</span></button>
      <button class="kpi" data-go="moves"><b>${settled.length}</b><span>Employees settled</span></button><button class="kpi" data-go="moves"><b>${avg != null ? avg + ' days' : '—'}</b><span>Average time to settle</span></button><button class="kpi" data-go="office"><b>${os.filter(o => o.status === 'Active').length}</b><span>Office searches</span></button></div>
      ${(() => { const w = act.filter(r => r.lock && r.lock.status === 'Awaiting company approval'); return w.length ? `<div class="banner alert"><p><b>${w.length} home${w.length > 1 ? 's' : ''} awaiting your approval.</b> ${w.map(r => esc(r.employeeName) + ': ' + esc(r.lock.title) + ' (' + inr(r.lock.rent) + ')').join(' · ')}</p><button class="btn btn-gold" data-rl="${w[0].id}">Review</button></div>` : ''; })()}
      <div class="biz-acts"><button class="btn btn-gold" data-go="newmove">+ Relocate an employee</button><button class="btn btn-line" data-go="newoffice">+ Find office space</button></div>
      <h2 class="sec-h">Moves in progress</h2>${live.length ? `<div class="pc">${live.map(moveRow).join('')}</div>` : '<div class="empty-box"><p>No active relocations. Add an employee and our coordinator calls them within one working day.</p></div>'}
      ${os.length ? `<h2 class="sec-h">Office space</h2><div class="pc">${os.map(officeRow).join('')}</div>` : ''}
      <div class="pc svc-grid"><h3>What Keetown handles for your people</h3><ul>${Object.values(C.SERVICES).map(([n, d]) => `<li><b>${esc(n)}</b><span>${esc(d)}</span></li>`).join('')}</ul></div>`;
  };
  const moveRow = r => { const d = C.daysTo(r.arrival); return `<div class="row-i mv" data-rl="${r.id}" role="button" tabindex="0"><div class="grow"><b>${esc(r.employeeName)}</b> <small>· ${esc(r.level || '')}${r.fromCity ? ' · from ' + esc(r.fromCity) : ''}</small><br><small>${r.status === 'Cancelled' ? 'Cancelled' : esc(C.STAGES[r.stage])} · arrives ${fmtD(r.arrival)}${d != null && d >= 0 && d <= 30 && r.stage < C.STAGES.length - 1 ? ` <b class="soon">in ${d} days</b>` : ''} · ${esc(pkgName(r))}${r.lock && r.lock.status === 'Awaiting company approval' ? ' · <b class="soon">approval needed</b>' : ''}</small></div>${bar(C.relProgress(r))}<span class="btn btn-line sm">Open</span></div>`; };
  const officeRow = o => `<div class="row-i mv" data-of="${o.id}" role="button" tabindex="0"><div class="grow"><b>${o.seats ? o.seats + ' seats' : (o.area || '') + ' sq.ft'} · ${esc(o.type)}</b><br><small>${esc(o.areas.map(locN).join(', ') || 'Any location')} · ${esc(C.OFFICE_STAGES[o.stage])} · start by ${fmtD(o.startBy)}</small></div>${bar(Math.round(o.stage / (C.OFFICE_STAGES.length - 1) * 100))}<span class="btn btn-line sm">Open</span></div>`;
  function bizWire() {
    const on = (el, fn) => { el.onclick = fn; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }; };
    $$('[data-rl]').forEach(x => on(x, () => moveDialog(x.dataset.rl))); $$('[data-of]').forEach(x => on(x, () => officeDialog(x.dataset.of)));
  }
  B.bizhome = () => bizWire();

  let mvFilter = 'active';
  V.moves = () => {
    const all = C.relForCompany(u.mobile), last = C.STAGES.length - 1;
    const list = all.filter(r => mvFilter === 'all' ? true : mvFilter === 'settled' ? r.stage === last && r.status === 'Active' : mvFilter === 'cancelled' ? r.status === 'Cancelled' : r.status === 'Active' && r.stage < last);
    const board = C.STAGES.map((s, i) => { const col = all.filter(r => r.status === 'Active' && r.stage === i); return `<div class="kb-col"><h4>${esc(s)} <span>${col.length}</span></h4>${col.map(r => `<button class="kb-card" data-rl="${r.id}"><b>${esc(r.employeeName)}</b><small>${fmtD(r.arrival)}</small></button>`).join('')}</div>`; }).join('');
    return `<h1>Employee moves</h1><p class="sub">Every relocation, from the first call to settled.</p>
      <div class="biz-acts"><button class="btn btn-gold" data-go="newmove">+ Relocate an employee</button></div>
      <div class="kb">${board}</div>
      <div class="seg-mini">${[['active', 'In progress'], ['settled', 'Settled'], ['cancelled', 'Cancelled'], ['all', 'All']].map(([k, t]) => `<button data-mf="${k}" class="${mvFilter === k ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="pc">${list.map(moveRow).join('') || '<p class="sub" style="margin:0">Nothing here.</p>'}</div>`;
  };
  B.moves = () => { bizWire(); $$('[data-mf]').forEach(b => b.onclick = () => { mvFilter = b.dataset.mf; draw(); }); };

  function moveDialog(id) {
    const r = C.relGet(id); if (!r) return toast('This relocation is no longer available.');
    const tm = team(r), role = u.role === 'company' ? 'hr' : 'employee', open = r.status === 'Active';
    const invite = `Hi ${r.employeeName.split(' ')[0]}, ${r.companyName} has arranged your Hyderabad move with Keetown Realty. Log in with this mobile number to see your relocation plan, homes that fit your allowance and next steps: ${location.origin}/login.html?role=tenant`;
    dlg.innerHTML = `<div class="m-body wide"><p class="kind">${esc(r.companyName)} · ${esc(pkgName(r))} package</p><h2 class="dlg-h">${esc(r.employeeName)}${open ? '' : ' <span class="tag">Cancelled</span>'}</h2>
      <p class="sub">${esc(r.level)}${r.fromCity ? ' · moving from ' + esc(r.fromCity) : ''} · ${esc(r.family)} · arrives ${fmtD(r.arrival)} · joins ${fmtD(r.joinDate)}</p>
      ${stepper(C.STAGES, r.stage)}
      <div class="kv2"><div><small>Housing budget</small><b>${r.budget ? (r.intent === 'rent' ? inr(r.budget) + ' / month' : fmt.lakh(r.budget)) : '—'}</b></div><div><small>Preferred areas</small><b>${esc(r.areas.map(locN).join(', ') || 'Open')}</b></div><div><small>Office</small><b>${esc(locN(r.office) || '—')}</b></div><div><small>Temporary stay</small><b>${r.tempNights ? r.tempNights + ' nights' : 'Not needed'}</b></div><div><small>Billing</small><b>${esc(r.billing)}${r.costCenter ? ' · ' + esc(r.costCenter) : ''}</b></div><div><small>Employee</small><b>+91 ${esc(r.employeeMobile)}</b></div></div>
      ${r.notes ? `<p class="val">${esc(r.notes)}</p>` : ''}
      ${r.lock ? `<h3 class="dh">Home</h3>${lockCard(r, role)}${role === 'hr' && r.lock.status === 'Awaiting company approval' ? '<div class="coord"><b>' + esc(r.employeeName.split(' ')[0]) + ' wants this home.</b><div><button class="btn btn-line sm" id="lkDec">Decline</button><button class="btn btn-gold sm" id="lkOk">Approve</button></div></div>' : ''}${tm && r.lock.status.startsWith('Approved') ? '<div class="coord"><b>' + (A.MODE === 'demo' || r.demo ? 'Demo: act as Keetown' : 'Keetown') + ': owner confirmed?</b><div><button class="btn btn-gold sm" id="lkLock">Mark locked</button></div></div>' : ''}` : ''}
      <h3 class="dh">Services</h3><ul class="svcl">${r.services.map(s => `<li><span><b>${esc(C.SERVICES[s.key][0])}</b><small>${esc(C.SERVICES[s.key][1])}</small></span>${tm && open ? `<select data-svc="${s.key}" aria-label="Status: ${esc(C.SERVICES[s.key][0])}">${C.SVC_STATUS.map(x => `<option ${x === s.status ? 'selected' : ''}>${x}</option>`).join('')}</select>` : svcTag(s.status)}</li>`).join('')}</ul>
      ${tm && open ? `<div class="coord"><b>${A.MODE === 'demo' || r.demo ? 'Demo: act as the Keetown coordinator' : 'Keetown coordinator'}</b><div><button class="btn btn-line sm" id="stBack" ${r.stage === 0 ? 'disabled' : ''}>← Stage</button><button class="btn btn-gold sm" id="stNext" ${r.stage === C.STAGES.length - 1 ? 'disabled' : ''}>Next stage →</button></div></div>` : ''}
      <h3 class="dh">Messages</h3>${thread(r.comments, role)}
      ${open ? `<form id="cmF" class="cm-f"><input name="t" placeholder="Write to the Keetown coordinator…" required maxlength="1000"><button class="btn btn-gold sm">Send</button></form>` : ''}
      <details class="logd"><summary>Activity (${r.log.length})</summary><ul>${r.log.map(l => `<li><small>${when(l.at)}</small> ${esc(l.text)}</li>`).join('')}</ul></details>
      <div class="acts-row">${role === 'hr' && open ? `<a class="btn btn-wa sm" target="_blank" rel="noopener" href="https://wa.me/91${esc(r.employeeMobile)}?text=${encodeURIComponent(invite)}">Invite ${esc(r.employeeName.split(' ')[0])} on WhatsApp</a><button class="btn btn-line sm danger" id="rlCancel">Cancel move</button>` : ''}<button class="btn btn-line sm" id="dClose">Close</button></div></div>`;
    if (!dlg.open) dlg.showModal();
    const re = () => { draw(); moveDialog(id); };
    $('#dClose', dlg).onclick = () => dlg.close();
    const cf = $('#cmF', dlg); if (cf) cf.onsubmit = e => { e.preventDefault(); const t = e.target.t.value.trim(); if (!t) return; C.relComment(C.relGet(id), t, role); re(); toast('Sent to your Keetown coordinator'); };
    $$('[data-svc]', dlg).forEach(s => s.onchange = () => { C.relService(C.relGet(id), s.dataset.svc, s.value); re(); });
    const nb = $('#stNext', dlg); if (nb) { nb.onclick = () => { C.relStage(C.relGet(id), r.stage + 1); re(); }; $('#stBack', dlg).onclick = () => { C.relStage(C.relGet(id), r.stage - 1); re(); }; }
    const lo = $('#lkOk', dlg); if (lo) { lo.onclick = () => { C.relLockDecide(C.relGet(id), true); re(); toast('Approved. Keetown is confirming with the owner.'); }; $('#lkDec', dlg).onclick = () => { const n = prompt('Reason (shared with the employee):', 'Above our housing policy'); if (n === null) return; C.relLockDecide(C.relGet(id), false, n); re(); }; }
    const ll = $('#lkLock', dlg); if (ll) ll.onclick = () => { C.relLockConfirm(C.relGet(id)); re(); toast('Home locked'); };
    const cx = $('#rlCancel', dlg); if (cx) cx.onclick = () => { if (confirm('Cancel this relocation? The Keetown team will be notified.')) { C.relCancel(C.relGet(id)); re(); } };
  }

  V.newmove = () => {
    const pk = Object.entries(C.PACKAGES), today = new Date().toISOString().slice(0, 10);
    return `<h1>Relocate an employee</h1><p class="sub">Our coordinator calls the employee within one working day. Fees are indicative until your agreement is signed.</p>
      <form class="pc" id="nmF" novalidate>
        <h3>Employee</h3>
        <div class="two"><label class="fl">Full name *<input name="employeeName" required maxlength="80"></label><label class="fl">Mobile (India) *<input name="employeeMobile" inputmode="numeric" maxlength="10" placeholder="98XXXXXXXX"></label></div>
        <div class="two"><label class="fl">Work email<input type="email" name="employeeEmail"></label><label class="fl">Role / level<input name="level" placeholder="e.g. Senior Engineer" maxlength="80"></label></div>
        <div class="two"><label class="fl">Moving from<input name="fromCity" placeholder="City or country" maxlength="60"></label><label class="fl">Family<select name="family"><option>Single</option><option>Couple</option><option>Couple + 1 child</option><option>Family of 4</option><option>Family of 5+</option></select></label></div>
        <div class="two"><label class="fl">Arrives in Hyderabad *<input type="date" name="arrival" min="${today}"></label><label class="fl">Joining date<input type="date" name="joinDate"></label></div>
        <h3>Home</h3>
        <div class="two"><label class="fl">Looking to<select name="intent"><option value="rent">Rent</option><option value="buy">Buy</option></select></label><label class="fl"><span id="budL">Housing budget (₹ per month)</span><input name="budget" inputmode="numeric" placeholder="e.g. 60000"></label></div>
        <div class="two"><label class="fl">Bedrooms<select name="beds"><option value="">Any</option><option value="1">1 BHK</option><option value="2">2 BHK</option><option value="3">3 BHK</option><option value="4">4+ BHK</option></select></label><label class="fl">Office locality<select name="office">${KT.localities.map(l => `<option value="${l.id}" ${u.profile.office === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></label></div>
        <fieldset><legend>Preferred areas (optional, we suggest by commute)</legend><div class="pills">${KT.localities.map(l => `<label><input type="checkbox" name="areas" value="${l.id}"><span>${esc(l.name)}</span></label>`).join('')}</div></fieldset>
        <h3>Package</h3>
        <div class="pk">${pk.map(([k, p], i) => `<label class="pk-o"><input type="radio" name="package" value="${k}" ${i === 1 ? 'checked' : ''}><span><b>${p.name}</b><em>${inr(p.fee)} / move*</em><small>${esc(p.blurb)}</small><ul>${p.services.map(s => `<li>${esc(C.SERVICES[s][0])}</li>`).join('')}</ul></span></label>`).join('')}
          <label class="pk-o"><input type="radio" name="package" value="custom"><span><b>Custom</b><em>Pick services</em><small>Only what this move needs.</small><div class="pk-c">${Object.entries(C.SERVICES).map(([k, [n]]) => `<label><input type="checkbox" name="services" value="${k}" ${k === 'consult' ? 'checked' : ''}> ${esc(n)}</label>`).join('')}</div></span></label></div>
        <div class="two"><label class="fl">Temporary stay (nights)<input name="tempNights" inputmode="numeric" placeholder="0"></label><label class="fl">Billing<select name="billing"><option>Company pays Keetown</option><option>Employee pays, company reimburses</option></select></label></div>
        <div class="two"><label class="fl">Cost centre / PO (optional)<input name="costCenter" maxlength="40"></label><label class="fl">Notes for the coordinator<input name="notes" placeholder="Pets, school needs, special requests" maxlength="500"></label></div>
        <p class="fine">*Indicative fee per move, excluding GST, rent, deposits and third-party costs (hotel, movers). Final fees as per your signed agreement.</p>
        <p class="err" id="nmE" role="alert"></p><button class="btn btn-gold" id="nmGo">Submit relocation request</button>
      </form>`;
  };
  B.newmove = () => {
    const f = $('#nmF'); f.employeeMobile.oninput = () => f.employeeMobile.value = f.employeeMobile.value.replace(/\D/g, '').slice(0, 10);
    ['budget', 'tempNights'].forEach(n => f[n].oninput = () => f[n].value = f[n].value.replace(/\D/g, '').slice(0, 9));
    f.intent.onchange = () => { $('#budL').textContent = f.intent.value === 'rent' ? 'Housing budget (₹ per month)' : 'Purchase budget (₹ lakh)'; f.budget.placeholder = f.intent.value === 'rent' ? 'e.g. 60000' : 'e.g. 150'; };
    f.onsubmit = e => {
      e.preventDefault(); const fd = new FormData(f), d = Object.fromEntries(fd); d.areas = fd.getAll('areas'); d.services = fd.getAll('services');
      const dup = C.relForCompany(u.mobile).some(r => r.status === 'Active' && r.employeeMobile === d.employeeMobile && r.stage < C.STAGES.length - 1);
      const err = !d.employeeName.trim() ? 'Enter the employee’s name.' : !A.validMobile(d.employeeMobile) ? 'Enter a valid 10-digit Indian mobile number.' : d.employeeMobile === u.mobile ? 'Use the employee’s own mobile number, not yours.' : dup ? 'This employee already has a move in progress.' : !d.arrival ? 'Choose the arrival date.' : d.employeeEmail && !/^\S+@\S+\.\S+$/.test(d.employeeEmail) ? 'Enter a valid work email.' : d.package === 'custom' && !d.services.length ? 'Pick at least one service.' : '';
      if (err) return $('#nmE').textContent = err;
      $('#nmGo').disabled = true; d.employeeName = d.employeeName.trim();
      const r = C.relCreate(u, d); C.lead(u, 'relocation', `Relocation: ${r.employeeName} from ${r.fromCity || '—'}, arrives ${fmtD(r.arrival)}, ${pkgName(r)}`);
      window.KTTrack && KTTrack.event('relocation_requested', { package: r.package });
      go('moves'); toast('Request sent. Our coordinator will call ' + r.employeeName.split(' ')[0] + ' within one working day.'); moveDialog(r.id);
    };
  };

  V.office = () => { const os = C.offForCompany(u.mobile); return `<h1>Office space</h1><p class="sub">Managed offices, coworking and leased floors across Hyderabad's business districts.</p>
      <div class="biz-acts"><button class="btn btn-gold" data-go="newoffice">+ New office requirement</button></div>
      ${os.length ? `<div class="pc">${os.map(officeRow).join('')}</div>` : '<div class="empty-box"><p>Tell us seats, locations and budget. We share a verified shortlist within 3 working days.</p></div>'}
      <div class="pc svc-grid"><h3>How we run an office search</h3><ul>${C.OFFICE_STAGES.map((s, i) => `<li><b>${i + 1}. ${esc(s)}</b><span>${esc(C.OFFICE_STEPS[i])}</span></li>`).join('')}</ul></div>`; };
  B.office = () => bizWire();

  V.newoffice = () => `<h1>New office requirement</h1><p class="sub">A verified shortlist arrives within 3 working days.</p>
    <form class="pc" id="noF" novalidate>
      <div class="two"><label class="fl">Seats needed<input name="seats" inputmode="numeric" placeholder="e.g. 80"></label><label class="fl">Or carpet area (sq.ft)<input name="area" inputmode="numeric" placeholder="e.g. 6000"></label></div>
      <div class="two"><label class="fl">Type<select name="type">${C.OFFICE_TYPES.map(t => `<option>${t}</option>`).join('')}</select></label><label class="fl">Start by<input type="date" name="startBy" min="${new Date().toISOString().slice(0, 10)}"></label></div>
      <fieldset><legend>Locations *</legend><div class="pills">${KT.localities.map(l => `<label><input type="checkbox" name="areas" value="${l.id}" ${u.profile.office === l.id ? 'checked' : ''}><span>${esc(l.name)}</span></label>`).join('')}</div></fieldset>
      <div class="two"><label class="fl">Budget (₹)<input name="budget" inputmode="numeric" placeholder="e.g. 9000"></label><label class="fl">Budget is<select name="budgetUnit"><option>per seat / month</option><option>per sq.ft / month</option><option>total / month</option></select></label></div>
      <div class="two"><label class="fl">Lease term (years)<select name="termYears"><option>1</option><option>2</option><option selected>3</option><option>5</option><option>9</option></select></label><label class="fl">Car parks needed<input name="parking" inputmode="numeric" placeholder="e.g. 20"></label></div>
      <fieldset><legend>Must-haves</legend><div class="pills">${['24×7 access', 'DG power backup', 'Cafeteria', 'Meeting rooms', 'Server room', 'Metro / bus access', 'SEZ', 'Branding rights'].map(n => `<label><input type="checkbox" name="needs" value="${n}"><span>${n}</span></label>`).join('')}</div></fieldset>
      <label class="fl">Notes<textarea name="notes" rows="3" maxlength="1000" placeholder="Growth plans, layout, client-facing areas…"></textarea></label>
      <p class="err" id="noE" role="alert"></p><button class="btn btn-gold" id="noGo">Submit office requirement</button></form>`;
  B.newoffice = () => {
    const f = $('#noF'); ['seats', 'area', 'budget', 'parking'].forEach(n => f[n].oninput = () => f[n].value = f[n].value.replace(/\D/g, '').slice(0, 9));
    f.onsubmit = e => {
      e.preventDefault(); const fd = new FormData(f), d = Object.fromEntries(fd); d.areas = fd.getAll('areas'); d.needs = fd.getAll('needs');
      const err = !(+d.seats || +d.area) ? 'Enter seats or carpet area.' : !d.areas.length ? 'Choose at least one location.' : '';
      if (err) return $('#noE').textContent = err;
      $('#noGo').disabled = true;
      const o = C.offCreate(u, d); C.lead(u, 'office', `Office: ${o.seats ? o.seats + ' seats' : o.area + ' sq.ft'}, ${o.type}, ${o.areas.map(locN).join('/')}`);
      window.KTTrack && KTTrack.event('office_requested', { seats: o.seats });
      go('office'); toast('Requirement received. Shortlist within 3 working days.'); officeDialog(o.id);
    };
  };

  function officeDialog(id) {
    const o = C.offGet(id); if (!o) return toast('This requirement is no longer available.'); const tm = team(o), cand = C.offMatches(o);
    dlg.innerHTML = `<div class="m-body wide"><p class="kind">Office space · ${esc(o.companyName)}</p><h2 class="dlg-h">${o.seats ? o.seats + ' seats' : o.area + ' sq.ft'} · ${esc(o.type)}</h2>
      <p class="sub">${esc(o.areas.map(locN).join(', '))} · budget ${o.budget ? inr(o.budget) + ' ' + esc(o.budgetUnit) : 'open'} · ${o.termYears}-year term · start by ${fmtD(o.startBy)}</p>
      ${stepper(C.OFFICE_STAGES, o.stage)}
      <h3 class="dh">Shortlist</h3>${o.shortlist.length ? `<ul class="svcl">${o.shortlist.map((s, i) => `<li><span><b>${esc(s.name)}</b><small>${s.area ? s.area.toLocaleString('en-IN') + ' sq.ft · ' : ''}${esc(s.rent || '')}${s.note ? ' · ' + esc(s.note) : ''}</small></span><span class="sl-a">${svcTag(s.status)}${s.status !== 'Rejected' && s.status !== 'Preferred' ? `<button class="link" data-sl="${i}" data-v="Preferred">Prefer</button><button class="link" data-sl="${i}" data-v="Rejected">Reject</button>` : ''}</span></li>`).join('')}</ul>` : '<p class="sub">Our team is preparing your shortlist.</p>'}
      ${tm ? `<form class="cm-f" id="slF"><input name="n" placeholder="Add an option to the shortlist (name · rent · note)" maxlength="200"><button class="btn btn-line sm">Add</button></form>` : ''}
      ${cand.length ? `<p class="fine">Commercial listings on Keetown in your areas: ${cand.map(p => `<a href="${url.property(p)}">${esc(p.title)}</a>`).join(' · ')}</p>` : ''}
      ${tm ? `<div class="coord"><b>${A.MODE === 'demo' || o.demo ? 'Demo: act as the Keetown coordinator' : 'Keetown coordinator'}</b><div><button class="btn btn-line sm" id="stBack" ${o.stage === 0 ? 'disabled' : ''}>← Stage</button><button class="btn btn-gold sm" id="stNext" ${o.stage === C.OFFICE_STAGES.length - 1 ? 'disabled' : ''}>Next stage →</button></div></div>` : ''}
      <h3 class="dh">Due-diligence checklist</h3><ul class="chk2">${o.checks.map((c, i) => `<li class="${c.status === 'Cleared' ? 'ok' : ''}">${esc(c.name)}${tm ? `<button class="link" data-ck="${i}">${c.status === 'Cleared' ? 'Cleared ✓' : 'Mark cleared'}</button>` : `<small>${esc(c.status)}</small>`}</li>`).join('')}</ul>
      <h3 class="dh">Messages</h3>${thread(o.comments, 'hr')}
      <form id="cmF" class="cm-f"><input name="t" placeholder="Write to the Keetown team…" required maxlength="1000"><button class="btn btn-gold sm">Send</button></form>
      <details class="logd"><summary>Activity (${o.log.length})</summary><ul>${o.log.map(l => `<li><small>${when(l.at)}</small> ${esc(l.text)}</li>`).join('')}</ul></details>
      <div class="acts-row"><button class="btn btn-line sm" id="dClose">Close</button></div></div>`;
    if (!dlg.open) dlg.showModal();
    const re = () => { draw(); officeDialog(id); };
    $('#dClose', dlg).onclick = () => dlg.close();
    $('#cmF', dlg).onsubmit = e => { e.preventDefault(); const t = e.target.t.value.trim(); if (!t) return; C.offComment(C.offGet(id), t, 'hr'); re(); toast('Sent'); };
    $$('[data-sl]', dlg).forEach(b => b.onclick = () => { C.offShort(C.offGet(id), +b.dataset.sl, b.dataset.v); re(); });
    $$('[data-ck]', dlg).forEach(b => b.onclick = () => { C.offCheck(C.offGet(id), +b.dataset.ck); re(); });
    const sf = $('#slF', dlg); if (sf) sf.onsubmit = e => { e.preventDefault(); const [name, rent, note] = e.target.n.value.split('·').map(x => x.trim()); if (!name) return; C.offAddOption(C.offGet(id), { name, rent: rent || '', note: note || '' }); re(); };
    const nb = $('#stNext', dlg); if (nb) { nb.onclick = () => { C.offStage(C.offGet(id), o.stage + 1); re(); }; $('#stBack', dlg).onclick = () => { C.offStage(C.offGet(id), o.stage - 1); re(); }; }
  }

  V.billing = () => {
    const rs = C.relForCompany(u.mobile).filter(r => r.status === 'Active'), tot = rs.reduce((a, r) => a + C.relFee(r), 0);
    return `<h1>Billing</h1><p class="sub">Indicative fees per move. Invoices are raised with GST against your agreement${u.profile.gst ? ' (GSTIN ' + esc(u.profile.gst) + ')' : ''}.</p>
      <div class="kpis"><div class="kpi"><b>${inr(tot)}</b><span>Indicative fees, active moves</span></div><div class="kpi"><b>${rs.length}</b><span>Billable moves</span></div></div>
      <div class="pc tbl-w"><table class="tbl"><thead><tr><th>Employee</th><th>Package</th><th>Cost centre</th><th>Billing</th><th>Status</th><th class="r">Fee*</th></tr></thead><tbody>${rs.map(r => `<tr><td>${esc(r.employeeName)}</td><td>${esc(pkgName(r))}</td><td>${esc(r.costCenter || '—')}</td><td>${esc(r.billing)}</td><td>${r.stage === C.STAGES.length - 1 ? '<span class="tag live">Invoice due</span>' : '<span class="tag">In progress</span>'}</td><td class="r">${inr(C.relFee(r))}</td></tr>`).join('') || '<tr><td colspan="6">No moves yet.</td></tr>'}</tbody></table>
      <p class="fine">*Excluding GST, rent, deposits and third-party costs (hotel, movers, schools). Placeholder rates until your agreement is signed.</p></div>
      ${(() => { const h = rs.filter(r => r.lock && r.lock.mode === 'rent' && r.lock.status !== 'Declined'); const tc = h.filter(r => r.lock.status === 'Locked').reduce((a, r) => a + r.lock.companyPays, 0); return `<h2 class="sec-h">Rent paid from allowances</h2><div class="pc tbl-w"><table class="tbl"><thead><tr><th>Employee</th><th>Home</th><th>Status</th><th class="r">Allowance</th><th class="r">Company pays</th><th class="r">Employee pays</th></tr></thead><tbody>${h.map(r => `<tr><td>${esc(r.employeeName)}</td><td>${esc(r.lock.title)}</td><td>${esc(r.lock.status)}</td><td class="r">${inr(r.budget)}</td><td class="r">${inr(r.lock.companyPays)}</td><td class="r">${inr(r.lock.employeePays)}</td></tr>`).join('') || '<tr><td colspan="6">No homes locked yet.</td></tr>'}</tbody></table><p class="fine">Committed monthly rent for locked homes: <b>${inr(tc)}</b>. Rent goes to the owner each month against the lease; Keetown tracks it like any tenancy.</p></div>`; })()}`;
  };

  /* employee side: "My relocation" — details arrive pre-filled from the company's request */
  const lockCard = (r, who) => { const l = r.lock; if (!l) return ''; const st = l.status, ok = st === 'Locked', dec = st === 'Declined';
    return `<div class="lockc ${ok ? 'ok' : dec ? 'no' : ''}"><div><p class="kind">${ok ? 'Your home is locked' : dec ? 'Not approved' : 'Home lock in progress'}</p><h3>${esc(l.title)}</h3>
      <p class="sub">${esc(locN(l.loc))} · ${l.mode === 'rent' ? inr(l.rent) + ' / month' : fmt.lakh(l.rent)}</p>
      <div class="pay3"><div><small>Company pays${l.mode === 'rent' ? ' from allowance' : ''}</small><b>${l.mode === 'rent' ? inr(l.companyPays) + ' / mo' : '—'}</b></div><div><small>${who === 'hr' ? 'Employee share' : 'Your share'}</small><b>${l.mode === 'rent' ? inr(l.employeePays) + ' / mo' : '—'}</b></div><div><small>Status</small><b>${esc(st)}</b></div></div>
      ${l.note ? `<p class="val">${esc(l.note)}</p>` : ''}</div>${stepper(['Requested', 'Company approved', 'Locked with owner'], ok ? 3 : st.startsWith('Approved') ? 2 : dec ? 0 : 1)}</div>`; };
  V.relocation = () => {
    const rs = C.relForEmployee(u.mobile); if (!rs.length) return '<h1>My relocation</h1><p class="sub">No relocation linked to +91 ' + u.mobile + '.</p>';
    return rs.map(r => {
      const homes = C.nearOffice(r), canLock = !r.lock || r.lock.status === 'Declined', o = locN(r.office);
      return `<h1>Your move to Hyderabad</h1><p class="sub">Arranged by ${esc(r.companyName)} · arriving ${fmtD(r.arrival)}${r.intent === 'rent' && r.budget ? ' · rent allowance ' + inr(r.budget) + ' / month' : ''}</p>${stepper(C.STAGES, r.stage)}
        ${lockCard(r, 'employee')}
        <h2 class="sec-h">${canLock ? 'Pick your home' : 'Other homes'} near ${esc(o || 'your office')}</h2>
        <p class="sub">Sorted by distance from your office. ${r.intent === 'rent' ? `Rent up to ${inr(r.budget)} is paid by ${esc(r.companyName)}; above that, the difference is yours.` : ''}${canLock ? ' Lock one home; your company approves and we confirm it with the owner.' : ''}</p>
        <div class="mgrid">${homes.map(({ p, km, held, over }) => { const l = loc(p.loc), sp = C.split(r, p.price), mine = r.lock && r.lock.pid === p.id;
          return `<article class="mcard hc${held ? ' held' : ''}"><a class="mc-art" href="${url.property(p)}">${KTArt(p, 400, 225)}</a><div class="mc-body">
            <div class="mc-top"><div><h4><a href="${url.property(p)}">${esc(p.title)}</a></h4><p class="mc-sub">${esc(l.name)} · ${p.beds ? p.beds + ' BHK · ' : ''}${fmt.price(p)}</p></div></div>
            <ul class="why">${km != null ? `<li class="${km <= 6 ? 'ok' : 'no'}">${km < 1 ? 'Under 1 km' : km.toFixed(1) + ' km'} from office</li>` : ''}${p.verified ? '<li class="ok">Verified</li>' : ''}${r.intent === 'rent' ? (over ? `<li class="no">You pay ${inr(sp.employee)}/mo</li>` : '<li class="ok">Fully covered</li>') : ''}</ul>
            <div class="mc-acts">${held && !mine ? '<span class="tag">Reserved</span>' : mine ? `<span class="tag live">${esc(r.lock.status)}</span>` : canLock ? `<button class="btn btn-gold sm" data-lock="${r.id}|${p.id}">Lock this home</button>` : ''}<a class="btn btn-line sm" href="${url.property(p)}">Details</a></div></div></article>`; }).join('') || '<div class="empty-box"><p>No homes in your allowance yet. Your coordinator is sourcing off-market options.</p></div>'}</div>
        <div class="pc"><h3>Your services</h3><ul class="svcl">${r.services.map(s => `<li><span><b>${esc(C.SERVICES[s.key][0])}</b><small>${esc(C.SERVICES[s.key][1])}</small></span>${svcTag(s.status)}</li>`).join('')}</ul></div>
        <div class="pc"><h3>Messages with your coordinator</h3>${thread(r.comments, 'employee')}<form class="cm-f" data-cm="${r.id}"><input name="t" placeholder="Ask anything about your move…" required maxlength="1000"><button class="btn btn-gold sm">Send</button></form></div>`; }).join('');
  };
  B.relocation = () => {
    $$('[data-cm]').forEach(f => f.onsubmit = e => { e.preventDefault(); const t = f.t.value.trim(); if (!t) return; C.relComment(C.relGet(f.dataset.cm), t, 'employee'); draw(); toast('Sent to your coordinator'); });
    $$('[data-lock]').forEach(b => b.onclick = () => {
      const [rid, pid] = b.dataset.lock.split('|'), r = C.relGet(rid), p = KT.byId(properties, pid), sp = C.split(r, p.price);
      dlg.innerHTML = `<div class="m-body"><p class="kind">Lock this home</p><h2 class="dlg-h">${esc(p.title)}</h2><p class="sub">${esc(loc(p.loc).name)} · ${fmt.price(p)}</p>
        ${p.mode === 'rent' ? `<div class="pay3"><div><small>${esc(r.companyName)} pays</small><b>${inr(sp.company)} / mo</b></div><div><small>You pay</small><b>${inr(sp.employee)} / mo</b></div><div><small>Allowance</small><b>${r.budget ? inr(r.budget) : 'Not set'}</b></div></div>` : ''}
        <p class="fine">Locking asks ${esc(r.companyName)} to approve. Once approved, Keetown confirms with the owner and reserves the home for you. You can lock one home at a time.</p>
        <div class="acts-row"><button class="btn btn-gold" id="lkGo">Request lock</button><button class="btn btn-line" id="lkNo">Cancel</button></div><p class="err" id="lkE" role="alert"></p></div>`;
      dlg.showModal(); $('#lkNo', dlg).onclick = () => dlg.close();
      $('#lkGo', dlg).onclick = async () => { $('#lkGo', dlg).disabled = true; await C.loadLocks(); try { C.relLock(C.relGet(rid), p); dlg.close(); draw(); toast('Lock requested. ' + r.companyName + ' will approve shortly.'); } catch (e) { $('#lkE', dlg).textContent = e.message; } };
    });
  };
  if (window.KTCorp) C.loadLocks().then(() => { if (tab === 'relocation') draw(); });

  /* ---------------- builder inventory (builder + their workers) ---------------- */
  const I = window.KTInv;
  const isAdmin = () => u.role === 'admin' && A.isStaff();
  const actingBuilder = () => u.profile.staffOf || u.mobile;   // workers upload on their builder's behalf
  const actingName = () => isAdmin() ? 'Keetown Realty' : u.profile.staffOf ? (u.profile.company || 'your builder') : (u.profile.company || u.profile.name || 'your company');
  let invList = null, invQ = '', invProj = '', invStatus = '', invBld = '', invSel = new Set(), invPage = 0;
  const mineNow = () => isAdmin() ? I.all() : I.forBuilder(actingBuilder());
  const loadInv = () => I.loadMine().then(() => { invList = mineNow(); if (['inventory', 'home'].includes(tab)) draw(); });
  const invNow = () => invList || mineNow();
  const money = (mode, p) => mode === 'rent' ? inr(p) + '/mo' : fmt.lakh(p);

  V.inventory = () => {
    const list = invNow(), P = I.projects(list), PER = 50;
    const f = list.filter(x => (!invBld || x.builderName === invBld) && (!invProj || x.project === invProj) && (!invStatus || x.status === invStatus) && (!invQ || (x.project + ' ' + x.tower + ' ' + x.unitNo + ' ' + x.facing).toLowerCase().includes(invQ.toLowerCase())))
      .sort((a, b) => a.project.localeCompare(b.project) || String(a.tower).localeCompare(String(b.tower)) || String(a.unitNo).localeCompare(String(b.unitNo), undefined, { numeric: true }));
    const pages = Math.max(1, Math.ceil(f.length / PER)); invPage = Math.min(invPage, pages - 1); const rows = f.slice(invPage * PER, invPage * PER + PER);
    const under = list.filter(x => x.review === 'Under review').length;
    if (isAdmin() && !list.length && !invList) loadInv();
    return `<h1>${isAdmin() ? 'All inventory' : 'Inventory'}</h1><p class="sub">${esc(actingName())} · ${list.length.toLocaleString('en-IN')} units across ${P.length} project${P.length === 1 ? '' : 's'}${u.profile.staffOf ? ' · you are uploading as a team member' : ''}${isAdmin() ? ' · Keetown admin: you can edit, mark sold or remove any unit' : ''}</p>
      ${under && A.MODE === 'live' ? `<div class="banner soft"><p><b>${under} units are under review.</b> They go live on the website once Keetown verifies your RERA and GST (usually one working day).</p></div>` : ''}
      <div class="biz-acts"><button class="btn btn-gold" data-go="upload">⬆ Bulk upload</button>${list.length ? '<button class="btn btn-line" id="invCsv">Download all as CSV</button>' : ''}</div>
      ${P.length ? `<div class="kpis">${P.slice(0, 8).map(p => `<button class="kpi" data-proj="${esc(p.name)}"><b>${p.available.toLocaleString('en-IN')} <small style="font-size:.8rem;color:var(--muted)">/ ${p.units}</small></b><span>${esc(p.name)} · ${esc((KT.loc(p.loc) || {}).name || '')}<br>${[...p.modes].join(' & ')} · ${p.min === p.max ? money([...p.modes][0], p.min) : money([...p.modes][0], p.min) + '–' + money([...p.modes][0], p.max)}</span></button>`).join('')}</div>` : ''}
      ${list.length ? `<div class="pf2"><input id="invQ" placeholder="Search unit, tower, facing…" value="${esc(invQ)}" style="padding:9px 12px;border-radius:8px;border:1px solid var(--line);min-width:220px">
        ${isAdmin() ? `<select id="invB"><option value="">All owners &amp; builders</option>${[...new Set(list.map(x => x.builderName || 'Keetown Realty'))].map(b => `<option ${b === invBld ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>` : ''}
        <select id="invP"><option value="">All projects</option>${P.map(p => `<option ${p.name === invProj ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
        <select id="invS"><option value="">Any status</option>${I.STATUSES.map(s => `<option ${s === invStatus ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div class="bulkbar" id="bulkbar" ${invSel.size ? '' : 'hidden'}><b><span id="selN">${invSel.size}</span> selected</b>${I.STATUSES.map(s => `<button class="btn btn-line sm" data-bulk="${s}">Mark ${s}</button>`).join('')}<button class="btn btn-line sm danger" data-bulk="delete">Delete</button><button class="link" data-bulk="clear">Clear</button></div>
      <div class="pc tbl-w"><table class="tbl inv"><thead><tr><th><input type="checkbox" id="selAll" aria-label="Select all on this page"></th><th>Project</th><th>Unit</th><th>Type</th><th>Area</th><th>Floor</th><th>Facing</th><th class="r">Price</th><th>Status</th>${A.MODE === 'live' ? '<th>Website</th>' : ''}</tr></thead><tbody>
        ${rows.map(x => `<tr><td><input type="checkbox" data-sel="${x.id}" ${invSel.has(x.id) ? 'checked' : ''} aria-label="Select ${esc(x.unitNo)}"></td><td>${esc(x.project)}${isAdmin() ? `<br><small>${esc(x.builderName || 'Keetown Realty')}</small>` : ''}</td><td><b>${esc(x.tower ? x.tower + '-' : '')}${esc(x.unitNo)}</b></td><td>${x.beds ? x.beds + ' BHK ' : ''}${esc(x.type)} · ${x.mode}</td><td>${x.area.toLocaleString('en-IN')}</td><td>${esc(x.floor)}</td><td>${esc(x.facing)}</td>
          <td class="r"><button class="link" data-price="${x.id}" title="Edit price">${money(x.mode, x.price)}</button></td><td><span class="tag ${x.status === 'Available' ? 'live' : x.status === 'Hold' ? 'pend' : ''}">${x.status}</span></td>${A.MODE === 'live' ? `<td>${x.review === 'Live' ? '<span class="tag live">Live</span>' : '<span class="tag pend">Review</span>'}</td>` : ''}</tr>`).join('') || `<tr><td colspan="10">No units match.</td></tr>`}</tbody></table>
        <div class="pager"><span>${f.length ? invPage * PER + 1 : 0}–${Math.min(f.length, (invPage + 1) * PER)} of ${f.length.toLocaleString('en-IN')}</span><button class="btn btn-line sm" id="pgPrev" ${invPage ? '' : 'disabled'}>← Prev</button><button class="btn btn-line sm" id="pgNext" ${invPage < pages - 1 ? '' : 'disabled'}>Next →</button></div></div>`
      : `<div class="empty-box"><p><b>No inventory yet.</b> Upload your whole project in one go from Excel or Google Sheets.</p><button class="btn btn-gold" data-go="upload">Start bulk upload</button></div>`}`;
  };
  B.inventory = () => {
    if (!invList) loadInv();
    const q = $('#invQ'); if (q) { q.oninput = () => { invQ = q.value; invPage = 0; clearTimeout(q.t); q.t = setTimeout(() => { draw(); const n = $('#invQ'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); }; $('#invP').onchange = e => { invProj = e.target.value; invPage = 0; draw(); }; $('#invS').onchange = e => { invStatus = e.target.value; invPage = 0; draw(); }; const ib = $('#invB'); if (ib) ib.onchange = e => { invBld = e.target.value; invPage = 0; draw(); }; }
    $$('[data-proj]').forEach(b => b.onclick = () => { invProj = b.dataset.proj; invPage = 0; draw(); });
    const sync = () => { const bb = $('#bulkbar'); if (bb) { bb.hidden = !invSel.size; $('#selN').textContent = invSel.size; } };
    $$('[data-sel]').forEach(c => c.onchange = () => { c.checked ? invSel.add(c.dataset.sel) : invSel.delete(c.dataset.sel); sync(); });
    const sa = $('#selAll'); if (sa) sa.onchange = () => { $$('[data-sel]').forEach(c => { c.checked = sa.checked; sa.checked ? invSel.add(c.dataset.sel) : invSel.delete(c.dataset.sel); }); sync(); };
    $$('[data-bulk]').forEach(b => b.onclick = () => {
      const v = b.dataset.bulk, ids = [...invSel]; if (v === 'clear') { invSel.clear(); return draw(); }
      if (v === 'delete') { if (!confirm(`Delete ${ids.length} units? They disappear from the website.`)) return; I.remove(ids); } else I.setStatus(ids, v);
      invSel.clear(); invList = mineNow(); draw(); toast(v === 'delete' ? 'Deleted' : `${ids.length} units marked ${v}`);
    });
    $$('[data-price]').forEach(b => b.onclick = () => { const x = invNow().find(y => y.id === b.dataset.price), n = prompt(`New price for ${x.unitNo} (${x.mode === 'rent' ? '₹ per month' : '₹ lakh'}):`, x.price); if (n == null) return; const v = parseFloat(n); if (!(v > 0)) return toast('Enter a valid number'); I.setPrice(x.id, v); invList = mineNow(); draw(); toast('Price updated'); });
    const pp = $('#pgPrev'); if (pp) { pp.onclick = () => { invPage--; draw(); }; $('#pgNext').onclick = () => { invPage++; draw(); }; }
    const dc = $('#invCsv'); if (dc) dc.onclick = () => { const l = invNow(), h = ['project', 'tower', 'unit_no', 'mode', 'type', 'bedrooms', 'area_sqft', 'floor', 'total_floors', 'facing', 'price', 'locality', 'status', 'possession', 'furnishing', 'parking', 'rera', 'notes'];
      const c = v => /[",\n]/.test(String(v ?? '')) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v ?? '');
      const csv = h.join(',') + '\n' + l.map(x => [x.project, x.tower, x.unitNo, x.mode, x.type, x.beds, x.area, x.floor, x.totalFloors, x.facing, x.price, (KT.loc(x.loc) || {}).name, x.status, x.possession, x.furnishing, x.parking, x.rera, x.notes].map(c).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'keetown-inventory.csv'; a.click(); };
  };

  let upState = null;   // { units, errors, warnings, name }
  V.upload = () => {
    const s = upState;
    return `<h1>Bulk upload</h1><p class="sub">Upload hundreds or thousands of units at once. Re-uploading the same project, tower and unit number updates it instead of creating a duplicate.</p>
      <ol class="up-steps"><li><b>1. Get the template</b><span>One row per unit. Works with Excel and Google Sheets.</span><button class="btn btn-line sm" id="tpl">Download template (CSV)</button></li>
        <li><b>2. Fill it in</b><span>Sale price in ₹ lakh, rent in ₹ per month. Locality names as on our site.</span><details><summary>See all columns</summary><ul class="cols">${I.COLS.map(c => `<li><code>${c[0]}</code> ${esc(c[1])}${c[2] ? ' <b>*</b>' : ''}</li>`).join('')}</ul></details></li>
        <li><b>3. Upload or paste</b><span>Save as CSV and drop it below, or copy the cells (with the header row) and paste.</span></li></ol>
      <div class="drop" id="drop" tabindex="0" role="button" aria-label="Choose a CSV file"><input type="file" id="file" accept=".csv,.tsv,.txt,text/csv" hidden><div data-vis="report" class="drop-vis"></div><b>Drop your CSV here</b><span>or click to choose a file</span></div>
      <details class="paste"><summary>Or paste from Excel / Google Sheets</summary><textarea id="pasteBox" rows="6" placeholder="Copy your rows including the header row, then paste here"></textarea><button class="btn btn-line sm" id="pasteGo">Check pasted rows</button></details>
      ${s ? `<div class="pc up-res"><h3>${esc(s.name)} <span class="sub" style="margin:0">${s.units.length + s.errors.length} rows read</span></h3>
        <div class="kpis"><div class="kpi"><b style="color:var(--teal)">${s.units.length.toLocaleString('en-IN')}</b><span>Ready to import</span></div><div class="kpi"><b style="color:${s.errors.length ? '#b42318' : 'var(--ink)'}">${s.errors.length}</b><span>Rows with problems</span></div><div class="kpi"><b>${s.units.filter(x => invNow().some(y => y.id === x.id)).length}</b><span>Will update existing units</span></div></div>
        ${s.errors.length ? `<div class="errs"><b>Fix these rows and upload again, or import the good rows now:</b><ul>${s.errors.slice(0, 50).map(e => `<li>Row ${e.row}: ${esc(e.msg)}</li>`).join('')}${s.errors.length > 50 ? `<li>…and ${s.errors.length - 50} more</li>` : ''}</ul></div>` : ''}
        ${s.warnings.length ? `<p class="fine">${s.warnings.length} note${s.warnings.length > 1 ? 's' : ''}: ${esc(s.warnings.slice(0, 3).map(w => 'row ' + w.row + ' ' + w.msg).join('; '))}</p>` : ''}
        ${s.units.length ? `<div class="tbl-w"><table class="tbl"><thead><tr><th>Project</th><th>Unit</th><th>Type</th><th>Area</th><th class="r">Price</th><th>Locality</th><th>Status</th></tr></thead><tbody>${s.units.slice(0, 8).map(x => `<tr><td>${esc(x.project)}</td><td>${esc(x.tower ? x.tower + '-' : '')}${esc(x.unitNo)}</td><td>${x.beds ? x.beds + ' BHK ' : ''}${esc(x.type)} · ${x.mode}</td><td>${x.area}</td><td class="r">${money(x.mode, x.price)}</td><td>${esc((KT.loc(x.loc) || {}).name)}</td><td>${x.status}</td></tr>`).join('')}</tbody></table>${s.units.length > 8 ? `<p class="fine">Showing 8 of ${s.units.length.toLocaleString('en-IN')}.</p>` : ''}</div>
          <div class="acts-row"><button class="btn btn-gold" id="doImport">Import ${s.units.length.toLocaleString('en-IN')} units</button><button class="btn btn-line" id="upReset">Start over</button></div><div class="prog" id="prog" hidden><i></i><span></span></div>` : ''}</div>` : ''}`;
  };
  B.upload = () => {
    if (!invList) loadInv();
    $('#tpl').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([I.templateCsv()], { type: 'text/csv' })); a.download = 'keetown-inventory-template.csv'; a.click(); };
    const check = (text, name) => { const rows = I.parse(text); if (rows.length > 20001) return toast('Up to 20,000 units per upload. Please split the file.'); upState = { ...I.validate(rows, actingBuilder(), actingName()), name }; draw(); setTimeout(() => { const r = $('.up-res'); r && r.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); };
    const drop = $('#drop'), file = $('#file');
    const read = fl => { if (!fl) return; if (fl.size > 15e6) return toast('File is over 15 MB. Please split it.'); if (/\.xlsx?$/i.test(fl.name)) return toast('Please save the sheet as CSV first (File → Save as → CSV).'); const r = new FileReader(); r.onload = () => check(r.result, fl.name); r.readAsText(fl); };
    drop.onclick = () => file.click(); drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } };
    file.onchange = () => read(file.files[0]);
    ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => read(e.dataTransfer.files[0]));
    $('#pasteGo').onclick = () => { const t = $('#pasteBox').value; if (!t.trim()) return toast('Paste your rows first'); check(t, 'Pasted rows'); };
    const rs = $('#upReset'); if (rs) rs.onclick = () => { upState = null; draw(); };
    const imp = $('#doImport'); if (imp) imp.onclick = async () => {
      imp.disabled = true; const pr = $('#prog'); pr.hidden = false; const units = upState.units, N = 500; let added = 0, updated = 0;
      for (let i = 0; i < units.length; i += N) {   // save in slices so the page stays responsive and progress is visible
        const r = I.save(units.slice(i, i + N), u.mobile); added += r.added; updated += r.updated;
        const p = Math.min(1, (i + N) / units.length); pr.querySelector('i').style.width = (p * 100) + '%'; pr.querySelector('span').textContent = `Saving ${Math.min(units.length, i + N).toLocaleString('en-IN')} of ${units.length.toLocaleString('en-IN')}…`;
        await new Promise(r => setTimeout(r, 30));
      }
      pr.querySelector('span').textContent = 'Sending to Keetown…'; await A.flush();
      window.KTTrack && KTTrack.event('inventory_uploaded', { units: units.length });
      upState = null; invList = mineNow(); go('inventory'); toast(`${added.toLocaleString('en-IN')} added, ${updated.toLocaleString('en-IN')} updated`);
    };
    window.KTVis && KTVis.mount($('#pMain'));
  };

  let partners = null;
  const loadPartners = () => (A.MODE === 'live' ? fetch('/api/staff/partners', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : []) : Promise.resolve(Object.values(A.users()).filter(x => x.partner).map(x => ({ mobile: x.mobile, role: x.role, type: x.partner.type, since: x.partner.since, name: x.profile.name, company: x.profile.company }))))
    .then(l => { partners = l; if (tab === 'partners') draw(); }).catch(() => { partners = []; });
  const PT = { builder: 'Builder / developer', company: 'Company (relocation / office)', managed: 'Property-management client' };
  V.partners = () => { if (!partners) loadPartners();
    return `<h1>Partner logins</h1><p class="sub">After a tie-up, create the login here. The partner then signs in with their own mobile number and OTP; nobody else can create these accounts.</p>
      <form class="pc" id="ptF" novalidate><h3>New partner</h3><div class="two"><label class="fl">Type<select name="type">${Object.entries(PT).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label><label class="fl">Company / project name<input name="company" maxlength="80"></label></div>
        <div class="two"><label class="fl">Contact person *<input name="name" maxlength="60" required></label><label class="fl">Their mobile *<input name="mobile" inputmode="numeric" maxlength="10" placeholder="98XXXXXXXX"></label></div>
        <p class="err" id="ptE" role="alert"></p><button class="btn btn-gold">Create partner login</button></form>
      <div class="pc"><h3>Partners (${partners ? partners.length : '…'})</h3>${(partners || []).map(p => `<div class="row-i"><div class="grow"><b>${esc(p.company || p.name)}</b><br><small>${esc(PT[p.type] || p.type)} · ${esc(p.name)} · +91 ${esc(p.mobile)}${p.since ? ' · since ' + T.fmtD(p.since) : ''}</small></div>
        <a class="btn btn-wa sm" target="_blank" rel="noopener" href="https://wa.me/91${esc(p.mobile)}?text=${encodeURIComponent(`Hi ${p.name}, your Keetown Realty partner login is ready. Log in with this mobile number: ${location.origin}/login.html?role=builder`)}">Send login link</a></div>`).join('') || (partners ? '<p class="sub" style="margin:0">No partners yet.</p>' : '<p class="sub" style="margin:0">Loading…</p>')}</div>`; };
  B.partners = () => {
    const f = $('#ptF'); f.mobile.oninput = () => f.mobile.value = f.mobile.value.replace(/\D/g, '').slice(0, 10);
    f.onsubmit = async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(f)); d.name = d.name.trim();
      if (!d.name) return $('#ptE').textContent = 'Enter the contact person.'; if (!A.validMobile(d.mobile)) return $('#ptE').textContent = 'Enter a valid 10-digit mobile.';
      if (A.MODE === 'live') { const r = await fetch('/api/staff/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(d) }); const j = await r.json().catch(() => ({})); if (!r.ok) return $('#ptE').textContent = j.error || 'Could not create the login.'; }
      else { const all = A.users(), prev = all[d.mobile] || { mobile: d.mobile, created: new Date().toISOString(), consent: {} }; A.saveUser({ ...prev, role: d.type === 'company' ? 'company' : d.type === 'managed' ? 'owner' : 'builder', partner: { type: d.type, since: new Date().toISOString() }, profile: { ...(prev.profile || {}), name: d.name, company: d.company, ...(d.type === 'managed' ? { managed: true } : {}) }, verified: { status: true, method: 'keetown' } }); }
      partners = null; loadPartners(); f.reset(); toast('Partner login created. Send them the login link.'); };
  };

  V.team = () => {
    const ws = I.myWorkers(u.mobile);
    return `<h1>Team</h1><p class="sub">Add the people who upload and update inventory for ${esc(actingName())}. They log in with their own mobile number and OTP; no shared passwords.</p>
      <form class="pc" id="tmF" novalidate><h3>Add a team member</h3><div class="two"><label class="fl">Name<input name="n" required maxlength="60"></label><label class="fl">Mobile<input name="m" inputmode="numeric" maxlength="10" placeholder="98XXXXXXXX"></label></div><p class="err" id="tmE" role="alert"></p><button class="btn btn-gold">Add to team</button></form>
      <div class="pc"><h3>Team members (${ws.length})</h3>${ws.map(w => `<div class="row-i"><div class="grow"><b>${esc(w.workerName)}</b><br><small>+91 ${esc(w.worker)} · ${esc(w.role)} · added ${T.fmtD(w.at)}</small></div>
        <a class="btn btn-wa sm" target="_blank" rel="noopener" href="https://wa.me/91${esc(w.worker)}?text=${encodeURIComponent(`Hi ${w.workerName}, you can now upload ${actingName()} inventory on Keetown Realty. Log in with this mobile number: ${location.origin}/login.html`)}">Send login link</a><button class="btn btn-line sm danger" data-rmw="${w.id}">Remove</button></div>`).join('') || '<p class="sub" style="margin:0">No team members yet.</p>'}</div>`;
  };
  B.team = () => {
    const f = $('#tmF'); f.m.oninput = () => f.m.value = f.m.value.replace(/\D/g, '').slice(0, 10);
    f.onsubmit = e => { e.preventDefault(); const n = f.n.value.trim(), m = f.m.value; if (!n) return $('#tmE').textContent = 'Enter a name.'; if (!A.validMobile(m)) return $('#tmE').textContent = 'Enter a valid 10-digit mobile.'; if (m === u.mobile) return $('#tmE').textContent = 'That is your own number.';
      try { I.addWorker(u, n, m); draw(); toast(n.split(' ')[0] + ' added. Send them the login link.'); } catch (x) { $('#tmE').textContent = x.message; } };
    $$('[data-rmw]').forEach(b => b.onclick = () => { if (confirm('Remove this team member? They will no longer be able to upload.')) { I.removeWorker(b.dataset.rmw); draw(); } });
  };

  /* ---------------- settings ---------------- */
  V.settings = () => { const c = u.consent || {}; return `<h1>Settings</h1><p class="sub">You control how Keetown contacts you.</p>
    <div class="pc"><h3>Updates (opt-in)</h3><label class="toggle"><input type="checkbox" id="tWa" ${c.whatsapp ? 'checked' : ''}><span><b>WhatsApp alerts</b><br><small>New prime matches, saved-search alerts and reminders on +91 ${u.mobile}.</small></span></label>
      <label class="toggle"><input type="checkbox" id="tMail" ${c.email ? 'checked' : ''}><span><b>Email alerts</b><br><small>Matches and market notes.</small></span></label>
      <label class="fl" id="tMailBox" ${c.email ? '' : 'hidden'}>Email address<input type="email" id="tEmail" value="${esc(c.emailAddress || u.profile.email || '')}"></label>
      <p class="fine">${c.at ? 'Last updated ' + new Date(c.at).toLocaleString('en-IN') + '. ' : ''}Withdraw consent any time. Rent and visit notifications about your own tenancy are separate from marketing.</p><button class="btn btn-gold sm" id="saveC">Save preferences</button></div>
    <div class="pc"><h3>Profile <button class="link" data-edit>Edit</button></h3><div class="kv2"><div><small>Mobile</small><b>+91 ${u.mobile}</b></div><div><small>Client type</small><b>${R.label}</b></div><div><small>Verification</small><b>${verified() ? (u.verified.method === 'demo' ? 'Demo-verified' : 'DigiLocker verified') + ' · ' + T.fmtD(u.verified.at) : 'Pending'}</b></div><div><small>Email</small><b>${esc(u.profile.email || '—')}</b></div></div>
      <p style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-line sm" id="dlJson">Download my data</button><button class="btn btn-line sm danger" id="delAcc">Delete my account</button></p></div>`; };
  B.settings = () => {
    $('#tMail').onchange = e => $('#tMailBox').hidden = !e.target.checked;
    $('#saveC').onclick = () => { const mail = $('#tMail').checked, em = $('#tEmail').value.trim(); if (mail && !/^\S+@\S+\.\S+$/.test(em)) return toast('Enter a valid email'); u.consent = { ...u.consent, whatsapp: $('#tWa').checked, email: mail, emailAddress: mail ? em : '', at: new Date().toISOString() }; persist(); toast('Preferences saved'); draw(); };
    $('#dlJson').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ account: u, portal: store(), tenancies: T.forUser(u.mobile), purchases: T.purchases(u.mobile), submissions: A.read('keetown_submissions', []).filter(x => x.mobile === u.mobile) }, null, 2)], { type: 'application/json' })); a.download = 'my-keetown-data.json'; a.click(); };
    $('#delAcc').onclick = () => { if (!confirm('Delete your account and saved data from this browser? This cannot be undone.')) return; const all = A.users(); delete all[u.mobile]; A.write('keetown_users', all); try { localStorage.removeItem(KS); } catch (e) {} A.logout(); location.href = 'index.html'; };
  };

  draw();
})();
