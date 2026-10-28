(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = x => String(x ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const A = KTAuth, { localities } = KT;
  let step = 0, role = null, mobile = '', timerId;
  const ICONS = {
    tenant: '<path d="M3 11l9-7 9 7v9H3z"/><path d="M10 20v-5h4v5"/>',
    owner: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h3M13 8h3M8 12h3M13 12h3M10 21v-4h4v4"/>',
    seller: '<path d="M4 4h8l8 8-8 8-8-8z"/><circle cx="8.5" cy="8.5" r="1.3"/>',
    buyer: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    builder: '<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/>',
    company: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>'
  };
  if (A.MODE === 'demo') $('#demoNote').textContent = 'Demo mode: no SMS is sent — use OTP ' + A.DEMO_OTP + '. DigiLocker verification is simulated.';
  // one-click demo logins, one per portal
  if (A.DEMO_LIST) {
    const box = $('#demoAccounts'), LBL = { tenant: 'Rental tenant', owner: 'Rental owner', buyer: 'Buyer', seller: 'Seller', builder: 'Builder', company: 'Company / HR' };
    box.hidden = false;
    box.innerHTML = `<p class="da-h">Try a demo account</p><p class="da-s">Each opens a portal with sample data. OTP for all: <b>${A.DEMO_OTP}</b></p>
      <ul>${A.DEMO_LIST.map(d => `<li><button type="button" class="da-btn" data-demo="${d.mobile}"><span><b>${LBL[d.role]}</b><small>${d.name} · +91 ${d.mobile.replace(/(\d{5})(\d{5})/, '$1 $2')}</small></span><i aria-hidden="true">→</i></button></li>`).join('')}</ul>
      <button type="button" class="da-reset" id="demoReset">Reset demo accounts</button>`;
    $$('[data-demo]', box).forEach(b => b.onclick = async () => {
      b.disabled = true; b.querySelector('i').textContent = '…';
      await A.verifyOtp(b.dataset.demo, A.DEMO_OTP); A.startSession(b.dataset.demo);
      window.KTTrack && KTTrack.event('demo_login', { role: A.users()[b.dataset.demo].role });
      location.href = 'portal.html';
    });
    $('#demoReset').onclick = () => { if (!confirm('Reset all demo accounts to their starting data?')) return; Promise.resolve(A.resetDemo()).then(() => $('#demoReset').textContent = 'Demo accounts reset ✓'); };
  }

  /* ---------- step control ---------- */
  function show(n) {
    step = n;
    $$('.step').forEach(s => s.hidden = +s.dataset.step !== n);
    $$('#stepper li').forEach((li, i) => { li.classList.toggle('done', i < n); li.classList.toggle('cur', i === n); });
    const first = $('.step[data-step="' + n + '"] input:not([type=checkbox]),.step[data-step="' + n + '"] select'); if (first && n !== 3) setTimeout(() => first.focus(), 50);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  $$('[data-back]').forEach(b => b.onclick = () => show(Math.max(0, step - 1)));

  /* ---------- 1 role ---------- */
  $('#roles').innerHTML = Object.entries(A.ROLES).map(([k, r]) => `<button class="role" data-r="${k}"><span class="ic"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg></span><span><b>${r.label}</b><span>${r.blurb}</span></span><em class="${r.dl === 'required' ? '' : 'opt'}">${r.dl === 'required' ? 'DigiLocker verified' : 'Verification optional'}</em></button>`).join('');
  $$('.role').forEach(b => b.onclick = () => { role = b.dataset.r; $('#roleName').textContent = A.ROLES[role].label; show(1); });
  const qr = new URLSearchParams(location.search).get('role'); if (qr && A.ROLES[qr]) { role = qr; $('#roleName').textContent = A.ROLES[role].label; show(1); }

  /* ---------- 2 mobile ---------- */
  const mob = $('#mobile');
  mob.oninput = () => { mob.value = mob.value.replace(/\D/g, '').slice(0, 10); $('#mErr').textContent = ''; };
  mob.onkeydown = e => { if (e.key === 'Enter') $('#sendOtp').click(); };
  $('#sendOtp').onclick = async () => {
    mobile = mob.value;
    if (!A.validMobile(mobile)) return $('#mErr').textContent = 'Enter a valid 10-digit Indian mobile number.';
    const b = $('#sendOtp'); b.disabled = true; b.textContent = 'Sending…';
    try { await A.sendOtp(mobile); $('#otpTo').textContent = mobile.replace(/^(\d{2})\d{6}(\d{2})$/, '$1••••••$2'); show(2); startTimer(); $$('#otp input').forEach(i => i.value = ''); $$('#otp input')[0].focus(); }
    catch (e) { $('#mErr').textContent = e.message; }
    b.disabled = false; b.textContent = 'Send OTP';
  };

  /* ---------- 3 otp ---------- */
  const boxes = $$('#otp input');
  boxes.forEach((b, i) => {
    b.oninput = () => { b.value = b.value.replace(/\D/g, ''); $('#oErr').textContent = ''; if (b.value && i < 5) boxes[i + 1].focus(); if (boxes.every(x => x.value)) $('#verifyOtp').click(); };
    b.onkeydown = e => { if (e.key === 'Backspace' && !b.value && i > 0) boxes[i - 1].focus(); };
    b.onpaste = e => { const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (!t) return; e.preventDefault(); [...t].forEach((c, j) => boxes[j].value = c); boxes[Math.min(t.length, 5)].focus(); if (t.length === 6) $('#verifyOtp').click(); };
  });
  function startTimer() {
    let s = 30; const r = $('#resend'), t = $('#timer'); r.disabled = true; clearInterval(timerId);
    const tick = () => { t.textContent = s > 0 ? 'in ' + s + 's' : ''; if (s-- <= 0) { clearInterval(timerId); r.disabled = false; } };
    tick(); timerId = setInterval(tick, 1000);
  }
  $('#resend').onclick = async () => { await A.sendOtp(mobile); startTimer(); $('#oErr').textContent = ''; };
  $('#chgNum').onclick = () => show(1);
  let verifying = false;
  $('#verifyOtp').onclick = async () => {
    if (verifying) return; const code = boxes.map(b => b.value).join('');
    if (code.length < 6) return $('#oErr').textContent = 'Enter all 6 digits.';
    verifying = true;
    try {
      await A.verifyOtp(mobile, code); A.startSession(mobile);
      const existing = A.users()[mobile];
      if (existing && !existing.quick) { location.href = 'portal.html'; return; }       // returning user → straight to portal
      const rel = !existing && window.KTCorp ? KTCorp.relForEmployee(mobile)[0] : null;
      if (rel) {   // employee of a client company: account comes pre-filled from HR's request
        role = rel.intent === 'buy' ? 'buyer' : 'tenant';
        A.saveUser({ mobile, role, created: new Date().toISOString(), sponsor: { company: rel.companyName, relocation: rel.id },
          profile: { name: rel.employeeName, email: rel.employeeEmail || '', areas: rel.areas.length ? rel.areas : [rel.office].filter(Boolean), budgetMax: rel.budget || null, bedsMin: rel.beds || '', types: ['Apartment'], furnishing: 'Any', who: rel.family === 'Single' ? 'Bachelors' : 'Family', movein: rel.arrival || '', office: rel.office || '', heard: 'Employer: ' + rel.companyName },
          consent: {}, verified: { status: false }, attrib: { first: { utm_source: 'employer', company: rel.companyName } } });
        window.KTTrack && KTTrack.event('employee_onboarded', { company: rel.companyName });
        $('#roleName').textContent = A.ROLES[role].label;
        $('.step[data-step="4"]').insertAdjacentHTML('afterbegin', `<div class="ok-banner" style="margin-bottom:14px">Welcome ${esc(rel.employeeName.split(' ')[0])}. ${esc(rel.companyName)} has set up your relocation; your details are already filled in. Just confirm how we may contact you.</div>`);
        show(4); return;
      }
      if (existing && existing.quick) { role = existing.role; $('#roleName').textContent = A.ROLES[role].label; buildProfile(); show(3); return; }   // quick sign-up: finish the full profile
      A.saveUser({ mobile, role, created: new Date().toISOString(), profile: {}, consent: {}, verified: { status: false }, attrib: window.KTTrack ? KTTrack.attribution() : {} });
      window.KTTrack && KTTrack.event('signup_started', { role });
      buildProfile(); show(3);
    } catch (e) { $('#oErr').textContent = e.message; boxes.forEach(b => b.value = ''); boxes[0].focus(); }
    verifying = false;
  };

  /* ---------- 4 profile ---------- */
  function buildProfile() {
    const f = KTForms.FORMS[role]; $('#pTitle').textContent = f.title; $('#pSub').textContent = f.sub + ' Fields marked * are required.';
    $('#profileForm').innerHTML = KTForms.render(role, A.user() ? A.user().profile : {});
  }
  $('#saveProfile').onclick = () => {
    const { profile, error } = KTForms.read($('#profileForm'), role);
    if (error) return toastErr(error);
    const u = A.user(); u.profile = { ...u.profile, ...profile }; u.quick = false; if (window.KTTrack) u.attrib = KTTrack.attribution(); A.saveUser(u); show(4);
  };
  function toastErr(m) { let e = $('#pfErr'); if (!e) { e = document.createElement('p'); e.id = 'pfErr'; e.className = 'err'; e.setAttribute('role', 'alert'); $('#profileForm').after(e); } e.textContent = m; }

  /* ---------- 5 consent ---------- */
  $('#cMail').onchange = e => { $('#mailBox').hidden = !e.target.checked; };
  $('#saveConsent').onclick = () => {
    const wa = $('#cWa').checked, mail = $('#cMail').checked, email = $('#email').value.trim();
    if (!$('#cTerms').checked) return $('#cErr').textContent = 'Please accept the Terms and Privacy Notice to continue.';
    if (mail && !/^\S+@\S+\.\S+$/.test(email)) return $('#cErr').textContent = 'Enter a valid email address for email updates.';
    $('#cErr').textContent = '';
    const u = A.user(); u.consent = { whatsapp: wa, email: mail, emailAddress: mail ? email : '', terms: true, at: new Date().toISOString() }; A.saveUser(u);
    if (u.sponsor) {   // company-sponsored employee: the employer vouches for them, straight to the relocation plan
      if (A.MODE === 'demo') A.markVerified(u.mobile, u.profile.name, 'company');
      A.flush && A.flush(); location.href = 'portal.html#relocation'; return;
    }
    registerLead(u); prepVerify(u); show(5);
  };
  function registerLead(u) {
    const intent = { tenant: 'rent', owner: 'lease', seller: 'sell', buyer: 'buy', builder: 'builder', company: 'business' }[u.role], p = u.profile;
    const L = A.read('keetown_leads', []); if (L.some(l => l.portalMobile === u.mobile)) return;
    const areas = (p.areas || []).map(id => KT.loc(id)?.name).filter(Boolean).join(', ') || (p.locality ? KT.loc(p.locality)?.name : '');
    const bud = p.budgetMax ? (u.role === 'tenant' ? '₹' + Number(p.budgetMax).toLocaleString('en-IN') + '/mo' : KT.fmt.lakh(p.budgetMax)) : (p.rent ? '₹' + p.rent + '/mo' : p.price ? KT.fmt.lakh(+p.price) : '');
    L.unshift({ id: 'u' + Date.now(), portalMobile: u.mobile, name: p.name, phone: u.mobile, intent, locality: p.locality || (p.areas || [])[0] || '', budget: bud, source: window.KTTrack ? KTTrack.source() : 'Website', heard: p.heard || '', attrib: u.attrib || {}, note: `${A.ROLES[u.role].label} · ${areas}${u.consent.whatsapp ? ' · WhatsApp OK' : ''}${u.consent.email ? ' · Email OK' : ''}`, channel: 'signup', stage: 'new', created: new Date().toISOString() });
    window.KTTrack && KTTrack.event('signup_completed', { role: u.role, via: 'login' });
    A.write('keetown_leads', L);
  }

  /* ---------- 6 verify ---------- */
  function prepVerify(u) {
    const req = A.ROLES[u.role].dl === 'required';
    $('#vTitle').textContent = req ? 'Verify your identity with DigiLocker' : 'Verify with DigiLocker (optional)';
    $('#vSub').textContent = req ? `As a ${A.ROLES[u.role].short.toLowerCase()}, DigiLocker verification is required before you can list or contact parties. It takes about a minute.` : 'Verified accounts get priority responses from our team. You can skip this and do it later.';
    $('#skipVerify').textContent = req ? 'Do it later' : 'Skip for now';
    $('#skipNote').textContent = req ? 'You can browse and save properties now. Listing and direct contact unlock once you’re verified.' : '';
    $('#demoBox').hidden = A.MODE !== 'demo'; $('#dlName').value = u.profile.name || '';
  }
  $('#skipVerify').onclick = () => { location.href = 'portal.html'; };
  $('#doVerify').onclick = async () => {
    const u = A.user();
    if (A.MODE === 'live') { A.digilockerStart('/portal.html'); return; }
    const name = $('#dlName').value.trim(); if (!name) return $('#vErr').textContent = 'Enter your name to run the demo verification.';
    $('#doVerify').disabled = true; $('#doVerify').textContent = 'Verifying…';
    await new Promise(r => setTimeout(r, 1200)); A.markVerified(u.mobile, name, 'demo');
    $('.step[data-step="5"]').insertAdjacentHTML('beforeend', '<div class="ok-banner" style="margin-top:16px">Demo verification complete. Taking you to your portal…</div>');
    setTimeout(() => location.href = 'portal.html', 900);
  };

  if (A.user() && !qr) { /* already signed in */ const n = document.createElement('div'); n.className = 'ok-banner'; n.style.marginBottom = '16px'; n.innerHTML = 'You’re already signed in. <a href="portal.html" style="text-decoration:underline">Open your portal →</a>'; $('.auth-card').prepend(n); }
})();
