// PARSE & VALIDATE DIGEST
// Gemini with Google Search grounding often returns MULTIPLE parts:
// reasoning/planning text first, then the actual JSON (sometimes fenced).
// We must extract ONLY the JSON object, not concatenate everything.

let raw = $input.first().json;

// The HTTP node may wrap the Gemini response under .body/.data/.response,
// or return it as a JSON string. Normalize to the actual Gemini object.
if (typeof raw === 'string') {
  try { raw = JSON.parse(raw); } catch (e) { /* leave as-is */ }
}
let response = raw;
if (raw && !raw.candidates && !raw.error) {
  if (raw.body) response = (typeof raw.body === 'string' ? JSON.parse(raw.body) : raw.body);
  else if (raw.data) response = (typeof raw.data === 'string' ? JSON.parse(raw.data) : raw.data);
  else if (raw.response) response = (typeof raw.response === 'string' ? JSON.parse(raw.response) : raw.response);
}

// Defensive: if we still don't have candidates or a recognizable error, surface what we got.
if (!response || (typeof response === 'object' && !response.candidates && !response.error && !response.promptFeedback)) {
  throw new Error('Parse: unexpected Gemini response shape. Top-level keys: ' + Object.keys(raw || {}).join(', ') + ' | First 300 chars: ' + JSON.stringify(raw).slice(0, 300));
}

if (response.error) {
  throw new Error(`Gemini API error: ${response.error.code} — ${response.error.message}`);
}

const candidates = response.candidates;
if (!candidates || candidates.length === 0) {
  const blockReason = response.promptFeedback?.blockReason;
  throw new Error(`Gemini returned no candidates. Block reason: ${blockReason || 'unknown'}`);
}

const candidate = candidates[0];
const finishReason = candidate.finishReason;
if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
  throw new Error(`Gemini stopped unexpectedly: finishReason=${finishReason}`);
}

const parts = candidate.content?.parts || [];
const allText = parts.filter(p => p.text).map(p => p.text).join('\n').trim();

if (!allText) {
  throw new Error('Gemini returned empty content.');
}

// ── Extract the JSON object from the combined text ──
// Strategy, in order of preference:
// 1. A ```json ... ``` fenced block
// 2. A plain ``` ... ``` fenced block that parses as JSON
// 3. The substring from the first '{' to the last '}'

function tryParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}

let digest = null;

// 1. Look for a ```json fenced block
const jsonFence = allText.match(/```json\s*([\s\S]*?)```/i);
if (jsonFence) {
  digest = tryParse(jsonFence[1].trim());
}

// 2. Any ``` fenced block
if (!digest) {
  const anyFence = allText.match(/```\s*([\s\S]*?)```/);
  if (anyFence) digest = tryParse(anyFence[1].trim());
}

// 3. First '{' to last '}' — handles reasoning text before/after raw JSON
if (!digest) {
  const firstBrace = allText.indexOf('{');
  const lastBrace = allText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    digest = tryParse(allText.substring(firstBrace, lastBrace + 1));
  }
}

// 4. Last resort — try the whole thing
if (!digest) {
  digest = tryParse(allText);
}

if (!digest) {
  throw new Error(`Could not extract valid JSON from Gemini response. First 500 chars: ${allText.substring(0, 500)}`);
}

if (!digest.stories || !Array.isArray(digest.stories)) {
  throw new Error('Invalid digest — missing stories array');
}

// Sort: high importance first
digest.stories.sort((a, b) => {
  if (a.importance === 'high' && b.importance !== 'high') return -1;
  if (b.importance === 'high' && a.importance !== 'high') return 1;
  return 0;
});

// Carry through search queries for debugging
const groundingMeta = candidate.groundingMetadata;
if (groundingMeta?.webSearchQueries) {
  digest._searchQueries = groundingMeta.webSearchQueries;
}

return [{ json: digest }];
