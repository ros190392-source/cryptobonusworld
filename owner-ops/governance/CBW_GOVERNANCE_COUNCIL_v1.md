# CryptoBonusWorld — Design, SEO, AI Search & Editorial Governance Council v1

**Status:** Owner governance standard
**Version:** 1.0
**Baseline:** 20 July 2026
**Project:** CryptoBonusWorld.com

## 1. Governing rule

CryptoBonusWorld is governed as one product system. No page family, hero, component, visual asset, GEO surface, article template, ranking, structured-data block, or commercial CTA may be designed or implemented in isolation.

Council roles are permanent review perspectives stored in project standards. They are not claims that ten external people participated.

Authority order:

1. Repository schemas/config/runtime contracts
2. Approved design, SEO, GEO, evidence and publication standards
3. Approved research and decisions in Git
4. Current official-source refresh reports
5. Owner-approved Claude Design prototypes
6. ChatGPT Project Sources
7. Previous chats and temporary notes

## 2. Permanent council roles

### R01 — Lead Product Designer
Owns full-site UX, page-family composition, information hierarchy, interaction priorities and responsive behavior.
Vetoes isolated visual concepts, unclear primary tasks, mobile omissions and inconsistent CTA hierarchy.
Refresh: monthly and after any major visual/owner-direction change.

### R02 — Design-System Architect
Owns tokens, component taxonomy, hero families, logo stages, promo-code component, state library and asset manifests.
Vetoes duplicate components, free-form colors/spacing, conflicting source-of-truth trees and unversioned asset replacement.
Refresh: after each approved component/token change and quarterly.

### R03 — Technical SEO Architect
Owns URL architecture, canonical/hreflang, sitemap, indexability gates, crawl controls, internal linking and structured-data honesty.
Vetoes thin mass generation, forced GEO redirects, faceted URL explosions, hidden schema and canonical/hreflang conflicts.
Refresh: weekly official Search watch, monthly Search Console review, immediately after core/spam/search-feature changes.

### R04 — AI Search / Answer Optimization Architect
Owns direct answers, answer blocks, fact tables, source/limitation placement, entity consistency and answer freshness.
Vetoes unsupported answers, hidden evidence, fabricated FAQ demand, duplicate "AI-optimized" pages and fictional scores.
Refresh: weekly AI Search watch and monthly cited-landing-page review.

### R05 — Editor-in-Chief / Content Architect
Owns page intent, content templates, originality, tone, editorial verdicts and maintenance burden.
Vetoes swapped-name templating, unverifiable superlatives, affiliate-led verdicts and stale content presented as current.
Refresh: monthly plus before indexability and after material evidence changes.

### R06 — GEO Research Lead
Owns authority maps, country × exchange research, language plans, evidence quality, conflicts, freshness and research gaps.
Vetoes local facts inferred from global pages, proxy/VPN dependency, unsupported "banned" claims and unmaintainable language versions.
Refresh: weekly due-fact queue, monthly GEO status, event-driven after regulator/terms changes.

### R07 — Mobile & Accessibility Lead
Owns mobile parity, keyboard use, focus, labels, touch targets, responsive tables and WCAG 2.2 alignment.
Vetoes desktop-only facts, inaccessible dropdowns, unlabeled controls, hidden mobile evidence and missing focus states.
Refresh: every page/component, quarterly standards review.

### R08 — Performance Engineer
Owns LCP, INP, CLS, page weight, image efficiency, hydration cost, font loading and stability.
Baseline targets: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 at the 75th percentile.
Vetoes giant mandatory mobile heroes, unstable layout and releases without performance QA.
Refresh: each release, monthly field data, quarterly budget review.

### R09 — Affiliate & Compliance Reviewer
Owns CTA eligibility, disclosure, offer truth, restricted/no-CTA behavior and commercial-data integrity.
Vetoes affiliate influence on ranking, unsupported bonus claims, CTA on restricted/conflicted exchanges and raw URL bypass of `/go/`.
Refresh: offer cadence, each commercial release, event-driven after partner/regulator changes.

### R10 — Frontend Implementation Architect
Owns implementation boundaries, component APIs, adapters, Design Lab, tests, migration and cleanup order.
Vetoes production-first implementation, duplicated business logic, cleanup before usage audit and undocumented route/schema changes.
Refresh: every task and quarterly architecture review.

## 3. Council review types

- C01 Page Family Review
- C02 Component Review
- C03 SEO / AI Search Review
- C04 GEO Publication Review
- C05 Visual Asset Review
- C06 Production Release Review
- C07 Search Trend Refresh

## 4. Knowledge freshness

States:

`CURRENT`, `DUE_SOON`, `STALE`, `SUPERSEDED`, `UNDER_REVIEW`, `CONFLICTING`

Every knowledge item records:
topic, role owner, source, source type, update date, retrieved date, last review, next review, freshness, impact area and required action.

## 5. Source tiers

### Tier A — Binding official
Google Search Central, Search Console, W3C/WAI, web.dev/Chrome, Schema.org, OpenAI developer docs, official framework/browser docs, regulators and exchanges.

### Tier B — Primary project/platform data
Search Console, CrUX/PageSpeed, analytics, logs, first-party tests and official datasets.

### Tier C — Reputable specialist analysis
Hypothesis and competitor context only; never overrides Tier A.

### Tier D — Community signals
Discovery only; never establishes a critical rule alone.

## 6. July 2026 watchlist

1. Google AI Overviews and AI Mode
2. Answer-oriented page structures
3. Preferred Sources
4. Core/spam/search-feature updates
5. Scaled-content and AI-content policies
6. Structured-data changes
7. Canonical, hreflang and multilingual guidance
8. Mobile-first rendering
9. Core Web Vitals
10. Google Images and Discover
11. WCAG 2.2; WCAG 3.0 draft/watch-only
12. OpenAI Deep Research, web search, file search and Responses API
13. IndexNow
14. Browser/Astro/TypeScript/image-format changes
15. Crypto affiliate/regulatory changes

## 7. Refresh cadence

### Weekly — Search & AI Intelligence Brief
Owners: R03, R04, R06, R09
Output: `reports/governance/weekly/YYYY-MM-DD-search-ai-weekly.md`

### Monthly — Product Health Review
All roles
Covers Search Console, indexing, query clusters, AI-feature referrals where measurable, CWV, accessibility, freshness, offers, GEO conflicts and design drift.
Output: `reports/governance/monthly/YYYY-MM-product-health.md`

### Quarterly — Standards Refresh
All roles
Output: `reports/governance/quarterly/YYYY-QN-standards-refresh.md`

### Event-driven triggers
Google core/spam update; AI Search feature change; structured-data change; regulator or exchange-terms change; major traffic/indexation drop; framework/browser change; owner architecture change.

## 8. Decision record

Every material decision stores:

decisionId, date, scope, problem, options, roles consulted, evidence, SEO impact, AI-answer impact, editorial impact, mobile/accessibility impact, performance impact, compliance impact, implementation impact, decision, rejected alternatives, owner approval, next review date and affected files/pages.

No "council approved" statement is valid without a stored decision record.

## 9. Release gates

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

Any failed mandatory gate blocks publication.

## 10. Automation boundary

Automation may monitor official sources, detect changes, prepare refresh reports, flag affected standards/pages and open a proposed pull request.

Automation may not silently replace standards, publish pages, change rankings, change affiliate facts, make legal conclusions or deploy production.

Lifecycle:

`monitor → research → proposed change → council review → owner decision → repository update → preview QA → controlled implementation`

## 11. Required repository package

```text
owner-ops/governance/
  CBW_GOVERNANCE_COUNCIL_v1.md
  council-registry.json
  knowledge-source-registry.json
  refresh-policy.json
  decision-record.schema.json
  review-gates.json

reports/governance/
  weekly/
  monthly/
  quarterly/
  event-driven/
```

ChatGPT Project Sources keep current summaries; Git keeps full history.

## 12. Official baseline sources

- Google Search Central AI features / AI optimization / spam policies
- Google multilingual, localized, locale-adaptive and structured-data guidance
- Google mobile-first and image guidance
- web.dev Core Web Vitals
- W3C WCAG 2.2 and WCAG 3.0 draft watch
- OpenAI Deep Research, web search and file search docs
- IndexNow official documentation

---

## Relationship to existing authorities (non-duplication note)

This council **does not create a competing source of truth.** Per §1 authority order, the repository's machine/runtime contracts and approved standards remain authoritative — including [schemas/geo/**](../../schemas/geo), [config/geo/**](../../config/geo), [owner-ops/design-system/CBW_SITE_DESIGN_SYSTEM_v2.md](../design-system/CBW_SITE_DESIGN_SYSTEM_v2.md), [docs/geo-research/STANDARDS-RECONCILIATION-v1.md](../../docs/geo-research/STANDARDS-RECONCILIATION-v1.md), and [docs/geo-research/NO-PROXY-RESEARCH-MODE-v1.md](../../docs/geo-research/NO-PROXY-RESEARCH-MODE-v1.md). Automation is bounded by §10 and may never publish, deploy, or change rankings/affiliate facts. This document authorizes no production, page, route, token, component, affiliate, GEO, or ranking change.
