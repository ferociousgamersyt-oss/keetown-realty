(function () {
  const { brand, localities, properties, loc, fmt } = KT;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const iso = d => { const z = new Date(d); return z.getFullYear() + '-' + String(z.getMonth() + 1).padStart(2, '0') + '-' + String(z.getDate()).padStart(2, '0'); };
  const today = () => iso(new Date());
  const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

  /* ================= state ================= */
  const KEY = 'keetown_os_v1';
  const PLATFORMS = { instagram: { n: 'Instagram', c: '#ff6fa5', lim: 2200 }, facebook: { n: 'Facebook', c: '#6aa5ff', lim: 63000 }, linkedin: { n: 'LinkedIn', c: '#4a9cff', lim: 3000 }, youtube: { n: 'YouTube', c: '#ff5a5a', lim: 5000 }, whatsapp: { n: 'WhatsApp', c: '#2fb7a4', lim: 1000 }, gbp: { n: 'Google Business', c: '#f2b84b', lim: 1500 } };
  const STAGES = [['new', 'New'], ['contacted', 'Contacted'], ['visit', 'Site visit'], ['negotiation', 'Negotiation'], ['closed', 'Closed']];
  const EVENTS = [ // verify dates each year — festival dates move
    ['2026-10-10', 'Bathukamma begins (verify)'], ['2026-10-18', 'Saddula Bathukamma (verify)'], ['2026-10-20', 'Dasara — peak launch & booking season (verify)'], ['2026-11-08', 'Diwali (verify)'], ['2026-12-31', 'Year-end offers / tax-planning push'],
    ['2027-01-14', 'Sankranti (verify)'], ['2027-01-26', 'Republic Day'], ['2027-04-01', 'IT appraisal season → rental moves'], ['2027-04-07', 'Ugadi (verify)'], ['2027-05-01', 'Pre-monsoon waterproofing push (Management)'], ['2027-05-09', 'Akshaya Tritiya (verify)'], ['2027-05-15', 'School-admission rental rush'], ['2027-06-02', 'Telangana Formation Day']
  ];
  const seed = () => ({
    posts: [
      { id: uid(), date: addDays(1), platform: 'instagram', title: 'Reel: Kokapet vs Gachibowli — which is right for you?', body: '', status: 'planned' },
      { id: uid(), date: addDays(3), platform: 'linkedin', title: 'NRI buyer checklist for Hyderabad', body: '', status: 'draft' },
      { id: uid(), date: addDays(5), platform: 'whatsapp', title: 'Weekly new listings broadcast', body: '', status: 'planned' },
      { id: uid(), date: addDays(8), platform: 'youtube', title: 'Short: 3 questions before you book a pre-launch', body: '', status: 'draft' }
    ],
    metrics: Object.fromEntries(Object.keys(PLATFORMS).map((k, i) => [k, [0, 1, 2, 3, 4, 5].map(w => ({ date: addDays(-7 * (5 - w)), followers: Math.round((300 + i * 120) * (1 + w * .06)), reach: Math.round((2000 + i * 900) * (1 + w * .1)), leads: Math.max(0, Math.round((2 + i) * (1 + w * .15))) }))])),
    goals: { followers: 5000, leads: 40 },
    notes: [{ id: uid(), title: 'Why west corridor rents hold', body: 'IT employment base + metro/ORR access. Watch new office supply in Financial District; track vacancy quarterly.', tags: ['rental', 'west'], ts: Date.now() }],
    competitors: [
      { id: uid(), name: 'Large portals (99acres / Housing / MagicBricks)', strength: 'Reach & inventory volume', gap: 'Generic, fake-listing fatigue, no hand-holding', note: 'Position on verification + management.' },
      { id: uid(), name: 'Developer-tied brokers', strength: 'Pre-launch access', gap: 'Biased to one builder', note: 'Position as independent advisor.' }
    ],
    edits: {}
  });
  let S;
  const load = () => { try { S = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch (e) { S = seed(); } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const getLeads = () => { try { let l = JSON.parse(localStorage.getItem('keetown_leads')); if (!l) { l = seedLeads(); localStorage.setItem('keetown_leads', JSON.stringify(l)); } return l; } catch (e) { return []; } };
  const setLeads = l => { try { localStorage.setItem('keetown_leads', JSON.stringify(l)); } catch (e) {} };
  const seedLeads = () => [
    { id: 's1', name: 'Anil K. (sample)', phone: '9800000001', intent: 'buy', locality: 'kokapet', budget: '₹2–5 Cr', note: 'NRI, Dallas. East-facing 3BHK.', source: 'Instagram', stage: 'contacted', created: new Date(Date.now() - 864e5 * 2).toISOString() },
    { id: 's2', name: 'Meera S. (sample)', phone: '9800000002', intent: 'rent', locality: 'kondapur', budget: '₹30k/mo', note: 'Joining Microsoft IDC in Nov.', source: 'Google Business', stage: 'new', created: new Date().toISOString() },
    { id: 's3', name: 'Farooq A. (sample)', phone: '9800000003', intent: 'manage', locality: 'banjara', budget: '', note: 'Owns 2 flats, lives in Dubai.', source: 'Referral', stage: 'visit', created: new Date(Date.now() - 864e5 * 5).toISOString() },
    { id: 's4', name: 'Lakshmi R. (sample)', phone: '9800000004', intent: 'buy', locality: 'miyapur', budget: '₹1 Cr', note: 'First-time buyer, metro access.', source: 'WhatsApp', stage: 'negotiation', created: new Date(Date.now() - 864e5 * 9).toISOString() }
  ];
  const L = id => { const b = loc(id), e = S.edits[id] || {}; return { ...b, sale: e.sale || b.sale, rent2: e.rent2 || b.rent2, yield: e.yield ?? b.yield }; };
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); };
  const copy = (txt) => { (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Copied'), () => { const a = document.createElement('textarea'); a.value = txt; document.body.append(a); a.select(); document.execCommand('copy'); a.remove(); toast('Copied'); }); };
  const dialog = (html, onSubmit) => { const d = $('#dlg'), f = $('#dlgForm'); f.innerHTML = html + '<div class="acts-r"><button class="btn s" value="x" formnovalidate>Cancel</button><button class="btn" value="ok">Save</button></div>'; f.onsubmit = e => { if (e.submitter && e.submitter.value === 'ok') onSubmit(Object.fromEntries(new FormData(f))); }; d.showModal(); };

  /* ================= views ================= */
  const VIEWS = [
    ['today', 'Today', '◐'], ['market', 'Market Lab', '◈'], ['studio', 'Content Studio', '✎'], ['calendar', 'Calendar', '▦'], ['pulse', 'Social Pulse', '∿'], ['leads', 'Leads CRM', '☷']
  ];
  let cur = 'today', tab = {};
  const nav = $('#nav');
  function drawNav() {
    const nl = getLeads().filter(l => l.stage === 'new').length;
    nav.innerHTML = VIEWS.map(v => `<button data-v="${v[0]}" class="${cur === v[0] ? 'on' : ''}"><i>${v[2]}</i>${v[1]}${v[0] === 'leads' && nl ? `<span class="cnt">${nl}</span>` : ''}</button>`).join('');
    $$('button', nav).forEach(b => b.onclick = () => go(b.dataset.v));
  }
  function go(v) { cur = v; location.hash = v; $('#side').classList.remove('open'); draw(); }
  function draw() {
    drawNav(); $('#viewTitle').textContent = VIEWS.find(v => v[0] === cur)[1];
    const el = $('#view'); el.innerHTML = '<div class="fade">' + V[cur]() + '</div>'; (A[cur] || (() => { }))(el);
  }
  const V = {}, A = {};

  /* ---------- Today ---------- */
  const TIPS = ['Hyderabad buyers research on Instagram + YouTube, then verify on WhatsApp. Post proof (site-visit clips, RERA checks), not just renders.', 'Dasara and Akshaya Tritiya are traditional “auspicious buying” windows — pre-schedule launch-style content 3 weeks ahead.', 'NRIs ask about TDS, POA and rental management first. A weekly NRI-explainer reel compounds fast.', 'Rental leads spike 4–6 weeks before IT appraisal and joining dates. Push furnished-ready listings in March and September.', 'Vastu facing (East/North) is a top filter for Hyderabad families — always put facing in the first line of a caption.', 'Pre-monsoon (May) is the best moment to sell Property Management audits: leaks are top-of-mind.'];
  V.today = () => {
    const leads = getLeads(), wk = Date.now() - 7 * 864e5;
    const newWk = leads.filter(l => +new Date(l.created) > wk).length;
    const sched = S.posts.filter(p => p.date >= today() && p.date <= addDays(7)).length;
    const fol = Object.values(S.metrics).reduce((a, m) => a + (m.at(-1)?.followers || 0), 0);
    const up = EVENTS.filter(e => e[0] >= today()).slice(0, 4);
    const next = [...S.posts].filter(p => p.date >= today()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
    const funnel = STAGES.map(([k, n]) => [n, leads.filter(l => l.stage === k).length]);
    const mx = Math.max(1, ...funnel.map(f => f[1]));
    return `<div class="row g4"><div class="card kpi"><h3>New leads · 7 days</h3><b>${newWk}</b><small>${leads.length} total in CRM</small></div>
      <div class="card kpi"><h3>Posts next 7 days</h3><b>${sched}</b><small>${S.posts.filter(p => p.status === 'draft').length} drafts waiting</small></div>
      <div class="card kpi"><h3>Total followers</h3><b>${fol.toLocaleString('en-IN')}</b><small>across ${Object.keys(PLATFORMS).length} channels</small></div>
      <div class="card kpi"><h3>Management enquiries</h3><b>${leads.filter(l => l.intent === 'manage').length}</b><small>owner audits requested</small></div></div>
      <div class="row g2" style="margin-top:18px">
      <div class="card"><h3>Coming up <button class="btn sm" data-go="calendar">Calendar →</button></h3><ul class="list">${next.map(p => `<li><span class="dot" style="background:${PLATFORMS[p.platform].c}"></span><div><b>${esc(p.title)}</b><div class="mut">${p.date} · ${PLATFORMS[p.platform].n} · ${p.status}</div></div></li>`).join('') || '<li class="mut">Nothing scheduled — open Content Studio.</li>'}</ul>
        <h3 style="margin-top:20px">Hyderabad market calendar</h3><ul class="list">${up.map(e => `<li><span class="mono mut">${e[0].slice(5)}</span>${esc(e[1])}</li>`).join('')}</ul></div>
      <div class="card"><h3>Lead funnel <button class="btn sm" data-go="leads">Open CRM →</button></h3><div class="bars">${funnel.map(f => `<div class="b"><span>${f[0]}</span><div class="band"><i style="left:0;width:${f[1] / mx * 100}%"></i></div><b>${f[1]}</b></div>`).join('')}</div>
        <h3 style="margin-top:22px">Insight of the day</h3><p style="line-height:1.6">${TIPS[new Date().getDate() % TIPS.length]}</p>
        <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap"><button class="btn s" data-go="studio">New post</button><button class="btn s" data-go="market">Research brief</button><button class="btn s" data-go="leads">Add lead</button></div></div></div>`;
  };
  A.today = el => $$('[data-go]', el).forEach(b => b.onclick = () => go(b.dataset.go));

  /* ---------- Market Lab ---------- */
  let sortK = 'sale', sortD = -1;
  const mid = l => (l.sale[0] + l.sale[1]) / 2;
  const sortVal = { name: l => l.name, sale: mid, rent: l => (l.rent2[0] + l.rent2[1]) / 2, yield: l => l.yield };
  V.market = () => {
    const t = tab.market || 'table';
    const tabs = [['table', 'Price table'], ['compare', 'Compare'], ['brief', 'Research brief'], ['notes', 'Notebook & competitors']].map(([k, n]) => `<button data-t="${k}" class="${t === k ? 'on' : ''}">${n}</button>`).join('');
    return `<div class="tabs" id="mTabs">${tabs}</div>${M[t]()}`;
  };
  const M = {};
  M.table = () => {
    const rows = localities.map(l => L(l.id)).sort((a, b) => (sortVal[sortK](a) > sortVal[sortK](b) ? 1 : -1) * sortD);
    const max = 22000;
    return `<div class="card"><h3>17 micro-markets · indicative ₹/sq.ft (double-check before publishing) <button class="btn sm s" id="mReset">Reset edits</button></h3><div style="overflow:auto"><table><thead><tr><th data-s="name">Locality</th><th data-s="sale">Sale ₹/sq.ft</th><th>Band</th><th data-s="rent">2BHK rent ₹k</th><th data-s="yield">Yield %</th><th>Growth</th></tr></thead><tbody>
      ${rows.map(l => `<tr><td><b>${l.name}</b><div class="mut" style="font-size:.74rem">${l.zone}</div></td>
      <td class="mono"><input data-id="${l.id}" data-f="s0" value="${l.sale[0]}"> – <input data-id="${l.id}" data-f="s1" value="${l.sale[1]}"></td>
      <td><div class="band"><i style="left:${l.sale[0] / max * 100}%;width:${(l.sale[1] - l.sale[0]) / max * 100}%"></i></div></td>
      <td class="mono"><input data-id="${l.id}" data-f="r0" value="${l.rent2[0]}"> – <input data-id="${l.id}" data-f="r1" value="${l.rent2[1]}"></td>
      <td class="mono"><input data-id="${l.id}" data-f="y" value="${l.yield}"></td><td>${l.growth}</td></tr>`).join('')}</tbody></table></div>
      <p class="mut" style="margin-top:12px;font-size:.8rem">Edit any number — it saves in this browser and flows into briefs and compare. Source your figures from registrations data, portal listings and your own deals.</p></div>`;
  };
  M.compare = () => {
    const a = tab.ca || 'kokapet', b = tab.cb || 'gachibowli';
    const opts = sel => localities.map(l => `<option value="${l.id}" ${l.id === sel ? 'selected' : ''}>${l.name}</option>`).join('');
    const A_ = L(a), B_ = L(b), pa = mid(A_), pb = mid(B_), d = Math.round((pa - pb) / pb * 100);
    const bar = (lbl, va, vb, f) => { const m = Math.max(va, vb) * 1.05; return `<div class="bars" style="margin-bottom:18px"><div class="b"><span>${lbl} · ${A_.name.split(' ')[0]}</span><div class="band"><i style="left:0;width:${va / m * 100}%;background:var(--gold)"></i></div><b>${f(va)}</b></div><div class="b"><span>${lbl} · ${B_.name.split(' ')[0]}</span><div class="band"><i style="left:0;width:${vb / m * 100}%;background:var(--bl)"></i></div><b>${f(vb)}</b></div></div>`; };
    const ra = (A_.rent2[0] + A_.rent2[1]) / 2, rb = (B_.rent2[0] + B_.rent2[1]) / 2;
    return `<div class="card"><div class="row g2"><label class="f">Locality A<select id="ca">${opts(a)}</select></label><label class="f">Locality B<select id="cb">${opts(b)}</select></label></div><div style="margin-top:24px">${bar('Sale ₹/sq.ft', pa, pb, v => '₹' + Math.round(v).toLocaleString('en-IN'))}${bar('2BHK rent ₹k', ra, rb, v => '₹' + v.toFixed(0) + 'k')}${bar('Yield %', A_.yield, B_.yield, v => v + '%')}</div>
      <p style="line-height:1.7"><b>Read-out:</b> ${A_.name} is priced <b>${Math.abs(d)}% ${d >= 0 ? 'above' : 'below'}</b> ${B_.name} per sq.ft. ${A_.yield > B_.yield ? A_.name + ' offers the stronger rental yield' : A_.yield < B_.yield ? B_.name + ' offers the stronger rental yield' : 'Yields are similar'}; ${A_.name} suits <i>${A_.tags.join(', ')}</i> buyers, while ${B_.name} suits <i>${B_.tags.join(', ')}</i> buyers.</p>
      <button class="btn" id="cmpPost">Turn into a post →</button></div>`;
  };
  const AUD = { investor: 'Investor', tenant: 'Tenant', nri: 'NRI owner/buyer', first: 'First-time buyer' };
  M.brief = () => {
    const sel = tab.bl || 'kokapet', aud = tab.ba || 'investor';
    return `<div class="row g2" style="grid-template-columns:320px 1fr"><div class="card"><label class="f">Locality<select id="bl">${localities.map(l => `<option value="${l.id}" ${l.id === sel ? 'selected' : ''}>${l.name}</option>`).join('')}</select></label>
      <label class="f" style="margin-top:12px">Audience<select id="ba">${Object.entries(AUD).map(([k, v]) => `<option value="${k}" ${k === aud ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <div style="display:grid;gap:8px;margin-top:16px"><button class="btn" id="bCopy">Copy brief</button><button class="btn s" id="bNote">Save to notebook</button><button class="btn s" id="bPost">Draft a post from this</button></div>
      <p class="mut" style="font-size:.78rem;margin-top:14px">Briefs are generated offline from the numbers in your Price table plus Keetown’s positioning. They are a starting point — add fresh news, project names and your own deal evidence.</p></div>
      <pre class="brief" id="briefOut">${esc(makeBrief(sel, aud))}</pre></div>`;
  };
  function makeBrief(id, aud) {
    const l = L(id), p = mid(l), r = (l.rent2[0] + l.rent2[1]) / 2;
    const lens = {
      investor: ['Rental yield ~' + l.yield + '% gross plus appreciation upside (' + l.growth.toLowerCase() + ' momentum).', 'Compare with adjacent corridors before booking; check absorption of new supply.', 'Exit liquidity: ' + (l.tags.includes('Liquid') ? 'high — established resale market' : 'moderate — depends on project quality & brand')],
      tenant: ['Typical 2BHK rent ₹' + l.rent2[0] + 'k–' + l.rent2[1] + 'k/month.', 'Check commute to office, society rules (bachelors / pets), water & power backup.', 'Negotiate on 11-month agreement, 1-year escalation (typically 5–10%), deposit of 2–6 months (varies).'],
      nri: ['Prefer RERA-registered projects; verify builder track record remotely.', 'Plan for POA, NRE/NRO flows, TDS on rent and sale — confirm with a CA.', 'Offer video site-visits and Keetown property-management plan for rentals.'],
      first: ['Budget guide at ₹' + Math.round(p).toLocaleString('en-IN') + '/sq.ft: 1,100 sq.ft ≈ ' + fmt.lakh(Math.round(p * 1100 / 100000)) + '.', 'Add ~6% registration cost + furnishing + loan fees.', 'Prefer ready or near-possession to avoid rent-plus-EMI overlap.']
    }[aud];
    return `# ${l.name} — ${AUD[aud]} brief
Generated ${today()} · Keetown OS

## Snapshot
- Zone: ${l.zone}
- Sale band: ₹${l.sale[0].toLocaleString('en-IN')}–${l.sale[1].toLocaleString('en-IN')} per sq.ft (mid ≈ ₹${Math.round(p).toLocaleString('en-IN')})
- 2BHK rent: ₹${l.rent2[0]}k–${l.rent2[1]}k / month (mid ₹${r}k)
- Gross yield: ~${l.yield}% · Growth outlook: ${l.growth}
- Connectivity: ${l.metro}
- Character: ${l.vibe}

## What matters for a ${AUD[aud].toLowerCase()}
${lens.map(x => '- ' + x).join('\n')}

## Risks to flag honestly
- Pre-launch/under-construction delays; insist on RERA registration and escrow-linked payment plan.
- Check title chain, layout approvals (HMDA/DTCP), EC and any LRS issues for plots.
- Monsoon waterlogging & water-supply history on the specific street/project.

## Content angles (Instagram / LinkedIn / YouTube)
1. "₹${Math.round(p).toLocaleString('en-IN')}/sq.ft in ${l.name}: what you actually get" — price breakdown reel
2. "${l.name} vs ${localities.find(x => x.id !== id && x.zone.split(' ')[0] === l.zone.split(' ')[0])?.name || 'neighbouring locality'}: which wins for ${AUD[aud].toLowerCase()}s?"
3. "5 questions to ask before booking in ${l.name}" — trust-builder
4. Site-visit walk-through + Vastu facing explainer

## SEO / keyword seeds
flats for sale in ${l.name}, ${l.name} 2BHK rent, ${l.name} property rates 2026, best builders in ${l.name}, ${l.name} RERA projects, property management ${l.name}

## Sources to verify before publishing
Telangana RERA portal · Registration & Stamps dept. market values · Portal asking-price trackers · Your own closed deals`;
  }
  M.notes = () => `<div class="row g2"><div class="card"><h3>Research notebook <button class="btn sm" id="addNote">+ Note</button></h3><div class="list" style="gap:12px">${S.notes.map(n => `<div class="note"><h4>${esc(n.title)}</h4><div style="white-space:pre-wrap;color:#d6d6ee">${esc(n.body)}</div><div style="margin-top:8px">${n.tags.map(t => `<span class="tag">#${esc(t)}</span>`).join('')}<button class="btn sm danger" data-del="${n.id}" style="float:right">Delete</button></div></div>`).join('') || '<p class="mut">No notes yet.</p>'}</div></div>
    <div class="card"><h3>Competitor watchlist <button class="btn sm" id="addComp">+ Competitor</button></h3><div class="list" style="gap:12px">${S.competitors.map(c => `<div class="note"><h4>${esc(c.name)}</h4><div><span class="mut">Strength:</span> ${esc(c.strength)}</div><div><span class="mut">Gap we exploit:</span> ${esc(c.gap)}</div><div class="mut" style="margin-top:4px">${esc(c.note)}</div><button class="btn sm danger" data-delc="${c.id}" style="margin-top:8px">Remove</button></div>`).join('')}</div></div></div>`;
  A.market = el => {
    $$('#mTabs button', el).forEach(b => b.onclick = () => { tab.market = b.dataset.t; draw(); });
    $$('th[data-s]', el).forEach(th => th.onclick = () => { const k = th.dataset.s; sortD = sortK === k ? -sortD : -1; sortK = k; draw(); });
    $$('td input', el).forEach(i => i.onchange = () => {
      const id = i.dataset.id, cur = L(id), e = S.edits[id] = S.edits[id] || {}, v = parseFloat(i.value) || 0, f = i.dataset.f;
      if (f === 's0' || f === 's1') { e.sale = [...cur.sale]; e.sale[f === 's0' ? 0 : 1] = v; } else if (f === 'r0' || f === 'r1') { e.rent2 = [...cur.rent2]; e.rent2[f === 'r0' ? 0 : 1] = v; } else e.yield = v;
      save(); toast('Saved'); draw();
    });
    const r = $('#mReset', el); if (r) r.onclick = () => { S.edits = {}; save(); draw(); };
    const ca = $('#ca', el); if (ca) { ca.onchange = () => { tab.ca = ca.value; draw(); }; $('#cb', el).onchange = e => { tab.cb = e.target.value; draw(); }; $('#cmpPost', el).onclick = () => { studioPrefill = { goal: 'market', loc: tab.ca || 'kokapet', vs: tab.cb || 'gachibowli' }; go('studio'); }; }
    const bl = $('#bl', el); if (bl) {
      const upd = () => { tab.bl = bl.value; tab.ba = $('#ba', el).value; $('#briefOut', el).textContent = makeBrief(tab.bl, tab.ba); };
      bl.onchange = upd; $('#ba', el).onchange = upd;
      $('#bCopy', el).onclick = () => copy(makeBrief(bl.value, $('#ba', el).value));
      $('#bNote', el).onclick = () => { S.notes.unshift({ id: uid(), title: `${loc(bl.value).name} — ${AUD[$('#ba', el).value]} brief`, body: makeBrief(bl.value, $('#ba', el).value).slice(0, 900) + '…', tags: ['brief', bl.value], ts: Date.now() }); save(); toast('Saved to notebook'); };
      $('#bPost', el).onclick = () => { studioPrefill = { goal: 'market', loc: bl.value }; go('studio'); };
    }
    if ($('#addNote', el)) {
      $('#addNote', el).onclick = () => dialog('<h2>New research note</h2><label class="f">Title<input name="title" required></label><label class="f">Note<textarea name="body" rows="6"></textarea></label><label class="f">Tags (comma separated)<input name="tags"></label>', d => { S.notes.unshift({ id: uid(), title: d.title, body: d.body, tags: (d.tags || '').split(',').map(s => s.trim()).filter(Boolean), ts: Date.now() }); save(); draw(); });
      $('#addComp', el).onclick = () => dialog('<h2>Add competitor</h2><label class="f">Name<input name="name" required></label><label class="f">Their strength<input name="strength"></label><label class="f">Gap we exploit<input name="gap"></label><label class="f">Notes<input name="note"></label>', d => { S.competitors.push({ id: uid(), ...d }); save(); draw(); });
      $$('[data-del]', el).forEach(b => b.onclick = () => { S.notes = S.notes.filter(n => n.id !== b.dataset.del); save(); draw(); });
      $$('[data-delc]', el).forEach(b => b.onclick = () => { S.competitors = S.competitors.filter(n => n.id !== b.dataset.delc); save(); draw(); });
    }
  };

  /* ---------- Content Studio ---------- */
  let studioPrefill = null, studioOut = [], studioSel = 0;
  const GOALS = { listing: 'Showcase a listing', market: 'Market update / comparison', trust: 'Why trust Keetown', nri: 'NRI explainer', rental: 'Rental tenant guide', manage: 'Property management' };
  const FORMATS = { instagram: 'Reel script + caption', facebook: 'Post', linkedin: 'Thought-leadership post', youtube: 'Short script', whatsapp: 'Broadcast message', gbp: 'Google Business update' };
  V.studio = () => {
    const pf = studioPrefill || {}; studioPrefill = null;
    return `<div class="studio"><div class="card"><h3>Brief</h3><div style="display:grid;gap:12px">
      <label class="f">Platform<select id="sPl">${Object.entries(PLATFORMS).map(([k, v]) => `<option value="${k}">${v.n} — ${FORMATS[k]}</option>`).join('')}</select></label>
      <label class="f">Goal<select id="sGoal">${Object.entries(GOALS).map(([k, v]) => `<option value="${k}" ${pf.goal === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="f">Locality<select id="sLoc">${localities.map(l => `<option value="${l.id}" ${pf.loc === l.id ? 'selected' : ''}>${l.name}</option>`).join('')}</select></label>
      <label class="f">Compare with (market goal)<select id="sVs">${localities.map(l => `<option value="${l.id}" ${pf.vs === l.id ? 'selected' : ''}>${l.name}</option>`).join('')}</select></label>
      <label class="f">Property (listing goal)<select id="sProp">${properties.map(p => `<option value="${p.id}">${p.title} — ${fmt.price(p)}</option>`).join('')}</select></label>
      <label class="f">Language<select id="sLang"><option value="en">English</option><option value="te">English + తెలుగు</option><option value="hi">Hinglish</option></select></label>
      <label class="f">Tone<select id="sTone"><option value="warm">Warm &amp; helpful</option><option value="pro">Professional</option><option value="bold">Bold &amp; punchy</option></select></label>
      <button class="btn" id="sGen">Generate 3 variants</button></div></div>
      <div class="card"><h3>Variants</h3><div class="variants" id="sVar"><p class="mut">Pick options and generate. Variants are template-driven drafts built from your Market Lab data — edit before posting.</p></div></div>
      <div class="card"><h3>Preview</h3><div class="phone"><div class="scr"><div class="ph-h"><i>K</i>keetownrealty</div><div class="ph-img" id="phImg">Your hook appears here</div><div class="ph-cap" id="phCap"></div></div></div>
      <div style="display:grid;gap:8px;margin-top:16px"><button class="btn s" id="sCopy">Copy selected</button><div style="display:flex;gap:8px"><input type="date" id="sDate" value="${addDays(2)}"><button class="btn" id="sAdd">Add to calendar</button></div><div class="mut mono" id="sCnt" style="font-size:.76rem"></div></div></div></div>`;
  };
  const HASH = { base: ['#Hyderabad', '#HyderabadRealEstate', '#HyderabadProperty', '#KeetownRealty'], buy: ['#FlatsInHyderabad', '#HomeBuyers', '#RERA', '#Vastu'], rent: ['#HyderabadRentals', '#HyderabadLife', '#RentInHyderabad'], manage: ['#PropertyManagement', '#NRIInvestment', '#NRIHyderabad', '#RentalIncome'] };
  function gen() {
    const pl = $('#sPl').value, goal = $('#sGoal').value, lc = L($('#sLoc').value), vs = L($('#sVs').value), pr = KT.byId(properties, $('#sProp').value), lang = $('#sLang').value, tone = $('#sTone').value;
    const T = { en: ['Looking for a home in Hyderabad?', 'Your dream home in Hyderabad', 'DM or WhatsApp us'], te: ['హైదరాబాద్‌లో ఇల్లు కావాలా?', 'మీ కలల ఇల్లు హైదరాబాద్‌లో', 'WhatsApp చేయండి — ఇప్పుడే!'], hi: ['Hyderabad mein ghar dhoondh rahe ho?', 'Aapka sapno ka ghar, Hyderabad mein', 'WhatsApp karo — abhi!'] }[lang];
    const sale = `₹${lc.sale[0].toLocaleString('en-IN')}–${lc.sale[1].toLocaleString('en-IN')}/sq.ft`;
    const sign = { warm: 'We’re here to help you decide — no pressure.', pro: 'Data-led advice from the Keetown Realty team.', bold: 'Stop guessing. Start with facts.' }[tone];
    const cta = `${T[2]} 📲 ${brand.phoneDisplay}`;
    let hooks, body, tags;
    if (goal === 'listing') { hooks = [`${fmt.bhk(pr)} in ${L(pr.loc).name} — ${fmt.price(pr)}`, `${pr.facing} facing. ${pr.status}. ${L(pr.loc).name}.`, `Would you live here? ${pr.title}`]; body = `${pr.title}\n📍 ${L(pr.loc).name} · ${pr.area} ${pr.unit}${pr.facing !== '—' ? ' · ' + pr.facing + ' facing (Vastu-friendly)' : ''}\n💰 ${fmt.price(pr)} ${fmt.perSqft(pr)}\n✨ ${pr.amen.join(' · ')}`; tags = pr.mode === 'rent' ? HASH.rent : HASH.buy; }
    else if (goal === 'market') { hooks = [`${lc.name} vs ${vs.name}: where should your money go?`, `${lc.name} at ${sale}. Worth it?`, `The ${Math.abs(Math.round((mid(lc) - mid(vs)) / mid(vs) * 100))}% price gap between ${lc.name} and ${vs.name}`]; body = `${lc.name}: ${sale}, rent ₹${lc.rent2[0]}–${lc.rent2[1]}k (2BHK), yield ~${lc.yield}%\n${vs.name}: ₹${vs.sale[0].toLocaleString('en-IN')}–${vs.sale[1].toLocaleString('en-IN')}/sq.ft, yield ~${vs.yield}%\n${lc.name} → ${lc.vibe}\n${vs.name} → ${vs.vibe}`; tags = HASH.buy; }
    else if (goal === 'trust') { hooks = ['Before you pay a token amount, ask your agent these 5 things', 'Why Hyderabad buyers are switching to verified advisors', 'Fake listings? Hidden charges? Here’s how we do it differently']; body = '✅ Title & approval checks (RERA / HMDA / DTCP) before any token\n✅ Transparent pricing & registration-cost planning (~6% in Telangana)\n✅ Site-visit shortlist: 3–5 realistic options, not 30 random links\n✅ After-sale support: loan, registration, handover, and property management'; tags = HASH.buy; }
    else if (goal === 'nri') { hooks = ['NRIs: buying in Hyderabad from abroad? Read this.', 'POA, NRO, TDS — the 3 words every NRI owner must understand', 'We manage Hyderabad homes for owners in 14 countries'.replace('14 countries', 'abroad')]; body = '🌍 Video site-visits & e-signed documents\n🏦 NRE/NRO-aware payment planning (confirm with your CA)\n🏠 Rent collection + monthly owner statement\n🛠 Monsoon-proof maintenance and GHMC tax handled'; tags = [...HASH.manage]; }
    else if (goal === 'rental') { hooks = [`Renting in ${lc.name}? Typical 2BHK: ₹${lc.rent2[0]}–${lc.rent2[1]}k`, '5 things to check before signing a Hyderabad rental agreement', `New to Hyderabad? ${lc.name} in 30 seconds`]; body = `📍 ${lc.name} · ${lc.vibe}\n🚇 ${lc.metro}\nChecklist: lock-in & escalation, deposit refund terms, society rules (bachelors/pets), water & power backup, police verification.`; tags = HASH.rent; }
    else { hooks = ['Own a flat in Hyderabad but live abroad?', 'Leak in July. Vacancy in March. We handle both.', 'Property management that actually understands Hyderabad']; body = '🌧 Pre/post-monsoon inspections\n💧 HMWSSB & electricity bill tracking\n🧾 GHMC tax, rent ledger & TDS-ready reports\n📸 Photo inspections + monthly statement\nPlans: Let · Care · Prime NRI'; tags = HASH.manage; }
    const tg = [...tags, ...HASH.base].slice(0, pl === 'linkedin' ? 4 : 10).join(' ');
    studioOut = hooks.map((h, i) => {
      const hook = i === 0 ? h : i === 1 ? h : h;
      let text;
      if (pl === 'instagram') text = `${hook}\n\n${body}\n\n${sign}\n${cta}\n\n${tg}`;
      else if (pl === 'linkedin') text = `${hook}\n\n${body.replace(/^[^\w₹]+/gm, '• ')}\n\n${sign}\nConnect or message us to discuss.\n\n${tg}`;
      else if (pl === 'youtube') text = `SHORT (45s)\n0–3s HOOK (on screen + VO): ${hook}\n3–15s: ${body.split('\n').slice(0, 2).join(' / ')}\n15–35s: ${body.split('\n').slice(2).join(' / ') || sign}\n35–45s CTA: ${T[2]}\n\nTitle: ${hook}\nTags: ${tg}`;
      else if (pl === 'whatsapp') text = `*${hook}*\n\n${body}\n\n${T[2]} 🙏`;
      else if (pl === 'gbp') text = `${hook}\n\n${body.split('\n').slice(0, 3).join('\n')}\n\nCall: ${brand.phoneDisplay}`;
      else text = `${hook}\n\n${body}\n\n${sign}\n${cta}\n\n${tg}`;
      return { hook, text, pl };
    });
    studioSel = 0; drawVariants(); if (typeof T !== 'undefined') $('#phImg').dataset.lang = lang;
  }
  function drawVariants() {
    const pl = $('#sPl').value;
    $('#sVar').innerHTML = studioOut.map((v, i) => `<div class="variant ${i === studioSel ? 'on' : ''}" data-i="${i}"><b>Variant ${i + 1}</b><pre>${esc(v.text)}</pre></div>`).join('');
    $$('.variant').forEach(v => v.onclick = () => { studioSel = +v.dataset.i; drawVariants(); });
    const s = studioOut[studioSel]; $('#phImg').textContent = s.hook; $('#phCap').textContent = s.text.slice(0, 260) + (s.text.length > 260 ? '…' : '');
    const c = s.text.length, lim = PLATFORMS[pl].lim; $('#sCnt').textContent = `${c} / ${lim} characters${c > lim ? ' — too long!' : ''}`;
  }
  A.studio = () => {
    $('#sGen').onclick = gen;
    $('#sCopy').onclick = () => studioOut[studioSel] ? copy(studioOut[studioSel].text) : toast('Generate first');
    $('#sAdd').onclick = () => { if (!studioOut[studioSel]) return toast('Generate first'); S.posts.push({ id: uid(), date: $('#sDate').value, platform: $('#sPl').value, title: studioOut[studioSel].hook, body: studioOut[studioSel].text, status: 'draft' }); save(); toast('Added to calendar as draft'); };
    if (location.hash.includes('studio')) gen();
  };

  /* ---------- Calendar ---------- */
  let calM = new Date(); calM.setDate(1);
  V.calendar = () => {
    const y = calM.getFullYear(), m = calM.getMonth(), first = new Date(y, m, 1), start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
    const cells = []; for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); cells.push(d); }
    return `<div class="card"><h3><span style="display:flex;gap:8px;align-items:center"><button class="btn sm s" id="cPrev">←</button><b style="font-size:1rem;color:var(--tx);letter-spacing:0;text-transform:none">${calM.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}</b><button class="btn sm s" id="cNext">→</button></span><button class="btn sm" id="cAdd">+ Post</button></h3>
      <div class="cal">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<div class="hd">${d}</div>`).join('')}${cells.map(d => {
        const k = iso(d), ps = S.posts.filter(p => p.date === k), ev = EVENTS.filter(e => e[0] === k);
        return `<div class="day ${d.getMonth() !== m ? 'out' : ''} ${k === today() ? 'today' : ''}" data-d="${k}"><b>${d.getDate()}</b>${ev.map(e => `<span class="chip ev" title="${esc(e[1])}">★ ${esc(e[1])}</span>`).join('')}${ps.map(p => `<span class="chip" data-p="${p.id}" style="background:${PLATFORMS[p.platform].c}${p.status === 'draft' ? ';opacity:.6' : ''}" title="${esc(p.title)}">${esc(p.title)}</span>`).join('')}</div>`;
      }).join('')}</div>
      <p class="mut" style="margin-top:12px;font-size:.78rem">★ markers are market-cycle dates. Festival dates shift every year — verify before scheduling. Faded chips = drafts. Click a chip to edit; click a day to add.</p></div>`;
  };
  function postDlg(p, date) {
    const e = p || { date, platform: 'instagram', title: '', body: '', status: 'planned' };
    dialog(`<h2>${p ? 'Edit' : 'New'} post</h2><label class="f">Date<input type="date" name="date" value="${e.date}" required></label>
      <label class="f">Platform<select name="platform">${Object.entries(PLATFORMS).map(([k, v]) => `<option value="${k}" ${k === e.platform ? 'selected' : ''}>${v.n}</option>`).join('')}</select></label>
      <label class="f">Title / hook<input name="title" value="${esc(e.title)}" required></label><label class="f">Caption / script<textarea name="body" rows="5">${esc(e.body)}</textarea></label>
      <label class="f">Status<select name="status">${['draft', 'planned', 'posted'].map(s => `<option ${s === e.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>${p ? '<label style="color:#ff9b9b"><input type="checkbox" name="del" style="width:auto"> Delete this post</label>' : ''}`,
      d => { if (p) { if (d.del) S.posts = S.posts.filter(x => x.id !== p.id); else Object.assign(p, d); } else S.posts.push({ id: uid(), ...d }); save(); draw(); });
  }
  A.calendar = el => {
    $('#cPrev').onclick = () => { calM.setMonth(calM.getMonth() - 1); draw(); }; $('#cNext').onclick = () => { calM.setMonth(calM.getMonth() + 1); draw(); };
    $('#cAdd').onclick = () => postDlg(null, today());
    $$('.day', el).forEach(d => d.onclick = e => { const c = e.target.closest('[data-p]'); if (c) return postDlg(S.posts.find(p => p.id === c.dataset.p)); postDlg(null, d.dataset.d); });
  };

  /* ---------- Social Pulse ---------- */
  const line = (vals, color, w = 260, h = 60) => { const mx = Math.max(...vals, 1), mn = Math.min(...vals); const pts = vals.map((v, i) => `${(i / Math.max(vals.length - 1, 1)) * w},${h - 6 - ((v - mn) / Math.max(mx - mn, 1)) * (h - 14)}`).join(' '); return `<svg viewBox="0 0 ${w} ${h}" style="width:100%"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`; };
  V.pulse = () => {
    const tot = k => Object.values(S.metrics).reduce((a, m) => a + (m.at(-1)?.[k] || 0), 0), totL = Object.values(S.metrics).reduce((a, m) => a + m.slice(-4).reduce((x, r) => x + r.leads, 0), 0);
    return `<div class="card" style="margin-bottom:18px"><h3>Goals</h3><div class="row g2"><div><div class="bars"><div class="b" style="grid-template-columns:100px 1fr 90px"><span>Followers</span><div class="band"><i style="left:0;width:${Math.min(100, tot('followers') / S.goals.followers * 100)}%"></i></div><b>${tot('followers').toLocaleString('en-IN')} / ${S.goals.followers.toLocaleString('en-IN')}</b></div><div class="b" style="grid-template-columns:100px 1fr 90px"><span>Leads (4 wks)</span><div class="band"><i style="left:0;width:${Math.min(100, totL / S.goals.leads * 100)}%"></i></div><b>${totL} / ${S.goals.leads}</b></div></div></div><div style="text-align:right"><button class="btn s sm" id="pGoal">Edit goals</button> <button class="btn s sm" id="pCsv">Export CSV</button></div></div></div>
      <div class="row g3">${Object.entries(PLATFORMS).map(([k, p]) => { const m = S.metrics[k], last = m.at(-1), prev = m.at(-2) || last, d = last.followers - prev.followers; return `<div class="card"><h3><span style="color:${p.c}">● ${p.n}</span><button class="btn sm" data-add="${k}">+ Week</button></h3><div class="kpi"><b>${last.followers.toLocaleString('en-IN')}</b><small>followers · <span class="d">${d >= 0 ? '+' : ''}${d} this week</span></small></div>${line(m.map(r => r.followers), p.c)}<div class="row" style="grid-template-columns:1fr 1fr;margin-top:6px"><div><small class="mut">Reach</small><br><b class="mono">${last.reach.toLocaleString('en-IN')}</b></div><div><small class="mut">Leads</small><br><b class="mono">${last.leads}</b></div></div></div>`; }).join('')}</div>
      <p class="mut" style="margin-top:16px;font-size:.8rem">Keetown OS doesn’t connect to platform APIs — enter weekly numbers from Instagram Insights, YouTube Studio, LinkedIn analytics and Google Business. Sample data is shown until you replace it. (API sync can be added later via Meta Graph, YouTube Data and Google Business Profile APIs.)</p>`;
  };
  A.pulse = el => {
    $$('[data-add]', el).forEach(b => b.onclick = () => { const k = b.dataset.add, l = S.metrics[k].at(-1); dialog(`<h2>${PLATFORMS[k].n} · weekly numbers</h2><label class="f">Week of<input type="date" name="date" value="${today()}"></label><label class="f">Followers<input type="number" name="followers" value="${l.followers}"></label><label class="f">Reach / views<input type="number" name="reach" value="${l.reach}"></label><label class="f">Leads from this channel<input type="number" name="leads" value="0"></label>`, d => { S.metrics[k].push({ date: d.date, followers: +d.followers, reach: +d.reach, leads: +d.leads }); save(); draw(); }); });
    $('#pGoal').onclick = () => dialog(`<h2>Goals</h2><label class="f">Follower target (all channels)<input type="number" name="f" value="${S.goals.followers}"></label><label class="f">Leads target (4 weeks)<input type="number" name="l" value="${S.goals.leads}"></label>`, d => { S.goals = { followers: +d.f, leads: +d.l }; save(); draw(); });
    $('#pCsv').onclick = () => { const rows = ['platform,date,followers,reach,leads']; Object.entries(S.metrics).forEach(([k, m]) => m.forEach(r => rows.push(`${k},${r.date},${r.followers},${r.reach},${r.leads}`))); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })); a.download = 'keetown-social-metrics.csv'; a.click(); };
  };

  /* ---------- Leads ---------- */
  V.leads = () => {
    const leads = getLeads();
    return `<div style="display:flex;gap:10px;margin-bottom:16px;align-items:center;flex-wrap:wrap"><button class="btn" id="lAdd">+ Add lead</button><span class="mut" style="font-size:.82rem">Website enquiries (public site + Management page) land in “New” automatically. Drag cards between stages.</span></div>
      <div class="kan">${STAGES.map(([k, n]) => { const ls = leads.filter(l => l.stage === k); return `<div class="col" data-s="${k}"><h4>${n}<span>${ls.length}</span></h4>${ls.map(l => `<div class="lead" draggable="true" data-id="${l.id}"><b>${esc(l.name)}</b><span class="tag">${l.intent}</span>${l.locality ? `<span class="tag">${esc(loc(l.locality)?.name || l.locality)}</span>` : ''}<div class="mut">${esc(l.budget || '')}</div><div style="margin:4px 0">${esc(l.note || '')}</div><div class="mut" style="font-size:.72rem">${esc(l.source)}${l.channel ? ' · ' + esc(l.channel.replace(/_/g, ' ')) : ''}${l.attrib && l.attrib.last && l.attrib.last.utm_campaign ? ' · ' + esc(l.attrib.last.utm_campaign) : ''} · ${new Date(l.created).toLocaleDateString('en-IN')}</div>${l.propertyId && KT.byId(KT.properties, l.propertyId) ? `<div style="font-size:.74rem;margin-top:2px">Listing: ${esc(KT.byId(KT.properties, l.propertyId).title)}</div>` : ''}<div class="acts"><a class="btn sm s" target="_blank" rel="noopener" href="https://wa.me/91${String(l.phone).replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent('Hi ' + l.name.split(' ')[0] + ', this is Keetown Realty following up on your enquiry.')}">WhatsApp</a><button class="btn sm danger" data-rm="${l.id}">✕</button></div></div>`).join('')}</div>`; }).join('')}</div>`;
  };
  A.leads = el => {
    $('#lAdd').onclick = () => dialog(`<h2>Add lead</h2><label class="f">Name<input name="name" required></label><label class="f">Phone<input name="phone" required></label><label class="f">Intent<select name="intent"><option>buy</option><option>rent</option><option>sell</option><option>lease</option><option>manage</option></select></label><label class="f">Locality<select name="locality"><option value="">—</option>${localities.map(l => `<option value="${l.id}">${l.name}</option>`).join('')}</select></label><label class="f">Budget<input name="budget"></label><label class="f">Source<select name="source">${['Instagram', 'WhatsApp', 'YouTube', 'Facebook', 'LinkedIn', 'Google Business', 'Referral', 'Walk-in', 'Portal'].map(s => `<option>${s}</option>`).join('')}</select></label><label class="f">Note<textarea name="note" rows="2"></textarea></label>`, d => { const l = getLeads(); l.unshift({ id: uid(), ...d, stage: 'new', created: new Date().toISOString() }); setLeads(l); draw(); });
    let dragId; $$('.lead', el).forEach(c => { c.ondragstart = () => { dragId = c.dataset.id; c.classList.add('drag'); }; c.ondragend = () => c.classList.remove('drag'); });
    $$('.col', el).forEach(c => { c.ondragover = e => { e.preventDefault(); c.classList.add('over'); }; c.ondragleave = () => c.classList.remove('over'); c.ondrop = e => { e.preventDefault(); const l = getLeads(), x = l.find(z => z.id === dragId); if (x) { x.stage = c.dataset.s; setLeads(l); draw(); } }; });
    $$('[data-rm]', el).forEach(b => b.onclick = () => { setLeads(getLeads().filter(l => l.id !== b.dataset.rm)); draw(); });
  };

  /* ================= shell ================= */
  const CMDS = [...VIEWS.map(v => ({ n: 'Go to ' + v[1], f: () => go(v[0]) })), { n: 'New post (Content Studio)', f: () => go('studio') }, { n: 'Add lead', f: () => { go('leads'); setTimeout(() => $('#lAdd').click(), 50); } }, { n: 'Research brief', f: () => { tab.market = 'brief'; go('market'); } }, { n: 'Open public website', f: () => location.href = '../index.html' }, { n: 'Open management page', f: () => location.href = '../management.html' }];
  let cmdSel = 0;
  function drawCmd() { const q = $('#cmdIn').value.toLowerCase(), r = CMDS.filter(c => c.n.toLowerCase().includes(q)); cmdSel = Math.min(cmdSel, Math.max(0, r.length - 1)); $('#cmdList').innerHTML = r.map((c, i) => `<li class="${i === cmdSel ? 'on' : ''}" data-i="${i}">${c.n}<small>↵</small></li>`).join(''); $$('#cmdList li').forEach(li => li.onclick = () => { $('#cmd').close(); r[+li.dataset.i].f(); }); return r; }
  const openCmd = () => { $('#cmdIn').value = ''; cmdSel = 0; $('#cmd').showModal(); drawCmd(); $('#cmdIn').focus(); };
  $('#cmdBtn').onclick = openCmd;
  addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmd(); } });
  $('#cmdIn').oninput = drawCmd;
  $('#cmdIn').onkeydown = e => { const r = drawCmd(); if (e.key === 'ArrowDown') { cmdSel = Math.min(cmdSel + 1, r.length - 1); drawCmd(); e.preventDefault(); } else if (e.key === 'ArrowUp') { cmdSel = Math.max(0, cmdSel - 1); drawCmd(); e.preventDefault(); } else if (e.key === 'Enter' && r[cmdSel]) { $('#cmd').close(); r[cmdSel].f(); } };
  $('#cmd').addEventListener('click', e => { if (e.target === $('#cmd')) $('#cmd').close(); });
  $('#burger').onclick = () => $('#side').classList.toggle('open');
  $('#resetBtn').onclick = () => { if (confirm('Clear all Keetown OS demo data in this browser (posts, notes, metrics, leads)?')) { localStorage.removeItem(KEY); localStorage.removeItem('keetown_leads'); load(); draw(); toast('Reset'); } };
  const tick = () => $('#clock').textContent = new Date().toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST';
  tick(); setInterval(tick, 30000);
  addEventListener('hashchange', () => { const h = location.hash.slice(1); if (V[h] && h !== cur) { cur = h; draw(); } });
  load(); getLeads(); cur = V[location.hash.slice(1)] ? location.hash.slice(1) : 'today'; draw();
})();
