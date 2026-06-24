// PARTNER / LO CONFIG WEBHOOK
// GET endpoint the signup page calls to fetch branding for either:
//   ?path=SLUG   → production URL form (newsdigest.jwhfinance.com/<pagePath>);
//                  matches the Partners 'pagePath' column, falling back to partnerId
//   ?partner=ID  → full partner co-branding (legacy/query form)
//   ?lo=ID       → LO-only branding (no partner bar), for LOs building their own network
// Returns only public-safe fields. The response always carries the partner's real
// partnerId, so the signup payload + all downstream routing stay unchanged.
//
// Path: /webhook/partner-config?path=smith-realty  OR  ?partner=smith-realty  OR  ?lo=bobby-mir

const q = $('Partner Config Webhook').item.json.query || {};
const reqPath = (q.path || '').trim().toLowerCase();
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

// Build the public partner-branding response from a Partners row.
const buildPartnerResponse = (partner) => {
  const lo = findLo(partner.loId);
  return [{ json: {
    found: true,
    mode: 'partner',
    partnerId: String(partner.partnerId || '').trim().toLowerCase(),
    partnerName: partner.partnerName || '',
    partnerType: (partner.partnerType || '').trim().toLowerCase(),
    partnerColor: /^#[0-9a-fA-F]{6}$/.test(partner.partnerColor || '') ? partner.partnerColor : '',
    partnerLogo: /^https?:\/\//.test(partner.partnerLogo || '') ? partner.partnerLogo : '',
    loId: String(partner.loId || '').trim().toLowerCase(),
    loName: lo ? (lo.loName || '') : '',
  }}];
};

// ── Path slug (production: /<pagePath>) — takes precedence ──
// pagePath is the authoritative public slug. If a partner has no pagePath set, we
// fall back to matching their partnerId, so clean-slug partners need no extra setup
// and nothing breaks when pagePath is blank.
if (reqPath) {
  let partner = partners.find(p =>
    String(p.pagePath || '').trim().toLowerCase() === reqPath && isTrue(p.active)
  );
  if (!partner) {
    partner = partners.find(p =>
      String(p.partnerId || '').trim().toLowerCase() === reqPath && isTrue(p.active)
    );
  }
  return partner ? buildPartnerResponse(partner) : [{ json: { found: false } }];
}

// ── Partner path (?partner=) ──
if (reqPartner) {
  const partner = partners.find(p =>
    String(p.partnerId || '').trim().toLowerCase() === reqPartner && isTrue(p.active)
  );
  return partner ? buildPartnerResponse(partner) : [{ json: { found: false } }];
}

// ── LO-only path (?lo=) ──
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
