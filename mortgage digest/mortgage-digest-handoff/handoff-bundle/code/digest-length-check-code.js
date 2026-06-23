// DIGEST LENGTH CHECK — guards against the 50k Sheets cell limit.
// Runs right after Build HTML Email, before Save Digest. Checks the rendered
// HTML size and flags when it's approaching the limit so you can act BEFORE
// a save fails.
//
// Thresholds:
//   >= 50000 → over limit (Save Digest WILL fail) — alert + flag _overLimit
//   >= WARN  → approaching limit — alert so you can trim before it fails
//
// Input:  $('Build HTML Email').first().json → { subject, html }
// Output: passes the digest through unchanged, plus _htmlChars / _lengthStatus,
//         and (if flagged) the fields an alert-email node needs.

const built = $('Build HTML Email').first().json;
const html = built.html || '';
const chars = html.length;

const HARD_LIMIT = 50000;   // Google Sheets per-cell max
const WARN = 45000;         // warn when within ~5k of the limit

let status = 'ok';
if (chars >= HARD_LIMIT) status = 'over';
else if (chars >= WARN) status = 'warn';

// Pull variant identity for the alert
let partnerType = 'general';
try { partnerType = $('Next Variant Digest').item.json.partnerType || 'general'; } catch (e) {}

const out = {
  ...built,
  _htmlChars: chars,
  _lengthStatus: status,
  _needsAlert: status !== 'ok',
  // Pre-built alert fields (used by the IF + Gmail alert branch)
  _alertSubject: '*** DIGEST LENGTH EXCEEDING STORAGE ***',
  _alertBody:
    `Digest length alert for variant "${partnerType}".\n\n` +
    `Rendered HTML: ${chars.toLocaleString()} characters\n` +
    `Sheets cell limit: ${HARD_LIMIT.toLocaleString()} characters\n` +
    `Status: ${status === 'over' ? 'OVER LIMIT — Save Digest will fail for this variant' : 'APPROACHING LIMIT'}\n\n` +
    `Action: reduce story count or per-story length in PromptConfig, or migrate ` +
    `digest storage off Google Sheets (the cell limit is the constraint).`,
};

console.log(`[LENGTH] ${partnerType}: ${chars} chars — status=${status}`);
return [{ json: out }];
