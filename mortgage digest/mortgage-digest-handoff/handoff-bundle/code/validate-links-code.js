// LINK VALIDATOR v3
// For each story:
// 1. Check the original URL (GET, browser-like headers) — if it resolves, keep it
// 2. If broken/null — ask Gemini + Search to find the real URL
// 3. Verify Gemini's result resolves
// 4. Last resort — Google search URL for headline + source
//
// Fixes vs v2:
// - Uses this.helpers.httpRequest (correct helper; $helpers.request silently failed,
//   which made EVERY url look broken and fall back to Google)
// - GET with a browser User-Agent and Accept header (many news sites block bare HEAD
//   or bot requests, causing false "broken" results)
// - Treats network errors as "unknown" and KEEPS the original url rather than
//   discarding a possibly-good link

const digest = $input.first().json;

const GOOGLE_SEARCH = (q) => 'https://www.google.com/search?q=' + encodeURIComponent(q);
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';
const API_KEY = '{{ $credentials.googleGeminiApi.apiKey }}';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Returns 'ok' | 'broken' | 'unknown'
const checkUrl = async (url) => {
  if (!url || url === 'null' || url.includes('google.com/search')) return 'broken';
  try {
    const res = await this.helpers.httpRequest({
      method: 'GET',
      url,
      timeout: 10000,
      followRedirect: true,
      returnFullResponse: true,
      ignoreHttpStatusErrors: true,
      headers: BROWSER_HEADERS,
    });
    const code = res.statusCode || 0;
    if (code >= 200 && code < 400) return 'ok';
    // 401/403/405/429 = site is up but blocking our request style — link is real, keep it
    if ([401, 403, 405, 429].includes(code)) return 'ok';
    // 404/410 = genuinely gone
    if (code === 404 || code === 410) return 'broken';
    // other 4xx/5xx — uncertain
    return 'unknown';
  } catch (e) {
    // Network error / timeout — we can't prove it's broken, so don't discard it
    console.warn(`[LINK] check error for ${url}: ${e.message}`);
    return 'unknown';
  }
};

const findUrlWithGemini = async (headline, source) => {
  try {
    const prompt = `Find the exact, direct URL for this specific article. Return ONLY the URL — no explanation, no markdown, no other text.

Article headline: "${headline}"
Published by: ${source}

Search and return the full direct URL. If you cannot find a confirmed working direct URL, return the word null.`;
    const res = await this.helpers.httpRequest({
      method: 'POST',
      url: `${GEMINI_ENDPOINT}?key=${API_KEY}`,
      headers: { 'Content-Type': 'application/json' },
      body: {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0, maxOutputTokens: 256 },
      },
      json: true,
      timeout: 30000,
    });
    const data = typeof res === 'string' ? JSON.parse(res) : res;
    const text = (data.candidates?.[0]?.content?.parts || [])
      .filter(p => p.text).map(p => p.text).join('').trim();
    const m = text.match(/https?:\/\/[^\s"'<>]+/);
    return m ? m[0].replace(/[.,;)]$/, '') : null;
  } catch (e) {
    console.warn(`[LINK] Gemini lookup error: ${e.message}`);
    return null;
  }
};

const validated = [];
let stats = { ok: 0, kept_unknown: 0, fixed: 0, fallback: 0 };

for (const story of digest.stories) {
  const status = await checkUrl(story.sourceUrl);

  if (status === 'ok') {
    stats.ok++;
    validated.push(story);
    continue;
  }

  if (status === 'unknown') {
    // Could not verify, but original may be fine — KEEP it rather than downgrade.
    stats.kept_unknown++;
    validated.push({ ...story, _urlUnverified: true });
    continue;
  }

  // status === 'broken' → try to find a real one
  console.log(`[LINK] Broken URL for "${story.headline}" — searching`);
  const found = await findUrlWithGemini(story.headline, story.source);
  if (found) {
    const foundStatus = await checkUrl(found);
    if (foundStatus === 'ok' || foundStatus === 'unknown') {
      stats.fixed++;
      validated.push({ ...story, sourceUrl: found, _urlFixed: true });
      continue;
    }
  }

  // Last resort
  stats.fallback++;
  validated.push({
    ...story,
    sourceUrl: GOOGLE_SEARCH(`${story.headline} ${story.source}`),
    _urlFallback: true,
  });
}

digest.stories = validated;
digest._linkValidation = stats;
console.log(`[LINK] ok:${stats.ok} kept_unknown:${stats.kept_unknown} fixed:${stats.fixed} fallback:${stats.fallback}`);

return [{ json: digest }];
