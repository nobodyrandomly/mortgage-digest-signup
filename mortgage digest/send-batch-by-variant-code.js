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

// ── partner palette engine (inlined; mirrors build-partner-palette.js) ──
function buildPartnerPalette(input) {
  const JWH = { C_PAGE_BG:'#EEF0F5',C_CARD_BG:'#FFFFFF',C_BORDER:'#E2E5EC',C_STRIPE:'#3B6FE8',C_HEADER_BG:'#0D1321',C_HEADER_TEXT:'#FFFFFF',C_HEADER_EYEBROW:'#3B6FE8',C_ACCENT_FILL:'#3B6FE8',C_ON_ACCENT:'#FFFFFF',C_ACCENT_INK:'#3B6FE8',C_BOX1_BG:'#EEF2FF',C_BOX1_BORDER:'#C7D2FE',C_BOX1_LABEL:'#3B6FE8',C_BOX1_SUBLABEL:'#0D1321',C_BOX2_BG:'#F0FDF4',C_BOX2_BORDER:'#BBF7D0',C_BOX2_LABEL:'#15803D',C_BOX2_TEXT:'#166534',C_TEXT_PRIMARY:'#0D1321',C_TEXT_SECONDARY:'#4B5563',C_TEXT_MUTED:'#9CA3AF',C_FOOTER_BG:'#0D1321',C_FOOTER_TEXT:'#FFFFFF' };
  const isHex = (h) => /^#?[0-9a-f]{6}$/i.test(String(h||'').trim());
  if (!isHex(input.primary)) return { ...JWH };
  const norm = (h) => '#' + String(h).replace('#','').toUpperCase();
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  const toRgb = (h) => { const n = parseInt(norm(h).slice(1),16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; };
  const toHex = ({r,g,b}) => '#'+[r,g,b].map(c=>clamp(c).toString(16).padStart(2,'0')).join('').toUpperCase();
  const mix = (a,b,t) => { const x=toRgb(a),y=toRgb(b); return toHex({r:x.r+(y.r-x.r)*t,g:x.g+(y.g-x.g)*t,b:x.b+(y.b-x.b)*t}); };
  const lighten = (h,t) => mix(h,'#FFFFFF',t); const darken = (h,t) => mix(h,'#000000',t);
  const lum = (h) => { const c=toRgb(h); const f=(v)=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}; return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b); };
  const contrast = (a,b) => { const l1=lum(a),l2=lum(b); return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05); };
  const bestTextOn = (bg) => contrast('#FFFFFF',bg) >= contrast('#0D1321',bg) ? '#FFFFFF' : '#0D1321';
  const inkOnWhite = (h,r=4.5) => { let o=norm(h); for(let i=0;i<20&&contrast(o,'#FFFFFF')<r;i++)o=darken(o,0.08); return o; };
  const toHsl = (h) => { const c=toRgb(h); const r=c.r/255,g=c.g/255,b=c.b/255; const mx=Math.max(r,g,b),mn=Math.min(r,g,b); let hh=0,s=0,l=(mx+mn)/2; if(mx!==mn){const d=mx-mn;s=l>0.5?d/(2-mx-mn):d/(mx+mn); if(mx===r)hh=(g-b)/d+(g<b?6:0); else if(mx===g)hh=(b-r)/d+2; else hh=(r-g)/d+4; hh/=6;} return {h:hh*360,s,l}; };
  const fromHsl = ({h,s,l}) => { h=(((h%360)+360)%360)/360; const f=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;}; let r,g,b; if(s===0){r=g=b=l;}else{const q=l<0.5?l*(1+s):l+s-l*s;const p=2*l-q;r=f(p,q,h+1/3);g=f(p,q,h);b=f(p,q,h-1/3);} return toHex({r:r*255,g:g*255,b:b*255}); };
  const brandDark = (h) => { const hsl=toHsl(h); hsl.s=Math.max(hsl.s,0.45); hsl.l=0.27; let o=fromHsl(hsl); for(let i=0;i<12&&contrast('#FFFFFF',o)<4.8;i++){hsl.l=Math.max(0.10,hsl.l-0.03);o=fromHsl(hsl);} return o; };
  const deriveSecondary = (h) => { const hsl=toHsl(h); hsl.h=hsl.h+90; hsl.s=Math.max(hsl.s,0.42); hsl.l=Math.min(0.52,Math.max(0.40,hsl.l)); return fromHsl(hsl); };
  const toLightOnDark = (h,bg,r=4.0) => { let o=lighten(h,0.35); for(let i=0;i<20&&contrast(o,bg)<r;i++)o=lighten(o,0.10); return o; };

  const P = norm(input.primary);
  let box2;
  if (isHex(input.secondary)) { const sec=norm(input.secondary); let dh=Math.abs(toHsl(sec).h-toHsl(P).h); if(dh>180)dh=360-dh; box2 = dh>=30 ? sec : deriveSecondary(P); }
  else box2 = deriveSecondary(P);
  const headerBg = brandDark(P), accentInk = inkOnWhite(P), secInk = inkOnWhite(box2);
  return {
    C_PAGE_BG: mix('#EEF0F5',P,0.06), C_CARD_BG:'#FFFFFF', C_BORDER: mix('#E2E5EC',P,0.10),
    C_STRIPE: P, C_HEADER_BG: headerBg, C_HEADER_TEXT:'#FFFFFF', C_HEADER_EYEBROW: toLightOnDark(P,headerBg),
    C_ACCENT_FILL: P, C_ON_ACCENT: bestTextOn(P), C_ACCENT_INK: accentInk,
    C_BOX1_BG: lighten(P,0.90), C_BOX1_BORDER: lighten(P,0.62), C_BOX1_LABEL: accentInk, C_BOX1_SUBLABEL: darken(accentInk,0.15),
    C_BOX2_BG: lighten(box2,0.90), C_BOX2_BORDER: lighten(box2,0.60), C_BOX2_LABEL: secInk, C_BOX2_TEXT: darken(secInk,0.10),
    C_TEXT_PRIMARY:'#0D1321', C_TEXT_SECONDARY:'#4B5563', C_TEXT_MUTED:'#9CA3AF',
    C_FOOTER_BG: headerBg, C_FOOTER_TEXT:'#FFFFFF',
  };
}

// ── co-brand renderer (once per combo): resolve theme tokens + header + footer ──
function renderCombo(partner, lo) {
  const hexOk = (h) => /^#?[0-9a-fA-F]{6}$/.test(String(h||'').trim());
  const tokens = buildPartnerPalette({
    primary:   partner && hexOk(partner.partnerColor)  ? partner.partnerColor  : null,
    secondary: partner && hexOk(partner.partnerColor2) ? partner.partnerColor2 : null,
  });

  let body = variant.html || '';

  // 1) resolve theme tokens (general/no-partner → JWH default palette)
  for (const k in tokens) body = body.split('{{' + k + '}}').join(tokens[k]);

  // 2) brand name in the header eyebrow
  body = body.split('{{BRAND_NAME}}').join(esc(partner && partner.partnerName ? partner.partnerName : 'JWH Financial'));

  // 3) header-right: partner logo if available, else "Curated for you by"; general keeps the house tile
  if (partner && partner.partnerName) {
    const hasLogo = partner.partnerLogo && /^https?:\/\//.test(partner.partnerLogo);
    const right = hasLogo
      ? `<td align="right" valign="middle" style="padding-left:16px;"><img src="${esc(partner.partnerLogo)}" alt="${esc(partner.partnerName)}" height="36" style="max-height:36px;display:block;border:0;" /></td>`
      : `<td align="right" valign="middle" style="padding-left:16px;"><p style="margin:0;font-size:10px;color:${tokens.C_HEADER_EYEBROW};line-height:1.5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Curated for you by<br><strong style="color:${tokens.C_HEADER_TEXT};font-size:12px;">${esc(partner.partnerName)}</strong></p></td>`;
    body = body.replace(/<!-- HEADER_RIGHT -->[\s\S]*?<!-- \/HEADER_RIGHT -->/, '<!-- HEADER_RIGHT -->' + right + '<!-- /HEADER_RIGHT -->');
  }

  // 4) footer contact block (LO + partner)
  const loBlock = lo
    ? `<p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">${esc(lo.loName)} &middot; JWH Financial</p><p style="margin:0 0 8px;font-size:10px;color:${B.light};font-family:'Courier New',monospace;">${esc(lo.loEmail)}${lo.loPhone?' &middot; '+esc(lo.loPhone):''}${lo.loNmls?' &middot; NMLS #'+esc(lo.loNmls):''}</p>`
    : `<p style="margin:0 0 2px;font-size:12px;font-weight:700;color:#FFFFFF;">JWH Financial &middot; Mortgage &amp; Real Estate Digest</p><p style="margin:0 0 8px;font-size:10px;color:${B.light};font-family:'Courier New',monospace;">mortgage-digest@jwhfinance.com</p>`;
  const partnerContact = (partner && partner.partnerName)
    ? `<p style="margin:8px 0 0;font-size:10px;color:${B.light};line-height:1.6;border-top:1px solid #1f2937;padding-top:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">Brought to you in partnership with <strong style="color:#FFFFFF;">${esc(partner.partnerName)}</strong>${partner.partnerContact?' &middot; '+esc(partner.partnerContact):''}${partner.partnerPhone?' &middot; '+esc(partner.partnerPhone):''}</p>`
    : '';
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
// _skipSend=false marks these as real recipients (the "Has Recipient?" IF routes on it).
chunk.forEach(item => { item.json._moreRemain = moreRemain; item.json._skipSend = false; });

// ZERO-UNSENT HARDENING — never return an empty array.
// If this variant has no one left to send (all already sent today, or none match),
// n8n would otherwise stop the branch on empty output and the variant would never
// reach Mark Complete — so the cursor would re-pick it forever and the run would
// halt before advancing to the next variant. Instead, emit ONE control item flagged
// _skipSend so the workflow can skip Gmail/Log and go straight to Mark Complete.
if (chunk.length === 0) {
  console.log(`[SEND] variant '${variantType}' has no unsent recipients — emitting control item to mark complete & advance.`);
  return [{ json: {
    _skipSend: true,        // "Has Recipient?" IF sends this down the skip-Gmail branch
    _moreRemain: false,     // nothing left, so the variant is fully drained → mark complete
    _variantType: variantType,
    _variantRow: variant._row || null,
    rowKey: variant.rowKey || null,
  }}];
}
return chunk;
