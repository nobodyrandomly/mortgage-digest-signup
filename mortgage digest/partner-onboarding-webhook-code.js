// ───────────────────────────── PARTNER ONBOARD ─────────────────────────────
// One webhook, branches on `action`. Returns items tagged with `_route` so a
// Switch node can send them down the right path.
//
//   POST {action:'resolve', t|lo}
//        → { _route:'resolve', found, loId, loName }
//
//   POST {action:'create',  t|lo, partnerName, partnerType, partnerColor, partnerLogo}
//        → { _route:'create', ok:true, ...Partners columns, liveUrl, notifyTo/Subject/Html }
//        → on bad input: { _route:'error', ok:false, error }
//
// NODE GRAPH (build in n8n):
//   Onboard Webhook (POST, path 'partner-onboard', Respond = "Using Respond node")
//     → Read LoanOfficers (Sheets read)
//     → Read Partners      (Sheets read)
//     → THIS Code node
//     → Switch on {{$json._route}}:
//          'resolve' → Respond  (return: found, loId, loName)
//          'error'   → Respond  (return: ok, error)
//          'create'  → Sheets appendOrUpdate Partners (match column: partnerId)
//                      → Gmail "Send a message"  (To={{$json.notifyTo}},
//                                                 Subject={{$json.notifySubject}},
//                                                 Message={{$json.notifyHtml}}, HTML=on)
//                      → Respond (return ONLY: ok, liveUrl, pagePath, partnerId)
//
// ───────────────────────────── CONFIG — fill in ─────────────────────────────
const ADMIN_EMAIL = 'YOU@jwhfinance.com';                 // ← your alert inbox
const PAGE_BASE   = 'https://newsdigest.jwhfinance.com';   // ← production page base
// ─────────────────────────────────────────────────────────────────────────────

const body   = $('Onboard Webhook').item.json.body || {};
const action = String(body.action || 'resolve').toLowerCase();
const token  = String(body.t  || '').trim();
const loTest = String(body.lo || '').trim().toLowerCase();   // testing fallback only

const los      = $('Read LoanOfficers').all().map(i => i.json);
const partners = $('Read Partners').all().map(i => i.json);

const isTrue = (v) =>
  v === true || v === 1 || ['true', '1', 'yes', 'y'].includes(String(v).trim().toLowerCase());
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Resolve LO by token (production) or by loId (testing only).
const lo = los.find(l => {
  const active = l.loActive === undefined ? true : isTrue(l.loActive);
  if (!active) return false;
  if (token)  return String(l.token || '').trim() === token && token.length > 0;
  if (loTest) return String(l.loId || '').trim().toLowerCase() === loTest;
  return false;
});

if (!lo) {
  return [{ json: { _route: 'resolve', found: false, error: 'Invalid or expired onboarding link.' } }];
}

const loId    = String(lo.loId || '').trim().toLowerCase();
const loName  = lo.loName || '';
const loEmail = String(lo.loEmail || '').trim();

// ── RESOLVE: just confirm the link + hand back the LO name for display ──
if (action === 'resolve') {
  return [{ json: { _route: 'resolve', found: true, loId, loName } }];
}

// ── CREATE: validate, mint IDs, build the row + notification ──
const partnerName  = String(body.partnerName || '').trim();
const partnerType  = String(body.partnerType || 'general').trim().toLowerCase();
const partnerColor = /^#[0-9a-fA-F]{6}$/.test(body.partnerColor || '') ? body.partnerColor : '';
const partnerLogo  = /^https?:\/\//.test(body.partnerLogo || '')        ? body.partnerLogo  : '';

if (!partnerName) {
  return [{ json: { _route: 'error', ok: false, error: 'Business name is required.' } }];
}
if (!partnerLogo) {
  return [{ json: { _route: 'error', ok: false, error: 'A logo image is required.' } }];
}

const slugify = (s) => String(s || '').toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'partner';
const rand = (n) => { let s = ''; while (s.length < n) s += Math.floor(Math.random() * 16).toString(16); return s.slice(0, n); };

const baseSlug = slugify(partnerName);

// pagePath must be unique across BOTH existing pagePaths and partnerIds,
// because the page resolves a path against either.
const taken = new Set();
partners.forEach(p => {
  taken.add(String(p.pagePath  || '').trim().toLowerCase());
  taken.add(String(p.partnerId || '').trim().toLowerCase());
});
let pagePath = baseSlug, n = 2;
while (taken.has(pagePath)) pagePath = `${baseSlug}-${n++}`;

// partnerId = stable, unique, immutable routing key (never shown in URLs).
const ids = new Set(partners.map(p => String(p.partnerId || '').trim().toLowerCase()));
let partnerId = `${baseSlug}-${rand(4)}`;
while (ids.has(partnerId)) partnerId = `${baseSlug}-${rand(4)}`;

const liveUrl = `${PAGE_BASE}/${pagePath}`;
const nowIso  = new Date().toISOString();

// Notification → LO + admin
const notifyTo = [loEmail, ADMIN_EMAIL].filter(Boolean).join(',');
const notifySubject = `New co-branded partner: ${partnerName}`;
const notifyHtml =
  `<p>A new co-branded partner page just went live.</p>` +
  `<table cellpadding="6" style="font-size:14px;border-collapse:collapse">` +
  `<tr><td><b>Partner</b></td><td>${esc(partnerName)}</td></tr>` +
  `<tr><td><b>Type</b></td><td>${esc(partnerType)}</td></tr>` +
  `<tr><td><b>Loan officer</b></td><td>${esc(loName)} (${esc(loId)})</td></tr>` +
  `<tr><td><b>Live page</b></td><td><a href="${liveUrl}">${liveUrl}</a></td></tr>` +
  `<tr><td><b>Created</b></td><td>${nowIso}</td></tr>` +
  `</table>`;

return [{ json: {
  _route: 'create',
  ok: true,
  // → Partners appendOrUpdate (match on partnerId). Other Partners columns
  //   (partnerContact/Phone/Email) are left blank and can be filled later.
  partnerId,
  partnerName,
  partnerType,
  partnerColor,
  partnerLogo,
  loId,
  active: true,
  pagePath,
  createdAt: nowIso,
  // → response to the onboarding page
  liveUrl,
  // → Gmail notification fields
  notifyTo,
  notifySubject,
  notifyHtml,
}}];
