// LINK VALIDATOR v2
// For each story:
// 1. HEAD request on the original URL — if resolves, use it
// 2. If broken/null — call Gemini with Google Search to find the real URL
// 3. HEAD request on Gemini's result to confirm it works
// 4. If confirmed — use it
// 5. Last resort — Google search URL for the headline

const digest = $input.first().json;

const GOOGLE_SEARCH = (q) =>
  'https://www.google.com/search?q=' + encodeURIComponent(q);

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';

// Check if a URL resolves with a 200-399 response
const checkUrl = async (url) => {
  if (!url || url === 'null' || url.includes('google.com/search')) return false;
  try {
    const res = await $helpers.request({
      method: 'HEAD',
      url,
      timeout: 7000,
      followRedirect: true,
      simple: false,
    });
    return res.statusCode >= 200 && res.statusCode < 400;
  } catch {
    return false;
  }
};

// Ask Gemini to find the correct direct URL for a headline + source
const findUrlWithGemini = async (headline, source, apiKey) => {
  try {
    const prompt = `Find the exact, direct URL for this specific article. Return ONLY the URL — no explanation, no markdown, no other text.

Article headline: "${headline}"
Published by: ${source}

Search for this article and return the full direct URL to it. If you cannot find a confirmed working direct URL, return the word null.`;

    const res = await $helpers.request({
      method: 'POST',
      url: `${GEMINI_ENDPOINT}?key=${apiKey}`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0, maxOutputTokens: 256 },
      }),
      timeout: 30000,
      simple: false,
    });

    const data = JSON.parse(res.body);
    const text = (data.candidates?.[0]?.content?.parts || [])
      .filter(p => p.text).map(p => p.text).join('').trim();

    // Extract URL from response
    const urlMatch = text.match(/https?:\/\/[^\s"'<>]+/);
    return urlMatch ? urlMatch[0].replace(/[.,;)]$/, '') : null;
  } catch {
    return null;
  }
};

// Get API key from credential
const apiKey = $credentials?.googleGeminiApi?.apiKey || '';

const validatedStories = [];
let stats = { ok: 0, fixed: 0, fallback: 0 };

for (const story of digest.stories) {
  // Step 1: check original URL
  const originalOk = await checkUrl(story.sourceUrl);

  if (originalOk) {
    stats.ok++;
    validatedStories.push(story);
    continue;
  }

  // Step 2: ask Gemini to find the real URL
  console.log(`[LINK VALIDATOR] Broken URL for "${story.headline}" — searching for correct link`);
  const foundUrl = await findUrlWithGemini(story.headline, story.source, apiKey);

  if (foundUrl) {
    // Step 3: confirm the found URL actually works
    const foundOk = await checkUrl(foundUrl);

    if (foundOk) {
      stats.fixed++;
      console.log(`[LINK VALIDATOR] Fixed: ${story.source} — "${story.headline}" → ${foundUrl}`);
      validatedStories.push({ ...story, sourceUrl: foundUrl, _urlFixed: true });
      continue;
    }
  }

  // Step 4: last resort — Google search
  stats.fallback++;
  console.warn(`[LINK VALIDATOR] Fallback to Google search: "${story.headline}"`);
  validatedStories.push({
    ...story,
    sourceUrl: GOOGLE_SEARCH(`${story.headline} ${story.source}`),
    _urlFallback: true,
  });
}

digest.stories = validatedStories;
digest._linkValidation = {
  ok: stats.ok,
  fixed: stats.fixed,
  fallback: stats.fallback,
  total: digest.stories.length,
};

console.log(`[LINK VALIDATOR] ${stats.ok} OK, ${stats.fixed} fixed via Gemini search, ${stats.fallback} fell back to Google search`);

return [{ json: digest }];
