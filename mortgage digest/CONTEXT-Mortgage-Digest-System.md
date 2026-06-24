# CONTEXT — Mortgage & Real Estate Digest System
**Single entry point. Read this first; it links to the few docs that stay authoritative for deep detail and flags what's now stale.**
Last refreshed: 2026-06-23 (supersedes the previous CONTEXT, HANDOFF, and SETUP for orientation purposes).

---

## 0. How to use this file
A fresh session should be fully oriented after reading just this. When you need deeper detail, go to the **authoritative** source named below — don't trust the stale ones.

| Need | Go to | Status |
|---|---|---|
| Exact tab/column schema | `SHEET-CONFIG-CURRENT.md` | ✅ authoritative |
| Exact n8n node names + which code goes where | `NODE-NAMING-REFERENCE.md` | ✅ authoritative |
| Send pipeline design / chunking / cursor logic | `send-pipeline-architecture.md` | ✅ authoritative |
| The live behavior of any flow | the matching `*.js` file | ✅ source of truth |
| SkewConfig starter text | `skewconfig-promptinstructions.md` | ✅ |
| PromptConfig editorial block | `promptconfig-editorial-value.txt` | ✅ |
| Old project narrative / setup | `SETUP.md`, old `HANDOFF`, `partner-system-buildout.md` wiring | ⚠️ STALE — schema & wiring drifted; use only for history |
| `workflow-*.json` files | n8n export snapshots | ⚠️ behind the live instance; the `.js` files + live n8n are ahead |

**Rule that has bitten us repeatedly:** the live n8n instance and the `.js` files are the truth. The exported workflow JSONs and old prose docs lag behind.

---

## 1. What the system is
Automated daily mortgage & real-estate news digest for **JWH Financial**. Gemini 2.5 Pro (Google Search grounding) generates the content from industry sources; **n8n** orchestrates generation, sending, signup, unsubscribe, and bounce handling; **Google Sheets** is the datastore; **Gmail** sends from `mortgage-digest@jwhfinance.com`; a **React signup page on Vercel** captures subscribers.

Layered on top: a **three-tier co-branding system** — JWH (lender) → Loan Officer (named contact w/ NMLS) → Referral Partner (distributor). Content is **skewed by partner TYPE** (general / realtor / attorney / builder / …), one digest variant generated per active type, branding injected per subscriber at send time.

---

## 2. Current status + THE open decision
**Pipeline is built end-to-end and the send flow is verified working** (general sends 2, marks complete, advances; full 4-variant cycle confirmed). Recent sessions closed every known send bug and added per-partner color theming:
- Log Send read Gmail's API response instead of the subscriber → reference `$('Send Batch by Variant').item.json.*`.
- Duplicate-rowKey cursor jam → Save Digest = appendOrUpdate on `rowKey`.
- **Triple-send root cause = reference-read fan-out** (a Sheets read without Execute Once runs once per input item and concatenates: 3/18/144 rows) → **Execute Once ON for all reads** + in-run `seenEmails` dedupe.
- **If2 polarity was backwards** (`_moreRemain is false` sent the drained case to a dead end → variants sent but never marked complete) → flipped to `is true`→dead-end / false→Mark Complete.
- **UTC/PT date seam** (rowKey baked UTC at generation vs UTC-now send filter disagreed across midnight) → both ends now use the **Pacific business day**.
- **Zero-unsent hardening** built (Send Batch emits a `_skipSend` control item; **Has Recipient?** IF routes it past Gmail to Mark Complete instead of halting).
- **Oversize catch wired** (Digest Length Check → non-sendable `oversize` marker; send cursor treats `oversize` as claimed).
- **Partner color theming** built — see §6a.

**Open decision blocking the current work (the co-branding "automation"):**
The signup page is already **dynamic** — one Vercel app serves every partner via `?partner=ID`, fetching branding live from the `partner-config` webhook. Adding a partner needs **zero** page rebuild (just a Partners-tab row). So "automate the landing page" forks three ways:
1. **Onboarding kit** *(recommended)* — when a partner is activated, auto-generate their `?partner=` link + QR + preview and email it to them. Highest leverage for a referral business; doesn't fight the dynamic design.
2. **Static per-partner vanity pages** (e.g. `/smith-realty`) built + deployed to Vercel. Re-creates the per-partner-page problem the dynamic app already solved, for a prettier URL.
3. **CI/CD auto-redeploy** of the dynamic app when code/branding changes. Real infra; likely premature.

> ⚠️ The current `digest-signup.jsx` is **not** in the project files — it lives in the GitHub repo `nobodyrandomly/mortgage-digest-signup`. Options 1 & 3 mostly don't touch it; option 2 needs it pasted in.

---

## 3. Architecture at a glance
n8n instance `jwhfinancial.app.n8n.cloud` (Pacific TZ). One canvas hosts several decoupled, time-triggered flows — no fragile loop-backs; each pass does one unit of work and the next tick reads state from the sheet.

| Flow | Trigger (cron) | Does |
|---|---|---|
| **Seed** | `45 3 * * 1-5` | Build today's GenQueue from SkewConfig + Subscribers |
| **Generator** | `*/3 4 * * 1-5` | One variant per run: Gemini → parse → link-fix → plagiarism → rewrite → build HTML → save to Digest |
| **Reset** | evening (`0 23 * * 0-4`) | Blank today's Digest `sendStatus` so the morning send can run |
| **Send** | `*/5 5-6 * * 1-5` | One variant's batch per run; chunked ≤50/run; per-subscriber double-send guard |
| **Signup** | webhook | Validate → Resolve Partner → appendOrUpdate Subscribers → welcome email |
| **Partner Config** | webhook (GET) | Returns a partner's/LO's public branding to the signup page |
| **Bounce** | Gmail trigger | Marks permanent (5.x.x) bounces only |

State machine: Digest `sendStatus` blank → `sending` → `complete` (or `oversize`); GenQueue `genStatus` pending → generating → generated (or failed); per-subscriber `lastSentDate` is the double-send guard (date-stamped, self-resets at date rollover).

---

## 4. Sheet tabs (schema → SHEET-CONFIG-CURRENT.md)
`Subscribers`, `Digest`, `Partners`, `LoanOfficers`, `SkewConfig`, `PromptConfig`, `GenQueue`, `GenerationLog`. All nodes reference columns **by header name** — order doesn't matter.
- Set at signup (Resolve Partner): `partnerId, partnerType, loId, comboId, unsubscribeUrl`
- Updated each send (Log node): `lastSentDate, lastSentStatus, lastSentAt, sendCount`
- `comboId = partnerType::partnerId::loId` — the unique rendered-email identity.
- **Partners.`pagePath`** (new) = public URL slug for `newsdigest.jwhfinance.com/<pagePath>`; decoupled from partnerId so the URL stays clean and routing keys never change. The config webhook resolves a path to this column, falling back to partnerId when blank.
- **Theming columns:** `Partners.partnerColor2` (optional 2nd brand color; primary+secondary feed the palette engine) and `GenerationLog.lengthStatus` (ok/warn/over). Defer to SHEET-CONFIG-CURRENT for full schema.
- Do **not** create a `SendQueue` tab (deprecated).
- **`Settings`** tab (key/value): operational toggles, flippable in-sheet. Current keys: `notify_lo_new_subscriber`, `notify_admin_new_subscriber` (TRUE/FALSE) — independently gate the LO vs admin new-subscriber alert. Read via a `Read Settings` node referenced by the notification code.

---

## 5. File inventory (current & accurate)
Node names in **bold** map via `NODE-NAMING-REFERENCE.md`.

**Generator code**
- `gen-seed-queue-code.js` — **Gen Seed Queue**: builds GenQueue (general always + each type with ≥1 active sub)
- `generate-get-next-variant.js` — **Next Variant Digest**: cursor, one pending variant/run, 3-retry cap
- `assemble-prompt-code.js` — **Assemble Prompt**: stitches PromptConfig editorial + SkewConfig skew
- `parse-digest-code.js` — multi-part JSON extraction (fence → any fence → first-brace-to-last)
- `validate-links-code.js` — Link Validator v3 (`this.helpers.httpRequest`, keeps unverifiable links)
- `plagiarism-check-code.js` — flags near-copies (excludes headlines)
- `rewrite-agent-code.js` — rewrites flagged stories
- `build-email-code.js` — Build HTML Email; emits **`{{C_*}}` theme tokens** + `{{BRAND_NAME}}` + swappable `<!-- HEADER_RIGHT -->` + `<!-- FOOTER_CONTACT -->` markers. Source-badge + rate up/down colors stay literal (semantic). Top Story = light accent pill (never blends with same-hue source chip).
- `digest-length-check-code.js` — oversize catch (50k Sheets-cell limit); `_skipSave` flag
- `generation-log-code.js` — health/debug log row (incl. `lengthStatus` ok/warn/over)

**Sender code**
- `send-get-next-variant.js` — **Next Variant Group**: cursor; skips only `complete`/`oversize`, treats `sending` as still-claimable (chunked draining)
- `send-batch-by-variant-code.js` — builds per-subscriber co-branded emails for one variant; caps `MAX_PER_RUN=50`; emits `_moreRemain`; in-run `seenEmails` dedupe; emits a `_skipSend` control item when zero unsent; **inlined partner-palette engine resolves `{{C_*}}` tokens per combo** + injects logo/"Curated for you by" header + footer
- `build-partner-palette.js` — standalone palette engine (HSL; brand-colored dark header, contrast/fallback inks, two distinct box hues). Logic is **inlined** into send-batch for runtime; keep this file to reuse at partner-onboarding palette precompute.
- `reset-daily-flags-code.js` — blanks today's Digest sendStatus

**Signup / co-branding code**
- `validate-signup-code.js` — 4-layer validation (format / disposable / typo / MX); captures `partnerId` + `loIdDirect`
- `resolve-partner-code.js` — derives `partnerType, loId, comboId, unsubscribeUrl`
- `partner-config-webhook-code.js` — config endpoint; handles `?partner=` AND `?lo=`
- `reassign-subscribers-code.js` — backfill/repair routing IDs for partnered AND partnerless subs (replaced restamp-combo-ids)
- `bounce-extract-code.js` — extracts permanent bounces
- `welcome-email-expression.txt` — welcome email HTML

**Gemini / prompt**
- `gemini-node-body-v3.json` + `gemini-node-body-INSTRUCTIONS.txt` — request body (JSON-only instruction)
- `gemini-system-instruction.txt`, `gemini-prompt-v3.txt` — prompt pieces
- `promptconfig-editorial-value.txt` — editorial block (paste into PromptConfig)
- `skewconfig-promptinstructions.md` — 5 starter skew values

**Docs (authoritative):** `SHEET-CONFIG-CURRENT.md`, `NODE-NAMING-REFERENCE.md`, `send-pipeline-architecture.md`, `prompt-config-sheet.md`, `partner-system-sheets.md`, `skewconfig-promptinstructions.md`

**Test data:** `testsubscribers.csv`, `testpartners.csv`, `testloanofficers.csv`

**Superseded / ignore for current behavior:** `determine-variants-code.js` (folded into the GenQueue seed flow), `cobranded-email-code.js` (→ send-batch-by-variant), `restamp-combo-ids-code.js` (→ reassign-subscribers), `SETUP.md`, the `workflow-*.json` exports.

---

## 6. Key decisions
- Skew by partner **type**, fully data-driven from SkewConfig — no hardcoded type list. `general` always generated; missing-variant subscribers fall back to general.
- 5 stories per digest (was 7) to stay under the 50k Sheets-cell limit. Mix-ratio line removed from editorial; balance lives in the `general` SkewConfig row.
- Denormalize stable IDs (`partnerId, partnerType, loId, comboId`) onto subscriber rows at signup; mutable branding (logo/color/contact) stays in Partners/LO and is looked up + cached per send run.
- Save to Subscribers = appendOrUpdate on email (dedup + reactivate resubscribers). Save Digest = appendOrUpdate on `rowKey` (NOT plain append — duplicate rowKeys jammed the send cursor).
- Email validation fails **open** on genuine network errors (bounce handler is the net); rejects NXDOMAIN/no-MX.
- Branding string is **"Mortgage & Real Estate Digest"** everywhere.
- Send is decoupled/time-triggered; the only loop is the well-tested inner Split→Send→Wait.
- Deployment: production page = subdomain `newsdigest.jwhfinance.com` pointed at Vercel (Vercel hosts; jwhfinance.com adds one CNAME). Partner URLs are path-based (`/<pagePath>`) via a `vercel.json` SPA rewrite; the single dynamic app serves all partners. n8n webhook calls stay cross-origin (no CORS issue today); proxying them behind the domain is optional later polish.

---

## 6a. Partner color theming
Partner supplies 1–2 brand colors (`Partners.partnerColor`, `Partners.partnerColor2`). `buildPartnerPalette()` expands them into a full token set with contrast/fallback logic baked in:
- **Brand-colored dark header** via HSL lightness drop (green stays green, gold→deep amber) — not a black-crush that made every partner look the same.
- Auto text color on fills; accent **darkened for text-on-white** if the brand color is too light; light page background (the page-bg blend must start from the light neutral — reversing it made dark-brand pages muddy).
- **Two distinct box hues**: Market Implications = primary family; Realtors/Agents = secondary. If the secondary shares the primary's hue (within 30°) or is absent, the engine rotates hue (`HUE_OFFSET=90`, general-digest-like) so the boxes always differ.
- **Not themed (semantic/identity):** rate up/down chips (red/green), per-source badge colors. Top Story is a light accent pill so it can't blend with a same-hue source chip.

Flow: Build HTML Email emits `{{C_*}}` placeholders once per type; send-batch `renderCombo` resolves them per combo. **No partner → exact JWH default palette**, so general digests are visually unchanged. The old redundant top partner band was removed; partner name lives in the header eyebrow and "Curated for you by [Partner]" / logo sits top-right.

`SHIP-CHECKLIST.md` has the full paste/import/wire/test order for this + the send fixes.

---

## 7. Critical recurring-bug lessons (the gold — don't reintroduce)
1. **`$helpers.request` is the WRONG helper in this n8n version** — it silently fails. Use **`this.helpers.httpRequest`** everywhere (validate-signup, validate-links, plagiarism, rewrite). This once made the email validator pass all bad emails and the link validator fall back every link to Google.
2. **Gmail node replaces the item with its API response** (id/threadId/labelIds). Anything downstream that needs subscriber fields must reference `$('Send Batch by Variant').item.json.*` (or enable pass-through), not `$json.*`.
3. **Gemini multi-part responses** (reasoning + JSON) break `JSON.parse`. parse-digest handles it; prompt also forces JSON-only.
4. **Save Digest must be appendOrUpdate on rowKey.** Plain append created duplicate rowKeys; Mark-Sending/Complete updated the first match while the cursor read the newest → permanent mismatch.
5. **Split In Batches:** output 0 = done, output 1 = loop. (Wiring got reversed once.)
6. **Mark Complete must be gated on `_moreRemain === false`** — and the **If2 polarity is easy to get backwards**: condition `{{ $('Send Batch by Variant').first().json._moreRemain }}` **is true** → dead-end (more chunks remain, leave `sending`); **false** → Mark Complete. Wired as `is false`→Mark-Complete once, which sent variants but never marked them, so the cursor re-picked the same one forever.
7. **Timezone — one business day on both ends.** The generator bakes the date into `rowKey` and the sender filters on it; if either uses UTC "today," they disagree across UTC midnight (showed up as "cursor found N variants but returned `_done`"). FIX: both `gen-seed-queue`, `generate-get-next-variant`, and `send-get-next-variant` derive `TODAY` from the **Pacific business day** (`toLocaleDateString('en-CA',{timeZone:'America/Los_Angeles'})`).
8. **JSX/Vercel:** no `href="#"`, no escaped apostrophes in template literals, always full-replace App.js.
9. **Reference-read fan-out:** a Google Sheets read **without Execute Once** runs once per input item and concatenates results — chaining Read Partners→LoanOfficers→Subscribers→Digests multiplied rows 3→18→144 and was the true cause of the triple-send (not duplicate rows, not Gmail retry). FIX: **Execute Once ON** for all reference/lookup reads; Gmail/Log-Send stay OFF (per-item); code nodes use "Run Once for All Items"; pair with the in-code `seenEmails` dedupe as backstop.

---

## 8. Open / next
- **Decide the co-branding automation fork** (§2) — landing-page direction (onboarding kit / vanity pages / CI/CD) still unpicked.
- **Run the live themed-send test** (SHIP-CHECKLIST §6): regenerate so stored HTML carries the new `{{C_*}}` tokens, then send a partner + a general subscriber and confirm both render. Prereq columns: **`Partners.partnerColor2`** and **`GenerationLog.lengthStatus`**.
- Build the **partner onboarding kit** (auto `?partner=` / `pagePath` link + QR + preview email) — the not-yet-built piece from the onboarding work.
- Run `reassign-subscribers` periodically / on partner-type or LO changes (recomputes comboId; backfills unsubscribeUrl).
- Optional generator efficiency: smart-cron trim of the `*/3 4` trigger, or an internal loop / driver workflow (per-variant timeout isolation). Neither affects Gmail send limits (sender-side).
- Longer term: Gmail → Resend/SendGrid for auto bounce/complaint handling + SPF/DKIM/DMARC; move digest storage off Sheets to drop the 50k cap.

**Done this session (was open):** clean single send verified; oversize-catch wired; zero-unsent hardened; timezone seam closed.

---

## 9. Key IDs & URLs
- Google Sheet ID: `1xwXBF7mVq9hENr2B43Ig9OS6TqF1H8CoOePfe8Zo8G0`
- Signup webhook: `https://jwhfinancial.app.n8n.cloud/webhook/digest-signup`
- Unsubscribe webhook: `…/webhook/digest-unsubscribe`
- Partner config webhook: `…/webhook/partner-config?partner=ID` (or `?lo=ID`)
- Signup page: `mortgage-digest-signup.vercel.app` — repo `nobodyrandomly/mortgage-digest-signup`
- Sender: `mortgage-digest@jwhfinance.com` / "Mortgage Digest | JWH Financial"

---

## 10. Test data
- Subscribers: `bobbybmir+test101..106@gmail.com`
  - 101–102 → realtor / Smith Realty (`smith-realty`)
  - 103 → attorney / Hahn Legal (`hahn-law`)
  - 104 → builder / Coastal Builders (`coastal-builders`)
  - 105–106 → direct / general
- Partners (all active, LO `bobby-mir`): smith-realty (realtor), hahn-law (attorney), coastal-builders (builder)

---

## 11. Changelog
- **2026-06-23 (send-pipeline close + theming)** — Verified clean 4-variant send. Fixed the triple-send (root cause = reference-read fan-out; Execute Once ON all reads + `seenEmails` dedupe), the If2 polarity (`is true`→dead-end / false→Mark Complete), and the UTC/PT date seam (Pacific business day in gen-seed, generate-get-next-variant, send-get-next-variant). Wired the oversize catch (Digest Length Check + `oversize-catch-nodes.json` bundle; non-sendable `oversize` marker; send cursor treats oversize as claimed) and added the zero-unsent control item + **Has Recipient?** gate. Built **partner color theming**: `build-partner-palette.js` (HSL engine, contrast/fallback, brand-colored header, two distinct box hues), tokenized `build-email-code.js` (`{{C_*}}`), palette inlined into `send-batch-by-variant-code.js`; dropped the redundant top partner band (logo/"Curated for you by" now in the main header); light Top Story pill. New columns: `Partners.partnerColor2`, `GenerationLog.lengthStatus`. Added `SHIP-CHECKLIST.md` (paste/import/wire/test order).
- **2026-06-23 (subscriber alert)** — Added `new-subscriber-notification-code.js`: Code node in the Signup workflow that emails the LO and/or admin on every new subscriber, each side gated by its **own** `Settings` toggle (`notify_lo_new_subscriber`, `notify_admin_new_subscriber`). Direct signups have no LO so only the admin toggle applies. Both off → returns `[]` (Gmail never fires). Defaults via `NOTIFY_LO_DEFAULT`/`NOTIFY_ADMIN_DEFAULT` when a row is missing. References LO_READ_NODE/PARTNER_READ_NODE/SETTINGS_READ_NODE (best-effort) + subscriber from incoming item (or SUBSCRIBER_NODE). **Verify:** node names match the live Signup workflow; place after Save Subscriber; add a `Read Settings` node. New tab: `Settings` (key, value). Partner-onboard alert still notifies both sides always — can get parallel `*_new_partner` toggles if wanted.
- **2026-06-23 (onboarding)** — Built self-service partner onboarding: `partner-onboarding-page.html` (token-gated page → public/, LO prefilled+locked, color picker + Cloudinary logo upload), `partner-onboarding-webhook-code.js` (single webhook, branches resolve/create on `action`; mints immutable `partnerId` + dedup `pagePath`; writes active Partners row; fires LO+admin alert), `vercel.json` (`/onboard` rewrite), `partner-onboarding-SETUP.md`. New: LoanOfficers `token` column; `ADMIN_EMAIL`/`PAGE_BASE` config in the code; Cloudinary cloud-name/preset config in the page. Alert = "new co-branded partner" to loEmail + ADMIN_EMAIL. Not yet built: partner-facing kit email + QR.
- **2026-06-23 (later)** — Deployment target decided: production = subdomain **newsdigest.jwhfinance.com** pointed at Vercel (Vercel stays the host; jwhfinance.com just adds a CNAME; vercel.app stays as staging). Partner URL form = `newsdigest.jwhfinance.com/<pagePath>`. Added a dedicated **`pagePath`** column to Partners (public URL slug, decoupled from partnerId) and updated: `digest-signup.jsx` (reads first path segment; precedence path → ?partner= → ?lo=), `partner-config-webhook-code.js` (new `?path=` lookup matching pagePath, falling back to partnerId), `vercel.json` (SPA rewrite), `testpartners.csv` (pagePath column). Next: build the partner onboarding kit (auto link + QR + preview email).
- **2026-06-23** — Consolidated all orientation into this single refreshed CONTEXT; reconciled schema (defer to SHEET-CONFIG-CURRENT), node names (NODE-NAMING-REFERENCE), and file inventory; marked stale docs; recorded send-flow bug fixes (Log Send upstream-ref, Save Digest appendOrUpdate) and the open co-branding-automation decision.
- Prior sessions: built decoupled GenQueue/cursor generation + chunked send; oversize-digest catch; co-branding three-tier system; ReAssign Subscribers (replaced restamp); rebrand to "Mortgage & Real Estate Digest"; hardened email + link validation to `this.helpers.httpRequest`; Gmail bounce handler.
