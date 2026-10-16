/* Keetown auth + shared page wiring.
 *
 * MODE 'demo'  : everything runs in the browser. OTP is fixed (123456) and "DigiLocker"
 *                verification is simulated and labelled DEMO. No real SMS / identity check.
 * MODE 'live'  : the Cloudflare backend (functions/api). OTP is sent and checked on the server,
 *                the session is an HttpOnly cookie, and accounts, tenancies, purchases, listings,
 *                saved items and leads are stored in the D1 database, so they work across devices.
 *                localStorage stays as a cache: every write goes to an outbox that is sent to
 *                /api/sync, and each page load refreshes the cache from /api/state.
 * Live is used automatically on the deployed site; `python3 -m http.server` (no /api) runs demo.
 */
window.KTAuth = (function () {
  const MODE = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:' ? 'demo' : 'live';
  const API = '/api';
  const DEMO_OTP = '123456';
  const SK = 'keetown_session', UK = 'keetown_users';

  const ROLES = {
    tenant:  { label: 'Rental tenant',          short: 'Tenant',  dl: 'required', blurb: 'Looking to rent a home or office in Hyderabad.' },
    owner:   { label: 'Rental property owner',  short: 'Owner',   dl: 'required', blurb: 'Want to rent out or have us manage your property.' },
    seller:  { label: 'Property seller',        short: 'Seller',  dl: 'required', blurb: 'Selling a flat, villa, plot or commercial space.' },
    buyer:   { label: 'Buyer (specific need)',  short: 'Buyer',   dl: 'optional', blurb: 'Searching for a specific property in specific areas.' },
    builder: { label: 'Builder / developer',    short: 'Builder', dl: 'optional', blurb: 'Promoting projects; RERA and GST checked by our team.' }
  };

  const raw = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const rawSet = (k, v) => { try { v === undefined ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const read = raw;
  const write = (k, v) => { const old = raw(k, null); rawSet(k, v); if (MODE === 'live') queue(k, old, v); };

  /* ---------- live sync (outbox → /api/sync, /api/state → cache) ---------- */
  const OB = 'keetown_outbox', LISTS = { keetown_tenancies: 'tenancies', keetown_purchases: 'purchases', keetown_submissions: 'submissions', keetown_leads: 'leads' };
  const BLOB = /^keetown_(portal|searches|seen)_\d{10}$/, CACHED = ['keetown_users', 'keetown_tenancies', 'keetown_purchases', 'keetown_submissions'];
  function diff(oldMap, newMap) {
    const put = [], del = [];
    Object.keys(newMap).forEach(id => { if (JSON.stringify(oldMap[id]) !== JSON.stringify(newMap[id])) put.push({ id, data: newMap[id] }); });
    Object.keys(oldMap).forEach(id => { if (!(id in newMap)) del.push(id); });
    return { put, del };
  }
  const byId = l => Object.fromEntries((Array.isArray(l) ? l : []).filter(x => x && x.id).map(x => [x.id, x]));
  function queue(k, old, v) {
    let op = null;
    if (k === UK) op = { col: 'users', ...diff(old || {}, v || {}) };
    else if (LISTS[k]) op = { col: LISTS[k], ...diff(byId(old), byId(v)) };
    else if (BLOB.test(k)) op = v == null ? { col: 'blob', put: [], del: [k] } : { col: 'blob', put: [{ id: k, data: v }], del: [] };
    if (!op || (!op.put.length && !op.del.length)) return;
    if (op.col === 'leads') op.del = [];               // the browser only ever adds leads
    const ob = raw(OB, []); ob.push(op); rawSet(OB, ob); flush();
  }
  let flushing = null;
  function flush() {
    if (flushing) return flushing.then(() => raw(OB, []).length ? flush() : undefined);
    flushing = (async () => {
      let ob = raw(OB, []);
      while (ob.length) {
        const op = ob[0], body = JSON.stringify(op);
        try { const r = await fetch(API + '/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: body.length < 60000, credentials: 'same-origin' }); if (r.status >= 500) break; }
        catch (e) { break; }                            // offline: keep it for the next page load
        ob = raw(OB, []); ob.shift(); rawSet(OB, ob);
      }
    })().finally(() => { flushing = null; });
    return flushing;
  }
  function xhr(method, url, body) {                   // synchronous on purpose: pages read the cache right after this
    try { const x = new XMLHttpRequest(); x.open(method, url, false); if (body) x.setRequestHeader('Content-Type', 'application/json'); x.send(body || null); return x; } catch (e) { return null; }
  }
  function applyState(st) {
    const users = {}; if (st.user) users[st.me] = st.user;
    rawSet(UK, users); rawSet('keetown_tenancies', st.tenancies); rawSet('keetown_purchases', st.purchases); rawSet('keetown_submissions', st.submissions);
    try { Object.keys(localStorage).filter(k => BLOB.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) {}
    Object.entries(st.blobs || {}).forEach(([k, v]) => rawSet(k, v));
    rawSet(SK, { mobile: st.me, at: Date.now(), staff: !!st.staff });
  }
  function clearCache() { CACHED.forEach(k => rawSet(k, undefined)); try { Object.keys(localStorage).filter(k => BLOB.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) {} rawSet(SK, undefined); }
  async function hydrate() {
    await flush();
    const r = await fetch(API + '/state', { credentials: 'same-origin', cache: 'no-store' });
    if (r.status === 401) { clearCache(); return null; }
    if (!r.ok) throw new Error('Could not load your account. Please try again.');
    const st = await r.json(); applyState(st); return st;
  }
  if (MODE === 'live' && raw(SK, null)) {              // page load: send anything unsent, then refresh the cache
    raw(OB, []).forEach(op => xhr('POST', API + '/sync', JSON.stringify(op))); rawSet(OB, []);
    const x = xhr('GET', API + '/state');
    if (x && x.status === 200) { try { applyState(JSON.parse(x.responseText)); } catch (e) {} }
    else if (x && x.status === 401) clearCache();
  }
  const users = () => read(UK, {});
  const saveUser = u => { const all = users(); all[u.mobile] = u; write(UK, all); };
  const session = () => read(SK, null);
  const user = () => { const s = session(); return s ? users()[s.mobile] || null : null; };

  const validMobile = m => /^[6-9]\d{9}$/.test(m);

  async function sendOtp(mobile) {
    if (MODE === 'live') { const r = await fetch(API + '/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile }) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Could not send OTP'); return j; }
    await new Promise(r => setTimeout(r, 500)); return { ok: true, demo: true };
  }
  async function verifyOtp(mobile, otp) {
    if (MODE === 'live') {
      const r = await fetch(API + '/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mobile, otp }), credentials: 'same-origin' });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Incorrect OTP. Please try again.');
      rawSet(OB, []); await hydrate(); if (j.demo) { ensureDemo(mobile); await flush(); } return j;
    }
    await new Promise(r => setTimeout(r, 400)); if (otp !== DEMO_OTP) throw new Error('Incorrect OTP. Please try again.'); ensureDemo(mobile); return { token: 'demo' };
  }
  function startSession(mobile) { const s = raw(SK, null); rawSet(SK, { ...(s && s.mobile === mobile ? s : {}), mobile, at: Date.now() }); }
  function logout() { if (MODE === 'live') { xhr('POST', API + '/logout', '{}'); clearCache(); } else try { localStorage.removeItem(SK); } catch (e) {} }

  /* DigiLocker */
  function digilockerStart(returnTo) {
    if (MODE === 'live') { location.href = API + '/digilocker/start?return=' + encodeURIComponent(returnTo || '/portal.html'); return new Promise(() => {}); }
    return null; // demo handled by the page (simulated consent panel)
  }
  function markVerified(mobile, name, method) {
    const u = users()[mobile]; if (!u) return;
    u.verified = { status: true, method: method || 'demo', name, at: new Date().toISOString() };
    saveUser(u);
  }

  /* shared page wiring: WhatsApp links, header phone, login/portal nav */
  function wire() {
    const B = KT.brand;
    document.querySelectorAll('[data-wa]').forEach(a => { a.href = KT.wa(a.dataset.wa); a.target = '_blank'; a.rel = 'noopener'; });
    const fab = document.getElementById('fab'); if (fab) fab.href = KT.wa('Hi Keetown Realty, I was browsing your website and have a question.');
    const up = document.getElementById('uPhone'); if (up) { up.textContent = B.phoneDisplay; up.href = 'tel:+' + B.phone; }
    const ur = document.getElementById('uRera'); if (ur) ur.textContent = B.reraNo;
    const nl = document.getElementById('navLogin'); const u = user();
    if (nl && u) { nl.textContent = 'My portal'; nl.href = (KT.base || '') + 'portal.html'; }
    const bg = document.getElementById('burger');
    if (bg && !document.body.classList.contains('home')) bg.onclick = () => { const o = document.getElementById('navLinks').classList.toggle('open'); bg.setAttribute('aria-expanded', o); };
  }
  document.addEventListener('DOMContentLoaded', wire);
  document.addEventListener('kt:login', wire);

  /* ---------- demo accounts (demo mode only): seeded on first login in each browser ---------- */
  const DAY = 864e5, iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const now = () => Date.now(), stamp = ms => new Date(now() - ms).toISOString();
  const DEMO = {
    '9000000001': { role: 'tenant', name: 'Priya Sharma', profile: { areas: ['kokapet', 'findist', 'gachibowli', 'kondapur'], budgetMin: 25000, budgetMax: 90000, bedsMin: '2', types: ['Apartment'], furnishing: 'Any', who: 'Family', occupants: '3', pets: 'no', parking: '1', movein: iso(now() + 30 * DAY), office: 'findist', email: 'priya.demo@example.com', heard: 'Instagram' } },
    '9000000002': { role: 'owner', name: 'Ravi Kumar', profile: { locality: 'kokapet', areas: ['kokapet'], society: 'Skyline Towers', ptype: 'Apartment', beds: '3', area: '2000', floor: '12 / 32', rent: '85000', deposit: '3', furn: 'Fully furnished', available: iso(now()), tenantPref: 'Family', petsOk: 'no', upi: 'ravi.demo@upi', manage: true, email: 'ravi.demo@example.com', heard: 'Google search' } },
    '9000000003': { role: 'buyer', name: 'Arjun Reddy', profile: { areas: ['kokapet', 'narsingi', 'tellapur', 'findist'], budgetMin: 150, budgetMax: 300, types: ['Apartment', 'Villa'], bedsMin: '3', possession: 'Any', purpose: 'Self-use', loan: 'Yes', timeline: 'Within 3 months', office: 'findist', email: 'arjun.demo@example.com', heard: 'YouTube' } },
    '9000000004': { role: 'seller', name: 'Lakshmi Rao', profile: { locality: 'miyapur', areas: ['miyapur'], society: 'Metro Heights', ptype: 'Apartment', beds: '3', size: '1650', unit: 'sq.ft', price: '105', status: 'Ready to move', age: '5–10 years', timeline: 'Within 3 months', email: 'lakshmi.demo@example.com', heard: 'Friend / referral' } },
    '9000000005': { role: 'builder', name: 'Sanjay Varma', profile: { company: 'Skyline Developers (demo)', rera: 'P024000XXXXX (demo)', gst: '', website: '', areas: ['kokapet', 'narsingi'], pt: 'Apartments', units: '240', email: 'sales.demo@example.com', heard: 'Property portal' } }
  };
  const DEMO_LIST = Object.entries(DEMO).map(([mobile, d]) => ({ mobile, role: d.role, name: d.name }));
  function seedTenancy() {
    const L = read('keetown_tenancies', []); if (L.some(t => t.id === 'tdemo1')) return;
    const t0 = new Date(), start = new Date(t0.getFullYear(), t0.getMonth() - 4, 1), pay = [];
    for (let i = 0; i < 4; i++) { const m = new Date(start.getFullYear(), start.getMonth() + i, 1), k = iso(m).slice(0, 7), date = iso(new Date(m.getFullYear(), m.getMonth(), 3));
      pay.push({ month: k, amount: 85000, received: 85000, status: 'paid', installments: [{ amount: 85000, via: i % 2 ? 'Bank transfer (NEFT / IMPS)' : 'UPI (paid directly)', date, ref: 'UTR' + (420000000000 + i * 7919) }], via: i % 2 ? 'Bank transfer (NEFT / IMPS)' : 'UPI (paid directly)', ref: 'UTR' + (420000000000 + i * 7919), paidOn: new Date(date).toISOString(), receiptNo: 'KT-' + k.replace('-', '') + '-DEMO' }); }
    L.unshift({ id: 'tdemo1', demo: true, propertyId: 'r4', title: 'Luxury 3BHK, Kokapet', address: 'Skyline Towers, Flat 1204, Kokapet, Hyderabad', loc: 'kokapet',
      ownerMobile: '9000000002', ownerName: 'Ravi Kumar', ownerUpi: 'ravi.demo@upi', ownerPan: 'ABCDE1234F', tenantMobile: '9000000001', tenantName: 'Priya Sharma',
      rent: 85000, dueDay: 5, deposit: 255000, start: iso(start), termMonths: 11, lockInMonths: 6, escalationPct: 5, payments: pay, reminders: [],
      tickets: [{ id: 'kdemo1', cat: 'Seepage / leak', room: 'Bedroom', desc: 'Damp patch on the bedroom wall after last week\'s rain.', urgency: 'High', visit: 'Evening (4–8)', access: true, photos: [], status: 'In progress', created: stamp(3 * DAY), firstResponse: stamp(3 * DAY - 5 * 36e5),
        log: [{ at: stamp(3 * DAY), text: 'Raised by tenant', by: 'tenant' }, { at: stamp(3 * DAY - 5 * 36e5), text: 'In progress', by: 'owner' }], comments: [{ at: stamp(3 * DAY - 5 * 36e5), text: 'Waterproofing contractor booked for Saturday morning.', by: 'owner' }] }],
      notices: [{ at: stamp(3 * DAY - 5 * 36e5), text: 'Owner replied on "Seepage / leak": Waterproofing contractor booked for Saturday morning.', by: 'owner', ticket: 'kdemo1', kind: 'issue' },
        { at: stamp(3 * DAY), text: 'New issue raised: Seepage / leak (Bedroom), high priority.', by: 'tenant', ticket: 'kdemo1', kind: 'issue' },
        { at: stamp(25 * DAY), text: 'Rent for last month confirmed received. Receipt available.', by: 'owner' },
        { at: stamp(120 * DAY), text: 'Welcome to your Keetown tenancy. This is a demo account — explore freely.', by: 'keetown' }],
      docs: [{ name: 'Rental agreement', status: 'Signed' }, { name: 'Police verification', status: 'Submitted' }, { name: 'Move-in condition report', status: 'Completed' }, { name: 'Tenant ID (KYC)', status: 'Verified' }, { name: "Owner's PAN (for HRA above ₹1 lakh/yr)", status: 'Pending' }],
      auto: { enabled: true, daysBefore: 3, onDue: true, overdueEvery: 3 }, created: stamp(120 * DAY) });
    write('keetown_tenancies', L);
  }
  function seedPurchase() {
    const L = read('keetown_purchases', []); if (L.some(p => p.id === 'bdemo1')) return;
    const booked = now() - 200 * DAY, P = 235e5, add = m => { const d = new Date(booked); d.setMonth(d.getMonth() + m); return iso(d); };
    const plan = [['Booking amount', 10, 0], ['Agreement of sale', 10, 1], ['Foundation complete', 15, 4], ['Slab stages', 30, 10], ['Finishing & fit-outs', 25, 18], ['Possession', 10, 24]].map(([name, pct, m], i) => ({ name, pct, amount: Math.round(P * pct / 100), due: add(m), paidOn: i < 3 ? add(m) : '' }));
    const docs = ['Booking / allotment letter', 'Agreement of sale', 'Home-loan sanction letter', 'Sale deed registration', 'Possession letter', 'Property tax mutation (GHMC)', 'Electricity & water transfer', 'Society membership / NOC', 'Encumbrance certificate (post-registration)'].map((n, i) => ({ name: n, status: i < 3 ? 'Received' : 'Pending' }));
    L.unshift({ id: 'bdemo1', demo: true, mobile: '9000000003', propertyId: 'p1', title: 'Skyline 3BHK at Kokapet', loc: 'kokapet', price: 235, stage: 'Under construction', booking: iso(booked), possession: 'Dec 2027', registration: Math.round(P * .06), plan, docs, created: new Date(booked).toISOString() });
    write('keetown_purchases', L);
  }
  function seedSubmissions(mobile) {
    const L = read('keetown_submissions', []); if (L.some(x => x.mobile === mobile)) return;
    const S = {
      '9000000002': [{ title: '3BHK Apartment in Skyline Towers, Kokapet', loc: 'kokapet', type: 'Apartment', mode: 'rent', area: 2000, price: 85000, quality: 85, status: 'Live — tenant placed' }],
      '9000000004': [{ title: '3BHK Apartment in Metro Heights, Miyapur', loc: 'miyapur', type: 'Apartment', mode: 'sale', area: 1650, price: 105, quality: 80, status: 'Under verification' }, { title: '200 sq.yd Plot, Shamshabad', loc: 'shamshabad', type: 'Plot', mode: 'sale', area: 200, price: 78, quality: 65, status: 'Documents requested' }],
      '9000000005': [{ title: 'Skyline Residences — 240 units, Narsingi', loc: 'narsingi', type: 'Apartment', mode: 'sale', area: 1850, price: 160, quality: 90, status: 'RERA check in progress' }]
    }[mobile] || [];
    S.forEach((x, i) => L.unshift({ id: 'sdemo' + mobile.slice(-1) + i, mobile, role: DEMO[mobile].role, photos: 6, details: {}, at: stamp((10 - i) * DAY), ...x }));
    write('keetown_submissions', L);
  }
  function ensureDemo(mobile) {
    const d = DEMO[mobile]; if (!d) return;
    const all = users();
    if (!all[mobile]) {
      saveUser({ mobile, role: d.role, demo: true, created: stamp(120 * DAY), profile: { name: d.name + ' (demo)', ...d.profile }, consent: { whatsapp: true, email: true, emailAddress: d.profile.email, terms: true, at: stamp(120 * DAY) }, verified: { status: true, method: 'demo', name: d.name, at: stamp(119 * DAY) }, attrib: { first: { utm_source: 'demo', at: stamp(120 * DAY) } } });
      const ps = { '9000000001': { saved: ['r4', 'r2', 'r1'], visits: [{ id: 1, pid: 'r2', date: iso(now() + 2 * DAY), time: 'Evening (4–7)', status: 'Confirmed' }] }, '9000000003': { saved: ['p1', 'p3'], visits: [{ id: 2, pid: 'p3', date: iso(now() + 4 * DAY), time: 'Morning (10–1)', status: 'Requested' }] } }[mobile];
      if (ps) write('keetown_portal_' + mobile, ps);
      if (mobile === '9000000001') write('keetown_searches_' + mobile, [{ q: '?intent=rent&loc=kokapet,findist&beds=2,3', title: 'Homes for rent in 2 localities', at: stamp(6 * DAY), seen: [] }]);
      if (mobile === '9000000003') write('keetown_searches_' + mobile, [{ q: '?intent=buy&loc=kokapet,narsingi&bmin=150&bmax=300', title: 'Homes for sale in 2 localities', at: stamp(9 * DAY), seen: [] }]);
    }
    if (mobile === '9000000001' || mobile === '9000000002') seedTenancy();
    if (mobile === '9000000003') seedPurchase();
    seedSubmissions(mobile);
  }
  function resetDemo() {
    const all = users(); Object.keys(DEMO).forEach(m => { delete all[m]; try { ['keetown_portal_', 'keetown_searches_', 'keetown_seen_'].forEach(p => localStorage.removeItem(p + m)); } catch (e) {} }); write(UK, all);
    write('keetown_tenancies', read('keetown_tenancies', []).filter(t => t.id !== 'tdemo1'));
    write('keetown_purchases', read('keetown_purchases', []).filter(p => p.id !== 'bdemo1'));
    write('keetown_submissions', read('keetown_submissions', []).filter(x => !DEMO[x.mobile]));
    const s = session(); if (s && DEMO[s.mobile]) logout();
    if (MODE === 'live') return fetch(API + '/demo/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  }

  return { MODE, DEMO_OTP, DEMO_LIST, ensureDemo, resetDemo, flush, hydrate, ROLES, users, saveUser, session, user, validMobile, sendOtp, verifyOtp, startSession, logout, digilockerStart, markVerified, read, write };
})();
