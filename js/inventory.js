/* Builder inventory: large uploads of units for rent or sale, done by the builder or one of their workers.
 *  - Template CSV (one row per unit). Excel / Google Sheets: "Save as CSV", or copy cells and paste.
 *  - Every row is validated; errors are listed by row number before anything is saved.
 *  - Re-uploading the same project + tower + unit number UPDATES that unit (no duplicates).
 *  - Workers: the builder adds team members by mobile; they log in with OTP and upload for the builder.
 *  - Units from verified builders go live on the website; others wait for Keetown review.
 * Storage: keetown_inventory (synced in batches of 150), keetown_teams. Public feed: GET /api/inventory. */
window.KTInv = (function () {
  const A = KTAuth, K = 'keetown_inventory', KT_ = 'keetown_teams';
  const COLS = [
    ['project', 'Project name', true, 'Skyline Residences'], ['tower', 'Tower / block', false, 'A'], ['unit_no', 'Unit number', true, '1204'],
    ['mode', 'sale or rent', true, 'sale'], ['type', 'Apartment / Villa / Plot / Commercial', true, 'Apartment'], ['bedrooms', 'Bedrooms (0 for plot/office)', false, '3'],
    ['area_sqft', 'Area in sq.ft', true, '1850'], ['floor', 'Floor', false, '12'], ['total_floors', 'Total floors', false, '32'], ['facing', 'Facing', false, 'East'],
    ['price', 'Sale: ₹ lakh · Rent: ₹ per month', true, '165'], ['locality', 'Locality', true, 'Kokapet'], ['status', 'Available / Booked / Hold', false, 'Available'],
    ['possession', 'Ready or month-year', false, 'Dec 2027'], ['furnishing', 'Unfurnished / Semi / Fully', false, 'Unfurnished'], ['parking', 'Car parks', false, '2'],
    ['rera', 'RERA no. (sale)', false, 'P02400000000'], ['notes', 'Notes', false, 'Corner unit, lake view']
  ];
  const STATUSES = ['Available', 'Booked', 'Hold', 'Sold'];
  const TYPES = ['Apartment', 'Villa', 'Independent house', 'Plot', 'Commercial'];
  const norm = s => String(s ?? '').trim();
  const key = s => norm(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const num = s => { const n = parseFloat(String(s ?? '').replace(/[₹,\s]/g, '')); return isFinite(n) ? n : NaN; };

  /* ---------- parsing: CSV (quoted fields) or tab-separated paste ---------- */
  function parse(text) {
    text = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    const delim = (text.split('\n')[0].match(/\t/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? '\t' : ',';
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"' && !cell) q = true;
      else if (c === delim) { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(x => norm(x)));
  }
  // map a header row to our columns (accepts friendly variations)
  const ALIAS = { unitno: 'unit_no', unit: 'unit_no', flat: 'unit_no', flatno: 'unit_no', block: 'tower', bhk: 'bedrooms', beds: 'bedrooms', area: 'area_sqft', sqft: 'area_sqft', areasqft: 'area_sqft', carpetarea: 'area_sqft', totalfloors: 'total_floors', saleorrent: 'mode', for: 'mode', location: 'locality', area_name: 'locality', parkings: 'parking', reranumber: 'rera', remarks: 'notes' };
  function headerMap(h) { return h.map(x => { const k = key(x); const hit = COLS.find(c => key(c[0]) === k); return hit ? hit[0] : ALIAS[k] || null; }); }

  function locId(name) { const k = key(name); const l = KT.localities.find(l => key(l.name) === k || key(l.id) === k || key(l.name).startsWith(k) || k.startsWith(key(l.name.split('/')[0]))); return l ? l.id : null; }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }
  const unitId = (builder, p, t, u) => 'bx' + hash(builder + '|' + key(p) + '|' + key(t) + '|' + key(u));

  /* validate → { units, errors:[{row, msg}], warnings } */
  function validate(rows, builder, builderName) {
    const errors = [], warnings = [], units = [], seen = new Set();
    if (!rows.length) return { units, errors: [{ row: 0, msg: 'The file is empty.' }], warnings };
    const map = headerMap(rows[0]); const missing = COLS.filter(c => c[2] && !map.includes(c[0])).map(c => c[0]);
    if (missing.length) return { units, errors: [{ row: 1, msg: 'Missing columns: ' + missing.join(', ') + '. Download the template to see the format.' }], warnings };
    rows.slice(1).forEach((r, i) => {
      const n = i + 2, g = {}; map.forEach((k, j) => { if (k) g[k] = norm(r[j]); });
      const bad = m => errors.push({ row: n, msg: m });
      if (!g.project) return bad('Project name is empty.');
      if (!g.unit_no) return bad('Unit number is empty.');
      const mode = key(g.mode).startsWith('r') ? 'rent' : key(g.mode).startsWith('s') || key(g.mode) === 'buy' ? 'sale' : null; if (!mode) return bad(`"sale or rent" should be sale or rent (got "${g.mode}").`);
      const type = TYPES.find(t => key(t) === key(g.type)) || (key(g.type).startsWith('apart') || key(g.type) === 'flat' ? 'Apartment' : key(g.type).startsWith('vill') ? 'Villa' : key(g.type).startsWith('plot') ? 'Plot' : key(g.type).startsWith('comm') || key(g.type) === 'office' ? 'Commercial' : null);
      if (!type) return bad(`Type "${g.type}" not recognised. Use ${TYPES.join(', ')}.`);
      const area = num(g.area_sqft); if (!(area > 50 && area < 1e6)) return bad('Area in sq.ft should be a number like 1450.');
      const price = num(g.price); if (!(price > 0)) return bad('Price should be a number.');
      if (mode === 'sale' && price > 50000) return bad('Sale price is in ₹ lakh (e.g. 165 for ₹1.65 Cr). This looks like rupees.');
      if (mode === 'rent' && price < 1000) return bad('Rent is in ₹ per month (e.g. 45000).');
      const loc = locId(g.locality); if (!loc) return bad(`Locality "${g.locality}" not recognised. Use one of: ${KT.localities.map(l => l.name).join(', ')}.`);
      const id = unitId(builder, g.project, g.tower, g.unit_no); if (seen.has(id)) return bad(`Duplicate of an earlier row (${g.project} ${g.tower} ${g.unit_no}).`); seen.add(id);
      const st = STATUSES.find(s => key(s) === key(g.status)) || 'Available'; if (g.status && !STATUSES.some(s => key(s) === key(g.status))) warnings.push({ row: n, msg: `Status "${g.status}" read as Available.` });
      const beds = g.bedrooms === '' || g.bedrooms == null ? (type === 'Plot' || type === 'Commercial' ? 0 : NaN) : num(g.bedrooms); if (!isFinite(beds)) return bad('Bedrooms should be a number (0 for plots and offices).');
      units.push({ id, builderMobile: builder, builderName, project: g.project, tower: g.tower || '', unitNo: g.unit_no, mode, type, beds, area, floor: g.floor || '', totalFloors: g.total_floors || '', facing: g.facing || '', price,
        loc, status: st, possession: g.possession || '', furnishing: g.furnishing || '', parking: g.parking || '', rera: g.rera || '', notes: (g.notes || '').slice(0, 300), updated: new Date().toISOString() });
    });
    return { units, errors, warnings };
  }

  /* ---------- storage ---------- */
  const all = () => A.read(K, []);
  const forBuilder = b => all().filter(u => u.builderMobile === b);
  async function loadMine() {
    if (A.MODE !== 'live') return all();
    try { const r = await fetch('/api/inventory/mine', { credentials: 'same-origin', cache: 'no-store' }); if (r.ok) { const l = await r.json(); try { localStorage.setItem(K, JSON.stringify(l)); } catch (e) {} return l; } } catch (e) {}
    return all();
  }
  // upsert (same unit id → update); returns {added, updated}
  function save(units, by) {
    const l = all(), idx = new Map(l.map((u, i) => [u.id, i])); let added = 0, updated = 0;
    units.forEach(u => { const x = { ...u, uploadedBy: by }; if (idx.has(u.id)) { l[idx.get(u.id)] = { ...l[idx.get(u.id)], ...x }; updated++; } else { l.push(x); added++; } });
    A.write(K, l); return { added, updated };
  }
  function setStatus(ids, status) { const s = new Set(ids), l = all(); l.forEach(u => { if (s.has(u.id)) { u.status = status; u.updated = new Date().toISOString(); } }); A.write(K, l); }
  function setPrice(id, price) { const l = all(), u = l.find(x => x.id === id); if (u) { u.price = price; u.updated = new Date().toISOString(); A.write(K, l); } }
  function remove(ids) { const s = new Set(ids); A.write(K, all().filter(u => !s.has(u.id))); }
  function projects(list) {
    const m = new Map(); list.forEach(u => { const p = m.get(u.project) || { name: u.project, loc: u.loc, units: 0, available: 0, booked: 0, live: 0, min: Infinity, max: 0, modes: new Set() };
      p.units++; if (u.status === 'Available') p.available++; if (u.status === 'Booked' || u.status === 'Sold') p.booked++; if (u.review === 'Live' || A.MODE === 'demo') p.live++; p.min = Math.min(p.min, u.price); p.max = Math.max(p.max, u.price); p.modes.add(u.mode); m.set(u.project, p); });
    return [...m.values()];
  }
  function templateCsv() {
    const head = COLS.map(c => c[0]).join(','), ex = COLS.map(c => /,/.test(c[3]) ? `"${c[3]}"` : c[3]).join(',');
    const ex2 = ['Skyline Residences', 'A', '1205', 'rent', 'Apartment', '2', '1250', '12', '32', 'North', '42000', 'Kokapet', 'Available', 'Ready', 'Semi', '1', '', ''].join(',');
    return head + '\n' + ex + '\n' + ex2 + '\n';
  }

  /* ---------- team (workers who upload for a builder) ---------- */
  const teams = () => A.read(KT_, []);
  const myWorkers = b => teams().filter(t => t.builder === b);
  const myBuilders = m => teams().filter(t => t.worker === m);
  function addWorker(builderUser, name, mobile) {
    const l = teams(), id = 'tm' + builderUser.mobile + '_' + mobile; if (l.some(t => t.id === id)) throw new Error('Already on your team.');
    l.push({ id, builder: builderUser.mobile, builderName: builderUser.profile.company || builderUser.profile.name || '', worker: mobile, workerName: name, role: 'Uploader', at: new Date().toISOString() }); A.write(KT_, l);
  }
  function removeWorker(id) { A.write(KT_, teams().filter(t => t.id !== id)); }

  /* ---------- public: live units appear in search and matches ---------- */
  function toProperty(u) {   // same shape as catalog listings so search, filters, maps and matching just work
    const l = KT.loc(u.loc) || {}, bh = u.beds ? u.beds + 'BHK ' : '', uc = u.mode === 'sale' && u.possession && !/ready/i.test(u.possession);
    const furn = /fully/i.test(u.furnishing) ? 'Fully furnished' : /semi/i.test(u.furnishing) ? 'Semi-furnished' : 'Unfurnished';
    const n = parseInt(u.id.slice(2, 8), 36) || 0;
    return { id: u.id, href: 'unit.html?id=' + u.id, title: `${bh}${u.type} in ${u.project}${u.tower ? ' (' + u.tower + ')' : ''}, ${l.name || ''}`.replace(/\s+/g, ' '),
      mode: u.mode, type: u.type, loc: u.loc, price: u.price, beds: +u.beds || 0, baths: Math.max(1, +u.beds || 1), area: +u.area, unit: 'sq.ft', facing: u.facing || '',
      status: u.mode === 'rent' ? 'Available now' : uc ? 'Under construction · ' + u.possession : 'Ready to move', construction: uc ? 'Under construction' : 'Ready to move',
      furnishing: furn, rera: !!u.rera, amen: [], hue: 200 + (n % 80), badge: 'Direct from builder', postedBy: 'Builder', postedOn: (u.updated || '').slice(0, 10), verified: true, prime: false,
      floor: parseInt(u.floor) || 0, totalFloors: parseInt(u.totalFloors) || 0, age: 0, parking: parseInt(u.parking) || 0, tenants: 'Anyone', pets: false, deposit: 2, availableFrom: new Date().toISOString().slice(0, 10),
      lat: (l.lat || 17.43) + ((n % 100) - 50) / 9000, lng: (l.lng || 78.38) + (((n >> 7) % 100) - 50) / 9000,
      builder: u.builderName, project: u.project, tower: u.tower, unitNo: u.unitNo, notes: u.notes, fromBuilder: true };
  }
  function mergePublic() {   // synchronous so search/matching see builder units on first render
    let list = [];
    if (A.MODE === 'live') { try { const x = new XMLHttpRequest(); x.open('GET', (KT.base || '/') + 'api/inventory', false); x.send(); if (x.status === 200) list = JSON.parse(x.responseText); } catch (e) {} }
    else list = all().filter(u => u.status === 'Available');
    const have = new Set(KT.properties.map(p => p.id));
    list.forEach(u => { if (!have.has(u.id)) KT.properties.push(toProperty(u)); });
    return list.length;
  }

  return { COLS, STATUSES, parse, validate, unitId, all, forBuilder, loadMine, save, setStatus, setPrice, remove, projects, templateCsv, teams, myWorkers, myBuilders, addWorker, removeWorker, toProperty, mergePublic };
})();
