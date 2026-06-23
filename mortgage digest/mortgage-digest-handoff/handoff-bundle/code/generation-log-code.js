// GENERATION LOG — captures health + analysis metadata for each digest variant generated.
// Runs in the Generator, after Build HTML Email (so the digest is fully processed).
// Does NOT duplicate the digest HTML (that's archived in the Digest tab) — logs the
// metadata and quality signals you'd want when debugging a bad digest later.
//
// Inputs (by reference; wrap each in try/catch so a missing one doesn't break logging):
//   $('Parse & Validate Digest').first().json     → the parsed digest (stories, etc.)
//   $('Validate & Fix Story Links').first().json   → digest after link validation (_linkValidation)
//   $('Next Variant Digest').item.json              → { partnerType, displayName, promptInstruction }
//   $('Build HTML Email').first().json             → { subject, html }
// Output: one flat row for the GenerationLog sheet.

function safe(fn, dflt) { try { const v = fn(); return v == null ? dflt : v; } catch (e) { return dflt; } }

const variant   = safe(() => $('Next Variant Digest').item.json, {});
const parsed    = safe(() => $('Parse & Validate Digest').first().json, {});
const validated = safe(() => $('Validate & Fix Story Links').first().json, parsed);
const built     = safe(() => $('Build HTML Email').first().json, {});

const stories = Array.isArray(validated.stories) ? validated.stories
              : (Array.isArray(parsed.stories) ? parsed.stories : []);

// Link validation stats
const lv = validated._linkValidation || parsed._linkValidation || {};

// Story-level analysis
const sources = stories.map(s => s.source).filter(Boolean);
const categories = stories.map(s => s.category).filter(Boolean);
const highCount = stories.filter(s => String(s.importance).toLowerCase() === 'high').length;
const realtorSections = stories.filter(s => s.realtorSection && s.realtorSection.hasRealtorAngle).length;
const withEffects = stories.filter(s => s.effects && s.effects.hasEffects).length;

// URL health from per-story flags
const urlFallback = stories.filter(s => s._urlFallback).length;
const urlFixed = stories.filter(s => s._urlFixed).length;
const urlUnverified = stories.filter(s => s._urlUnverified).length;

// HTML size (useful for catching cell-limit risk / bloat)
const htmlChars = (built.html || '').length;

const row = {
  loggedAt: new Date().toISOString(),
  digestDate: parsed.date || '',
  partnerType: (variant.partnerType || 'general'),
  subject: built.subject || parsed.subject || '',

  storyCount: stories.length,
  highImportanceCount: highCount,
  realtorSectionCount: realtorSections,
  storiesWithEffects: withEffects,
  sources: sources.join(', '),
  categories: categories.join(', '),

  linkOk: lv.ok != null ? lv.ok : '',
  linkKeptUnknown: lv.kept_unknown != null ? lv.kept_unknown : '',
  linkFixed: lv.fixed != null ? lv.fixed : '',
  linkFallback: lv.fallback != null ? lv.fallback : '',
  urlFallbackStories: urlFallback,
  urlFixedStories: urlFixed,
  urlUnverifiedStories: urlUnverified,

  htmlChars,
  skewUsed: (variant.promptInstruction || '').slice(0, 200),  // first 200 chars of the skew, for reference

  searchQueryCount: Array.isArray(parsed._searchQueries) ? parsed._searchQueries.length : '',
};

console.log(`[GEN-LOG] ${row.partnerType}: ${row.storyCount} stories, links ok=${row.linkOk} fallback=${row.linkFallback}, ${row.htmlChars} chars`);

return [{ json: row }];
