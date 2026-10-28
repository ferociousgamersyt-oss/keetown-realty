/* Behaviour for generated pages: property detail, locality guide, listings. */
(function () {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { properties, localities, loc, fmt, url, base } = KT;
  const A = window.KTAuth;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const toast = m => { const t = $('#toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2400); };

  /* ---------- illustrations ---------- */
  function paintArt(root = document) {
    $$('[data-art]', root).forEach((el, i) => {
      if (el.dataset.painted) return; const p = KT.byId(properties, el.dataset.art); if (!p) return;
      const shift = +el.dataset.shift || 0, q = { ...p, id: p.id + '_' + i + '_' + (shift + 100), hue: (p.hue + shift + 360) % 360 };
      el.innerHTML = KTArt(q, +el.dataset.w || 400, +el.dataset.h || 260); el.dataset.painted = 1;
    });
  }
  paintArt();
  // recently viewed (property pages)
  const path = location.pathname.replace(/\.html$/, '');
  const here = properties.find(p => p.slug && path.endsWith('/property/' + p.slug));
  // listings are managed in the inventory: show the live price, or say so if the home has gone off the market
  if (here && window.KTInv) {
    const was = here.price; KTInv.mergePublic(); const now = KT.properties.find(p => p.id === here.id);
    const box = document.querySelector('.pd-head, .pg h1, h1'), note = (cls, html) => box && box.insertAdjacentHTML('afterend', `<div class="${cls}" role="status">${html}</div>`);
    if (!now) { note('banner alert', '<p><b>This home is no longer on the market.</b> It may have been rented or sold. <a href="' + (KT.base || '') + 'properties.html?intent=' + (here.mode === 'rent' ? 'rent' : 'buy') + '&loc=' + here.loc + '" style="text-decoration:underline">See similar homes →</a></p>'); document.querySelectorAll('[data-contact],[data-act="visit"]').forEach(b => b.setAttribute('disabled', '')); }
    else if (now.price !== was) note('banner soft', `<p><b>Updated price:</b> ${KT.fmt.price(now)}</p>`);
  }
  if (here && A) { const r = A.read('keetown_recent', []).filter(id => id !== here.id); r.unshift(here.id); A.write('keetown_recent', r.slice(0, 12)); window.KTTrack && KTTrack.event('view_property', { id: here.id, loc: here.loc }); }
  // gallery: thumbnails swap into the main view
  $$('.g-thumbs > div').forEach(th => th.addEventListener('click', () => { const m = $('.g-main'); const tmp = m.innerHTML; m.innerHTML = th.innerHTML.replace('viewBox="0 0 400 260"', 'viewBox="0 0 400 260"'); th.innerHTML = tmp; }));

  /* ---------- EMI ---------- */
  const emi = $('.emi');
  if (emi) {
    const P = +emi.dataset.price, I = k => $(`[data-i="${k}"]`, emi), O = k => $$(`[data-o="${k}"]`);
    const calc = () => {
      const dp = +I('dp').value, r = +I('rate').value / 1200, n = +I('yrs').value * 12, loan = P * (1 - dp / 100);
      const v = loan * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
      O('dp').forEach(o => o.textContent = dp + '%'); O('rate').forEach(o => o.textContent = (+I('rate').value).toFixed(2) + '%'); O('yrs').forEach(o => o.textContent = I('yrs').value + ' yrs');
      [...O('emi'), ...O('emi-side')].forEach(o => o.textContent = '₹' + Math.round(v).toLocaleString('en-IN'));
    };
    $$('input', emi).forEach(i => i.addEventListener('input', calc)); calc();
  }

  /* ---------- save / visit / share ---------- */
  const user = () => A && A.user();
  const store = u => A.read('keetown_portal_' + u.mobile, { saved: [], visits: [] });
  const toLogin = msg => { toast(msg); setTimeout(() => location.href = base + 'login.html', 1100); };
  function syncSave() { const u = user(); $$('[data-act="save"]').forEach(b => { const on = u && store(u).saved.includes(b.dataset.id); b.textContent = on ? '♥ Saved' : '♡ Save'; b.setAttribute('aria-pressed', !!on); }); }
  syncSave();
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-act]'); if (!b) return; const act = b.dataset.act, u = user();
    if (act === 'share') {
      const data = { title: document.title, url: location.href };
      if (navigator.share) navigator.share(data).catch(() => {}); else (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).then(() => toast('Link copied'), () => toast(location.href));
      return;
    }
    if (!u) return toLogin(act === 'save' ? 'Log in with your mobile number to save properties…' : 'Log in to request a site visit…');
    if (act === 'save') { const s = store(u), i = s.saved.indexOf(b.dataset.id); i < 0 ? s.saved.push(b.dataset.id) : s.saved.splice(i, 1); A.write('keetown_portal_' + u.mobile, s); syncSave(); toast(i < 0 ? 'Saved to your portal' : 'Removed from saved'); }
    if (act === 'visit') {
      const need = A.ROLES[u.role].dl === 'required' && !(u.verified && u.verified.status);
      if (need) { toast('Verify with DigiLocker in your portal to book visits'); setTimeout(() => location.href = base + 'portal.html', 1300); return; }
      visitDialog(b.dataset.id, u);
    }
  });
  function visitDialog(id, u) {
    const p = KT.byId(properties, id); let d = $('#visitDlg');
    if (!d) { d = document.createElement('dialog'); d.id = 'visitDlg'; d.className = 'modal'; document.body.append(d); d.addEventListener('click', e => { if (e.target === d) d.close(); }); }
    const today = new Date().toISOString().slice(0, 10);
    d.innerHTML = `<div class="m-body"><h2 style="font-size:1.4rem;margin:0 0 4px">Request a site visit</h2><p class="sub">${esc(p.title)}</p>
      <label class="fl">Preferred date<input type="date" id="vDate" min="${today}"></label><label class="fl">Time<select id="vTime"><option>Morning (10–1)</option><option>Afternoon (1–4)</option><option>Evening (4–7)</option></select></label>
      <div class="acts"><button class="btn btn-gold" id="vGo">Confirm request</button><button class="btn btn-line" id="vX">Cancel</button></div></div>`;
    d.showModal(); $('#vX', d).onclick = () => d.close();
    $('#vGo', d).onclick = () => { const dt = $('#vDate', d).value; if (!dt) return toast('Choose a date'); const s = store(u); s.visits.unshift({ id: Date.now(), pid: id, date: dt, time: $('#vTime', d).value, status: 'Requested' }); A.write('keetown_portal_' + u.mobile, s); d.close(); toast('Visit requested — we will confirm on WhatsApp'); };
  }

  /* ---------- listings page ---------- */
  const grid = $('#lgrid');
  if (grid) {
    const form = $('#filters'), seg = $('#fMode'), thumb = $('.seg-thumb', seg), btns = $$('button', seg);
    const q = new URLSearchParams(location.search), st = { mode: q.get('mode') || '' };
    ['loc', 'type', 'beds', 'max', 'sort'].forEach(k => { if (q.get(k) && form.elements[k]) form.elements[k].value = q.get(k); });
    const place = () => { const b = btns.find(x => x.dataset.mode === st.mode) || btns[0]; btns.forEach(x => x.classList.toggle('on', x === b)); thumb.style.width = b.offsetWidth + 'px'; thumb.style.transform = `translateX(${b.offsetLeft - 4}px)`; };
    btns.forEach(b => b.onclick = () => { st.mode = b.dataset.mode; place(); render(); });
    const rate = p => p.mode === 'sale' ? p.price * 1e5 / (p.unit === 'sq.yd' ? p.area * 9 : p.area) : p.price / p.area;
    const card = p => { const l = loc(p.loc); return `<article class="card"><a class="card-link" href="${url.property(p)}" aria-label="${esc(p.title)}"></a><div class="art" data-art="${p.id}"></div><span class="badge">${esc(p.badge)}</span>${p.rera ? '<span class="rera">RERA ✓</span>' : ''}<div class="body"><h3>${esc(p.title)}</h3><div class="where">${esc(l.name)} · ${esc(p.type)}</div><div class="price">${fmt.price(p)}<small>${fmt.perSqft(p)}</small></div><div class="chips"><span>${fmt.bhk(p)}</span><span>${p.area.toLocaleString('en-IN')} ${p.unit}</span>${p.facing !== '—' ? `<span>${p.facing} facing</span>` : ''}</div></div></article>`; };
    function render() {
      const f = Object.fromEntries(new FormData(form)), max = +f.max || 0, beds = +f.beds || 0;
      let list = properties.filter(p => (!st.mode || p.mode === st.mode) && (!f.loc || p.loc === f.loc) && (!f.type || p.type === f.type) && p.beds >= beds && (!max || (p.mode === 'sale' ? p.price <= max : p.price <= max * 1000)));
      if (f.sort === 'lo') list.sort((a, b) => (a.mode === 'sale' ? a.price * 1e5 : a.price) - (b.mode === 'sale' ? b.price * 1e5 : b.price));
      if (f.sort === 'hi') list.sort((a, b) => (b.mode === 'sale' ? b.price * 1e5 : b.price) - (a.mode === 'sale' ? a.price * 1e5 : a.price));
      if (f.sort === 'rate') list.sort((a, b) => rate(a) - rate(b));
      grid.innerHTML = list.map(card).join('') || `<div class="empty-box"><p>No public listings match. Much of our inventory is off-market — tell us what you need.</p><a class="btn btn-wa" target="_blank" rel="noopener" href="${KT.wa('Hi Keetown Realty, I am looking for a property' + (f.loc ? ' in ' + loc(f.loc).name : '') + '.')}">Ask on WhatsApp</a></div>`;
      paintArt(grid);
      const l = f.loc ? loc(f.loc).name : 'Hyderabad'; $('#count').textContent = `${list.length} ${list.length === 1 ? 'property' : 'properties'}${st.mode ? (st.mode === 'sale' ? ' for sale' : ' for rent') : ''} in ${l}`;
      const params = { ...(st.mode && { mode: st.mode }), ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)) };
      history.replaceState(null, '', location.pathname + (Object.keys(params).length ? '?' + new URLSearchParams(params) : ''));
    }
    form.addEventListener('change', render); $('#fReset').onclick = () => { form.reset(); st.mode = ''; place(); render(); };
    requestAnimationFrame(place); addEventListener('load', place); render();
  }
})();
