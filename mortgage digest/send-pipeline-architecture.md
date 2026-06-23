# Send Pipeline — Decoupled Architecture (time-triggered, no fragile loop-backs)

The send is split into THREE independent workflows. None loops back into itself
via node wiring. Instead, each does ONE simple pass and the next is picked up by
a time trigger reading state from the sheet. This eliminates n8n nested-loop and
loop-back failure modes.

State lives in the sheet:
- Digest tab `sendStatus` per variant: blank → 'sending' → 'complete'
- Subscriber `lastSentDate` / `lastSentStatus`: the per-subscriber double-send guard

────────────────────────────────────────────────────────
## WORKFLOW B1 — "Send: Process One Variant"
Trigger: Schedule, every 2 minutes (a lightweight cursor tick).

Does ONE thing: find the next incomplete variant, send its batch, mark complete.
One variant per run. Re-triggers itself by schedule until none remain.

FLOW (single pass, no internal variant loop):
1. Schedule trigger (every 2 min)
2. Read Partners
3. Read LoanOfficers
4. Fetch Active Subscribers
5. Fetch Today's Digests
6. Get Next Variant (code)            → next variant where sendStatus != complete
7. IF _done → STOP (nothing to send; the 2-min tick is harmless/no-op)
8. Mark Variant 'sending'  (Sheets update — claim it so overlapping ticks don't double-process)
9. Send Batch By Variant (code)       → builds per-subscriber emails for THIS variant,
                                          skipping anyone already sent today
10. Split In Batches (the inner send loop)
      → Send via Gmail
      → Wait (1.5–2s)
      → Update Subscriber sent-status (Sheets appendOrUpdate: lastSentDate, status, At)
      → loop back to Split (this inner loop is fine — single Split, well-tested pattern)
11. After Split 'done' → Mark Variant 'complete' (Sheets update)
12. End. Next schedule tick picks up the next variant (or no-ops if all complete).

Why every 2 min: gives each variant's send loop time to finish before the next
tick. A variant with a big batch + 2s waits takes a few minutes; the 'sending'
claim in step 8 prevents a second tick from grabbing the same variant.

────────────────────────────────────────────────────────
## WORKFLOW B2 — "Send: Reset Daily Flags"
Trigger: Schedule, 5:55 AM (after generator, before first send tick at 6:00).

Resets state so the day's sends can run:
1. Schedule trigger (5:55 AM)
2. Fetch Today's Digests
3. (optional) verify variants exist; if not, alert/no-op
4. Set each of today's Digest variant rows sendStatus = '' (blank/pending)
   — only today's rows; leaves history alone.

This is what 'arms' the B1 cursor each morning. Without it, yesterday's
'complete' flags would make B1 think there's nothing to send.

NOTE: Subscriber lastSentDate is NOT reset — it's date-stamped, so the
"already sent today" check naturally resets when the date rolls over.

────────────────────────────────────────────────────────
## WORKFLOW B3 — "Send: Stop Ticker" (optional safety)
Trigger: Schedule, e.g. 9:00 AM.
Purpose: belt-and-suspenders. If B1's schedule is set to only run a window,
you don't need this. But if B1 runs all day every 2 min, this isn't needed
either — B1 no-ops once everything is 'complete'. Skip unless you want B1's
schedule disabled outside a morning window.

────────────────────────────────────────────────────────
## Why this is robust
- No node loops back to a Code node across the workflow (the fragile pattern).
- The only loop is the single Split→Send→Wait inner loop — the well-tested one
  you already have working on the canvas.
- 'sending' claim prevents overlapping ticks from double-processing a variant.
- Per-subscriber lastSentDate prevents double-sends even if a tick overlaps or
  a run dies mid-variant.
- Each workflow is independently runnable/testable. You can manually execute
  B1 once to send a single variant and watch it work, before relying on the timer.

## Concurrency setting
In B1's workflow settings, consider limiting to 1 concurrent execution so two
schedule ticks can't run simultaneously. (n8n: workflow settings → limit execution
concurrency, or rely on the 'sending' flag claim in step 8.)

────────────────────────────────────────────────────────
## UPDATE: Option A — chunked sends (timeout-safe) + reduced gap

send-batch-by-variant-code.js now caps each execution to MAX_PER_RUN (50)
subscribers. A variant with more than 50 unsent subscribers drains across
multiple ticks. Each output item carries `_moreRemain` (true if subscribers
are still waiting after this chunk).

### Wiring consequence — Mark Variant Complete must be GATED
Mark Variant Complete should fire ONLY when the variant is fully drained, i.e.
when `_moreRemain` is false. Otherwise a 50-subscriber chunk would mark the
whole variant complete while 70 subscribers still haven't been sent.

Add an IF before Mark Variant Complete (on the Split 'done' branch):
  - Condition: {{ $('Send Batch By Variant').first().json._moreRemain }} is FALSE
  - true (no more remain) → Mark Variant Complete (sendStatus='complete')
  - false (more remain)   → do nothing; leave sendStatus='sending'

Because the variant stays 'sending', the send cursor (get-next-variant) skips it
on the immediate next tick? NO — it must NOT skip it, or the remaining subscribers
never get sent. Two ways to handle:

  OPTION 1 (recommended): the cursor treats 'sending' as claimable again after a
  short interval (like the generator's stale-claim recovery). Simpler: since each
  send execution is short (<=50 sends), just have the cursor pick 'sending' rows
  too, and rely on the per-subscriber lastSentDate filter to avoid double-sends.
  The 'sending' status then only means "in progress"; 'complete' means done.

  OPTION 2: don't mark 'sending' at all during chunked draining — drive entirely
  off per-subscriber lastSentDate. The variant is "done" when no subscribers of
  that type remain unsent today. The cursor checks: are there type-matching subs
  with lastSentDate != today? If yes, process; if no, mark complete & skip.

### Reduced gap
With chunks capped at 50, the Wait between sends can drop to ~1s (from 1.5–2s).
50 sends × 1s = ~50s per execution — short, non-bursty, well under timeout.
Tune later; drop the Wait entirely only when moving to Resend/SendGrid.

### Recommended cursor adjustment for chunking
get-next-variant (send) currently skips 'sending' AND 'complete'. For chunked
draining, it should skip ONLY 'complete', and treat 'sending' as still-needs-work
(because a 'sending' variant may have un-drained subscribers). The per-subscriber
lastSentDate filter in send-batch prevents any double-send. So:
  - skip variants where sendStatus = 'complete'
  - process variants where sendStatus = '' OR 'sending'
This lets a multi-chunk variant keep getting picked until fully drained, then
Mark Complete (gated on _moreRemain=false) finalizes it.
