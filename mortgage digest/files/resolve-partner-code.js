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

if (partnerId) {
  const partners = $('Read Partners').all().map(i => i.json);
  const isTrue = (v) => {
    if (v === true) return true;
    if (typeof v === 'number') return v === 1;
    if (typeof v === 'string') return ['true','1','yes','y'].includes(v.trim().toLowerCase());
    return false;
  };
  const partner = partners.find(p =>
    String(p.partnerId || '').trim().toLowerCase() === partnerId && isTrue(p.active)
  );
  if (partner) {
    partnerType = (partner.partnerType || '').trim().toLowerCase();
    loId = String(partner.loId || '').trim().toLowerCase();
  }
}

// Default direct subscribers to the 'general' variant so the sender always
// has a variant to route them to.
if (!partnerType) partnerType = 'general';

return [{ json: {
  ...sub,
  partnerType,
  loId,
}}];
