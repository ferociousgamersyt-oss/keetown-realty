/* Requirement → property matching. Pure functions; used by the portal (Prime matches),
 * the search page ("Recommended for you" sort) and the team CRM.
 *
 * score(property, requirement) → { ok, score 0–100, reasons[], misses[] }
 * Hard rules (ok=false): wrong intent, wrong property type, >10% over budget, fewer bedrooms
 * than required, tenant-type or pet restrictions. Everything else is weighted. */
window.KTMatch = (function () {
  const { properties, loc } = KT;
  const rad = x => x * Math.PI / 180;
  const km = (a, b) => { const R = 6371, dLa = rad(b.lat - a.lat), dLo = rad(b.lng - a.lng); return 2 * R * Math.asin(Math.sqrt(Math.sin(dLa / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLo / 2) ** 2)); };
  const RES = ['Apartment', 'Villa', 'Independent house'];
  const num = v => v === '' || v == null ? null : +v;
  const rupees = p => p.mode === 'sale' ? p.price * 1e5 : p.price;
  // old profiles stored labels like "₹15–25k" or "₹1 – 2 Cr": convert to ₹ amounts
  const legacyBudget = (label, sale) => {
    const toks = [...String(label || '').replace(/,/g, '').matchAll(/([\d.]+)\s*(cr|l|k)?/gi)].map(m => [+m[1], (m[2] || '').toLowerCase()]);
    if (!toks.length) return [null, null];
    const lastUnit = toks[toks.length - 1][1] || (sale ? 'l' : 'k'), mult = u => ({ cr: 1e7, l: 1e5, k: 1e3 }[u || lastUnit]);
    const vals = toks.map(([n, u]) => n * mult(u));
    return /under/i.test(label) ? [null, vals[0]] : [vals[0], vals[1] ?? null];
  };

  /* Normalise a portal profile into a requirement. */
  function requirement(user) {
    const p = user.profile || {}, role = user.role;
    const mode = role === 'tenant' ? 'rent' : role === 'buyer' ? 'sale' : (role === 'owner' ? 'rent' : 'sale');
    let min = num(p.budgetMin), max = num(p.budgetMax);
    if (min == null && max == null && p.budget) [min, max] = legacyBudget(p.budget, mode === 'sale');
    if (mode === 'sale') { if (min != null && min < 1e4) min *= 1e5; if (max != null && max < 1e4) max *= 1e5; }   // stored in lakh
    const beds = num(p.bedsMin) ?? (parseInt(p.bhk) || null);
    let types = [].concat(p.types || []).filter(Boolean); if (!types.length) types = /Villa/i.test(p.bhk || '') ? ['Villa'] : /Plot/i.test(p.bhk || '') ? ['Plot'] : /Office|Commercial/i.test(p.bhk || '') ? ['Commercial'] : RES;
    return { mode, min, max, beds: types.some(t => RES.includes(t)) ? beds : null, types, areas: [].concat(p.areas || (p.locality ? [p.locality] : [])), office: p.office || '',
      furnishing: p.furnishing || 'Any', who: p.who || '', pets: p.pets === 'yes', moveIn: p.movein || '', possession: p.possession || 'Any', parking: num(p.parking) || 0 };
  }

  function score(prop, w) {
    const R = [], M = []; let s = 0;
    if (prop.mode !== w.mode) return { ok: false, score: 0, reasons: R, misses: ['Different intent'] };
    if (w.types.length && !w.types.includes(prop.type)) return { ok: false, score: 0, reasons: R, misses: ['Different property type'] };
    // budget (25)
    const P = rupees(prop);
    if (w.max != null && P > w.max * 1.1) return { ok: false, score: 0, reasons: R, misses: ['Over budget'] };
    if (w.max != null && P > w.max) { s += 12; M.push('Slightly above budget'); }
    else if (w.min != null && P < w.min * .75) { s += 14; M.push('Below your usual range'); }
    else { s += 25; if (w.max != null) R.push('Within budget'); }
    // location (35)
    const L = loc(prop.loc);
    if (!w.areas.length) s += 18;
    else if (w.areas.includes(prop.loc)) { s += 35; R.push('In ' + L.name); }
    else { const near = Math.min(...w.areas.map(a => loc(a) ? km(L, loc(a)) : 99)); if (near <= 4) { s += 25; R.push(near.toFixed(0) + ' km from your area'); } else if (near <= 8) { s += 12; M.push(near.toFixed(0) + ' km from preferred areas'); } else M.push('Outside preferred areas'); }
    if (w.office && loc(w.office)) { const d = km(L, loc(w.office)); if (d <= 6) { s += 5; R.push(d < 1.5 ? 'Near your office' : 'Short commute (' + d.toFixed(0) + ' km)'); } }
    // configuration (15)
    if (w.beds) { if (prop.beds < w.beds) return { ok: false, score: 0, reasons: R, misses: ['Fewer bedrooms'] }; s += prop.beds === w.beds ? 15 : 11; R.push(prop.beds + ' BHK'); } else s += 10;
    if (w.parking && (prop.parking || 0) < w.parking) M.push('Less parking than needed'); else if (w.parking) s += 2;
    // furnishing (5)
    if (w.furnishing !== 'Any' && prop.furnishing) { if (prop.furnishing === w.furnishing) { s += 5; R.push(prop.furnishing); } else M.push(prop.furnishing); } else s += 3;
    // rental rules (10)
    if (prop.mode === 'rent') {
      if (prop.tenants === 'Family' && w.who === 'Bachelors') return { ok: false, score: 0, reasons: R, misses: ['Family only'] };
      if (prop.tenants === 'Company' && w.who !== 'Company lease') return { ok: false, score: 0, reasons: R, misses: ['Company lease only'] };
      if (w.pets && prop.pets === false) return { ok: false, score: 0, reasons: R, misses: ['Pets not allowed'] };
      const who = w.who === 'Company lease' ? 'Company' : w.who;
      if (prop.tenants === 'Bachelors' && who === 'Family') M.push('Prefers bachelors'); else { s += 5; if (prop.tenants === who) R.push(who + ' preferred'); }
      if (w.pets && prop.pets) R.push('Pet-friendly');
      if (w.moveIn && prop.availableFrom) { const late = (new Date(prop.availableFrom) - new Date(w.moveIn)) / 864e5; if (late <= 10) { s += 5; R.push('Available by your move-in'); } else M.push('Available ' + new Date(prop.availableFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })); } else s += 3;
    } else {
      const uc = prop.construction === 'Under construction';
      if (w.possession === 'Ready' && uc) M.push('Under construction'); else if (w.possession === 'Under construction' && !uc) M.push('Ready, not under construction'); else s += 8;
      if (w.possession !== 'Any' && ((w.possession === 'Ready') === !uc)) R.push(uc ? 'Under construction' : 'Ready to move');
      s += 2;
    }
    // quality (10)
    if (prop.verified) { s += 4; R.push('Verified listing'); } if (prop.prime) s += 4; if (prop.rera) s += 2;
    return { ok: true, score: Math.max(1, Math.min(100, Math.round(s / 103 * 100))), reasons: R, misses: M };
  }

  /* Ranked matches for a user. prime: verified + prime listings with score >= 60. */
  function forUser(user, { primeOnly = false, limit = 50 } = {}) {
    const w = requirement(user);
    return properties.map(p => ({ p, ...score(p, w) })).filter(x => x.ok && (!primeOnly || (x.p.prime && x.p.verified && x.score >= 60))).sort((a, b) => b.score - a.score).slice(0, limit);
  }
  return { requirement, score, forUser, km };
})();
