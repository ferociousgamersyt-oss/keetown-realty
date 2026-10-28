/* Post-property funnel: 6 steps, live quality score, market benchmark, OTP sign-up at the end. */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const A = KTAuth, f = $('#postForm'), secs = $$('section[data-st]', f), steps = $$('#psteps li');
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const inr = n => Math.round(n).toLocaleString('en-IN');
  let st = 0, photos = 0;
  const val = n => (f.elements[n] && f.elements[n].value || '').trim();
  const mode = () => f.querySelector('[name=mode]:checked').value, type = () => f.querySelector('[name=type]:checked').value;

  function show(n) {
    st = n; secs.forEach(s => s.hidden = +s.dataset.st !== n); steps.forEach((li, i) => { li.classList.toggle('done', i < n); li.classList.toggle('cur', i === n); });
    $('#pBack').style.visibility = n ? 'visible' : 'hidden'; $('#pNext').hidden = n === 5; $('#pErr').textContent = '';
    if (n === 5) publishBox(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function check(n) {
    if (n === 1 && !val('loc')) return 'Select the locality.';
    if (n === 2 && !(+val('area') > 0)) return 'Enter the area.';
    if (n === 3 && mode() === 'rent' && !(+val('rent') > 0)) return 'Enter the monthly rent.';
    if (n === 3 && mode() === 'sale' && !(+val('price') > 0)) return 'Enter the expected price.';
    return '';
  }
  $('#pNext').onclick = () => { const e = check(st); if (e) return $('#pErr').textContent = e; show(st + 1); };
  $('#pBack').onclick = () => show(Math.max(0, st - 1));

  function sync() {
    $$('[data-for]', f).forEach(d => d.hidden = d.dataset.for !== mode());
    const plot = type() === 'Plot'; ['beds', 'baths', 'floor', 'totalFloors', 'furnishing', 'parking'].forEach(n => { const el = f.elements[n]; if (el) el.closest('label').style.display = plot ? 'none' : ''; });
    if (plot && f.elements.unit) f.elements.unit.value = 'sq.yd';
    const l = KT.loc(val('loc')), bm = $('#benchmark');
    if (!l) bm.textContent = 'Pick a locality to see a market benchmark.';
    else if (mode() === 'rent') { const m = { 0: 1, 1: .62, 2: 1, 3: 1.45, 4: 2.1, 5: 2.6 }[+val('beds')] || 1; bm.innerHTML = `Benchmark: similar ${val('beds') || 2}BHK homes in <b>${esc(l.name)}</b> rent for about <b>₹${inr(l.rent2[0] * m * 1000)}–₹${inr(l.rent2[1] * m * 1000)}</b> a month.`; }
    else { const a = +val('area') * (val('unit') === 'sq.yd' ? 9 : 1); bm.innerHTML = a ? `Benchmark: at ₹${inr(l.sale[0])}–₹${inr(l.sale[1])}/sq.ft, ${inr(+val('area'))} ${esc(val('unit'))} in <b>${esc(l.name)}</b> is roughly <b>${KT.fmt.lakh(Math.round(a * l.sale[0] / 1e5))} – ${KT.fmt.lakh(Math.round(a * l.sale[1] / 1e5))}</b>.` : `Enter the area to see a price benchmark for ${esc(l.name)}.`; }
    score();
  }
  function score() {
    const items = [[!!val('loc'), 15, 'Add the locality'], [!!val('society'), 5, 'Add the society / project name'], [+val('area') > 0, 10, 'Add the area'],
      [type() === 'Plot' || !!val('floor'), 5, 'Add the floor'], [$$('[name=amen]:checked', f).length >= 3, 10, 'Tick at least 3 amenities'],
      [mode() === 'rent' ? +val('rent') > 0 : +val('price') > 0, 15, 'Add the price'], [mode() !== 'rent' || !!val('availableFrom'), 5, 'Add the available-from date'],
      [photos >= 1, 15, 'Add at least one photo'], [photos >= 5, 10, 'Add 5+ photos'], [!!val('landmark'), 5, 'Add a landmark'], [true, 5, '']];
    const s = items.reduce((t, [ok, w]) => t + (ok ? w : 0), 0); $('#scoreN').textContent = s + '%';
    const C = 2 * Math.PI * 52; $('#ringFg').style.strokeDasharray = `${C * s / 100} ${C}`;
    $('#tips').innerHTML = items.filter(([ok, , t]) => !ok && t).slice(0, 4).map(([, w, t]) => `<li>${t} <b>+${w}%</b></li>`).join('') || '<li>Great listing!</li>';
    return s;
  }
  f.addEventListener('input', sync); f.addEventListener('change', sync);
  f.elements.photos.addEventListener('change', e => { const fs = [...e.target.files].slice(0, 12); photos = fs.length; $('#thumbs').innerHTML = fs.map(x => `<img src="${URL.createObjectURL(x)}" alt="">`).join(''); score(); });

  function summary() {
    const l = KT.loc(val('loc')), beds = +val('beds');
    return `<dl class="sumry"><div><dt>Listing</dt><dd>${beds ? beds + ' BHK ' : ''}${esc(type())} to ${mode() === 'rent' ? 'rent' : 'sell'}</dd></div><div><dt>Locality</dt><dd>${esc(l ? l.name : '—')}${val('society') ? ' · ' + esc(val('society')) : ''}</dd></div><div><dt>Area</dt><dd>${esc(val('area'))} ${esc(val('unit'))}</dd></div><div><dt>${mode() === 'rent' ? 'Rent' : 'Price'}</dt><dd>${mode() === 'rent' ? '₹' + inr(+val('rent')) + '/mo' : KT.fmt.lakh(+val('price'))}</dd></div><div><dt>Photos</dt><dd>${photos}</dd></div><div><dt>Quality</dt><dd>${score()}%</dd></div></dl>`;
  }
  function publishBox() {
    const u = A.user(), box = $('#publishBox');
    if (u) { box.innerHTML = `${summary()}<p class="sub">Publishing as <b>${esc(u.profile.name || '+91 ' + u.mobile)}</b>.</p><button type="button" class="btn btn-gold" id="doPub">Publish listing</button>`; $('#doPub').onclick = () => publish(u); return; }
    box.innerHTML = `${summary()}<div class="otp-box"><p class="sub">Verify your mobile to publish. No password needed.</p>
      <div class="two"><label class="fl">Your name<input id="pName" autocomplete="name"></label><label class="fl">Mobile<div class="phone-in"><span>+91</span><input id="pMob" inputmode="numeric" maxlength="10" autocomplete="tel-national"></div></label></div>
      <label class="chk"><input type="checkbox" id="pWa"><span>Send me enquiries and updates on WhatsApp (optional)</span></label>
      <div id="pOtpRow" hidden><label class="fl">OTP${A.MODE === 'demo' ? ' (demo: 123456)' : ''}<input id="pOtp" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label></div>
      <button type="button" class="btn btn-gold" id="pSend">Send OTP</button></div>`;
    $('#pMob').oninput = e => e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
    let sent = false;
    $('#pSend').onclick = async () => {
      const name = $('#pName').value.trim(), mob = $('#pMob').value, err = $('#pErr'); err.textContent = '';
      if (!name) return err.textContent = 'Enter your name.'; if (!A.validMobile(mob)) return err.textContent = 'Enter a valid 10-digit mobile number.';
      if (!sent) { await A.sendOtp(mob); sent = true; $('#pOtpRow').hidden = false; $('#pSend').textContent = 'Verify & publish'; $('#pOtp').focus(); return; }
      try {
        await A.verifyOtp(mob, $('#pOtp').value.trim());
        let u = A.users()[mob]; const role = f.querySelector('[name=by]:checked').value === 'Builder' ? 'builder' : mode() === 'rent' ? 'owner' : 'seller';
        if (!u && role === 'builder') { A.logout(); return err.innerHTML = 'Builder and developer listings come through a partnership with Keetown. <a href="business.html#enquire" style="text-decoration:underline">Talk to us</a> and we’ll set up your partner login for bulk uploads.'; }
        if (!u) { u = { mobile: mob, role, created: new Date().toISOString(), quick: true, profile: { name, locality: val('loc'), areas: [val('loc')] }, consent: { whatsapp: $('#pWa').checked, email: false, terms: true, at: new Date().toISOString() }, verified: { status: false } }; A.saveUser(u); window.KTTrack && KTTrack.event('signup_completed', { role, via: 'post_property' }); }
        A.startSession(mob); publish(A.user());
      } catch (e) { err.textContent = e.message; }
    };
  }
  function publish(u) {
    const fd = new FormData(f), d = Object.fromEntries(fd); d.amen = fd.getAll('amen'); delete d.photos;
    const l = KT.loc(d.loc), beds = +d.beds, t = type();
    const title = `${beds && t !== 'Plot' && t !== 'Commercial' ? beds + 'BHK ' : ''}${t}${d.society ? ' in ' + d.society : ''}, ${l.name}`;
    const sub = { id: 's' + Date.now(), mobile: u.mobile, role: u.role, mode: mode(), title, loc: d.loc, type: t, area: +d.area, price: mode() === 'rent' ? +d.rent : +d.price, photos, quality: score(), details: d, status: 'Under verification', at: new Date().toISOString() };
    const all = A.read('keetown_submissions', []); all.unshift(sub); A.write('keetown_submissions', all);
    window.KTLead && KTLead.addLead({ name: u.profile.name || '', phone: u.mobile, intent: mode() === 'rent' ? 'lease' : 'sell', locality: d.loc, budget: mode() === 'rent' ? '₹' + inr(sub.price) + '/mo' : KT.fmt.lakh(sub.price), note: 'Posted: ' + title + ' · quality ' + sub.quality + '%', channel: 'post_property' });
    window.KTTrack && KTTrack.event('property_posted', { mode: mode(), loc: d.loc, quality: sub.quality });
    const verified = u.verified && u.verified.status;
    $('#publishBox').innerHTML = `<div class="ok-box"><h3>Submitted for verification</h3><p>${esc(title)} is in our review queue. We check ownership documents and approvals before it goes live — usually within one working day.</p>
      ${verified ? '' : '<p><b>Next:</b> verify your identity with DigiLocker so we can publish it.</p>'}<p class="acts-row"><a class="btn btn-gold" href="portal.html#mine">Go to my portal</a><a class="btn btn-line" href="post-property.html">Post another</a></p></div>`;
    $('#pBack').style.visibility = 'hidden';
  }
  const q = new URLSearchParams(location.search); if (q.get('mode') === 'sale') f.querySelector('[name=mode][value=sale]').checked = true;
  sync(); show(0);
})();
