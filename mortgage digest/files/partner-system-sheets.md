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
Add these columns to the existing Subscribers tab. Denormalized IDs for fast send routing; branding stays in Partners/LO.

| New Column | Example | Notes |
|---|---|---|
| partnerId | smith-realty | blank = direct subscriber (general digest, JWH branding) |
| partnerType | realtor | denormalized for fast variant routing; blank = general |
| loId | bobby-mir | denormalized; blank = no specific LO |

---

## Tab: `Digest` (add column)
Add one column so each morning's variants are tagged.

| New Column | Example | Notes |
|---|---|---|
| partnerType | realtor | which variant this row is. `general` for the default. |

Existing columns stay: `timestamp, subject, html`.
