# Keetown Realty

Static website + client portal + team workspace for a Hyderabad real-estate business.
No framework, no bundler. A small Python generator builds the SEO pages from one data file.

```bash
python3 build.py              # regenerate pages after editing data/catalog.json
python3 -m http.server 5173   # serve locally → http://localhost:5173
```

## What's where

| Area | Pages / files |
|---|---|
| Public site | `index.html`, `management.html` |
| Search (faceted filters, URL state, grid + map, shortlist, compare, saved searches) | `properties.html` (generated) · `js/search.js` · `css/search.css` |
| Listing pages (gallery, costs, EMI, diligence, map, similar, gated contact) | `property/<slug>.html` (generated) · `js/pages.js` |
| Locality guides (prices, rents, yield, map, FAQs) | `localities.html`, `localities/<slug>.html` (generated) |
| SEO landing pages ("2 BHK flats for rent in Kokapet") | `in/*.html` (generated; noindex when there is no exact inventory) |
| Post property free (owner/builder acquisition funnel) | `post-property.html` (generated) · `js/post.js` |
| Login / sign-up (mobile OTP, client type, full requirement, consent, DigiLocker) | `login.html` · `js/login.js` · `js/forms.js` |
| Client portal (opens after login) | `portal.html` · `js/portal.js` · `js/tenancy.js` · `js/match.js` |
| Lead capture (Contact gate), attribution | `js/lead.js` · `js/track.js` |
| Team workspace (research, content, calendar, metrics, CRM) | `os/index.html` |
| Brand + promo | `assets/brand/`, `promo/reel.html`, `promo/ads.html`, rendered files in `promo/out/` |

## Data flow
`data/catalog.json` (brand, 17 localities, listings) → `build.py` → `js/data.js` + every generated page + `sitemap.xml` + `robots.txt`.
**Never edit `js/data.js` or the generated folders by hand.** All listings are illustrative samples (`"sample": true` = generated); prices are indicative placeholders.

## Portal by client type
- **Tenant**: prime matches (unlock after DigiLocker verification) · My home & rent (UPI pay link, "I've paid", HRA receipts, agreement timeline, repairs, documents, updates) · shortlist · saved searches · visits
- **Buyer**: prime matches · My purchase (payment-plan milestones, registration estimate, document/handover checklist) · shortlist · saved searches · visits
- **Owner**: Rentals & rent (tenancy setup, WhatsApp reminders, automatic reminder schedule, confirm payments, ledger, repairs with hand-over to Keetown, document status) · My listings
- **Seller / builder**: My listings / projects

Owner and tenant see the **same tenancy record**, linked by the tenant's mobile number.
Matching (`js/match.js`): hard rules (intent, type, ≤10% over budget, bedrooms, tenant-type and pet rules) + weighted score (location & distance, budget, configuration, furnishing, move-in/possession, commute, listing quality). Prime = verified + prime listings scoring ≥ 60.

## Demo mode
`js/auth.js` → `MODE = 'demo'`: OTP is `123456`, DigiLocker is simulated ("Demo-verified"), all data lives in this browser's localStorage. Portal tabs offer "Explore with sample data". See `BACKEND.md` to go live.

## Before launch
- Replace placeholders in `data/catalog.json`: phone, email, RERA agent no., site URL, real listings, verified locality figures. Run `python3 build.py`.
- Claims on the management page/promo (48h response, fees) are placeholders.
- `os/` has no authentication — put it behind staff login.
- Paste GA4 / GTM / Meta Pixel snippets into page `<head>`; `js/track.js` already pushes events (`search`, `view_property`, `lead_created`, `contact_revealed`, `signup_completed`, `property_posted`, `verified`, `tenancy_created`) to `dataLayer` / `fbq`.
- Map tiles use the public OpenStreetMap server (fine for testing); use a commercial tile provider in production.

## Brand
Official logo artwork in `assets/brand/`: `logo.svg` (light backgrounds), `logo-white.svg` (blue/dark), `logo-navy.svg`, `mark.svg` / `mark-white.svg`. Colours: navy `#1e4386`, blue `#3669b2`.

## Deploy (Cloudflare Pages)
Live preview: **https://keetown-realty.pages.dev** (project `keetown-realty`). Node + Wrangler are installed in `~/.local/node`.

```bash
export PATH="$HOME/.local/node/bin:$PATH"
python3 build.py --dist
wrangler pages deploy dist --project-name keetown-realty --branch main
```

`dist/` contains only public files: the team workspace (`os/`), promo tools/videos, `data/`, `build.py` and these notes are excluded.
Search engines are blocked while `"indexing": false` in `data/catalog.json` (sets `robots.txt` + `X-Robots-Tag`). Set it to `true` once real phone/RERA/listings are in, then redeploy.
Custom domain: Cloudflare dashboard → Workers & Pages → keetown-realty → Custom domains; then set `brand.site` in `data/catalog.json` and redeploy.
