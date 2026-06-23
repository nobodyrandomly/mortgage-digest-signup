// SEED GEN QUEUE (runs ~5:25 AM, before the generator cursor starts)
// Creates one GenQueue row per variant that SHOULD be generated today:
// active SkewConfig types that have >=1 active subscriber, plus 'general' always.
// Mirrors determine-variants logic so the queue matches what's expected.
//
// Inputs:
//   $('Skews to Queue').all()   → {partnerType, displayName, promptInstruction, active}
//   $('Subscribers to Queue').all()  → rows incl. {partnerType, active}
// Output: one item per variant to seed (genStatus=pending, genAttempts=0)

const skewRows = $('Skews to Queue').all().map(i => i.json);
const subRows  = $('Subscribers to Queue').all().map(i => i.json);
const TODAY = new Date().toISOString().slice(0, 10);

const isTrue = (v) => v===true || v===1 ||
  (typeof v==='string' && ['true','1','yes','y'].includes(v.trim().toLowerCase()));

const activeSkews = skewRows.filter(r => isTrue(r.active) && r.partnerType);
const typesWithSubs = new Set(
  subRows.filter(s => isTrue(s.active))
         .map(s => (s.partnerType || '').trim().toLowerCase())
         .filter(Boolean)
);

const seeds = [];
for (const skew of activeSkews) {
  const type = skew.partnerType.trim().toLowerCase();
  if (type === 'general' || typesWithSubs.has(type)) {
    seeds.push({ json: {
      rowKey: `${TODAY}::${type}`,
      genDate: TODAY,
      partnerType: type,
      displayName: skew.displayName || 'Daily Briefing',
      genStatus: 'pending',
      genAttempts: 0,
      lastError: '',
      claimedAt: '',
      completedAt: '',
    }});
  }
}
// Always ensure general is seeded
if (!seeds.some(s => s.json.partnerType === 'general')) {
  seeds.unshift({ json: {
    rowKey: `${TODAY}::general`,
    genDate: TODAY, partnerType: 'general', displayName: 'Daily Briefing',
    genStatus: 'pending', genAttempts: 0, lastError: '', claimedAt: '', completedAt: '',
  }});
}

console.log(`[GEN-SEED] Seeded ${seeds.length} variants for ${TODAY}: ${seeds.map(s=>s.json.partnerType).join(', ')}`);
return seeds;
