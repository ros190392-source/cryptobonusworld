# CBW SEO, Quick Answer and Search Intent Standard V1

> Architecture standard for search-intent-driven, answer-first market pages. Non-production.
> Back to [master system](./CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md).
> Card/answer bindings: [publication binding model](../../schemas/continuous-market-intelligence-v1/CBW_PUBLICATION_BINDING_MODEL_V1.json).

This standard makes **no search-engine ranking guarantees**. It defines information architecture and
evidence discipline only.

## 1. Search-intent clusters

Every market passport is organized around these intent clusters, each mapped to claims:

`availability`, `legality`, `restrictions`, `KYC`, `payments`, `P2P`, `fees`, `products`, `security`,
`bonus`, `alternatives`.

## 2. Keyword / question research output contract

Intent research produces, per cluster: representative questions, the single "head" question, primary
and secondary keywords, and the governing claim id. This output is one of the mappings in
[the Deep Research companion](./CBW_DEEP_RESEARCH_MARKET_PASSPORT_COMPANION_V1.md).

## 3. Page information architecture

Order: **short direct answer → key facts table → procedures → tables/timelines → comparisons →
FAQ → sources/methodology**. Answer-first: the top block answers the head question in two to three
sentences, each bound to a claim.

## 4. Roles of surfaces

- **Short answer block** — head-question answer (`ANSWER_BLOCK` binding).
- **Tables** — facts, fees, limits (claim-bound cells).
- **Procedures** — registration/KYC/payment steps.
- **Timelines** — market history.
- **Comparisons** — country Top-10 / alternatives.
- **FAQ** — long-tail intents (`FAQ` binding).

## 5. Title / meta rules

Titles state the market and head intent (e.g. "<Exchange> in <Country>: availability, KYC, fees").
Titles/meta **MUST NOT** promise guaranteed bonuses or rankings. `TITLE_META` bindings are owner-gated.

## 6. Page-type relationships

- **Country hub** links to each exchange market passport for that country.
- **Global exchange profile** owns global facts; **market passport** owns country facts and references
  the global profile.
- **Supporting guides** (e.g. a payments how-to) exist only when they serve a distinct intent that
  would otherwise cannibalize the passport.

## 7. Internal links and canonicalization

Each fact is authored once and referenced; duplicate content across routes is avoided. Canonical URLs
point to the market passport for market intents. Canonicalization/indexability changes are owner-gated
and out of scope for autonomous updates.

## 8. Visible freshness / evidence

Every published fact **MUST** show a freshness indicator and be traceable to evidence via the
methodology/source section. Stale or unsupported critical facts are suppressed per
[the market passport standard](./CBW_EXCHANGE_COUNTRY_MARKET_PASSPORT_STANDARD_V1.md).

## 9. Structured-data discipline

Structured data **MUST** reflect only evidenced facts. The platform **MUST NOT** emit false aggregate
ratings, fake review counts, or markup designed to fabricate rich results. `STRUCTURED_DATA` bindings
are owner-gated.

## 10. Compact Top-10 card fields

The Top-10 card uses exactly the claim-bound fields defined in
[the market passport standard, section 7](./CBW_EXCHANGE_COUNTRY_MARKET_PASSPORT_STANDARD_V1.md):
name+logo, availability badge, KYC badge, top payment rail, "up to …" offer label (L2+), freshness
indicator, and an owner-gated CTA. No unbound field may appear on the card.

## 11. Cannibalization controls

Two routes **MUST NOT** target the same head intent. A separate guide earns its own route only when it
serves a distinct intent cluster with its own head question; otherwise its content is a section of the
passport.
