# CONTEXT — Mortgage Digest System

## Project Overview
Automated daily mortgage & real estate news digest for JWH Financial. Gemini 2.5 Pro generates content from 20 industry sources; n8n orchestrates generation, sending, signup, unsubscribe, and bounce handling; Google Sheets stores subscribers and a digest archive; Gmail sends from mortgage-digest@jwhfinance.com; a React signup page is hosted on Vercel.

## Current Status
Functional and in testing. Signup, validation, generation, parsing, and send flows all working end to end. Recent fixes resolved: invalid-email leak (MX check), Gemini multi-part JSON parse failure, and the Valid? IF routing.

## Associated Files
- **digest-signup.jsx** — React signup page (Option D layout, email-first, full-name split, timezone-aware, 4-layer client validation, real error handling). Deploys to Vercel via src/App.js.
- **mortgage-digest-n8n-workflow.json** — combined single-workflow version (all flows)
- **workflow-A-generator.json** — generator only (5:30 AM)
- **workflow-B-sender.json** — sender + signup + unsubscribe (6 AM)
- **workflow-C-bounce-handler.json** — Gmail-trigger bounce handler
- **gemini-node-body-v3.json** — full Gemini request body (paste into Generate node)
- **gemini-prompt-v3.txt** — standalone prompt text
- **parse-digest-code.js** — Parse & Validate Digest node (multi-part JSON extraction)
- **validate-links-code.js** — Link validator v2 (Gemini search finds real URLs)
- **plagiarism-check-code.js** — plagiarism check (open-access sources, excludes headlines)
- **rewrite-agent-code.js** — rewrites flagged stories before send
- **build-email-code.js** — Build HTML Email (JWH light theme)
- **validate-signup-code.js** — 4-layer email validation (format, disposable, typo, MX)
- **bounce-extract-code.js** — extracts permanent bounces from Gmail notifications
- **welcome-email-expression.txt** — welcome email HTML (JWH theme, paste into Send Welcome Email)
- **welcome-email-preview.html / email-preview.html** — visual previews
- **SETUP.md** — full setup & reference guide

## Key Decisions
- Gemini over Claude API for generation; Google Sheets over Postgres for storage
- 20 sources across mortgage/lending, real estate/market data, macro, financial media
- Per-story realtorSection (green panel) for agent-relevant stories; first/second order effects for significant ones
- JWH light theme: navy #0D1321, blue #3B6FE8, green #22C55E, pageBg #EEF0F5
- Signup = Option D layout; email centered on top, Full Name | Role, then optional Phone | Company; full name split to first/last on backend
- Two-workflow split (generator 5:30 / sender 6:00) for decoupling; combined version also maintained
- appendOrUpdate on email prevents duplicate subscribers
- Bounce handler only removes permanent (5.x.x) failures
- Email validation rejects NXDOMAIN / no-MX domains; fails open on genuine network errors
- Copyright posture: independent-summary disclaimer in footer, no-verbatim-quote prompt rule, plagiarism check + rewrite

## Changelog (this session)
- Rebuilt signup page to Option D layout; multiple iterations on form structure
- Email-first layout: centered email field on top, Full Name + Role columns, optional Phone + Company
- Full name entered as one field, split to firstName/lastName on submit
- Timezone-aware delivery time (Intl API, America/Los_Angeles, D/S stripped)
- Added real submit error handling (checks res.ok, surfaces webhook errors)
- Added 4-layer email validation (format, disposable, typo, MX) client + server
- Hardened MX check to this.helpers.httpRequest; rejects NXDOMAIN/no-MX
- Fixed Parse node to extract JSON from Gemini multi-part responses
- Added "Output ONLY JSON" instruction to Gemini prompt
- Built Gmail-based bounce handler (permanent failures only)
- Split into generator + sender workflows; Save Digest moved earlier, set to append
- Save to Google Sheet → appendOrUpdate on email (dedup)
- Updated welcome email to JWH light theme
- Corrected JWH Finance → JWH Financial across all nodes
- Fixed Split Subscribers done/loop output wiring
- Resolved repeated Vercel build failures (href, escaped apostrophes in templates, raw JSX expressions, double-escaped regex)

## Open / Next
- Confirm Save to Google Sheet set to appendOrUpdate in live n8n
- Consider dedup safety net on Fetch Active Subscribers before send loop
- Longer term: move sending from Gmail to Resend/SendGrid for automatic bounce/complaint handling and better deliverability (SPF/DKIM/DMARC on jwhfinance.com)
- Full end-to-end test: signup → sheet row → welcome + immediate digest → unsubscribe → daily send
