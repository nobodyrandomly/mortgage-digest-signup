# Partner System — Google Sheet Tabs

Add these tabs to the same spreadsheet (`1xwXBF7mVq9hENr2B43Ig9OS6TqF1H8CoOePfe8Zo8G0`).
All nodes reference columns BY HEADER NAME, so column order doesn't matter and you can add columns later without breaking anything.

---

## Tab: `Partners`
One row per referral partner. `partnerId` is the value used in the signup URL (`?partner=partnerId`).

| Column | Example | Notes |
|---|---|---|
| partnerId | smith-realty | URL-safe slug, unique. Used in signup link. |
| partnerName | Smith Realty Group | Display name |
| partnerType | realtor | MUST match a `partnerType` in SkewConfig |
| partnerContact | Jane Smith | Contact person at the partner |
| partnerPhone | (555) 201-3344 | |
| partnerEmail | jane@smithrealty.com | |
| partnerLogo | https://.../logo.png | Optional; blank = name-only branding |
| partnerColor | #2E7D32 | Optional accent; blank = JWH blue default |
| loId | bobby-mir | MUST match a `loId` in LoanOfficers |
| active | TRUE | TRUE/FALSE |

Sample rows:
```
smith-realty | Smith Realty Group | realtor | Jane Smith | (555) 201-3344 | jane@smithrealty.com | | #2E7D32 | bobby-mir | TRUE
hahn-law      | Hahn Law Partners  | attorney| David Hahn  | (555) 442-8800 | dhahn@hahnlaw.com   | | #6A1B9A | bobby-mir | TRUE
```

---

## Tab: `LoanOfficers`
One row per LO. Lets individual LOs co-brand with their own partners.

| Column | Example | Notes |
|---|---|---|
| loId | bobby-mir | URL-safe slug, unique |
| loName | Bobby Mir | |
| loEmail | bobby@jwhfinance.com | |
| loPhone | (555) 100-2000 | |
| loNmls | 1234567 | NMLS # for compliance |
| loActive | TRUE | |

Sample row:
```
bobby-mir | Bobby Mir | bobby@jwhfinance.com | (555) 100-2000 | 1234567 | TRUE
```

---

## Tab: `SkewConfig`
One row per partner TYPE. THIS is what makes types expandable — add a row to add a type.
The generator reads this tab to know which variants exist and how to skew each.

| Column | Example | Notes |
|---|---|---|
| partnerType | realtor | Unique key, matches Partners.partnerType |
| displayName | For Real Estate Professionals | Shown in email eyebrow |
| promptInstruction | (see below) | Injected into Gemini prompt to skew content |
| active | TRUE | |

Sample rows (promptInstruction is the lever you'll refine):
```
general  | Daily Briefing | Provide a balanced mix across mortgage, real estate, macro, and regulatory news. | TRUE
realtor  | For Real Estate Professionals | Weight real estate market data, inventory, buyer demand, pricing trends, commission/brokerage news, and proptech more heavily. Expand realtorSection coverage. Lighten deep MBS/rate-mechanics detail. | TRUE
attorney | For Legal Professionals | Weight regulatory developments, CFPB actions, compliance, litigation, RESPA/TILA, fair-lending, and legal-structural changes more heavily. Add legal-implication notes where relevant. | TRUE
advisor  | For Financial Advisors | Weight macro/economic data, Fed policy, rate trajectory, and how housing/mortgage trends affect client wealth and portfolio decisions. | TRUE
builder  | For Builders & Developers | Weight housing starts, permits, builder sentiment (NAHB), construction costs, new-home sales, and land/development trends more heavily. | TRUE
```

> The generator only drafts a variant for a type if (a) it's active in SkewConfig AND (b) at least one active subscriber has that partnerType. `general` is always generated as the fallback/default for direct subscribers.

---

## Tab: `Subscribers` (add columns)
Add these columns to the existing Subscribers tab. Routing identifiers are set ONCE
at signup (by Resolve Partner); send-tracking is updated each daily send.

| New Column | Set when | Example | Notes |
|---|---|---|---|
| partnerId | signup | smith-realty | blank = direct subscriber (general digest, JWH branding) |
| partnerType | signup | realtor | denormalized for fast variant routing; blank → general |
| loId | signup | bobby-mir | denormalized; blank = no specific LO |
| comboId | signup | realtor::smith-realty::bobby-mir | partnerType::partnerId::loId — which rendered email they get. Re-stamp if partner type/LO changes. |
| unsubscribeUrl | signup | https://.../digest-unsubscribe?email=jane%40... | stored per subscriber, fetched (not rebuilt) at send |
| lastSentDate | each send | 2026-06-22 | YYYY-MM-DD of last successful send — the per-subscriber double-send guard |
| lastSentStatus | each send | sent / failed | send result for that date |
| lastSentAt | each send | 2026-06-22T13:00:05Z | timestamp of last send |

---

## Tab: `Digest` (add columns)
Add columns so each morning's variants are tagged and the send loop can track them.

| New Column | Example | Notes |
|---|---|---|
| rowKey | 2026-06-22::realtor | UNIQUE match key (digestDate::partnerType). Match Reset/Mark Sending/Mark Complete on THIS column. Set by Save Digest. |
| partnerType | realtor | which variant this row is. `general` for the default. |
| sendStatus | complete | blank/pending until all that variant's subscribers are sent; then `complete`. The send cursor reads this. |

Existing columns stay: `timestamp, subject, html`.

---

## Tab: `SendQueue` — ⚠️ DEPRECATED, DO NOT CREATE
> Superseded: send-tracking now lives on the Subscribers tab (lastSentDate/lastSentStatus)
> and variant-tracking on the Digest tab (sendStatus). The original SendQueue design
> below is kept for reference only.

### (original SendQueue design — not used)
The prep phase writes one row per active subscriber each morning. The send loop
reads it, sends, and marks status — so a retry skips anyone already sent.
NO rendered HTML is stored here (stays in-memory, rebuildable from Digest+branding),
keeping rows tiny and well under any cell limit.

| Column | Example | Notes |
|---|---|---|
| sendDate | 2026-06-20 | The date this queue row is for (YYYY-MM-DD) |
| email | jane@smithrealty.com | Subscriber |
| comboId | realtor::smith-realty::bobby-mir | Identifies which rendered combo email to send |
| unsubscribeUrl | https://.../digest-unsubscribe?email=jane%40... | Pre-built, stored per subscriber |
| partnerType | realtor | For audit/reporting |
| partnerId | smith-realty | For audit/reporting |
| loId | bobby-mir | For audit/reporting |
| sentStatus | pending / sent / failed | Send loop updates this |
| sentAt | 2026-06-20T13:00:05Z | Timestamp when sent |

**Retry safety:** On a re-run for the same sendDate, the send loop processes only
rows where sentStatus != 'sent'. Already-sent subscribers are skipped, so no
double-sends. The prep phase should upsert on (sendDate + email) so re-prepping
doesn't duplicate rows.

---

## Tab: `GenerationLog` (new — digest debugging & quality analysis)
One row per digest variant generated. Captures health/quality metadata WITHOUT
duplicating the digest HTML (that's in the Digest tab). Use it to spot quality
drift, link-validation problems, size bloat, or thin coverage over time.

Written by the "Log Generation" code node in the Generator, after Build HTML Email.

| Column | Example | What it tells you |
|---|---|---|
| loggedAt | 2026-06-22T05:31:10Z | When this variant was generated |
| digestDate | Friday, June 19, 2026 | The digest's own date |
| partnerType | general | Which variant |
| subject | Payment Shock: ... | The generated subject line |
| storyCount | 7 | Should be 7; deviation = prompt drift |
| highImportanceCount | 3 | Should be 2–3 |
| realtorSectionCount | 4 | How many stories had an agent angle |
| storiesWithEffects | 3 | How many had effects analysis |
| sources | Redfin, NAHB, ... | Source diversity — repeated sources = narrow research |
| categories | demand, inventory, ... | Topic spread |
| linkOk | 6 | Links that resolved — should be most of them |
| linkKeptUnknown | 1 | Unverifiable but kept |
| linkFixed | 0 | Re-found via Gemini search |
| linkFallback | 0 | Fell back to Google search — HIGH number = link problem |
| urlFallbackStories | 0 | Per-story count with fallback URLs |
| urlFixedStories | 0 | Per-story fixed |
| urlUnverifiedStories | 1 | Per-story unverified |
| htmlChars | 16397 | Email size — watch approach to 50,000 cell limit |
| skewUsed | Provide a balanced mix... | First 200 chars of the skew applied |
| searchQueryCount | 26 | How many searches Gemini ran |

**Reading the log:** a healthy general digest looks like ~7 stories, 2-3 high,
linkOk near storyCount, linkFallback ~0, htmlChars well under 50k. A row with
linkFallback=7 (like the pre-fix runs) flags the link validator misbehaving.

---

## Tab: `GenQueue` (new — digest generation lifecycle tracking)
Tracks the GENERATION status of each variant per day, independent of whether the
digest row got written. Seeded each morning, claimed and updated by the one-variant
generator. Enables auto-rerun of failed variants and prevents double-generation.

| Column | Example | Notes |
|---|---|---|
| rowKey | 2026-06-22::realtor | UNIQUE match key (genDate::partnerType). Match Mark Generating/Generated on THIS column. |
| genDate | 2026-06-22 | The day this variant is for (YYYY-MM-DD) |
| partnerType | realtor | Which variant |
| displayName | For Real Estate Professionals | From SkewConfig (convenience) |
| genStatus | pending / generating / generated / failed | Lifecycle state |
| genAttempts | 0 | Incremented each attempt; cursor skips after maxAttempts |
| lastError | (blank) | Error message if failed — for debugging |
| claimedAt | 2026-06-22T05:30:12Z | When a run claimed it (stale-claim recovery) |
| completedAt | 2026-06-22T05:31:40Z | When it succeeded |

**Lifecycle:**
- Seed (5:25 AM): one row per expected variant, genStatus=pending, genAttempts=0
- Cursor picks next where genStatus IN (pending, failed) AND genAttempts < maxAttempts
  (also re-claims 'generating' rows older than ~10 min — stale/crashed claim recovery)
- On claim: genStatus=generating, claimedAt=now, genAttempts++
- On success: genStatus=generated, completedAt=now
- On failure: genStatus=failed, lastError=message
- Auto-rerun: the schedule tick naturally retries 'failed' rows until maxAttempts (e.g. 3)

**Why separate from Digest tab:** a variant that fails BEFORE saving its digest still
needs its status tracked. GenQueue exists from seed time, so failures are always recorded.
