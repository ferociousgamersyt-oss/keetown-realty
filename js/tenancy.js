/* Post-deal records: tenancies (shared by owner + tenant) and purchases.
 * Demo storage is the browser; in production these become server tables (see BACKEND.md):
 * tenancies, payments, reminders, tickets, documents, notices, purchases. */
window.KTTen = (function () {
  const A = KTAuth, K = 'keetown_tenancies', KP = 'keetown_purchases';
  const all = () => A.read(K, []), put = list => A.write(K, list);
  const pad = n => String(n).padStart(2, '0');
  const ym = d => d.getFullYear() + '-' + pad(d.getMonth() + 1);
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const fmtD = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const monthName = k => new Date(k + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const addMonths = (d, n) => { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; };

  /* ---------- tenancies ---------- */
  function forUser(mobile) { return all().filter(t => t.tenantMobile === mobile || t.ownerMobile === mobile); }
  function get(id) { return all().find(t => t.id === id); }
  function save(t) { const l = all(), i = l.findIndex(x => x.id === t.id); i < 0 ? l.unshift(t) : (l[i] = t); put(l); return t; }
  function create(f) {
    return save({ id: uid('t'), propertyId: f.propertyId || '', title: f.title, address: f.address || '', loc: f.loc || '',
      ownerMobile: f.ownerMobile, ownerName: f.ownerName || '', ownerUpi: f.ownerUpi || '', ownerPan: f.ownerPan || '',
      tenantMobile: f.tenantMobile, tenantName: f.tenantName || '', rent: +f.rent, dueDay: +f.dueDay || 5, deposit: +f.deposit || 0,
      start: f.start, termMonths: +f.termMonths || 11, lockInMonths: +f.lockInMonths || 6, escalationPct: +f.escalationPct || 5,
      payments: [], reminders: [], tickets: [], notices: [], docs: [{ name: 'Rental agreement', status: 'Pending' }, { name: 'Police verification', status: 'Pending' }, { name: 'Move-in condition report', status: 'Pending' }, { name: 'Tenant ID (KYC)', status: 'Pending' }, { name: "Owner's PAN (for HRA above ₹1 lakh/yr)", status: 'Pending' }],
      auto: { enabled: true, daysBefore: 3, onDue: true, overdueEvery: 3 }, created: new Date().toISOString(), demo: !!f.demo });
  }
  const dueDate = (t, k) => { const [y, m] = k.split('-').map(Number), last = new Date(y, m, 0).getDate(); return new Date(y, m - 1, Math.min(t.dueDay, last)); };
  const rentFor = (t, k) => { const s = new Date(t.start), [y, m] = k.split('-').map(Number), n = (y - s.getFullYear()) * 12 + (m - 1 - s.getMonth()); return Math.round(t.rent * Math.pow(1 + t.escalationPct / 100, Math.max(0, Math.floor(n / t.termMonths)))); };
  function periods(t) {   // rent months from start until next month
    const out = [], s = new Date(t.start); let d = new Date(s.getFullYear(), s.getMonth(), 1); const end = addMonths(new Date(today().getFullYear(), today().getMonth(), 1), 1);
    while (d <= end) { out.push(ym(d)); d = addMonths(d, 1); } return out;
  }
  function status(t, k) {
    const p = t.payments.find(x => x.month === k); if (p) return p.status;   // paid | partial | reported
    const dd = dueDate(t, k), diff = Math.round((dd - today()) / 864e5);
    return diff < 0 ? 'overdue' : diff <= 7 ? 'due' : 'upcoming';
  }
  const receivedOf = p => !p ? 0 : (p.received ?? (p.status === 'paid' ? p.amount : 0));
  function ledger(t) { return periods(t).map(k => { const pay = t.payments.find(x => x.month === k), amount = rentFor(t, k), received = receivedOf(pay); return { month: k, label: monthName(k), due: dueDate(t, k), amount, received, balance: Math.max(0, amount - received), status: status(t, k), pay }; }).reverse(); }
  function current(t) { const open = ledger(t).filter(r => r.status !== 'paid').sort((a, b) => a.due - b.due); return open[0] || ledger(t)[0]; }
  const daysTo = d => Math.round((d - today()) / 864e5);
  function upiLink(t, row) { if (!t.ownerUpi) return ''; return 'upi://pay?' + new URLSearchParams({ pa: t.ownerUpi, pn: t.ownerName || 'Owner', am: row.balance || row.amount, cu: 'INR', tn: `Rent ${row.label} ${t.title}`.slice(0, 50) }); }
  function report(t, k, ref) {
    const r = ledger(t).find(x => x.month === k), ex = t.payments.find(x => x.month === k);
    if (ex) Object.assign(ex, { status: 'reported', ref, reportedOn: new Date().toISOString() });   // keeps earlier instalments
    else t.payments.push({ month: k, amount: r.amount, status: 'reported', ref, reportedOn: new Date().toISOString() });
    notice(t, `${t.tenantName || 'Tenant'} reported ${r.status === 'partial' ? 'the balance of ₹' + r.balance.toLocaleString('en-IN') : 'rent'} for ${r.label} as paid${ref ? ' (ref ' + ref + ')' : ''}.`, 'tenant'); return save(t);
  }
  const MODES = ['Cash', 'UPI (paid directly)', 'Bank transfer (NEFT / IMPS)', 'Cheque', 'Other'];
  /* Owner records money received — full or part-payment, any mode. Each instalment is kept. */
  function recordPayment(t, k, f, by = 'owner') {
    const r = ledger(t).find(x => x.month === k), ex = t.payments.find(x => x.month === k);
    const insts = ex && ex.installments ? ex.installments.slice() : (ex && ex.status === 'paid' ? [{ amount: ex.amount, via: ex.via, date: ex.paidOn, ref: ex.ref }] : []);
    const amt = Math.round(+f.amount), date = f.date || new Date().toISOString().slice(0, 10);
    insts.push({ amount: amt, via: f.via, date, ref: f.ref || '', note: f.note || '', by, at: new Date().toISOString() });
    const received = insts.reduce((a, i) => a + i.amount, 0), full = received >= r.amount;
    t.payments = t.payments.filter(x => x.month !== k);
    t.payments.push({ month: k, amount: r.amount, received, status: full ? 'paid' : 'partial', installments: insts, via: new Set(insts.map(i => i.via)).size > 1 ? 'Multiple' : f.via, ref: f.ref || (ex ? ex.ref : '') || '', reportedRef: ex && ex.status === 'reported' ? ex.ref : '', paidOn: new Date(date).toISOString(), receiptNo: 'KT-' + k.replace('-', '') + '-' + t.id.slice(-4).toUpperCase() });
    notice(t, full ? `Owner recorded ₹${amt.toLocaleString('en-IN')} received (${f.via}, ${fmtD(date)}). Rent for ${r.label} is fully paid — receipt available.`
      : `Owner recorded a part-payment of ₹${amt.toLocaleString('en-IN')} (${f.via}, ${fmtD(date)}). Balance ₹${(r.amount - received).toLocaleString('en-IN')} for ${r.label} is still due.`, by);
    return save(t);
  }
  /* Confirm what the tenant reported (or the remaining balance) in one click. */
  function confirm(t, k, via = 'UPI / bank') { const r = ledger(t).find(x => x.month === k), ex = t.payments.find(x => x.month === k); return recordPayment(t, k, { amount: r.balance || r.amount, via: ex && ex.status === 'reported' ? 'UPI / bank (reported by tenant)' : via, ref: ex ? ex.ref : '' }); }
  function undo(t, k) { const r = ledger(t).find(x => x.month === k); t.payments = t.payments.filter(x => x.month !== k); notice(t, `Owner removed the payment record for ${r.label}. It shows as unpaid until recorded again.`, 'owner'); return save(t); }
  function notice(t, text, by, extra = {}) { t.notices.unshift({ at: new Date().toISOString(), text, by, ...extra }); }
  function remind(t, k, by = 'owner', auto = false) { const r = ledger(t).find(x => x.month === k); t.reminders.unshift({ at: new Date().toISOString(), month: k, by, auto }); notice(t, `${auto ? 'Automatic reminder' : 'Reminder from your owner'}: ${r.status === 'partial' ? 'balance' : 'rent'} of ₹${(r.balance || r.amount).toLocaleString('en-IN')} for ${r.label} is ${r.status === 'overdue' || (r.status === 'partial' && daysTo(r.due) < 0) ? 'overdue since' : 'due on'} ${fmtD(r.due)}.`, auto ? 'keetown' : by); return save(t); }
  function reminderText(t, r) { return `Hi ${t.tenantName || ''}, a gentle reminder that ${r.status === 'partial' ? 'the balance' : 'rent'} of ₹${(r.balance || r.amount).toLocaleString('en-IN')} for ${r.label} (${t.title}) is ${r.status === 'overdue' || (r.status === 'partial' && daysTo(r.due) < 0) ? 'overdue since' : 'due on'} ${fmtD(r.due)}.${t.ownerUpi ? ' UPI: ' + t.ownerUpi + '.' : ''} You can also pay and download receipts from your Keetown portal. Thank you!`; }
  /* Automatic reminders: in production a daily server job sends these via the WhatsApp Business API.
   * Here we simulate the ones that would already have fired, so both portals show them. */
  function runAuto(t) {
    if (!t.auto || !t.auto.enabled) return t; let changed = false;
    ledger(t).filter(r => r.status === 'due' || r.status === 'overdue' || (r.status === 'partial' && daysTo(r.due) <= 0)).forEach(r => {
      const d = daysTo(r.due), sent = t.reminders.filter(x => x.month === r.month && x.auto);
      const want = (d <= t.auto.daysBefore && d > 0 && !sent.some(x => x.kind === 'before')) ? 'before' : (d === 0 && t.auto.onDue && !sent.some(x => x.kind === 'due')) ? 'due' : (d < 0 && (!sent.length || (today() - new Date(sent[0].at)) / 864e5 >= t.auto.overdueEvery)) ? 'overdue' : '';
      if (want) { remind(t, r.month, 'keetown', true); t.reminders[0].kind = want; changed = true; }
    });
    return changed ? save(t) : t;
  }
  function schedule(t) {   // next automatic reminders
    if (!t.auto || !t.auto.enabled) return []; const r = current(t); if (!r || r.status === 'paid') return [];
    const out = []; const before = addMonths(r.due, 0); before.setDate(before.getDate() - t.auto.daysBefore);
    if (before >= today()) out.push([before, `${t.auto.daysBefore} days before due`]); if (t.auto.onDue && r.due >= today()) out.push([r.due, 'On the due date']);
    const od = new Date(r.due); od.setDate(od.getDate() + t.auto.overdueEvery); out.push([od, `Every ${t.auto.overdueEvery} days if unpaid`]);
    return out;
  }
  function agreement(t) {
    const s = new Date(t.start), end = addMonths(s, t.termMonths), lock = addMonths(s, t.lockInMonths), elapsed = (today() - s) / (end - s);
    return { start: s, end, lockIn: lock, progress: Math.max(0, Math.min(1, elapsed)), renewIn: daysTo(end), nextRent: Math.round(t.rent * (1 + t.escalationPct / 100)) };
  }
  /* ---------- property issues (tickets) ---------- */
  const SLA = { Emergency: 4, High: 24, Normal: 72 };   // target first response, hours
  function addTicket(t, f, by) {
    const k = { id: uid('k'), cat: f.cat, room: f.room || '', desc: f.desc, urgency: f.urgency || 'Normal', visit: f.visit || '', access: !!f.access, photos: f.photos || [], status: 'Open', created: new Date().toISOString(), log: [{ at: new Date().toISOString(), text: 'Raised by ' + by, by }], comments: [] };
    t.tickets.unshift(k);
    notice(t, `${f.urgency === 'Emergency' ? 'EMERGENCY — ' : ''}New issue raised: ${f.cat}${f.room ? ' (' + f.room + ')' : ''}, ${(f.urgency || 'Normal').toLowerCase()} priority. ${f.desc.slice(0, 90)}`, by, { ticket: k.id, kind: 'issue' });
    save(t); return k;
  }
  function moveTicket(t, id, statusTo, note) { const k = t.tickets.find(x => x.id === id); k.status = statusTo; if (!k.firstResponse && statusTo !== 'Open') k.firstResponse = new Date().toISOString(); k.log.push({ at: new Date().toISOString(), text: statusTo + (note ? ' · ' + note : ''), by: 'owner' }); notice(t, `Issue "${k.cat}" is now ${statusTo.toLowerCase()}${note ? ' — ' + note : ''}.`, 'owner', { ticket: id, kind: 'issue' }); return save(t); }
  function comment(t, id, text, by) { const k = t.tickets.find(x => x.id === id); (k.comments = k.comments || []).push({ at: new Date().toISOString(), text, by }); if (by === 'owner' && !k.firstResponse) k.firstResponse = new Date().toISOString(); notice(t, `${by === 'owner' ? 'Owner' : 'Tenant'} replied on "${k.cat}": ${text.slice(0, 100)}`, by, { ticket: id, kind: 'issue' }); return save(t); }
  function sla(k) {   // hours open vs target first response
    const h = ((k.firstResponse ? new Date(k.firstResponse) : new Date()) - new Date(k.created)) / 36e5, target = SLA[k.urgency] || 72;
    return { hours: h, target, breached: !k.firstResponse && h > target, met: !!k.firstResponse && h <= target };
  }
  /* ---------- unread notifications (per user) ---------- */
  const seenKey = m => 'keetown_seen_' + m;
  function inbox(mobile) {   // notices across this user's tenancies that someone else created
    const seen = A.read(seenKey(mobile), {}), out = [];
    forUser(mobile).forEach(t => { const me = t.ownerMobile === mobile ? 'owner' : 'tenant'; t.notices.forEach(n => { if (n.by !== me) out.push({ ...n, tid: t.id, title: t.title, unread: !seen[t.id] || n.at > seen[t.id] }); }); });
    return out.sort((a, b) => b.at.localeCompare(a.at));
  }
  function markSeen(mobile) { const s = A.read(seenKey(mobile), {}), now = new Date().toISOString(); forUser(mobile).forEach(t => s[t.id] = now); A.write(seenKey(mobile), s); }
  function receipt(t, pay) {
    const r = ledger(t).find(x => x.month === pay.month), got = pay.received ?? pay.amount, insts = pay.installments || [{ amount: got, via: pay.via, date: pay.paidOn, ref: pay.ref }];
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Rent receipt ${pay.receiptNo}</title><style>body{font:15px/1.6 Inter,system-ui,sans-serif;color:#0f2147;max-width:720px;margin:40px auto;padding:0 24px}h1{font-size:22px;margin:0}.box{border:1.5px solid #1e4386;border-radius:12px;padding:28px;margin-top:20px}table{width:100%;border-collapse:collapse;margin:16px 0}td{padding:8px 0;border-bottom:1px solid #e3e9f2}td:last-child{text-align:right;font-weight:600}.sig{margin-top:48px;display:flex;justify-content:space-between}.muted{color:#4f6286;font-size:13px}@media print{button{display:none}}</style></head><body>
      <button onclick="print()">Print / save as PDF</button><div class="box"><h1>Rent receipt</h1><p class="muted">Receipt no. ${pay.receiptNo} · issued ${fmtD(pay.paidOn)}</p>
      <p>Received with thanks from <b>${t.tenantName || 'the tenant'}</b> the sum of <b>₹${got.toLocaleString('en-IN')}</b> towards rent for <b>${r.label}</b> for the property:</p><p><b>${t.title}</b>${t.address ? '<br>' + t.address : ''}</p>
      <table><tr><td>Rent period</td><td>${r.label}</td></tr><tr><td>Amount</td><td>₹${got.toLocaleString('en-IN')}</td></tr>${insts.map(i => `<tr><td>Received ${fmtD(i.date)}</td><td>₹${(+i.amount).toLocaleString('en-IN')} · ${i.via || 'UPI / bank'}${i.ref ? ' · ref ' + i.ref : ''}</td></tr>`).join('')}<tr><td>Landlord</td><td>${t.ownerName || ''}${t.ownerPan ? ' · PAN ' + t.ownerPan : ''}</td></tr></table>
      <div class="sig"><span class="muted">Generated by Keetown Realty portal on confirmation by the landlord.</span><span>______________________<br>Landlord signature</span></div></div></body></html>`;
    const w = window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank'); if (!w) alert('Allow pop-ups to open the receipt.');
  }
  function demo(u) {   // sample tenancy so the post-deal tools can be explored
    const isOwner = ['owner', 'seller', 'builder'].includes(u.role), s = addMonths(new Date(today().getFullYear(), today().getMonth(), 1), -4), sIso = s.getFullYear() + '-' + pad(s.getMonth() + 1) + '-01';
    const t = create({ demo: true, propertyId: 'r4', title: 'Luxury 3BHK, Kokapet (sample)', address: 'Tower B, Flat 1204, Kokapet, Hyderabad', loc: 'kokapet', rent: 85000, dueDay: 5, deposit: 255000, start: sIso, termMonths: 11, lockInMonths: 6, escalationPct: 5,
      ownerMobile: isOwner ? u.mobile : '9800000009', ownerName: isOwner ? u.profile.name : 'Ravi Kumar (sample owner)', ownerUpi: isOwner ? (u.profile.upi || 'owner@upi') : 'ravi.sample@upi', ownerPan: 'ABCDE1234F',
      tenantMobile: isOwner ? '9800000008' : u.mobile, tenantName: isOwner ? 'Priya S. (sample tenant)' : u.profile.name });
    periods(t).slice(0, -2).forEach(k => { confirm(t, k, 'UPI'); });
    t.docs[0].status = 'Signed'; t.docs[1].status = 'Submitted'; t.docs[2].status = 'Completed'; t.docs[3].status = 'Verified';
    t.notices = t.notices.slice(0, 2); notice(t, 'Welcome to your Keetown tenancy dashboard. This is sample data you can play with.', 'keetown');
    addTicket(t, { cat: 'Seepage / leak', desc: 'Damp patch on bedroom wall after rain', urgency: 'High' }, 'tenant'); moveTicket(t, t.tickets[0].id, 'In progress', 'Plumber visit Saturday');
    return runAuto(save(t));
  }

  /* ---------- purchases (buyers) ---------- */
  const purchases = mobile => A.read(KP, []).filter(x => x.mobile === mobile);
  function savePurchase(x) { const l = A.read(KP, []), i = l.findIndex(y => y.id === x.id); i < 0 ? l.unshift(x) : (l[i] = x); A.write(KP, l); return x; }
  function createPurchase(u, f) {
    const uc = f.stage === 'Under construction', P = +f.price * 1e5, booked = new Date(f.booking || today());
    const plan = (uc ? [['Booking amount', 10, 0], ['Agreement of sale', 10, 1], ['Foundation complete', 15, 4], ['Slab stages', 30, 10], ['Finishing & fit-outs', 25, 18], ['Possession', 10, 24]]
      : [['Token advance', 1, 0], ['Agreement & advance', 19, 1], ['Balance at registration', 80, 2]]).map(([name, pct, m]) => ({ name, pct, amount: Math.round(P * pct / 100), due: addMonths(booked, m).toISOString().slice(0, 10), paidOn: '' }));
    const docs = ['Booking / allotment letter', 'Agreement of sale', 'Home-loan sanction letter', 'Sale deed registration', 'Possession letter', 'Property tax mutation (GHMC)', 'Electricity & water transfer', 'Society membership / NOC', 'Encumbrance certificate (post-registration)'].map(n => ({ name: n, status: 'Pending' }));
    return savePurchase({ id: uid('b'), mobile: u.mobile, propertyId: f.propertyId || '', title: f.title, loc: f.loc || '', price: +f.price, stage: f.stage, booking: booked.toISOString().slice(0, 10), possession: f.possession || '', registration: Math.round(P * KT.registrationRate), plan, docs, created: new Date().toISOString(), demo: !!f.demo });
  }
  return { MODES, forUser, get, save, create, ledger, current, status, rentFor, upiLink, report, confirm, recordPayment, undo, remind, reminderText, runAuto, schedule, agreement, addTicket, moveTicket, receipt, demo, daysTo, comment, sla, SLA, inbox, markSeen, fmtD, monthName, purchases, savePurchase, createPurchase };
})();
