// GET NEXT VARIANT TO GENERATE (the generator cursor)
// Picks the next today's GenQueue row that needs generating:
//   - genStatus 'pending' or 'failed' (retry), with genAttempts < MAX_ATTEMPTS
//   - OR a 'generating' row whose claim is stale (older than STALE_MIN) — crash recovery
// Claims it (caller then updates the sheet to generating + increments attempts).
// Returns { _done: true } when nothing remains to do.
//
// Input: $('Read GenQueue').all() → today's GenQueue rows
// Output: the variant row to generate (with its SkewConfig promptInstruction), or _done.

const MAX_ATTEMPTS = 3;
const STALE_MIN = 10;   // re-claim a 'generating' row stuck longer than this

const queue = $('Read GenQueue').all().map(i => i.json);
const skews = $('Read SkewConfig').all().map(i => i.json);
const TODAY = new Date().toISOString().slice(0, 10);
const now = Date.now();

const todays = queue.filter(r => (r.genDate || '') === TODAY);

const skewByType = {};
for (const s of skews) {
  if (s.partnerType) skewByType[String(s.partnerType).trim().toLowerCase()] = s;
}

function needsWork(r) {
  const status = String(r.genStatus || '').trim().toLowerCase();
  const attempts = Number(r.genAttempts || 0);
  if (status === 'generated') return false;
  if (status === 'pending') return attempts < MAX_ATTEMPTS;
  if (status === 'failed') return attempts < MAX_ATTEMPTS;
  if (status === 'generating') {
    // stale-claim recovery: only re-claim if the claim is old
    const claimedMs = r.claimedAt ? new Date(r.claimedAt).getTime() : 0;
    return claimedMs && (now - claimedMs) > STALE_MIN * 60 * 1000 && attempts < MAX_ATTEMPTS;
  }
  return false;
}

const next = todays.find(needsWork);

if (!next) {
  const remaining = todays.filter(r => String(r.genStatus).toLowerCase() !== 'generated').length;
  console.log(`[GEN-CURSOR] Nothing to generate. ${remaining} unfinished (maxed out or none left).`);
  return [{ json: { _done: true } }];
}

const type = (next.partnerType || 'general').trim().toLowerCase();
const skew = skewByType[type] || {};

return [{ json: {
  ...next,
  partnerType: type,
  promptInstruction: skew.promptInstruction || '',
  displayName: next.displayName || skew.displayName || 'Daily Briefing',
  _claimAttempts: Number(next.genAttempts || 0) + 1,   // caller writes this back
}}];
