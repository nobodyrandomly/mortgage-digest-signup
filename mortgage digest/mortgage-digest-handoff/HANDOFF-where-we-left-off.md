# Mortgage Digest — Handoff / Where We Left Off (2026-06-23)

## Status: end-to-end pipeline built; ONE bug blocking a clean single send.

### What works
- GENERATION: fully working. Seed → GenQueue → one-variant-per-tick generator →
  4 distinct co-branded/skewed digests saved to Digest tab (general, realtor,
  attorney, builder), each with rowKey (digestDate::partnerType). Verified.
- The send cursor date-match bug is FIXED (was comparing UTC "today" vs Pacific
  timestamp; now matches on rowKey date prefix). send-get-next-variant.js updated.
- Mark Group as Sending now works (rowKey value was empty; filled it).

### THE OPEN BUG (blocking clean send)
**Log Send to Sheet writes nothing because `{{ $json.email }}` resolves to [undefined].**
Cause: the Send via Gmail node OUTPUTS its own API response (id, threadId,
labelIds:["SENT"]) which REPLACES the subscriber data. So downstream Log Send
sees Gmail's response, not the subscriber — $json.email is undefined.

FIX (pick one):
- (Preferred) On Send via Gmail, enable "Include Other Input Fields" / pass-through
  so subscriber data survives the send; then $json.email etc. resolve in Log Send.
- OR point Log Send fields at $('Send Batch by Variant').item.json.email / .sendDate / .sendCount.
ALSO: refresh the Subscribers column list on Log Send (stale 'send_count' →
renamed to 'sendCount') to clear the "Column names were updated" error.

### WHY duplicates happened (3 copies of general)
Both double-send guards were down because the tracking writes were failing:
- Log Send wasn't writing subscriber lastSentDate (the per-subscriber guard)
- Mark Complete wasn't setting digest sendStatus=complete (the variant guard)
So each manual re-run re-sent. Fix Log Send + Mark Complete and both guards engage.

### Log Send to Sheet — correct mapping (Subscribers tab, appendOrUpdate, match email)
- email          → {{ $json.email }}        (needs Gmail pass-through ON, or use Send Batch ref)
- lastSentDate   → {{ $json.sendDate }}
- lastSentStatus → sent
- lastSentAt     → {{ $now.toISO() }}
- sendCount      → {{ $json.sendCount }}

### Mark Group as Complete (Digest tab, appendOrUpdate, match rowKey)
- rowKey     → {{ $('Next Variant Group').item.json.rowKey }}   (confirm not empty)
- sendStatus → complete
(GATED behind IF2: only fire when {{ $('Send Batch by Variant').first().json._moreRemain }} is false)

### Before re-testing: reset the slate
- Digest tab: set general row sendStatus back to BLANK (it's stuck at 'sending')
- Subscribers tab: clear any lastSentDate / lastSentStatus already written
Then run Send 4× (one per variant). Expect 6 emails total:
  general→105/106, realtor→101/102, attorney→103, builder→104

### Other open/deferred items
- digest-length-check-code.js built but NOT yet wired (alert email when HTML nears
  50k Sheets cell limit). Deferred to "tomorrow."
- 5-story cap set in editorial; mix line removed (balance lives in general skew).
- Timezone audit: confirm no other node slices a Pacific timestamp vs UTC "today".
- SETUP.md is STALE — use SHEET-CONFIG-CURRENT.md + CONTEXT + NODE-NAMING-REFERENCE.

### Key facts
- Sheet ID: 1xwXBF7mVq9hENr2B43Ig9OS6TqF1H8CoOePfe8Zo8G0
- n8n: jwhfinancial.app.n8n.cloud (Pacific TZ)
- Schedules: seed 45 3 * * 1-5 | generate */3 4 * * 1-5 | send */5 5-6 * * 1-5 | reset evening
- 8 tabs: Subscribers, Digest, Partners, LoanOfficers, SkewConfig, PromptConfig, GenQueue, GenerationLog
- Test data: bobbybmir+test101..106@gmail.com (101-102 realtor/Smith, 103 attorney/Hahn, 104 builder/Coastal, 105-106 direct/general)
