# PromptConfig Sheet Tab

Add a tab named `PromptConfig` to the spreadsheet. It holds the EDITORIAL portion
of the Gemini prompt — the parts you'll tune over time — while structural rules
(JSON schema, no-verbatim-quotes, output-only-JSON) stay safely in the node.

## Structure: two columns, one data row

| key | value |
|---|---|
| editorial | (the full editorial prompt text — paste the block below) |

Just two cells of content: header `key`/`value`, then one row with `editorial` in
column A and the prompt text in column B.

> Keeping it as a key/value row (not a single naked cell) lets you add more
> configurable keys later — e.g. `editorial`, `subjectStyle`, `storyCountMin` —
> without restructuring. The workflow reads the row where key='editorial'.

## Starter value for the `editorial` cell

Paste everything between the lines into column B of the editorial row:

----------------------------------------------------------------
Use Google Search to find TODAY'S most important news from these sources:

MORTGAGE & LENDING:
- HousingWire (housingwire.com)
- Mortgage News Daily (mortgagenewsdaily.com)
- MBS Live (mbslive.com)
- National Mortgage Professional (nationalmortgageprofessional.com)
- Federal Reserve (federalreserve.gov)
- CFPB (consumerfinance.gov)
- Freddie Mac (freddiemac.com)
- Fannie Mae (fanniemae.com)
- Mortgage Bankers Association (mba.org)

REAL ESTATE & MARKET DATA:
- National Association of Realtors (nar.realtor)
- Inman News (inman.com)
- Zillow Research (zillow.com/research)
- Redfin News (redfin.com/news)
- RealTrends (realtrends.com)
- NAHB (nahb.org)
- CoStar (costar.com)
- Calculated Risk (calculatedriskblog.com)

MACRO & ECONOMIC DATA:
- Bureau of Labor Statistics (bls.gov) — jobs, CPI, PCE
- U.S. Census Bureau Housing (census.gov) — starts, permits, new home sales
- Conference Board (conference-board.org) — consumer confidence

FINANCIAL MEDIA (SPECIFIC SECTIONS):
- Bloomberg CityLab and Bloomberg Real Estate vertical (bloomberg.com/citylab and bloomberg.com/real-estate) — NOT general Bloomberg finance
- Wall Street Journal: "Housing" tag and Nick Timiraos byline specifically (wsj.com/real-estate/housing and wsj.com/economy/housing) — NOT general WSJ

LENGTH & STYLE GUIDANCE:
- summary: MAX 2 sentences. Lead with the number or decision, not context.
- keyPoints: MAX 3 bullets, each MAX 10 words. Facts only.
- effects firstOrder/secondOrder: MAX 2 items each, MAX 12 words per item.
- realtorSection.summary: MAX 2 sentences. Speak directly to agents — what does this mean for listings, buyers, or their business?
- realtorSection.actionables: MAX 2 items, MAX 12 words each. Concrete things an agent or realtor can act on or prepare for.
- watchList: MAX 10 words per item.
- closingNote: ONE sentence, MAX 20 words.
- Headlines: verbatim or near-verbatim from source.

For each story, analyze downstream consequences:
- FIRST ORDER EFFECTS: Direct immediate consequences
- SECOND ORDER EFFECTS: Downstream ripple effects on different players

For stories directly relevant to realtors/agents (inventory, buyer demand, pricing trends, commission/brokerage news, proptech, migration, affordability by market), include a realtorSection. For pure MBS/rate/lender stories with no agent relevance, omit it.

Only include effects for high-importance stories or those with genuinely significant consequences.

Include EXACTLY 7 stories in the stories array — the 7 most important of the day. Mark 2-3 as high importance. Order: high importance first, then by recency. You may research and synthesize from more than 7 sources, but only the top 7 make the final stories array. The marketSnapshot narrative may reflect broader context drawn from all your research.
----------------------------------------------------------------

## What stays in the node (do NOT move to sheet)
- The date line and `{{ $now }}` expressions (n8n expressions only evaluate in the node)
- The AUDIENCE FOCUS skew line (comes from SkewConfig per variant)
- The NO DIRECT QUOTES rule (critical legal guardrail — keep it protected in the node)
- The full JSON schema block (the machinery; breaking it breaks everything)
- The "Output ONLY the JSON object" instruction
