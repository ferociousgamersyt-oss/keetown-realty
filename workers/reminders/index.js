/* Keetown rent reminders: a Cloudflare Worker that runs every day at 9:00 am IST.
 *
 * For every tenancy with automatic reminders on, it finds unpaid rent that is
 *   - N days before the due date  (auto.daysBefore)
 *   - due today                   (auto.onDue)
 *   - overdue, every N days       (auto.overdueEvery)
 * and sends the tenant a WhatsApp template message (Meta WhatsApp Cloud API), only when the tenant
 * has opted in to WhatsApp. Every reminder is also written into the tenancy, so the owner and the
 * tenant both see it in their portal notifications.
 *
 * Same rules as js/tenancy.js (dueDate, rentFor, status). Secrets: WA_TOKEN, WA_PHONE_ID.
 */
const DAY = 864e5, IST = 5.5 * 36e5;
const pad = n => String(n).padStart(2, '0');
const ym = d => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1);
const todayIST = () => { const d = new Date(Date.now() + IST); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); };
const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
const fmtD = d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const monthName = k => new Date(k + '-01T00:00:00Z').toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const parseDay = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d || 1)); };

function dueDate(t, k) { const [y, m] = k.split('-').map(Number), last = new Date(Date.UTC(y, m, 0)).getUTCDate(); return new Date(Date.UTC(y, m - 1, Math.min(t.dueDay || 5, last))); }
function rentFor(t, k) { const s = parseDay(t.start), [y, m] = k.split('-').map(Number), n = (y - s.getUTCFullYear()) * 12 + (m - 1 - s.getUTCMonth()); return Math.round(t.rent * Math.pow(1 + (t.escalationPct || 0) / 100, Math.max(0, Math.floor(n / (t.termMonths || 11))))); }
function openRows(t, today) {   // unpaid / part-paid months up to next month
  const out = [], s = parseDay(t.start), end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  for (let d = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1)); d <= end; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    const k = ym(d), p = (t.payments || []).find(x => x.month === k), amount = rentFor(t, k);
    if (p && (p.status === 'paid' || p.status === 'reported')) continue;
    const received = p ? (p.received ?? 0) : 0, due = dueDate(t, k), days = Math.round((due - today) / DAY);
    out.push({ month: k, label: monthName(k), due, days, amount, balance: Math.max(0, amount - received), partial: received > 0 });
  }
  return out;
}
function whichReminder(t, r, today) {
  const a = t.auto, sent = (t.reminders || []).filter(x => x.month === r.month && x.auto);
  if (r.days > 0 && r.days <= a.daysBefore && !sent.some(x => x.kind === 'before')) return 'before';
  if (r.days === 0 && a.onDue && !sent.some(x => x.kind === 'due')) return 'due';
  if (r.days < 0) { const last = sent[0] ? parseDay(new Date(new Date(sent[0].at).getTime() + IST).toISOString()) : null; if (!last || (today - last) / DAY >= (a.overdueEvery || 3)) return 'overdue'; }
  return '';
}

async function sendWhatsApp(env, to, params) {
  if (!env.WA_TOKEN || !env.WA_PHONE_ID) return { ok: false, why: 'not configured' };
  const r = await fetch(`https://graph.facebook.com/v21.0/${env.WA_PHONE_ID}/messages`, { method: 'POST',
    headers: { Authorization: 'Bearer ' + env.WA_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: '91' + to, type: 'template',
      template: { name: env.WA_TEMPLATE || 'rent_reminder', language: { code: env.WA_LANG || 'en' }, components: [{ type: 'body', parameters: params.map(text => ({ type: 'text', text: String(text).slice(0, 200) })) }] } }) });
  if (r.ok) { const j = await r.json(); return { ok: true, id: j.messages && j.messages[0] && j.messages[0].id }; }
  return { ok: false, why: 'WhatsApp API ' + r.status + ': ' + (await r.text()).slice(0, 200) };
}

export async function run(env, { dryRun = false } = {}) {
  const today = todayIST(), log = [];
  const list = (await env.DB.prepare("SELECT id, data FROM records WHERE col = 'tenancies'").all()).results || [];
  for (const row of list) {
    const t = JSON.parse(row.data);
    if (!t.auto || !t.auto.enabled || !t.tenantMobile || !t.rent || !t.start) continue;
    let changed = false;
    for (const r of openRows(t, today)) {
      const kind = whichReminder(t, r, today); if (!kind) continue;
      const amount = r.partial ? r.balance : r.amount, when = (r.days < 0 ? 'overdue since ' : 'due on ') + fmtD(r.due);
      // WhatsApp only with the tenant's opt-in, never for demo tenancies
      const tenant = await env.DB.prepare("SELECT data FROM records WHERE col = 'users' AND id = ?").bind(t.tenantMobile).first();
      const optIn = !!(tenant && JSON.parse(tenant.data).consent && JSON.parse(tenant.data).consent.whatsapp);
      let wa = { ok: false, why: t.demo ? 'demo tenancy' : optIn ? '' : 'tenant has not opted in to WhatsApp' };
      if (!t.demo && optIn && !dryRun) wa = await sendWhatsApp(env, t.tenantMobile, [t.tenantName || 'there', inr(amount), r.label, t.title || 'your home', when, t.ownerUpi || 'your Keetown portal']);
      const at = new Date().toISOString();
      t.reminders = t.reminders || []; t.notices = t.notices || [];
      t.reminders.unshift({ at, month: r.month, by: 'keetown', auto: true, kind, channel: wa.ok ? 'whatsapp' : 'portal', ...(wa.id ? { waId: wa.id } : {}), ...(wa.ok ? {} : { note: wa.why }) });
      t.notices.unshift({ at, by: 'keetown', kind: 'rent', text: `Automatic reminder${wa.ok ? ' sent on WhatsApp' : ''}: ${r.partial ? 'balance' : 'rent'} of ${inr(amount)} for ${r.label} is ${when}.` });
      changed = true; log.push({ tenancy: t.id, month: r.month, kind, whatsapp: wa.ok, note: wa.why || '' });
    }
    if (changed && !dryRun) await env.DB.prepare("UPDATE records SET data = ?, updated = ? WHERE col = 'tenancies' AND id = ?").bind(JSON.stringify(t), Date.now(), t.id).run();
  }
  console.log(JSON.stringify({ day: today.toISOString().slice(0, 10), sent: log.length, log }));
  return log;
}

export default {
  async scheduled(_event, env, ctx) { ctx.waitUntil(run(env)); },
  // Manual check: GET /?dry=1 with header "Authorization: Bearer <RUN_KEY>" shows what today's run would send.
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!env.RUN_KEY || req.headers.get('Authorization') !== 'Bearer ' + env.RUN_KEY) return new Response('Keetown reminders: runs daily at 9:00 IST.', { status: 200 });
    const log = await run(env, { dryRun: url.searchParams.get('dry') === '1' });
    return Response.json({ dryRun: url.searchParams.get('dry') === '1', reminders: log });
  }
};
