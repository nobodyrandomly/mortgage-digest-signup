// EXTRACT BOUNCED ADDRESSES — tuned for Gmail Trigger output
// Outputs fields named to match the Subscribers sheet headers exactly
// (email, active, bounced, bouncedAt) so the Sheets node can Map Automatically.
// Only acts on PERMANENT failures (5.x.x status) so temporary/soft bounces
// (4.x.x — mailbox full, greylisting) don't remove valid subscribers.

const results = [];

for (const item of $input.all()) {
  const msg = item.json;

  // Gather all text fields the bounce body might live in
  const haystack = [
    msg.text || '',
    msg.textAsHtml || '',
    msg.html || '',
    msg.snippet || '',
    typeof msg.headers === 'string' ? msg.headers : JSON.stringify(msg.headers || {}),
    msg.subject || '',
  ].join(' ');

  // ── Only proceed if this is a PERMANENT failure ──
  // Permanent: Status 5.x.x  |  Temporary: Status 4.x.x
  const statusMatch = haystack.match(/Status:\s*([45])\.\d+\.\d+/i);
  const isPermanent = statusMatch && statusMatch[1] === '5';

  // Also accept clear permanent-failure language even without a status code
  const permanentLanguage = /(address not found|does not exist|user unknown|no such user|domain .* couldn.?t be found|NXDOMAIN|550)/i.test(haystack);

  if (!isPermanent && !permanentLanguage) {
    console.log('[BOUNCE] Skipping non-permanent or unrecognized bounce.');
    continue;
  }

  // ── Extract the failed recipient address ──
  let failedEmail = null;

  // Most reliable: Final-Recipient header
  const finalRecipient = haystack.match(/Final-Recipient:\s*rfc822;\s*([^\s<>"]+@[^\s<>"]+)/i);
  if (finalRecipient) failedEmail = finalRecipient[1];

  // Fallback: Original-Recipient header
  if (!failedEmail) {
    const orig = haystack.match(/Original-Recipient:\s*rfc822;\s*([^\s<>"]+@[^\s<>"]+)/i);
    if (orig) failedEmail = orig[1];
  }

  // Fallback: X-Failed-Recipients header
  if (!failedEmail) {
    const xfail = haystack.match(/X-Failed-Recipients:\s*([^\s<>"]+@[^\s<>"]+)/i);
    if (xfail) failedEmail = xfail[1];
  }

  // Fallback: a mailto: link in the bounce (Gmail includes these)
  if (!failedEmail) {
    const mailto = haystack.match(/mailto:([^\s<>"?]+@[^\s<>"?]+)/i);
    if (mailto) failedEmail = mailto[1];
  }

  if (!failedEmail) {
    console.warn('[BOUNCE] Permanent failure detected but could not extract address.');
    continue;
  }

  // Clean and normalize
  failedEmail = failedEmail.replace(/[.,;:>"]+$/, '').toLowerCase().trim();

  // Never act on our own sender / daemon addresses
  if (failedEmail.includes('mortgage-digest@jwhfinance.com') ||
      failedEmail.includes('mailer-daemon') ||
      failedEmail.includes('postmaster') ||
      failedEmail.includes('@googlemail.com') ||
      failedEmail.includes('@google.com')) {
    continue;
  }

  // Output field names MATCH the Subscribers sheet headers exactly
  // so the Google Sheets node can Map Automatically.
  results.push({
    json: {
      email: failedEmail,
      active: "FALSE",
      bounced: "TRUE",
      bouncedAt: new Date().toISOString(),
    }
  });

  console.log(`[BOUNCE] Permanent bounce for ${failedEmail} (${statusMatch ? statusMatch[0] : 'language match'})`);
}

if (results.length === 0) {
  console.log('[BOUNCE] No permanent bounces to process.');
  return [];
}

return results;
