// ─────────────────────────── NEW-SUBSCRIBER ALERT ───────────────────────────
// Emails the loan officer and/or you whenever someone subscribes — each side
// toggled INDEPENDENTLY from the Settings tab. Covers ALL subscriber signups
// (direct, partner-, and LO-co-branded); they all flow through the Signup workflow.
//
// Emits ONE item (the email) when at least one recipient is enabled, or NOTHING
// when both are off — and when this node emits nothing, the Gmail node after it
// simply doesn't run.
//
// ── TOGGLES (Settings tab, key / value) ──
//   notify_lo_new_subscriber     TRUE/FALSE   → does the loan officer get pinged?
//   notify_admin_new_subscriber  TRUE/FALSE   → do you get pinged?
//   Flip either in the sheet, no login, takes effect on the next signup.
//   (If a row is missing, the *_DEFAULT constants below apply.)
//
// ── OTHER WAYS TO PAUSE / REMOVE ──
//   • One click:  disable this node (or the Gmail node) in n8n
//   • Gone:       delete this node + its Gmail node (dead-end branch, nothing else affected)
//
// ── WIRING ──
//   ... → Resolve Partner → Save Subscriber → [THIS node] → Gmail "Send a message"
//        Gmail:  To = {{$json.notifyTo}}  Subject = {{$json.notifySubject}}
//                Message = {{$json.notifyHtml}}  (Options → Email Type = HTML)
//   Reads the subscriber from the incoming item (output of Save Subscriber). If your
//   save node strips fields, set SUBSCRIBER_NODE to the node holding the enriched
//   subscriber (e.g. 'Resolve Partner'). The LO/Partner lookups reference reads that
//   already ran earlier — match names to yours; both are best-effort (try/catch).
//   Add a "Read Settings" node (reads the Settings tab) somewhere upstream in the run.
//
// ─────────────────────────────── CONFIG ───────────────────────────────
const ADMIN_EMAIL = 'bmir@jwhfinance.com';   // ← your alert inbox
const NOTIFY_LO_DEFAULT = true;   // used only if the Settings row is missing
const NOTIFY_ADMIN_DEFAULT = true;   // used only if the Settings row is missing
const SUBSCRIBER_NODE = 'Validate Signup';   // node holding the enriched subscriber
const LO_READ_NODE = 'LoanOfficers to Notify'; // ADD this read to the Signup branch (name must be unique in the workflow)
const PARTNER_READ_NODE = '';                  // '' to skip; set to a Partners read for the partner's display name
const SETTINGS_READ_NODE = 'Read Settings';     // your (now-connected) Settings read
// ───────────────────────────────────────────────────────────────────────

// Read the two independent toggles from the Settings tab.
const readToggle = (key, fallback) => {
  try {
    const rows = $(SETTINGS_READ_NODE).all().map(i => i.json);
    const row = rows.find(s => String(s.key || '').trim().toLowerCase() === key);
    if (row !== undefined && row !== null && String(row.value).trim() !== '') {
      return ['true', '1', 'yes', 'y', 'on'].includes(String(row.value).trim().toLowerCase());
    }
  } catch (e) { /* no Settings read present — use fallback */ }
  return fallback;
};
const loEnabled = readToggle('notify_lo_new_subscriber', NOTIFY_LO_DEFAULT);
const adminEnabled = readToggle('notify_admin_new_subscriber', NOTIFY_ADMIN_DEFAULT);

// ── Subscriber ── (read from a named node, robust under Execute Once)
const sub = SUBSCRIBER_NODE ? $(SUBSCRIBER_NODE).first().json : $input.item.json;
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const email = sub.email || '';
const name = sub.fullName || [sub.firstName, sub.lastName].filter(Boolean).join(' ') || '(no name given)';
const company = sub.company || '';
const role = sub.role || '';
const loId = String(sub.loId || '').trim().toLowerCase();
const partnerId = String(sub.partnerId || '').trim().toLowerCase();
const partnerType = String(sub.partnerType || 'general').trim().toLowerCase();

// ── LO lookup (recipient) — best effort ──
let loName = '', loEmail = '';
try {
  const lo = $(LO_READ_NODE).all().map(i => i.json)
    .find(l => String(l.loId || '').trim().toLowerCase() === loId);
  if (lo) { loName = lo.loName || ''; loEmail = String(lo.loEmail || '').trim(); }
} catch (e) { /* no LO read / name mismatch */ }

// ── Partner name (nice-to-have) — only if a Partners read is configured ──
let partnerName = '';
if (PARTNER_READ_NODE) {
  try {
    const p = $(PARTNER_READ_NODE).all().map(i => i.json)
      .find(pp => String(pp.partnerId || '').trim().toLowerCase() === partnerId);
    if (p) partnerName = p.partnerName || '';
  } catch (e) { /* fall back to partnerId */ }
}

const isCobranded = !!partnerId || !!loId;

// Recipients, each gated by its own toggle. LO only when co-branded + has an email.
const recipients = [];
if (loEnabled && loEmail) recipients.push(loEmail);
if (adminEnabled) recipients.push(ADMIN_EMAIL);
if (recipients.length === 0) return [];   // both sides off (or LO-only with no LO) → no email

const notifyTo = recipients.join(',');
const notifySubject = isCobranded
  ? `New digest subscriber${partnerName ? ` via ${partnerName}` : ''}: ${name}`
  : `New digest subscriber: ${name}`;

const detail = [
  ['Name', name],
  ['Email', email],
  company ? ['Company', company] : null,
  role ? ['Role', role] : null,
  (partnerName || partnerId) ? ['Partner', `${partnerName || partnerId} (${partnerType})`] : null,
  loName ? ['Loan officer', loName] : null,
  ['Signed up', new Date().toISOString()],
].filter(Boolean);

const notifyHtml =
  `<p>A new subscriber just joined the Mortgage &amp; Real Estate Digest.</p>` +
  `<table cellpadding="6" style="font-size:14px;border-collapse:collapse">` +
  detail.map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('') +
  `</table>` +
  (isCobranded ? `` : `<p style="color:#6B7280;font-size:12px">Direct signup — no partner or loan officer attached.</p>`);

return [{ json: { notifyTo, notifySubject, notifyHtml } }];
