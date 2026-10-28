/* Keetown visuals: small animated illustrations, one per topic, so every idea has a picture.
 * Usage: <div class="vis" data-vis="verify"></div>  → filled with SVG; animates when scrolled into view.
 * Style: navy line work, sky fills, one blue accent. Motion is CSS (see .vis rules in site.css) and
 * switches off for prefers-reduced-motion. */
window.KTVis = (function () {
  const L = 'class="vl"', F = 'class="vf"', A = 'class="va"', W = 'class="vw"';
  const d = n => `style="--d:${n}s"`;
  const bg = '<circle cx="80" cy="62" r="52" class="vbg"/>';
  const check = (x, y, s = 1, delay = .9) => `<g class="pop" ${d(delay)} transform="translate(${x} ${y}) scale(${s})"><circle r="11" ${A}/><path d="M-5 0l3.5 3.5L5.5-4" class="vck"/></g>`;
  const house = (x, y, s = 1, extra = '') => `<g ${extra}><g transform="translate(${x} ${y}) scale(${s})"><path d="M-22 0V-22L0-40 22-22V0z" ${F}/><path d="M-22 0V-22L0-40 22-22V0z" ${L} pathLength="1"/><rect x="-6" y="-16" width="12" height="16" ${W}/></g></g>`;
  const V = {
    verify: `${bg}<g class="rise"><rect x="38" y="34" width="84" height="56" rx="8" ${F}/><rect x="38" y="34" width="84" height="56" rx="8" ${L}/><circle cx="60" cy="58" r="9" ${W}/><path d="M48 80c2-7 7-10 12-10s10 3 12 10" ${L}/>
      <path d="M80 52h30M80 62h24M80 72h28" class="vl draw" pathLength="1"/></g>${check(116, 36)}`,
    search: `${bg}${house(62, 92, 1.1)}${house(104, 88, .8)}<g class="slide-x"><circle cx="96" cy="50" r="15" ${W}/><circle cx="96" cy="50" r="15" ${L}/><path d="M107 61l12 12" class="vl thick"/></g>`,
    match: `${bg}<rect x="34" y="36" width="56" height="54" rx="8" ${W}/><rect x="34" y="36" width="56" height="54" rx="8" ${L}/><path d="M42 72h40M42 80h28" ${L}/><path d="M44 62l18-14 18 14" ${L}/>
      <circle cx="112" cy="58" r="20" class="vf"/><circle cx="112" cy="58" r="20" class="vring draw" pathLength="1" transform="rotate(-90 112 58)"/><text x="112" y="63" text-anchor="middle" class="vt">92%</text>`,
    visit: `${bg}<rect x="36" y="38" width="70" height="56" rx="8" ${W}/><rect x="36" y="38" width="70" height="56" rx="8" ${L}/><path d="M36 52h70M52 32v12M90 32v12" ${L}/>
      <g class="vf"><rect x="46" y="60" width="10" height="9" rx="2"/><rect x="62" y="60" width="10" height="9" rx="2"/><rect x="78" y="60" width="10" height="9" rx="2"/><rect x="46" y="75" width="10" height="9" rx="2"/></g><rect x="62" y="75" width="10" height="9" rx="2" class="va pop" ${d(.7)}/>
      <g class="drop" ${d(.4)}><path d="M118 40c-8 0-13 6-13 13 0 10 13 22 13 22s13-12 13-22c0-7-5-13-13-13z" ${A}/><circle cx="118" cy="53" r="5" ${W}/></g>`,
    agreement: `${bg}<rect x="46" y="26" width="64" height="80" rx="6" ${W}/><rect x="46" y="26" width="64" height="80" rx="6" ${L}/><path d="M56 42h44M56 52h44M56 62h30" class="vl draw" pathLength="1"/>
      <path d="M58 86c6-8 10 6 16-2s8 6 14 0" class="vsig draw" ${d(.8)} pathLength="1"/><g class="slide-x" ${d(.6)}><path d="M112 70l14-14 6 6-14 14-8 2z" ${A}/></g>`,
    keys: `${bg}${house(66, 96, 1.3)}<g class="swing"><circle cx="112" cy="52" r="11" ${L}/><circle cx="112" cy="52" r="4" ${A}/><path d="M112 63v26M112 76h7M112 84h5" class="vl thick"/></g>`,
    rent: `${bg}<rect x="30" y="34" width="38" height="62" rx="7" ${W}/><rect x="30" y="34" width="38" height="62" rx="7" ${L}/><path d="M42 88h14" ${L}/><text x="49" y="66" text-anchor="middle" class="vt">UPI</text>
      ${house(118, 92, 1)}<path d="M72 62h28" class="vl dash"/><g class="coin"><circle cx="78" cy="62" r="9" ${A}/><text x="78" y="66" text-anchor="middle" class="vtw">₹</text></g>`,
    reminder: `${bg}<g class="shake"><path d="M66 82V60a14 14 0 0 1 28 0v22l6 6H60z" ${F}/><path d="M66 82V60a14 14 0 0 1 28 0v22l6 6H60z" ${L}/><path d="M75 92a5 5 0 0 0 10 0" ${L}/></g>
      <g class="pop" ${d(.6)}><rect x="98" y="30" width="40" height="24" rx="8" ${A}/><path d="M106 54l-4 8 10-8" ${A}/><path d="M106 40h24M106 46h16" class="vlw"/></g>`,
    repair: `${bg}${house(70, 98, 1.5)}<g class="spin-w"><path d="M104 46l10 10-22 22-10-10z" ${A}/><circle cx="118" cy="42" r="10" ${W}/><circle cx="118" cy="42" r="10" ${L}/><path d="M114 38l8 8" class="vl"/></g>`,
    report: `${bg}<rect x="34" y="30" width="92" height="66" rx="8" ${W}/><rect x="34" y="30" width="92" height="66" rx="8" ${L}/>
      <g class="vf"><rect class="grow" ${d(.1)} x="48" y="64" width="10" height="22"/><rect class="grow" ${d(.25)} x="64" y="56" width="10" height="30"/><rect class="grow" ${d(.4)} x="80" y="48" width="10" height="38"/></g><rect class="grow va" ${d(.55)} x="96" y="40" width="10" height="46"/>
      <path d="M46 52l18-8 16 4 26-14" class="vl draw" ${d(.6)} pathLength="1"/>`,
    legal: `${bg}<path d="M80 26l34 12v22c0 22-15 34-34 40-19-6-34-18-34-40V38z" ${F}/><path d="M80 26l34 12v22c0 22-15 34-34 40-19-6-34-18-34-40V38z" class="vl draw" pathLength="1"/><path d="M66 62l10 10 18-20" class="vck big draw" ${d(.7)} pathLength="1"/>`,
    loan: `${bg}<g class="vf"><rect class="grow" ${d(.1)} x="40" y="70" width="14" height="20" rx="2"/><rect class="grow" ${d(.2)} x="60" y="62" width="14" height="28" rx="2"/><rect class="grow" ${d(.3)} x="80" y="54" width="14" height="36" rx="2"/></g>
      <path d="M36 90h96" ${L}/><g class="drop" ${d(.5)}><circle cx="114" cy="56" r="14" ${A}/><text x="114" y="61" text-anchor="middle" class="vtw">EMI</text></g>`,
    price: `${bg}<g class="swing"><path d="M44 44h40l30 30-30 30-40-40z" ${F}/><path d="M44 44h40l30 30-30 30-40-40z" ${L}/><circle cx="58" cy="58" r="5" ${W}/><text x="80" y="82" text-anchor="middle" class="vt">₹</text></g>
      <path d="M100 46l12-14 12 10 12-16" class="vl draw" ${d(.5)} pathLength="1"/>`,
    buyers: `${bg}<g class="rise"><circle cx="56" cy="54" r="10" ${F}/><path d="M40 92c2-14 9-20 16-20s14 6 16 20" ${F}/><circle cx="104" cy="54" r="10" ${F}/><path d="M88 92c2-14 9-20 16-20s14 6 16 20" ${F}/></g>
      <g class="rise" ${d(.2)}><circle cx="80" cy="46" r="12" ${W}/><circle cx="80" cy="46" r="12" ${L}/><path d="M60 96c3-16 11-24 20-24s17 8 20 24" ${W}/><path d="M60 96c3-16 11-24 20-24s17 8 20 24" ${L}/></g>${check(96, 34, .9)}`,
    registration: `${bg}<rect x="40" y="40" width="66" height="58" rx="6" ${W}/><rect x="40" y="40" width="66" height="58" rx="6" ${L}/><path d="M50 54h46M50 64h34" ${L}/>
      <g class="stamp"><rect x="92" y="22" width="16" height="22" rx="3" ${A}/><rect x="84" y="44" width="32" height="8" rx="2" ${A}/></g><circle cx="78" cy="82" r="10" class="vstamp pop" ${d(.9)}/>`,
    launch: `${bg}<g class="vf"><rect class="grow" ${d(.1)} x="44" y="56" width="20" height="40"/><rect class="grow" ${d(.3)} x="96" y="50" width="20" height="46"/></g><rect class="grow va" ${d(.2)} x="68" y="30" width="24" height="66"/>
      <g class="vwin"><rect x="73" y="38" width="5" height="6"/><rect x="82" y="38" width="5" height="6"/><rect x="73" y="50" width="5" height="6"/><rect x="82" y="62" width="5" height="6"/></g><path d="M118 28l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" class="va pop" ${d(1)}/><path d="M36 96h88" ${L}/>`,
    community: `${bg}<path d="M34 96V62a46 34 0 0 1 92 0v34" class="vl draw" pathLength="1"/>${house(58, 96, .7)}${house(80, 96, .8, 'class="rise"')}${house(102, 96, .7)}<rect x="66" y="98" width="28" height="8" rx="2" ${A}/><path d="M30 96h100" ${L}/>`,
    relocation: `${bg}<path d="M36 84C60 40 100 36 124 60" class="vl dash"/>${house(124, 92, .8)}<g class="fly"><path d="M0-4l18 4-18 4 3-4z" ${A} transform="translate(30 88) rotate(-50)"/></g>`,
    office: `${bg}<rect x="54" y="28" width="52" height="70" rx="3" ${W}/><rect x="54" y="28" width="52" height="70" rx="3" ${L}/>
      <g class="vwin2">${[0, 1, 2, 3, 4].map(r => [0, 1, 2].map(c => `<rect x="${62 + c * 14}" y="${36 + r * 11}" width="8" height="6" style="--d:${(r * 3 + c) * .06}s"/>`).join('')).join('')}</g><rect x="74" y="88" width="12" height="10" ${A}/><path d="M40 98h80" ${L}/>`,
    allowance: `${bg}<rect x="34" y="46" width="56" height="40" rx="8" ${F}/><rect x="34" y="46" width="56" height="40" rx="8" ${L}/><path d="M74 60h16v12H74z" ${W}/><circle cx="80" cy="66" r="2.5" ${A}/>
      <g class="split1"><circle cx="112" cy="50" r="12" ${A}/><text x="112" y="54" text-anchor="middle" class="vtw">Co.</text></g><g class="split2"><circle cx="118" cy="82" r="9" ${F}/><text x="118" y="85" text-anchor="middle" class="vts">You</text></g>`,
    lock: `${bg}${house(72, 98, 1.4)}<g class="drop" ${d(.3)}><path d="M104 56v-8a10 10 0 0 1 20 0v8" class="vl thick"/><rect x="98" y="56" width="32" height="26" rx="5" ${A}/><circle cx="114" cy="68" r="3.5" ${W}/></g>`,
    nri: `${bg}<circle cx="64" cy="58" r="26" ${F}/><circle cx="64" cy="58" r="26" ${L}/><path d="M38 58h52M64 32c-10 10-10 42 0 52M64 32c10 10 10 42 0 52" ${L}/>
      <path d="M90 58c12 0 16 10 22 22" class="vl dash"/>${house(116, 100, .75, 'class="pop" style="--d:.6s"')}`,
    marketing: `${bg}<g class="shake"><path d="M44 66V54l42-18v48L44 66z" ${F}/><path d="M44 66V54l42-18v48L44 66z" ${L}/><path d="M50 66l6 20h10l-4-18" ${L}/></g>
      <path d="M98 46c6 4 6 24 0 28" class="vl wave" ${d(.1)}/><path d="M108 38c10 7 10 37 0 44" class="vl wave" ${d(.3)}/><path d="M118 30c14 10 14 50 0 60" class="vl wave" ${d(.5)}/>`,
    movein: `${bg}<g class="slide-x"><rect x="30" y="66" width="34" height="28" rx="3" ${F}/><rect x="30" y="66" width="34" height="28" rx="3" ${L}/><path d="M30 76h34M47 66v10" ${L}/></g><path d="M70 80h20" class="vl dash"/><path d="M86 74l6 6-6 6" ${L}/>${house(118, 96, 1.1)}`,
    receipt: `${bg}<path d="M50 26h60v74l-10-6-10 6-10-6-10 6-10-6-10 6z" ${W}/><path d="M50 26h60v74l-10-6-10 6-10-6-10 6-10-6-10 6z" ${L}/><path d="M60 42h40M60 52h28M60 62h34" class="vl draw" pathLength="1"/>${check(100, 80, .9, .8)}`,
    bills: `${bg}<rect x="40" y="36" width="54" height="64" rx="6" ${W}/><rect x="40" y="36" width="54" height="64" rx="6" ${L}/><path d="M50 50h34M50 60h22" ${L}/><text x="67" y="88" text-anchor="middle" class="vt">₹</text>
      <g class="pop" ${d(.4)}><path d="M114 30l-10 18h8l-6 16 16-22h-9l7-12z" ${A}/></g><g class="pop" ${d(.7)}><path d="M118 72c-6 8-8 11-8 15a8 8 0 0 0 16 0c0-4-2-7-8-15z" ${F}/><path d="M118 72c-6 8-8 11-8 15a8 8 0 0 0 16 0c0-4-2-7-8-15z" ${L}/></g>`,
    desk: `${bg}<rect x="40" y="70" width="80" height="10" rx="3" ${A}/><path d="M48 80v18M112 80v18" ${L}/><rect x="62" y="44" width="36" height="24" rx="3" ${W}/><rect x="62" y="44" width="36" height="24" rx="3" ${L}/><circle cx="80" cy="34" r="8" ${F}/>
      <g class="pop" ${d(.6)}><rect x="104" y="28" width="30" height="18" rx="6" ${F}/><path d="M110 37h18" ${L}/></g>`,
    portal: `${bg}<rect x="30" y="32" width="100" height="66" rx="8" ${W}/><rect x="30" y="32" width="100" height="66" rx="8" ${L}/><path d="M30 44h100" ${L}/><circle cx="38" cy="38" r="2" ${A}/>
      <rect x="38" y="52" width="26" height="38" rx="4" ${F}/><g class="vf"><rect class="grow" ${d(.2)} x="74" y="72" width="8" height="18"/><rect class="grow" ${d(.35)} x="86" y="64" width="8" height="26"/></g><rect class="grow va" ${d(.5)} x="98" y="56" width="8" height="34"/><path d="M110 60h12M110 68h8" ${L}/>`,
    shield: null
  };
  V.shield = V.legal;
  function svg(key) { const body = V[key] || V.portal; return `<svg viewBox="0 0 160 120" role="img" aria-hidden="true" focusable="false">${body}</svg>`; }
  function mount(root = document) {
    const els = [...root.querySelectorAll('[data-vis]:not([data-vis-done])')]; if (!els.length) return;
    els.forEach(el => { el.innerHTML = svg(el.dataset.vis); el.setAttribute('data-vis-done', ''); el.classList.add('vis'); });
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) { els.forEach(el => el.classList.add('on')); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } }), { threshold: .35 });
    els.forEach(el => io.observe(el));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', () => mount()) : mount();
  return { svg, mount, keys: Object.keys(V) };
})();
