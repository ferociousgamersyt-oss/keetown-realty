/* "I'm interested" — the landing step for the ad campaign (and any [data-interest] button on the site).
 * Opens automatically for links ending in #interested (ad destination URL), or ?interest=rent|buy|manage|sell|build|relocate|community.
 * Saves a lead (with UTM / click-ID attribution) for the Keetown team and offers WhatsApp as a shortcut. */
window.KTInterest = (function () {
  const OPTS = [['rent', 'Rent a home', 'tenants'], ['buy', 'Buy a home', 'buyers'], ['manage', 'Property management', 'owners'], ['sell', 'Sell my property', 'sellers'],
    ['build', 'Builder / developer', 'builders'], ['relocate', 'Relocate employees / office space', 'companies'], ['community', 'Gated community desk', 'communities']];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const base = (window.KT && KT.base) || '';
  let dlg;
  function open(pre) {
    if (!dlg) { dlg = document.createElement('dialog'); dlg.className = 'kint'; dlg.setAttribute('aria-labelledby', 'kintH'); document.body.append(dlg); dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); }); }
    const tabNow = (document.querySelector('.kh-tabs [aria-selected="true"]') || {}).dataset;
    const sel = pre || (tabNow && (OPTS.find(o => o[2] === tabNow.k) || [])[0]) || '';
    dlg.innerHTML = `<button class="kint-x" type="button" aria-label="Close">×</button><form novalidate>
      <h2 id="kintH">Tell us what <b>you need.</b></h2><p class="sub">We call you back within a working day. No spam, no brokers calling you.</p>
      <div class="kint-opts" role="radiogroup" aria-label="I want to">${OPTS.map(([v, l]) => `<label><input type="radio" name="need" value="${v}" ${v === sel ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>
      <div class="two"><label class="f">Your name<input name="name" autocomplete="name" required maxlength="60"></label><label class="f">Mobile number<input name="mobile" inputmode="numeric" autocomplete="tel-national" maxlength="10" placeholder="98XXXXXXXX" required></label></div>
      <label class="f">Area or details (optional)<input name="note" maxlength="200" placeholder="e.g. 2BHK near Financial District, ₹40k"></label>
      <label class="chk"><input type="checkbox" name="wa"><span>Also send me matching options on WhatsApp. I can stop any time.</span></label>
      <p class="err" role="alert"></p><button class="kbtn" type="submit">Request a call back</button>
      <p class="fine">By sending this you agree to be contacted about your request. See our privacy notice.</p></form>`;
    const f = dlg.querySelector('form'), err = f.querySelector('.err');
    dlg.querySelector('.kint-x').onclick = () => dlg.close();
    f.mobile.oninput = () => f.mobile.value = f.mobile.value.replace(/\D/g, '').slice(0, 10);
    f.onsubmit = e => {
      e.preventDefault(); const need = (f.querySelector('[name=need]:checked') || {}).value, name = f.name.value.trim(), mob = f.mobile.value;
      if (!need) return err.textContent = 'Pick what you need.'; if (!name) return err.textContent = 'Please enter your name.'; if (!/^[6-9]\d{9}$/.test(mob)) return err.textContent = 'Enter a valid 10-digit Indian mobile number.';
      const opt = OPTS.find(o => o[0] === need), T = window.KTTrack, A = window.KTAuth;
      const lead = { id: 'i' + Date.now(), name, phone: mob, intent: need, locality: '', budget: '', note: `${opt[1]}${f.note.value.trim() ? ' · ' + f.note.value.trim() : ''}${f.wa.checked ? ' · WhatsApp OK' : ''}`,
        source: T ? T.source() : 'Website', channel: 'interested', attrib: T ? T.attribution() : {}, stage: 'new', created: new Date().toISOString() };
      if (A) { const L = A.read('keetown_leads', []); L.unshift(lead); A.write('keetown_leads', L); }
      T && T.event('lead_created', { intent: need, source: 'interested' });
      try { window.fbq && fbq('track', 'Lead', { content_name: need }); window.gtag && gtag('event', 'generate_lead', { method: 'interested', value: 1 }); } catch (x) {}
      const msg = `Hi Keetown Realty, I'm ${name}. I'm interested in: ${opt[1]}.${f.note.value.trim() ? ' ' + f.note.value.trim() : ''}`;
      dlg.innerHTML = `<button class="kint-x" type="button" aria-label="Close">×</button><div class="kint-done"><span class="ok" aria-hidden="true">✓</span><h2>Thanks, ${esc(name.split(' ')[0])}.</h2>
        <p class="sub">We’ll call +91 ${esc(mob)} within a working day. Want to talk sooner?</p>
        <a class="kbtn" href="${window.KT ? KT.wa(msg) : '#'}" target="_blank" rel="noopener">WhatsApp us now</a><a class="kp-more" href="${base}for/${opt[2]}.html">See how we help ${esc(opt[1].toLowerCase().startsWith('relocate') ? 'companies' : opt[2])} →</a></div>`;
      dlg.querySelector('.kint-x').onclick = () => dlg.close();
    };
    if (!dlg.open) dlg.showModal(); setTimeout(() => (sel ? f.name : f.querySelector('input')).focus(), 60);
  }
  document.addEventListener('click', e => { const b = e.target.closest('[data-interest]'); if (b) { e.preventDefault(); open(b.dataset.interest || ''); } });
  function auto() { const q = new URLSearchParams(location.search).get('interest'); if (location.hash === '#interested' || q) setTimeout(() => open(OPTS.some(o => o[0] === q) ? q : ''), 500); }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', auto) : auto();
  return { open };
})();
