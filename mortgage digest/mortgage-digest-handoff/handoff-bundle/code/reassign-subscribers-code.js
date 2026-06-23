// REASSIGN SUBSCRIBERS — manual maintenance.
// Recomputes partnerType, loId, and comboId for EVERY subscriber so their stored
// routing matches current partner config. Run after:
//   - changing a partner's type or LO in the Partners sheet
//   - bulk-importing or hand-adding subscribers (who bypassed the signup flow)
//   - any time stored routing fields look wrong/blank
//
// Handles BOTH cases:
//   - Partnered subscriber (has partnerId): derive type/loId from the partner record
//   - Direct subscriber (no partnerId): assign general (general::none::none)
// Also backfills unsubscribeUrl if blank.
//
// Trigger: Manual Execute. Not scheduled.
//
// Inputs:
//   $('Subscribers for ReAssign').all() → all subscriber rows
//   $('Partners for ReAssign').all()    → current partner rows
// Output: one item per subscriber whose routing CHANGED (appendOrUpdate on email).

const subscribers = $('Subscribers for ReAssign').all().map(i => i.json);
const partners    = $('Partners for ReAssign').all().map(i => i.json);

const UNSUB_BASE = 'https://jwhfinancial.app.n8n.cloud/webhook/digest-unsubscribe';

const isTrue = (v) => v===true || v===1 ||
  (typeof v==='string' && ['true','1','yes','y'].includes(v.trim().toLowerCase()));

const partnersById = {};
for (const p of partners) {
  if (p.partnerId) partnersById[String(p.partnerId).trim().toLowerCase()] = p;
}

const changed = [];

for (const sub of subscribers) {
  if (!sub.email) continue;
  const partnerId = (sub.partnerId || '').trim().toLowerCase();

  let newType, newLoId;

  if (partnerId && partnersById[partnerId]) {
    // Partnered subscriber — derive from the partner record
    const partner = partnersById[partnerId];
    newType = (partner.partnerType || 'general').trim().toLowerCase();
    newLoId = String(partner.loId || '').trim().toLowerCase();
  } else {
    // Direct / partnerless subscriber — assign general
    newType = 'general';
    newLoId = String(sub.loId || '').trim().toLowerCase();  // keep any LO-only assignment
  }

  const newCombo = `${newType}::${partnerId || 'none'}::${newLoId || 'none'}`;
  const oldCombo = (sub.comboId || '').trim();

  // Backfill unsubscribeUrl if missing
  const newUnsub = sub.unsubscribeUrl && sub.unsubscribeUrl.trim()
    ? sub.unsubscribeUrl
    : `${UNSUB_BASE}?email=${encodeURIComponent(sub.email)}`;

  const typeChanged  = (sub.partnerType || '').trim().toLowerCase() !== newType;
  const loChanged    = (sub.loId || '').trim().toLowerCase() !== newLoId;
  const comboChanged = newCombo !== oldCombo;
  const unsubChanged = (sub.unsubscribeUrl || '') !== newUnsub;

  if (typeChanged || loChanged || comboChanged || unsubChanged) {
    changed.push({ json: {
      ...sub,
      partnerType: newType,
      loId: newLoId,
      comboId: newCombo,
      unsubscribeUrl: newUnsub,
    }});
  }
}

console.log(`[REASSIGN] ${changed.length} subscriber(s) updated (partnered + direct + unsub backfill).`);
return changed;
