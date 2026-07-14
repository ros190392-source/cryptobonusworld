# CryptoBonusWorld GEO Exchange Research System

## Master specification for researching, ranking and publishing crypto exchanges by country

**Purpose:** create a repeatable GEO research pipeline for CryptoBonusWorld that determines which exchanges are genuinely used, accessible and suitable for recommendation in a specific country.

**Initial test setup:**

- One target GEO
- Six exchanges
- Six promo codes
- Six affiliate links
- Claude Code agent team
- Automated and manual evidence collection
- Reproducible scoring
- Editorial and affiliate safety gates

---

# 1. What the system must determine

For each target country, the system must answer:

1. Which crypto exchanges are genuinely used by residents?
2. Which exchanges officially support the country?
3. Can a resident register and pass KYC?
4. Which local documents are accepted?
5. Which products are available?
6. Which products are restricted?
7. Is the mobile application available locally?
8. Does the exchange support the local currency?
9. Which local payment methods are available?
10. Is there a functioning local P2P market?
11. Is the exchange legally or regulatorily permitted?
12. Is the affiliate program allowed to target this GEO?
13. Does the affiliate link work from this GEO?
14. Is the promo code applied or visible?
15. Is the advertised bonus correct for this country?
16. In what order should exchanges be displayed on CryptoBonusWorld?
17. How confident is the system in every conclusion?

The system must not treat global trading volume as proof of popularity within a particular country.

---

# 2. Core architecture

For every combination:

```text
country × exchange
```

the system creates an **Exchange GEO Passport**.

Example for Kazakhstan:

```text
KZ × Binance
KZ × Bybit
KZ × OKX
KZ × MEXC
KZ × Crypto.com
KZ × Gate.io
```

Each passport stores separate scores:

```text
usage_score
availability_score
user_fit_score
commercial_score
confidence_score
homepage_score
```

Popularity, availability, user value and affiliate value must never be collapsed into one unexplained score.

---

# 3. Rankings produced by the system

## 3.1 Real Usage Ranking

Answers:

> Which exchanges have the strongest evidence of genuine usage in the country?

Signals:

- local web traffic;
- local branded search demand;
- app popularity;
- P2P activity;
- local user discussions;
- local payment usage;
- local operational presence.

## 3.2 Availability Ranking

Answers:

> Which exchanges can a normal resident actually use?

Signals:

- website access;
- registration;
- country selector;
- KYC;
- local documents;
- local app availability;
- spot;
- derivatives;
- P2P;
- fiat deposit;
- fiat withdrawal;
- regulatory status.

## 3.3 User Fit Ranking

Answers:

> Which exchange is most practical for an ordinary user in this GEO?

Signals:

- local currency;
- local banks;
- payment methods;
- P2P liquidity;
- fees;
- local language;
- app quality;
- support;
- product coverage;
- security and trust.

## 3.4 Commercial Ranking

Answers:

> Which exchanges make sense to promote on CryptoBonusWorld?

Signals:

- Usage Score;
- Availability Score;
- User Fit Score;
- affiliate GEO eligibility;
- promo code validity;
- bonus strength;
- landing page quality;
- conversion potential;
- affiliate terms.

Commercial value must not override factual availability or regulatory safety.

---

# 4. Agent team

## Agent 01 — GEO Orchestrator

Main coordinating agent.

Responsibilities:

- accepts country configuration;
- accepts exchange list;
- creates a research run;
- generates task manifests;
- assigns tasks;
- monitors completion;
- blocks publication until required gates pass;
- launches scoring;
- launches Red Team review;
- produces final status.

Input example:

```json
{
  "country": "KZ",
  "country_name": "Kazakhstan",
  "local_currency": "KZT",
  "languages": ["kk", "ru"],
  "exchanges": [
    "binance",
    "bybit",
    "okx",
    "mexc",
    "crypto-com",
    "gate-io"
  ]
}
```

Output:

```text
research_run_id
run_status
completed_tasks
failed_tasks
missing_evidence
unresolved_conflicts
ranking_status
publication_status
```

The Orchestrator should coordinate research, not invent facts itself.

---

## Agent 02 — Country Context Researcher

Researches the target country itself.

Responsibilities:

- cryptocurrency legal status;
- competent regulators;
- official registers;
- licensing structure;
- banking environment;
- local currency;
- major banks;
- local payment methods;
- P2P importance;
- local languages;
- common search languages;
- mobile platform usage;
- exchange access restrictions;
- local market characteristics.

Outputs:

```text
country-context.json
country-regulatory-map.json
country-payment-map.json
country-language-map.json
country-source-map.json
```

---

## Agent 03 — Regulatory Researcher

Uses regulatory and legal sources.

Source priority:

1. regulator;
2. official government register;
3. legislation portal;
4. official exchange terms;
5. official exchange legal notice;
6. reliable news publication;
7. secondary directory.

Checks:

- exchange registration;
- local licence;
- legal entity;
- authorised products;
- regulator warnings;
- domain blocks;
- marketing restrictions;
- retail-user eligibility;
- territorial scope of a licence;
- special economic or financial zone limitations.

Evidence object:

```json
{
  "claim": "Exchange is available to retail users in the country",
  "status": "confirmed | contradicted | uncertain",
  "source_tier": "A | B | C | D",
  "source_url": "",
  "source_title": "",
  "published_at": "",
  "checked_at": "",
  "extract": "",
  "interpretation": "",
  "limitations": ""
}
```

---

## Agent 04 — Exchange Official Terms Researcher

Checks official exchange sources for each exchange.

Research areas:

- Terms of Service;
- eligibility;
- restricted countries;
- KYC;
- local documents;
- fiat services;
- P2P;
- cards;
- Earn;
- derivatives;
- regional entities;
- mobile apps;
- affiliate conditions;
- bonus conditions.

Minimum desired official evidence per exchange:

```text
1 registration/eligibility source
1 restricted-country source
1 KYC source
1 local currency or payment source
1 P2P source
1 product availability source
1 affiliate eligibility source
```

Missing evidence must remain:

```text
UNKNOWN
```

Unknown facts must never be converted into assumptions.

---

## Agent 05 — Live Availability Tester

Performs read-only tests from the target GEO.

Checks:

- homepage accessibility;
- registration page;
- country selector;
- KYC entry flow;
- public deposit pages;
- public P2P pages;
- local currency;
- local bank names;
- affiliate landing page;
- promo code visibility;
- regional redirects;
- restriction notices;
- CDN/proxy/network errors.

Allowed:

- public-page access;
- registration form inspection without submission;
- public country selector;
- public P2P inspection;
- public landing-page screenshots;
- HTML snapshots.

Not allowed:

- fake account creation;
- false identity;
- use of third-party documents;
- KYC bypass;
- regional restriction bypass;
- deposits;
- trades;
- withdrawal tests.

Each test stores:

```text
timestamp
exit_ip_country
target_url
http_status
final_url
page_title
visible_status
screenshot_path
html_snapshot_path
error_class
test_confidence
```

Error classes:

```text
SITE_AVAILABLE
REGISTRATION_AVAILABLE
COUNTRY_NOT_LISTED
REGION_RESTRICTED
PRODUCT_RESTRICTED
APP_ONLY
LOGIN_REQUIRED
CLOUDFLARE_BLOCKED
PROXY_BLOCKED
NETWORK_FAILURE
UNKNOWN_FAILURE
```

The tester must distinguish an exchange GEO restriction from a proxy-provider block.

---

## Agent 06 — App Store Researcher

Checks iOS and Android separately.

Collects:

- local store availability;
- app name;
- publisher;
- legal entity;
- category;
- Finance rank;
- rating;
- review count;
- recent review velocity;
- local-language reviews;
- mentions of local banks and currency;
- last update date;
- complaints about registration or withdrawals;
- regional app variants.

Must exclude:

- fake apps;
- similarly named wallets;
- Web3-only apps;
- institutional apps;
- apps from unrelated publishers.

---

## Agent 07 — Search Demand Researcher

Collects local demand for every exchange.

Example query groups:

```text
[exchange]
[exchange] registration
[exchange] login
[exchange] app
[exchange] reviews
[exchange] deposit
[exchange] withdrawal
[exchange] p2p
[exchange] [local currency]
[exchange] [local bank]
[exchange] fees
[exchange] promo code
[exchange] bonus
[exchange] unavailable
[exchange] blocked
```

Queries should cover:

- local official language;
- Russian where relevant;
- English;
- transliteration;
- common misspellings.

Intent classification:

```text
NAVIGATION
REGISTRATION
DEPOSIT
WITHDRAWAL
P2P
TRADING
BONUS
REVIEW
COMPLAINT
RESTRICTION
NEWS
SCAM
OTHER
```

High-weight usage intents:

```text
NAVIGATION
REGISTRATION
DEPOSIT
WITHDRAWAL
P2P
TRADING
```

Low or separate weight:

```text
NEWS
COMPLAINT
RESTRICTION
SCAM
```

A scandal-driven search spike must not be treated as real usage growth.

---

## Agent 08 — Web Traffic Researcher

Collects:

- estimated local visits;
- country traffic share;
- local category rank;
- direct traffic;
- search traffic;
- mobile web share;
- 3-month trend;
- 6-month trend;
- 12-month trend.

Checks relevant domains and subdomains:

```text
exchange.com
regional.exchange.com
accounts.exchange.com
p2p.exchange.com
local.exchange.com
```

Must avoid double-counting users across subdomains.

Web traffic is an estimate, not a verified number of customers.

---

## Agent 09 — P2P Liquidity Researcher

Checks public P2P liquidity for the local currency.

Example for Kazakhstan:

```text
currency = KZT
assets = USDT, BTC, USDC
directions = BUY, SELL
payment_methods = Kaspi, Halyk, bank transfer, others
```

Snapshots:

```text
weekday morning
weekday evening
weekend daytime
```

Collects:

- number of offers;
- unique merchants;
- verified merchants;
- available volume;
- minimum limit;
- maximum limit;
- median price;
- spread;
- payment-method coverage;
- depth of first 5–10 listings;
- stability across snapshots.

Also records:

- whether login is required;
- whether public offers are visible;
- whether local currency is available;
- whether local banks appear;
- whether the market is genuinely active.

---

## Agent 10 — Local Community Researcher

Finds evidence of actual local usage.

Sources:

- Telegram;
- YouTube;
- Reddit;
- local forums;
- financial websites;
- app reviews;
- local news;
- Q&A platforms;
- social networks.

Classifies mentions:

```text
REAL_USE
HOW_TO
DEPOSIT
WITHDRAWAL
P2P
COMPLAINT
ADVERTISING
NEWS
SCAM_WARNING
RESTRICTION
AFFILIATE_CONTENT
```

High-value evidence:

```text
REAL_USE
HOW_TO
DEPOSIT
WITHDRAWAL
P2P
```

Low-value evidence:

```text
ADVERTISING
AFFILIATE_CONTENT
```

Mass-produced affiliate articles must not be counted as independent proof.

---

## Agent 11 — Local Payments Researcher

Checks:

- local-currency deposit;
- local-currency withdrawal;
- bank card;
- bank transfer;
- P2P;
- major local banks;
- Apple Pay;
- Google Pay;
- fiat providers;
- fees;
- limits;
- expected processing time;
- required currency conversion.

Matrix example:

| Exchange | Local deposit | Local withdrawal | P2P | Major local bank | Card | Bank transfer |
|---|---:|---:|---:|---:|---:|---:|

Possible values:

```text
YES
NO
PARTIAL
THIRD_PARTY
P2P_ONLY
UNKNOWN
```

---

## Agent 12 — Product Availability Researcher

Creates a product-level availability map.

| Product | Status |
|---|---|
| Spot | Available / Restricted / Unknown |
| Futures | Available / Restricted / Unknown |
| Options | Available / Restricted / Unknown |
| Margin | Available / Restricted / Unknown |
| P2P | Available / Restricted / Unknown |
| Earn | Available / Restricted / Unknown |
| Staking | Available / Restricted / Unknown |
| Launchpool | Available / Restricted / Unknown |
| Card | Available / Restricted / Unknown |
| Copy trading | Available / Restricted / Unknown |
| Fiat deposit | Available / Restricted / Unknown |
| Fiat withdrawal | Available / Restricted / Unknown |

Product restrictions must not be generalised to the entire exchange.

Example:

```text
Spot available
Futures restricted
Card unavailable
P2P available
```

must remain a partial availability result.

---

## Agent 13 — Promo and Affiliate Validator

Validates each exchange’s:

```text
affiliate link
promo code
bonus claim
landing page
GEO eligibility
tracking
redirect chain
affiliate restrictions
```

Checks:

- link opens from the GEO;
- final domain is official;
- redirect chain is safe;
- promo code is visible or applied;
- bonus claim matches the page;
- GEO is permitted;
- SEO traffic is allowed;
- paid traffic rules;
- brand bidding rules;
- coupon-site rules;
- social media rules;
- affiliate payments are possible;
- country is not excluded.

Statuses:

```text
VERIFIED
VERIFIED_WITH_LIMITS
CLAIM_MISMATCH
CODE_NOT_VISIBLE
LINK_BROKEN
GEO_NOT_ELIGIBLE
AFFILIATE_TERMS_UNCLEAR
MANUAL_CHECK_REQUIRED
FORBIDDEN
```

---

## Agent 14 — Fees Researcher

Collects fees relevant to local users:

- spot maker/taker;
- futures maker/taker;
- P2P fees;
- card deposit;
- bank transfer;
- fiat provider;
- crypto withdrawal;
- conversion spread.

Schema:

```text
product
fee_type
value
currency
tier
conditions
source
checked_at
```

The system must not compare exchanges only by spot fees when local users mainly buy through P2P.

---

## Agent 15 — Security and Trust Researcher

Checks:

- Proof of Reserves;
- reserve audits;
- insurance or protection funds;
- 2FA;
- passkeys;
- withdrawal whitelist;
- anti-phishing code;
- incident history;
- user compensation;
- regulatory enforcement;
- legal-entity transparency;
- quality of official incident communications.

Security does not directly define popularity, but affects User Fit and editorial warnings.

---

## Agent 16 — Evidence Normalizer

Combines all research into a common format.

Responsibilities:

- remove duplicate sources;
- detect stale evidence;
- identify conflicting claims;
- reject facts copied from another GEO;
- reject global facts that do not apply locally;
- assign evidence tiers;
- connect evidence to claim objects.

Outputs:

```text
evidence-ledger.json
claims-ledger.json
conflicts.json
unknowns.json
```

---

## Agent 17 — Conflict Resolver

Handles conflicting evidence.

Examples:

```text
Official page says the country is supported,
but the registration selector does not list it.
```

```text
P2P shows local currency,
but the Terms of Service list the country as restricted.
```

Rules:

1. Never hide a conflict.
2. Never choose the result that produces the highest affiliate conversion.
3. Confirm whether sources refer to the same legal entity.
4. Compare publication and update dates.
5. Check regional versions.
6. request another live test where needed;
7. use `UNCERTAIN` when the conflict cannot be resolved.

Conflict object:

```json
{
  "conflict_id": "",
  "claim": "",
  "evidence_for": [],
  "evidence_against": [],
  "resolution": "",
  "status": "resolved | unresolved",
  "final_value": "YES | NO | PARTIAL | UNKNOWN",
  "confidence": 0
}
```

---

# 5. Evidence tiers

## Tier A — Primary evidence

Examples:

- regulator;
- official register;
- legislation;
- official exchange terms;
- official product page;
- live registration flow;
- official App Store listing;
- public exchange P2P interface.

Weight:

```text
1.00
```

## Tier B — Strong analytical evidence

Examples:

- Similarweb;
- Google Trends;
- established blockchain analytics;
- recognised app intelligence;
- established market intelligence.

Weight:

```text
0.75
```

## Tier C — Independent secondary evidence

Examples:

- major local media;
- expert analysis;
- local forums;
- user discussions;
- non-affiliate guides.

Weight:

```text
0.45
```

## Tier D — Weak evidence

Examples:

- SEO directories;
- coupon websites;
- affiliate reviews;
- anonymous aggregators;
- copied articles.

Weight:

```text
0.15
```

Tier D must never independently confirm a critical claim.

---

# 6. Claim Object model

No factual statement should be published directly from an agent’s notes.

Every publishable fact must first become a Claim Object:

```json
{
  "claim_id": "kz-bybit-p2p-kzt-001",
  "country": "KZ",
  "exchange": "bybit",
  "category": "p2p",
  "claim": "Bybit supports public P2P offers denominated in KZT",
  "value": true,
  "status": "verified",
  "confidence": 94,
  "evidence_ids": [
    "ev-001",
    "ev-002"
  ],
  "first_verified_at": "2026-07-14",
  "last_verified_at": "2026-07-14",
  "next_check_at": "2026-07-21",
  "owner_review_required": false
}
```

Publishable statuses:

```text
verified
verified_with_limits
```

Non-publishable as confirmed fact:

```text
unknown
conflicted
stale
failed
```

---

# 7. Scoring system

## 7.1 Usage Score

```text
Usage Score =
25% Web Traffic
+ 20% Search Demand
+ 20% App Popularity
+ 15% P2P Activity
+ 10% Community Evidence
+ 5% Local Payments Presence
+ 5% Local Operational Presence
```

### Web Traffic subscore

```text
40% estimated local visits
25% local category rank
20% traffic stability
15% direct traffic share
```

### Search Demand subscore

```text
40% branded searches
20% registration/deposit searches
15% P2P searches
10% withdrawal searches
10% 12-month stability
5% local-language coverage
```

### App Popularity subscore

```text
35% local Finance rank
25% estimated local installs
20% review velocity
10% local review count
10% rating quality
```

### P2P Activity subscore

```text
30% unique merchants
25% active offers
20% available liquidity
10% payment-method coverage
10% spread quality
5% stability across snapshots
```

### Community Evidence subscore

```text
35% real-use discussions
20% deposit/withdrawal discussions
15% independent how-to content
15% local media presence
10% recent activity
5% source diversity
```

---

## 7.2 Availability Score

```text
Availability Score =
20% Registration
+ 20% KYC
+ 15% Legal/Regulatory Status
+ 15% Fiat/P2P Access
+ 15% Core Product Access
+ 10% App Access
+ 5% Support/Language
```

Hard penalties and caps:

```text
Country explicitly forbidden:
score = 0

Registration impossible:
maximum Availability Score = 25

KYC impossible:
maximum Availability Score = 30

Official retail restriction:
maximum Availability Score = 20

App unavailable but web available:
no hard zero
```

---

## 7.3 User Fit Score

```text
User Fit Score =
20% Availability
+ 20% Local Payments
+ 15% P2P Quality
+ 10% Fees
+ 10% Product Coverage
+ 10% App Quality
+ 5% Local Language
+ 5% Support
+ 5% Trust and Security
```

---

## 7.4 Commercial Score

```text
Commercial Score =
25% Usage Score
+ 20% Availability Score
+ 20% User Fit Score
+ 10% Commercial Search Intent
+ 10% Affiliate Eligibility
+ 5% Promo Strength
+ 5% Landing Page Quality
+ 5% Expected Conversion
```

Hard rules:

```text
Affiliate GEO forbidden:
Commercial Score = 0

Affiliate terms unclear:
Commercial Score capped at 45

Registration impossible:
Commercial Score = 0

KYC impossible:
Commercial Score capped at 10

Bonus claim not verified:
Promo Strength = 0

Affiliate link broken:
Commercial Score = 0
```

---

## 7.5 Confidence Score

```text
Confidence =
35% Evidence Quality
+ 25% Evidence Completeness
+ 20% Source Agreement
+ 10% Freshness
+ 10% Successful Live Verification
```

Levels:

```text
90–100 = Very High
75–89 = High
60–74 = Medium
40–59 = Low
0–39 = Insufficient
```

Recommended minimum for a homepage top-three position:

```text
confidence_score >= 75
```

A high Usage Score with low confidence must not automatically produce first place.

---

## 7.6 Homepage Rank Score

First, create a Qualified Set.

An exchange qualifies for the main ranking when:

```text
availability_score >= 50
confidence_score >= 60
registration != NO
KYC != NO
regulatory_status != FORBIDDEN
```

Then calculate:

```text
Homepage Rank Score =
35% User Fit
+ 25% Usage
+ 20% Availability
+ 10% Commercial
+ 10% Confidence
```

Commercial factors are deliberately limited.

---

# 8. Normalisation

Popularity signals are normalised within the target country and candidate exchange set.

Example:

```text
highest local branded demand among the six exchanges = 100
```

Other values:

```text
exchange_value / maximum_value × 100
```

However, absolute availability facts must use fixed values.

Example:

```text
registration confirmed = 100
registration with limitations = 65
uncertain = 35
not available = 0
```

If all exchanges are poorly available, the least-bad exchange must not receive 100 merely because it ranks first among them.

---

# 9. Hard publication gates

## Gate 01 — Evidence Completeness

Required for every exchange:

```text
registration
KYC
restricted countries
spot
P2P
local currency
app
affiliate GEO
promo code
affiliate link
```

If less than 80% is complete:

```text
ranking_status = INCOMPLETE
```

## Gate 02 — Regulatory Safety

If there is:

- regulator warning;
- service prohibition;
- marketing prohibition;
- inability to serve residents legally;

then ordinary CTA is prohibited.

Possible output states:

```text
informational_only
restricted
not_recommended
```

## Gate 03 — Affiliate Integrity

CTA allowed only when:

- affiliate link works;
- final domain is official;
- GEO is allowed;
- promo code is valid;
- bonus text is verified;
- no critical unresolved conflict exists.

## Gate 04 — Ranking Integrity

First place prohibited when:

```text
confidence_score < 70
availability_score < 60
affiliate_status = FORBIDDEN
critical_conflicts > 0
```

## Gate 05 — No Paid Bias

Usage, Availability and User Fit must be calculated before the scoring agent can access affiliate commission data.

## Gate 06 — Freshness

Suggested freshness windows:

```text
registration test: 30 days
restricted-country terms: 30 days
affiliate GEO: 30 days
P2P availability: 7 days
promo landing page: 3 days
bonus amount: 3 days
regulatory status: 30 days
app availability: 30 days
search popularity: 30 days
web traffic: 30–60 days
```

Expired evidence becomes:

```text
STALE
```

It is not silently deleted.

---

# 10. Editorial statuses

Each exchange receives one or more clear labels.

```text
BEST_OVERALL
MOST_POPULAR
BEST_FOR_P2P
BEST_FOR_BEGINNERS
BEST_LOCAL_FIAT_SUPPORT
AVAILABLE_WITH_LIMITS
INFORMATIONAL_ONLY
INSUFFICIENT_EVIDENCE
RESTRICTED
NOT_AVAILABLE
```

---

# 11. Exchange GEO Passport schema

```json
{
  "country": "KZ",
  "exchange": "bybit",
  "research_status": "complete",
  "identity": {
    "brand": "Bybit",
    "global_domain": "",
    "local_domain": "",
    "legal_entity": "",
    "regulatory_entity": ""
  },
  "availability": {
    "website": "YES",
    "registration": "YES",
    "country_selector": "YES",
    "kyc": "YES",
    "local_documents": "UNKNOWN",
    "app_ios": "YES",
    "app_android": "YES"
  },
  "products": {
    "spot": "YES",
    "futures": "UNKNOWN",
    "p2p": "YES",
    "earn": "UNKNOWN",
    "card": "NO",
    "fiat_deposit": "PARTIAL",
    "fiat_withdrawal": "P2P_ONLY"
  },
  "local_fit": {
    "currency": "KZT",
    "currency_supported": true,
    "local_language": true,
    "local_banks": [],
    "payment_methods": [],
    "p2p_merchants": null
  },
  "affiliate": {
    "link": "",
    "promo_code": "",
    "link_status": "VERIFIED",
    "code_status": "VERIFIED",
    "geo_eligible": "YES",
    "bonus_claim_status": "VERIFIED"
  },
  "scores": {
    "usage": 0,
    "availability": 0,
    "user_fit": 0,
    "commercial": 0,
    "confidence": 0,
    "homepage": 0
  },
  "status": {
    "editorial": "",
    "cta": "ALLOWED",
    "index_eligible": true
  },
  "evidence_ids": [],
  "conflict_ids": [],
  "unknown_claim_ids": [],
  "last_checked_at": "",
  "next_check_at": ""
}
```

---

# 12. Suggested repository structure

```text
agents/
  geo-orchestrator/
  country-context/
  regulatory/
  official-terms/
  live-availability/
  app-store/
  search-demand/
  web-traffic/
  p2p-liquidity/
  community/
  local-payments/
  product-availability/
  affiliate-validator/
  fees/
  security/
  evidence-normalizer/
  conflict-resolver/
  scoring/
  red-team/
  editorial/
  qa/

config/
  geo/
    kz.json
  scoring/
    usage.json
    availability.json
    user-fit.json
    commercial.json
    homepage.json
  freshness.json
  evidence-tiers.json
  publication-gates.json

schemas/
  country-context.schema.json
  evidence.schema.json
  claim.schema.json
  conflict.schema.json
  exchange-geo-passport.schema.json
  research-run.schema.json
  scoring-result.schema.json

src/data/geo/kz/
  country-context.json
  country-regulatory-map.json
  country-payment-map.json
  exchanges/
    binance.json
    bybit.json
    okx.json
    mexc.json
    crypto-com.json
    gate-io.json
  evidence/
    evidence-ledger.json
    claims-ledger.json
    conflicts.json
    unknowns.json
  scores/
    usage.json
    availability.json
    user-fit.json
    commercial.json
    homepage-ranking.json
  content/
    homepage-facts.json
    comparison-table.json
    faq.json
    editorial-warnings.json

reports/geo/kz/
  research-report.md
  evidence-report.md
  conflict-report.md
  ranking-explanation.md
  sensitivity-analysis.md
  red-team-report.md
```

---

# 13. Complete research-run order

## Phase 0 — Initialisation

1. Validate target GEO.
2. Load six exchange records.
3. Load six affiliate links and promo codes.
4. Create research run ID.
5. Create directories.
6. Generate task manifest.
7. Lock publication.
8. Record run date and version.

## Phase 1 — Country Baseline

1. Identify regulators.
2. Find official registers.
3. Define legal regime.
4. Identify local banks.
5. Identify payment methods.
6. Define local languages.
7. Define local currency.
8. Describe market structure.
9. Identify local licensed exchanges.
10. Record major country-specific risks.

## Phase 2 — Official Exchange Research

For each exchange:

1. identify legal entity;
2. find Terms of Service;
3. find restricted-country rules;
4. check eligibility;
5. check KYC;
6. check accepted documents;
7. check products;
8. check fiat;
9. check P2P;
10. check app;
11. check affiliate rules;
12. create official claims.

## Phase 3 — Live GEO Validation

For each exchange:

1. open homepage;
2. open registration;
3. inspect country selector;
4. inspect public local pages;
5. inspect P2P;
6. check local currency;
7. check affiliate URL;
8. check promo code;
9. save screenshot;
10. save HTML snapshot;
11. classify failures.

## Phase 4 — Popularity Research

Run in parallel:

```text
Web Traffic Researcher
Search Demand Researcher
App Store Researcher
P2P Liquidity Researcher
Local Community Researcher
```

Each agent must return independent datasets.

## Phase 5 — User Fit Research

Research:

- payments;
- fees;
- product limitations;
- language;
- app quality;
- support;
- security;
- beginner suitability.

## Phase 6 — Evidence Normalisation

1. combine evidence;
2. remove duplicates;
3. assign tiers;
4. verify dates;
5. connect evidence to claims;
6. find conflicts;
7. create unknown list;
8. reject cross-GEO contamination.

## Phase 7 — Conflict Resolution

1. inspect every conflict;
2. find fresher primary evidence;
3. compare legal entities;
4. compare regional versions;
5. repeat live test where needed;
6. resolve or mark unknown;
7. block publication where required.

## Phase 8 — Scoring

1. calculate raw metrics;
2. normalise relative metrics;
3. apply fixed thresholds;
4. calculate Usage;
5. calculate Availability;
6. calculate User Fit;
7. calculate Commercial;
8. calculate Confidence;
9. apply caps and penalties;
10. calculate Homepage Score.

## Phase 9 — Sensitivity Analysis

Recalculate ranking under several scenarios.

### Scenario A — Popularity First

Increase Usage weight.

### Scenario B — Beginner First

Increase payments, app quality and simplicity.

### Scenario C — Regulatory First

Increase licence and official availability weight.

### Scenario D — Commercial First

Increase affiliate and conversion weight.

Results:

```text
ranking_stability = HIGH | MEDIUM | LOW
```

If small weight changes produce a new leader, the ranking is unstable and must be explained.

## Phase 10 — Red Team Audit

The Red Team attempts to prove the ranking wrong.

Checks:

- affiliate bias;
- advertising confused with usage;
- scandal-driven search demand;
- VPN traffic;
- global/local product confusion;
- stale terms;
- illegal CTA;
- insufficient evidence for first place;
- ignored local exchanges;
- hidden negative facts;
- incorrect bonus claim;
- ranking instability.

Output:

```text
ranking-challenges.json
red-team-report.md
```

## Phase 11 — Editorial Generation

The content agent receives only approved Claim Objects.

Creates:

- page title;
- introduction;
- ranking;
- exchange cards;
- comparison table;
- methodology;
- FAQ;
- restrictions;
- affiliate disclosure;
- last-checked date.

The content agent must not invent facts, bonus amounts or legal conclusions.

## Phase 12 — Final QA

Checks:

- exchange order;
- score consistency;
- CTA status;
- affiliate URLs;
- promo codes;
- bonus wording;
- GEO restrictions;
- evidence dates;
- screenshots;
- mobile layout;
- disclosure;
- unsupported claims;
- restricted statements.

## Phase 13 — Publish or Block

Possible final states:

```text
READY_TO_PUBLISH
READY_WITH_WARNINGS
OWNER_REVIEW_REQUIRED
BLOCKED_BY_CONFLICT
BLOCKED_BY_MISSING_EVIDENCE
BLOCKED_BY_AFFILIATE_RULES
```

---

# 14. Final report requirements

The final report must answer:

1. Which exchange has the strongest evidence of real usage?
2. Which exchange is most accessible?
3. Which exchange is best for an ordinary user?
4. Which exchange is best for P2P?
5. Which has the best local-payment support?
6. Which products are restricted?
7. Which exchanges cannot be promoted?
8. Which claims remain conflicted?
9. Which facts remain unknown?
10. Why is the final order justified?
11. How does the order change under alternative weights?
12. How stable is the ranking?
13. When must each fact be rechecked?
14. Which conclusions require owner review?

---

# 15. Homepage output

For the user, the page may show:

```text
Best overall
Most popular
Best for P2P
Best for beginners
Best local payment support
Available with limitations
```

Each exchange card should include:

```text
rank
editorial label
promo code
verified bonus
availability status
local payment methods
P2P status
important restrictions
why it ranks here
last verified date
CTA or informational-only status
```

Below the ranking:

```text
How we ranked the exchanges
What was verified
Country-specific restrictions
Evidence freshness
Affiliate disclosure
```

Recommended methodology wording:

> Exchanges are ranked using multiple independent signals, including verified availability, local payment support, P2P activity, search demand, app visibility, web traffic and local user evidence. Affiliate compensation does not determine the factual popularity or availability scores.

---

# 16. Success criteria for the first GEO test

The test is considered successful when:

```text
100% of exchanges have an Exchange GEO Passport
90% or more of critical claims are checked
100% of affiliate links are tested
100% of promo codes are checked
100% of affiliate GEO restrictions are checked
at least 3 independent popularity signals exist per exchange
all conflicts are documented
all unknowns are explicit
sensitivity analysis is complete
Red Team review is complete
final publication status is generated
```

---

# 17. Main safeguards

The system must always follow these rules:

1. Never use one source as the complete basis of a ranking.
2. Never treat global trading volume as local popularity.
3. Never treat search noise as proven usage.
4. Never rank by affiliate payout alone.
5. Never hide regulatory or product restrictions.
6. Never convert unknown data into confident facts.
7. Never publish a bonus that was not verified.
8. Never publish a CTA where affiliate GEO eligibility is forbidden.
9. Never allow the editorial agent to create facts.
10. Never give first place to an exchange with unresolved critical conflicts.

---

# 18. Practical first implementation

For the first Claude Code implementation, physical agents can be reduced to:

```text
01 Orchestrator
02 Country and Regulation
03 Binance Research
04 Bybit Research
05 OKX Research
06 MEXC Research
07 Crypto.com Research
08 Gate.io Research
09 Popularity Signals
10 P2P and Payments
11 Affiliate Validator
12 Evidence and Conflicts
13 Scoring Engine
14 Red Team
15 Editorial QA
```

Several logical roles may run through one reusable Claude Code subagent with different task files.

Recommended implementation order:

```text
1. JSON schemas
2. GEO config
3. exchange input records
4. evidence and claim ledgers
5. task manifests
6. official-source research
7. live Playwright tests
8. affiliate validation
9. scoring engine
10. publication gates
11. sensitivity analysis
12. Red Team
13. editorial generator
14. final QA
```

---

# 19. Recommended name

Possible system name:

```text
CryptoBonusWorld GEO Exchange Reality Engine
```

Short form:

```text
GEO Exchange Reality Score — GERS
```

The public claim should not be:

> These are definitely the most popular exchanges in the country.

A more defensible wording is:

> These exchanges have the strongest verified indicators of usage, availability and local suitability among the platforms included in our research.

---

# 20. Next implementation task for Claude Code

After loading this document into the CryptoBonusWorld project chat, the next task should be:

```text
Analyse the existing CryptoBonusWorld repository and design the smallest safe implementation plan for the GEO Exchange Research System.

Do not modify production pages yet.

First produce:
1. repository inventory;
2. proposed directory structure;
3. JSON schemas;
4. GEO config schema;
5. Exchange GEO Passport schema;
6. Evidence Object schema;
7. Claim Object schema;
8. Conflict Object schema;
9. scoring configuration;
10. task manifest format;
11. publication gates;
12. phased implementation plan;
13. regression risks;
14. owner approval checkpoints.

Use Kazakhstan as the first test GEO and the six currently configured exchanges and affiliate promo-code records as the initial candidate set.
```
