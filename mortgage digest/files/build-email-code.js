const digest = $input.first().json;

// JWH Financial brand palette
const BRAND = {
  navy: '#0D1321',
  blue: '#3B6FE8',
  green: '#22C55E',
  red: '#DC2626',
  pageBg: '#EEF0F5',
  cardBg: '#FFFFFF',
  border: '#E2E5EC',
  textPrimary: '#0D1321',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  effectsBg: '#EEF2FF',
  effectsBorder: '#C7D2FE',
};

// Source badge colors — all in brand navy or blue family
const SOURCE_COLORS = {
  'HousingWire': '#1E3A8A',
  'Mortgage News Daily': '#1E40AF',
  'MBS Live': '#C2410C',
  'National Mortgage Professional': '#5B21B6',
  'Federal Reserve': '#065F46',
  'CFPB': '#166534',
  'Freddie Mac': '#1D4ED8',
  'Fannie Mae': '#1E3A8A',
  'Mortgage Bankers Association': '#9F1239',
  'National Association of Realtors': '#1D4ED8',
  'Bloomberg': '#C2410C',
  'Wall Street Journal': '#0D1321',
};

const CATEGORY_EMOJI = {
  rates: '📈', mbs: '📊', housing: '🏠',
  fed: '🏦', regulatory: '📋', gse: '🏛️',
  lender: '🏢', economy: '💼',
};

const getSourceColor = (source) => {
  for (const [key, color] of Object.entries(SOURCE_COLORS)) {
    if (source.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return BRAND.navy;
};

// Rate table
const rateRows = (digest.marketSnapshot?.rates || []).map(r => {
  const isUp = r.change && r.change.startsWith('+');
  const isDown = r.change && r.change.startsWith('-');
  const changeColor = isUp ? BRAND.red : isDown ? BRAND.green : BRAND.textMuted;
  const changeBg = isUp ? '#FEF2F2' : isDown ? '#F0FDF4' : '#F9FAFB';
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;color:${BRAND.textSecondary};letter-spacing:0.03em;">${r.label}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${BRAND.border};font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:700;color:${BRAND.textPrimary};text-align:right;">${r.value}</td>
    <td style="padding:10px 0 10px 8px;border-bottom:1px solid ${BRAND.border};text-align:right;">
      <span style="display:inline-block;padding:2px 8px;background:${changeBg};color:${changeColor};font-family:'Courier New',Courier,monospace;font-size:10px;font-weight:700;border-radius:20px;">${r.change || '—'}</span>
    </td>
  </tr>`;
}).join('');

// Story cards
const storyCards = digest.stories.map((story) => {
  const borderColor = getSourceColor(story.source);
  const isTop = story.importance === 'high';
  const emoji = CATEGORY_EMOJI[story.category] || '';

  const keyPointsHtml = story.keyPoints?.length
    ? `<table cellpadding="0" cellspacing="0" width="100%" style="margin-top:10px;">
        ${story.keyPoints.map(p => `<tr><td style="padding:3px 0;vertical-align:top;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          <span style="color:${BRAND.blue};font-weight:700;margin-right:6px;font-size:13px;">·</span><span style="font-size:13px;color:${BRAND.textSecondary};line-height:1.5;">${p}</span>
        </td></tr>`).join('')}
      </table>`
    : '';

  const effects = story.effects;
  const effectsHtml = effects?.hasEffects
    ? `<table cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;border:1px solid ${BRAND.effectsBorder};border-radius:8px;overflow:hidden;">
        <tr><td colspan="2" style="background:${BRAND.effectsBg};padding:7px 12px 5px;">
          <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:9px;font-weight:700;color:${BRAND.blue};letter-spacing:0.1em;text-transform:uppercase;">Market Implications</span>
        </td></tr>
        <tr>
          <td width="50%" valign="top" style="background:${BRAND.effectsBg};padding:4px 12px 10px;border-right:1px solid ${BRAND.effectsBorder};">
            <p style="margin:0 0 5px;font-size:9px;font-weight:700;color:${BRAND.navy};letter-spacing:0.08em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">⚡ Immediate</p>
            ${(effects.firstOrder || []).map(e => `<p style="margin:0 0 4px;font-size:11px;color:${BRAND.textSecondary};line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">· ${e}</p>`).join('')}
          </td>
          <td width="50%" valign="top" style="background:${BRAND.effectsBg};padding:4px 12px 10px;">
            <p style="margin:0 0 5px;font-size:9px;font-weight:700;color:${BRAND.blue};letter-spacing:0.08em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">〜 Downstream</p>
            ${(effects.secondOrder || []).map(e => `<p style="margin:0 0 4px;font-size:11px;color:${BRAND.textSecondary};line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">· ${e}</p>`).join('')}
          </td>
        </tr>
      </table>`
    : '';


  // Realtor section
  const rs = story.realtorSection;
  const realtorHtml = rs?.hasRealtorAngle
    ? `<table cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;border:1px solid #BBF7D0;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#F0FDF4;padding:7px 12px 5px;">
          <span style="font-size:9px;font-weight:700;color:#15803D;letter-spacing:0.1em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">🏡 For Realtors &amp; Agents</span>
        </td></tr>
        <tr><td style="background:#F0FDF4;padding:4px 12px 8px;">
          <p style="margin:0 0 6px;font-size:12px;color:#166534;line-height:1.55;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${rs.summary}</p>
          ${(rs.actionables || []).map(a => `<p style="margin:0 0 3px;font-size:11px;color:#15803D;line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">→ ${a}</p>`).join('')}
        </td></tr>
      </table>`
    : '';

  const linkHtml = story.sourceUrl
    ? `<a href="${story.sourceUrl}" style="display:inline-block;margin-top:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;font-weight:600;color:${BRAND.blue};text-decoration:none;">Read full story →</a>`
    : '';

  return `<table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;border-radius:10px;overflow:hidden;border:1px solid ${BRAND.border};">
    <tr>
      <td style="width:4px;background:${borderColor};font-size:0;">&nbsp;</td>
      <td style="background:${BRAND.cardBg};padding:14px 16px;border-radius:0 10px 10px 0;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr><td>
            <span style="display:inline-block;padding:3px 9px;background:${borderColor};color:white;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.07em;border-radius:20px;text-transform:uppercase;">${story.source}</span>
            ${isTop ? ` <span style="display:inline-block;padding:3px 9px;background:${BRAND.blue};color:white;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:0.06em;border-radius:20px;">★ Top Story</span>` : ''}
            ${emoji ? ` <span style="font-size:12px;">${emoji}</span>` : ''}
          </td></tr>
          <tr><td style="padding-top:8px;">
            <p style="margin:0 0 5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:${BRAND.textPrimary};line-height:1.35;">${story.headline}</p>
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.textSecondary};line-height:1.6;">${story.summary}</p>
            ${keyPointsHtml}
            ${effectsHtml}
            ${realtorHtml}
            ${linkHtml}
          </td></tr>
        </table>
      </td>
    </tr>
  </table>`;
}).join('');

// Watch list
const watchItems = (digest.watchList || []).map((item, i) =>
  `<tr><td style="padding:8px 0;border-bottom:1px solid ${BRAND.border};vertical-align:top;">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="width:28px;vertical-align:top;padding-top:1px;">
        <span style="display:inline-block;width:20px;height:20px;background:${BRAND.blue};border-radius:50%;text-align:center;line-height:20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;color:white;">${i+1}</span>
      </td>
      <td style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:${BRAND.textSecondary};line-height:1.6;">${item}</td>
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
<title>${digest.subject || 'Daily Mortgage Digest'}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.pageBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.pageBg};">
<tr><td align="center" style="padding:20px 12px 32px;">

<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- BLUE TOP STRIPE -->
  <tr><td style="background:${BRAND.blue};height:5px;border-radius:10px 10px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- HEADER -->
  <tr><td style="background:${BRAND.navy};padding:22px 24px 20px;border-radius:0;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <p style="margin:0 0 2px;font-size:9px;font-weight:700;color:${BRAND.blue};letter-spacing:0.14em;text-transform:uppercase;">JWH Financial · Daily Briefing · ${digest.date}</p>
        <p style="margin:0;font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:-0.03em;line-height:1.2;">Mortgage &amp; Real Estate Digest</p>
      </td>
      <td align="right" valign="middle" style="padding-left:16px;">
        <div style="width:44px;height:44px;background:${BRAND.blue};border-radius:10px;text-align:center;line-height:44px;font-size:22px;">🏠</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- MARKET SNAPSHOT -->
  <tr><td style="background:${BRAND.cardBg};padding:20px 24px;border-top:none;">
    <p style="margin:0 0 3px;font-size:9px;font-weight:700;color:${BRAND.blue};letter-spacing:0.12em;text-transform:uppercase;">Market Snapshot</p>
    <p style="margin:0 0 16px;font-size:14px;color:${BRAND.textSecondary};line-height:1.65;">${digest.marketSnapshot?.narrative || ''}</p>
    <table cellpadding="0" cellspacing="0" width="100%">${rateRows}</table>
  </td></tr>

  <!-- DIVIDER -->
  <tr><td style="background:${BRAND.pageBg};padding:8px 0;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- STORIES -->
  <tr><td style="background:${BRAND.pageBg};padding:0 0 4px;">
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="padding:0 0 12px;">
        <p style="margin:0;font-size:9px;font-weight:700;color:${BRAND.blue};letter-spacing:0.12em;text-transform:uppercase;">Today's Top Stories</p>
      </td></tr>
    </table>
    ${storyCards}
  </td></tr>

  <!-- DIVIDER -->
  <tr><td style="background:${BRAND.pageBg};padding:4px 0;font-size:0;">&nbsp;</td></tr>

  <!-- WHAT TO WATCH -->
  <tr><td style="background:${BRAND.cardBg};padding:20px 24px;border-radius:10px;">
    <p style="margin:0 0 12px;font-size:9px;font-weight:700;color:${BRAND.blue};letter-spacing:0.12em;text-transform:uppercase;">What to Watch Today</p>
    <table cellpadding="0" cellspacing="0" width="100%">${watchItems}</table>
    ${digest.closingNote ? `<p style="margin:14px 0 0;font-size:13px;color:${BRAND.textMuted};font-style:italic;line-height:1.6;border-top:1px solid ${BRAND.border};padding-top:12px;">${digest.closingNote}</p>` : ''}
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:${BRAND.navy};padding:18px 24px;border-radius:0;text-align:center;margin-top:8px;">
    <!-- FOOTER_CONTACT --><p style="margin:0 0 3px;font-size:12px;font-weight:700;color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">JWH Financial · Mortgage Digest</p>
    <p style="margin:0 0 10px;font-size:10px;color:${BRAND.textMuted};font-family:'Courier New',Courier,monospace;">mortgage-digest@jwhfinance.com</p><!-- /FOOTER_CONTACT -->
    <p style="margin:0 0 8px;font-size:9px;color:#374151;line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">HousingWire · MND · MBS Live · NMP · Fed · CFPB · Freddie Mac · Fannie Mae<br>MBA · NAR · Inman · Zillow · Redfin · NAHB · CoStar · BLS · Census · Conference Board · Bloomberg RE · WSJ Housing</p>
    <p style="margin:0 0 10px;font-size:9px;color:#4B5563;font-style:italic;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Summaries are independently generated. All rights belong to original publishers.</p>
    <a href="${UNSUBSCRIBE_WEBHOOK}?email={{subscriber_email}}" style="font-size:10px;color:${BRAND.textMuted};text-decoration:underline;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Unsubscribe</a>
  </td></tr>

  <!-- BLUE BOTTOM STRIPE -->
  <tr><td style="background:${BRAND.blue};height:4px;border-radius:0 0 10px 10px;font-size:0;line-height:0;">&nbsp;</td></tr>

</table>
</td></tr>
</table>
</body></html>`;

return [{ json: { html, subject: digest.subject || `🏠 Mortgage Digest — ${digest.date}`, digest } }];
