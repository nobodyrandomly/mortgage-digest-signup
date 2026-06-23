// DIGEST LENGTH CHECK — guards against the 50k Sheets cell limit.
// Runs right after Build HTML Email. Fans out to two branches in the generator:
//   (1) alert branch  — "Needs Alert?" IF on _needsAlert (fires for warn AND over)
//   (2) save-routing   — "Over Limit?" IF on _skipSave (true only when over)
// Non-destructive: passes the digest through unchanged (subject/html survive via
// ...built), so whichever save node runs can still map $json.subject / $json.html.
//
// Thresholds:
//   >= 50000 → over limit (Save Digest WOULD fail) — skip the real save, write a
//              non-sendable oversize marker instead, mark the queue 'oversize'
//   >= WARN  → approaching limit — saves normally, but alerts so you can trim first
//
// Input:  $('Build HTML Email').first().json → { subject, html }
// Output: the digest, plus _htmlChars / _lengthStatus / _needsAlert / _skipSave,
//         and (when flagged) the fields the alert-email node needs.

const built = $('Build HTML Email').first().json;
const html = built.html || '';
const chars = html.length;

const HARD_LIMIT = 50000;   // Google Sheets per-cell max
const WARN = 45000;         // warn when within ~5k of the limit

let status = 'ok';
if (chars >= HARD_LIMIT) status = 'over';
else if (chars >= WARN) status = 'warn';

// Pull variant identity for the alert / marker
let partnerType = 'general';
let rowKey = '';
try {
  const v = $('Next Variant Digest').item.json;
  partnerType = v.partnerType || 'general';
  rowKey = v.rowKey || '';
} catch (e) {}

const out = {
  ...built,
  _htmlChars: chars,
  _lengthStatus: status,
  _needsAlert: status !== 'ok',          // true for warn OR over → drives the alert IF
  _skipSave: status === 'over',          // true ONLY when over → drives the save-routing IF
  _partnerType: partnerType,
  _rowKey: rowKey,
  // Pre-built alert fields (used by the Send Length Alert Gmail node)
  _alertSubject: status === 'over'
    ? `*** DIGEST OVER LIMIT — NOT SENT: ${partnerType} ***`
    : `*** DIGEST LENGTH APPROACHING LIMIT: ${partnerType} ***`,
  _alertBody:
    `Digest length alert for variant "${partnerType}".\n\n` +
    `Rendered HTML: ${chars.toLocaleString()} characters\n` +
    `Sheets cell limit: ${HARD_LIMIT.toLocaleString()} characters\n` +
    `Status: ${status === 'over'
      ? 'OVER LIMIT — real save was SKIPPED. An oversize marker was written and this '
        + 'variant will NOT be sent today. Its subscribers get no digest unless a '
        + 'general fallback is added to the sender.'
      : 'APPROACHING LIMIT — saved normally this run, but trim it before it crosses 50k.'}\n\n` +
    `Action: reduce story count or per-story length in PromptConfig, or migrate ` +
    `digest storage off Google Sheets (the 50k cell limit is the constraint).`,
};

console.log(`[LENGTH] ${partnerType}: ${chars} chars — status=${status}, skipSave=${out._skipSave}`);
return [{ json: out }];
