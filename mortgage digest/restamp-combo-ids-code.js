// RE-STAMP COMBO IDS — manual maintenance function.
// Run this after manually changing a partner's type or LO assignment in the
// Partners sheet. It recomputes partnerType, loId, and comboId for every
// subscriber tied to an affected partner, so their stored routing stays correct.
//
// Trigger: Manual Execute (or a manual-trigger node). Not on a schedule.
//
// Inputs:
//   $('Read Subscribers').all() → all subscriber rows
//   $('Read Partners').all()    → current partner rows
// Output: one item per subscriber whose comboId CHANGED, ready to write back
//         (appendOrUpdate on email). Subscribers with no change are skipped.

const subscribers = $('Read Subscribers').all().map(i => i.json);
const partners    = $('Read Partners').all().map(i => i.json);

const isTrue = (v) => v===true || v===1 ||
  (typeof v==='string' && ['true','1','yes','y'].includes(v.trim().toLowerCase()));

const partnersById = {};
for (const p of partners) {
  if (p.partnerId) partnersById[String(p.partnerId).trim().toLowerCase()] = p;
}

const changed = [];

for (const sub of subscribers) {
  const partnerId = (sub.partnerId || '').trim().toLowerCase();
  if (!partnerId) continue;  // direct / LO-only subscribers aren't tied to a partner record

  const partner = partnersById[partnerId];
  if (!partner) continue;    // partner no longer exists; leave as-is for manual review

  const newType = (partner.partnerType || 'general').trim().toLowerCase();
  const newLoId = String(partner.loId || '').trim().toLowerCase();
  const newCombo = `${newType}::${partnerId}::${newLoId || 'none'}`;

  const oldCombo = (sub.comboId || '').trim();
  if (newCombo !== oldCombo) {
    changed.push({
      json: {
        ...sub,
        partnerType: newType,
        loId: newLoId,
        comboId: newCombo,
      }
    });
  }
}

console.log(`[RE-STAMP] ${changed.length} subscriber(s) need updated comboId.`);
return changed;
