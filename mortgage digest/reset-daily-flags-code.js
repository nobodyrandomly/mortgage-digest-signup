// RESET DAILY SEND FLAGS (runs ~5:55 AM)
// Clears sendStatus on TODAY's digest variant rows so the send cursor will
// process them. Matches rows by rowKey (digestDate::partnerType). Leaves
// historical rows untouched. Subscriber lastSentDate is date-stamped so it
// self-resets when the date changes — not touched here.
//
// Input: $('Fetch Today\'s Digests').all() → today's digest rows (incl. rowKey)
// Output: one item per today's variant → { rowKey, sendStatus:'' } for the Update node

const rows = $('Digests to Reset').all().map(i => i.json);
const TODAY = new Date().toISOString().slice(0, 10);

// "today" by the rowKey prefix OR timestamp date (rowKey is authoritative)
const todays = rows.filter(r => {
  const key = String(r.rowKey || '');
  if (key.startsWith(TODAY + '::')) return true;
  return (r.timestamp || '').slice(0,10) === TODAY;  // fallback for older rows
});

if (todays.length === 0) {
  console.warn('[RESET] No digest variants found for today — generator may not have run yet.');
  return [];
}

return todays.map(r => ({ json: {
  rowKey: r.rowKey || `${TODAY}::${(r.partnerType||'general').trim().toLowerCase()}`,
  sendStatus: '',
} }));
