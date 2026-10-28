/* Keetown backend: Cloudflare Pages Function + D1.
 *
 *  POST /api/otp/send     { mobile }          SMS OTP (Twilio Verify or MSG91); demo numbers use 123456
 *  POST /api/otp/verify   { mobile, otp }     sets HttpOnly session cookie
 *  POST /api/logout
 *  GET  /api/state                            everything the signed-in user may see
 *  POST /api/sync         { col, put, del }   write records (server enforces who may write what)
 *  GET  /api/leads                            staff only
 *  POST /api/demo/reset                       reset the five demo accounts
 *  GET  /api/digilocker/start | /callback     DigiLocker OAuth 2.0 + PKCE
 */
const DEMO = ['9000000001', '9000000002', '9000000003', '9000000004', '9000000005', '9000000006', '9000000007'];
const DAY = 864e5, SESSION_DAYS = 30, COOKIE = 'kt_sid';
const COLS = ['users', 'tenancies', 'purchases', 'submissions', 'leads', 'blob', 'relocations', 'offices', 'inventory', 'teams'];
const TEAM_COLS = ['relocations', 'offices', 'inventory'];
const PARTNER_ROLES = ['builder', 'company'];
const LOCK_OPEN = ['Awaiting company approval', 'Approved, confirming with owner', 'Locked'];   // Keetown staff may read and update these
const BLOB_RE = /^keetown_(portal|searches|seen)_([6-9]\d{9})$/;

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });
const err = (msg, status = 400) => json({ error: msg }, status);
const validMobile = m => typeof m === 'string' && /^[6-9]\d{9}$/.test(m);
const rand = (n = 32) => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sha256 = async s => b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const isDemo = (env, m) => env.DEMO_ACCOUNTS === '1' && DEMO.includes(m);
const isStaff = (env, m) => !!m && (env.STAFF_MOBILES || '').split(',').map(s => s.trim()).includes(m);

function cookieOf(req, name) { const m = (req.headers.get('Cookie') || '').match(new RegExp('(?:^|; )' + name + '=([^;]+)')); return m ? m[1] : null; }
async function session(env, req) {
  const id = cookieOf(req, COOKIE); if (!id) return null;
  const s = await env.DB.prepare('SELECT mobile, expires FROM sessions WHERE id = ?').bind(id).first();
  return s && s.expires > Date.now() ? { id, mobile: s.mobile, staff: isStaff(env, s.mobile) } : null;
}
const setCookie = (id, maxAge) => `${COOKIE}=${id}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

/* ---------- OTP providers ---------- */
function provider(env) {
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SID) return 'twilio';
  if (env.MSG91_AUTHKEY && env.MSG91_TEMPLATE_ID) return 'msg91';
  return null;
}
async function twilio(env, path, params) {
  const r = await fetch(`https://verify.twilio.com/v2/Services/${env.TWILIO_VERIFY_SID}/${path}`, { method: 'POST',
    headers: { Authorization: 'Basic ' + btoa(env.TWILIO_ACCOUNT_SID + ':' + env.TWILIO_AUTH_TOKEN), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) });
  return r.ok ? r.json() : null;
}
async function sendOtp(env, mobile) {
  const p = provider(env);
  if (p === 'twilio') return !!(await twilio(env, 'Verifications', { To: '+91' + mobile, Channel: 'sms' }));
  if (p === 'msg91') { const r = await fetch(`https://control.msg91.com/api/v5/otp?template_id=${encodeURIComponent(env.MSG91_TEMPLATE_ID)}&mobile=91${mobile}&otp_expiry=5`, { method: 'POST', headers: { authkey: env.MSG91_AUTHKEY, 'Content-Type': 'application/json' }, body: '{}' }); return r.ok && (await r.json()).type === 'success'; }
  // No SMS provider yet: staff can still sign in; the code is written to the function log (only the Cloudflare account can read it).
  if (isStaff(env, mobile)) {
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e6).padStart(6, '0');
    await env.DB.prepare('INSERT OR REPLACE INTO otp_codes (mobile, hash, expires, tries) VALUES (?, ?, ?, 0)').bind(mobile, await sha256(mobile + code), Date.now() + 5 * 6e4).run();
    console.log(`[staff OTP] ${mobile}: ${code}`); return true;
  }
  return 'unconfigured';
}
async function checkOtp(env, mobile, otp) {
  const p = provider(env);
  if (p === 'twilio') { const r = await twilio(env, 'VerificationCheck', { To: '+91' + mobile, Code: otp }); return !!r && r.status === 'approved'; }
  if (p === 'msg91') { const r = await fetch(`https://control.msg91.com/api/v5/otp/verify?otp=${encodeURIComponent(otp)}&mobile=91${mobile}`, { headers: { authkey: env.MSG91_AUTHKEY } }); return r.ok && (await r.json()).type === 'success'; }
  const row = await env.DB.prepare('SELECT hash, expires, tries FROM otp_codes WHERE mobile = ?').bind(mobile).first();
  if (!row || row.expires < Date.now() || row.tries >= 5) return false;
  if (row.hash === await sha256(mobile + otp)) { await env.DB.prepare('DELETE FROM otp_codes WHERE mobile = ?').bind(mobile).run(); return true; }
  await env.DB.prepare('UPDATE otp_codes SET tries = tries + 1 WHERE mobile = ?').bind(mobile).run(); return false;
}

/* ---------- records + access rules ---------- */
function access(col, id, d) {   // which mobiles may see / change this record
  if (col === 'users') return [id, null];
  if (col === 'tenancies') return [d.ownerMobile || null, d.tenantMobile || null];
  if (col === 'purchases' || col === 'submissions') return [d.mobile || null, null];
  if (col === 'leads') return [d.portalMobile || d.phone || null, null];
  if (col === 'relocations') return [d.companyMobile || null, d.employeeMobile || null];
  if (col === 'offices') return [d.companyMobile || null, null];
  if (col === 'inventory') return [d.builderMobile || null, null];
  if (col === 'teams') return [d.builder || null, d.worker || null];
  if (col === 'blob') { const m = BLOB_RE.exec(id); return m ? [m[2], null] : [null, null]; }
  return [null, null];
}
const rows = async (env, sql, ...b) => (await env.DB.prepare(sql).bind(...b).all()).results || [];

async function state(env, s) {
  const me = s.mobile, list = await rows(env, "SELECT col, id, data FROM records WHERE (a = ? OR b = ?) AND col NOT IN ('leads','inventory')", me, me);
  const out = { me, staff: s.staff, user: null, tenancies: [], purchases: [], submissions: [], relocations: [], offices: [], teams: [], blobs: {} };
  if (s.staff) { const seen = new Set(list.map(r => r.col + r.id)); for (const r of await rows(env, "SELECT col, id, data FROM records WHERE col IN ('relocations','offices')")) if (!seen.has(r.col + r.id)) list.push(r); }
  for (const r of list) { const d = JSON.parse(r.data);
    if (r.col === 'users') { if (r.id === me) out.user = d; }
    else if (r.col === 'blob') out.blobs[r.id] = d;
    else if (out[r.col]) out[r.col].push(d); }
  const byNew = (x, y) => String(y.created || y.at || '').localeCompare(String(x.created || x.at || ''));
  out.tenancies.sort(byNew); out.purchases.sort(byNew); out.submissions.sort(byNew); out.relocations.sort(byNew); out.offices.sort(byNew);
  return out;
}

async function sync(env, s, body) {
  const { col } = body; if (!COLS.includes(col)) return err('Unknown collection');
  const put = Array.isArray(body.put) ? body.put.slice(0, 200) : [], del = Array.isArray(body.del) ? body.del.slice(0, 200) : [];
  const me = s && s.mobile, now = Date.now(), stmts = [], conflicts = [], rejected = [];
  _bcache.clear();
  if (col !== 'leads' && !s) return err('Please log in again', 401);
  // one query for every existing record in this batch, and one team check per builder (keeps big uploads fast)
  const ids = put.map(x => x && x.id).filter(x => typeof x === 'string');
  const existing = new Map(); for (let i = 0; i < ids.length; i += 90) { const part = ids.slice(i, i + 90); (await rows(env, `SELECT id, a, b, data FROM records WHERE col = ? AND id IN (${part.map(() => '?').join(',')})`, col, ...part)).forEach(r => existing.set(r.id, r)); }
  const workerOf = new Map(); const isWorkerC = async (bld) => { if (!workerOf.has(bld)) workerOf.set(bld, await isWorker(env, bld, me)); return workerOf.get(bld); };
  for (const { id, data } of put) {
    if (typeof id !== 'string' || !id || id.length > 80 || !data || typeof data !== 'object') continue;
    const text = JSON.stringify(data); if (text.length > 200000) continue;
    const [a, b] = access(col, id, data);
    if (col === 'leads') {   // anyone may create a lead; only staff may edit existing ones
      stmts.push(s && s.staff ? env.DB.prepare('INSERT OR REPLACE INTO records (col, id, a, b, data, updated) VALUES (?, ?, ?, NULL, ?, ?)').bind(col, id, a, text, now)
        : env.DB.prepare('INSERT OR IGNORE INTO records (col, id, a, b, data, updated) VALUES (?, ?, ?, NULL, ?, ?)').bind(col, id, a, text.slice(0, 20000), now));
      continue;
    }
    if (col === 'teams' && a !== me) continue;   // only the builder can add people to their team
    let team = s.staff && TEAM_COLS.includes(col);
    if (!team && col === 'inventory' && a && a !== me) team = await isWorkerC(a);   // a builder's worker uploading for them
    if (col === 'inventory') { const bu = await builderInfo(env, a); data.review = bu.verified ? 'Live' : 'Under review'; data.builderName = data.builderName || bu.name; }
    if (!team && a !== me && b !== me) continue;   // can't write a record you are not part of
    const old = existing.get(id) || null;
    if (!team && old && old.a !== me && old.b !== me) continue;   // can't take over someone else's record
    if (col === 'relocations' && old && old.a !== me && !team && old.a !== a) continue;
    if (col === 'inventory' && old && old.a !== a) continue;   // a unit can't be moved to another builder   // an employee can't move a case to another company
    if (col === 'users' && !isDemo(env, me)) {           // verification status is set by the server only
      const prev = old ? JSON.parse(old.data) : {};
      // builders/developers, companies and managed owners are created by Keetown after a tie-up (or are a builder's invited worker)
      if (PARTNER_ROLES.includes(data.role) && prev.role !== data.role && !(data.role === 'builder' && data.profile && data.profile.staffOf && await isWorker(env, data.profile.staffOf, me))) { rejected.push(id); continue; }
      if (prev.partner) { data.partner = prev.partner; data.role = prev.role; if (prev.profile && prev.profile.managed) data.profile = { ...data.profile, managed: true }; }
      data.verified = prev.verified || { status: false }; delete data.demo; delete data.staff;
      if (!data.verified.status) {   // employees added by a client company are vouched for by their employer
        const rel = await env.DB.prepare("SELECT data FROM records WHERE col = 'relocations' AND b = ?").bind(me).first();
        if (rel) { const r = JSON.parse(rel.data); if (r.status === 'Active') data.verified = { status: true, method: 'company', name: r.employeeName || '', company: r.companyName || '', at: new Date().toISOString() }; }
      }
    }
    if (col === 'relocations' && data.lock && data.lock.pid && LOCK_OPEN.includes(data.lock.status)) {   // one active lock per home
      const others = await rows(env, "SELECT id, data FROM records WHERE col = 'relocations' AND id != ?", id);
      if (others.some(o => { const x = JSON.parse(o.data); return x.status === 'Active' && x.lock && x.lock.pid === data.lock.pid && LOCK_OPEN.includes(x.lock.status); })) { conflicts.push(id); continue; }
    }
    stmts.push(env.DB.prepare('INSERT OR REPLACE INTO records (col, id, a, b, data, updated) VALUES (?, ?, ?, ?, ?, ?)').bind(col, id, a, b, JSON.stringify(data), now));
  }
  for (const id of del) {
    if (typeof id !== 'string') continue;
    if (col === 'leads') { if (s && s.staff) stmts.push(env.DB.prepare('DELETE FROM records WHERE col = ? AND id = ?').bind(col, id)); continue; }
    if (['tenancies', 'relocations', 'offices'].includes(col)) continue;   // shared records are closed, never deleted from one side
    if (col === 'inventory') { stmts.push(s.staff ? env.DB.prepare("DELETE FROM records WHERE col = 'inventory' AND id = ?").bind(id) : env.DB.prepare("DELETE FROM records WHERE col = 'inventory' AND id = ? AND (a = ? OR a IN (SELECT a FROM records WHERE col = 'teams' AND b = ?))").bind(id, me, me)); continue; }
    stmts.push(env.DB.prepare('DELETE FROM records WHERE col = ? AND id = ? AND (a = ? OR b = ?)').bind(col, id, me, me));
    if (col === 'users' && id === me) stmts.push(env.DB.prepare("DELETE FROM records WHERE col IN ('blob','purchases','submissions') AND a = ?").bind(me), env.DB.prepare('DELETE FROM sessions WHERE mobile = ?').bind(me));
  }
  if (stmts.length) await env.DB.batch(stmts);
  return json({ ok: true, written: stmts.length, conflicts, rejected });
}

async function isWorker(env, builder, me) { return !!(await env.DB.prepare("SELECT 1 FROM records WHERE col = 'teams' AND a = ? AND b = ?").bind(builder, me).first()); }
const _bcache = new Map();
async function builderInfo(env, m) {
  if (_bcache.has(m)) return _bcache.get(m);
  if (isStaff(env, m)) { const v = { verified: true, name: 'Keetown Realty' }; _bcache.set(m, v); return v; }   // Keetown's own stock
  const r = await env.DB.prepare("SELECT data FROM records WHERE col = 'users' AND id = ?").bind(m).first(); const u = r ? JSON.parse(r.data) : {};
  const v = { verified: !!(u.verified && u.verified.status) || (env.DEMO_ACCOUNTS === '1' && DEMO.includes(m)), name: (u.profile && u.profile.company) || '' }; _bcache.set(m, v); return v;
}
const PUBLIC_UNIT = ['listing', 'id', 'project', 'tower', 'unitNo', 'type', 'beds', 'area', 'floor', 'totalFloors', 'facing', 'mode', 'price', 'loc', 'possession', 'furnishing', 'parking', 'amenities', 'notes', 'builderName', 'rera', 'updated'];

/* ---------- DigiLocker (MeriPehchaan OAuth 2.0 + PKCE) ---------- */
const DL = 'https://digilocker.meripehchaan.gov.in/public/oauth2/1';
const safeReturn = r => (typeof r === 'string' && r.startsWith('/') && !r.startsWith('//')) ? r : '/portal.html';
async function dlStart(env, s, url) {
  const ret = safeReturn(url.searchParams.get('return'));
  if (!env.DIGILOCKER_CLIENT_ID || !env.DIGILOCKER_CLIENT_SECRET) return Response.redirect(new URL(ret + (ret.includes('?') ? '&' : '?') + 'dl=unavailable', url), 302);
  const state = rand(16), verifier = rand(32), challenge = await sha256(verifier);
  await env.DB.prepare('INSERT INTO dl_state (state, verifier, mobile, ret, created) VALUES (?, ?, ?, ?, ?)').bind(state, verifier, s.mobile, ret, Date.now()).run();
  const q = new URLSearchParams({ response_type: 'code', client_id: env.DIGILOCKER_CLIENT_ID, redirect_uri: env.DIGILOCKER_REDIRECT, state, code_challenge: challenge, code_challenge_method: 'S256' });
  return Response.redirect(DL + '/authorize?' + q, 302);
}
async function dlCallback(env, url) {
  const state = url.searchParams.get('state'), code = url.searchParams.get('code');
  const st = state && await env.DB.prepare('SELECT verifier, mobile, ret, created FROM dl_state WHERE state = ?').bind(state).first();
  if (!st || Date.now() - st.created > 15 * 6e4) return Response.redirect(new URL('/portal.html?dl=failed', url), 302);
  await env.DB.prepare('DELETE FROM dl_state WHERE state = ?').bind(state).run();
  const back = q => Response.redirect(new URL(st.ret + (st.ret.includes('?') ? '&' : '?') + 'dl=' + q, url), 302);
  if (!code) return back('cancelled');
  const r = await fetch(DL + '/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: env.DIGILOCKER_CLIENT_ID, client_secret: env.DIGILOCKER_CLIENT_SECRET, redirect_uri: env.DIGILOCKER_REDIRECT, code_verifier: st.verifier }) });
  if (!r.ok) return back('failed');
  const t = await r.json();   // keep only the verified name + status; never store Aadhaar numbers or documents
  const row = await env.DB.prepare("SELECT data FROM records WHERE col = 'users' AND id = ?").bind(st.mobile).first();
  if (!row) return back('failed');
  const u = JSON.parse(row.data); u.verified = { status: true, method: 'digilocker', name: t.name || '', at: new Date().toISOString() };
  await env.DB.prepare("UPDATE records SET data = ?, updated = ? WHERE col = 'users' AND id = ?").bind(JSON.stringify(u), Date.now(), st.mobile).run();
  return back('ok');
}

/* ---------- router ---------- */
export async function onRequest({ request: req, env, params }) {
  const url = new URL(req.url), path = '/' + [].concat(params.path || []).join('/'), M = req.method;
  if (!env.DB) return err('Database not bound', 500);
  if (M === 'POST' && req.headers.get('Origin') && new URL(req.headers.get('Origin')).host !== url.host) return err('Bad origin', 403);
  const body = M === 'POST' ? await req.json().catch(() => ({})) : {};
  const ip = req.headers.get('CF-Connecting-IP') || '';
  try {
    if (path === '/health') return json({ ok: true, sms: provider(env) || 'not configured', digilocker: !!(env.DIGILOCKER_CLIENT_ID && env.DIGILOCKER_CLIENT_SECRET), demo: env.DEMO_ACCOUNTS === '1' });

    if (path === '/otp/send' && M === 'POST') {
      const { mobile } = body; if (!validMobile(mobile)) return err('Enter a valid 10-digit Indian mobile number.');
      if (isDemo(env, mobile)) return json({ ok: true, demo: true });
      const hr = Date.now() - 36e5;
      const [byM, byIp] = await Promise.all([env.DB.prepare('SELECT COUNT(*) n FROM otp_log WHERE mobile = ? AND at > ?').bind(mobile, hr).first(), env.DB.prepare('SELECT COUNT(*) n FROM otp_log WHERE ip = ? AND at > ?').bind(ip, hr).first()]);
      if (byM.n >= 5 || byIp.n >= 20) return err('Too many OTP requests. Please try again in an hour.', 429);
      const ok = await sendOtp(env, mobile);
      if (ok === 'unconfigured') return err('SMS login is being set up. Please message us on WhatsApp and our team will help you right away.', 503);
      if (!ok) return err('Could not send the OTP. Please try again.', 502);
      await env.DB.prepare('INSERT INTO otp_log (mobile, ip, at) VALUES (?, ?, ?)').bind(mobile, ip, Date.now()).run();
      return json({ ok: true });
    }
    if (path === '/otp/verify' && M === 'POST') {
      const { mobile, otp } = body; if (!validMobile(mobile) || !/^\d{6}$/.test(otp || '')) return err('Incorrect OTP. Please try again.');
      const ok = isDemo(env, mobile) ? otp === '123456' : await checkOtp(env, mobile, otp);
      if (!ok) return err('Incorrect OTP. Please try again.', 401);
      const id = rand(32), now = Date.now();
      if (isDemo(env, mobile) && mobile === '9000000007') await env.DB.prepare("INSERT OR IGNORE INTO records (col, id, a, b, data, updated) VALUES ('teams', 'tm9000000005_9000000007', '9000000005', '9000000007', ?, ?)").bind(JSON.stringify({ id: 'tm9000000005_9000000007', builder: '9000000005', builderName: 'Skyline Developers (demo)', worker: '9000000007', workerName: 'Kiran Rao', role: 'Uploader', at: new Date().toISOString() }), now).run();
      await env.DB.batch([env.DB.prepare('INSERT INTO sessions (id, mobile, created, expires) VALUES (?, ?, ?, ?)').bind(id, mobile, now, now + SESSION_DAYS * DAY), env.DB.prepare('DELETE FROM sessions WHERE expires < ?').bind(now)]);
      return json({ ok: true, mobile, staff: isStaff(env, mobile), demo: isDemo(env, mobile) }, 200, { 'Set-Cookie': setCookie(id, SESSION_DAYS * 86400) });
    }
    if (path === '/digilocker/callback') return dlCallback(env, url);
    if (path === '/inventory' && M === 'GET') {   // public: live, available builder units (no personal data)
      const out = (await rows(env, "SELECT data FROM records WHERE col = 'inventory' ORDER BY updated DESC LIMIT 5000")).map(r => JSON.parse(r.data))
        .filter(u => u.review === 'Live' && u.status === 'Available').map(u => Object.fromEntries(PUBLIC_UNIT.map(k => [k, u[k]])));
      return json(out, 200, { 'Cache-Control': 'public, max-age=60' });
    }

    const s = await session(env, req);
    if (path === '/logout' && M === 'POST') { if (s) await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(s.id).run(); return json({ ok: true }, 200, { 'Set-Cookie': setCookie('', 0) }); }
    if (path === '/sync' && M === 'POST') return sync(env, s, body);
    if (path === '/demo/reset' && M === 'POST') {
      if (env.DEMO_ACCOUNTS !== '1') return err('Demo accounts are off', 403);
      const q = DEMO.map(() => '?').join(',');
      await env.DB.batch([env.DB.prepare(`DELETE FROM records WHERE col != 'leads' AND (a IN (${q}) OR b IN (${q}))`).bind(...DEMO, ...DEMO), env.DB.prepare(`DELETE FROM sessions WHERE mobile IN (${q})`).bind(...DEMO)]);
      return json({ ok: true });
    }
    if (!s) return err('Please log in', 401);
    if (path === '/state' && M === 'GET') return json(await state(env, s));
    if (path === '/staff/invite' && M === 'POST') {   // Keetown creates a partner login after the tie-up
      if (!s.staff) return err('Staff only', 403);
      const { mobile, type, name, company } = body; if (!validMobile(mobile) || !name) return err('Name and a valid mobile are required.');
      const role = type === 'company' ? 'company' : type === 'managed' ? 'owner' : 'builder';
      const row = await env.DB.prepare("SELECT data FROM records WHERE col = 'users' AND id = ?").bind(mobile).first(); const prev = row ? JSON.parse(row.data) : null;
      const u = { ...(prev || { mobile, created: new Date().toISOString(), consent: {} }), role, partner: { type, since: new Date().toISOString(), by: s.mobile },
        profile: { ...((prev && prev.profile) || {}), name, company: company || (prev && prev.profile && prev.profile.company) || '', ...(type === 'managed' ? { managed: true } : {}) },
        verified: { status: true, method: 'keetown', name: company || name, at: new Date().toISOString() } };
      await env.DB.prepare("INSERT OR REPLACE INTO records (col, id, a, b, data, updated) VALUES ('users', ?, ?, NULL, ?, ?)").bind(mobile, mobile, JSON.stringify(u), Date.now()).run();
      return json({ ok: true, role });
    }
    if (path === '/staff/partners' && M === 'GET') {
      if (!s.staff) return err('Staff only', 403);
      return json((await rows(env, "SELECT data FROM records WHERE col = 'users'")).map(r => JSON.parse(r.data)).filter(u => u.partner).map(u => ({ mobile: u.mobile, role: u.role, type: u.partner.type, since: u.partner.since, name: u.profile && u.profile.name, company: u.profile && u.profile.company })));
    }
    if (path === '/staff/verify' && M === 'POST') {   // Keetown team approves a builder (RERA/GST checked) or any account
      if (!s.staff) return err('Staff only', 403);
      const row = validMobile(body.mobile) && await env.DB.prepare("SELECT data FROM records WHERE col = 'users' AND id = ?").bind(body.mobile).first();
      if (!row) return err('No such account', 404);
      const u = JSON.parse(row.data); u.verified = { status: true, method: 'keetown', name: (u.profile && (u.profile.company || u.profile.name)) || '', at: new Date().toISOString() };
      const units = (await rows(env, "SELECT id, data FROM records WHERE col = 'inventory' AND a = ?", body.mobile)).map(r => { const d = JSON.parse(r.data); d.review = 'Live'; return env.DB.prepare("UPDATE records SET data = ? WHERE col = 'inventory' AND id = ?").bind(JSON.stringify(d), r.id); });
      await env.DB.batch([env.DB.prepare("UPDATE records SET data = ? WHERE col = 'users' AND id = ?").bind(JSON.stringify(u), body.mobile), ...units]);
      return json({ ok: true, unitsLive: units.length });
    }
    if (path === '/inventory/mine' && M === 'GET') {   // a builder's own units, plus units of builders I work for (Keetown staff: everything)
      if (s.staff) return json((await rows(env, "SELECT data FROM records WHERE col = 'inventory'")).map(r => JSON.parse(r.data)));
      const bs = [s.mobile, ...(await rows(env, "SELECT a FROM records WHERE col = 'teams' AND b = ?", s.mobile)).map(r => r.a)];
      const q = bs.map(() => '?').join(',');
      return json((await rows(env, `SELECT data FROM records WHERE col = 'inventory' AND a IN (${q})`, ...bs)).map(r => JSON.parse(r.data)));
    }
    if (path === '/locks' && M === 'GET') {   // ids of homes reserved through company relocations (no personal data)
      const ids = (await rows(env, "SELECT data FROM records WHERE col = 'relocations'")).map(r => JSON.parse(r.data)).filter(x => x.status === 'Active' && x.lock && LOCK_OPEN.includes(x.lock.status)).map(x => x.lock.pid);
      return json([...new Set(ids)]);
    }
    if (path === '/leads' && M === 'GET') {
      if (!s.staff) return err('Staff only', 403);
      return json((await rows(env, "SELECT data FROM records WHERE col = 'leads' ORDER BY updated DESC LIMIT 2000")).map(r => JSON.parse(r.data)));
    }
    if (path === '/digilocker/start') return dlStart(env, s, url);
    return err('Not found', 404);
  } catch (e) { console.error(e); return err('Server error', 500); }
}
