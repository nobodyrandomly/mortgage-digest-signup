// RESOLVE PARTNER → derive partnerType + loId + comboId + unsubscribeUrl at signup.
// Runs in the signup flow after Validate Signup, before Save to Google Sheet.
// Denormalizes the stable routing identifiers onto the subscriber record ONCE at
// signup so the daily send path needs no recomputation:
//   - partnerType, loId  (routing + LO attach)
//   - comboId            (partnerType::partnerId::loId — which rendered email they get)
//   - unsubscribeUrl     (stored per subscriber, fetched at send, never rebuilt)
// NOTE: if a partner's type or LO changes later, run the re-stamp maintenance
// function to recompute comboId for affected subscribers.
//
// Inputs:
//   $input.first().json   → validated subscriber (includes partnerId, loIdDirect)
//   $('Read Partners').all() → partner rows
// Output: subscriber record + partnerType + loId + comboId + unsubscribeUrl

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

// comboId — the stable identifier for which rendered email this subscriber gets.
// Built once here at signup; the send loop renders one email per distinct comboId.
const comboId = `${partnerType}::${partnerId || 'none'}::${loId || 'none'}`;

// unsubscribeUrl — stored per subscriber, fetched (not rebuilt) at send time.
const unsubscribeUrl =
  `https://jwhfinancial.app.n8n.cloud/webhook/digest-unsubscribe?email=${encodeURIComponent(sub.email)}`;

const { loIdDirect, ...cleanSub } = sub;
return [{ json: {
  ...cleanSub,
  partnerType,
  loId,
  comboId,
  unsubscribeUrl,
}}];
