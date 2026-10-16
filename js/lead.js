/* Lead capture. "Contact" on any listing is gated behind a quick mobile-OTP sign-up (the core
 * acquisition mechanic of large property portals). Logged-in users go straight to the contact
 * panel. Every contact creates a CRM lead with source + attribution for Keetown OS. */
window.KTLead = (function () {
  const $ = (s, r = document) => r.querySelector(s);
  const A = KTAuth, esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const WA = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3z"/></svg>';
  let dlg;
  function ensure() {
    if (dlg) return dlg; dlg = document.createElement('dialog'); dlg.className = 'modal lead-dlg'; dlg.setAttribute('aria-label', 'Contact Keetown Realty');
    document.body.append(dlg); dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); }); return dlg;
  }
  function addLead(fields) {
    const L = A.read('keetown_leads', []), attrib = window.KTTrack ? KTTrack.attribution() : {};
    L.unshift({ id: 'c' + Date.now(), stage: 'new', created: new Date().toISOString(), source: window.KTTrack ? KTTrack.source() : 'Website', attrib, ...fields });
    A.write('keetown_leads', L);
    window.KTTrack && KTTrack.event('lead_created', { intent: fields.intent, property: fields.propertyId || '', source: fields.channel || '' });
  }
  function contactPanel(p, u) {
    const l = p ? KT.loc(p.loc) : null;
    const msg = p ? `Hi Keetown Realty, I'm ${u.profile.name || 'a registered client'} (+91 ${u.mobile}). I'm interested in "${p.title}" (${KT.fmt.price(p)}), listing ${p.id.toUpperCase()}.` : `Hi Keetown Realty, I'm ${u.profile.name || ''} (+91 ${u.mobile}).`;
    ensure().innerHTML = `<div class="m-body">
      <p class="kind">${p ? esc(p.postedBy === 'Owner' ? 'Owner listing · managed by Keetown' : p.postedBy === 'Builder' ? 'Builder project · via Keetown' : 'Keetown verified listing') : 'Keetown Realty'}</p>
      <h2 class="lead-h">${p ? esc(p.title) : 'Talk to our team'}</h2>${p ? `<p class="sub">${esc(l.name)} · ${KT.fmt.price(p)}</p>` : ''}
      <div class="lead-acts"><a class="btn btn-wa" target="_blank" rel="noopener" href="${KT.wa(msg)}" data-ch="whatsapp">${WA} Chat on WhatsApp</a>
      <a class="btn btn-gold" href="tel:+${KT.brand.phone}" data-ch="call">Call ${esc(KT.brand.phoneDisplay)}</a>
      <button class="btn btn-line" data-ch="callback">Request a call back</button></div>
      <p class="fine">To protect privacy, owner numbers are shared after a verified site-visit booking. Our relationship manager coordinates everything.</p>
      <p class="lead-done" hidden>Done. We'll call you back within working hours.</p></div>`;
    dlg.querySelectorAll('[data-ch]').forEach(b => b.addEventListener('click', () => {
      addLead({ name: u.profile.name || '', phone: u.mobile, intent: p ? (p.mode === 'rent' ? 'rent' : 'buy') : u.role, locality: p ? p.loc : (u.profile.areas || [])[0] || '', propertyId: p ? p.id : '', budget: p ? KT.fmt.price(p) : '', note: (p ? 'Contact on ' + p.title : 'General enquiry') + ' · ' + b.dataset.ch, channel: b.dataset.ch });
      window.KTTrack && KTTrack.event('contact_revealed', { property: p ? p.id : '', channel: b.dataset.ch });
      if (b.dataset.ch === 'callback') { dlg.querySelector('.lead-done').hidden = false; b.disabled = true; }
    }));
    if (!dlg.open) dlg.showModal();
  }
  /* quick sign-up: name + mobile + OTP, consent optional */
  function gate(p, intentRole) {
    const role = intentRole || (p ? (p.mode === 'rent' ? 'tenant' : 'buyer') : 'buyer');
    ensure().innerHTML = `<form class="m-body" novalidate>
      <p class="kind">Free · takes 30 seconds</p><h2 class="lead-h">${p ? 'Get owner & visit details' : 'Get in touch'}</h2>
      ${p ? `<p class="sub">${esc(p.title)} · ${KT.fmt.price(p)}</p>` : ''}
      <div class="step-a"><label class="fl">Your name<input name="name" autocomplete="name" required></label>
      <label class="fl">Mobile number<div class="phone-in"><span>+91</span><input name="mobile" inputmode="numeric" maxlength="10" autocomplete="tel-national" placeholder="98XXXXXXXX"></div></label>
      <label class="fl">I am<select name="role">${Object.entries(A.ROLES).map(([k, r]) => `<option value="${k}" ${k === role ? 'selected' : ''}>${esc(r.label)}</option>`).join('')}</select></label>
      <label class="chk"><input type="checkbox" name="wa"><span>Send me matching properties on WhatsApp (optional, stop anytime)</span></label>
      <p class="err" role="alert"></p><button class="btn btn-gold wide" type="submit">Send OTP</button>
      <p class="fine">Already registered? <a href="${KT.base}login.html">Log in</a>. By continuing you agree to our Terms &amp; Privacy Notice.</p></div>
      <div class="step-b" hidden><p class="sub">Enter the 6-digit OTP sent to <b class="to"></b>${A.MODE === 'demo' ? ' (demo: 123456)' : ''}</p>
      <label class="fl">OTP<input name="otp" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label><p class="err" role="alert"></p>
      <button class="btn btn-gold wide" type="submit">Verify &amp; continue</button></div></form>`;
    const f = dlg.querySelector('form'); let stage = 'a';
    f.mobile.addEventListener('input', () => f.mobile.value = f.mobile.value.replace(/\D/g, '').slice(0, 10));
    f.addEventListener('submit', async ev => {
      ev.preventDefault(); const errA = f.querySelector('.step-a .err'), errB = f.querySelector('.step-b .err');
      if (stage === 'a') {
        if (!f.name.value.trim()) return errA.textContent = 'Please enter your name.';
        if (!A.validMobile(f.mobile.value)) return errA.textContent = 'Enter a valid 10-digit mobile number.';
        await A.sendOtp(f.mobile.value); stage = 'b'; f.querySelector('.step-a').hidden = true; f.querySelector('.step-b').hidden = false; f.querySelector('.to').textContent = '+91 ' + f.mobile.value; f.otp.focus(); return;
      }
      try {
        await A.verifyOtp(f.mobile.value, f.otp.value.trim()); const mob = f.mobile.value, r = f.role.value;
        let u = A.users()[mob];
        if (!u) {
          u = { mobile: mob, role: r, created: new Date().toISOString(), quick: true, profile: { name: f.name.value.trim(), areas: p ? [p.loc] : [], types: p ? [p.type] : [] }, consent: { whatsapp: f.wa.checked, email: false, terms: true, at: new Date().toISOString() }, verified: { status: false } };
          A.saveUser(u); window.KTTrack && KTTrack.event('signup_completed', { role: r, via: 'contact_gate' });
        }
        A.startSession(mob); document.dispatchEvent(new CustomEvent('kt:login'));
        contactPanel(p, A.user());
      } catch (e) { errB.textContent = e.message; }
    });
    if (!dlg.open) dlg.showModal(); setTimeout(() => f.name.focus(), 50);
  }
  function contact(pid) { const p = pid ? KT.byId(KT.properties, pid) : null, u = A.user(); u ? contactPanel(p, u) : gate(p); }
  document.addEventListener('click', e => { const b = e.target.closest('[data-contact]'); if (b) { e.preventDefault(); e.stopPropagation(); contact(b.dataset.contact); } });
  return { contact, addLead };
})();
