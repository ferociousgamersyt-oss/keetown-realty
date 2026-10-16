# Going live and scaling

The front end is complete and runs in **demo mode** (browser storage, simulated OTP and DigiLocker).
To operate as a real portal you need a backend. This document lists what to build, in priority order.
Set `MODE = 'live'` in `js/auth.js` once the auth endpoints exist.

## 1. Identity: mobile OTP + DigiLocker
- `POST /api/otp/send { mobile }` — SMS gateway (MSG91 / Gupshup / Twilio) with DLT-registered sender ID and OTP template. Rate-limit per number and IP; 5-minute expiry; 5 attempts.
- `POST /api/otp/verify { mobile, otp }` — sets a secure, HttpOnly session cookie. Never return the OTP to the browser.
- DigiLocker (OAuth 2.0 + PKCE; requires partner onboarding via API Setu / DigiLocker):
  `GET /api/digilocker/start?return=…` → authorize redirect; `GET /api/digilocker/callback` → exchange code server-side, store `{verified, name, method:'digilocker', at}` only. Do not store Aadhaar numbers or documents.
- Builders: verify RERA (Telangana RERA portal) and GST in the admin workflow.

## 2. Core tables
| Table | Key fields |
|---|---|
| users | mobile (unique), role, profile JSON (requirement), consent (channel, at, notice version), verification, attribution (first/last touch, referral code) |
| listings | all fields in `data/catalog.json` + owner_id, status (draft → under_verification → live → closed), photos, quality score, posted_at, views, enquiries |
| leads | user/phone, intent, listing_id, source, channel, utm, stage, assignee, notes, created_at |
| saved_searches | user_id, query string, alert channels, last_notified_at |
| shortlists, visits | user_id, listing_id, date/time, status |
| tenancies | listing_id, owner_id, tenant_mobile/tenant_id, rent, due_day, deposit, start, term, lock_in, escalation, owner UPI/PAN, auto-reminder settings |
| rent_payments | tenancy_id, month, amount, status (due / reported / paid), ref (UTR), receipt_no, confirmed_at |
| reminders, notices | tenancy_id, kind (before/due/overdue/manual), channel, sent_at |
| tickets | tenancy_id, category, urgency, status history, assignee (owner / Keetown) |
| documents | tenancy_id / purchase_id, name, status, file (object storage, access-controlled) |
| purchases | buyer_id, listing_id, price, stage, milestones, documents |

## 3. APIs the pages already expect (shape mirrors the demo objects)
- `GET /api/listings?intent&loc&bmin&bmax&beds&type&by&st&furn&face&amen&ten&avail&amin&amax&v&prime&rera&pets&sort&page` → results + facet counts (same parameter names as `properties.html`). Use Postgres + PostGIS or OpenSearch for facets and map bounds.
- `GET /api/matches` → server-side `js/match.js` logic; recompute when a listing goes live.
- `POST /api/leads`, `POST /api/visits`, `POST /api/listings` (post-property), `POST /api/saved-searches`.
- Tenancy: `GET/POST /api/tenancies`, `POST /api/tenancies/:id/payments/:month/report|confirm`, `POST …/reminders`, `POST …/tickets`, `PATCH …/documents/:i`.

## 4. Scheduled jobs
- **Rent reminders** (daily, 9 am IST): for each tenancy with auto-reminders on, send WhatsApp template messages before due, on the due date and every N days overdue. This replaces `KTTen.runAuto`.
- **Saved-search and prime-match alerts** (hourly or daily): new live listings × saved searches / requirements → WhatsApp or email, only for users with consent.
- **Agreement renewal and escalation alerts** (45 / 15 days before).
- **Lead SLA**: assign and escalate new leads not contacted within N minutes.

## 5. Integrations
- **WhatsApp Business Platform** (Meta Cloud API or a BSP): pre-approved templates for OTP fallback, rent reminders, visit confirmations and match alerts. Marketing templates need explicit opt-in (stored in `users.consent`).
- **Payments:** the portal generates `upi://pay` links straight to the owner's UPI ID; Keetown never handles the money. To collect rent through Keetown, use a payment gateway with UPI AutoPay/e-mandate; this needs a merchant agreement and KYC.
- **Email:** transactional (SES / Postmark) plus marketing (consent-gated).
- **Analytics:** GA4 / GTM and Meta Pixel snippets in `<head>`; server-side conversion API for lead events.
- **Maps:** a commercial tile provider instead of the public OSM tile server; geocode real listings (store exact location privately, show approximate publicly).

## 6. Compliance (India)
- DPDP Act 2023: purpose-specific consent, withdrawal, data-access/erasure (the portal has "Download my data" and "Delete my account"), retention limits. Review with counsel.
- RERA: show the agent registration number; only advertise RERA-registered projects as such.
- WhatsApp: opt-in records, template approval, STOP handling.
- Rent receipts: generated only after the landlord confirms; include landlord PAN when annual rent exceeds ₹1 lakh (HRA rules); confirm with a CA.

## 7. Admin / team (extends `os/`)
Staff login with roles; listing verification queue (documents, photos, quality score); lead routing; tenancy oversight; content calendar. Replace the localStorage stores in `os/os.js` with the APIs above.
