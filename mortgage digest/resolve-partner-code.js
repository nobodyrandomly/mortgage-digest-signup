// RESOLVE PARTNER → derive partnerType + loId from partnerId before saving.
// Runs in the signup flow after Validate Signup, before Save to Google Sheet.
// Looks up the partner in the Partners sheet; denormalizes partnerType + loId
// onto the subscriber record so the send path needs no second lookup.
//
// Inputs:
//   $input.first().json   → validated subscriber (includes partnerId)
//   $('Read Partners').all() → partner rows
// Output: subscriber record + partnerType + loId

const sub = $input.first().json;
const partnerId = (sub.partnerId || '').trim().toLowerCase();

let partnerType = '';
let loId = '';

const isTrue = (v) => {
  if (v === true) return true;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return ['true','1','yes','y'].includes(v.trim().toLowerCase());
  return false;
};

if (partnerId) {
  // Partner signup — derive type + LO from the partner record
  const partners = $('Read Partners').all().map(i => i.json);
  const partner = partners.find(p =>
    String(p.partnerId || '').trim().toLowerCase() === partnerId && isTrue(p.active)
  );
  if (partner) {
    partnerType = (partner.partnerType || '').trim().toLowerCase();
    loId = String(partner.loId || '').trim().toLowerCase();
  }
} else if (sub.loIdDirect) {
  // LO-only signup — attach the LO directly, general digest variant
  loId = String(sub.loIdDirect).trim().toLowerCase();
}

// Default to the 'general' variant so the sender always has something to route to.
if (!partnerType) partnerType = 'general';

const { loIdDirect, ...cleanSub } = sub;
return [{ json: {
  ...cleanSub,
  partnerType,
  loId,
}}];
