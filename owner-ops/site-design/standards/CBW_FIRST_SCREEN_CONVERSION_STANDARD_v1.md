# CBW First Screen Conversion Standard — v1

**Status:** OWNER_APPROVED_DESIGN_AUTHORITY (owner-approved; promoted by `CBW-SITE-TEMPLATE-ARCHITECTURE-AUTHORITY-001-COMMIT`)
**Task:** `CBW-SITE-TEMPLATE-ARCHITECTURE-AUTHORITY-001` · Project: CryptoBonusWorld · Date: 2026-07-22
**Approved prototype:** `/__design/exchange-review-template/` @ commit `1de294d1a389f966c3ffef7d178f454d39d33ab0` (branch `feat/cbw-exchange-review-template-v1`)
**Companion:** [CBW_FIRST_SCREEN_CONVERSION_STANDARD_v1.json](CBW_FIRST_SCREEN_CONVERSION_STANDARD_v1.json)
**Relationship:** extends [CBW_SITE_DESIGN_SYSTEM_v2](../../design-system/CBW_SITE_DESIGN_SYSTEM_v2.md) (visual DNA, tokens, slot systems) and defers to Market Intelligence authorities for all factual eligibility. This document authorizes design standards only — no production implementation.

---

## 1. Scope

Applies to **every commercial exchange page** where a promo code and registration CTA are authorized by verified country-level evidence: exchange reviews, exchange × country pages, referral/promo pages, comparisons, country pages, homepage commercial rows, restricted/alternatives pages, and commercial guide modules. It does not apply to methodology/trust pages or purely informational content. It applies to prototypes (mock mode) and, after separate migration authorization, to production templates.

**Owner rule (verbatim intent):** where an offer is eligible and verified for the relevant user or country context, the complete promo-code conversion surface must fit inside the first viewport on both desktop and mobile. Never display a global promotion as locally eligible without country-level evidence.

## 2. Terminology

- **First screen / first viewport** — the visible webpage viewport at page load, before any scroll.
- **Primary conversion surface** — page identity/H1 + availability status + concise verdict + complete promo code + complete Copy control + complete registration/claim CTA + required eligibility or limitation notice.
- **Complete** — the element's full box, including its bottom edge, is inside the viewport; partial visibility does not pass.
- **Availability states** — `AVAILABLE`, `AVAILABLE_WITH_LIMITS`, `RESTRICTED`, `UNKNOWN`, `UNDER_REVIEW` (aligned with the exchange-market-cell schema enum).
- **referralCompatibilityVerified** — evidence-backed boolean: the referral code/route is verified compatible for the relevant country context.
- **ExchangeOfferBlock** — the single shared conversion component (top FULL / bottom COMPACT); see §11 and the Site Template Architecture authority.
- **Rectangular wordmark slot** — the ExchangePromoLogoSlot system (fixed slot geometry; wordmark never cropped square, never stretched).

## 3. Viewport measurement

The first screen is the visible webpage viewport **excluding browser chrome but including**:

1. the site header;
2. any announcement bar;
3. any in-flow country selector;
4. any in-flow page controls;
5. the complete primary commercial CTA.

Rules:

- Prototype-only debug controls must **not** consume document-flow height (float/fixed placement).
- Fixed or sticky UI must **not** cover required conversion elements.
- The **complete bottom edge of the primary CTA must remain visible** inside the viewport.
- Partially visible buttons do **not** pass.
- Passing must not be achieved by shrinking text below readable sizes.
- Passing must not be achieved by hiding required eligibility warnings.

## 4. Required first-screen elements (eligible offer)

1. page identity or H1;
2. availability status;
3. concise verdict;
4. complete promo code;
5. complete Copy button;
6. complete registration or claim CTA (bottom edge inside viewport);
7. required eligibility or limitation notice.

## 5. State-specific behavior

### AVAILABLE
First screen must contain: H1/page identity · **green** availability state · concise verdict · complete promo code · complete Copy button · complete registration/Claim Bonus CTA · eligibility note.

### AVAILABLE_WITH_LIMITS + referralCompatibilityVerified = true
First screen must contain: H1/page identity · availability state · **visible amber limitation notice** · concise verdict · complete promo code · complete Copy button · complete CTA · limitation or eligibility note.

### AVAILABLE_WITH_LIMITS + referralCompatibilityVerified = false
First screen must contain: H1/page identity · visible amber limitation notice · concise verdict · **no promo code** · **no Copy button** · **no Claim Bonus wording** · a **Check Eligibility** or **Visit Exchange** action where permitted · an explicit statement that local referral eligibility is not verified.

### RESTRICTED
First screen must contain: H1/exchange identity · **red** restricted state · country-specific restriction label (e.g. "Restricted in Kazakhstan") · concise restriction reason · **View Available Alternatives** action when alternatives exist.
First screen must **not** contain: promo code · Copy button · Claim Bonus button · registration CTA · affiliate-style CTA · any claim that the site is technically inaccessible unless separately verified.

### UNKNOWN / UNDER_REVIEW
First screen must contain: neutral status · concise explanation · **no locally eligible promo claim** · **no Claim Bonus CTA** · a **Check Availability** or **View Verified Alternatives** action where appropriate.

## 6. Page-family-specific rules (summary)

Detailed per-family rules live in [CBW_SITE_TEMPLATE_ARCHITECTURE_v1](../architecture/CBW_SITE_TEMPLATE_ARCHITECTURE_v1.md). Summary: exchange review & referral/promo — code + registration CTA dominate the eligible first screen; exchange × country — country-specific status/eligibility only, never global-as-local; comparison — leading eligible offers in first screen, restricted winner never monetized; homepage — compact Top-3 eligible rows (mobile: first two); country page — country verdict + top eligible rows; directory — search/filter primary, codes in result rows; guide — instructional content primary, one relevant eligible offer allowed; restricted/alternatives — restriction state + eligible alternatives; methodology — no promo requirement.

## 7. Responsive validation matrix

**Required (every one must pass):**
| Class | Viewports |
|---|---|
| Desktop | 1440×900 · 1366×768 · 1280×720 |
| Mobile | 390×844 · 360×800 · 320×700 |

**Optional additional:** 768×1024 tablet · 1280×900 · 1440×1000.

Per-viewport pass conditions: complete promo code visible (when state-required) · Copy control visible · complete primary CTA visible with bottom edge inside the viewport · no vertical scrolling required to discover the CTA · no horizontal overflow · header included in the measurement · state-required notice visible.

**Prototype proof:** the approved exchange-review prototype passes 24/24 (4 state configurations × 6 required viewports); worst margin CTA bottom 650px @ 320×700.

## 8. Commercial evidence gates

**Promo code may be shown as locally eligible only when ALL hold:**
1. exchange availability is not RESTRICTED;
2. registration is eligible;
3. referral compatibility is verified;
4. the offer is current;
5. country applicability is verified;
6. the route and code are authorized;
7. publication is authorized.

**Registration / Claim Bonus CTA may be shown only when ALL hold:**
1. registration eligibility is confirmed;
2. the offer action is permitted;
3. the route is authorized;
4. no conflicting restriction blocks the action.

**A repository route or stored code is an implementation fact only — never country-eligibility evidence by itself.**

**Never show:** an expired offer as current · a global maximum as locally applicable without evidence · a promo code for a restricted exchange · a registration CTA for a restricted exchange · a claim CTA when referral compatibility is unverified · a global promotion as locally verified without evidence.

## 9. Accessibility and usability requirements

- CTA touch target ≥ 44 CSS px high; Copy button ≥ 44 CSS px high on mobile;
- no horizontal page overflow; no clipped logo, promo code, status label, CTA label, limitation or restriction notice;
- readable text without artificial scale reduction;
- visible focus state; keyboard-operable Copy and CTA controls;
- status must not rely on color alone (badge text + dot + label);
- restrained hero height; no oversized empty decorative area above the offer;
- no popup required to access the main offer; no obstructive sticky banner hiding page content.

## 10. Failure conditions

A page fails this standard when any of the following occurs at any required viewport: CTA bottom edge below the fold · promo code or Copy control partially clipped or below the fold when state-required · required amber/red notice below the fold or hidden · horizontal overflow · required element hidden behind fixed/sticky UI · text shrunk below readable size to pass · eligibility warning suppressed to pass · promo/claim controls rendered in a state that forbids them · touch targets under 44px · a global offer presented as locally eligible without evidence.

## 11. Top and bottom offer rule (one shared system)

One shared component concept — **ExchangeOfferBlock** — with variants `placement: top | bottom` and `presentation: FULL | COMPACT`. **The same commercial state logic must control both instances** (no independent drift).

- **Top block:** the complete primary conversion surface; must pass this standard; may include richer verdict and trust information.
- **Bottom block:** same rectangular exchange wordmark system · same status and eligibility logic · same promo and CTA authorization · compact layout · a deliberate closing conversion block — never a separate visual or factual system.
- **Restricted state removes promo and registration actions from both blocks.**

Prototype-local embodiment: `src/components/design-preview/ExchangeOfferBlock.astro` @ `1de294d…`.

## 12. Implementation boundaries and owner approval

- This standard authorizes **design behavior only**. It does not create or modify production routes, pages, components, data bindings, affiliate routes, sitemap, canonical or robots behavior.
- Prototypes implementing it must be noindex/nofollow, sitemap-absent, mock-data, and free of real affiliate navigation.
- Production adoption requires, per page: separate owner migration authorization · verified data binding (Market Intelligence / approved adapters) · production QA · deploy authorization.
- Amendments require a new owner-approved version (v2+); this document is an owner-approved design authority.

**Governance gates:** DESIGN_PROTOTYPE_AUTHORIZED = true; PRODUCTION_MIGRATION_AUTHORIZED, PRODUCTION_PAGE_CHANGE_AUTHORIZED, PRODUCTION_COMPONENT_CHANGE_AUTHORIZED, PRODUCTION_DATA_BINDING_AUTHORIZED, AFFILIATE_ROUTE_ACTIVATION_AUTHORIZED, PUBLICATION_AUTHORIZED, DEPLOY_AUTHORIZED = all false.

**NEXT_TASK:** `CBW-HOMEPAGE-TEMPLATE-PROTOTYPE-001` (design branch only · isolated noindex prototype · mock data only · no production integration · no canonical Market Intelligence binding · no real affiliate navigation · no merge · no deployment).
