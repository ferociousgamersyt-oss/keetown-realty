/* Full requirement / property forms per client type. Shared by signup (login.html) and the
 * portal ("Edit requirement"). Budgets are stored as numbers: sale in ₹ lakh, rent in ₹/month. */
window.KTForms = (function () {
  const { localities } = KT;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const v = (p, k, d = '') => p && p[k] != null ? p[k] : d;
  const sel = (name, label, opts, cur, req) => `<label class="fl">${label}${req ? ' *' : ''}<select name="${name}">${opts.map(o => { const [val, txt] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(cur) === String(val) ? 'selected' : ''}>${esc(txt)}</option>`; }).join('')}</select></label>`;
  const inp = (name, label, cur, attrs = '') => `<label class="fl">${label}<input name="${name}" value="${esc(cur)}" ${attrs}></label>`;
  const locSel = (name, label, cur, req, any = 'Select locality') => sel(name, label, [['', any], ...localities.map(l => [l.id, l.name])], cur, req);
  const pills = (name, label, cur = [], req) => `<fieldset><legend>${label}${req ? ' *' : ''}</legend><div class="pills">${localities.map(l => `<label><input type="checkbox" name="${name}" value="${l.id}" ${cur.includes(l.id) ? 'checked' : ''}><span>${esc(l.name)}</span></label>`).join('')}</div></fieldset>`;
  const checks = (name, label, opts, cur = []) => `<fieldset><legend>${label}</legend><div class="pills">${opts.map(o => `<label><input type="checkbox" name="${name}" value="${esc(o)}" ${cur.includes(o) ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div></fieldset>`;
  const two = (...x) => `<div class="two">${x.join('')}</div>`;
  const RENT = [['', 'Any'], [10000, '₹10,000'], [15000, '₹15,000'], [20000, '₹20,000'], [25000, '₹25,000'], [30000, '₹30,000'], [40000, '₹40,000'], [50000, '₹50,000'], [70000, '₹70,000'], [100000, '₹1,00,000'], [200000, '₹2,00,000']];
  const LAKH = [['', 'Any'], [30, '₹30 L'], [50, '₹50 L'], [75, '₹75 L'], [100, '₹1 Cr'], [150, '₹1.5 Cr'], [200, '₹2 Cr'], [300, '₹3 Cr'], [500, '₹5 Cr'], [1000, '₹10 Cr']];
  const BEDS = [['', 'Any'], [1, '1 BHK+'], [2, '2 BHK+'], [3, '3 BHK+'], [4, '4 BHK+']];
  const SOURCES = ['', 'Google search', 'Instagram', 'Facebook', 'YouTube', 'WhatsApp', 'Friend / referral', 'Property portal', 'Hoarding / print', 'Walk-in', 'Other'];
  const today = () => new Date().toISOString().slice(0, 10);

  const FORMS = {
    tenant: { title: 'Your rental requirement', sub: 'The more you tell us, the better your prime matches.', body: p => `
      ${pills('areas', 'Preferred areas', v(p, 'areas', []), 1)}
      ${two(sel('budgetMin', 'Min rent / month', RENT, v(p, 'budgetMin')), sel('budgetMax', 'Max rent / month', RENT, v(p, 'budgetMax')))}
      ${two(sel('bedsMin', 'Bedrooms', BEDS, v(p, 'bedsMin')), sel('furnishing', 'Furnishing', ['Any', 'Unfurnished', 'Semi-furnished', 'Fully furnished'], v(p, 'furnishing', 'Any')))}
      ${checks('types', 'Property type', ['Apartment', 'Villa', 'Independent house', 'Commercial'], v(p, 'types', ['Apartment']))}
      ${two(sel('who', 'Who will stay', ['Family', 'Bachelors', 'Company lease'], v(p, 'who', 'Family')), inp('occupants', 'Number of occupants', v(p, 'occupants', ''), 'inputmode="numeric" placeholder="e.g. 3"'))}
      ${two(sel('pets', 'Pets', [['no', 'No pets'], ['yes', 'Yes, I have pets']], v(p, 'pets', 'no')), sel('parking', 'Parking needed', [['0', 'None'], ['1', '1 slot'], ['2', '2 slots']], v(p, 'parking', '1')))}
      ${two(`<label class="fl">Move-in by<input type="date" name="movein" min="${today()}" value="${esc(v(p, 'movein'))}"></label>`, locSel('office', 'Office / college locality (for commute)', v(p, 'office'), 0, 'Not needed'))}` },
    buyer: { title: 'What are you looking to buy?', sub: 'Pick areas and budget so we can shortlist precisely.', body: p => `
      ${pills('areas', 'Preferred areas', v(p, 'areas', []), 1)}
      ${two(sel('budgetMin', 'Min budget', LAKH, v(p, 'budgetMin')), sel('budgetMax', 'Max budget', LAKH, v(p, 'budgetMax')))}
      ${checks('types', 'Property type', ['Apartment', 'Villa', 'Independent house', 'Plot', 'Commercial'], v(p, 'types', ['Apartment']))}
      ${two(sel('bedsMin', 'Bedrooms', BEDS, v(p, 'bedsMin')), sel('possession', 'Possession', ['Any', 'Ready', 'Under construction'], v(p, 'possession', 'Any')))}
      ${two(sel('purpose', 'Purpose', ['Self-use', 'Investment', 'Both'], v(p, 'purpose', 'Self-use')), sel('loan', 'Home loan', ['Yes', 'No', 'Not sure'], v(p, 'loan', 'Yes')))}
      ${two(sel('timeline', 'When do you want to buy?', ['Within 3 months', '3–6 months', '6–12 months', 'Just exploring'], v(p, 'timeline', 'Within 3 months')), locSel('office', 'Office locality (for commute)', v(p, 'office'), 0, 'Not needed'))}` },
    owner: { title: 'Your rental property', sub: 'We benchmark the rent and match verified tenants.', body: p => `
      ${two(locSel('locality', 'Locality', v(p, 'locality'), 1), inp('society', 'Society / building name', v(p, 'society'), 'placeholder="e.g. Green Meadows"'))}
      ${two(sel('ptype', 'Property type', ['Apartment', 'Villa', 'Independent house', 'Commercial'], v(p, 'ptype', 'Apartment')), sel('beds', 'Bedrooms', [['1', '1 BHK'], ['2', '2 BHK'], ['3', '3 BHK'], ['4', '4 BHK'], ['5', '5+ BHK'], ['0', 'Office / other']], v(p, 'beds', '2')))}
      ${two(inp('area', 'Built-up area (sq.ft)', v(p, 'area'), 'inputmode="numeric" placeholder="e.g. 1250"'), inp('floor', 'Floor / total floors', v(p, 'floor'), 'placeholder="e.g. 7 / 14"'))}
      ${two(inp('rent', 'Expected rent (₹ / month)', v(p, 'rent'), 'inputmode="numeric" placeholder="e.g. 35000"'), sel('deposit', 'Deposit', [['2', '2 months'], ['3', '3 months'], ['6', '6 months']], v(p, 'deposit', '2')))}
      ${two(sel('furn', 'Furnishing', ['Unfurnished', 'Semi-furnished', 'Fully furnished'], v(p, 'furn', 'Semi-furnished')), `<label class="fl">Available from<input type="date" name="available" value="${esc(v(p, 'available', today()))}"></label>`)}
      ${two(sel('tenantPref', 'Preferred tenants', ['Anyone', 'Family', 'Bachelors', 'Company'], v(p, 'tenantPref', 'Anyone')), sel('petsOk', 'Pets allowed', [['no', 'No'], ['yes', 'Yes']], v(p, 'petsOk', 'no')))}
      ${inp('upi', 'UPI ID for rent collection (optional)', v(p, 'upi'), 'placeholder="name@bank"')}
      <label class="chk"><input type="checkbox" name="manage" value="1" ${v(p, 'manage') ? 'checked' : ''}><span>I'm interested in Keetown property management</span></label>` },
    seller: { title: 'Property you are selling', sub: 'Share the basics for a market-based price opinion.', body: p => `
      ${two(locSel('locality', 'Locality', v(p, 'locality'), 1), inp('society', 'Society / project name', v(p, 'society')))}
      ${two(sel('ptype', 'Property type', ['Apartment', 'Villa', 'Independent house', 'Plot', 'Commercial'], v(p, 'ptype', 'Apartment')), sel('beds', 'Bedrooms', [['0', 'N/A'], ['1', '1 BHK'], ['2', '2 BHK'], ['3', '3 BHK'], ['4', '4 BHK'], ['5', '5+ BHK']], v(p, 'beds', '2')))}
      ${two(inp('size', 'Size', v(p, 'size'), 'inputmode="numeric" placeholder="e.g. 1450"'), sel('unit', 'Unit', ['sq.ft', 'sq.yd'], v(p, 'unit', 'sq.ft')))}
      ${two(inp('price', 'Expected price (₹ lakh)', v(p, 'price'), 'inputmode="numeric" placeholder="e.g. 120"'), sel('status', 'Status', ['Ready to move', 'Under construction', 'Open plot'], v(p, 'status', 'Ready to move')))}
      ${two(sel('age', 'Property age', ['New', '1–5 years', '5–10 years', '10+ years'], v(p, 'age', '1–5 years')), sel('timeline', 'Selling timeline', ['Immediately', 'Within 3 months', '3–6 months', 'Just exploring'], v(p, 'timeline', 'Within 3 months')))}` },
    builder: { title: 'Builder / developer details', sub: 'Our team verifies RERA and GST before your projects go live.', body: p => `
      ${two(inp('company', 'Company name *', v(p, 'company')), inp('rera', 'RERA registration no.', v(p, 'rera')))}
      ${two(inp('gst', 'GST no. (optional)', v(p, 'gst')), inp('website', 'Website (optional)', v(p, 'website'), 'placeholder="https://"'))}
      ${pills('areas', 'Project localities', v(p, 'areas', []), 1)}
      ${two(sel('pt', 'Project type', ['Apartments', 'Villas / gated communities', 'Plotted layouts', 'Commercial'], v(p, 'pt', 'Apartments')), inp('units', 'Units on sale', v(p, 'units'), 'inputmode="numeric"'))}` },
    company: { title: 'Your company', sub: 'Keetown for Business: employee relocation and office space in Hyderabad.', body: p => `
      ${two(inp('company', 'Company name *', v(p, 'company')), inp('designation', 'Your designation', v(p, 'designation'), 'placeholder="e.g. HR Business Partner"'))}
      ${two(sel('industry', 'Industry', ['Technology / GCC', 'Startup', 'Consulting', 'BFSI', 'Pharma / life sciences', 'Manufacturing', 'Other'], v(p, 'industry', 'Technology / GCC')), sel('size', 'Company size (India)', ['1–50', '51–200', '201–1,000', '1,000–5,000', '5,000+'], v(p, 'size', '51–200')))}
      ${two(locSel('office', 'Hyderabad office locality', v(p, 'office'), 0, 'No office yet'), sel('moves', 'Employee moves per year', ['Under 10', '10–50', '50–200', '200+'], v(p, 'moves', 'Under 10')))}
      ${checks('interest', 'What do you need?', ['Employee relocation', 'Office space', 'Company-leased housing', 'Property management for leased homes'], v(p, 'interest', ['Employee relocation']))}
      ${inp('gst', 'GST no. for invoices (optional)', v(p, 'gst'))}` }
  };

  function render(role, p = {}, { contact = true } = {}) {
    const f = FORMS[role];
    return `<label class="fl">Full name *<input name="name" autocomplete="name" value="${esc(v(p, 'name'))}" required></label>
      ${contact ? two(`<label class="fl">Email (optional)<input type="email" name="email" autocomplete="email" value="${esc(v(p, 'email'))}"></label>`, sel('heard', 'How did you hear about us?', SOURCES.map(s => [s, s || 'Select']), v(p, 'heard'))) : ''}
      ${f.body(p)}`;
  }
  function read(form, role) {
    const fd = new FormData(form), p = {};
    for (const [k, val] of fd.entries()) { if (['areas', 'types', 'interest'].includes(k)) (p[k] = p[k] || []).push(val); else p[k] = val; }
    p.areas = p.areas || []; p.types = p.types || []; p.manage = !!p.manage;
    ['budgetMin', 'budgetMax'].forEach(k => p[k] = p[k] === '' || p[k] == null ? null : +p[k]);
    let err = '';
    if (!p.name || !p.name.trim()) err = 'Please enter your name.';
    else if (['tenant', 'buyer', 'builder'].includes(role) && !p.areas.length) err = 'Choose at least one area.';
    else if (['owner', 'seller'].includes(role) && !p.locality) err = 'Select the property locality.';
    else if (['builder', 'company'].includes(role) && !p.company) err = 'Enter your company name.';
    else if (p.budgetMin != null && p.budgetMax != null && p.budgetMin > p.budgetMax) err = 'Minimum budget is higher than maximum.';
    else if (p.email && !/^\S+@\S+\.\S+$/.test(p.email)) err = 'Enter a valid email address.';
    else if (p.upi && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(p.upi)) err = 'UPI ID looks incorrect (e.g. name@bank).';
    return { profile: p, error: err };
  }
  return { FORMS, render, read };
})();
