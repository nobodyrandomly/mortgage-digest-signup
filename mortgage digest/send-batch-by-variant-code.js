// SEND — BATCH BY VARIANT, GROUPED BY COMBO, PER-SUBSCRIBER SENT FILTER
// Outer cursor: Digest variants where sendStatus != complete.
// This node processes ONE variant per execution (the next incomplete one),
// renders each distinct combo under it once, and emits per-subscriber send items
// for only those NOT already sent today. A loop/cron re-invokes for the next variant.
//
// Inputs:
//   $('Next Variant Group').first().json   → the digest variant row to process
//                                            { timestamp, subject, html, partnerType, sendStatus, _row }
//   $('Subscribers to Send').all()  → subscriber rows (comboId, partnerType, partnerId,
//                                            loId, unsubscribeUrl, lastSentDate, lastSentStatus)
//   $('Read Partners').all()
//   $('Read LoanOfficers').all()
//
// Output: one item per subscriber to send (with rendered html + their unsubscribe link),
//         PLUS carries the variant row ref so the workflow can mark it complete after.

const variant   = $('Next Variant Group').first().json;
const subscribers = $('Subscribers to Send').all().map(i => i.json);
const partners  = $('Read Partners').all().map(i => i.json);
const los       = $('Read LoanOfficers').all().map(i => i.json);

const TODAY = new Date().toISOString().slice(0, 10);
const B = { navy:'#0D1321', blue:'#3B6FE8', light:'#9CA3AF', muted:'#6B7280' };

// Chunk cap: max subscribers sent per execution (Option A — timeout-safe).
// Each execution sends up to this many of a variant's unsent subscribers, then ends.
// The schedule re-triggers; already-sent subscribers (lastSentDate=today) are
// skipped, so the next run continues where this one stopped. Raise/lower to tune
// execution length vs. how many ticks a large variant takes to fully send.
const MAX_PER_RUN = 50;

const isTrue = (v) => v===true || v===1 ||
  (typeof v==='string' && ['true','1','yes','y'].includes(v.trim().toLowerCase()));
const esc = (s) => String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const variantType = (variant.partnerType || 'general').trim().toLowerCase();

// ── lookup maps ──
const partnersById = {};
for (const p of partners) if (p.partnerId) partnersById[String(p.partnerId).trim().toLowerCase()] = p;
const losById = {};
for (const l of los) if (l.loId) losById[String(l.loId).trim().toLowerCase()] = l;

// ── co-brand renderer (once per combo) ──
function renderCombo(partner, lo) {
  const accent = (partner && /^#[0-9a-fA-F]{6}$/.test(partner.partnerColor||'')) ? partner.partnerColor : B.blue;
  let headerBlock = '';
  if (partner && partner.partnerName) {
    const logo = (partner.partnerLogo && /^https?:\/\//.test(partner.partnerLogo))
      ? `<img src="${esc(partner.partnerLogo)}" alt="${esc(partner.partnerName)}" height="34" style="max-height:34px;display:block;border:0;" />`
      : `<span style="font-size:15px;font-weight:800;color:${accent};">${esc(partner.partnerName)}</span>`;
    headerBlock = `<tr><td style="background:#FFFFFF;padding:14px 24px;border-bottom:2px solid ${accent};"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle;">${logo}</td><td align="right" style="vertical-align:middle;font-size:10px;color:${B.muted};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Curated for you by<br><strong style="color:${B.navy};">${esc(partner.partnerName)}</strong></td></tr></table></td></tr>`;
  }
  const loBlock = lo
    ? `<p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${esc(lo.loName)} &middot; JWH Financial</p><p style="margin:0 0 8px;font-size:10px;color:${B.light};font-family:'Courier New',monospace;">${esc(lo.loEmail)}${lo.loPhone?' &middot; '+esc(lo.loPhone):''}${lo.loNmls?' &middot; NMLS #'+esc(lo.loNmls):''}</p>`
    : `<p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#FFFFFF;">JWH Financial &middot; Mortgage &amp; Real Estate Digest</p><p style="margin:0 0 8px;font-size:10px;color:${B.light};font-family:'Courier New',monospace;">mortgage-digest@jwhfinance.com</p>`;
  const partnerContact = (partner && partner.partnerName)
    ? `<p style="margin:8px 0 0;font-size:10px;color:${B.light};line-height:1.6;border-top:1px solid #1f2937;padding-top:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Brought to you in partnership with <strong style="color:#FFFFFF;">${esc(partner.partnerName)}</strong>${partner.partnerContact?' &middot; '+esc(partner.partnerContact):''}${partner.partnerPhone?' &middot; '+esc(partner.partnerPhone):''}</p>`
    : '';
  let body = variant.html || '';
  if (headerBlock) {
    if (body.includes('<!-- HEADER -->')) body = body.replace('<!-- HEADER -->', headerBlock + '<!-- HEADER -->');
    else body = body.replace(/(<tr><td style="background:#3B6FE8;height:5px[^<]*<\/td><\/tr>)/i, `$1${headerBlock}`);
  }
  const footerRe = /<!-- FOOTER_CONTACT -->[\s\S]*?<!-- \/FOOTER_CONTACT -->/;
  if (footerRe.test(body)) body = body.replace(footerRe, loBlock + partnerContact);
  return body;
}

// ── select recipients: this variant's type, active, not bounced, NOT already sent today ──
const renderedByCombo = {};   // comboId → html (rendered once)
const seenEmails = new Set(); // in-run dedupe: never send the same address twice in one execution
const out = [];

for (const sub of subscribers) {
  if (!isTrue(sub.active) || isTrue(sub.bounced) || sub.unsubscribedAt) continue;

  const subType = (sub.partnerType || 'general').trim().toLowerCase();
  if (subType !== variantType) continue;                 // only this variant's audience

  // PER-SUBSCRIBER SENT FILTER — skip anyone already sent today (resume safety)
  if (sub.lastSentDate === TODAY && String(sub.lastSentStatus||'').toLowerCase() === 'sent') continue;

  // IN-RUN DEDUPE — guards against duplicate subscriber rows in the sheet causing
  // multiple sends to the same address in a single execution (the lastSentDate
  // filter only blocks ACROSS runs, not within one). First matching row wins.
  const emailKey = String(sub.email || '').trim().toLowerCase();
  if (!emailKey || seenEmails.has(emailKey)) continue;
  seenEmails.add(emailKey);

  const pid = (sub.partnerId || '').trim().toLowerCase();
  const lid = (sub.loId || '').trim().toLowerCase();
  const comboId = sub.comboId || `${subType}::${pid||'none'}::${lid||'none'}`;

  // Render this combo once
  if (!renderedByCombo[comboId]) {
    const partner = pid ? partnersById[pid] : null;
    const lo = lid ? losById[lid] : (partner && partner.loId ? losById[String(partner.loId).trim().toLowerCase()] : null);
    renderedByCombo[comboId] = renderCombo(partner, lo);
  }

  // Inject this subscriber's unsubscribe link
  let html = renderedByCombo[comboId];
  const unsub = sub.unsubscribeUrl
    || `https://jwhfinancial.app.n8n.cloud/webhook/digest-unsubscribe?email=${encodeURIComponent(sub.email)}`;
  if (html.includes('{{subscriber_email}}')) {
    html = html.split('{{subscriber_email}}').join(encodeURIComponent(sub.email));
  } else {
    html = html.replace(/https:\/\/jwhfinancial\.app\.n8n\.cloud\/webhook\/digest-unsubscribe\?email=[^"'<>\s]*/g, unsub);
  }

  const nextSendCount = Number(sub.sendCount || 0) + 1;

  out.push({
    json: {
      to: sub.email,
      email: sub.email,
      subject: variant.subject,
      html,
      comboId,
      sendDate: TODAY,
      sendCount: nextSendCount,   // lifetime counter, incremented; Log node writes this back
      _variantType: variantType,
      _variantRow: variant._row || null,   // for marking the variant complete later
    }
  });
}

// Sort by comboId so sends are grouped by combo (clean batching within the variant)
out.sort((a, b) => (a.json.comboId > b.json.comboId ? 1 : -1));

const totalUnsent = out.length;
// Option A: cap this execution to MAX_PER_RUN subscribers. Remainder is picked up
// by the next scheduled tick (already-sent get filtered by lastSentDate).
const chunk = out.slice(0, MAX_PER_RUN);
const moreRemain = totalUnsent > chunk.length;

console.log(`[SEND] variant '${variantType}': ${totalUnsent} unsent, sending ${chunk.length} this run` +
  (moreRemain ? ` (${totalUnsent - chunk.length} remain for next tick)` : '') +
  `, ${Object.keys(renderedByCombo).length} combos rendered.`);

// Tag whether the variant is fully drained this run, so the workflow knows
// whether to Mark Complete now or leave 'sending' for the next tick.
chunk.forEach(item => { item.json._moreRemain = moreRemain; });

if (chunk.length === 0) {
  console.log(`[SEND] variant '${variantType}' has no unsent recipients — safe to mark complete.`);
}
return chunk;
