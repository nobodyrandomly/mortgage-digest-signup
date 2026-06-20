# Mortgage Digest System — Setup & Reference

Automated daily mortgage & real estate news digest for JWH Financial. Sends a curated email every weekday morning to subscribers, plus an immediate digest to new signups.

## Architecture

- **Gemini 2.5 Pro** (Google Search grounding) generates the digest content
- **n8n** orchestrates everything (instance: `jwhfinancial.app.n8n.cloud`, timezone: PT)
- **Google Sheets** stores subscribers + digest archive
- **Gmail** (OAuth2) sends from `mortgage-digest@jwhfinance.com`, display name "Mortgage Digest | JWH Financial"
- **React signup page** on Vercel via GitHub repo `nobodyrandomly/mortgage-digest-signup` (live at `mortgage-digest-signup.vercel.app`)

## Key IDs & URLs

- Google Sheet ID: `1xwXBF7mVq9hENr2B43Ig9OS6TqF1H8CoOePfe8Zo8G0`
- Tabs: `Subscribers`, `Digest`
- Signup webhook (prod): `https://jwhfinancial.app.n8n.cloud/webhook/digest-signup`
- Unsubscribe webhook (prod): `https://jwhfinancial.app.n8n.cloud/webhook/digest-unsubscribe`
- Sender: `mortgage-digest@jwhfinance.com` / "Mortgage Digest | JWH Financial"

> Production webhooks use `/webhook/`. The `/webhook-test/` URLs only work in the n8n editor's test mode.

## Workflows

The system can run as one combined workflow OR split into independent workflows. Current files support both:

- **workflow-A-generator.json** — runs 5:30 AM, generates digest, saves to Digest tab, terminates
- **workflow-B-sender.json** — runs 6:00 AM, pulls saved digest, sends to subscribers; also holds signup + unsubscribe flows
- **workflow-C-bounce-handler.json** — Gmail Trigger watches for bounce notifications, marks permanent bounces inactive
- **mortgage-digest-n8n-workflow.json** — the original combined single-workflow version (all flows in one)

### Daily generation (Workflow A)
`5:30 AM → Generate via Gemini → Parse & Validate → Validate & Fix Links → Plagiarism Check → Rewrite Agent → Build HTML Email → Save Digest to Sheet`

### Daily send (Workflow B)
`6 AM → Fetch Today's Digest → Get Today's Digest → Fetch Active Subscribers → Split → (loop) Send via Gmail → Log Send → back to Split`

### Signup (Workflow B)
`Signup Webhook → Validate Signup → Valid? → (true) Save to Sheet → Welcome Email → Fetch Latest Digest → Get Most Recent → Has Digest? → Send Latest Digest`
Valid? false branch → Webhook Response (error).

### Unsubscribe (Workflow B)
`Unsubscribe Webhook → Mark Unsubscribed in Sheet → Confirmation Page`

### Bounce handling (Workflow C)
`Gmail Trigger → Extract Bounced Addresses → Mark Subscriber Bounced`

## Google Sheet Schema

**Subscribers tab headers:**
`email, firstName, lastName, fullName, company, role, roleOther, phone, subscribedAt, active, send_count, last_sent_at, bounced, bouncedAt, unsubscribedAt, source`

**Digest tab headers:**
`timestamp, subject, html`

All Sheets nodes reference columns by header name, so columns can be added without breaking anything.

## n8n Credentials Required

- **Google Gemini API Key** — Query Auth, Name field exactly `key`
- **Google Sheets (Digest)** — OAuth2
- **Gmail (Digest Sender)** — OAuth2, with `mortgage-digest@jwhfinance.com` verified under "Send mail as"

## Code Files (paste into corresponding n8n nodes)

- `gemini-node-body-v3.json` → Generate Digest via Gemini (full JSON body)
- `parse-digest-code.js` → Parse & Validate Digest
- `validate-links-code.js` → Validate & Fix Story Links
- `plagiarism-check-code.js` → Plagiarism Check
- `rewrite-agent-code.js` → Rewrite Agent
- `build-email-code.js` → Build HTML Email
- `validate-signup-code.js` → Validate Signup
- `bounce-extract-code.js` → Extract Bounced Addresses
- `welcome-email-expression.txt` → Send Welcome Email (Message field)
- `digest-signup.jsx` → signup page src/App.js (Vercel)

## Key Implementation Notes

- **Gemini node:** raw JSON body mode; `responseMimeType` omitted (incompatible with Google Search grounding); 300000ms timeout + retry; prompt ends with "Output ONLY the JSON object" instruction
- **Parse node:** extracts JSON from Gemini's multi-part responses (reasoning text + JSON) via ```json fence → any fence → first-brace-to-last-brace
- **Code nodes calling Gemini** (Validate Links, Rewrite Agent): use `{{ $credentials.googleGeminiApi.apiKey }}` expression syntax, not `$credentials` directly
- **Email validation (Validate Signup):** 4 layers — strict format, disposable domain block, typo detection, MX record check via `this.helpers.httpRequest` to Google DNS. NXDOMAIN and no-MX domains rejected; genuine lookup errors fail open
- **Valid? IF node:** condition `{{ $json.valid }}` is true, with "Convert types where required" ON
- **Save to Google Sheet:** appendOrUpdate on `email` to prevent duplicate subscribers and re-activate resubscribers
- **Bounce handler:** only acts on PERMANENT failures (5.x.x status or "address not found" language); soft bounces (4.x.x) ignored
- **Signup page:** Option D layout — hero + centered form above, full-width preview below. Email field centered on top, then Full Name | Role, then Phone | Company. Full name split into first/last on submit. Timezone-aware delivery time via Intl API (America/Los_Angeles), D/S stripped from abbreviations (PDT→PT etc.)
- **JSX gotchas (caused repeated Vercel build failures):** no `<a href="#">` (use button); no escaped apostrophes inside template literals (use curly '); wrap dynamic values in JSX expressions not raw text; always do a FULL replace of src/App.js, never partial

## Legal / Copyright

- Email footer includes: "Summaries are independently generated. All rights belong to original publishers."
- Gemini prompt forbids verbatim quotes from sources
- Plagiarism check compares summaries/keyPoints/effects (NOT headlines) against open-access sources for 8+ word matches; flagged stories rewritten before send
