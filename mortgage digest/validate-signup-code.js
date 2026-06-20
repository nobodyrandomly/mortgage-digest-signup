// VALIDATE SIGNUP — 4-layer email validation
// Layer 1: strict format
// Layer 2: disposable domain blocking
// Layer 3: common typo detection
// Layer 4: MX record check (DNS-over-HTTPS) — confirms domain can receive mail
// Returns valid:true/false plus a specific `error` message the webhook surfaces.

const body = $input.first().json.body || $input.first().json;

const firstName = (body.firstName || '').trim();
const lastName = (body.lastName || '').trim();
const email = (body.email || '').trim().toLowerCase();
const company = (body.company || '').trim();
const role = (body.role || '').trim();
const roleOther = (body.roleOther || '').trim();
const phone = (body.phone || '').trim();

const fail = (error) => [{ json: { valid: false, error } }];

// ── Required fields ──
if (!firstName) return fail('First name is required.');
if (!lastName) return fail('Last name is required.');
if (!email) return fail('Email address is required.');
if (!role) return fail('Please select your role.');
if (role === 'Other' && !roleOther) return fail('Please describe your role.');

// ── LAYER 1: strict format ──
// Basic structure, no consecutive dots, no leading/trailing dots in local part,
// valid TLD of at least 2 chars.
const formatRe = /^[a-z0-9](?:[a-z0-9._%+-]*[a-z0-9])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i;
if (!formatRe.test(email)) {
  return fail('Please enter a valid email address.');
}
if (email.includes('..')) {
  return fail('Please enter a valid email address.');
}

const domain = email.split('@')[1];

// ── LAYER 2: disposable / throwaway domains ──
const DISPOSABLE = [
  'mailinator.com','guerrillamail.com','guerrillamail.net','10minutemail.com',
  'temp-mail.org','tempmail.com','throwawaymail.com','yopmail.com','getnada.com',
  'trashmail.com','sharklasers.com','grr.la','maildrop.cc','dispostable.com',
  'fakeinbox.com','mailnesia.com','mintemail.com','spamgourmet.com','mohmal.com',
  'emailondeck.com','tempinbox.com','tempr.email','33mail.com','spam4.me',
];
if (DISPOSABLE.includes(domain)) {
  return fail('Please use a permanent email address — temporary inboxes aren’t supported.');
}

// ── LAYER 3: common typo detection on major providers ──
const TYPOS = {
  'gmial.com':'gmail.com','gmai.com':'gmail.com','gmal.com':'gmail.com',
  'gmail.co':'gmail.com','gmaill.com':'gmail.com','gnail.com':'gmail.com',
  'yahooo.com':'yahoo.com','yaho.com':'yahoo.com','yahoo.co':'yahoo.com',
  'hotmial.com':'hotmail.com','hotmai.com':'hotmail.com','hotmil.com':'hotmail.com',
  'outlok.com':'outlook.com','outloo.com':'outlook.com','iclould.com':'icloud.com',
  'icloud.co':'icloud.com','comcast.net ':'comcast.net',
};
if (TYPOS[domain]) {
  return fail(`Did you mean ${email.split('@')[0]}@${TYPOS[domain]}? Please check your email address.`);
}

// ── LAYER 4: MX record check via DNS-over-HTTPS ──
// Confirms the domain is actually configured to receive mail.
let mxOk = false;
try {
  const res = await $helpers.request({
    method: 'GET',
    url: `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
    timeout: 6000,
    json: true,
    simple: false,
  });
  const data = typeof res === 'string' ? JSON.parse(res) : res;
  // Status 0 = NOERROR. Answer array with MX records = domain can receive mail.
  if (data && data.Status === 0 && Array.isArray(data.Answer) && data.Answer.some(a => a.type === 15)) {
    mxOk = true;
  }
  // Some domains use A record as implicit mail server fallback — accept if A records exist
  if (!mxOk && data && data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0) {
    // Only accept A-record fallback if there's no explicit MX; rare but valid
    mxOk = true;
  }
} catch (e) {
  // If the DNS check itself fails (network/timeout), don't block the signup —
  // fall through and allow it. The bounce handler is the safety net.
  console.warn(`[VALIDATE] MX check failed for ${domain}: ${e.message} — allowing through`);
  mxOk = true;
}

if (!mxOk) {
  return fail('That email domain can’t receive mail. Please check your address.');
}

// ── PASSED ALL LAYERS — build the validated record ──
const fullName = `${firstName} ${lastName}`;

return [{ json: {
  valid: true,
  email,
  firstName,
  lastName,
  fullName,
  company,
  role,
  roleOther,
  phone,
  subscribedAt: new Date().toISOString(),
  active: 'TRUE',
  send_count: 0,
  last_sent_at: '',
  bounced: 'FALSE',
  bouncedAt: '',
  unsubscribedAt: '',
  source: 'landing_page',
}}];
