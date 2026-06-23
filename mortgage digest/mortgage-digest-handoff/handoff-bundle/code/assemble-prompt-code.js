// ASSEMBLE PROMPT — builds the full Gemini user prompt as one clean string.
// Done in a Code node (not inline in the JSON body) so the JSON schema's { }
// braces don't collide with n8n's {{ }} expression parser. The Gemini node's
// body then references this single assembled string: {{ $json.fullPrompt }}.
//
// Inputs (by node reference):
//   $now                                          → date
//   $('Next Variant Digest').item.json.promptInstruction → skew (per variant)
//   $('Editorial for Prompt').first().json.value      → editorial block
// Output: { fullPrompt, systemInstruction }

// Date, formatted like "Friday, June 20, 2026"
const now = $now;
const dateStr = now.toLocaleString
  ? now.toLocaleString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })
  : new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });

// Skew (audience focus) for the current variant
let skew = '';
try { skew = $('Next Variant Digest').item.json.promptInstruction || ''; } catch (e) { skew = ''; }

// Editorial block from PromptConfig
let editorial = '';
try { editorial = $('Editorial for Prompt').first().json.value || ''; } catch (e) { editorial = ''; }

const fullPrompt = `Today is ${dateStr}.

AUDIENCE FOCUS: ${skew}

${editorial}

WRITING RULES — strictly follow:
- NO DIRECT QUOTES: Never copy or reproduce any sentence, phrase, or passage verbatim from a source article. Every word in summaries, keyPoints, and effects must be original writing based on the facts reported. Paraphrase and synthesize — do not transcribe.
- sourceUrl: EXACT direct URL to the specific article. Search the headline to verify it resolves before including. If unconfirmed, set to null.

Return ONLY valid JSON, no markdown, no code fences:
{
  "date": "${dateStr}",
  "subject": "email subject line under 55 chars — punchy, specific, no fluff",
  "marketSnapshot": {
    "narrative": "MAX 2 sentences. Lead with the most important rate/market move and why.",
    "rates": [
      { "label": "30-YR FIXED", "value": "X.XX%", "change": "+X bps" },
      { "label": "15-YR FIXED", "value": "X.XX%", "change": "+X bps" },
      { "label": "10-YR TREASURY", "value": "X.XX%", "change": "+X bps" },
      { "label": "MBS 6.0 COUPON", "value": "XX-XX", "change": "+X ticks" },
      { "label": "FED FUNDS", "value": "X.XX-X.XX%", "change": "unchanged" }
    ]
  },
  "stories": [
    {
      "source": "Source Name",
      "sourceUrl": "https://direct-article-url.com/specific-article or null",
      "headline": "Verbatim or near-verbatim headline from source",
      "summary": "MAX 2 sentences. Lead with the key fact or number.",
      "keyPoints": ["Fact one, max 10 words", "Fact two, max 10 words", "Fact three, max 10 words"],
      "effects": {
        "hasEffects": true,
        "firstOrder": ["Max 12 words", "Max 12 words"],
        "secondOrder": ["Max 12 words", "Max 12 words"]
      },
      "realtorSection": {
        "hasRealtorAngle": true,
        "summary": "MAX 2 sentences written for agents/realtors specifically.",
        "actionables": ["Concrete action or prep item, max 12 words", "Second item, max 12 words"]
      },
      "importance": "high or normal",
      "category": "rates | mbs | housing | fed | regulatory | gse | lender | economy | inventory | demand | brokerage | proptech | macro"
    }
  ],
  "watchList": ["Max 10 words", "Max 10 words", "Max 10 words"],
  "closingNote": "One sentence, max 20 words."
}

For stories with no realtor angle set: "realtorSection": { "hasRealtorAngle": false }.
For stories without meaningful effects set: "effects": { "hasEffects": false }.

IMPORTANT: Output ONLY the JSON object. Do not include any reasoning, explanation, preamble, or commentary before or after the JSON. Your entire response must be the JSON object itself, optionally wrapped in a single \`\`\`json code fence.`;

const systemInstruction = `You are a senior analyst covering both the mortgage origination industry and the residential real estate market. You write for a professional audience whose specific focus is defined per edition in the AUDIENCE FOCUS instruction. You write with precision and authority. Lead every summary with the key number or decision. Never pad. Be direct.`;

// Build the COMPLETE Gemini request body as an object, then stringify.
// Passing the whole body as one pre-stringified value means n8n never has to
// merge multi-line text into a JSON template — eliminating the escaping bug.
const requestBody = {
  system_instruction: { parts: [{ text: systemInstruction }] },
  contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
  tools: [{ google_search: {} }],
  generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
};

return [{ json: {
  requestBody: JSON.stringify(requestBody),
  fullPrompt,           // kept for the generation log / debugging
  systemInstruction,
} }];
