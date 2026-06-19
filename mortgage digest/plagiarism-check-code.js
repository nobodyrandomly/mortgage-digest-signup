// PLAGIARISM CHECK NODE
// Checks summaries, keyPoints, effects, and realtorSection (NOT headlines)
// against open-access source articles for 8+ word verbatim matches.
// If flagged stories are found, passes them to the Rewrite Agent node.
// If clean, passes directly to Build HTML Email.

const digest = $input.first().json;

const OPEN_ACCESS_DOMAINS = [
  'federalreserve.gov',
  'consumerfinance.gov',
  'freddiemac.com',
  'fanniemae.com',
  'bls.gov',
  'census.gov',
  'conference-board.org',
  'nahb.org',
  'mba.org',
];

const isOpenAccess = (url) => {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return OPEN_ACCESS_DOMAINS.some(domain => hostname.includes(domain));
  } catch { return false; }
};

const fetchArticleText = async (url) => {
  try {
    const res = await $helpers.request({
      method: 'GET', url, timeout: 8000, simple: false,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DigestBot/1.0)' },
    });
    if (res.statusCode !== 200) return null;
    return res.body
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  } catch { return null; }
};

const getNgrams = (text, n) => {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const grams = new Set();
  for (let i = 0; i <= words.length - n; i++) {
    grams.add(words.slice(i, i + n).join(' '));
  }
  return grams;
};

// Only check these fields — headline is always excluded
const getCheckableText = (story) => {
  const parts = [];
  if (story.summary) parts.push(story.summary);
  if (story.keyPoints?.length) parts.push(...story.keyPoints);
  if (story.effects?.hasEffects) {
    if (story.effects.firstOrder?.length) parts.push(...story.effects.firstOrder);
    if (story.effects.secondOrder?.length) parts.push(...story.effects.secondOrder);
  }
  if (story.realtorSection?.hasRealtorAngle) {
    if (story.realtorSection.summary) parts.push(story.realtorSection.summary);
    if (story.realtorSection.actionables?.length) parts.push(...story.realtorSection.actionables);
  }
  return parts.join(' ');
};

const MIN_NGRAM = 8;
const flaggedStories = [];
const cleanStories = [];
let checked = 0;
let skipped = 0;

for (const story of digest.stories) {
  if (!isOpenAccess(story.sourceUrl)) {
    skipped++;
    cleanStories.push(story);
    continue;
  }

  const articleText = await fetchArticleText(story.sourceUrl);
  if (!articleText) {
    skipped++;
    cleanStories.push(story);
    continue;
  }

  checked++;
  const articleNgrams = getNgrams(articleText, MIN_NGRAM);
  const digestText = getCheckableText(story);
  const digestNgrams = getNgrams(digestText, MIN_NGRAM);
  const matches = [...digestNgrams].filter(gram => articleNgrams.has(gram));

  if (matches.length > 0) {
    flaggedStories.push({
      ...story,
      _plagiarismMatches: matches.slice(0, 5),
      _matchCount: matches.length,
    });
    console.warn(`[PLAGIARISM FLAGGED] "${story.headline}" — ${matches.length} match(es)`);
  } else {
    cleanStories.push(story);
  }
}

console.log(`[PLAGIARISM CHECK] ${checked} checked, ${skipped} skipped, ${flaggedStories.length} flagged`);

return [{ json: {
  ...digest,
  stories: cleanStories,        // clean stories pass through as-is
  _flaggedStories: flaggedStories, // flagged stories go to rewrite agent
  _plagiarismSummary: {
    checked, skipped,
    flagged: flaggedStories.length,
    needsRewrite: flaggedStories.length > 0,
  },
}}];
