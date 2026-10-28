/* Keetown for Business: employee relocations and office space for companies (MNCs, GCCs, startups).
 * Records (synced to the backend like tenancies):
 *   keetown_relocations : one case per employee move; shared by the company HR login and the employee
 *   keetown_offices     : office-space requirements raised by a company
 * Fees are indicative placeholders until a signed agreement. */
window.KTCorp = (function () {
  const A = KTAuth, KR = 'keetown_relocations', KO = 'keetown_offices';
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const now = () => new Date().toISOString();

  /* ---------- relocation catalogue ---------- */
  const SERVICES = {
    consult:  ['Welcome call & needs brief', 'Family size, budget, office, schools, commute and move date captured in one call.'],
    tempstay: ['Temporary stay', 'Serviced apartment near the office for the first 7–30 nights, booked and billed to the company.'],
    search:   ['Home search & guided visits', 'Verified shortlist matched to the housing allowance; visits in one planned day.'],
    verify:   ['Owner & property verification', 'Ownership, society NOC and dues checked before any token is paid.'],
    lease:    ['Lease negotiation & agreement', 'Rent, deposit, lock-in and exit clauses negotiated; stamped and registered agreement.'],
    setup:    ['Move-in setup', 'Electricity (TGSPDCL) and water (HMWSSB) transfer, internet, gas and furniture rental.'],
    movers:   ['Packers & movers', 'Vetted movers with insurance, quotes compared and the move day coordinated.'],
    schools:  ['School search & admissions', 'Shortlist by curriculum and commute, visits and admission paperwork support.'],
    orient:   ['City orientation', 'Commute options, hospitals, markets and services around the new home.'],
    manage:   ['Home management during the stay', 'Rent tracking, repairs and society issues handled by our property-management team.'],
    exit:     ['Move-out & deposit recovery', 'Handover inspection, utility closure and deposit refund follow-up.']
  };
  const PACKAGES = {
    essential: { name: 'Essential', fee: 25000, blurb: 'Find, verify and sign.', services: ['consult', 'search', 'verify', 'lease'] },
    standard:  { name: 'Standard', fee: 45000, blurb: 'Land, stay, settle in.', services: ['consult', 'tempstay', 'search', 'verify', 'lease', 'setup', 'orient'] },
    executive: { name: 'Executive', fee: 75000, blurb: 'Door-to-door for leaders and families.', services: Object.keys(SERVICES) }
  };
  const STAGES = ['Requested', 'Consultation', 'Temporary stay', 'House hunting', 'Lease signed', 'Moving in', 'Settled'];
  const SVC_STATUS = ['Not started', 'In progress', 'Done'];

  /* ---------- office-space catalogue ---------- */
  const OFFICE_TYPES = ['Managed office', 'Coworking seats', 'Warm shell (fitted)', 'Bare shell', 'Not sure yet'];
  const OFFICE_STAGES = ['Brief received', 'Market scan & shortlist', 'Site visits', 'Negotiation & LOI', 'Due diligence', 'Lease signed', 'Fit-out', 'Handover'];
  const OFFICE_STEPS = ['Seats, layout, budget and timelines captured in one call.', 'Market scan across managed, coworking and leased options, including off-market floors.', 'Planned visit days with commute and amenity notes.', 'Rent, rent-free fit-out period, lock-in, escalation and CAM negotiated; LOI drafted.', 'Title, OC, fire NOC, power load and lease clauses checked.', 'Lease registration and stamp duty coordinated.', 'Fit-out partners and timelines tracked.', 'Snag list, access cards and move-in day.'];
  const OFFICE_CHECKS = ['Title & ownership', 'Occupancy certificate (OC)', 'Fire NOC', 'Power load & DG backup', 'Lift & parking ratio', 'Lock-in, escalation & CAM terms', 'Fit-out period (rent-free)', 'Exit & reinstatement clause'];

  /* ---------- relocations ---------- */
  const relAll = () => A.read(KR, []), relPut = l => A.write(KR, l);
  const relForCompany = m => relAll().filter(r => r.companyMobile === m);
  const relForEmployee = m => relAll().filter(r => r.employeeMobile === m && r.status !== 'Cancelled');
  const relGet = id => relAll().find(r => r.id === id);
  function relSave(r) { const l = relAll(), i = l.findIndex(x => x.id === r.id); i < 0 ? l.unshift(r) : (l[i] = r); relPut(l); return r; }
  function relCreate(company, f, by = 'hr') {
    const pkg = PACKAGES[f.package] || PACKAGES.standard, svcs = f.package === 'custom' ? f.services : pkg.services;
    const r = { id: uid('rl'), companyMobile: company.mobile, companyName: company.profile.company || '', hrName: company.profile.name || '',
      employeeName: f.employeeName, employeeMobile: f.employeeMobile, employeeEmail: f.employeeEmail || '', level: f.level || '', fromCity: f.fromCity || '',
      joinDate: f.joinDate || '', arrival: f.arrival || '', family: f.family || 'Single', intent: f.intent || 'rent', budget: +f.budget || 0, areas: f.areas || [], office: f.office || '',
      beds: f.beds || '', tempNights: +f.tempNights || 0, billing: f.billing || 'Company pays Keetown', costCenter: f.costCenter || '', notes: f.notes || '',
      package: f.package || 'standard', services: svcs.map(k => ({ key: k, status: 'Not started' })), stage: 0, status: 'Active',
      log: [{ at: now(), text: 'Relocation requested by ' + (company.profile.name || 'HR'), by }], comments: [], created: now(), demo: !!f.demo };
    return relSave(r);
  }
  function relStage(r, i, by = 'keetown') { r.stage = Math.max(0, Math.min(STAGES.length - 1, i)); r.log.unshift({ at: now(), text: 'Stage: ' + STAGES[r.stage], by }); if (r.stage === STAGES.length - 1) r.settledOn = now(); return relSave(r); }
  function relService(r, key, status, by = 'keetown') { const s = r.services.find(x => x.key === key); if (!s) return r; s.status = status; r.log.unshift({ at: now(), text: SERVICES[key][0] + ': ' + status, by }); return relSave(r); }
  function relComment(r, text, by) { r.comments.push({ at: now(), text, by }); r.log.unshift({ at: now(), text: (by === 'hr' ? 'HR' : by === 'employee' ? 'Employee' : 'Keetown') + ' commented', by }); return relSave(r); }
  function relCancel(r, by = 'hr') { r.status = 'Cancelled'; r.log.unshift({ at: now(), text: 'Relocation cancelled', by }); return relSave(r); }
  const relProgress = r => { const d = r.services.filter(s => s.status === 'Done').length; return Math.round(((r.stage / (STAGES.length - 1)) * .6 + (r.services.length ? d / r.services.length : 0) * .4) * 100); };
  const relFee = r => r.package === 'custom' ? r.services.length * 7000 : (PACKAGES[r.package] || PACKAGES.standard).fee;
  const daysTo = d => d ? Math.round((new Date(d) - new Date(new Date().toDateString())) / 864e5) : null;

  /* ---------- employee home lock (paid from the company's rent allowance) ----------
   * Employee locks a home → HR approves (or declines) → Keetown confirms with the owner → Locked (stage: Lease signed).
   * Rent up to the allowance is paid by the company; anything above is the employee's share, shown before locking. */
  const LOCK_OPEN = ['Awaiting company approval', 'Approved, confirming with owner', 'Locked'];
  let remoteLocks = [];
  function loadLocks() {   // homes reserved by any company (ids only), so two employees can't lock the same home
    if (A.MODE !== 'live') return Promise.resolve();
    return fetch('/api/locks', { credentials: 'same-origin' }).then(r => r.ok ? r.json() : []).then(l => { remoteLocks = Array.isArray(l) ? l : []; }).catch(() => {});
  }
  const lockedIds = (exceptRel) => new Set([...remoteLocks, ...relAll().filter(r => r.id !== exceptRel && r.lock && LOCK_OPEN.includes(r.lock.status) && r.status === 'Active').map(r => r.lock.pid)]);
  const split = (r, rent) => { const allowance = r.budget || 0, company = allowance ? Math.min(rent, allowance) : rent; return { company, employee: Math.max(0, rent - company) }; };
  function nearOffice(r) {
    const o = KT.loc(r.office), want = r.intent === 'buy' ? 'sale' : 'rent', cap = r.budget ? r.budget * (want === 'rent' ? 1.15 : 1.1) : Infinity, held = lockedIds(r.id);
    const km = window.KTMatch && KTMatch.km;
    return KT.properties.filter(p => p.mode === want && p.type !== 'Commercial' && p.price <= cap && (!r.beds || (p.beds || 0) >= +r.beds))
      .map(p => ({ p, km: o && km && p.lat ? km({ lat: p.lat, lng: p.lng }, o) : null, held: held.has(p.id), over: r.budget ? Math.max(0, p.price - r.budget) : 0 }))
      .sort((a, b) => (a.held - b.held) || ((a.km ?? 99) - (b.km ?? 99)) || (a.over - b.over)).slice(0, 12);
  }
  function relLock(r, p, by = 'employee') {
    if (lockedIds(r.id).has(p.id)) throw new Error('This home was just reserved by someone else. Please pick another.');
    const sp = split(r, p.price);
    r.lock = { pid: p.id, title: p.title, loc: p.loc, rent: p.price, mode: p.mode, companyPays: sp.company, employeePays: sp.employee, status: 'Awaiting company approval', at: now() };
    r.log.unshift({ at: now(), text: 'Home lock requested: ' + p.title, by });
    return relSave(r);
  }
  function relLockDecide(r, ok, note = '', by = 'hr') {
    if (!r.lock) return r; r.lock.status = ok ? 'Approved, confirming with owner' : 'Declined'; r.lock.decidedAt = now(); if (note) r.lock.note = note;
    r.log.unshift({ at: now(), text: (ok ? 'Company approved home: ' : 'Company declined home: ') + r.lock.title + (note ? ' (' + note + ')' : ''), by });
    return relSave(r);
  }
  function relLockConfirm(r, by = 'keetown') {
    if (!r.lock) return r; r.lock.status = 'Locked'; r.lock.lockedAt = now();
    r.log.unshift({ at: now(), text: 'Home locked with the owner: ' + r.lock.title, by });
    const lease = r.services.find(s => s.key === 'lease'); if (lease && lease.status === 'Not started') lease.status = 'In progress';
    const search = r.services.find(s => s.key === 'search'); if (search) search.status = 'Done';
    if (r.stage < 4) r.stage = 4;
    return relSave(r);
  }
  function relLockRelease(r, by = 'employee') { if (!r.lock) return r; r.log.unshift({ at: now(), text: 'Home released: ' + r.lock.title, by }); r.lock = null; return relSave(r); }

  /* ---------- offices ---------- */
  const offAll = () => A.read(KO, []), offPut = l => A.write(KO, l);
  const offForCompany = m => offAll().filter(o => o.companyMobile === m);
  const offGet = id => offAll().find(o => o.id === id);
  function offSave(o) { const l = offAll(), i = l.findIndex(x => x.id === o.id); i < 0 ? l.unshift(o) : (l[i] = o); offPut(l); return o; }
  function offCreate(company, f, by = 'hr') {
    return offSave({ id: uid('of'), companyMobile: company.mobile, companyName: company.profile.company || '', contactName: company.profile.name || '',
      seats: +f.seats || 0, area: +f.area || 0, type: f.type || 'Not sure yet', areas: f.areas || [], budget: +f.budget || 0, budgetUnit: f.budgetUnit || 'per seat / month',
      startBy: f.startBy || '', termYears: +f.termYears || 3, parking: +f.parking || 0, needs: f.needs || [], notes: f.notes || '',
      stage: 0, status: 'Active', shortlist: [], checks: OFFICE_CHECKS.map(n => ({ name: n, status: 'Pending' })),
      log: [{ at: now(), text: 'Office requirement submitted', by }], comments: [], created: now(), demo: !!f.demo });
  }
  function offStage(o, i, by = 'keetown') { o.stage = Math.max(0, Math.min(OFFICE_STAGES.length - 1, i)); o.log.unshift({ at: now(), text: 'Stage: ' + OFFICE_STAGES[o.stage], by }); return offSave(o); }
  function offComment(o, text, by) { o.comments.push({ at: now(), text, by }); o.log.unshift({ at: now(), text: (by === 'hr' ? 'Company' : 'Keetown') + ' commented', by }); return offSave(o); }
  function offShort(o, idx, status, by = 'hr') { const s = o.shortlist[idx]; if (!s) return o; s.status = status; o.log.unshift({ at: now(), text: s.name + ': ' + status, by }); return offSave(o); }
  function offCheck(o, i, by = 'keetown') { const c = o.checks[i]; if (!c) return o; c.status = c.status === 'Cleared' ? 'Pending' : 'Cleared'; o.log.unshift({ at: now(), text: c.name + ': ' + c.status, by }); return offSave(o); }
  function offAddOption(o, x, by = 'keetown') { o.shortlist.push({ ...x, status: 'Shortlisted' }); o.log.unshift({ at: now(), text: 'Added to shortlist: ' + x.name, by }); return offSave(o); }
  // commercial listings that fit the brief (for the team's first shortlist)
  function offMatches(o) {
    return KT.properties.filter(p => p.type === 'Commercial' && (!o.areas.length || o.areas.includes(p.loc))).slice(0, 6);
  }

  /* ---------- lead for the Keetown team ---------- */
  function lead(company, kind, note) {
    const L = A.read('keetown_leads', []);
    L.unshift({ id: 'b' + Date.now(), name: company.profile.name || '', phone: company.mobile, intent: kind, locality: '', budget: '', note: (company.profile.company || 'Company') + ' · ' + note, source: window.KTTrack ? KTTrack.source() : 'Website', channel: 'business_portal', stage: 'new', created: now() });
    A.write('keetown_leads', L);
  }

  return { SERVICES, PACKAGES, STAGES, SVC_STATUS, OFFICE_TYPES, OFFICE_STAGES, OFFICE_STEPS, OFFICE_CHECKS,
    LOCK_OPEN, loadLocks, lockedIds, nearOffice, split, relLock, relLockDecide, relLockConfirm, relLockRelease,
    relForCompany, relForEmployee, relGet, relSave, relCreate, relStage, relService, relComment, relCancel, relProgress, relFee,
    offForCompany, offGet, offSave, offCreate, offStage, offComment, offShort, offCheck, offAddOption, offMatches, lead, daysTo };
})();
