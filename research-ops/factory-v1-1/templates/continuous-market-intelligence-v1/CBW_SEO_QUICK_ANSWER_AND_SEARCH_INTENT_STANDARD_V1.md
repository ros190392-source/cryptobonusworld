# CBW SEO, Quick Answer and Search Intent Standard V1

> Architecture standard for intent-driven, answer-first market pages. Non-production. **Owner Audit
> Correction 026:** explicit 30–60 word direct-answer contract with claim binding, freshness and
> uncertainty. Back to [master system](./CBW_CONTINUOUS_EXCHANGE_MARKET_INTELLIGENCE_SYSTEM_V1.md).
> Answer/card bindings: [publication binding model](../../schemas/continuous-market-intelligence-v1/CBW_PUBLICATION_BINDING_MODEL_V1.json).

This standard makes **no** search-engine promises — no featured snippets, AI Overviews, rankings or
rich results.

## 1. Search-intent clusters

`availability`, `legality`, `restrictions`, `KYC`, `payments`, `P2P`, `fees`, `products`, `security`,
`bonus`, `alternatives`. Each maps to claims.

## 2. Direct-answer block contract

Every direct-answer block **MUST**:

- be **30–60 words by default**;
- give the **direct answer in sentence one**;
- cover **one question / intent per block**;
- be **claim-bound** (`ANSWER_BLOCK` binding to a specific claim);
- state **uncertainty and limitations** explicitly where evidence is `LOW`/`UNVERIFIED`, `CONFLICTED`
  or `UNDER_REVIEW`;
- be **visibly dated / freshness-labelled** (`FRESH`/`DUE_SOON`/`STALE`/`EXPIRED`);
- be **traceable to evidence** via the methodology/source section;
- be **suppressed or downgraded** for stale, conflicted, under-review or unsupported **critical**
  claims (replaced by an explicit "under review" answer).

## 3. Page information architecture

Order: **short direct answer → key facts table → procedures → tables/timelines → comparisons → FAQ →
sources/methodology**.

## 4. Surface roles

Short answer block (head-question answer); tables (claim-bound facts/fees/limits); procedures
(registration/KYC/payment steps); timelines (history); comparisons (Top-10 / alternatives); FAQ
(long-tail intents).

## 5. Title / meta rules

Titles state market and head intent; **MUST NOT** promise guaranteed bonuses or rankings. `TITLE_META`
bindings are owner-gated.

## 6. Page-type relationships

Country hub → each exchange market passport; global exchange profile owns global facts; market
passport owns country facts and references the global profile; supporting guides exist only for a
distinct intent.

## 7. Internal links and canonicalization

Each fact authored once and referenced; canonical URLs point to the market passport for market
intents; canonicalization/indexability changes are owner-gated and out of scope for autonomous
updates.

## 8. Visible freshness / evidence

Every published fact shows a freshness indicator and is evidence-traceable; stale or unsupported
critical facts are suppressed per
[the market passport standard](./CBW_EXCHANGE_COUNTRY_MARKET_PASSPORT_STANDARD_V1.md).

## 9. Structured-data discipline

Structured data reflects only evidenced facts; **MUST NOT** emit false aggregate ratings, fake review
counts, or markup to fabricate rich results. `STRUCTURED_DATA` bindings are owner-gated.

## 10. Compact Top-10 card fields

Exactly the claim-bound fields from
[the market passport standard, section 7](./CBW_EXCHANGE_COUNTRY_MARKET_PASSPORT_STANDARD_V1.md):
name+logo, availability badge, KYC badge, top payment rail, "up to …" offer label (`L2_OFFER_VISIBLE`+),
freshness indicator, owner-gated CTA. No unbound field appears on the card.

## 11. Cannibalization controls

Two routes **MUST NOT** target the same head intent; a separate guide earns its own route only for a
distinct intent cluster with its own head question.
