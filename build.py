#!/usr/bin/env python3
"""Keetown Realty static site generator.

Edit data/catalog.json, then run:  python3 build.py

Generates:
  js/data.js                    shared data for every page (do not edit by hand)
  property/<slug>.html          one page per listing
  localities/<slug>.html        one guide per locality
  properties.html               all listings with URL-synced filters
  localities.html               index of locality guides
  sitemap.xml, robots.txt
"""
import json, re, math, html, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CAT = json.loads((ROOT / 'data/catalog.json').read_text(encoding='utf-8'))
B, LOCS, PROPS = CAT['brand'], CAT['localities'], CAT['properties']
SITE = B['site'].rstrip('/')
TODAY = datetime.date.today().isoformat()
e = lambda s: html.escape(str(s), quote=True)
slugify = lambda s: re.sub(r'-+', '-', re.sub(r'[^a-z0-9]+', '-', s.lower())).strip('-')
for l in LOCS: l['slug'] = slugify(l['name'])
LOC = {l['id']: l for l in LOCS}

# ---------------------------------------------------------------- formatting
def inr(n):
    s = str(int(round(n))); last, rest = s[-3:], s[:-3]
    return (re.sub(r'(\d)(?=(\d\d)+$)', r'\1,', rest) + ',' + last) if rest else last
def lakh(l):
    return f"₹{l / 100:.2f}".rstrip('0').rstrip('.') + ' Cr' if l >= 100 else f"₹{l:g} L"
def price(p): return f"₹{inr(p['price'])}/mo" if p['mode'] == 'rent' else lakh(p['price'])
def sqft(p): return p['area'] * 9 if p['unit'] == 'sq.yd' else p['area']
def per_sqft(p): return f"₹{inr(p['price'] * 1e5 / sqft(p))}/sq.ft" if p['mode'] == 'sale' else ''
def bhk(p): return f"{p['beds']} BHK" if p['beds'] else p['type']
def rupees(p): return p['price'] * 1e5 if p['mode'] == 'sale' else p['price']
def km(a, b):
    R, (la1, lo1, la2, lo2) = 6371, map(math.radians, (a['lat'], a['lng'], b['lat'], b['lng']))
    return 2 * R * math.asin(math.sqrt(math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2))
def osm(l, z=0.02):
    return (f"https://www.openstreetmap.org/export/embed.html?bbox={l['lng'] - z:.4f}%2C{l['lat'] - z * .6:.4f}%2C{l['lng'] + z:.4f}%2C{l['lat'] + z * .6:.4f}"
            f"&layer=mapnik&marker={l['lat']:.4f}%2C{l['lng']:.4f}"), f"https://www.openstreetmap.org/?mlat={l['lat']:.4f}&mlon={l['lng']:.4f}#map=14/{l['lat']:.4f}/{l['lng']:.4f}"
def wa(text): return 'https://wa.me/' + B['phone'] + '?text=' + re.sub(r'[^A-Za-z0-9\-_.~]', lambda m: ''.join(f'%{b:02X}' for b in m.group(0).encode()), text)

# ---------------------------------------------------------------- copy
def describe(p):
    l = LOC[p['loc']]; amen = ', '.join(a.lower() for a in p['amen'][:-1]) + ' and ' + p['amen'][-1].lower()
    if p['mode'] == 'rent':
        k = p['price'] / 1000
        ctx = (f"For context, 2BHK homes in {l['name']} typically rent for ₹{l['rent2'][0]}k–{l['rent2'][1]}k a month."
               if p['type'] != 'Commercial' else f"{l['name']} is one of Hyderabad's most established office districts.")
        return (f"{p['furnishing']} {bhk(p).lower() if p['beds'] else p['type'].lower()} of {inr(p['area'])} {p['unit']} in {l['name']}, "
                f"{'facing ' + p['facing'].lower() + ', ' if p['facing'] != '—' else ''}available at ₹{inr(p['price'])} a month ({p['status'].lower()}). "
                f"The building offers {amen}. {ctx} {l['vibe']}")
    rate = p['price'] * 1e5 / sqft(p); lo, hi = l['sale']
    pos = 'below' if rate < lo else 'above' if rate > hi else 'within'
    if p['type'] == 'Plot':
        return (f"A {inr(p['area'])} sq.yd {p['facing'].lower()}-facing plot in {l['name']} ({p['status'].lower()}), asking {price(p)} "
                f"— about ₹{inr(p['price'] * 1e5 / p['area'])} per sq.yd. Layout features: {amen}. {l['vibe']}")
    return (f"A {p['beds']}-bedroom {p['type'].lower()} of {inr(p['area'])} sq.ft in {l['name']}, {p['facing'].lower()}-facing "
            f"({'Vastu-preferred' if p['facing'] in ('East', 'North') else 'check Vastu preferences'}). {p['status']}. "
            f"Asking {price(p)} ({per_sqft(p)}), which sits {pos} the indicative {l['name']} band of ₹{inr(lo)}–₹{inr(hi)} per sq.ft. "
            f"Amenities include {amen}. {l['vibe']}")

SUITS = {'Luxury': 'Buyers looking for premium, amenity-rich towers', 'High-rise': 'Families who want views and gated security', 'ORR': 'Commuters who use the Outer Ring Road daily',
         'IT': 'IT professionals who want a short commute', 'Gated': 'Families who prefer gated communities', 'Walk-to-work': 'People who want to walk or cycle to work',
         'Rental demand': 'Investors who want steady tenant demand', 'Schools': 'Parents who want good schools nearby', 'Metro': 'Tenants and buyers who rely on the metro',
         'Offices': 'Companies and professionals near major offices', 'Nightlife': 'Young professionals who want cafes and nightlife', 'Mid-premium': 'Buyers wanting quality without luxury pricing',
         'Apartments': 'Apartment buyers with plenty of choice', 'Family': 'Families wanting space and daily conveniences', 'Value': 'First-time buyers and value-focused tenants',
         'Villas': 'Villa and independent-house seekers', 'Emerging': 'Long-horizon investors in a growing area', 'First-home': 'First-home buyers on a budget',
         'Liquid': 'Owners who may want to resell quickly', 'Retail': 'People who want shops and markets close by', 'Ultra-luxury': 'Ultra-premium buyers and HNIs',
         'Independent houses': 'Buyers seeking standalone homes', 'Central': 'People who want a central city address', 'Plots': 'Plot buyers planning to build later',
         'Airport': 'Frequent flyers and airport-linked businesses', 'Investor': 'Investors comfortable with a longer holding period'}

def faqs(l):
    n, (lo, hi), (r0, r1) = l['name'], l['sale'], l['rent2']
    return [
        (f"What is the price per sq.ft in {n}?", f"Apartments in {n} are indicatively priced between ₹{inr(lo)} and ₹{inr(hi)} per sq.ft. Project, floor, facing and possession date move the price, so ask Keetown for live rates on a specific project."),
        (f"How much is a 2BHK rent in {n}?", f"A typical 2BHK in {n} rents for about ₹{r0},000–₹{r1},000 a month, depending on furnishing, building age and the gated community."),
        (f"Is {n} good for investment?", f"{n} shows an indicative gross rental yield of about {l['yield']}% with a {l['growth'].lower()} growth outlook. Like most of Hyderabad, returns are mostly appreciation-led, so treat rent as your carrying-cost offset."),
        (f"How well connected is {n}?", f"Key connectivity: {l['metro']}. {l['vibe']}"),
    ]

# ---------------------------------------------------------------- shell
WA_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3z"/></svg>'
PIN = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>'

def shell(*, title, desc, path, body, pre, cur='', jsonld=(), scripts=(), robots='index,follow', og_type='website', head=''):
    canon = f"{SITE}/{path}"
    nav = [('properties.html', 'Properties'), ('localities.html', 'Localities'), ('management.html', 'Property management'), ('index.html#tools', 'Calculators'), ('post-property.html', 'Post property <b class="free">FREE</b>')]
    cls = lambda h: ' class="cur"' if cur == h else ''
    links = ''.join(f'<a href="{pre}{h}"{cls(h)}>{t}</a>' for h, t in nav)
    ld = ''.join(f'<script type="application/ld+json">{json.dumps(j, ensure_ascii=False)}</script>' for j in jsonld)
    js = ''.join(f'<script src="{s if s.startswith("http") else pre + s}"></script>' for s in scripts)
    return f"""<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{canon}">
<meta property="og:type" content="{og_type}"><meta property="og:site_name" content="Keetown Realty"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{canon}"><meta property="og:image" content="{SITE}/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#1e4386">
<link rel="icon" href="{pre}assets/brand/mark.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<script>if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion')</script>
<link rel="stylesheet" href="{pre}css/site.css">
<link rel="stylesheet" href="{pre}css/pages.css">
{head}
{ld}
</head>
<body class="pg-body">
<div class="util"><div class="wrap"><div><span>Hyderabad, Telangana</span><span id="uRera"></span></div><div><a href="#" data-wa="Hi Keetown Realty, I have an enquiry.">WhatsApp us</a><span><a id="uPhone" href="#"></a></span></div></div></div>
<header class="nav solid" id="nav">
  <a class="logo" href="{pre}index.html" aria-label="Keetown Realty home"><img class="logo-img" src="{pre}assets/brand/logo.svg" alt="Keetown Realty" width="139" height="56"></a>
  <nav class="nav-links" id="navLinks" aria-label="Primary">{links}<a href="{pre}login.html" class="btn btn-gold" id="navLogin">Login / Register</a></nav>
  <button class="burger" id="burger" aria-label="Menu" aria-expanded="false"><span></span><span></span></button>
</header>
<main>
{body}
</main>
<footer class="foot"><div class="wrap foot-grid">
  <div><img class="foot-logo" src="{pre}assets/brand/logo-white.svg" alt="Keetown Realty" width="129" height="52"><p id="fRera">{e(B['reraNo'])}</p></div>
  <div><a href="{pre}properties.html">All properties</a><a href="{pre}localities.html">Locality guides</a><a href="{pre}management.html">Property management</a><a href="{pre}index.html#tools">Calculators</a></div>
  <div><a href="{pre}login.html">Client login</a><p class="fine">Listings and market figures are indicative samples. Always verify RERA, title and approvals independently.</p></div>
</div></footer>
<a class="fab" id="fab" href="#" target="_blank" rel="noopener" aria-label="Chat with Keetown Realty on WhatsApp">{WA_SVG}<span>Chat on WhatsApp</span></a>
<div class="toast" id="toast" role="status"></div>
<script src="{pre}js/data.js"></script>
<script src="{pre}js/art.js"></script>
<script src="{pre}js/auth.js"></script>
<script src="{pre}js/track.js"></script>
<script src="{pre}js/lead.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js"></script>
<script src="{pre}js/motion.js"></script>
{js}
</body>
</html>
"""

def card(p, pre):
    l = LOC[p['loc']]
    return f"""<article class="card"><a class="card-link" href="{pre}property/{p['slug']}.html" aria-label="{e(p['title'])}"></a>
  <div class="art" data-art="{p['id']}"></div><span class="badge">{e(p['badge'])}</span>{'<span class="rera">RERA ✓</span>' if p['rera'] else ''}
  <div class="body"><h3>{e(p['title'])}</h3><div class="where">{e(l['name'])} · {e(p['type'])}</div>
  <div class="price">{price(p)}<small>{per_sqft(p)}</small></div>
  <div class="chips"><span>{bhk(p)}</span><span>{inr(p['area'])} {p['unit']}</span>{f"<span>{p['facing']} facing</span>" if p['facing'] != '—' else ''}</div></div></article>"""

def crumbs(items):
    lis = ''.join((f'<li><a href="{h}">{e(t)}</a></li>' if h else f'<li><span aria-current="page">{e(t)}</span></li>') for h, t in items)
    return f'<nav class="crumbs" aria-label="Breadcrumb"><ol>{lis}</ol></nav>'
def crumb_ld(items):
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': t, **({'item': u} if u else {})} for i, (u, t) in enumerate(items)]}

# ---------------------------------------------------------------- property page
def property_page(p):
    pre, l = '../', LOC[p['loc']]
    path = f"property/{p['slug']}.html"
    sale = p['mode'] == 'sale'
    title = f"{p['title']} — {price(p)} | Keetown Realty"
    desc = f"{bhk(p)} {p['type'].lower()} {'for sale' if sale else 'for rent'} in {l['name']}, Hyderabad: {price(p)}, {inr(p['area'])} {p['unit']}, {p['facing']} facing. {p['status']}."
    facts = [('Price', price(p)), ('Rate', per_sqft(p) or '—'), ('Size', f"{inr(p['area'])} {p['unit']}"), ('Configuration', bhk(p) + (f" · {p['baths']} bath" if p['baths'] else '')),
             ('Facing', p['facing']), ('Status', p['status']), ('Furnishing', p['furnishing']), ('RERA', 'Registered' if p['rera'] else 'Not applicable / verify')]
    facts_html = ''.join(f'<div><dt>{k}</dt><dd>{e(v)}</dd></div>' for k, v in facts)
    amen = ''.join(f'<li>{e(a)}</li>' for a in p['amen'])
    if sale:
        base = p['price'] * 1e5; reg = base * 0.06; uc = 'construction' in p['status'].lower() or 'possession' in p['status'].lower()
        gst = base * 0.05 if uc else 0
        cost = f"""<table class="cost"><tbody>
<tr><td>Asking price</td><td>₹{inr(base)}</td></tr>
<tr><td>Stamp duty, transfer duty &amp; registration (~6% in Telangana)</td><td>₹{inr(reg)}</td></tr>
{f'<tr><td>GST on under-construction homes (typically 5%, may vary)</td><td>₹{inr(gst)}</td></tr>' if uc else ''}
<tr class="tot"><td>Estimated outlay before loan fees &amp; interiors</td><td>₹{inr(base + reg + gst)}</td></tr></tbody></table>
<div class="emi" data-price="{base:.0f}"><h3>Monthly EMI</h3>
<label>Down payment <output data-o="dp"></output><input type="range" data-i="dp" min="10" max="80" step="5" value="20"></label>
<label>Interest rate <output data-o="rate"></output><input type="range" data-i="rate" min="7" max="11" step="0.05" value="8.5"></label>
<label>Tenure <output data-o="yrs"></output><input type="range" data-i="yrs" min="5" max="30" step="1" value="20"></label>
<p class="emi-out"><span>Estimated EMI</span><strong data-o="emi">—</strong></p></div>"""
    else:
        cost = f"""<table class="cost"><tbody>
<tr><td>Monthly rent</td><td>₹{inr(p['price'])}</td></tr>
<tr><td>Security deposit (commonly 2–3 months in Hyderabad, negotiable)</td><td>₹{inr(p['price'] * 2)} – ₹{inr(p['price'] * 3)}</td></tr>
<tr><td>Maintenance</td><td>As per society</td></tr>
<tr class="tot"><td>Typical move-in outlay (rent + deposit)</td><td>₹{inr(p['price'] * 3)} – ₹{inr(p['price'] * 4)}</td></tr></tbody></table>"""
    checks = ['Title chain and ownership documents', 'RERA registration (for projects)', 'HMDA / DTCP layout and building approvals', 'Encumbrance certificate (EC)', 'Tax, utility and society dues cleared'] if sale else \
             ['Owner identity verified (DigiLocker)', 'Clause-checked rental agreement', 'Society rules for tenants confirmed', 'Dated move-in condition report with photos', 'Police-verification support']
    checks_html = ''.join(f'<li>{e(c)}</li>' for c in checks)
    sim = sorted([q for q in PROPS if q['id'] != p['id'] and q['mode'] == p['mode']], key=lambda q: (q['loc'] != p['loc'], abs(math.log(q['price'] / p['price']))))[:3]
    emb, big = osm(l)
    wa_msg = f"Hi Keetown Realty, I'm interested in \"{p['title']}\" ({price(p)}), listing {p['id'].upper()}. Please share details and a visit slot."
    body = f"""<div class="wrap pg">
{crumbs([(pre + 'index.html', 'Home'), (pre + 'properties.html', 'Properties'), (pre + 'localities/' + l['slug'] + '.html', l['name']), (None, p['title'])])}
<div class="pd-grid">
 <div class="pd-main">
  <div class="gallery"><div class="g-main" data-art="{p['id']}" data-w="900" data-h="520"></div>
   <div class="g-thumbs"><div data-art="{p['id']}" data-shift="18"></div><div data-art="{p['id']}" data-shift="-22"></div><div data-art="{p['id']}" data-shift="40"></div></div>
   <span class="badge">{e(p['badge'])}</span>{'<span class="rera">RERA ✓</span>' if p['rera'] else ''}<p class="g-note">Illustration. Real photos and a video walkthrough on request.</p></div>
  <header class="pd-head"><p class="kind">{'For sale' if sale else 'For rent'} · {e(p['type'])} · ID {p['id'].upper()}</p><h1>{e(p['title'])}</h1>
   <p class="pd-loc">{PIN} <a href="{pre}localities/{l['slug']}.html">{e(l['name'])}</a>, Hyderabad · {e(l['zone'])}</p></header>
  <dl class="facts">{facts_html}</dl>
  <section class="pd-sec"><h2>About this property</h2><p>{e(describe(p))}</p></section>
  <section class="pd-sec"><h2>Amenities</h2><ul class="amen">{amen}</ul></section>
  <section class="pd-sec"><h2>{'What it really costs' if sale else 'What you will pay'}</h2>{cost}<p class="fine">Indicative. Duties, GST and deposits depend on the deal; we confirm exact figures before you commit.</p></section>
  <section class="pd-sec"><h2>Before you pay a token, we check</h2><ul class="checks">{checks_html}</ul></section>
  <section class="pd-sec"><h2>Living in {e(l['name'])}</h2>
   <div class="loc-snap"><div><small>Sale band</small><b>₹{inr(l['sale'][0])}–{inr(l['sale'][1])}/sq.ft</b></div><div><small>2BHK rent</small><b>₹{l['rent2'][0]}k–{l['rent2'][1]}k</b></div><div><small>Gross yield</small><b>~{l['yield']}%</b></div><div><small>Connectivity</small><b>{e(l['metro'])}</b></div></div>
   <div class="map"><iframe title="Map of {e(l['name'])}" loading="lazy" src="{emb}"></iframe><p class="fine">Approximate locality centre, not the exact address. <a href="{big}" target="_blank" rel="noopener">Open larger map</a> · <a href="{pre}localities/{l['slug']}.html">Read the {e(l['name'])} guide →</a></p></div>
  </section>
 </div>
 <aside class="pd-side"><div class="side-card">
  <p class="kind">{'Asking price' if sale else 'Monthly rent'}</p><p class="side-price">{price(p)}</p><p class="side-sub">{per_sqft(p) or (p['furnishing'] + ' · ' + p['status'])}</p>
  {f'<p class="side-emi">EMI from <strong data-o="emi-side">—</strong>/month</p>' if sale else ''}
  <a class="btn btn-wa wide" target="_blank" rel="noopener" href="{wa(wa_msg)}">{WA_SVG} Enquire on WhatsApp</a>
  <button class="btn btn-gold wide" data-contact="{p['id']}">Get owner &amp; visit details</button>
  <button class="btn btn-line wide" data-act="visit" data-id="{p['id']}">Request a site visit</button>
  <div class="side-row"><button class="btn btn-line" data-act="save" data-id="{p['id']}">♡ Save</button><button class="btn btn-line" data-act="share">Share</button></div>
  <p class="fine">Verified clients get priority slots. Browsing is free; no login needed to message us.</p>
 </div></aside>
</div>
<section class="pd-sec similar"><h2>Similar {'homes for sale' if sale else 'rentals'}</h2><div class="grid">{''.join(card(q, pre) for q in sim)}</div></section>
</div>
<div class="mbar"><div><b>{price(p)}</b><small>{e(l['name'])}</small></div><a class="btn btn-wa" target="_blank" rel="noopener" href="{wa(wa_msg)}">WhatsApp</a></div>"""
    typ = {'Apartment': 'Apartment', 'Villa': 'SingleFamilyResidence', 'Independent house': 'House', 'Plot': 'Place', 'Commercial': 'Place'}[p['type']]
    ld = {'@context': 'https://schema.org', '@type': 'RealEstateListing', 'name': p['title'], 'url': f"{SITE}/{path}", 'description': describe(p), 'datePosted': TODAY,
          'about': {'@type': typ, 'name': p['title'], **({'numberOfRooms': p['beds']} if p['beds'] else {}),
                    'floorSize': {'@type': 'QuantitativeValue', 'value': p['area'], 'unitCode': 'YDK' if p['unit'] == 'sq.yd' else 'FTK'},
                    'address': {'@type': 'PostalAddress', 'addressLocality': l['name'], 'addressRegion': 'Telangana', 'addressCountry': 'IN'}},
          'offers': {'@type': 'Offer', 'price': round(rupees(p)), 'priceCurrency': 'INR', 'businessFunction': 'http://purl.org/goodrelations/v1#' + ('Sell' if sale else 'LeaseOut')}}
    bc = crumb_ld([(SITE + '/', 'Home'), (SITE + '/properties.html', 'Properties'), (f"{SITE}/localities/{l['slug']}.html", l['name']), (None, p['title'])])
    return path, shell(title=title, desc=desc, path=path, body=body, pre=pre, cur='properties.html', jsonld=[ld, bc], scripts=['js/pages.js'], og_type='article')

# ---------------------------------------------------------------- locality page
def locality_page(l):
    pre, path = '../', f"localities/{l['slug']}.html"
    here = [p for p in PROPS if p['loc'] == l['id']]
    near = sorted([m for m in LOCS if m['id'] != l['id']], key=lambda m: km(l, m))[:4]
    emb, big = osm(l, .03)
    lo_all, hi_all = min(m['sale'][0] for m in LOCS), max(m['sale'][1] for m in LOCS)
    left = (l['sale'][0] - lo_all) / (hi_all - lo_all) * 100; width = (l['sale'][1] - l['sale'][0]) / (hi_all - lo_all) * 100
    suits = ''.join(f'<li>{e(SUITS.get(t, t))}</li>' for t in l['tags'])
    fq = faqs(l)
    fq_html = ''.join(f'<details><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q, a in fq)
    listings = (f'<div class="grid">{"".join(card(p, pre) for p in here)}</div>' if here else
                f'<div class="empty-box"><p>No public listings in {e(l["name"])} right now. Much of our inventory is off-market, so tell us what you need.</p><a class="btn btn-wa" target="_blank" rel="noopener" href="{wa("Hi Keetown Realty, I am looking for a property in " + l["name"] + ".")}">{WA_SVG} Ask about {e(l["name"])}</a></div>')
    near_html = ''.join(f'<a class="near" href="{m["slug"]}.html"><b>{e(m["name"])}</b><span>{km(l, m):.0f} km · ₹{inr(m["sale"][0])}–{inr(m["sale"][1])}/sq.ft</span></a>' for m in near)
    body = f"""<div class="wrap pg">
{crumbs([(pre + 'index.html', 'Home'), (pre + 'localities.html', 'Localities'), (None, l['name'])])}
<section class="lc-hero"><div><p class="kind">{e(l['zone'])} · Hyderabad</p><h1>Living &amp; investing in {e(l['name'])}</h1><p class="lede-dark">{e(l['vibe'])}</p>
 <div class="chips">{''.join(f'<span>{e(t)}</span>' for t in l['tags'])}</div>
 <div class="lc-cta"><a class="btn btn-gold" href="{pre}properties.html?loc={l['id']}">See properties in {e(l['name'])}</a><a class="btn btn-wa" target="_blank" rel="noopener" href="{wa('Hi Keetown Realty, I would like advice on ' + l['name'] + '.')}">{WA_SVG} Ask an expert</a></div></div>
 <div class="map tall"><iframe title="Map of {e(l['name'])}" loading="lazy" src="{emb}"></iframe><p class="fine">Approximate locality centre. <a href="{big}" target="_blank" rel="noopener">Open larger map</a></p></div></section>
<section class="stats">
 <div><small>Apartment price band</small><b>₹{inr(l['sale'][0])}–{inr(l['sale'][1])}</b><span>per sq.ft</span></div>
 <div><small>Typical 2BHK rent</small><b>₹{l['rent2'][0]}k–{l['rent2'][1]}k</b><span>per month</span></div>
 <div><small>Gross rental yield</small><b>~{l['yield']}%</b><span>indicative</span></div>
 <div><small>Growth outlook</small><b>{e(l['growth'])}</b><span>Keetown view</span></div>
</section>
<section class="pd-sec"><h2>Where {e(l['name'])} sits on Hyderabad's price scale</h2>
 <div class="scale"><div class="scale-bar"><i style="left:{left:.1f}%;width:{max(width, 2):.1f}%"></i></div><div class="scale-lbl"><span>₹{inr(lo_all)}/sq.ft</span><span>₹{inr(hi_all)}/sq.ft</span></div></div>
 <p class="fine">Across the {len(LOCS)} micro-markets we track. Indicative ranges; we share live, project-level rates on request.</p></section>
<section class="pd-sec"><h2>Who {e(l['name'])} suits</h2><ul class="checks">{suits}</ul><p>Connectivity: {e(l['metro'])}.</p></section>
<section class="pd-sec"><h2>Properties in {e(l['name'])}</h2>{listings}</section>
<section class="pd-sec"><h2>Search {e(l['name'])}</h2><div class="nears"><a class="near" href="../in/flats-for-rent-in-{l['slug']}.html"><b>Flats for rent</b><span>in {e(l['name'])}</span></a><a class="near" href="../in/property-for-sale-in-{l['slug']}.html"><b>Property for sale</b><span>in {e(l['name'])}</span></a></div></section>
<section class="pd-sec"><h2>Nearby localities</h2><div class="nears">{near_html}</div></section>
<section class="pd-sec faq-sec"><h2>{e(l['name'])}: common questions</h2><div class="faq">{fq_html}</div></section>
</div>"""
    title = f"{l['name']}, Hyderabad: property prices, rents & guide | Keetown Realty"
    desc = f"{l['name']} property guide: apartments at ₹{inr(l['sale'][0])}–{inr(l['sale'][1])}/sq.ft, 2BHK rents ₹{l['rent2'][0]}k–{l['rent2'][1]}k, ~{l['yield']}% yield. {l['vibe']}"
    ld_faq = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in fq]}
    ld_place = {'@context': 'https://schema.org', '@type': 'Place', 'name': f"{l['name']}, Hyderabad", 'geo': {'@type': 'GeoCoordinates', 'latitude': l['lat'], 'longitude': l['lng']}, 'address': {'@type': 'PostalAddress', 'addressLocality': l['name'], 'addressRegion': 'Telangana', 'addressCountry': 'IN'}}
    bc = crumb_ld([(SITE + '/', 'Home'), (SITE + '/localities.html', 'Localities'), (None, l['name'])])
    return path, shell(title=title, desc=desc, path=path, body=body, pre=pre, cur='localities.html', jsonld=[ld_place, ld_faq, bc], scripts=['js/pages.js'])

# ---------------------------------------------------------------- index pages
def listings_page():
    pre, path = '', 'properties.html'
    noscript = ''.join(f'<li><a href="property/{p["slug"]}.html">{e(p["title"])} — {price(p)}</a></li>' for p in PROPS)
    body = f"""<div class="srch">
<section class="console"><div class="wrap">
 {crumbs([('index.html', 'Home'), (None, 'Properties')])}
 <h1 id="sTitle">Homes for sale in Hyderabad</h1>
 <div class="console-bar">
  <div class="intent" id="intent" role="tablist" aria-label="What are you looking for"></div>
  <div class="locbox">{PIN}<div id="locChips" class="lchips"></div><input id="locInput" role="combobox" aria-autocomplete="list" aria-controls="locSug" aria-expanded="false" autocomplete="off" placeholder="Add localities, e.g. Kokapet"><ul id="locSug" class="locsug" role="listbox" hidden></ul></div>
 </div>
 <div class="rail" id="rail"></div>
</div></section>
<div class="wrap">
 <div class="res-head"><div class="res-l"><b id="count"></b><button type="button" class="link" id="clearAll">Clear filters</button><div id="applied" class="applied"></div></div>
  <div class="res-tools"><select id="sortSel" aria-label="Sort"><option value="">Relevance</option><option value="match">Recommended for you</option><option value="new">Newest first</option><option value="lo">Price: low to high</option><option value="hi">Price: high to low</option><option value="rate">Price per sq.ft</option><option value="area">Largest first</option></select>
  <div class="vt" role="group" aria-label="View"><button type="button" data-view="grid">Grid</button><button type="button" data-view="map">Map</button></div>
  <button type="button" class="btn btn-line sm" id="saveSearch">Save search</button></div></div>
 <div class="res" data-view="grid"><div id="results" class="rgrid"></div><div class="mappane"><div id="lmap"></div></div></div>
 <p class="more-w"><button type="button" class="btn btn-line" id="more">Show more</button></p>
 <section id="recent" class="recent" hidden><h2>Recently viewed</h2><div id="recentList" class="recent-l"></div></section>
 <noscript><ul class="nolist">{noscript}</ul></noscript>
</div></div>
<div class="sheet" id="sheet" hidden><div class="sheet-in" tabindex="-1" role="dialog" aria-modal="true" aria-label="All filters"><div class="sheet-h"><h2>All filters</h2><button type="button" class="x" data-close-sheet aria-label="Close">×</button></div><div id="sheetBody" class="sheet-b"></div><div class="sheet-f"><button type="button" class="link" id="clearAll2">Clear all</button><button type="button" class="btn btn-gold" data-close-sheet>Show results</button></div></div></div>
<div class="ctray" id="ctray" hidden></div>
<dialog class="modal cmp-dlg" id="cmpDlg"></dialog>"""
    head = '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css">\n<link rel="stylesheet" href="css/search.css">'
    return path, shell(title='Property for sale & rent in Hyderabad | Keetown Realty', desc='Search verified apartments, villas, plots and offices for sale and rent across Hyderabad. Filter by locality, budget, BHK, posted by, furnishing and more.',
                       path=path, body=body, pre=pre, cur='properties.html', head=head, jsonld=[crumb_ld([(SITE + '/', 'Home'), (None, 'Properties')])],
                       scripts=['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js', 'js/match.js', 'js/search.js'])

RES = ('Apartment', 'Villa', 'Independent house')
def combo_pages():
    """Programmatic landing pages: /in/<flats-for-rent|property-for-sale>-in-<locality>.html and BHK variants with inventory."""
    out = []
    for l in LOCS:
        for intent in ('rent', 'sale'):
            pool = [p for p in PROPS if p['mode'] == intent and p['type'] in RES]
            exact = [p for p in pool if p['loc'] == l['id']]
            combos = [(None, exact)] + [(n, [p for p in exact if p['beds'] == n]) for n in sorted({p['beds'] for p in exact})]
            for beds, items in combos:
                if beds is not None and not items: continue
                noun = f"{beds} BHK flats" if beds else ('Flats & homes' if intent == 'rent' else 'Flats, villas & homes')
                verb = 'for rent' if intent == 'rent' else 'for sale'
                slug = f"{(str(beds) + '-bhk-') if beds else ''}{'flats-for-rent' if intent == 'rent' else 'property-for-sale'}-in-{l['slug']}"
                path = f"in/{slug}.html"
                near = [] if items else sorted([p for p in pool if p['loc'] != l['id'] and km(l, LOC[p['loc']]) <= 7], key=lambda p: km(l, LOC[p['loc']]))[:6]
                money = f"₹{l['rent2'][0]}k–{l['rent2'][1]}k a month for a typical 2BHK" if intent == 'rent' else f"₹{inr(l['sale'][0])}–₹{inr(l['sale'][1])} per sq.ft"
                one = len(items) == 1
                nn = (noun[:-1] if one and noun.endswith('flats') else noun) if beds else ('verified home' if one else 'verified homes')
                intro = (f"{len(items)} {'verified ' if beds else ''}{nn} {verb} in {l['name']}, Hyderabad. Indicative pricing here is {money}. "
                         f"{l['vibe']} Connectivity: {l['metro']}.") if items else (f"No public {noun.lower()} {verb} in {l['name']} right now — many homes are off-market, so tell us what you need. "
                         f"Meanwhile, here are verified options within a few kilometres. Indicative pricing in {l['name']} is {money}.")
                q = f"?intent={'rent' if intent == 'rent' else 'buy'}&loc={l['id']}" + (f"&beds={beds}" if beds else '')
                siblings = ''.join(f'<a class="near" href="{"" if True else ""}{(str(n) + "-bhk-") if n else ""}{"flats-for-rent" if intent == "rent" else "property-for-sale"}-in-{l["slug"]}.html"><b>{(str(n) + " BHK") if n else "All homes"}</b><span>{verb} in {e(l["name"])}</span></a>' for n, its in combos if n != beds and (n is None or its))
                other = f'<a class="near" href="{"property-for-sale" if intent == "rent" else "flats-for-rent"}-in-{l["slug"]}.html"><b>{"Buy" if intent == "rent" else "Rent"} in {e(l["name"])}</b><span>Switch to {"sale" if intent == "rent" else "rental"} listings</span></a>'
                nearby_loc = ''.join(f'<a class="near" href="{"flats-for-rent" if intent == "rent" else "property-for-sale"}-in-{m["slug"]}.html"><b>{e(m["name"])}</b><span>{km(l, m):.0f} km away</span></a>' for m in sorted([m for m in LOCS if m['id'] != l['id']], key=lambda m: km(l, m))[:4])
                fq = faqs(l)[:3]
                title = f"{noun} {verb} in {l['name']}, Hyderabad" + (f" ({len(items)} verified)" if items else '')
                body = f"""<div class="wrap pg">
{crumbs([('../index.html', 'Home'), ('../properties.html' + q.split('&')[0], 'Rent' if intent == 'rent' else 'Buy'), ('../localities/' + l['slug'] + '.html', l['name']), (None, f"{noun} {verb}")])}
<header class="lst-head"><h1>{e(noun)} {verb} in {e(l['name'])}</h1><p class="sub">{e(intro)}</p>
<div class="lc-cta"><a class="btn btn-gold" href="../properties.html{q}">Filter &amp; compare these</a><a class="btn btn-line" href="../localities/{l['slug']}.html">{e(l['name'])} guide</a></div></header>
<section class="pd-sec">{f'<div class="grid">{"".join(card(p, "../") for p in items)}</div>' if items else f'<h2>Nearby options</h2><div class="grid">{"".join(card(p, "../") for p in near)}</div>' if near else '<div class="empty-box"><p>Nothing nearby either right now.</p></div>'}</section>
<div class="gate"><p><b>Didn't find the right one?</b> Save your requirement once. Verified clients get prime matches — including off-market homes — on WhatsApp or email, only if you opt in.</p><a class="btn btn-gold" href="../login.html?role={'tenant' if intent == 'rent' else 'buyer'}">Get matched</a></div>
<section class="pd-sec"><h2>More searches</h2><div class="nears">{siblings}{other}{nearby_loc}</div></section>
<section class="pd-sec faq-sec"><h2>{e(l['name'])}: quick answers</h2><div class="faq">{''.join(f'<details><summary>{e(a)}</summary><p>{e(b)}</p></details>' for a, b in fq)}</div></section>
</div>"""
                ld = [{'@context': 'https://schema.org', '@type': 'ItemList', 'name': title, 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'url': f"{SITE}/property/{p['slug']}.html", 'name': p['title']} for i, p in enumerate(items)]},
                      crumb_ld([(SITE + '/', 'Home'), (f"{SITE}/localities/{l['slug']}.html", l['name']), (None, f"{noun} {verb}")])]
                desc = f"{noun} {verb} in {l['name']}, Hyderabad: verified listings, {money}. Compare prices, BHK, furnishing and connectivity with Keetown Realty."
                out.append((path, shell(title=title + ' | Keetown Realty', desc=desc, path=path, body=body, pre='../', cur='properties.html', jsonld=ld, scripts=['js/pages.js'], robots='index,follow' if items else 'noindex,follow')))
    return out

def post_page():
    pre, path = '', 'post-property.html'
    opts = ''.join(f'<option value="{l["id"]}">{e(l["name"])}</option>' for l in LOCS)
    body = f"""<div class="wrap pg post">
{crumbs([('index.html', 'Home'), (None, 'Post property')])}
<div class="post-grid">
 <div>
  <header class="lst-head"><p class="kind">Free for owners &amp; builders</p><h1>List your property in 6 quick steps</h1><p class="sub">We verify every lister with DigiLocker and screen every enquiry, so you only hear from genuine tenants and buyers.</p></header>
  <ol class="psteps" id="psteps"><li>Basics</li><li>Location</li><li>Details</li><li>Price</li><li>Photos</li><li>Publish</li></ol>
  <form id="postForm" class="pform" novalidate>
   <section data-st="0"><h2>What are you listing?</h2>
    <fieldset><legend>I am</legend><div class="pills"><label><input type="radio" name="by" value="Owner" checked><span>Owner</span></label><label><input type="radio" name="by" value="Builder"><span>Builder / developer</span></label></div></fieldset>
    <fieldset><legend>I want to</legend><div class="pills"><label><input type="radio" name="mode" value="rent" checked><span>Rent it out</span></label><label><input type="radio" name="mode" value="sale"><span>Sell</span></label></div></fieldset>
    <fieldset><legend>Property type</legend><div class="pills">{''.join(f'<label><input type="radio" name="type" value="{t}" {"checked" if t == "Apartment" else ""}><span>{t}</span></label>' for t in ['Apartment', 'Villa', 'Independent house', 'Plot', 'Commercial'])}</div></fieldset></section>
   <section data-st="1" hidden><h2>Where is it?</h2>
    <label class="fl">Locality *<select name="loc" required><option value="">Select locality</option>{opts}</select></label>
    <div class="two"><label class="fl">Society / project name<input name="society" placeholder="e.g. Green Meadows"></label><label class="fl">Landmark<input name="landmark" placeholder="e.g. near ORR exit 1"></label></div>
    <label class="fl">Full address (private — shared only with verified visitors)<textarea name="address" rows="2"></textarea></label></section>
   <section data-st="2" hidden><h2>Property details</h2>
    <div class="two"><label class="fl">Bedrooms<select name="beds"><option value="0">N/A</option><option>1</option><option selected>2</option><option>3</option><option>4</option><option value="5">5+</option></select></label><label class="fl">Bathrooms<select name="baths"><option>1</option><option selected>2</option><option>3</option><option>4</option><option>5</option></select></label></div>
    <div class="two"><label class="fl">Area *<input name="area" inputmode="numeric" placeholder="e.g. 1250" required></label><label class="fl">Unit<select name="unit"><option>sq.ft</option><option>sq.yd</option></select></label></div>
    <div class="two"><label class="fl">Floor<input name="floor" inputmode="numeric" placeholder="e.g. 7"></label><label class="fl">Total floors<input name="totalFloors" inputmode="numeric" placeholder="e.g. 14"></label></div>
    <div class="two"><label class="fl">Furnishing<select name="furnishing"><option>Unfurnished</option><option>Semi-furnished</option><option>Fully furnished</option></select></label><label class="fl">Facing<select name="facing"><option>East</option><option>North</option><option>West</option><option>South</option></select></label></div>
    <div class="two"><label class="fl">Status<select name="construction"><option>Ready to move</option><option>Under construction</option></select></label><label class="fl">Parking<select name="parking"><option>0</option><option selected>1</option><option>2</option><option>3</option></select></label></div>
    <fieldset><legend>Amenities</legend><div class="pills">{''.join(f'<label><input type="checkbox" name="amen" value="{a}"><span>{a}</span></label>' for a in ['Lift', 'Power backup', 'Swimming pool', 'Gym', 'Clubhouse', 'Covered parking', 'CCTV security', 'Kids play area', 'Gas pipeline', 'Rainwater harvesting'])}</div></fieldset></section>
   <section data-st="3" hidden><h2>Price &amp; terms</h2>
    <div data-for="rent"><div class="two"><label class="fl">Monthly rent (₹) *<input name="rent" inputmode="numeric" placeholder="e.g. 35000"></label><label class="fl">Deposit<select name="deposit"><option value="2">2 months</option><option value="3">3 months</option><option value="6">6 months</option></select></label></div>
     <div class="two"><label class="fl">Available from<input type="date" name="availableFrom"></label><label class="fl">Preferred tenants<select name="tenants"><option>Anyone</option><option>Family</option><option>Bachelors</option><option>Company</option></select></label></div>
     <label class="chk"><input type="checkbox" name="pets"><span>Pets allowed</span></label></div>
    <div data-for="sale" hidden><div class="two"><label class="fl">Expected price (₹ lakh) *<input name="price" inputmode="numeric" placeholder="e.g. 120"></label><label class="fl">Possession<input name="possession" placeholder="e.g. Immediate / Dec 2027"></label></div>
     <label class="chk"><input type="checkbox" name="negotiable" checked><span>Price negotiable</span></label></div>
    <p class="val" id="benchmark"></p></section>
   <section data-st="4" hidden><h2>Photos</h2><p class="sub">Listings with 5+ clear photos get far more enquiries. Daylight, wide angle, every room.</p>
    <label class="drop"><input type="file" name="photos" accept="image/*" multiple><span>Choose photos</span><small>JPG or PNG. In this demo, photos stay on your device.</small></label><div class="thumbs" id="thumbs"></div></section>
   <section data-st="5" hidden><h2>Publish</h2><div id="publishBox"></div></section>
   <p class="err" id="pErr" role="alert"></p>
   <div class="nav-btns"><button type="button" class="btn btn-line" id="pBack">Back</button><button type="button" class="btn btn-gold" id="pNext">Continue</button></div>
  </form>
 </div>
 <aside class="pscore"><div class="side-card"><p class="kind">Listing quality</p><div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="r-bg"/><circle cx="60" cy="60" r="52" class="r-fg" id="ringFg"/></svg><b id="scoreN">0%</b></div><ul class="tips" id="tips"></ul>
  <p class="fine">After publishing, our team verifies ownership documents before the listing goes live.</p></div></aside>
</div></div>"""
    return path, shell(title='Post your property free | Keetown Realty', desc='Rent out or sell your Hyderabad property free. Verified tenants and buyers only, DigiLocker-verified listers, and optional full property management.',
                       path=path, body=body, pre=pre, cur='post-property.html', scripts=['js/post.js'])

def localities_index():
    pre, path = '', 'localities.html'
    zones = {}
    for l in LOCS: zones.setdefault(l['zone'].split(' · ')[0], []).append(l)
    count = {l['id']: sum(1 for p in PROPS if p['loc'] == l['id']) for l in LOCS}
    blocks = ''.join(f"""<section class="pd-sec"><h2>{e(z)}</h2><div class="lgrid">{''.join(f'''<a class="lcard" href="localities/{l['slug']}.html"><div class="lc-top"><b>{e(l['name'])}</b><span>{e(l['zone'])}</span></div>
<p>{e(l['vibe'])}</p><dl><div><dt>Sale</dt><dd>₹{inr(l['sale'][0])}–{inr(l['sale'][1])}</dd></div><div><dt>2BHK rent</dt><dd>₹{l['rent2'][0]}k–{l['rent2'][1]}k</dd></div><div><dt>Yield</dt><dd>~{l['yield']}%</dd></div></dl>
<span class="lc-foot">{count[l['id']]} listing{'s' if count[l['id']] != 1 else ''} · Read guide →</span></a>''' for l in ls)}</div></section>""" for z, ls in zones.items())
    body = f"""<div class="wrap pg">{crumbs([('index.html', 'Home'), (None, 'Localities')])}
<header class="lst-head"><h1>Hyderabad locality guides</h1><p class="sub">{len(LOCS)} micro-markets with indicative prices, rents, yields and who each one suits. Figures are indicative; we share live project rates on request.</p></header>
{blocks}</div>"""
    return path, shell(title='Hyderabad locality guides: prices, rents & yields | Keetown Realty', desc=f'Compare {len(LOCS)} Hyderabad localities: price per sq.ft, 2BHK rents, rental yields and connectivity for Kokapet, Gachibowli, Financial District, Kondapur, Miyapur and more.',
                       path=path, body=body, pre=pre, cur='localities.html', jsonld=[crumb_ld([(SITE + '/', 'Home'), (None, 'Localities')])])

# ---------------------------------------------------------------- data.js
def data_js():
    pub = lambda o: json.dumps(o, ensure_ascii=False, indent=1)
    return f"""/* GENERATED by build.py from data/catalog.json — edit the JSON, then run: python3 build.py
 * All prices, rents and yields are INDICATIVE PLACEHOLDERS. */
window.KT = (function () {{
  const base = (function () {{ const s = document.currentScript && document.currentScript.src; return s ? s.replace(/js\\/data\\.js(\\?.*)?$/, '') : '/'; }})();
  const brand = {pub(B)};
  const localities = {pub(LOCS)};
  const properties = {pub(PROPS)};

  const byId = (list, id) => list.find(x => x.id === id);
  const loc = id => byId(localities, id);
  const fmt = {{
    inr(n) {{ return '₹' + Number(n).toLocaleString('en-IN'); }},
    lakh(l) {{ return l >= 100 ? '₹' + (+(l / 100).toFixed(2)) + ' Cr' : '₹' + l + ' L'; }},
    price(p) {{ return p.mode === 'rent' ? '₹' + p.price.toLocaleString('en-IN') + '/mo' : fmt.lakh(p.price); }},
    perSqft(p) {{ if (p.mode !== 'sale') return ''; const sq = p.unit === 'sq.yd' ? p.area * 9 : p.area; return '₹' + Math.round((p.price * 100000) / sq).toLocaleString('en-IN') + '/sq.ft'; }},
    bhk(p) {{ return p.beds ? p.beds + ' BHK' : p.type; }}
  }};
  // Telangana: stamp duty 4% + transfer duty 1.5% + registration 0.5% (verify current rates).
  const registrationRate = 0.06;
  const wa = text => 'https://wa.me/' + brand.phone + (text ? '?text=' + encodeURIComponent(text) : '');
  const url = {{
    property: p => base + 'property/' + p.slug + '.html',
    locality: l => base + 'localities/' + l.slug + '.html',
    listings: q => base + 'properties.html' + (q && Object.keys(q).length ? '?' + new URLSearchParams(q) : '')
  }};
  return {{ base, brand, localities, properties, loc, byId, fmt, registrationRate, wa, url }};
}})();
"""

# ---------------------------------------------------------------- write
def write(path, text):
    f = ROOT / path; f.parent.mkdir(parents=True, exist_ok=True); f.write_text(text, encoding='utf-8')

def main():
    pages = []
    write('js/data.js', data_js())
    for p in PROPS: path, html_ = property_page(p); write(path, html_); pages.append(path)
    for l in LOCS: path, html_ = locality_page(l); write(path, html_); pages.append(path)
    for fn in (listings_page, localities_index, post_page): path, html_ = fn(); write(path, html_); pages.append(path)
    combos = combo_pages(); indexable = set()
    for path, html_ in combos:
        write(path, html_); pages.append(path)
        if 'noindex' not in html_[:2000]: indexable.add(path)
    # remove pages for listings/localities that no longer exist
    keep = set(pages)
    for d in ('property', 'localities', 'in'):
        for f in (ROOT / d).glob('*.html'):
            if f'{d}/{f.name}' not in keep: f.unlink()
    urls = ['', 'properties.html', 'localities.html', 'management.html', 'post-property.html'] + [p for p in pages if p not in ('properties.html', 'localities.html', 'post-property.html') and (not p.startswith('in/') or p in indexable)]
    write('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          ''.join(f'  <url><loc>{SITE}/{u}</loc><lastmod>{TODAY}</lastmod></url>\n' for u in urls) + '</urlset>\n')
    write('robots.txt', f"User-agent: *\nAllow: /\nDisallow: /os/\nDisallow: /portal.html\nDisallow: /promo/\n\nSitemap: {SITE}/sitemap.xml\n")
    print(f"built js/data.js, {len(PROPS)} property pages, {len(LOCS)} locality guides, {len(combos)} search landing pages ({len(indexable)} indexable), properties.html, localities.html, post-property.html, sitemap.xml ({len(urls)} urls), robots.txt")

# ---------------------------------------------------------------- public deploy folder
PUBLIC_EXCLUDE = {'build.py', 'data', 'dist', 'BACKEND.md', 'README.md', '.claude', '.DS_Store', '.wrangler', 'node_modules', '.git', '.gitignore', 'functions', 'schema.sql', 'wrangler.toml', 'workers'}
def dist():
    """Copy the site to dist/ for Cloudflare Pages: public site + team workspace + promo studio (noindex). Excludes data/, build.py and notes."""
    import shutil
    out = ROOT / 'dist'
    if out.exists(): shutil.rmtree(out)
    def ignore(d, names):
        rel = Path(d).relative_to(ROOT)
        skip = {n for n in names if n in PUBLIC_EXCLUDE or n.startswith('.')}
        return skip
    shutil.copytree(ROOT, out, ignore=ignore)
    for f in out.rglob('*'):   # point any hard-coded domain at the configured site address
        if f.suffix in ('.html', '.xml', '.txt', '.js') and f.is_file():
            t = f.read_text(encoding='utf-8'); t2 = t.replace('https://www.keetownrealty.in', SITE)
            if t2 != t: f.write_text(t2, encoding='utf-8')
    hide = not B.get('indexing', True)
    if hide: (out / 'robots.txt').write_text('User-agent: *\nDisallow: /\n', encoding='utf-8')
    (out / '_headers').write_text('/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()\n'
        + ('  X-Robots-Tag: noindex, nofollow\n' if hide else '') + '\n/portal.html\n  X-Robots-Tag: noindex, nofollow\n/login.html\n  X-Robots-Tag: noindex\n/os/*\n  X-Robots-Tag: noindex, nofollow\n/promo/*\n  X-Robots-Tag: noindex, nofollow\n'
        + '\n/assets/*\n  Cache-Control: public, max-age=604800\n', encoding='utf-8')
    (out / '404.html').write_text((ROOT / 'index.html').read_text(encoding='utf-8').replace('<title>', '<base href="/"><meta name="robots" content="noindex"><title>Page not found · ', 1), encoding='utf-8')
    files = [f for f in out.rglob('*') if f.is_file()]
    print(f"dist/: {len(files)} files, {sum(f.stat().st_size for f in files) / 1e6:.1f} MB · indexing {'OFF (preview)' if hide else 'ON'} · site {SITE}")

if __name__ == '__main__':
    import sys
    main()
    if '--dist' in sys.argv: dist()
