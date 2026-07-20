# CryptoBonusWorld — Country × Exchange Deep Passport Standard v1

**Status:** Proposed owner authority
**Version:** 1.0
**Project:** CryptoBonusWorld.com
**Page family:** Country × Exchange Deep Passport
**Purpose:** Define one complete reusable page standard for a crypto exchange in a specific country, generated from structured Deep Research and rendered in one or more languages without changing the underlying facts.

---

## 1. Core concept

This is not a small promotional card and not a manually written article.

It is a full evidence-backed page family assembled from reusable data layers:

```text
Global Exchange Passport
+ Country × Exchange Cell
+ Country Market Profile
+ Offer Registry
+ Evidence / Claim Ledger
+ Language Layer
= Country × Exchange Deep Passport
```

Example:

```text
Global Bybit Passport
+ Kazakhstan × Bybit Cell
+ Kazakhstan Market Profile
+ Bybit Global Offer Registry
+ Kazakhstan Evidence Package
+ Russian / Kazakh / English Language Layer
= Bybit in Kazakhstan
```

The same research truth is reused across languages. Language changes presentation, terminology, examples and search phrasing; it must not change facts.

---

## 2. Primary user questions

The page must answer immediately:

1. Is this exchange available in my country?
2. Can I register and complete KYC?
3. Which products are available or restricted?
4. Does it support my local currency and payment methods?
5. Is P2P available?
6. What are the important fees and limits?
7. Is there a promo code or bonus?
8. Are the bonus terms different in my country?
9. Is the exchange regulated or registered locally?
10. What risks, limitations or unresolved questions remain?
11. What alternatives are available in this country?

---

## 3. Search and page intent

Each localized page has one primary intent:

```text
{Exchange} in {Country}
```

Secondary intents may include:

- `{Exchange} available in {Country}`
- `{Exchange} referral code {Country}`
- `{Exchange} fees {Country}`
- `{Exchange} P2P {local currency}`
- `{Exchange} KYC {Country}`
- `{Exchange} legal in {Country}`
- `{Exchange} deposit methods {Country}`
- `{Exchange} alternatives {Country}`

The page must not compete with the Country Hub for the full country-wide exchange universe.

### Intent ownership

**Country Hub owns:**

- complete market overview;
- Top 5 for the country;
- all verified available exchanges;
- restricted exchange universe;
- banks, payment rails and regulation at country level;
- broad local buying guides.

**Country × Exchange page owns:**

- the deep relationship between one exchange and one country;
- local product availability;
- local payment and currency facts;
- local restrictions;
- local evidence;
- local alternatives relevant to that exchange.

---

## 4. Route concept

Prototype architecture only:

```text
/{country}/{language}/exchanges/{exchange}/
```

Examples:

```text
/kz/ru/exchanges/bybit/
/kz/kk/exchanges/bybit/
/kz/en/exchanges/bybit/
```

Binding rules:

- one URL = one stable language version;
- country controls market facts;
- language controls presentation;
- self-canonical;
- reciprocal hreflang only when the translated page is complete and maintainable;
- Global version may act as x-default;
- no forced redirects;
- no automatic publication of every matrix combination.

---

## 5. Page composition layers

### Layer A — Global Exchange Passport

Canonical facts that do not normally change by country:

- exchange identity;
- official domains;
- global products;
- global fee schedules;
- security controls;
- global licenses and registrations;
- Proof of Reserves;
- incidents;
- global promo code;
- global advertised bonus maximum;
- official apps;
- API and trading tools;
- global source registry.

### Layer B — Country × Exchange Cell

Local differences:

- registration availability;
- new-account eligibility;
- KYC availability and requirements;
- spot availability;
- derivatives availability;
- margin/leverage;
- P2P;
- local fiat;
- bank transfer;
- cards;
- third-party providers;
- app-store availability;
- local language support;
- local support channels;
- regulator status;
- local restrictions;
- local offer eligibility;
- checked date;
- confidence;
- conflicts;
- evidence.

### Layer C — Country Market Profile

Country-level context:

- local currency;
- banking environment;
- local payment methods;
- P2P environment;
- crypto regulation;
- tax context;
- consumer warnings;
- regulator list;
- sanctions/capital-control context where relevant;
- local terminology;
- local search language.

### Layer D — Offer Registry

Commercial facts kept separate from availability:

- referral code;
- affiliate route;
- official terms URL;
- global advertised maximum;
- offer checked date;
- eligibility wording;
- country variability note;
- local verified amount only when separately proven;
- CTA eligibility.

### Layer E — Evidence / Claim Ledger

Every material claim must map to:

- claim ID;
- exact claim;
- source URL;
- source type;
- source date;
- retrieval date;
- checked date;
- market;
- language;
- confidence;
- conflict status;
- evidence notes;
- next recheck date.

### Layer F — Language Layer

Contains no new market facts.

It controls:

- title;
- H1;
- meta description;
- direct answer wording;
- section headings;
- explanatory prose;
- table labels;
- FAQ wording;
- local terminology;
- number/date/currency formatting;
- culturally natural examples;
- internal-link anchors.

---

## 6. Availability states

Canonical states:

```text
AVAILABLE
AVAILABLE_WITH_LIMITS
RESTRICTED
UNAVAILABLE
UNDER_REVIEW
CONFLICTING
UNKNOWN
STALE
```

### AVAILABLE

- registration supported;
- core products supported;
- evidence current enough;
- commercial CTA may be eligible.

### AVAILABLE_WITH_LIMITS

Exact limitation required:

- no derivatives;
- no P2P;
- no local fiat;
- app unavailable;
- product restrictions;
- residency limitations;
- local account restrictions.

### RESTRICTED / UNAVAILABLE

- no promo code;
- no commercial CTA;
- show reason;
- show local alternatives;
- do not imply workaround or circumvention.

### UNDER_REVIEW / CONFLICTING / UNKNOWN

- no definitive claim;
- show what is known;
- show missing evidence;
- no active commercial CTA unless separately approved.

### STALE

- show previous state;
- show stale warning;
- show last checked date;
- reduce confidence;
- trigger recheck.

---

## 7. First-screen contract

The first screen is a lightweight decision card. It must answer the main user question before the deep page begins.

### Desktop structure

```text
Breadcrumbs

[ official square exchange mark 120×120 ]

{Exchange} in {Country} {Flag}

[ Availability badge ]
Available in Nigeria 🇳🇬

Direct verdict:
Bybit is available in Nigeria for spot trading and P2P.
Some products may have local restrictions.

Checked: 20 July 2026
Confidence: Medium

[ PROMO CODE label ]
[ CRYPTOBONUSWORLD ][ copy icon ]

Up to 30,050 USDT
Global advertised maximum
Terms vary by country

[ Claim Bonus ] [ Read limitations ]

Reviewed & verified by CryptoBonusWorld
```

### Mobile structure

```text
[ 56×56 exchange mark ] Exchange
Available in Nigeria 🇳🇬

Direct verdict — maximum 3 concise lines

Checked date · Confidence

Key facts:
Spot · P2P · NGN · KYC

PROMO CODE
[ CRYPTOBONUSWORLD ][ copy icon ]

Up to 30,050 USDT
Terms vary by country

[ Claim Bonus ]

or, when restricted:

[ View available alternatives ]
```

### First-screen required data

- official square exchange mark;
- exchange name as HTML;
- country flag and full country name;
- availability;
- direct answer;
- checked date;
- confidence;
- top local product facts;
- promo code only when eligible;
- global advertised maximum;
- terms-vary note;
- CTA only when eligible;
- alternative CTA when restricted;
- small CBW trust badge.

### First-screen prohibited content

- long legal explanations;
- full fee tables;
- long methodology;
- hidden evidence;
- duplicate country selector;
- large decorative text baked into images;
- unsupported guarantees;
- fake ratings.

---

## 8. Exchange identity standard

Use:

- official square exchange mark;
- official app icon;
- official compact symbol.

Do not use:

- CBW planet as exchange identity;
- AI-generated exchange marks;
- cropped horizontal wordmarks;
- recolored official marks;
- letter placeholders in final production.

### Logo stage

Desktop hero:

```text
Stage: 120×120
Official mark: optically normalized, usually 80–88px
```

Tablet:

```text
Stage: 96×96
Mark: 68–72px
```

Mobile:

```text
Stage: 56×56
Mark: 36–42px
```

---

## 9. Promo module standard

### Desktop first screen

```text
PROMO CODE

[ CRYPTOBONUSWORLD ][ copy icon ]
```

- field: 216×48;
- code area: 168px;
- icon area: 48px;
- code: 14px monospace;
- label above field;
- icon-only copy.

### Mobile first screen

- 430: 304×52;
- 390: 288×52;
- 360: 272×52;
- icon area: 52×52;
- code: 16px monospace;
- centered module;
- label above field.

### Commercial states

- eligible: active code + CTA;
- verifying: `Code hidden — verifying`;
- restricted: no code;
- copied: check mark for 2 seconds;
- no visible `Copy` word in the canonical v2 module.

---

## 10. Bonus policy

Initial system stores one verified global advertised maximum.

Example:

```text
Up to 30,050 USDT
Global advertised maximum
Terms vary by country
```

Required full note:

```text
Advertised maximum. Eligibility, tiers and final value may vary by country,
account, deposit, trading activity and campaign terms.
```

Rules:

- never guarantee the maximum;
- never label the global maximum as a locally verified amount;
- local eligibility is separate from global offer size;
- local amount appears only with local evidence;
- restricted markets have no active offer CTA.

---

## 11. Deep-page module order

### Section 1 — Local availability verdict

- available / limited / restricted / unknown;
- exact reason;
- checked date;
- confidence;
- verification mode;
- unresolved questions.

### Section 2 — Quick local facts

- registration;
- KYC;
- spot;
- derivatives;
- P2P;
- local currency;
- cards;
- bank transfer;
- app;
- local language.

### Section 3 — Registration and KYC

- who can register;
- residency requirements;
- age requirement;
- ID types;
- proof of address;
- verification levels;
- time estimates only when sourced;
- account limitations;
- corporate accounts;
- local onboarding issues.

### Section 4 — Products in this country

Separate:

- spot;
- derivatives;
- margin;
- leverage;
- options;
- copy trading;
- bots;
- staking/Earn;
- loans;
- launchpad;
- NFT or other products.

Do not infer product availability from global marketing pages.

### Section 5 — Local currency support

Separate:

- direct fiat deposit;
- bank transfer;
- card purchase;
- P2P only;
- third-party provider;
- conversion;
- withdrawal to bank;
- unknown.

Do not treat P2P as direct fiat support.

### Section 6 — Banks and payment methods

Country-specific matrix:

- bank name;
- payment rail;
- card network;
- mobile wallet;
- instant payment system;
- cash option;
- P2P method;
- third-party provider;
- deposit/withdrawal direction;
- fee;
- limit;
- source;
- checked date.

Do not publish unsupported bank compatibility claims.

### Section 7 — P2P in the country

- available or not;
- local currency;
- supported payment methods;
- merchant liquidity;
- approximate spread only when measured;
- platform fee;
- user risks;
- fraud warning;
- dispute process;
- verification requirements;
- prohibited use cases;
- evidence date.

### Section 8 — Fees

Separate every fee type:

- spot maker;
- spot taker;
- derivatives maker;
- derivatives taker;
- VIP tiers;
- deposit fee;
- withdrawal/network fee;
- card fee;
- bank fee;
- P2P platform fee;
- spread;
- third-party cost;
- inactivity or account fee where applicable.

Never compress all costs into one misleading “fee”.

### Section 9 — Limits

- minimum deposit;
- minimum trade;
- withdrawal limits;
- KYC tier limits;
- card limits;
- bank limits;
- P2P order limits;
- daily/monthly limits;
- local restrictions.

### Section 10 — App and device availability

- iOS;
- Android;
- country app-store availability;
- web access;
- desktop app;
- local language;
- app limitations;
- official app links.

### Section 11 — Local language and support

- UI language;
- support language;
- help-center language;
- local social channels;
- response channels;
- support hours when sourced;
- local phone/email only when official.

### Section 12 — Regulation and legal context

- local regulator;
- registration/license status;
- warning-list status;
- enforcement;
- permitted/restricted products;
- derivatives rules;
- marketing rules;
- banking rules;
- sanctions relevance;
- unresolved legal questions;
- date and official sources.

No legal advice.

### Section 13 — Tax context

Country-level summary only:

- taxable event categories;
- reporting responsibility;
- exchange reporting obligations where sourced;
- record-keeping note;
- official tax sources;
- limitations;
- professional-advice disclaimer.

### Section 14 — Security

- 2FA;
- withdrawal whitelist;
- anti-phishing code;
- passkeys;
- device management;
- cold storage statements;
- insurance claims;
- bug bounty;
- security certifications;
- local account-protection limitations.

### Section 15 — Proof of Reserves

- publication date;
- assets included;
- liabilities included/excluded;
- reserve ratio;
- methodology;
- provider/auditor;
- wallet coverage;
- update frequency;
- user verification;
- source;
- limitations.

Required disclaimer:

```text
PoR alone does not prove solvency or guarantee safety.
```

### Section 16 — Incidents and enforcement

- hacks;
- outages;
- account freezes;
- legal actions;
- regulator warnings;
- service interruptions;
- resolved/unresolved;
- user impact;
- official response;
- date.

### Section 17 — Local reputation and usability

Use carefully:

- app-store ratings;
- support complaints;
- P2P complaints;
- withdrawal complaints;
- local community signals;
- recurring themes;
- evidence quality.

Community sources cannot establish critical legal or availability claims.

### Section 18 — Competitor alternatives

Show:

- best alternative for beginners;
- best P2P alternative;
- lowest-fee alternative;
- regulated/local option;
- derivatives alternative;
- alternative for local currency;
- reason for each;
- only eligible exchanges in the country.

### Section 19 — Comparison links

Relevant use-case comparisons:

- Exchange vs Exchange in Country;
- P2P comparison;
- fee comparison;
- regulation comparison;
- local-currency comparison.

### Section 20 — Sources, evidence and limitations

Visible:

- primary official sources;
- regulator sources;
- exchange sources;
- checked dates;
- conflicts;
- missing evidence;
- not-live-verified facts;
- methodology;
- next recheck.

### Section 21 — FAQ

Only questions supported by actual research and search intent.

Examples:

- Is {Exchange} available in {Country}?
- Can I use {local currency}?
- Is P2P supported?
- Can I trade derivatives?
- Which banks or payment methods are supported?
- Is the promo code valid in {Country}?
- Is {Exchange} regulated locally?
- What are the best alternatives?

### Section 22 — Editorial accountability

- author;
- reviewer;
- research run ID;
- checked date;
- update history;
- corrections link;
- affiliate disclosure.

---

## 12. Country market data to collect

For each country Deep Research package:

### Country identity

- country code;
- country name;
- local names;
- flag;
- currency;
- currency symbol;
- languages;
- region;
- timezone;
- date/number formats.

### Market environment

- crypto adoption indicators;
- estimated user base where credible;
- local exchange landscape;
- major global exchanges used;
- local exchanges;
- OTC;
- P2P;
- stablecoin usage;
- remittance relevance;
- inflation/capital-control context where relevant.

### Regulation

- regulator list;
- licensing regime;
- registration regime;
- banned/restricted products;
- derivatives rules;
- marketing rules;
- consumer warnings;
- enforcement history;
- banking restrictions;
- tax sources.

### Payment ecosystem

- major banks;
- instant payment rails;
- card networks;
- mobile money;
- e-wallets;
- local wallets;
- cash networks;
- P2P payment methods;
- bank-transfer systems;
- third-party crypto providers.

### Exchange universe

For every candidate exchange:

- canonical slug;
- local availability;
- registration;
- KYC;
- spot;
- derivatives;
- P2P;
- local fiat;
- card;
- bank;
- app;
- language;
- regulation;
- restrictions;
- confidence;
- checked date;
- sources;
- conflicts.

---

## 13. Deep Research output package

Deep Research must return structured files, not one large article.

Recommended package:

```text
country-profile.json
exchange-universe.json
country-exchange-cells.json
source-registry.json
claim-ledger.json
conflicts.json
ranking-candidates.json
publication-blockers.json
language-briefs/
research-report.md
```

### Required research outputs

- complete candidate universe;
- Top ranking candidates;
- other verified available;
- available with limits;
- under review;
- restricted/unavailable;
- official source map;
- claim ledger;
- confidence;
- freshness;
- conflicts;
- unknowns;
- publication blockers;
- next recheck dates.

---

## 14. Multilingual architecture

### One fact layer, multiple language layers

Do not conduct separate independent factual research for Russian, Kazakh and English unless a source exists only in one language.

Use:

```text
Canonical research truth
→ Russian adaptation
→ Kazakh adaptation
→ English adaptation
```

### Facts must remain identical

Across languages, keep identical:

- availability;
- fees;
- product status;
- checked dates;
- confidence;
- sources;
- bonus maximum;
- restrictions;
- PoR facts;
- legal conclusions;
- rankings.

### Text may be localized

Adapt:

- H1;
- title;
- meta description;
- direct answer wording;
- terminology;
- examples;
- FAQ wording;
- internal-link anchors;
- sentence structure;
- local vocabulary;
- currency/date formatting.

### Do not “unique-ize” by changing facts

Uniqueness must come from natural language quality and local search phrasing, not invented differences.

---

## 15. Kazakhstan language example

One canonical page truth may support:

### Russian

```text
Bybit в Казахстане: доступность, P2P, KZT, комиссии и промокод
```

### Kazakh

```text
Қазақстандағы Bybit: қолжетімділік, P2P, KZT, комиссиялар және промокод
```

### English

```text
Bybit in Kazakhstan: availability, P2P, KZT, fees and promo code
```

All three pages use the same research cell.

They may have different:

- sentence structure;
- terminology;
- user examples;
- FAQ phrasing;
- internal links.

They must not have different factual conclusions.

---

## 16. Translation workflow

```text
Approved canonical research package
→ language brief
→ first translation/adaptation
→ terminology validation
→ factual parity validation
→ local-language editorial review
→ SEO intent review
→ AI-answer review
→ preview
→ owner approval
```

### Translation requirements

- no machine translation without review;
- preserve claim IDs;
- preserve source links;
- preserve dates and figures;
- use country-native terminology;
- use approved exchange-name spellings;
- preserve legal uncertainty;
- no stronger claim in translation than in source truth.

---

## 17. Language glossary

Each country package should define:

- country names;
- currency names;
- regulator names;
- payment-method names;
- bank names;
- product terminology;
- KYC terminology;
- derivatives terminology;
- P2P terminology;
- local legal terms;
- approved CTA translations;
- approved availability-state translations.

Example glossary record:

```json
{
  "termId": "availability.available_with_limits",
  "en": "Available with limits",
  "ru": "Доступна с ограничениями",
  "kk": "Шектеулермен қолжетімді"
}
```

---

## 18. SEO and AI-answer structure

### Top answer block

Must contain:

- direct answer;
- country;
- exchange;
- checked date;
- confidence;
- key limitation;
- source link path.

### Atomic sections

Use clear H2/H3 questions and concise answers.

Example:

```text
Is Bybit available in Kazakhstan?
Does Bybit support KZT?
Can Kazakhstan users access derivatives?
Which banks and payment methods work?
Is the Bybit promo code valid in Kazakhstan?
```

### Tables

Use HTML tables for:

- product availability;
- payment methods;
- local currency;
- fees;
- limits;
- evidence;
- comparison.

### Visible evidence

Sources and limitations must be visible, not hidden only in structured data.

### Internal links

Link to:

- Country Hub;
- Country Ranking;
- Global Exchange Passport;
- P2P page;
- Local Currency page;
- Regulation page;
- relevant comparisons;
- alternatives.

---

## 19. Structured-data intent

Use only when eligible and visible:

- BreadcrumbList;
- Article / WebPage;
- Organization where appropriate;
- FAQPage only for genuine visible FAQs;
- Dataset for downloadable research packages where appropriate.

Do not use:

- fake AggregateRating;
- Product schema to misrepresent an exchange;
- hidden schema claims;
- structured data not visible to users.

---

## 20. Visual system

Use existing approved authorities:

- C1 Header;
- CBW Hero System;
- Exchange Logo Stage Standard;
- Promo-Code Module v2;
- status badges;
- evidence blocks;
- source cards;
- comparison tables;
- responsive tokens;
- footer;
- CBW trust badge.

Do not invent a new page-specific design language.

---

## 21. Responsive requirements

Real artboards:

```text
1440
1024
768
430
390
360
```

Mobile must retain:

- availability;
- checked date;
- confidence;
- local product status;
- promo eligibility;
- limitations;
- sources;
- alternatives.

No desktop-only factual content.

---

## 22. Publication gates

Mandatory:

- G01 Product intent
- G02 Research and evidence
- G03 Design-system consistency
- G04 Technical SEO
- G05 AI-answer structure
- G06 Editorial quality
- G07 Mobile parity
- G08 Accessibility
- G09 Performance
- G10 Structured-data honesty
- G11 Commercial/compliance safety
- G12 Preview/noindex QA
- G13 Owner approval

No page becomes public when a mandatory gate fails.

---

## 23. Freshness and recheck

Suggested field categories:

### Critical

- availability;
- registration;
- restrictions;
- derivatives;
- P2P;
- regulation;
- promo eligibility.

### Medium

- fees;
- limits;
- local payment methods;
- app availability;
- support.

### Slow

- exchange founding facts;
- global product descriptions;
- historical incidents.

Every critical fact must have:

- checked date;
- confidence;
- source;
- next recheck;
- stale behavior.

---

## 24. Publication readiness states

```text
RESEARCHING
EVIDENCE_COMPLETE
CONFLICTING
DESIGN_READY
NOINDEX_PREVIEW
OWNER_REVIEW
PUBLISHABLE
PUBLISHED
STALE
RECHECK_REQUIRED
ARCHIVED
```

---

## 25. Non-negotiable prohibitions

- no automatic public matrix generation;
- no ranking padding;
- no affiliate influence on ranking;
- no restricted CTA;
- no fake local bonus amount;
- no unsupported bank compatibility;
- no P2P = direct fiat assumption;
- no PoR = solvency claim;
- no legal certainty when evidence is unclear;
- no manual prose copying from research;
- no translation that changes facts;
- no forced GEO redirect;
- no essential SEO text inside images.

---

## 26. Implementation contract

Recommended renderer input:

```text
exchangeId
countryCode
languageCode
globalPassport
countryExchangeCell
countryProfile
offerRecord
evidencePackage
languageLayer
pageState
```

Renderer output:

```text
first-screen decision card
deep local passport
tables
sources
limitations
alternatives
FAQ
structured-data candidate
internal links
freshness state
```

---

## 27. Design deliverables

Create:

1. First-screen card desktop 1440
2. First-screen card mobile 390
3. Available state
4. Available-with-limits state
5. Restricted state
6. Conflicting state
7. Full deep-page desktop
8. Full deep-page mobile
9. Local currency matrix
10. Bank/payment matrix
11. Product availability matrix
12. Fees and limits
13. Regulation
14. PoR
15. Sources and limitations
16. Alternatives
17. FAQ
18. Language parity board
19. Research-to-page flow
20. Publication-gate board

---

## 28. Owner decision

This page family becomes the reusable standard for all future:

```text
Country × Exchange
```

combinations.

Examples:

- Bybit in Kazakhstan
- OKX in Nigeria
- MEXC in Türkiye
- Binance in Poland
- Bitget in Germany

New combinations must reuse this standard instead of creating new custom layouts.
