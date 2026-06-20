// PARTNER / LO CONFIG WEBHOOK
// GET endpoint the signup page calls to fetch branding for either:
//   ?partner=ID  → full partner co-branding (partner + its LO)
//   ?lo=ID       → LO-only branding (no partner bar), for LOs building their own network
// Returns only public-safe fields.
//
// Path: /webhook/partner-config?partner=smith-realty  OR  ?lo=bobby-mir

const q = $('Partner Config Webhook').item.json.query || {};
const reqPartner = (q.partner || '').trim().toLowerCase();
const reqLo = (q.lo || '').trim().toLowerCase();

const partners = $('Read Partners').all().map(i => i.json);
const los = $('Read LoanOfficers').all().map(i => i.json);

const isTrue = (v) => {
  if (v === true) return true;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return ['true','1','yes','y'].includes(v.trim().toLowerCase());
  return false;
};

const findLo = (loId) => los.find(l =>
  String(l.loId || '').trim().toLowerCase() === String(loId || '').trim().toLowerCase()
  && (l.loActive === undefined || isTrue(l.loActive))
);

// ── Partner path (takes precedence if both supplied) ──
if (reqPartner) {
  const partner = partners.find(p =>
    String(p.partnerId || '').trim().toLowerCase() === reqPartner && isTrue(p.active)
  );
  if (partner) {
    const lo = findLo(partner.loId);
    return [{ json: {
      found: true,
      mode: 'partner',
      partnerId: reqPartner,
      partnerName: partner.partnerName || '',
      partnerType: (partner.partnerType || '').trim().toLowerCase(),
      partnerColor: /^#[0-9a-fA-F]{6}$/.test(partner.partnerColor || '') ? partner.partnerColor : '',
      partnerLogo: /^https?:\/\//.test(partner.partnerLogo || '') ? partner.partnerLogo : '',
      loId: String(partner.loId || '').trim().toLowerCase(),
      loName: lo ? (lo.loName || '') : '',
    }}];
  }
  return [{ json: { found: false } }];
}

// ── LO-only path ──
if (reqLo) {
  const lo = findLo(reqLo);
  if (lo) {
    return [{ json: {
      found: true,
      mode: 'lo',
      partnerId: '',
      partnerName: '',
      partnerType: 'general',     // LO-only signups get the general digest
      partnerColor: '',
      partnerLogo: '',
      loId: reqLo,
      loName: lo.loName || '',
    }}];
  }
  return [{ json: { found: false } }];
}

return [{ json: { found: false } }];
