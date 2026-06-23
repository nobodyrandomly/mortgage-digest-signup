# SkewConfig promptInstruction values (paste into the SkewConfig tab)

Now that the mix-ratio lives here (not in PromptConfig), EACH row's promptInstruction
owns its variant's balance and emphasis. The `general` row defines the default
balanced edition; skewed rows explicitly override toward their audience.

Columns: partnerType | displayName | promptInstruction | active

---

## general  (REQUIRED — the default/fallback edition)
**displayName:** Daily Briefing
**active:** TRUE
**promptInstruction:**
```
This is the general edition for a mixed professional audience of mortgage and real estate professionals. Provide a balanced mix: roughly half mortgage/lending/rate stories and half real estate/market/macro stories. Serve both lender professionals and real estate agents equally — neither audience should feel the edition skews away from them.
```

---

## realtor
**displayName:** For Real Estate Professionals
**active:** TRUE
**promptInstruction:**
```
This edition is for real estate agents and brokers. Override any default balance: lead heavily with real estate stories — at least 5 of the 7 should cover inventory, buyer demand, pricing and price-cut trends, days-on-market, commission/brokerage developments, proptech, and local-market movement. Include rate/mortgage news only where it directly affects buyer affordability or deal flow. Minimize deep MBS/coupon/rate-mechanics detail. Expand realtorSection coverage on every story where an agent angle exists.
```

---

## attorney
**displayName:** For Legal Professionals
**active:** TRUE
**promptInstruction:**
```
This edition is for real estate and mortgage attorneys. Override any default balance: weight regulatory, compliance, and legal-structural stories heavily — at least 4 of the 7 should cover CFPB actions, litigation, RESPA/TILA, fair-lending enforcement, licensing, settlement/closing rule changes, and legislative developments. Frame implications in terms of legal and compliance risk. Include market/rate context only as it bears on legal or regulatory exposure.
```

---

## advisor
**displayName:** For Financial Advisors
**active:** TRUE
**promptInstruction:**
```
This edition is for financial advisors and wealth managers. Override any default balance: weight macro and economic stories heavily — Fed policy, rate trajectory, inflation, employment, and how housing and mortgage trends affect client wealth, portfolio decisions, and real-estate-as-an-asset-class. Frame implications for client financial planning. Minimize industry-operational mortgage news (origination volume, LO movement) with no investor relevance.
```

---

## builder
**displayName:** For Builders & Developers
**active:** TRUE
**promptInstruction:**
```
This edition is for homebuilders and developers. Override any default balance: weight construction and supply stories heavily — at least 4 of the 7 should cover housing starts, permits, builder sentiment (NAHB), construction costs and materials, labor, new-home sales, land and development, and zoning. Include rate/demand news where it affects buyer traffic for new homes. Minimize resale-brokerage and secondary-market detail.
```

---

> To add a new type later: add a row here with an assertive promptInstruction that
> states its emphasis and explicitly says to override the default balance. The
> generator picks it up automatically once a subscriber of that type exists.
