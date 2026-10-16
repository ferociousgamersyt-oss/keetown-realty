/* Keetown property search: faceted filters with live counts, URL-synced state, grid/map views,
 * shortlist, compare, saved searches (alerts), recently viewed, and in-feed acquisition prompts. */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { properties, localities, loc, fmt, url } = KT, A = KTAuth;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); };
  const RES = ['Apartment', 'Villa', 'Independent house'];
  const INTENTS = { buy: 'Buy', rent: 'Rent', commercial: 'Commercial', plots: 'Plots & land' };
  const PAGE = 12, today = new Date();

  /* ---------------- state ⇄ URL ---------------- */
  const ARR = ['loc', 'beds', 'type', 'by', 'st', 'furn', 'face', 'amen', 'ten'];
  const S = { intent: 'buy', loc: [], bmin: '', bmax: '', beds: [], type: [], by: [], st: [], furn: [], face: [], amen: [], ten: [], avail: '', amin: '', amax: '', v: false, prime: false, rera: false, pets: false, sort: '', view: 'grid', page: 1 };
  (function fromURL() {
    const q = new URLSearchParams(location.search);
    if (q.get('mode')) S.intent = q.get('mode') === 'rent' ? 'rent' : 'buy';   // legacy links from the homepage
    if (q.get('intent') && INTENTS[q.get('intent')]) S.intent = q.get('intent');
    ARR.forEach(k => { if (q.get(k)) S[k] = q.get(k).split(',').filter(Boolean); });
    ['bmin', 'bmax', 'avail', 'amin', 'amax', 'sort', 'view'].forEach(k => { if (q.get(k)) S[k] = q.get(k); });
    ['v', 'prime', 'rera', 'pets'].forEach(k => S[k] = q.get(k) === '1');
    if (q.get('type') && !q.get('intent')) { if (q.get('type') === 'Plot') S.intent = 'plots'; if (q.get('type') === 'Commercial') S.intent = 'commercial'; }
  })();
  function toURL() {
    const o = { intent: S.intent };
    ARR.forEach(k => { if (S[k].length) o[k] = S[k].join(','); });
    ['bmin', 'bmax', 'avail', 'amin', 'amax', 'sort'].forEach(k => { if (S[k]) o[k] = S[k]; });
    ['v', 'prime', 'rera', 'pets'].forEach(k => { if (S[k]) o[k] = '1'; });
    if (S.view !== 'grid') o.view = S.view;
    history.replaceState(null, '', location.pathname + '?' + new URLSearchParams(o));
  }

  /* ---------------- filtering ---------------- */
  const rupees = p => p.mode === 'sale' ? p.price * 1e5 : p.price;
  const isRent = () => S.intent === 'rent';
  const AMEN = { 'Swimming pool': /pool/i, 'Gym': /gym/i, 'Clubhouse': /club/i, 'Power backup': /power/i, 'Lift': /lift/i, 'Parking': /parking/i, 'Security': /security|cctv/i, 'Kids play area': /kids|play/i };
  const intentOk = p => S.intent === 'buy' ? p.mode === 'sale' && RES.includes(p.type) : S.intent === 'rent' ? p.mode === 'rent' && RES.includes(p.type) : S.intent === 'commercial' ? p.type === 'Commercial' : p.type === 'Plot';
  const daysAgo = p => Math.max(0, Math.round((today - new Date(p.postedOn)) / 864e5));
  const area = p => p.unit === 'sq.yd' ? p.area * 9 : p.area;
  const statusOf = p => p.type === 'Plot' ? 'Plot' : p.construction === 'Under construction' ? 'Under construction' : 'Ready to move';
  const TESTS = {
    loc: p => !S.loc.length || S.loc.includes(p.loc),
    budget: p => { const P = rupees(p), m = isRent() || (S.intent === 'commercial' && p.mode === 'rent') ? 1 : 1e5; return (!S.bmin || P >= +S.bmin * m) && (!S.bmax || P <= +S.bmax * m); },
    beds: p => !S.beds.length || S.beds.some(b => b === '5' ? p.beds >= 5 : p.beds === +b),
    type: p => !S.type.length || S.type.includes(p.type),
    by: p => !S.by.length || S.by.includes(p.postedBy),
    st: p => !S.st.length || S.st.includes(statusOf(p)),
    furn: p => !S.furn.length || S.furn.includes(p.furnishing),
    face: p => !S.face.length || S.face.includes(p.facing),
    amen: p => !S.amen.length || S.amen.every(a => p.amen.some(x => AMEN[a].test(x))),
    ten: p => !S.ten.length || p.mode !== 'rent' || S.ten.includes(p.tenants) || p.tenants === 'Anyone',
    avail: p => !S.avail || p.mode !== 'rent' || (new Date(p.availableFrom) - today) / 864e5 <= +S.avail,
    area: p => (!S.amin || area(p) >= +S.amin) && (!S.amax || area(p) <= +S.amax),
    v: p => !S.v || p.verified, prime: p => !S.prime || p.prime, rera: p => !S.rera || p.rera, pets: p => !S.pets || p.pets
  };
  const run = (skip) => properties.filter(p => intentOk(p) && Object.entries(TESTS).every(([k, f]) => k === skip || f(p)));
  // results this option would give with every other active filter applied
  const count = (facet, patch) => { const keep = S[facet]; S[facet] = patch; const n = run().length; S[facet] = keep; return n; };

  function sorted(list) {
    const u = A.user(), by = S.sort || (u ? 'match' : '');
    const val = { lo: p => rupees(p), hi: p => -rupees(p), new: p => daysAgo(p), rate: p => rupees(p) / area(p), area: p => -area(p) };
    if (by === 'match' && u && window.KTMatch) { const w = KTMatch.requirement(u); const sc = new Map(list.map(p => [p.id, KTMatch.score(p, w)])); list.forEach(p => p._m = sc.get(p.id)); return list.sort((a, b) => (b._m.ok - a._m.ok) || (b._m.score - a._m.score)); }
    if (val[by]) return list.sort((a, b) => val[by](a) - val[by](b));
    return list.sort((a, b) => (b.prime - a.prime) || (b.verified - a.verified) || daysAgo(a) - daysAgo(b));   // relevance
  }

  /* ---------------- shortlist / compare / recent ---------------- */
  const shortKey = () => { const u = A.user(); return u ? 'keetown_portal_' + u.mobile : 'keetown_guest'; };
  const short = () => (A.read(shortKey(), { saved: [] }).saved || []);
  function toggleShort(id) { const k = shortKey(), s = A.read(k, { saved: [], visits: [] }); s.saved = s.saved || []; const i = s.saved.indexOf(id); i < 0 ? s.saved.push(id) : s.saved.splice(i, 1); A.write(k, s); toast(i < 0 ? (A.user() ? 'Shortlisted' : 'Shortlisted on this device — log in to keep it') : 'Removed from shortlist'); render(false); }
  let compare = A.read('keetown_compare', []);
  function toggleCompare(id) { const i = compare.indexOf(id); if (i < 0) { if (compare.length >= 3) return toast('Compare up to 3 properties'); compare.push(id); } else compare.splice(i, 1); A.write('keetown_compare', compare); tray(); $$(`[data-cmp="${id}"]`).forEach(c => c.checked = compare.includes(id)); }

  /* ---------------- UI: console ---------------- */
  const intentBar = $('#intent');
  intentBar.innerHTML = Object.entries(INTENTS).map(([k, t]) => `<button type="button" role="tab" data-i="${k}" aria-selected="${S.intent === k}">${t}</button>`).join('');
  intentBar.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; S.intent = b.dataset.i; S.bmin = S.bmax = ''; S.type = []; S.beds = []; S.page = 1; $$('[data-i]', intentBar).forEach(x => x.setAttribute('aria-selected', x === b)); buildRail(); render(); });
  // locality autocomplete with chips
  const li = $('#locInput'), sug = $('#locSug'); let act = -1;
  function chips() { $('#locChips').innerHTML = S.loc.map(id => `<span class="lchip">${esc(loc(id).name)}<button type="button" aria-label="Remove ${esc(loc(id).name)}" data-rm="${id}">×</button></span>`).join(''); }
  function suggest() {
    const q = li.value.trim().toLowerCase(); const m = localities.filter(l => !S.loc.includes(l.id) && (!q || l.name.toLowerCase().includes(q) || l.zone.toLowerCase().includes(q))).slice(0, 8);
    act = -1; sug.innerHTML = m.map((l, i) => `<li role="option" data-id="${l.id}" id="sg${i}"><b>${esc(l.name)}</b><span>${esc(l.zone)} · ${properties.filter(p => p.loc === l.id && intentOk(p)).length} listings</span></li>`).join('');
    sug.hidden = !m.length || document.activeElement !== li; li.setAttribute('aria-expanded', !sug.hidden);
  }
  const addLoc = id => { if (!S.loc.includes(id)) S.loc.push(id); li.value = ''; chips(); suggest(); S.page = 1; render(); };
  li.addEventListener('input', suggest); li.addEventListener('focus', suggest); li.addEventListener('blur', () => setTimeout(() => { sug.hidden = true; }, 150));
  li.addEventListener('keydown', e => {
    const items = $$('li', sug);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); act = (act + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach((x, i) => x.classList.toggle('on', i === act)); li.setAttribute('aria-activedescendant', 'sg' + act); }
    else if (e.key === 'Enter') { e.preventDefault(); const it = items[act] || items[0]; if (it) addLoc(it.dataset.id); }
    else if (e.key === 'Backspace' && !li.value && S.loc.length) { S.loc.pop(); chips(); render(); }
  });
  sug.addEventListener('mousedown', e => { const it = e.target.closest('[data-id]'); if (it) { e.preventDefault(); addLoc(it.dataset.id); } });
  $('#locChips').addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) { S.loc = S.loc.filter(x => x !== b.dataset.rm); chips(); render(); } });

  /* ---------------- UI: filter rail + sheet ---------------- */
  const budgetOpts = () => isRent() ? [5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000, 200000].map(v => [v, '₹' + v.toLocaleString('en-IN')])
    : S.intent === 'commercial' ? [[20, '₹20 L / ₹20k'], [50, '₹50 L / ₹50k'], [100, '₹1 Cr / ₹1 L'], [200, '₹2 Cr / ₹2 L'], [500, '₹5 Cr']]
    : [20, 30, 50, 75, 100, 150, 200, 300, 500, 1000].map(v => [v, v >= 100 ? '₹' + v / 100 + ' Cr' : '₹' + v + ' L']);
  const multi = (key, opts, label = o => o) => `<div class="opts">${opts.map(o => { const on = S[key].includes(String(o)); const n = count(key, [String(o)]); return `<label class="opt ${!n && !on ? 'zero' : ''}"><input type="checkbox" data-k="${key}" value="${esc(o)}" ${on ? 'checked' : ''}><span>${esc(label(o))}</span><em>${n}</em></label>`; }).join('')}</div>`;
  const SECTIONS = () => [
    ['budget', 'Budget', `<div class="two-sel"><select data-s="bmin" aria-label="Minimum"><option value="">Min</option>${budgetOpts().map(([v, t]) => `<option value="${v}" ${S.bmin == v ? 'selected' : ''}>${t}</option>`).join('')}</select><select data-s="bmax" aria-label="Maximum"><option value="">Max</option>${budgetOpts().map(([v, t]) => `<option value="${v}" ${S.bmax == v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`],
    ...(['buy', 'rent'].includes(S.intent) ? [['beds', 'Bedrooms', multi('beds', ['1', '2', '3', '4', '5'], b => b === '5' ? '5+ BHK' : b + ' BHK')], ['type', 'Property type', multi('type', RES)]] : []),
    ['by', 'Posted by', multi('by', ['Owner', 'Keetown', 'Builder'], o => o === 'Keetown' ? 'Keetown verified' : o)],
    ...(isRent() ? [['ten', 'Tenant type', multi('ten', ['Family', 'Bachelors', 'Company'])], ['avail', 'Availability', `<div class="opts">${[['', 'Any time'], ['0', 'Immediately'], ['15', 'Within 15 days'], ['30', 'Within 30 days']].map(([v, t]) => `<label class="opt"><input type="radio" name="avail" data-s="avail" value="${v}" ${S.avail === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>`]]
      : S.intent === 'buy' ? [['st', 'Construction status', multi('st', ['Ready to move', 'Under construction'])]] : []),
    ...(S.intent !== 'plots' ? [['furn', 'Furnishing', multi('furn', ['Unfurnished', 'Semi-furnished', 'Fully furnished', 'Furnished'].filter(f => properties.some(p => intentOk(p) && p.furnishing === f)))]] : []),
    ['face', 'Facing (Vastu)', multi('face', ['East', 'North', 'West', 'South'])],
    ...(S.intent !== 'plots' ? [['amen', 'Amenities', multi('amen', Object.keys(AMEN))]] : []),
    ['area', 'Area (sq.ft)', `<div class="two-sel"><select data-s="amin" aria-label="Min area"><option value="">Min</option>${[500, 800, 1000, 1200, 1500, 2000, 3000].map(v => `<option ${S.amin == v ? 'selected' : ''}>${v}</option>`).join('')}</select><select data-s="amax" aria-label="Max area"><option value="">Max</option>${[1000, 1200, 1500, 2000, 3000, 5000].map(v => `<option ${S.amax == v ? 'selected' : ''}>${v}</option>`).join('')}</select></div>`],
    ['trust', 'Trust & quality', `<div class="opts">${[['v', 'Verified listings only'], ['prime', 'Prime properties'], ['rera', 'RERA registered'], ...(isRent() ? [['pets', 'Pet-friendly']] : [])].map(([k, t]) => `<label class="opt"><input type="checkbox" data-b="${k}" ${S[k] ? 'checked' : ''}><span>${t}</span><em>${count(k, true)}</em></label>`).join('')}</div>`]
  ];
  const RAIL = () => ['budget', ...(['buy', 'rent'].includes(S.intent) ? ['beds'] : []), 'by', isRent() ? 'ten' : S.intent === 'buy' ? 'st' : 'face'];
  const active = k => k === 'budget' ? !!(S.bmin || S.bmax) : k === 'area' ? !!(S.amin || S.amax) : k === 'trust' ? S.v || S.prime || S.rera || S.pets : k === 'avail' ? !!S.avail : (S[k] || []).length > 0;
  function buildRail() {
    const secs = Object.fromEntries(SECTIONS().map(s => [s[0], s])), n = SECTIONS().filter(s => active(s[0])).length;
    $('#rail').innerHTML = RAIL().map(k => secs[k] ? `<div class="pill-w"><button type="button" class="pill ${active(k) ? 'on' : ''}" aria-expanded="false" data-pop="${k}">${secs[k][1]} <span aria-hidden="true">▾</span></button><div class="pop" hidden data-for="${k}">${secs[k][2]}<div class="pop-f"><button type="button" class="link" data-clear="${k}">Clear</button><button type="button" class="btn btn-gold sm" data-done>Done</button></div></div></div>` : '').join('')
      + `<button type="button" class="pill ${S.v ? 'on' : ''}" data-flip="v">✓ Verified</button><button type="button" class="pill ${S.prime ? 'on' : ''}" data-flip="prime">★ Prime</button><button type="button" class="pill all" id="openSheet">All filters${n ? ` <b>${n}</b>` : ''}</button>`;
    $('#sheetBody').innerHTML = SECTIONS().map(([k, t, h]) => `<section class="fsec"><h3>${t}${active(k) ? ` <button type="button" class="link" data-clear="${k}">Clear</button>` : ''}</h3>${h}</section>`).join('');
  }
  function clearKey(k) { if (k === 'budget') S.bmin = S.bmax = ''; else if (k === 'area') S.amin = S.amax = ''; else if (k === 'trust') S.v = S.prime = S.rera = S.pets = false; else if (k === 'avail') S.avail = ''; else S[k] = []; }
  document.addEventListener('change', e => {
    const t = e.target; if (!t.closest('#rail, #sheet')) return;
    if (t.dataset.k) { const k = t.dataset.k; S[k] = t.checked ? [...S[k], t.value] : S[k].filter(x => x !== t.value); }
    if (t.dataset.s) S[t.dataset.s] = t.value; if (t.dataset.b) S[t.dataset.b] = t.checked;
    S.page = 1; const open = $('.pop:not([hidden])')?.dataset.for; render(); if (open) openPop(open);
  });
  function openPop(k) { $$('.pop').forEach(p => p.hidden = p.dataset.for !== k); $$('[data-pop]').forEach(b => b.setAttribute('aria-expanded', b.dataset.pop === k)); }
  document.addEventListener('click', e => {
    const pb = e.target.closest('[data-pop]'); if (pb) { const open = pb.getAttribute('aria-expanded') === 'true'; openPop(open ? null : pb.dataset.pop); return; }
    if (e.target.closest('[data-done]')) return openPop(null);
    const cl = e.target.closest('[data-clear]'); if (cl) { clearKey(cl.dataset.clear); S.page = 1; render(); return; }
    const fl = e.target.closest('[data-flip]'); if (fl) { S[fl.dataset.flip] = !S[fl.dataset.flip]; S.page = 1; render(); return; }
    if (e.target.closest('#openSheet')) { $('#sheet').hidden = false; document.body.classList.add('noscroll'); $('#sheet .sheet-in').focus(); return; }
    if (e.target.closest('[data-close-sheet]') || e.target.id === 'sheet') { $('#sheet').hidden = true; document.body.classList.remove('noscroll'); return; }
    const ap = e.target.closest('[data-unapply]'); if (ap) { const [k, v] = ap.dataset.unapply.split(':'); if (v != null && Array.isArray(S[k])) S[k] = S[k].filter(x => x !== v); else clearKey(k); render(); return; }
    if (!e.target.closest('.pill-w')) openPop(null);
    const sh = e.target.closest('[data-short]'); if (sh) { e.preventDefault(); toggleShort(sh.dataset.short); return; }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { openPop(null); if (!$('#sheet').hidden) { $('#sheet').hidden = true; document.body.classList.remove('noscroll'); } } });
  $$('#clearAll, #clearAll2').forEach(b => b.onclick = () => { ['budget', 'area', 'trust', 'avail', ...ARR.filter(k => k !== 'loc')].forEach(clearKey); S.page = 1; render(); });

  /* ---------------- results ---------------- */
  const grid = $('#results');
  function applied() {
    const out = [];
    S.loc.forEach(id => out.push([`loc:${id}`, loc(id).name]));
    if (S.bmin || S.bmax) out.push(['budget', 'Budget']); if (S.amin || S.amax) out.push(['area', `Area ${S.amin || 0}–${S.amax || '∞'}`]);
    ['beds', 'type', 'by', 'st', 'furn', 'face', 'amen', 'ten'].forEach(k => S[k].forEach(v => out.push([`${k}:${v}`, k === 'beds' ? (v === '5' ? '5+' : v) + ' BHK' : v === 'Keetown' ? 'Keetown verified' : v])));
    if (S.avail) out.push(['avail', S.avail === '0' ? 'Immediately' : `Within ${S.avail} days`]);
    [['v', 'Verified'], ['prime', 'Prime'], ['rera', 'RERA'], ['pets', 'Pet-friendly']].forEach(([k, t]) => S[k] && out.push([`trust`, t]));
    $('#applied').innerHTML = out.map(([k, t]) => `<button type="button" class="achip" data-unapply="${k}">${esc(t)} <span aria-hidden="true">×</span></button>`).join('');
  }
  function card(p, i) {
    const l = loc(p.loc), sv = short().includes(p.id), m = p._m, d = daysAgo(p);
    return `<article class="rcard" data-id="${p.id}">
      <a class="rc-art" href="${url.property(p)}" tabindex="-1" aria-hidden="true"><div data-art="${p.id}"></div></a>
      <div class="rc-tags">${p.prime ? '<span class="t-prime">★ Prime</span>' : ''}${p.verified ? '<span class="t-ver">✓ Verified</span>' : ''}${p.rera ? '<span class="t-rera">RERA</span>' : ''}</div>
      <button type="button" class="rc-heart ${sv ? 'on' : ''}" data-short="${p.id}" aria-pressed="${sv}" aria-label="${sv ? 'Remove from shortlist' : 'Shortlist'}">${sv ? '♥' : '♡'}</button>
      <div class="rc-body">
        <div class="rc-price"><b>${fmt.price(p)}</b><span>${fmt.perSqft(p) || (p.deposit ? p.deposit + ' months deposit' : '')}</span></div>
        <h3><a href="${url.property(p)}">${esc(p.title)}</a></h3>
        <p class="rc-loc">${esc(l.name)} · ${esc(l.zone)}</p>
        <ul class="rc-spec"><li>${fmt.bhk(p)}</li><li>${p.area.toLocaleString('en-IN')} ${p.unit}</li>${p.floor != null ? `<li>Floor ${p.floor}/${p.totalFloors}</li>` : ''}${p.facing !== '—' ? `<li>${p.facing}</li>` : ''}<li>${esc(p.mode === 'rent' ? p.furnishing : statusOf(p))}</li></ul>
        ${m && m.ok ? `<p class="rc-match"><b>${m.score}% match</b> ${esc(m.reasons.slice(0, 2).join(' · '))}</p>` : ''}
        <div class="rc-foot"><span class="rc-meta">${p.postedBy === 'Keetown' ? 'Keetown verified' : p.postedBy}${p.mode === 'rent' && p.tenants ? ' · ' + p.tenants : ''} · ${d === 0 ? 'today' : d + 'd ago'}</span>
          <label class="rc-cmp"><input type="checkbox" data-cmp="${p.id}" ${compare.includes(p.id) ? 'checked' : ''}> Compare</label>
          <button type="button" class="btn btn-gold sm" data-contact="${p.id}">Contact</button></div>
      </div></article>`;
  }
  const PROMOS = [
    () => `<aside class="promo"><div><p class="kind">For owners</p><h3>Own a home in Hyderabad?</h3><p>List it free. We verify tenants and buyers before they ever call you.</p></div><a class="btn btn-gold" href="post-property.html">Post property free</a></aside>`,
    () => `<aside class="promo alt"><div><p class="kind">Can't find it?</p><h3>Tell us once. We'll keep looking.</h3><p>Save your requirement and get verified matches, including off-market homes.</p></div><button type="button" class="btn btn-gold" id="promoSave">Save this search</button></aside>`
  ];
  let map, layer;
  function render(rebuild = true) {
    if (rebuild) { buildRail(); chips(); }
    const list = sorted(run()), shown = list.slice(0, S.page * PAGE), place = S.loc.length === 1 ? loc(S.loc[0]).name : S.loc.length ? S.loc.length + ' localities' : 'Hyderabad';
    $('#sTitle').textContent = { buy: 'Homes for sale', rent: 'Homes for rent', commercial: 'Commercial property', plots: 'Plots & land' }[S.intent] + ' in ' + place;
    $('#count').textContent = `${list.length} ${list.length === 1 ? 'result' : 'results'}`;
    applied(); $('#sortSel').value = S.sort || (A.user() ? 'match' : '');
    let html = ''; shown.forEach((p, i) => { html += card(p, i); if (i === 5) html += PROMOS[0](); if (i === 11) html += PROMOS[1](); });
    grid.innerHTML = html || `<div class="empty-box"><p>No public listings match these filters. Much of our inventory is off-market — save this search and we'll alert you.</p><button type="button" class="btn btn-gold" id="promoSave">Save this search</button></div>`;
    $$('[data-art]', grid).forEach((el, i) => { const p = KT.byId(properties, el.dataset.art); el.innerHTML = KTArt({ ...p, id: p.id + 'r' + i }, 400, 250); });
    $('#more').hidden = shown.length >= list.length; $('#more').textContent = `Show more (${list.length - shown.length})`;
    $$('[data-cmp]', grid).forEach(c => c.onchange = () => toggleCompare(c.dataset.cmp));
    $$('#promoSave').forEach(b => b.onclick = saveSearch);
    $('.res').dataset.view = S.view; $$('[data-view]').forEach(b => b.setAttribute('aria-pressed', b.dataset.view === S.view));
    if (S.view === 'map') drawMap(list); toURL(); tray(); recent();
    window.KTTrack && KTTrack.event('search', { intent: S.intent, loc: S.loc.join(','), results: list.length });
  }
  $('#more').onclick = () => { S.page++; render(false); };
  $('#sortSel').onchange = e => { S.sort = e.target.value; render(false); };
  $$('[data-view]').forEach(b => b.onclick = () => { S.view = b.dataset.view; render(false); });

  /* ---------------- map view (Leaflet + OpenStreetMap) ---------------- */
  function drawMap(list) {
    if (!window.L) { $('#lmap').innerHTML = '<p class="fine" style="padding:20px">Map could not load. Check your connection.</p>'; return; }
    if (!map) { map = L.map('lmap', { scrollWheelZoom: false }).setView([17.43, 78.39], 11); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap contributors' }).addTo(map); layer = L.layerGroup().addTo(map); }
    setTimeout(() => map.invalidateSize(), 50); layer.clearLayers();
    const pts = list.map(p => { const mk = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: 'pmk' + (p.prime ? ' prime' : ''), html: `<span>${fmt.price(p).replace('/mo', '')}</span>`, iconSize: null }) }).bindPopup(`<b>${esc(p.title)}</b><br>${fmt.price(p)} · ${fmt.bhk(p)}<br><a href="${url.property(p)}">View property →</a>`); mk.addTo(layer); mk._pid = p.id; return [p.lat, p.lng]; });
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 14 });
    $$('.rcard', grid).forEach(c => c.onmouseenter = () => layer.eachLayer(m => m.getElement() && m.getElement().classList.toggle('hot', m._pid === c.dataset.id)));
  }

  /* ---------------- compare ---------------- */
  function tray() {
    const t = $('#ctray'); compare = compare.filter(id => KT.byId(properties, id));
    t.hidden = !compare.length;
    t.innerHTML = `<div class="wrap ct-in"><div class="ct-items">${compare.map(id => { const p = KT.byId(properties, id); return `<span class="ct-item">${esc(p.title)}<button type="button" aria-label="Remove" data-uncmp="${id}">×</button></span>`; }).join('')}</div><button type="button" class="btn btn-gold sm" id="doCompare" ${compare.length < 2 ? 'disabled' : ''}>Compare ${compare.length}</button></div>`;
    $$('[data-uncmp]', t).forEach(b => b.onclick = () => toggleCompare(b.dataset.uncmp)); const dc = $('#doCompare'); if (dc) dc.onclick = showCompare;
  }
  function showCompare() {
    const ps = compare.map(id => KT.byId(properties, id)), d = $('#cmpDlg');
    const rows = [['Price', p => fmt.price(p)], ['Rate', p => fmt.perSqft(p) || '—'], ['Locality', p => loc(p.loc).name], ['Configuration', p => fmt.bhk(p)], ['Area', p => p.area.toLocaleString('en-IN') + ' ' + p.unit], ['Floor', p => p.floor != null ? `${p.floor} of ${p.totalFloors}` : '—'], ['Facing', p => p.facing], ['Status', p => p.mode === 'rent' ? 'Available ' + new Date(p.availableFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : statusOf(p)], ['Furnishing', p => p.furnishing], ['Age', p => p.age != null ? (p.age ? p.age + ' yrs' : 'New') : '—'], ['Parking', p => p.parking ?? '—'], ['Posted by', p => p.postedBy], ['Verified', p => p.verified ? '✓' : '—'], ['RERA', p => p.rera ? '✓' : '—'], ['Amenities', p => p.amen.join(', ')]];
    d.innerHTML = `<div class="m-body"><div class="cmp-head"><h2>Compare properties</h2><button class="x" aria-label="Close" onclick="this.closest('dialog').close()">×</button></div><div class="cmp-scroll"><table class="cmp-t"><thead><tr><th></th>${ps.map(p => `<th><a href="${url.property(p)}">${esc(p.title)}</a></th>`).join('')}</tr></thead><tbody>${rows.map(([k, f]) => `<tr><th>${k}</th>${ps.map(p => `<td>${esc(f(p))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    d.showModal(); window.KTTrack && KTTrack.event('compare', { ids: compare.join(',') });
  }

  /* ---------------- saved search / recent ---------------- */
  function saveSearch() {
    const u = A.user(); if (!u) { toast('Log in to save searches and get alerts…'); setTimeout(() => location.href = 'login.html', 1100); return; }
    const k = 'keetown_searches_' + u.mobile, list = A.read(k, []), q = location.search;
    if (list.some(s => s.q === q)) return toast('This search is already saved');
    list.unshift({ q, title: $('#sTitle').textContent, at: new Date().toISOString(), seen: run().map(p => p.id) }); A.write(k, list);
    toast(u.consent && (u.consent.whatsapp || u.consent.email) ? 'Saved. We\'ll alert you about new matches.' : 'Saved. Turn on WhatsApp/email alerts in your portal settings.');
    window.KTTrack && KTTrack.event('search_saved', { q });
  }
  $('#saveSearch').onclick = saveSearch;
  function recent() {
    const ids = A.read('keetown_recent', []).filter(id => KT.byId(properties, id)).slice(0, 6), box = $('#recent');
    box.hidden = !ids.length; if (!ids.length) return;
    $('#recentList').innerHTML = ids.map(id => { const p = KT.byId(properties, id); return `<a class="rec" href="${url.property(p)}"><b>${fmt.price(p)}</b><span>${esc(p.title)}</span></a>`; }).join('');
  }
  document.addEventListener('kt:login', () => render(false));
  render();
})();
