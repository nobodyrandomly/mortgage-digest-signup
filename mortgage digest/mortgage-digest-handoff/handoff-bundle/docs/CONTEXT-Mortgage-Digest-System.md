# CONTEXT — Mortgage & Real Estate Digest System

## Project Overview
Automated daily mortgage & real estate news digest for JWH Financial. Gemini 2.5 Pro generates content from 20 industry sources; n8n orchestrates generation, sending, signup, unsubscribe, and bounce handling; Google Sheets stores subscribers, a digest archive, and partner/LO/skew config; Gmail sends from mortgage-digest@jwhfinance.com; a React signup page is hosted on Vercel. Now extended with a three-tier co-branding system (JWH → Loan Officer → Referral Partner) with partner-type content skewing.

## Current Status
Core system working end to end. Co-branding system code complete and pushed to GitHub; sheet tabs/columns created. Remaining work is wiring the new nodes in n8n and populating partner/LO/skew data. Branding rebranded throughout to "Mortgage & Real Estate Digest."

## Architecture
- Gemini 2.5 Pro (Google Search grounding) generates content per partner-type variant
- n8n orchestrates (instance: jwhfinancial.app.n8n.cloud, timezone PT)
- Google Sheets: Subscribers, Digest, Partners, LoanOfficers, SkewConfig
- Gmail (OAuth2) sends from mortgage-digest@jwhfinance.com / "Mortgage Digest | JWH Financial"
- React signup page on Vercel (repo nobodyrandomly/mortgage-digest-signup)

## Key IDs & URLs
- Google Sheet ID: 1xwXBF7mVq9hENr2B43Ig9OS6TqF1H8CoOePfe8Zo8G0
- Signup webhook: https://jwhfinancial.app.n8n.cloud/webhook/digest-signup
- Unsubscribe webhook: https://jwhfinancial.app.n8n.cloud/webhook/digest-unsubscribe
- Partner config webhook: https://jwhfinancial.app.n8n.cloud/webhook/partner-config
- Sender: mortgage-digest@jwhfinance.com

## Associated Files
Core:
- digest-signup.jsx — signup page (email-first layout, full-name split, partner/LO co-branding via ?partner= / ?lo=, 4-layer client validation, timezone-aware)
- mortgage-digest-n8n-workflow.json — combined single-workflow version
- workflow-A-generator.json — generator (5:30 AM), per-variant loop
- workflow-B-sender.json — sender + signup + unsubscribe + partner config (6 AM)
- workflow-C-bounce-handler.json — Gmail-trigger bounce handler
Code (paste into nodes):
- gemini-node-body-v3.json — Gemini request body (JSON-only instruction included)
- gemini-prompt-v3.txt — standalone prompt
- parse-digest-code.js — multi-part JSON extraction
- validate-links-code.js — Link Validator v3 (this.helpers.httpRequest, keep-on-uncertain)
- plagiarism-check-code.js — plagiarism check (excludes headlines)
- rewrite-agent-code.js — rewrites flagged stories
- build-email-code.js — Build HTML Email (HEADER + FOOTER_CONTACT markers for co-branding injection)
- validate-signup-code.js — 4-layer validation; captures partnerId + loIdDirect
- determine-variants-code.js — dynamic variant determination from SkewConfig + Subscribers
- cobranded-email-code.js — wraps digest with partner + LO branding (cached lookups)
- partner-config-webhook-code.js — config webhook (handles ?partner= AND ?lo=)
- resolve-partner-code.js — derives partnerType + loId before saving
- bounce-extract-code.js — extracts permanent bounces
- welcome-email-expression.txt — welcome email HTML
Docs:
- SETUP.md — full setup & reference
- partner-system-sheets.md — sheet schemas + sample data
- partner-system-buildout.md — node-by-node wiring map for co-branding
- CONTEXT-Mortgage-Digest-System.md — this file

## Sheet Schema (current)
- Subscribers: email, firstName, lastName, fullName, company, role, roleOther, phone, subscribedAt, active, send_count, last_sent_at, bounced, bouncedAt, unsubscribedAt, source, partnerId, partnerType, loId
- Digest: timestamp, subject, html, partnerType
- Partners: partnerId, partnerName, partnerType, partnerContact, partnerPhone, partnerEmail, partnerLogo, partnerColor, loId, active
- LoanOfficers: loId, loName, loEmail, loPhone, loNmls, loActive
- SkewConfig: partnerType, displayName, promptInstruction, active

## Key Decisions
- Content skew by partner TYPE; generate one variant per active type that has ≥1 active subscriber; 'general' always generated as fallback. Fully dynamic — no hardcoded type lists.
- Three-tier identity: JWH (lender) + LO (named contact w/ NMLS) + Partner (distributor). Co-branded emails carry all three.
- Partner links: ?partner=ID (full co-brand) and ?lo=ID (LO-only, lighter bar, general variant). Default page = clean JWH + general digest. Source tagged: partner_page / lo_page / landing_page.
- Denormalize stable IDs (partnerId, partnerType, loId) onto Subscriber rows for fast send routing; mutable branding (logo, color, contact) stays in Partners/LO, looked up + cached per-run at send time.
- Save to Google Sheet = appendOrUpdate on email (dedup + reactivate resubscribers).
- Save Digest = append (one row per variant per day).
- Email validation rejects NXDOMAIN/no-MX; fails open on genuine network errors.
- Bounce handler acts only on permanent (5.x.x) failures.
- Branding: "Mortgage & Real Estate Digest" everywhere; geopolitics/macro content kept in (relevant).

## Critical Lessons (recurring bugs fixed)
- $helpers.request is the WRONG helper in this n8n version — silently fails. Caused the email validator to pass all bad emails AND the link validator to fall back every link to Google. FIX: this.helpers.httpRequest everywhere. (Plagiarism check + rewrite agent also use it — verify when testing.)
- Gemini multi-part responses (reasoning text + JSON) broke JSON.parse. FIX: parse-digest extracts via json fence / any fence / first-brace-to-last-brace. Prompt also instructs JSON-only output.
- Valid? IF node: condition {{ $json.valid }} is true, "Convert types where required" ON.
- Split In Batches: output 0 = done, output 1 = loop. Wiring was reversed once.
- Save Digest needs Append (not appendOrUpdate) — no match column.
- JSX/Vercel: no href="#", no escaped apostrophes in template literals, always full-replace App.js.

## Changelog (latest session)
- Fixed invalid-email leak: hardened MX check to this.helpers.httpRequest, rejects NXDOMAIN/no-MX
- Fixed link validator: v3 uses this.helpers.httpRequest, browser GET, keeps unverifiable links (was falling back all links to Google)
- Built full co-branding system: Partners/LoanOfficers/SkewConfig tabs, dynamic variant generation, co-branded email builder, partner-aware + LO-only signup page, config webhook, resolve-partner
- Added LO-only branded links (?lo=ID)
- Rebranded "Mortgage Digest" → "Mortgage & Real Estate Digest" across signup + emails
- Set Save to Google Sheet to appendOrUpdate (dedup)
- Added Gmail bounce handler (permanent failures only)
- Two-workflow split (generator/sender)
- Multi-part JSON parse fix + JSON-only prompt instruction

## Open / Next
- Wire co-branding nodes in n8n (this session's walkthrough)
- Populate Partners, LoanOfficers, SkewConfig with real data + refine promptInstruction text
- Delete stray "digest" column from Digest tab if still present
- Full end-to-end test: default signup, partner signup, LO signup, daily multi-variant send, unsubscribe, bounce
- Verify plagiarism-check + rewrite-agent use this.helpers.httpRequest
- Longer term: move Gmail → Resend/SendGrid for auto bounce/complaint handling + deliverability (SPF/DKIM/DMARC on jwhfinance.com)


## Phase 2 Optimizations (measure before building)
- **Shared factual layer:** the market snapshot (rates/MBS/Treasury/Fed) is identical across all variants — fetch once and inject, rather than regenerating per variant. Real redundancy.
- **Research-once architecture:** considered splitting into research → summarize → compile agents to reduce per-variant Gemini calls. BUT: may INCREASE tokens (passing shared corpus as input to each variant) and WEAKEN differentiation (neutral research can't surface type-specific stories). DECISION: do not build pre-launch. Ship per-variant approach, measure actual token cost + runtime over ~1 week. Only split if cost becomes real at higher variant counts. Differentiation currently comes from each variant doing its own audience-targeted grounded search.

## OPEN ITEM — Restamp & non-partnered (direct/general) subscriber handling
PROBLEM: restamp-combo-ids-code.js only processes subscribers with a partnerId.
Direct/general subscribers (no partner, no LO) are SKIPPED by restamp, so if their
comboId/partnerType is ever blank, restamp won't fix them — they'd be invisible to
the sender (no partnerType to route on).

Currently masked because:
- At SIGNUP, resolve-partner sets partnerType='general' + comboId='general::none::none'
  for direct subscribers. So real signups are fine.
- Only HAND-ENTERED direct subscribers (like test data) need their general values
  set manually, since they bypass signup.

TO ADDRESS:
1. Make restamp ALSO handle partnerless subscribers — if no partnerId, set
   partnerType='general', loId='', comboId='general::none::none' (so restamp can
   repair/backfill ANY subscriber, not just partnered ones).
2. Consider: should restamp also set unsubscribeUrl if blank? (signup sets it, but
   backfill for legacy/imported subscribers would be useful.)
3. Decide the canonical "register a subscriber outside the signup form" path —
   e.g. a small manual-import workflow that runs new rows through resolve-partner
   logic, so bulk-imported or hand-added subscribers get the same treatment as
   signups (partnerType, comboId, unsubscribeUrl all set correctly).

This matters for: bulk subscriber imports, manually added subscribers, and any
subscriber whose routing fields got cleared. Right now those depend on signup.
