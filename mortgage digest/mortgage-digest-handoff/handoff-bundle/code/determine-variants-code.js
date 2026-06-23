// DETERMINE VARIANTS TO GENERATE
// Reads SkewConfig (active types) and the active subscriber list, then outputs
// one item per variant that actually needs generating today.
// A variant is generated only if: type is active in SkewConfig AND
// (it's 'general' OR at least one active subscriber has that partnerType).
// 'general' is ALWAYS generated as the default/fallback.
//
// Inputs (set via Merge or referenced by node name):
//   $('Skew for Prompt').all()    → rows: {partnerType, displayName, promptInstruction, active}
//   $('Subscribers to Queue').all()   → rows including {partnerType, active}
//
// Output: one item per variant → {partnerType, displayName, promptInstruction}

const skewRows = $('Skew for Prompt').all().map(i => i.json);
const subRows = $('Subscribers to Queue').all().map(i => i.json);

// Normalize a truthy "active" cell (TRUE / true / 1 / yes)
const isTrue = (v) => {
  if (v === true) return true;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return ['true','1','yes','y'].includes(v.trim().toLowerCase());
  return false;
};

// Active skew types from config
const activeSkews = skewRows.filter(r => isTrue(r.active) && r.partnerType);

// Set of partnerTypes that have at least one ACTIVE subscriber
const typesWithSubs = new Set(
  subRows
    .filter(s => isTrue(s.active))
    .map(s => (s.partnerType || '').trim().toLowerCase())
    .filter(Boolean)
);

const variants = [];

for (const skew of activeSkews) {
  const type = skew.partnerType.trim().toLowerCase();
  const include =
    type === 'general' ||              // always generate the default
    typesWithSubs.has(type);           // or if real subscribers need it

  if (include) {
    variants.push({
      json: {
        partnerType: type,
        displayName: skew.displayName || 'Daily Briefing',
        promptInstruction: skew.promptInstruction || '',
      }
    });
  }
}

// Safety: if SkewConfig is empty or has no 'general', force a general variant
if (!variants.some(v => v.json.partnerType === 'general')) {
  variants.unshift({
    json: {
      partnerType: 'general',
      displayName: 'Daily Briefing',
      promptInstruction: 'Provide a balanced mix across mortgage, real estate, macro, and regulatory news.',
    }
  });
}

console.log(`[VARIANTS] Generating ${variants.length}: ${variants.map(v => v.json.partnerType).join(', ')}`);
return variants;
