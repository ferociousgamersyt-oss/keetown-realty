"""Move the website's listings (data/catalog.json) into the inventory database as Keetown's own stock.
Run once:  python3 scripts/seed-inventory.py > /tmp/seed.sql && wrangler d1 execute keetown --remote --file /tmp/seed.sql
INSERT OR IGNORE: running it again never overwrites prices or statuses the admin has changed since."""
import json, time, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
cat = json.loads((ROOT / 'data' / 'catalog.json').read_text())
ADMIN = '6301778084'   # first mobile in STAFF_MOBILES (wrangler.toml)
locs = {l['id']: l['name'] for l in cat['localities']}
now = int(time.time() * 1000); iso = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
q = lambda s: "'" + s.replace("'", "''") + "'"
for p in cat['properties']:
    area = p['area'] * 9 if p.get('unit') == 'sq.yd' else p['area']
    unit = {'id': p['id'], 'builderMobile': ADMIN, 'builderName': 'Keetown Realty', 'project': p['title'], 'tower': '', 'unitNo': p['id'].upper(),
            'mode': p['mode'], 'type': p['type'], 'beds': p.get('beds') or 0, 'area': area, 'floor': str(p.get('floor') or ''), 'totalFloors': str(p.get('totalFloors') or ''),
            'facing': p.get('facing') or '', 'price': p['price'], 'loc': p['loc'], 'status': 'Available', 'possession': p.get('status', ''), 'furnishing': p.get('furnishing', ''),
            'parking': str(p.get('parking') or ''), 'rera': 'Yes' if p.get('rera') else '', 'notes': (' · '.join(p.get('amen') or []))[:300], 'review': 'Live',
            'sample': bool(p.get('sample')), 'listing': p, 'uploadedBy': 'catalog', 'updated': iso}
    print(f"INSERT OR IGNORE INTO records (col, id, a, b, data, updated) VALUES ('inventory', {q(p['id'])}, {q(ADMIN)}, NULL, {q(json.dumps(unit, ensure_ascii=False))}, {now});")
