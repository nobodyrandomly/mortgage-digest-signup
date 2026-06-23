// GET NEXT VARIANT — the outer-loop cursor.
// Finds the next TODAY digest variant whose sendStatus is not 'complete'.
// Returns that single variant row (with its sheet row number for status updates),
// or signals done when none remain.
//
// Input: $('Fetch Today's Digests').all() → today's digest rows incl. sendStatus
//        (Google Sheets read returns row_number when "include row number" is on,
//         or use the node's built-in row tracking)
// Output: { _done: true } if nothing left, else the next variant row to process.

const rows = $('Digests to Send').all().map(i => i.json);
const TODAY = new Date().toISOString().slice(0, 10);

// Skip CLAIMED variants. 'complete' = fully sent; 'oversize' = the digest blew the
// 50k Sheets cell limit and was written as a non-sendable marker (empty html) by the
// generator — it must never be picked up here. A 'sending' variant may still have
// undrained subscribers (chunked sends across ticks), so it stays pickable; the
// per-subscriber lastSentDate filter in send-batch prevents any double-send.
const isClaimed = (v) => {
  const s = String(v || '').trim().toLowerCase();
  return s === 'complete' || s === 'oversize';
};

// Only today's variants — match by rowKey date prefix (UTC, consistent with the
// generator/seed which build rowKey as `${TODAY}::type`). The timestamp field is
// Pacific-offset and would mismatch across the UTC midnight boundary, so we do
// NOT filter on it. Fall back to timestamp only if rowKey is absent.
const todays = rows.filter(r => {
  if (!r.html || !r.subject) return false;
  const key = String(r.rowKey || '');
  if (key) return key.startsWith(TODAY + '::');
  return (r.timestamp || '').slice(0, 10) === TODAY;  // legacy fallback
});

// Dedup to newest per partnerType
const byType = {};
for (const r of todays) {
  const t = (r.partnerType || 'general').trim().toLowerCase();
  if (!byType[t] || new Date(r.timestamp||0) > new Date(byType[t].timestamp||0)) byType[t] = r;
}

// First incomplete variant
const next = Object.values(byType).find(r => !isClaimed(r.sendStatus));

if (!next) {
  return [{ json: { _done: true } }];
}

return [{ json: { ...next } }];
