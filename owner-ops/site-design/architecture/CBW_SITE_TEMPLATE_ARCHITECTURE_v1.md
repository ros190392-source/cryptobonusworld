# CBW Site Template Architecture — v1

**Status:** OWNER_APPROVED_DESIGN_AUTHORITY (owner-approved; promoted by `CBW-SITE-TEMPLATE-ARCHITECTURE-AUTHORITY-001-COMMIT`)
**Task:** `CBW-SITE-TEMPLATE-ARCHITECTURE-AUTHORITY-001` · Project: CryptoBonusWorld · Date: 2026-07-22
**Approved prototype:** exchange-review template v2 @ commit `1de294d1a389f966c3ffef7d178f454d39d33ab0` (branch `feat/cbw-exchange-review-template-v1`, route `/__design/exchange-review-template/`)
**Companion:** [CBW_SITE_TEMPLATE_ARCHITECTURE_v1.json](CBW_SITE_TEMPLATE_ARCHITECTURE_v1.json)
**Relationship:** applies [CBW_FIRST_SCREEN_CONVERSION_STANDARD_v1](../standards/CBW_FIRST_SCREEN_CONVERSION_STANDARD_v1.md) per page family; extends [CBW_SITE_DESIGN_SYSTEM_v2](../../design-system/CBW_SITE_DESIGN_SYSTEM_v2.md); defers to Market Intelligence authorities for factual eligibility. **Architecture and design standards only — no production implementation is authorized.** URL patterns marked *(proposed)* require separate owner routing approval; existing live patterns are recorded as-is.

---

## 1. Page families

### Family 1 — Homepage
| Field | Definition |
|---|---|
| Purpose | Global or country-resolved discovery of the best eligible exchanges and promo codes. |
| User intent | "Which exchange should I use and what code do I enter?" |
| URL pattern | `/` (live) |
| Primary data source | Owner-approved offer registry + canonical Market Intelligence states (country-resolved when available). |
| First-screen structure | **Desktop aims to show:** brand/header · country context · H1 + short value proposition · compact Top-3 eligible exchange rows with status, promo code, Copy and registration CTA per authorized row. **Mobile aims to show:** country context · H1 · at least the first two compact eligible rows with complete code, Copy and CTA per visible authorized row. |
| First-screen conversion requirement | First Screen Standard applies per authorized row; no oversized cards that push commercial rows out of the first screen. |
| Main body sections | Full eligible ranking · category/finder modules · trust strip · methodology link · FAQ. |
| Bottom conversion behavior | Optional compact closing action (directory/finder); no forced full offer block. |
| Availability-state behavior | Restricted exchanges never appear as claimable recommendations; fewer verified eligible exchanges → fewer rows; the list is never filled with unverified offers. |
| Mobile behavior | First two eligible rows within the first screen target; 44px+ touch targets; no horizontal overflow. |
| SEO/indexing posture | Indexable; brand + category head terms; canonical `/`. |
| Required components | SiteHeader, CountryContext, ExchangeRankingRow, ExchangeStatusBadge, PromoCodeControl, RegistrationCTA, LastChecked, SiteFooter. |
| Prohibited behavior | Oversized hero cards displacing commercial rows · restricted exchanges as claimable recommendations · unverified offers filling rows · global promos shown as locally eligible without evidence. |

### Family 2 — Country page
| Field | Definition |
|---|---|
| Purpose | Country-specific exchange availability, ranking, restrictions and local payment context. |
| User intent | "Which exchanges work in my country, and which codes are valid here?" |
| URL pattern | `/countries/{country}/` *(proposed — final pattern owner-gated)* |
| Primary data source | Canonical Market Intelligence country cells + owner-approved country evidence (never staging/RECOVERED packages). |
| First-screen structure | Country identity · current evidence status · short country verdict · compact recommended exchange rows. **Desktop target:** Top-3 eligible rows with complete permitted conversion controls. **Mobile target:** first two eligible rows with complete permitted controls. |
| First-screen conversion requirement | First Screen Standard per eligible row; country verdict always precedes conversion rows. |
| Main body sections | Recommended ranking · **separate compact sections:** Available but not currently recommended · Unavailable or restricted · Under review · local payment context · evidence summary · FAQ. |
| Bottom conversion behavior | Compact offer of the leading eligible exchange, or alternatives module when none eligible. |
| Availability-state behavior | Restricted exchanges are **never mixed into the recommended ranking**; each row renders its canonical state. |
| Mobile behavior | Verdict + first two eligible rows in first-screen target; sections collapse cleanly. |
| SEO/indexing posture | Indexable only after country evidence and publication are owner-approved (e.g. Kazakhstan currently publication-blocked). |
| Required components | CountryContext, EvidenceSummary, ExchangeRankingRow, ExchangeStatusBadge, PromoCodeControl, RegistrationCTA, RestrictionNotice, AlternativesList, LastChecked. |
| Prohibited behavior | Restricted exchanges in the recommended ranking · claim controls on restricted rows · publication before owner authorization · global-as-local promo claims. |

### Family 3 — Exchange directory
| Field | Definition |
|---|---|
| Purpose | Browse and filter exchanges. |
| User intent | "Show me the options; let me filter by what matters to me." |
| URL pattern | `/exchanges/` (live) |
| Primary data source | Offer registry + canonical MI availability badges. |
| First-screen structure | Directory H1 · country or availability context · search/filter controls · **one** compact recommended/featured eligible offer row when evidence allows. |
| First-screen conversion requirement | Search/filter primacy; the single featured row follows the First Screen Standard; **no forced promo offer when no authorized featured exchange exists.** |
| Main body sections | Result rows (status, compact code chip, CTA per eligible row) · filter facets · methodology link. |
| Bottom conversion behavior | None forced. |
| Availability-state behavior | Results clearly distinguish **available · available with limits · restricted · under review**; restricted rows carry no claim controls. |
| Mobile behavior | Filters collapse; one row per line; codes remain copyable; no overflow. |
| SEO/indexing posture | Indexable hub. |
| Required components | ExchangeRankingRow, ExchangeStatusBadge, PromoCodeControl, RegistrationCTA, CountryContext, LastChecked. |
| Prohibited behavior | Large unrelated promo hero displacing search · forced featured offer without evidence · undistinguished availability states. |

### Family 4 — Exchange review
| Field | Definition |
|---|---|
| Purpose | Full exchange evaluation + authorized conversion. **The approved prototype (`1de294d…`) is the authority reference.** |
| User intent | "Is this exchange good, and what's the code?" |
| URL pattern | `/{exchange}/` (live pattern, e.g. `/bybit/`) |
| Primary data source | Offer registry + canonical MI state + dated evidence registry. |
| First-screen structure | **Eligible states:** exchange identity · H1 · status · verdict · promo code · Copy · registration/Claim Bonus CTA · eligibility note (per prototype). Restricted: red state + reason + View Available Alternatives. |
| First-screen conversion requirement | Full First Screen Standard, all state rules, all six required viewports. |
| Main body sections | Compact facts table · quick verdict · availability & restrictions · main products · fees · promo-code eligibility · security & verification · advantages & limitations · FAQ (prototype structure). |
| Bottom conversion behavior | **Compact version of the same ExchangeOfferBlock** — same rectangular logo, same state logic, same authorization rules. |
| Availability-state behavior | AVAILABLE / AVAILABLE_WITH_LIMITS (± referralCompatibilityVerified) / RESTRICTED per the standard; both blocks always in the same state. |
| Mobile behavior | Prototype-proven: 24/24 first-screen matrix; tables scroll in their own wrappers. |
| SEO/indexing posture | Indexable "{exchange} referral code / review" head terms; existing six live pages remain frozen until migration authorization. |
| Required components | ExchangeOfferBlock, ExchangeWordmarkSlot, ExchangeStatusBadge, PromoCodeControl, RegistrationCTA, EligibilityNotice, LimitationNotice, RestrictionNotice, ProductAvailabilityTable, FeesTable, ProsCons, FAQ, EvidenceSummary, LastChecked. |
| Prohibited behavior | Unverified bonus claims · promo/claim controls in restricted state · top/bottom block drift · technical-inaccessibility claims. |

### Family 5 — Exchange × Country page
| Field | Definition |
|---|---|
| Purpose | Explain whether a specific exchange is suitable and available in a specific country. |
| User intent | "Does {exchange} work in {country}; is the code valid here?" |
| URL pattern | `/{exchange}/{country}/` *(proposed — owner-gated)* |
| Primary data source | Canonical MI exchange×country cell (strongest MI consumer); dated evidence; never staging or RECOVERED/UNVERIFIED packages. |
| First-screen structure | **Eligible:** exchange + country identity · exact local availability · local verdict · locally verified promo code · Copy · permitted registration CTA · limitations. **Restricted:** red local restriction state · reason · evidence date · View Available Alternatives · no promo · no registration CTA. |
| First-screen conversion requirement | First Screen Standard with country-scoped evidence gate; **global exchange availability never overrides a country-specific restriction.** |
| Main body sections | Local availability matrix · registration/KYC detail · products locally · payment rails · restriction evidence · alternatives · FAQ. |
| Bottom conversion behavior | ExchangeOfferBlock COMPACT (eligible) or alternatives module (restricted). |
| Availability-state behavior | Driven solely by the canonical country cell (e.g. MEXC×KZ RESTRICTED → restriction-only presentation). |
| Mobile behavior | Standard viewports; local verdict + state-correct action in first screen. |
| SEO/indexing posture | Indexable only when that country×exchange publication is owner-authorized; restriction-only content permitted only when authorized. |
| Required components | ExchangeOfferBlock, CountryContext, ExchangeStatusBadge, RestrictionNotice, EvidenceSummary, AlternativesList, ProductAvailabilityTable, ConflictNotice, LastChecked. |
| Prohibited behavior | Global promo shown as locally eligible without evidence · rendering from staging/unverified data · overriding country restriction with global state · claim controls in restricted state. |

### Family 6 — Referral / promo-code page
| Field | Definition |
|---|---|
| Purpose | Answer code, eligibility, reward and registration questions directly. |
| User intent | "Give me the working code now." |
| URL pattern | `/promo-codes/{exchange}/` *(proposed — owner-gated; hub `/promo-codes/` live)* |
| Primary data source | Offer registry + canonical MI eligibility + dated offer evidence. |
| First-screen structure | Exact exchange and country scope · current promo status · complete code · Copy · registration CTA · key eligibility condition · last-checked context. **No large editorial introduction before the promo controls.** |
| First-screen conversion requirement | Code + registration CTA are the dominant first-screen action (First Screen Standard). |
| Main body sections | How to apply the code · reward structure · eligibility conditions · terms warnings · FAQ. |
| Bottom conversion behavior | ExchangeOfferBlock COMPACT repeat. |
| Availability-state behavior | **Country compatibility unverified → hide the claimable code, show explicit eligibility warning, use Check Eligibility instead of Claim Bonus.** Restricted → no code/claim at all. |
| Mobile behavior | Code + CTA fully inside first screen at all required viewports. |
| SEO/indexing posture | Indexable "{exchange} promo code" head terms. |
| Required components | ExchangeOfferBlock, PromoCodeControl, RegistrationCTA, EligibilityNotice, LastChecked, FAQ. |
| Prohibited behavior | Editorial wall before controls · expired offer as current · combined/unverified reward amounts · claim language without verified compatibility. |

### Family 7 — Exchange comparison page
| Field | Definition |
|---|---|
| Purpose | Compare two or more exchanges. |
| User intent | "A vs B — which should I pick and which code do I use?" |
| URL pattern | `/compare/{a}-vs-{b}/` *(proposed — owner-gated)* |
| Primary data source | Canonical MI states + offer registry for each compared exchange. |
| First-screen structure | **Two-exchange:** both compact comparison offers in the first screen where layout allows without reducing readability; each eligible offer may show status, promo code, Copy, registration CTA. **Three+:** desktop target first three compact offers; mobile target first two. |
| First-screen conversion requirement | First Screen Standard per eligible offer; readability never sacrificed for density. |
| Main body sections | Comparison verdict · dimension-by-dimension table · fees · products · per-exchange offer detail · FAQ. |
| Bottom conversion behavior | COMPACT offer of the eligible winner only. |
| Availability-state behavior | **A restricted comparison winner never receives a promo code, claim CTA or registration CTA; a restricted exchange is never selected as a monetized winner.** |
| Mobile behavior | Comparison table scrolls in its own container; first two compact offers in first-screen target. |
| SEO/indexing posture | Indexable "X vs Y" terms. |
| Required components | ExchangeComparisonOffer, ExchangeStatusBadge, PromoCodeControl, RegistrationCTA, FeesTable, ProsCons, FAQ, LastChecked. |
| Prohibited behavior | Monetizing a restricted winner · claim controls on restricted columns · unreadable compression to fit offers. |

### Family 8 — Guide / how-to page
| Field | Definition |
|---|---|
| Purpose | Complete a user task (registration, purchase, deposit, withdrawal, P2P operation). |
| User intent | "Show me how to do this, step by step." |
| URL pattern | `/guides/{slug}/` *(proposed revival — owner-gated; legacy guides retired)* |
| Primary data source | Editorial steps + platform evidence screenshots; offer registry/MI for any embedded offer. |
| First-screen structure | Instructional title + first useful step remain primary. A **commercial guide** may include one recommended eligible exchange offer in the first screen when directly relevant to the task, with complete code and CTA when authorized. |
| First-screen conversion requirement | Applies only to the embedded offer module when present; **neutral/educational guides are never forced to display a promo code.** |
| Main body sections | Clearly separated: informational steps · commercial recommendation · eligibility warning · platform UI screenshots · country restrictions. |
| Bottom conversion behavior | Optional COMPACT offer when task-relevant. |
| Availability-state behavior | Embedded modules obey full state rules; restricted exchanges get no claim language anywhere in the guide. |
| Mobile behavior | Step 1 never displaced below the fold by a conversion element. |
| SEO/indexing posture | Indexable informational terms. |
| Required components | ExchangeOfferBlock (optional COMPACT), EligibilityNotice, EvidenceSummary, FAQ, LastChecked. |
| Prohibited behavior | Forced promo in neutral guides · commercial module displacing the first step · mixing steps with commercial claims. |

### Family 9 — Restricted exchange / alternatives page
| Field | Definition |
|---|---|
| Purpose | Explain why an exchange is restricted and provide eligible alternatives. |
| User intent | "This exchange doesn't work for me — why, and what should I use instead?" |
| URL pattern | `/{exchange}/{country}/alternatives/` *(proposed — owner-gated)* |
| Primary data source | Canonical MI restriction evidence + eligible-alternative states. |
| First-screen structure | Restricted exchange identity · red restriction state · concise reason · evidence/recheck context · eligible alternatives. **Desktop target:** first three compact eligible alternatives where available. **Mobile target:** first two. |
| First-screen conversion requirement | Conversion belongs to the **alternatives**: authorized alternatives may show promo code, Copy and registration CTA; **the restricted exchange never shows those controls.** |
| Main body sections | Restriction explanation with dated evidence · what the restriction does/doesn't mean (no technical-inaccessibility claim unless separately verified) · full alternatives list · FAQ. |
| Bottom conversion behavior | Alternatives module (COMPACT offers of eligible exchanges). |
| Availability-state behavior | Restricted presentation per the standard; each alternative renders its own canonical state. |
| Mobile behavior | Restriction reason + first alternative visible early; two alternatives in first-screen target. |
| SEO/indexing posture | Indexable only when restriction-only publication is owner-authorized for that exchange×country. |
| Required components | RestrictionNotice, EvidenceSummary, AlternativesList, ExchangeStatusBadge, PromoCodeControl, RegistrationCTA, ConflictNotice, LastChecked. |
| Prohibited behavior | Any promo/claim/registration control for the restricted exchange · technical-inaccessibility claims · alternatives without verified eligibility. |

### Family 10 — Methodology / verification page
| Field | Definition |
|---|---|
| Purpose | Explain evidence, ranking, verification and update methodology. |
| User intent | "Can I trust this site?" |
| URL pattern | `/methodology/` (live; related trust pages `/how-we-verify/`-class) |
| Primary data source | Editorial methodology + verification-process facts. |
| First-screen structure | Methodology H1 · concise trust statement · verification principles · last-updated or process status. |
| First-screen conversion requirement | **None. No promo code is required; commercial conversion controls are never forced into methodology pages.** |
| Main body sections | Evidence standards · ranking method · verification cadence · update policy · conflict handling. |
| Bottom conversion behavior | None forced; a soft directory link is permitted. |
| Availability-state behavior | Explains the state system editorially; renders no commercial state. |
| Mobile behavior | Readable article layout. |
| SEO/indexing posture | Indexable trust page. |
| Required components | SourceList, EvidenceSummary, LastChecked, FAQ. |
| Prohibited behavior | Forced conversion controls · commercial links blended into methodology claims (must remain clearly separated). |

---

## 2. Shared component architecture

**Planned reusable component families (23):** SiteHeader · SiteFooter · ExchangeWordmarkSlot · ExchangeStatusBadge · ExchangeOfferBlock · PromoCodeControl · RegistrationCTA · EligibilityNotice · LimitationNotice · RestrictionNotice · ExchangeRankingRow · ExchangeComparisonOffer · AlternativesList · CountryContext · EvidenceSummary · ProductAvailabilityTable · FeesTable · ProsCons · FAQ · SourceList · ConflictNotice · LastChecked · MobileConversionLayout.

**Component ownership rules:**
1. Design/presentation components must not decide factual eligibility.
2. Market Intelligence or approved data adapters supply state.
3. Page templates render approved state.
4. Affiliate routes remain separately authorized.
5. No component may infer country eligibility from a stored code or URL.

## 3. Data and design boundary

| Layer | Responsibilities |
|---|---|
| **Market Intelligence** | Determines evidence-backed status · product availability · conflicts · confidence · publication and eligibility boundaries. |
| **Offer registry** | Stores route and code implementation facts; does **not** prove country eligibility. |
| **Design system** | Renders the supplied approved state; does not upgrade status, invent bonuses, or resolve evidence conflicts. |
| **Production page** | Consumes only approved data; requires separate migration authorization. |
| **Prototype** | May use mock data; must visibly identify mock state; must not use real affiliate navigation. |

## 4. SEO and routing boundary

- **Prototype routes:** noindex,nofollow · absent from sitemap · absent from production navigation · no real affiliate navigation.
- **Production routes:** require separate owner approval · canonical and sitemap decisions · verified data binding · production QA · deploy authorization.
- **This authority does not create production routes.**

## 5. Rollout order (approved prototype sequence)

1. **Exchange review — completed and approved in design branch (`1de294d…`).**
2. Homepage → 3. Country page → 4. Exchange directory → 5. Exchange × Country → 6. Comparison → 7. Referral / promo page → 8. Guide → 9. Restricted alternatives → 10. Methodology.

Every page-family prototype must be: isolated · noindex · mock-data-based · visually reviewed · responsive-tested · owner-approved · committed to a design branch **before** production migration consideration.

## 6. Design governance gates

```
DESIGN_PROTOTYPE_AUTHORIZED:            true
PRODUCTION_MIGRATION_AUTHORIZED:        false
PRODUCTION_PAGE_CHANGE_AUTHORIZED:      false
PRODUCTION_COMPONENT_CHANGE_AUTHORIZED: false
PRODUCTION_DATA_BINDING_AUTHORIZED:     false
AFFILIATE_ROUTE_ACTIVATION_AUTHORIZED:  false
PUBLICATION_AUTHORIZED:                 false
DEPLOY_AUTHORIZED:                      false
```

These authority documents approve architecture and design standards only. They do not authorize production implementation.

## 7. Next tasks

**NEXT_TASK:** `CBW-HOMEPAGE-TEMPLATE-PROTOTYPE-001` — design branch only · isolated noindex prototype · mock data only · no production integration · no canonical Market Intelligence binding · no real affiliate navigation · no merge · no deployment.
