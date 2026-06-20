# Partner Co-Branding System — Build Map

Everything needed for co-branded, partner-type-skewed digests with a three-tier
identity (JWH → Loan Officer → Referral Partner). All partner types are data-driven
and expandable via the SkewConfig sheet — no code limits the set of types.

## New Google Sheet tabs (see partner-system-sheets.md for full schema)
- **Partners** — one row per referral partner (partnerId, name, type, contact, logo, color, loId, active)
- **LoanOfficers** — one row per LO (loId, name, email, phone, nmls, active)
- **SkewConfig** — one row per partner TYPE with its promptInstruction (this makes types expandable)
- **Subscribers** — add columns: partnerId, partnerType, loId
- **Digest** — add column: partnerType (tags each morning's variants)

## New code files (paste into n8n nodes)
| File | Node | Purpose |
|---|---|---|
| determine-variants-code.js | "Determine Variants" (Code) | Reads SkewConfig + Subscribers, outputs only the variants that need generating today (general always + any type with active subscribers) |
| cobranded-email-code.js | "Build Co-Branded Emails" (Code) | Wraps each subscriber's digest variant with partner + LO branding; caches partner/LO lookups per run |
| partner-config-webhook-code.js | "Partner Config" (Code, behind a webhook) | GET endpoint the signup page calls to fetch a partner's public branding |
| resolve-partner-code.js | "Resolve Partner" (Code) | In signup flow: derives partnerType + loId from partnerId before saving |
| validate-signup-code.js | "Validate Signup" (updated) | Now captures partnerId, tags source as partner_page |
| build-email-code.js | "Build HTML Email" (updated) | Added FOOTER_CONTACT markers so co-brand builder can swap contact block |
| digest-signup.jsx | Vercel src/App.js (updated) | Reads ?partner=id, fetches config, renders co-branded signup |

## GENERATOR workflow changes (Workflow A)
Replace the single linear chain with a loop over variants:

```
5:30 AM
  → Read SkewConfig (Sheets read, SkewConfig tab)
  → Read Subscribers (Sheets read, Subscribers tab)
  → Determine Variants (Code)          [outputs N items, one per needed variant]
  → Loop Over Variants (Split In Batches)
       → Generate Digest via Gemini    [inject {{ $json.promptInstruction }} into prompt]
       → Parse & Validate Digest
       → Validate & Fix Story Links
       → Plagiarism Check
       → Rewrite Agent
       → Build HTML Email
       → Save Digest to Sheet          [append: timestamp, subject, html, partnerType]
       → (loop back)
```
The Gemini node's prompt gets the skew injected. Add near the top of the user prompt:
`AUDIENCE FOCUS: {{ $json.promptInstruction }}`
And tag the saved row with `partnerType: {{ $json.partnerType }}`.

## SENDER workflow changes (Workflow B)
```
6 AM
  → Read Partners (Sheets read)         [for branding lookup]
  → Read LoanOfficers (Sheets read)
  → Fetch Active Subscribers
  → Fetch Today's Digests (all variants for today from Digest tab)
  → Route + Attach Variant (Code)       [match each subscriber.partnerType to its digest variant;
                                          fall back to 'general' if their variant is missing]
  → Build Co-Branded Emails (Code)      [cobranded-email-code.js]
  → Split → Send via Gmail → Log → loop
```

## SIGNUP flow changes (Workflow B)
```
Signup Webhook → Validate Signup → Valid?
   (true) → Resolve Partner (Code)      [derive partnerType + loId]
          → Save to Google Sheet (appendOrUpdate on email; writes partnerId, partnerType, loId)
          → Send Welcome Email → ... (unchanged)
   (false) → Webhook Response
```

## NEW: Partner Config webhook (Workflow B or its own)
```
Partner Config Webhook (GET, path: partner-config)
  → Read Partners
  → Read LoanOfficers
  → Partner Config (Code: partner-config-webhook-code.js)
  → Respond to Webhook (JSON)
```
Signup page calls: `https://jwhfinancial.app.n8n.cloud/webhook/partner-config?partner=ID`

## How the dynamic / expandable design holds up
- Add a partner type → add a SkewConfig row. Generator picks it up automatically.
- Add a partner → add a Partners row. Signup link `?partner=newid` works immediately.
- Add an LO → add a LoanOfficers row. Assign via partner's loId.
- No code references a fixed list of types anywhere. A subscriber whose variant
  wasn't generated (edge case) falls back to the general digest.

## Co-branded email identity
- **JWH Financial** — lender/broker (always)
- **Loan Officer** — named contact with email/phone/NMLS (from the partner's loId)
- **Referral Partner** — co-brand bar at top + "in partnership with" footer line
- Direct subscribers (no partner) get clean JWH branding + general digest.
