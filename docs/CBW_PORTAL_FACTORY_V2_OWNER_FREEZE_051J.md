# CryptoBonusWorld Portal Factory v2 — Owner Freeze 051J

Status: **FOUNDATION FROZEN FOR CONTROLLED PUBLIC SPLIT / NO PUBLIC AUTHORITY**  
Owner issue: #153  
Working draft: PR #139  
Current product head at freeze creation: `0e181252b8321b142818c471df5fa3ec86d9d5c7`

## 1. Owner decision

The Portal Factory v2 review foundation is accepted as the basis for controlled implementation.

Accepted:

- the existing CryptoBonusWorld visual identity and the v2 design-system direction;
- Homepage v2 information architecture with one canonical Top-10;
- separate country and language controls;
- country hub, ranking-readiness, market-passport, comparative-matrix and ContentPackage page families;
- SourcePacket → NormalizedClaim → MarketProfile → RankingSnapshot → ContentPackage flow;
- country and locale as separate dimensions;
- visible verified/partial/missing/conflicting/stale states;
- immutable fact parity between localized views;
- affiliate weight zero in ranking methodology;
- raw parser output prohibited from direct publication.

This decision does **not** approve the current candidate claims as public facts and does not authorize PR #139 to merge as one production change.

## 2. Current Kazakhstan pilot truth

### Profiles

| Exchange | Profile state | Availability | Offer state | Ranking state |
|---|---|---|---|---|
| Binance | validated | limited | under review | candidate, no position |
| Bybit | validated | available | under review | candidate, no position |
| OKX | validated conflict-preserving | unknown | under review | excluded |

### Draft ranking state

- methodology: `cbw-kz-review-0.1`;
- methodology use: frozen for draft snapshot only;
- snapshot: `ranking:kz:owner-review-draft:2026-07-31`;
- approval: `draft`;
- ranked rows: `0`;
- under review: Binance, Bybit;
- excluded: OKX;
- owner-approved non-empty snapshot: absent;
- public indexability: off.

### Comparative evidence

- matrix: `matrix:kz:ordering-evidence:051h`;
- cells: 15;
- mapped: 4;
- partial: 7;
- missing: 2;
- conflicting: 2;
- aggregate scoring: off;
- ordering ready: no.

### Content packages

Four draft packages exist:

1. Kazakhstan country hub;
2. Binance × Kazakhstan passport;
3. Bybit × Kazakhstan passport;
4. OKX × Kazakhstan conflict-preserving passport.

All retain:

- `approvedClaimIds=[]`;
- no approved locale;
- no recommendation authority;
- no ranking-row authority;
- no affiliate CTA authority;
- no publication or indexability authority.

## 3. Frozen future route shapes

These route families are accepted as URL shapes only:

```text
/countries/{country}/
/countries/{country}/exchanges/
/countries/{country}/exchanges/{exchange}/
/{locale}/countries/{country}/...
```

No route listed above is created, published or indexed by this freeze.

### Kazakhstan route states

| Route | Current state | Next controlled authorization |
|---|---|---|
| `/countries/kazakhstan/` | not created | noindex country-hub preview PR |
| `/countries/kazakhstan/exchanges/` | not created | blocked until non-empty owner-approved ranking snapshot |
| `/countries/kazakhstan/exchanges/binance/` | not created | noindex passport preview PR, no CTA |
| `/countries/kazakhstan/exchanges/bybit/` | not created | noindex passport preview PR, no CTA |
| `/countries/kazakhstan/exchanges/okx/` | not created | conflict-preserving noindex passport, no recommendation/CTA |
| `/{locale}/countries/kazakhstan/...` | blocked | i18n, canonical, hreflang and locale-coverage approval |

## 4. Controlled implementation split

The all-in-one design PR must not become one production merge. Work is split into independent scopes.

### Split 1 — Homepage v2 composition

- modify public homepage composition only;
- keep exactly one governed Top-10;
- preserve current offer records and `/go/` bindings;
- country discovery contains no exchange ranking rows;
- fresh desktop/tablet/mobile QA and controlled deploy required.

### Split 2 — Reusable portal components and contracts

- extract status, route guard, evidence and data-contract components;
- no public country route;
- no production fact or affiliate mutation.

### Split 3 — Kazakhstan country-hub preview

- create as noindex preview first;
- consume draft ContentPackage candidates without approving them;
- no numbered ranking;
- no affiliate CTA.

### Split 4 — Kazakhstan market-passport previews

- create Binance, Bybit and OKX previews;
- preserve each MarketProfile state;
- OKX remains conflict-preserving and non-recommended;
- no local CTA.

### Split 5 — i18n foundation

- freeze URL prefix and English no-prefix behavior;
- implement canonical/hreflang/fallback tests;
- locale activation remains separately owner-gated.

### Split 6 — Research ingestion adapters

- map parser output into candidate SourcePackets and claims;
- no automatic approval;
- no automatic ranking, CTA, publication, merge or deploy.

## 5. Non-negotiable publication gates

A future public page requires all applicable gates:

1. current source and claim validation;
2. explicit factual approval;
3. approved locale coverage;
4. canonical/hreflang/schema/sitemap validation;
5. affiliate boundary validation;
6. browser QA at desktop/tablet/mobile;
7. explicit route/indexability authorization;
8. controlled merge and deploy authorization;
9. fresh live verification after deployment.

A future country ranking additionally requires:

- comparable ordering evidence;
- a non-empty RankingSnapshot;
- rationale claim IDs for every row;
- owner approver;
- no unresolved conflict in a ranked profile.

## 6. Explicitly not authorized

- merge of PR #139;
- public Kazakhstan country routes;
- localized public routes;
- numbered Kazakhstan ranking;
- aggregate ranking score;
- Kazakhstan affiliate CTA;
- approval of candidate claims;
- sitemap/indexability changes;
- deployment.

## 7. Freeze result

The design and architecture exploration phase has a stable review result. The next work must proceed through the controlled split above rather than continuing to enlarge the all-in-one draft indefinitely.
