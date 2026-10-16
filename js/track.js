/* Acquisition tracking: first/last-touch attribution (UTM, click IDs, referral codes) and a
 * single event() hook that forwards to GA4 / GTM (window.dataLayer) and Meta Pixel (fbq) when
 * they are installed. Paste your GA4/GTM/Pixel snippets in <head> to activate; nothing is sent
 * anywhere by this file on its own. */
window.KTTrack = (function () {
  const K = 'keetown_attrib', EV = 'keetown_events';
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const q = new URLSearchParams(location.search), touch = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'ref'].forEach(k => { if (q.get(k)) touch[k] = q.get(k).slice(0, 80); });
  const a = read(K, {});
  if (Object.keys(touch).length || !a.first) {
    const t = { ...touch, landing: location.pathname, referrer: document.referrer ? new URL(document.referrer).hostname : '', at: new Date().toISOString() };
    if (!a.first) a.first = t; if (Object.keys(touch).length) a.last = t; write(K, a);
  }
  function source() {
    const t = a.last || a.first || {};
    if (t.ref) return 'Referral';
    if (t.gclid || /google/i.test(t.utm_source || '')) return 'Google';
    if (t.fbclid || /facebook|instagram|meta/i.test(t.utm_source || '')) return /instagram/i.test(t.utm_source || '') ? 'Instagram' : 'Facebook/Instagram';
    if (t.utm_source) return t.utm_source;
    if (/google\./.test(t.referrer || '')) return 'Google (organic)';
    return t.referrer ? 'Referral: ' + t.referrer : 'Direct / website';
  }
  function event(name, props = {}) {
    const e = { event: name, ...props, at: new Date().toISOString() };
    (window.dataLayer = window.dataLayer || []).push(e);
    if (typeof window.fbq === 'function') { const map = { lead_created: 'Lead', signup_completed: 'CompleteRegistration', contact_revealed: 'Contact', property_posted: 'SubmitApplication' }; if (map[name]) window.fbq('track', map[name], props); }
    const log = read(EV, []); log.unshift(e); write(EV, log.slice(0, 200));
  }
  return { attribution: () => read(K, {}), source, event };
})();
