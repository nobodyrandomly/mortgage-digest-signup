# SHIP CHECKLIST — Send-Pipeline Fixes, Oversize Catch, Timezone, Partner Theming

Do these **in order**. Phases 1–4 are the bug fixes (already mostly applied during the
session — verify each); Phase 5 is the new partner color theming.

---

## Files in this drop

**Paste into existing code nodes:**
| File | n8n node | Workflow |
|---|---|---|
| `send-get-next-variant.js` | Next Variant Group (cursor) | Sender (B) |
| `send-batch-by-variant-code.js` | Send Batch by Variant | Sender (B) |
| `generate-get-next-variant.js` | Next Variant Digest (cursor) | Generator (A) |
| `gen-seed-queue-code.js` | Seed GenQueue | Generator (A) |
| `generation-log-code.js` | Log Generation | Generator (A) |
| `digest-length-check-code.js` | Digest Length Check (new) | Generator (A) |
| `build-email-code.js` | Build HTML Email | Generator (A) |

**Import (creates new nodes):**
| File | Where |
|---|---|
| `oversize-catch-nodes.json` | Paste onto the Generator (A) canvas |

**Reference only (logic already inlined into Send Batch):**
| File | Purpose |
|---|---|
| `build-partner-palette.js` | Standalone palette engine — keep for partner-onboarding reuse |

---

## Phase 1 — Sheet changes

1. **Partners tab** — add a column **`partnerColor2`** (right of `partnerColor`). Optional per partner; one color still themes fully, two unlock the explicit second box color when the hues differ. Both accept `#RRGGBB`.
2. **Subscribers tab** — confirm the column is **`sendCount`** (not `send_count`). Confirm `lastSentDate`, `lastSentAt`, `lastSentStatus` exist.
3. **GenerationLog tab** — add a column **`lengthStatus`** (values: ok / warn / over).
4. **Digest tab** — delete any duplicate-`rowKey` rows so there's exactly one row per `rowKey`.

---

## Phase 2 — Send pipeline correctness (Sender / Workflow B)

5. **Execute Once = ON** on all four reads: Read Partners, Read LoanOfficers, Subscribers to Send, Digests to Send. (This kills the read fan-out that caused 3× / 18× / 144× item counts.)
6. **Send Batch by Variant** → Settings → Mode = **Run Once for All Items**. Paste `send-batch-by-variant-code.js`.
7. **Send via Gmail** and **Log Send to Sheet** → Execute Once = **OFF** (they must run per recipient).
8. **Log Send to Sheet** field mappings reference the source node, not `$json`:
   - `email` → `{{ $('Send Batch by Variant').item.json.email }}`
   - `lastSentDate` → `{{ $('Send Batch by Variant').item.json.sendDate }}`
   - `lastSentStatus` → `sent` · `lastSentAt` → `{{ $now.toISO() }}` · `sendCount` → `{{ $('Send Batch by Variant').item.json.sendCount }}`
   - Match column = `email`; click **refresh columns** after the `sendCount` rename.
9. **Has Recipient?** IF (after Send Batch): condition `{{ $json._skipSend }}` **is true**, Convert types ON.
   - **true** → Mark Group as Complete (skip the loop — empty variant)
   - **false** → **Split Subscribers** (input)
10. **Split Subscribers** loop wiring: loop output → Send via Gmail → Log Send → 1sec Send Pause → back into Split Subscribers; done output → If2. (Send via Gmail's only input is Split's loop output.)
11. **If2** condition: `{{ $('Send Batch by Variant').first().json._moreRemain }}` **is true**.
    - **true** → dead-end (more chunks remain; leave `sending`)
    - **false** → Mark Group as Complete
    *(This is the polarity flip — the drained case must reach Mark Complete.)*

---

## Phase 3 — Save Digest dedup (Generator / Workflow A)

12. **Save Digest to Sheet** → operation **appendOrUpdate**, match column **`rowKey`**. (Stops duplicate digest rows that desync the send cursor.)

---

## Phase 4 — Timezone (both workflows)

13. Already in the pasted cursor/seed files: all three derive "today" from the Pacific business day. Confirm after pasting `gen-seed-queue-code.js`, `generate-get-next-variant.js`, and `send-get-next-variant.js` that line reads:
    `const TODAY = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });`
    This keeps the generator's rowKey date and the sender's filter on the same calendar day (was UTC; caused "found N, marked done" near UTC midnight).

---

## Phase 5 — Oversize catch flow + Partner theming (Generator / Workflow A)

14. Add the **Digest Length Check** node and paste `digest-length-check-code.js`. Wire **Build HTML Email → Digest Length Check**.
15. **Import `oversize-catch-nodes.json`** onto the canvas (adds Needs Alert?, Send Length Alert, Over Limit?, Save Oversize Marker, Mark GenQueue Oversize, pre-wired internally). Then connect to existing nodes:
    - Digest Length Check → **both** Needs Alert? **and** Over Limit? (two wires)
    - Over Limit? **false** → Save Digest to Sheet
    - Mark GenQueue Oversize → **Log Generation** (so oversize variants still log)
    - Send Length Alert → leave dead-ending (do not wire its output)
    - Set **Send Length Alert** recipient (`sendTo`) to your inbox; re-select the Gmail + Sheets credentials if prompted.
16. Paste `generation-log-code.js` into **Log Generation** (adds `lengthStatus` column write).
17. Paste **`build-email-code.js`** into **Build HTML Email** (tokenized theme + light Top Story pill).
18. Paste **`send-batch-by-variant-code.js`** into **Send Batch by Variant** (palette engine inlined + token resolution per combo). *(Same file as step 6 — paste once.)*

---

## Phase 6 — Test (keep the workflow DEACTIVATED; run manually)

19. **Regenerate today's digests** (run the generator) so the stored HTML carries the new `{{C_*}}` tokens. Old stored digests have literal JWH colors and won't theme.
20. Reset test state: clear `lastSentDate`/`lastSentStatus` on test subscribers; confirm the four Digest rows have blank `sendStatus`.
21. **Run the sender 4×** (one per variant). Expect: each variant sends, marks `complete`, advances. A 5th run returns `_done` and exits clean.
22. Confirm a **partner** subscriber renders themed (header band in brand color, two distinct boxes, logo or "Curated for you by", source chip vs light Top Story pill contrast) and a **general** subscriber renders the unchanged JWH look.
23. Reactivate the schedule when satisfied.

---

## Optional follow-ups (not required to ship)

- **Smart cron:** trim the generator trigger from `*/3 4` (20 fires) to an explicit short list, e.g. `0,3,6,9,12,15 4 * * 1-5`. Empty ticks are cheap (cursor returns `_done` before any Gemini call) — this only trims n8n execution count.
- **Generator internal loop / driver workflow:** collapse per-tick processing into one fire. Driver workflow gives per-variant timeout isolation; Wait-in-loop gives rate-limit spacing. Neither affects Gmail send limits (those are sender-side).
- **Honor same-hue partner secondaries:** currently a same-hue secondary is overridden to force distinct boxes. Flip `HUE_OFFSET` / the 30° guard in the palette if a brand wants strictly its two same-hue colors.
