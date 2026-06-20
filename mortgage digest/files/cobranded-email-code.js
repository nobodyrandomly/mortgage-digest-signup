// CO-BRANDED EMAIL BUILDER
// Wraps a digest (subject + body HTML) with three-tier branding:
// JWH Financial (lender) + Loan Officer (contact) + Referral Partner (distributor).
// Branding is looked up per partner and CACHED within the run so we don't
// re-fetch for every subscriber sharing a partner.
//
// Expects each incoming item to carry:
//   subscriber fields: email, firstName, partnerId, partnerType, loId
//   digest fields for their type: subject, html  (already routed upstream)
// And reference data available via node lookups:
//   $('Read Partners').all()      → partner config rows
//   $('Read LoanOfficers').all()  → LO rows
//
// Output: per subscriber → { to, subject, html } ready for Gmail send.

const B = {
  navy: '#0D1321', blue: '#3B6FE8', light: '#9CA3AF',
  border: '#E2E5EC', muted: '#6B7280', pageBg: '#EEF0F5',
};

// ── Build lookup maps once ──
const partnersById = {};
for (const row of $('Read Partners').all().map(i => i.json)) {
  if (row.partnerId) partnersById[String(row.partnerId).trim().toLowerCase()] = row;
}
const losById = {};
for (const row of $('Read LoanOfficers').all().map(i => i.json)) {
  if (row.loId) losById[String(row.loId).trim().toLowerCase()] = row;
}

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// Build the co-branding header/footer block for a given partner + LO.
// Returns { headerBlock, footerBlock, accentColor } — empty header for direct subs.
function buildBranding(partner, lo) {
  const accent = (partner && partner.partnerColor && /^#[0-9a-fA-F]{6}$/.test(partner.partnerColor))
    ? partner.partnerColor : B.blue;

  // ── Partner co-brand bar (only if a partner exists) ──
  let headerBlock = '';
  if (partner && partner.partnerName) {
    const logoCell = (partner.partnerLogo && /^https?:\/\//.test(partner.partnerLogo))
      ? `<img src="${esc(partner.partnerLogo)}" alt="${esc(partner.partnerName)}" height="34" style="max-height:34px;display:block;border:0;" />`
      : `<span style="font-size:15px;font-weight:800;color:${accent};letter-spacing:-0.01em;">${esc(partner.partnerName)}</span>`;
    headerBlock = `
      <tr><td style="background:#FFFFFF;padding:14px 24px;border-bottom:2px solid ${accent};">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle;">${logoCell}</td>
          <td align="right" style="vertical-align:middle;font-size:10px;color:${B.muted};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
            Curated for you by<br><strong style="color:${B.navy};">${esc(partner.partnerName)}</strong>
          </td>
        </tr></table>
      </td></tr>`;
  }

  // ── Contact footer: JWH (lender) + LO (named contact) + partner ──
  const loBlock = lo ? `
    <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${esc(lo.loName)} &middot; JWH Financial</p>
    <p style="margin:0 0 8px;font-size:10px;color:${B.light};font-family:'Courier New',monospace;">${esc(lo.loEmail)}${lo.loPhone ? ' &middot; ' + esc(lo.loPhone) : ''}${lo.loNmls ? ' &middot; NMLS #' + esc(lo.loNmls) : ''}</p>`
    : `
    <p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#FFFFFF;">JWH Financial &middot; Mortgage Digest</p>
    <p style="margin:0 0 8px;font-size:10px;color:${B.light};font-family:'Courier New',monospace;">mortgage-digest@jwhfinance.com</p>`;

  const partnerContact = (partner && partner.partnerName) ? `
    <p style="margin:8px 0 0;font-size:10px;color:${B.light};line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;border-top:1px solid #1f2937;padding-top:10px;">
      Brought to you in partnership with <strong style="color:#FFFFFF;">${esc(partner.partnerName)}</strong>${partner.partnerContact ? ' &middot; ' + esc(partner.partnerContact) : ''}${partner.partnerPhone ? ' &middot; ' + esc(partner.partnerPhone) : ''}
    </p>` : '';

  const footerBlock = `${loBlock}${partnerContact}`;
  return { headerBlock, footerBlock, accent };
}

const out = [];

for (const item of $input.all()) {
  const sub = item.json;
  const partner = sub.partnerId ? partnersById[String(sub.partnerId).trim().toLowerCase()] : null;
  const lo = sub.loId ? losById[String(sub.loId).trim().toLowerCase()] : (partner && partner.loId ? losById[String(partner.loId).trim().toLowerCase()] : null);

  const { headerBlock, footerBlock, accent } = buildBranding(partner, lo);

  // The digest body HTML (already type-routed upstream) is in sub.html.
  // We inject the partner co-brand bar right after the opening wrapper and
  // replace the digest's default footer contact block with our co-branded one.
  let body = sub.html || '';

  // Insert partner header bar: place immediately after the first <tr> blue stripe
  // by injecting before the navy header row marker comment if present, else prepend.
  if (headerBlock) {
    if (body.includes('<!-- HEADER -->')) {
      body = body.replace('<!-- HEADER -->', headerBlock + '<!-- HEADER -->');
    } else {
      // Fallback: inject after first occurrence of the blue top stripe row
      body = body.replace(/(<tr><td style="background:#3B6FE8;height:5px[^<]*<\/td><\/tr>)/i, `$1${headerBlock}`);
    }
  }

  // Replace footer contact block (everything between the paired markers)
  // with the co-branded LO + partner contact block.
  const footerRe = /<!-- FOOTER_CONTACT -->[\s\S]*?<!-- \/FOOTER_CONTACT -->/;
  if (footerRe.test(body)) {
    body = body.replace(footerRe, footerBlock);
  }

  out.push({
    json: {
      to: sub.email,
      subject: sub.subject,
      html: body,
      _partnerType: sub.partnerType || 'general',
      _partner: partner ? partner.partnerName : 'direct',
    }
  });
}

console.log(`[CO-BRAND] Built ${out.length} email(s).`);
return out;
