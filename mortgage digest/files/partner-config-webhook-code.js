// PARTNER CONFIG WEBHOOK
// GET endpoint the signup page calls to fetch a partner's branding.
// Reads the Partners + LoanOfficers sheets, returns safe public-facing fields only.
// Path suggestion: /webhook/partner-config?partner=smith-realty
//
// Inputs:
//   $('Partner Config Webhook').item.json.query.partner  → requested partnerId
//   $('Read Partners').all()      → partner rows
//   $('Read LoanOfficers').all()  → LO rows
// Output: { found, partnerName, partnerType, partnerColor, partnerLogo, loName }

const requested = ($('Partner Config Webhook').item.json.query?.partner || '').trim().toLowerCase();

const partners = $('Read Partners').all().map(i => i.json);
const los = $('Read LoanOfficers').all().map(i => i.json);

const isTrue = (v) => {
  if (v === true) return true;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return ['true','1','yes','y'].includes(v.trim().toLowerCase());
  return false;
};

if (!requested) {
  return [{ json: { found: false } }];
}

const partner = partners.find(p =>
  String(p.partnerId || '').trim().toLowerCase() === requested && isTrue(p.active)
);

if (!partner) {
  return [{ json: { found: false } }];
}

const lo = los.find(l =>
  String(l.loId || '').trim().toLowerCase() === String(partner.loId || '').trim().toLowerCase()
);

// Return ONLY public-safe branding fields (no LO email/phone/nmls to the page)
return [{ json: {
  found: true,
  partnerId: requested,
  partnerName: partner.partnerName || '',
  partnerType: (partner.partnerType || '').trim().toLowerCase(),
  partnerColor: /^#[0-9a-fA-F]{6}$/.test(partner.partnerColor || '') ? partner.partnerColor : '',
  partnerLogo: /^https?:\/\//.test(partner.partnerLogo || '') ? partner.partnerLogo : '',
  loId: String(partner.loId || '').trim().toLowerCase(),
  loName: lo ? (lo.loName || '') : '',
}}];
