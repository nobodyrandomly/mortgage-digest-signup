const digest = $input.first().json;

// THEME TOKENS — placeholders resolved per-combo at send time by buildPartnerPalette
// in Send Batch (general/no-partner resolves to the JWH default palette). Semantic
// colors (rate up/down) and per-source badge colors stay LITERAL below — they carry
// meaning and must not be themed.
const T = {
  pageBg: '{{C_PAGE_BG}}', cardBg: '{{C_CARD_BG}}', border: '{{C_BORDER}}',
  stripe: '{{C_STRIPE}}', headerBg: '{{C_HEADER_BG}}', headerText: '{{C_HEADER_TEXT}}', eyebrow: '{{C_HEADER_EYEBROW}}',
  accentFill: '{{C_ACCENT_FILL}}', onAccent: '{{C_ON_ACCENT}}', accentInk: '{{C_ACCENT_INK}}',
  box1Bg: '{{C_BOX1_BG}}', box1Border: '{{C_BOX1_BORDER}}', box1Label: '{{C_BOX1_LABEL}}', box1Sub: '{{C_BOX1_SUBLABEL}}',
  box2Bg: '{{C_BOX2_BG}}', box2Border: '{{C_BOX2_BORDER}}', box2Label: '{{C_BOX2_LABEL}}', box2Text: '{{C_BOX2_TEXT}}',
  textPrimary: '{{C_TEXT_PRIMARY}}', textSecondary: '{{C_TEXT_SECONDARY}}', textMuted: '{{C_TEXT_MUTED}}',
  footerBg: '{{C_FOOTER_BG}}', footerText: '{{C_FOOTER_TEXT}}',
};

// Per-source badge identity colors (LITERAL — not themed)
const SOURCE_COLORS = {
  'HousingWire': '#1E3A8A', 'Mortgage News Daily': '#1E40AF', 'MBS Live': '#C2410C',
  'National Mortgage Professional': '#5B21B6', 'Federal Reserve': '#065F46', 'CFPB': '#166534',
  'Freddie Mac': '#1D4ED8', 'Fannie Mae': '#1E3A8A', 'Mortgage Bankers Association': '#9F1239',
  'National Association of Realtors': '#1D4ED8', 'Bloomberg': '#C2410C', 'Wall Street Journal': '#0D1321',
};
const CATEGORY_EMOJI = { rates: '📈', mbs: '📊', housing: '🏠', fed: '🏦', regulatory: '📋', gse: '🏛️', lender: '🏢', economy: '💼' };
const getSourceColor = (source) => {
  for (const [key, color] of Object.entries(SOURCE_COLORS)) {
    if (source.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return '#0D1321';
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

// Rate table — change chips are SEMANTIC (red up / green down), kept literal
const rateRows = (digest.marketSnapshot?.rates || []).map(r => {
  const isUp = r.change && r.change.startsWith('+');
  const isDown = r.change && r.change.startsWith('-');
  const changeColor = isUp ? '#DC2626' : isDown ? '#16A34A' : '#9CA3AF';
  const changeBg = isUp ? '#FEF2F2' : isDown ? '#F0FDF4' : '#F9FAFB';
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${T.border};font-family:${FONT};font-size:12px;font-weight:600;color:${T.textSecondary};letter-spacing:0.03em;">${r.label}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${T.border};font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:700;color:${T.textPrimary};text-align:right;">${r.value}</td>
    <td style="padding:10px 0 10px 8px;border-bottom:1px solid ${T.border};text-align:right;">
      <span style="display:inline-block;padding:2px 8px;background:${changeBg};color:${changeColor};font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;border-radius:20px;">${r.change || '—'}</span>
    </td>
  </tr>`;
}).join('');

// Story cards
const storyCards = digest.stories.map((story) => {
  const sourceColor = getSourceColor(story.source);   // LITERAL source identity
  const isTop = story.importance === 'high';
  const emoji = CATEGORY_EMOJI[story.category] || '';

  const keyPointsHtml = story.keyPoints?.length
    ? `<table cellpadding="0" cellspacing="0" width="100%" style="margin-top:10px;">
        ${story.keyPoints.map(p => `<tr><td style="padding:3px 0;vertical-align:top;font-family:${FONT};">
          <span style="color:${T.accentInk};font-weight:700;margin-right:6px;font-size:13px;">·</span><span style="font-size:13px;color:${T.textSecondary};line-height:1.5;">${p}</span>
        </td></tr>`).join('')}
      </table>`
    : '';

  const effects = story.effects;
  const effectsHtml = effects?.hasEffects
    ? `<table cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;border:1px solid ${T.box1Border};border-radius:8px;overflow:hidden;">
        <tr><td colspan="2" style="background:${T.box1Bg};padding:7px 12px 5px;">
          <span style="font-family:${FONT};font-size:9px;font-weight:700;color:${T.box1Label};letter-spacing:0.1em;text-transform:uppercase;">Market Implications</span>
        </td></tr>
        <tr>
          <td width="50%" valign="top" style="background:${T.box1Bg};padding:4px 12px 10px;border-right:1px solid ${T.box1Border};">
            <p style="margin:0 0 5px;font-size:9px;font-weight:700;color:${T.box1Sub};letter-spacing:0.08em;text-transform:uppercase;font-family:${FONT};">⚡ Immediate</p>
            ${(effects.firstOrder || []).map(e => `<p style="margin:0 0 4px;font-size:11px;color:${T.textSecondary};line-height:1.5;font-family:${FONT};">· ${e}</p>`).join('')}
          </td>
          <td width="50%" valign="top" style="background:${T.box1Bg};padding:4px 12px 10px;">
            <p style="margin:0 0 5px;font-size:9px;font-weight:700;color:${T.box1Label};letter-spacing:0.08em;text-transform:uppercase;font-family:${FONT};">〜 Downstream</p>
            ${(effects.secondOrder || []).map(e => `<p style="margin:0 0 4px;font-size:11px;color:${T.textSecondary};line-height:1.5;font-family:${FONT};">· ${e}</p>`).join('')}
          </td>
        </tr>
      </table>`
    : '';

  const rs = story.realtorSection;
  const realtorHtml = rs?.hasRealtorAngle
    ? `<table cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;border:1px solid ${T.box2Border};border-radius:8px;overflow:hidden;">
        <tr><td style="background:${T.box2Bg};padding:7px 12px 5px;">
          <span style="font-size:9px;font-weight:700;color:${T.box2Label};letter-spacing:0.1em;text-transform:uppercase;font-family:${FONT};">🏡 For Realtors &amp; Agents</span>
        </td></tr>
        <tr><td style="background:${T.box2Bg};padding:4px 12px 8px;">
          <p style="margin:0 0 6px;font-size:12px;color:${T.box2Text};line-height:1.55;font-family:${FONT};">${rs.summary}</p>
          ${(rs.actionables || []).map(a => `<p style="margin:0 0 3px;font-size:11px;color:${T.box2Label};line-height:1.5;font-family:${FONT};">→ ${a}</p>`).join('')}
        </td></tr>
      </table>`
    : '';

  const linkHtml = story.sourceUrl
    ? `<a href="${story.sourceUrl}" style="display:inline-block;margin-top:10px;font-family:${FONT};font-size:12px;font-weight:600;color:${T.accentInk};text-decoration:none;">Read full story →</a>`
    : '';

  return `<table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;border-radius:10px;overflow:hidden;border:1px solid ${T.border};">
    <tr>
      <td style="width:4px;background:${sourceColor};font-size:0;">&nbsp;</td>
      <td style="background:${T.cardBg};padding:14px 16px;border-radius:0 10px 10px 0;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr><td>
            <span style="display:inline-block;padding:3px 9px;background:${sourceColor};color:white;font-family:${FONT};font-size:9px;font-weight:700;letter-spacing:0.07em;border-radius:20px;text-transform:uppercase;">${story.source}</span>
            ${isTop ? ` <span style="display:inline-block;padding:2px 8px;background:${T.box1Bg};color:${T.accentInk};border:1px solid ${T.box1Border};font-family:${FONT};font-size:9px;font-weight:700;letter-spacing:0.06em;border-radius:20px;">★ Top Story</span>` : ''}
            ${emoji ? ` <span style="font-size:12px;">${emoji}</span>` : ''}
          </td></tr>
          <tr><td style="padding-top:8px;">
            <p style="margin:0 0 5px;font-family:${FONT};font-size:15px;font-weight:700;color:${T.textPrimary};line-height:1.35;">${story.headline}</p>
            <p style="margin:0;font-family:${FONT};font-size:13px;color:${T.textSecondary};line-height:1.6;">${story.summary}</p>
            ${keyPointsHtml}${effectsHtml}${realtorHtml}${linkHtml}
          </td></tr>
        </table>
      </td>
    </tr>
  </table>`;
}).join('');

const watchItems = (digest.watchList || []).map((item, i) =>
  `<tr><td style="padding:8px 0;border-bottom:1px solid ${T.border};vertical-align:top;">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="width:28px;vertical-align:top;padding-top:1px;">
        <span style="display:inline-block;width:20px;height:20px;background:${T.accentFill};border-radius:50%;text-align:center;line-height:20px;font-family:${FONT};font-size:10px;font-weight:700;color:${T.onAccent};">${i + 1}</span>
      </td>
      <td style="font-family:${FONT};font-size:13px;color:${T.textSecondary};line-height:1.6;">${item}</td>
    </tr></table>
  </td></tr>`
).join('');

const UNSUBSCRIBE_WEBHOOK = 'https://jwhfinancial.app.n8n.cloud/webhook/digest-unsubscribe';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${digest.subject || 'Daily Mortgage & Real Estate Digest'}</title>
</head>
<body style="margin:0;padding:0;background:${T.pageBg};font-family:${FONT};-webkit-text-size-adjust:100%;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:${T.pageBg};">
<tr><td align="center" style="padding:20px 12px 32px;">

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- TOP STRIPE -->
  <tr><td style="background:${T.stripe};height:5px;border-radius:10px 10px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- HEADER -->
  <tr><td style="background:${T.headerBg};padding:22px 24px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <p style="margin:0 0 2px;font-size:9px;font-weight:700;color:${T.eyebrow};letter-spacing:0.14em;text-transform:uppercase;font-family:${FONT};">{{BRAND_NAME}} · Daily Briefing · ${digest.date}</p>
        <p style="margin:0;font-size:22px;font-weight:800;color:${T.headerText};letter-spacing:-0.03em;line-height:1.2;font-family:${FONT};">Mortgage &amp; Real Estate Digest</p>
      </td>
      <!-- HEADER_RIGHT --><td align="right" valign="middle" style="padding-left:16px;"><div style="width:44px;height:44px;background:${T.accentFill};border-radius:10px;text-align:center;line-height:44px;font-size:22px;">🏠</div></td><!-- /HEADER_RIGHT -->
    </tr></table>
  </td></tr>

  <!-- MARKET SNAPSHOT -->
  <tr><td style="background:${T.cardBg};padding:20px 24px;">
    <p style="margin:0 0 3px;font-size:9px;font-weight:700;color:${T.accentInk};letter-spacing:0.12em;text-transform:uppercase;font-family:${FONT};">Market Snapshot</p>
    <p style="margin:0 0 16px;font-size:14px;color:${T.textSecondary};line-height:1.65;font-family:${FONT};">${digest.marketSnapshot?.narrative || ''}</p>
    <table cellpadding="0" cellspacing="0" width="100%">${rateRows}</table>
  </td></tr>

  <tr><td style="background:${T.pageBg};padding:8px 0;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- STORIES -->
  <tr><td style="background:${T.pageBg};padding:0 0 4px;">
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="padding:0 0 12px;">
        <p style="margin:0;font-size:9px;font-weight:700;color:${T.accentInk};letter-spacing:0.12em;text-transform:uppercase;font-family:${FONT};">Today's Top Stories</p>
      </td></tr>
    </table>
    ${storyCards}
  </td></tr>

  <tr><td style="background:${T.pageBg};padding:4px 0;font-size:0;">&nbsp;</td></tr>

  <!-- WHAT TO WATCH -->
  <tr><td style="background:${T.cardBg};padding:20px 24px;border-radius:10px;">
    <p style="margin:0 0 12px;font-size:9px;font-weight:700;color:${T.accentInk};letter-spacing:0.12em;text-transform:uppercase;font-family:${FONT};">What to Watch Today</p>
    <table cellpadding="0" cellspacing="0" width="100%">${watchItems}</table>
    ${digest.closingNote ? `<p style="margin:14px 0 0;font-size:13px;color:${T.textMuted};font-style:italic;line-height:1.6;border-top:1px solid ${T.border};padding-top:12px;font-family:${FONT};">${digest.closingNote}</p>` : ''}
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:${T.footerBg};padding:18px 24px;text-align:center;">
    <!-- FOOTER_CONTACT --><p style="margin:0 0 3px;font-size:12px;font-weight:700;color:${T.footerText};font-family:${FONT};">JWH Financial · Mortgage &amp; Real Estate Digest</p>
    <p style="margin:0 0 10px;font-size:10px;color:${T.textMuted};font-family:'Courier New',Courier,monospace;">mortgage-digest@jwhfinance.com</p><!-- /FOOTER_CONTACT -->
    <p style="margin:0 0 8px;font-size:9px;color:${T.textMuted};line-height:1.7;font-family:${FONT};">HousingWire · MND · MBS Live · NMP · Fed · CFPB · Freddie Mac · Fannie Mae<br>MBA · NAR · Inman · Zillow · Redfin · NAHB · CoStar · BLS · Census · Conference Board · Bloomberg RE · WSJ Housing</p>
    <p style="margin:0 0 10px;font-size:9px;color:${T.textMuted};font-style:italic;line-height:1.6;font-family:${FONT};">Summaries are independently generated. All rights belong to original publishers.</p>
    <a href="${UNSUBSCRIBE_WEBHOOK}?email={{subscriber_email}}" style="font-size:10px;color:${T.textMuted};text-decoration:underline;font-family:${FONT};">Unsubscribe</a>
  </td></tr>

  <!-- BOTTOM STRIPE -->
  <tr><td style="background:${T.stripe};height:4px;border-radius:0 0 10px 10px;font-size:0;line-height:0;">&nbsp;</td></tr>

</table>
</td></tr>
</table>
</body></html>`;

return [{ json: { html, subject: digest.subject || `🏠 Mortgage & Real Estate Digest — ${digest.date}`, digest } }];
