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
  let u = A.user();
  if (!u) { location.replace('login.html'); return; }
  const R = A.ROLES[u.role], needDL = R.dl === 'required';
  const verified = () => !!(u.verified && u.verified.status);
  const canAct = () => !needDL || verified();
  const KS = 'keetown_portal_' + u.mobile, store = () => A.read(KS, { saved: [], visits: [] }), putStore = s => A.write(KS, s);
  // merge a guest shortlist into the account
  (function () { const g = A.read('keetown_guest', { saved: [] }); if (g.saved && g.saved.length) { const s = store(); s.saved = [...new Set([...(s.saved || []), ...g.saved])]; putStore(s); A.write('keetown_guest', { saved: [] }); } })();
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); };
  const persist = () => { A.saveUser(u); u = A.user(); };
  const dlg = $('#pd'); dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  const isOwnerSide = ['owner', 'seller', 'builder'].includes(u.role);

  /* ---------------- header + nav ---------------- */
  const vBadge = () => verified() ? `<span class="badge-v ok">✓ ${u.verified.method === 'demo' ? 'Demo-verified' : 'DigiLocker verified'}</span>` : needDL ? '<span class="badge-v no">Verification pending</span>' : '<span class="badge-v opt">Unverified</span>';
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
    builder: [['home', 'Overview'], ['mine', 'My projects'], ['settings', 'Settings']]
  }[u.role];
  let tab = (location.hash || '#home').slice(1); if (!TABS.some(t => t[0] === tab)) tab = 'home';
  function nav() {
    const n = { saved: store().saved.length, matches: verified() ? M.forUser(u, { primeOnly: true }).length : 0, rentals: T.forUser(u.mobile).filter(t => t.ownerMobile === u.mobile).reduce((a, t) => a + T.ledger(t).filter(r => r.status === 'overdue' || r.status === 'reported').length + t.tickets.filter(k => k.status === 'Open').length, 0), myhome: T.inbox(u.mobile).filter(x => x.unread).length };
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
    if (isOwnerSide) { const subs = A.read('keetown_submissions', []).filter(x => x.mobile === u.mobile); kpis.push([subs.length, u.role === 'builder' ? 'Projects submitted' : 'Listings', 'mine']); }
    const code = 'KT' + (+u.mobile * 7).toString(36).toUpperCase(), refs = Object.values(A.users()).filter(x => x.attrib && x.attrib.first && x.attrib.first.ref === code).length;
    return `<h1>Welcome${first ? ', ' + esc(first) : ''}</h1><p class="sub">${R.label} portal</p>${verifyBanner()}
      ${u.quick ? `<div class="banner soft"><p><b>Complete your profile.</b> A few more details give you far better matches.</p><button class="btn btn-gold" data-edit>Complete profile</button></div>` : ''}
      <div class="kpis">${kpis.map(([v, l, t]) => `<button class="kpi" data-go="${t}"><b>${v}</b><span>${l}</span></button>`).join('')}</div>
      ${reqSummary()}${body}
      <div class="pc refer"><div><h3>Refer a friend</h3><p class="sub">Know someone moving to Hyderabad or letting out a flat? Share your link. ${refs ? `<b>${refs} joined</b> through you so far.` : ''}</p></div><div class="ref-row"><input readonly value="${location.origin}/index.html?ref=${code}" aria-label="Your referral link"><button class="btn btn-line sm" id="copyRef">Copy</button><a class="btn btn-wa sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('I use Keetown Realty for verified homes in Hyderabad: ' + location.origin + '/index.html?ref=' + code)}">Share</a></div></div>`;
  };
  B.home = () => { wireCards($('#pMain')); const c = $('#copyRef'); if (c) c.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(c.previousElementSibling.value); toast('Link copied'); }; };
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
