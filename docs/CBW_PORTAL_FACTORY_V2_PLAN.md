# CryptoBonusWorld Portal Factory v2

Status: DESIGN / ARCHITECTURE WORKING PLAN  
Roadmap: #130  
Design task: #132  
Templates: #133  
i18n: #134  
Data pipeline: #135  
Pilot: #136  
Scale: #138

## 1. Product direction

CryptoBonusWorld remains a static Astro/TypeScript portal. This work does not introduce a heavy backend, a CMS rewrite, or a fresh disconnected rebrand.

The existing exchange-page factory becomes the foundation for a unified international portal that can render:

- global exchange discovery;
- country hubs and rankings;
- exchange global profiles;
- exchange × country market passports;
- comparisons;
- guides and answers;
- evidence/methodology pages;
- public update history;
- localized presentation variants.

The system must scale by adding structured records and approved content packages, not by copying pages.

## 2. Non-negotiable preservation rules

During design and template development:

- preserve current live exchange pages and approved Batch 01/02 work;
- preserve existing offer facts, promo codes and affiliate bindings;
- preserve `/go/` routes;
- preserve canonical, sitemap and robots behavior until an explicit migration is approved;
- preserve existing GEO evidence and Kazakhstan research records;
- preserve canonical color-locked exchange logos;
- do not publish design routes;
- do not infer facts from missing parser data;
- do not use proxy, VPN, IP rotation, automated accounts or KYC bypass for GEO research.

## 3. Visual direction

Systematize the strongest existing CBW visual language rather than replacing the brand.

### Foundation

- primary surfaces: navy, warm amber, evidence green and light neutral backgrounds;
- typography: Inter for UI/body and Barlow Condensed where the existing display system benefits from it;
- fixed responsive geometry and reusable spacing tokens;
- canonical exchange logo treatment;
- evidence-first status language;
- compact, readable mobile layouts;
- restrained motion and no decorative effects that obscure factual status.

### Semantic component states

Every major component must support:

- verified;
- partially checked;
- under review;
- restricted;
- unavailable;
- stale / recheck required;
- unknown / insufficient evidence;
- empty / no approved ranking;
- no verified offer binding.

Colors are secondary. Text labels and accessible semantics carry the status.

## 4. Homepage v2 information architecture

The homepage must contain one ranking only.

1. Global header
   - logo;
   - primary navigation;
   - compact country control;
   - separate language control;
   - search/discovery entry.

2. Product hero
   - explain evidence-led exchange discovery;
   - state that country availability, KYC and terms vary;
   - route users to a country or the global ranking.

3. Country discovery
   - compact selector and featured-country cards;
   - no exchange rows inside this block;
   - runtime personalization remains non-indexed and never changes canonical server content.

4. One governed Top-10
   - approved ranking rows only;
   - status and freshness visible;
   - affiliate CTA only where approved;
   - under-review rows remain neutral.

5. Trust and methodology
   - how evidence is gathered;
   - confidence/freshness model;
   - editorial and affiliate separation.

6. Featured countries
   - country status cards;
   - readiness and last-checked state;
   - links to approved country hubs only.

7. Exchange discovery
   - global exchange directory entry;
   - categories and comparison paths.

8. Latest research and changes
   - approved updates only;
   - public change history.

9. Guides and answers
   - reusable guide cards and FAQ.

10. International footer
    - countries, exchanges, methodology, policies and locale controls.

## 5. Reusable public page family

### 5.1 Country hub

Proposed English route:

`/countries/{country}/`

Sections:

- market overview;
- approved availability summary;
- country ranking entry;
- popular exchanges;
- local payments and fiat;
- P2P/KYC/regulatory notes;
- relevant guides;
- latest material changes;
- evidence and freshness summary.

### 5.2 Country exchange ranking

Proposed English route:

`/countries/{country}/exchanges/`

Rules:

- no approved ranking snapshot means no ranking rows;
- Top-3/Top-10 is controlled by snapshot data, not page markup;
- exclusions, restrictions and under-review candidates remain visible in governed sections;
- methodology version and checked date are mandatory.

### 5.3 Exchange global profile

Existing global exchange routes remain the canonical base during migration.

The profile will converge on reusable modules for:

- identity and products;
- global KYC/fees/safety information;
- offer status;
- country discovery;
- evidence and history;
- related comparisons/guides.

### 5.4 Exchange × country market passport

Proposed English route:

`/countries/{country}/exchanges/{exchange}/`

Primary data entity:

`MarketProfile(exchangeId, countryId)`

Sections:

- local availability and confidence;
- restrictions and regulator signals;
- account/KYC conditions;
- supported local fiat/payment methods;
- P2P and product availability;
- local offer eligibility;
- alternatives;
- sources, last checked and material change history.

### 5.5 Comparison

Proposed route family:

`/compare/{exchange-a}-vs-{exchange-b}/`

Country-specific comparison is rendered only when both market profiles are approved for that country.

### 5.6 Guide/article

Guides consume approved claims and structured editorial blocks. They do not query raw parser output during render.

### 5.7 Methodology and change history

Public methodology explains ranking, confidence, freshness and conflict handling. Public change history records material approved changes without exposing sensitive internal operations.

## 6. Language and GEO separation

Country and language are separate registries.

- Country controls market facts.
- Locale controls presentation.
- Facts are stored once.
- Translations cannot alter availability, restrictions, dates, confidence, ranking or offer state.

Current English routes remain stable during foundation work.

Localized route proposal for review:

`/{locale}/countries/{country}/...`

No public locale route is activated until #134 freezes canonical/hreflang and migration rules.

Candidate early locales: English, Polish, Russian and Ukrainian. Locale activation depends on complete UI/content coverage, not merely machine translation availability.

## 7. Governed parser-to-content flow

```text
Source registry
  → fetch/capture
  → raw evidence packet
  → normalized claim
  → conflict and diff analysis
  → approved Market Profile
  → approved Ranking Snapshot
  → approved Content Package
  → locale rendering
  → review-only preview / noindex
  → automated QA
  → owner review
  → controlled merge/deploy
```

### Parser permissions

Parsers and research agents may:

- collect source material;
- extract candidate claims;
- update evidence queues;
- flag stale/conflicting records;
- generate draft content packages;
- propose impacted pages.

They may not autonomously:

- approve legal or regulatory conclusions;
- approve rankings;
- activate affiliate offers;
- enable indexability;
- merge to production;
- deploy.

## 8. Core contracts

### Country

- stable ID and slug;
- names by locale;
- region/regulatory overlays;
- supported currencies and languages;
- publication/readiness state.

### Locale

- locale code;
- UI dictionary coverage;
- content coverage;
- fallback and publication state;
- canonical/hreflang support.

### Exchange

- stable ID/slug;
- canonical identity and logos;
- global profile references;
- approved offer binding.

### Market Profile

- exchange ID;
- country ID;
- availability;
- restrictions/regulator signals;
- KYC/account requirements;
- local fiat/payment methods;
- P2P/products;
- offer eligibility;
- evidence references;
- confidence, limitations and freshness;
- approval/publication state.

### Ranking Snapshot

- country ID;
- methodology version;
- approved ordered rows;
- excluded and under-review candidates;
- evidence freshness;
- owner approval and publication revision.

### Content Package

- approved factual blocks;
- editorial outline;
- FAQ candidates;
- source references;
- internal links;
- translation readiness;
- preview and QA state.

## 9. Review-only implementation routes

Initial design and template work lives under noindex routes such as:

- `/__design/cbw-v2/foundation/`
- `/__design/cbw-v2/homepage/`
- `/__design/cbw-v2/country/`
- `/__design/cbw-v2/country-ranking/`
- `/__design/cbw-v2/exchange/`
- `/__design/cbw-v2/market-passport/`

These routes must not modify live production facts or public canonical routes.

## 10. Team execution sequence

### Phase A — 045: remove duplicate ranking

- keep one homepage Top-10;
- deploy and live-verify;
- preserve GEO component/data for redesign.

### Phase B — 046: design foundation

UX/IA and visual design produce the token/component system and review routes.

### Phase C — 047: Homepage v2

Frontend assembles the approved homepage from reusable components. QA validates desktop/tablet/mobile, accessibility, affiliate boundaries and content assertions.

### Phase D — 048: page family

Build review-only country, ranking, exchange and market-passport templates from fixtures that clearly distinguish approved, missing, stale and under-review states.

### Phase E — 049: i18n foundation

SEO/i18n establishes locale registry, dictionaries, route helpers, canonical/hreflang and sitemap behavior.

### Phase F — 050: ingestion contracts

Data/research builds schemas, validation, freshness, conflicts, diff/impact analysis and publication manifests.

### Phase G — 051: first country pilot

Select the country with the strongest approved evidence. Current candidates: Kazakhstan and Poland. Build the complete page family and one locale variant.

### Phase H — 052: scale

Onboard further GEOs, locales and exchanges through configuration, approved data and repeatable QA.

## 11. Quality gates

Every production change requires:

- scoped feature branch;
- reviewable PR;
- Astro build PASS;
- SEO/canonical/hreflang assertions where applicable;
- affiliate integrity PASS;
- schema/content validation PASS;
- desktop 1440, tablet 768 and mobile 390 browser QA;
- no horizontal overflow;
- no mixed-language content;
- no unsupported claim or ranking;
- owner review;
- controlled deployment and live verification.

## 12. Immediate next implementation

1. deploy and verify CBW-045 single-ranking homepage;
2. create `/__design/cbw-v2/foundation/`;
3. create `/__design/cbw-v2/homepage/`;
4. render desktop/tablet/mobile review evidence;
5. freeze the selected direction before public Homepage v2 convergence.
