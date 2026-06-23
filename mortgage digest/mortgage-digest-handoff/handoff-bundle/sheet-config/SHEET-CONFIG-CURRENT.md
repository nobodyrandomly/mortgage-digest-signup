# Sheet Configuration — CURRENT (authoritative)
Spreadsheet ID: 1xwXBF7mVq9hENr2B43Ig9OS6TqF1H8CoOePfe8Zo8G0
All nodes reference columns BY HEADER NAME. Column order doesn't matter; add columns anytime.

This is the single source of truth for tab/column setup. (SETUP.md is older; ignore its schema.)

═══════════════════════════════════════════════════════════
## TAB: Subscribers
The master subscriber list. Routing IDs set at signup; send-tracking updated each send.

Headers:
  email, firstName, lastName, fullName, company, role, roleOther, phone,
  subscribedAt, active, sendCount, bounced, bouncedAt,
  unsubscribedAt, source, partnerId, partnerType, loId, comboId,
  unsubscribeUrl, lastSentDate, lastSentStatus, lastSentAt

Set at SIGNUP (by Resolve Partner): partnerId, partnerType, loId, comboId, unsubscribeUrl
Updated each SEND (by Log node): lastSentDate, lastSentStatus, lastSentAt, sendCount
  (sendCount = lifetime counter, incremented each send)
  (RETIRED: last_sent_at [dup of lastSentAt], send_count [renamed to sendCount])

═══════════════════════════════════════════════════════════
## TAB: Digest
One row per generated variant per day. The HTML archive + send-tracking.

Headers:
  rowKey, timestamp, subject, html, partnerType, sendStatus

  rowKey       = digestDate::partnerType  (e.g. 2026-06-22::realtor) — UNIQUE match key
  timestamp    = ISO timestamp of generation
  subject      = email subject
  html         = full rendered digest HTML
  partnerType  = which variant (general, realtor, attorney, ...)
  sendStatus   = blank → 'sending' → 'complete' (send cursor reads this)

Written by: Save Digest (generator). Updated by: reset / mark-sending / mark-complete (sender).

═══════════════════════════════════════════════════════════
## TAB: Partners
One row per referral partner. partnerId is the ?partner= URL value.

Headers:
  partnerId, partnerName, partnerType, partnerContact, partnerPhone,
  partnerEmail, partnerLogo, partnerColor, loId, active

═══════════════════════════════════════════════════════════
## TAB: LoanOfficers
One row per loan officer.

Headers:
  loId, loName, loEmail, loPhone, loNmls, loActive

═══════════════════════════════════════════════════════════
## TAB: SkewConfig
One row per partner TYPE. Drives which variants generate + how each is skewed.
Expandable — add a row to add a type. MUST have a 'general' row.

Headers:
  partnerType, displayName, promptInstruction, active

  promptInstruction = the AUDIENCE FOCUS text injected per variant
  (see skewconfig-promptinstructions.md for the 5 starter values)

═══════════════════════════════════════════════════════════
## TAB: PromptConfig
Holds the editorial portion of the Gemini prompt (tunable without touching n8n).

Headers:
  key, value

  One row: key='editorial', value=<the editorial block>
  (see promptconfig-editorial-value.txt for the value to paste)

═══════════════════════════════════════════════════════════
## TAB: GenQueue
Generation lifecycle tracking — what to generate today + retry state.
Seeded ~5:25 AM; consumed by the One-Variant generator.

Headers:
  rowKey, genDate, partnerType, displayName, genStatus, genAttempts,
  lastError, claimedAt, completedAt

  rowKey     = genDate::partnerType — UNIQUE match key
  genStatus  = pending → generating → generated  (or failed)
  genAttempts = retry counter (cursor caps at 3)

═══════════════════════════════════════════════════════════
## TAB: GenerationLog
Append-only quality/debug log — one row per variant generated.
NO HTML (that's in Digest). Captures health signals.

Headers:
  loggedAt, digestDate, partnerType, subject, storyCount, highImportanceCount,
  realtorSectionCount, storiesWithEffects, sources, categories, linkOk,
  linkKeptUnknown, linkFixed, linkFallback, urlFallbackStories, urlFixedStories,
  urlUnverifiedStories, htmlChars, skewUsed, searchQueryCount

═══════════════════════════════════════════════════════════
## DO NOT CREATE
- SendQueue — deprecated. Send-tracking lives on Subscribers (lastSentDate) and
  Digest (sendStatus). Do not create this tab.

═══════════════════════════════════════════════════════════
## TAB CHECKLIST
  [ ] Subscribers   (add: partnerId, partnerType, loId, comboId, unsubscribeUrl,
                          lastSentDate, lastSentStatus, lastSentAt)
  [ ] Digest        (add: rowKey, partnerType, sendStatus)
  [ ] Partners      (new)
  [ ] LoanOfficers  (new)
  [ ] SkewConfig    (new — incl. 'general' row)
  [ ] PromptConfig  (new — incl. 'editorial' row)
  [ ] GenQueue      (new)
  [ ] GenerationLog (new)
