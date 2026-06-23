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
const partnerId = (body.partnerId || '').trim().toLowerCase();
const loIdDirect = (body.loId || '').trim().toLowerCase();

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
// mxResult: 'ok' = has mail server, 'nomx' = resolves but no mail,
//           'nxdomain' = domain doesn't exist, 'error' = lookup itself failed.
let mxResult = 'error';
try {
  const res = await this.helpers.httpRequest({
    method: 'GET',
    url: `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
    timeout: 8000,
    json: true,
  });
  const data = typeof res === 'string' ? JSON.parse(res) : res;

  if (data) {
    if (data.Status === 3) {
      mxResult = 'nxdomain'; // domain does not exist
    } else if (data.Status === 0 && Array.isArray(data.Answer) && data.Answer.some(a => a.type === 15)) {
      mxResult = 'ok'; // has MX records
    } else if (data.Status === 0 && (!data.Answer || data.Answer.length === 0)) {
      // Resolves but no MX — check A record as implicit-mail fallback
      try {
        const aRes = await this.helpers.httpRequest({
          method: 'GET',
          url: `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
          timeout: 8000,
          json: true,
        });
        const aData = typeof aRes === 'string' ? JSON.parse(aRes) : aRes;
        mxResult = (aData && aData.Status === 0 && Array.isArray(aData.Answer) && aData.Answer.length > 0) ? 'ok' : 'nomx';
      } catch {
        mxResult = 'nomx';
      }
    } else {
      mxResult = 'nomx';
    }
  }
} catch (e) {
  console.warn(`[VALIDATE] MX lookup error for ${domain}: ${e.message}`);
  mxResult = 'error';
}

// Reject domains that definitively can't receive mail.
// On a genuine lookup ERROR (network/timeout) fail-open — bounce handler is the net.
if (mxResult === 'nxdomain' || mxResult === 'nomx') {
  return fail('That email domain can\u2019t receive mail. Please check your address.');
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
  partnerId,
  loIdDirect,
  source: partnerId ? 'partner_page' : (loIdDirect ? 'lo_page' : 'landing_page'),
}}];
