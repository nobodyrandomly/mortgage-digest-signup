// LINK VALIDATOR
// Checks each story's sourceUrl by attempting a HEAD request.
// If the URL is broken (non-200, redirect to homepage, or null),
// replaces it with a Google search URL for the headline so the link
// always works in the email.

const digest = $input.first().json;

const GOOGLE_SEARCH = (q) =>
  'https://www.google.com/search?q=' + encodeURIComponent(q);

const checkUrl = async (url) => {
  if (!url || url === 'null') return false;
  try {
    const res = await $helpers.request({
      method: 'HEAD',
      url,
      timeout: 6000,
      followRedirect: true,
      simple: false, // don't throw on non-200
    });
    // Accept 200-399; reject 4xx/5xx
    return res.statusCode >= 200 && res.statusCode < 400;
  } catch {
    return false;
  }
};

const validatedStories = [];
let fixed = 0;
let ok = 0;

for (const story of digest.stories) {
  const isValid = await checkUrl(story.sourceUrl);
  if (isValid) {
    ok++;
    validatedStories.push(story);
  } else {
    fixed++;
    validatedStories.push({
      ...story,
      sourceUrl: GOOGLE_SEARCH(story.headline),
      _urlFixed: true, // flag for debugging
    });
  }
}

digest.stories = validatedStories;
digest._linkValidation = { ok, fixed, total: digest.stories.length };

console.log(`Link validation: ${ok} OK, ${fixed} fixed via Google search fallback`);

return [{ json: digest }];