# CBW Split 3 (P0) — Country-Aware Commercial Gate (v1)

Branch: `feat/cbw-split3-country-aware-commercial-gate-001`
Governing issue: #248 · Spec: `docs/tasks/CBW_SPLIT3_P0_COUNTRY_AWARE_COMMERCIAL_GATE_001.md`
Status: implemented; Draft PR open; **not merged**; **not deployed**; production CTA **disabled, fail-closed to preview**.

## What changed

The homepage previously derived **all** commercial gate facts from `offer.status`
(`verified → available + offer-eligible + approved`). That let offer status alone
imply country availability. This P0 removes that and makes availability a
function of a canonical **Exchange × Country MarketProfile**.

### New contracts
| File | Purpose |
|---|---|
| `src/data/contracts/countryInput.ts` | Explicit, pure country-selection contract. Accepts only normalized uppercase ISO alpha-2; classifies `valid / global / missing / malformed / unsupported`. Never reads IP/locale/headers/global state. `global` cannot authorize a live CTA. |
| `src/data/contracts/marketProfileRegistry.ts` | `resolveMarketProfile(exchangeId, countryCode, profiles)` — exact-match, fail-closed (missing / conflict / invalid / not-approved / restricted / unavailable). `PUBLIC_MARKET_PROFILES` is **empty** by design. |
| `src/data/contracts/countryAwareCta.ts` | `resolveCountryAwareCommercialCta(...)` composes country input + profile resolver + `offer.restrictedCountries` (malformed → fail closed) + the base commercial gate. |

`src/data/contracts/portalCtaI18n.ts` gains localized (en/ru/kk) reasons for the
new country/profile states. `src/data/homepageTop10Cta.ts` now binds each row
through the country-aware resolver.

## Fail-closed rule

A live `/go/*` action requires **all** of, with no input implying another:
explicit production mode · commercial intent · valid supported country · exactly
one valid **approved** Exchange × Country MarketProfile · availability
`available|limited` · profile `offerEligibility === approved` · **fresh** profile
evidence (canonical freshness policy) · offer exists and is `verified` · country
**not** in `offer.restrictedCountries` · valid affiliate slug/route.

`offer.status` authorizes the **offer** only — never country availability,
MarketProfile approval, or Exchange × Country approval.

## Public behaviour (fail-closed)

The static homepage has no country routing yet, so it uses an explicit
non-country context (`PUBLIC_HOMEPAGE_COUNTRY = 'global'`) and the empty
`PUBLIC_MARKET_PROFILES` registry. Therefore:

- **Preview build:** homepage emits **0** `/go/*` links.
- **Production simulation** (`PUBLIC_CBW_CTA_MODE=production`): homepage still
  emits **0** `/go/*` links (no approved profiles). There is **no hidden default
  country** that could authorize a production action.
- Positive `/go/*` cases are demonstrated **only** with explicit, clearly
  test-only synthetic profiles injected into the resolver/binding (never public
  data). `countries.json` prose, `localNotes`, popularity, ranking position and
  offer status are never promoted into approved geo facts.

## Verification (final, post-remediation — all green)

```
npm run portal:contracts:test        # 216 passed, 0 failed   (initial: 168)
npm run ai-ops:validate:fixtures     # 43 passed, 0 failed
tsc --noEmit (contracts)             # exit 0
npm run build                        # 109 pages
npm run build (preview)              # homepage 0 /go/
PUBLIC_CBW_CTA_MODE=production build  # homepage 0 /go/ (simulation only)
Chromium homepage QA                 # final: 16/16 (desktop+mobile, keyboard, both modes)
                                     #   (initial pre-remediation run: 22/22)
```

The 22 spec scenarios are covered under the `s3/*` and `hp/s3-*` test names,
including offer-status-alone-cannot-authorize, restricted-country and malformed-
restriction fail-closed, profile mismatch/conflict/stale, and en/ru/kk factual
invariance.

## Owner-review remediation (R1–R6)

Production-integrity invariants added on the same branch (public behaviour
unchanged — still zero `/go/*`):

- **R1 exchange identity** — `exchangeId === slug === resolved profile.exchangeId`;
  else `EXCHANGE_IDENTITY_MISMATCH`. A profile for exchange A can never authorize
  `/go/{exchange-B}`.
- **R2 offer identity** — `offer.exchangeSlug` must equal the target identity;
  else `OFFER_IDENTITY_MISMATCH`. The homepage passes the real `offer.exchangeSlug`.
- **R3 restriction completeness** — absent `restrictedCountries` is not proof of
  “unrestricted”: `undefined/null → RESTRICTION_DATA_MISSING`, non-array/malformed
  `→ RESTRICTION_DATA_INVALID`; only an explicit array (incl. `[]`) is proof.
- **R4 finite clock** — `assessEvidenceFreshness` rejects non-finite `now`
  (`INVALID_CLOCK`) and invalid policy numbers; the resolver requires a finite
  explicit `now` for any live decision (`CLOCK_INVALID`). The homepage no longer
  has a hidden `Date.now()` fallback.
- **R5 review deadline** — a live decision requires `now < Date.parse(nextReviewAt)`;
  else `PROFILE_REVIEW_OVERDUE` (independent of the `lastCheckedAt` freshness policy).
- **R6 malformed registry (ATOMIC)** — the whole registry is proven
  structurally valid BEFORE resolving an exact pair. A non-array registry, or
  ANY null / primitive / structurally-invalid entry, invalidates the ENTIRE
  registry `→ PROFILE_REGISTRY_INVALID`. Malformed entries are **not** silently
  ignored — a corrupted sibling can never let a matching profile authorize a
  CTA. `resolveMarketProfile` never throws on any malformed input. Valid
  non-matching profiles for other pairs coexist without blocking resolution.

All six reasons are localized en/ru/kk. Final contracts total **216** cases.

## Remaining blockers (later tasks — not this PR)

- Real evidence-backed approved **MarketProfile** population for target
  countries (the public registry stays empty until then).
- Machine-readable `evidenceCheckedAt`/`lastCheckedAt` across all real homepage
  records.
- Migration of legacy exchange/directory/promo CTA surfaces to this gate.
- Real localized homepage **routes** (per-country + per-locale).
- Production activation / deployment (owner action; `PUBLIC_CBW_CTA_MODE`
  remains unset/preview).

## Not authorized / not performed
No merge, no deploy, no Cloudflare production publication, no environment/secret
change, `PUBLIC_CBW_CTA_MODE` untouched, no affiliate destinations modified, no
owner-authored files committed or deleted.
