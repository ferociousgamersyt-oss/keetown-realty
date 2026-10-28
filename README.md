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

## Keetown for Business (companies)
- `business.html`: public page for MNCs, GCCs and startups (employee relocation, office space, company-leased housing).
- Company / HR accounts (`role: company`) get their own portal: dashboard, employee moves board, relocation requests with packages, office-space requirements with shortlist and due diligence, billing with rent-allowance commitments.
- When HR adds an employee, that employee's login is ready: they sign in with their own mobile + OTP, their profile is pre-filled from HR's request, and they are marked "Verified by employer" on the server.
- Employees see homes near their office within the rent allowance, and can **lock** one. Flow: employee requests → HR approves or declines → Keetown confirms with the owner → Locked (stage "Lease signed"). Rent up to the allowance is paid by the company; anything above is shown as the employee's share before they lock. The server allows only one active lock per home (`/api/locks`).
- Data: `keetown_relocations` and `keetown_offices` (`js/corp.js`), synced like tenancies. Staff mobiles can read and update every case.
- Packages, fees and services live in `js/corp.js` (fees are placeholders until the rate card is final).

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

## Backend (live on the deployed site)
Cloudflare Pages Functions (`functions/api/[[path]].js`) + D1 database `keetown` (`schema.sql`), configured in `wrangler.toml`.
- Login: server-side mobile OTP, HttpOnly session cookie (30 days), rate limits (5 OTPs/hour per number, 20 per IP).
- Data: accounts, tenancies (rent ledger, payments, issues, notices), purchases, listings submitted, shortlists, visits and saved searches are stored on the server, so they work across devices. Owner and tenant share one tenancy record.
- Access rules are enforced on the server: you can only read and change records you are part of; verification status can only be set by DigiLocker; anyone can create a lead but only staff can read them.
- `js/auth.js` keeps localStorage as a cache: writes go to an outbox → `/api/sync`; each page load refreshes from `/api/state`.
- Keetown OS (`os/`) shows the live leads inbox to staff mobiles listed in `STAFF_MOBILES`.
- Demo accounts (`DEMO_ACCOUNTS = "1"`): the five numbers 9000000001–5 log in with OTP 123456 and only ever see demo data.

Locally (`python3 -m http.server`) everything runs in browser-only demo mode. To run with the backend locally: `wrangler pages dev . --d1 DB=keetown`.

### Switching on the real services
| Service | What you need | Then run |
|---|---|---|
| SMS OTP (choose one) | **Twilio Verify** (fastest; uses Twilio's own India DLT templates) or **MSG91** (cheapest; needs your DLT registration + OTP template) | `wrangler pages secret put TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_VERIFY_SID` — or `MSG91_AUTHKEY` / `MSG91_TEMPLATE_ID` (project `keetown-realty`) |
| DigiLocker | Partner onboarding via API Setu / MeriPehchaan (business PAN, GST, use-case approval) | set `DIGILOCKER_CLIENT_ID` in `wrangler.toml`, `wrangler pages secret put DIGILOCKER_CLIENT_SECRET`; register redirect `https://keetown-realty.pages.dev/api/digilocker/callback` |
| Staff inbox | Your team's mobile numbers | put them in `STAFF_MOBILES` in `wrangler.toml` and redeploy |

| WhatsApp rent reminders | Meta WhatsApp Business account (Cloud API), a verified business phone number, and the template below approved as **Utility** | `cd workers/reminders && wrangler secret put WA_TOKEN` and `wrangler secret put WA_PHONE_ID` |

**Rent reminders** (`workers/reminders`, Worker `keetown-reminders`) run every day at 9:00 am IST. They use each tenancy's settings (N days before, on the due date, every N days overdue), send only to tenants who opted in to WhatsApp, never message demo tenancies, never send the same reminder twice, and write every reminder into the tenancy so both portals show it. Without the WhatsApp keys they still run and post the reminder in the portal.
Template `rent_reminder` (English, Utility), 6 variables:
> Hi {{1}}, a reminder from Keetown Realty: rent of {{2}} for {{3}} ({{4}}) is {{5}}. Pay the owner directly by UPI to {{6}} and download your receipt from the Keetown portal. Reply STOP to opt out.

Until an SMS provider is set, real numbers get a "SMS login is being set up — message us on WhatsApp" message. Staff numbers can still sign in: their code is written to the function log (`wrangler pages deployment tail --project-name keetown-realty`).
Check status any time: https://keetown-realty.pages.dev/api/health

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

`dist/` contains only public files (`data/`, `build.py`, the backend source and these notes are excluded); `wrangler pages deploy` bundles `functions/` from the project root.
Search engines are blocked while `"indexing": false` in `data/catalog.json` (sets `robots.txt` + `X-Robots-Tag`). Set it to `true` once real phone/RERA/listings are in, then redeploy.
Custom domain: Cloudflare dashboard → Workers & Pages → keetown-realty → Custom domains; then set `brand.site` in `data/catalog.json` and redeploy.
