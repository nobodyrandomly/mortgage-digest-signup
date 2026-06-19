// REWRITE AGENT NODE
// Receives flagged stories from the Plagiarism Check node.
// Rewrites only the flagged fields (summary, keyPoints, effects, realtorSection)
// for each flagged story using Gemini — headlines, sources, and URLs are preserved.
// Merges rewritten stories back into the digest and passes everything to Build HTML Email.
// This is Option B: always send after rewrite regardless of second-check result.

const digest = $input.first().json;
const flaggedStories = digest._flaggedStories || [];

// If nothing was flagged, pass straight through
if (flaggedStories.length === 0) {
  console.log('[REWRITE AGENT] No flagged stories — passing through');
  const { _flaggedStories, _plagiarismSummary, ...cleanDigest } = digest;
  return [{ json: cleanDigest }];
}

console.log(`[REWRITE AGENT] Rewriting ${flaggedStories.length} flagged story/stories`);

const rewrittenStories = [];

for (const story of flaggedStories) {
  const { _plagiarismMatches, _matchCount, ...storyData } = story;

  const prompt = `You are a mortgage industry analyst. The following story summary contains text that too closely matches the source article. Rewrite ONLY the fields listed below using entirely original language. Do not copy any phrase from the source. Do not quote the article. Paraphrase all facts from scratch using different words and sentence structures.

PRESERVE EXACTLY (do not change):
- headline: "${storyData.headline}"
- source: "${storyData.source}"
- sourceUrl: "${storyData.sourceUrl}"
- importance: "${storyData.importance}"
- category: "${storyData.category}"

REWRITE THESE FIELDS using completely original language:
- summary (MAX 2 sentences, lead with key fact or number)
- keyPoints (MAX 3 bullets, MAX 10 words each, facts only)
- effects.firstOrder (MAX 2 items, MAX 12 words each) — only if hasEffects is true
- effects.secondOrder (MAX 2 items, MAX 12 words each) — only if hasEffects is true
- realtorSection.summary (MAX 2 sentences) — only if hasRealtorAngle is true
- realtorSection.actionables (MAX 2 items, MAX 12 words each) — only if hasRealtorAngle is true

Current content to rewrite:
${JSON.stringify(storyData, null, 2)}

Return ONLY valid JSON for this single story with all original fields preserved and the above fields rewritten. No markdown, no code fences, no commentary.`;

  try {
    const response = await $helpers.request({
      method: 'POST',
      url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key={{ $credentials.googleGeminiApi.apiKey }}`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
      }),
      timeout: 60000,
      simple: false,
    });

    const data = JSON.parse(response.body);
    const rawText = (data.candidates?.[0]?.content?.parts || [])
      .filter(p => p.text).map(p => p.text).join('').trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

    const rewritten = JSON.parse(rawText);

    // Enforce: headline, source, sourceUrl must not change
    rewritten.headline = storyData.headline;
    rewritten.source = storyData.source;
    rewritten.sourceUrl = storyData.sourceUrl;
    rewritten.importance = storyData.importance;
    rewritten.category = storyData.category;
    rewritten._rewritten = true;

    rewrittenStories.push(rewritten);
    console.log(`[REWRITE AGENT] Rewrote: "${storyData.headline}"`);
  } catch (err) {
    // If rewrite fails, include original story with a flag rather than drop it
    console.error(`[REWRITE AGENT] Failed to rewrite "${storyData.headline}": ${err.message}`);
    rewrittenStories.push({ ...storyData, _rewriteFailed: true });
  }
}

// Merge: clean stories + rewritten stories, restore original sort order
const allStories = [
  ...digest.stories,       // already-clean stories
  ...rewrittenStories,     // rewritten flagged stories
].sort((a, b) => {
  if (a.importance === 'high' && b.importance !== 'high') return -1;
  if (b.importance === 'high' && a.importance !== 'high') return 1;
  return 0;
});

// Strip internal fields before passing to email builder
const { _flaggedStories, _plagiarismSummary, ...finalDigest } = digest;
finalDigest.stories = allStories;
finalDigest._rewriteLog = {
  rewritten: rewrittenStories.length,
  rewriteFailed: rewrittenStories.filter(s => s._rewriteFailed).length,
};

console.log(`[REWRITE AGENT] Complete — ${rewrittenStories.length} rewritten, merging into digest`);

return [{ json: finalDigest }];
