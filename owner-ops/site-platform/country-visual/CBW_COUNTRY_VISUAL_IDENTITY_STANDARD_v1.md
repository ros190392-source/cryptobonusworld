# CBW Country Visual Identity Standard — v1

- Task: CBW-GLOBAL-COUNTRY-LOCALE-SITE-ARCHITECTURE-V3-001 · corrected by owner review 002 · 2026-07-23
- Status: **ARCHITECTURE_V3_DRAFT_FOR_OWNER_REVIEW** (documentation only; no artwork generated)
- Companion: [CBW_COUNTRY_VISUAL_IDENTITY_STANDARD_v1.json](CBW_COUNTRY_VISUAL_IDENTITY_STANDARD_v1.json)

## 1. Purpose

Give every covered country a premium, recognizable, owner-approved visual identity — inside the one
unified CBW design system — without flag-grids, clichés, or legal risk. Country visuals are
**presentation only**: they never signal availability, eligibility or endorsement.

## 2. One consistent country-art style (binding)

- **Style:** flat-vector geometric illustration in the CBW palette family — navy base
  (`#080F18`→`#13233E` range), one country accent duo, restrained line detail; recognizable
  landmark/motif silhouettes, no photorealism, no stock photography, no 3D renders, no gradients
  beyond the navy band family, no people, no text of any kind inside the artwork.
- **Composition:** wide masthead scene with a clear content-safe zone; silhouettes anchored to one
  edge so text/UI never overlaps landmark detail; density calm enough to sit under a 56px header.
- **Consistency rule:** all countries share the same style, stroke weight, perspective grammar and
  navy base — a Kazakhstan masthead and a Germany masthead must read as siblings.

## 3. CountryVisualProfile (contract — one record per country)

| Field | Definition |
|---|---|
| `countryCode` | ISO 3166-1 alpha-2 (e.g. `KZ`). |
| `displayName` | English display name + localized names come from the locale layer (not stored here). |
| `accentPalette` | Exactly 2 accent colors (+ optional tint), chosen to harmonize with CBW navy/amber; contrast-checked. |
| `landmarks` | 1–3 approved landmark silhouettes (e.g. KZ: Baiterek Tower, steppe horizon). |
| `motifs` | Abstract cultural/geographic motifs (patterns, terrain lines) — non-religious, non-political. |
| `flagPolicy` | Flag used ONLY as a small identification glyph in controls/chips — never as artwork base, never as background, never in grids. |
| `emblemPolicy` | **Official coats of arms / state emblems NOT used by default.** Use requires explicit owner approval + documented rights/usage review (many are legally protected). |
| `desktopArtwork` | Masthead scene, target 2400×600 master, safe zone right/left per composition spec. |
| `mobileArtwork` | Compact crop/recomposition, target 800×400 master, ≤120px rendered band. |
| `ogArtwork` | 1200×630 social card scene (same style; CBW brand chrome allowed OUTSIDE the artwork layer). |
| `cardArtwork` | 800×500 card/tile scene for country browsers and cross-links. |
| `safeZones` | Explicit per-artwork content-safe rectangles (headline/verdict/rows never overlap detail). |
| `altText` | Descriptive, localized via locale layer (e.g. "Stylized skyline of Astana with Baiterek Tower"). |
| `attributionRights` | Generation source, license/usage basis, rights-review note, reviewer, date. |
| `approvalStatus` | `DRAFT → OWNER_REVIEW → APPROVED → RETIRED`; only `APPROVED` may ship. |

Registry location (future): `owner-assets/site-design/country-visual/{countryCode}/…` + a
`COUNTRY_VISUAL_REGISTRY.json` of profiles. Approved masters live in owner-assets; **web-optimized
exports enter `public/**` only via an owner-gated `PRODUCTION_ASSET_EXPORT` task** — reference and
master art never ship directly.

## 4. Artwork rules (binding, all artworks)

Textless (no words, numbers, dates in any language) · evergreen (no seasonal/holiday/event content)
· promo-free and bonus-free (no offers, coins raining, money imagery tied to bonuses) · date-free ·
responsive (masters + defined crops; no layout-critical detail outside safe zones) ·
localization-safe (nothing to translate; culturally reviewed; no religious/political symbols;
no maps with contested borders) · legible under both light and dark chrome · never recolors or
contains exchange brands.

## 4b. One profile per country — shared across language siblings (owner review 002)

A CountryVisualProfile **belongs to the country, not the language**. The same Kazakhstan pack
serves `/kz/ru/`, `/kz/kk/`, `/kz/en/`; the same Poland pack serves `/pl/pl/`, `/pl/uk/`,
`/pl/ru/`, `/pl/en/`; the same Germany pack serves `/de/de/`, `/de/en/` — identical artwork,
palette and safe zones on every language sibling (CI gates LOCALE14/LOCALE25). Only UI-rendered text, metadata and alt text
change by language. **Never generate per-language artworks for one country** (no separate Russian/
Kazakh/English Kazakhstan art). This is guaranteed by the textless rule: artwork contains nothing
to translate.

## 5. Country masthead system

`CountryMasthead` component (future, foundation-grammar member): desktop band ≤200px with artwork +
country name (typeset by the UI, not the artwork) + evidence status chip; mobile band ≤120px;
accent palette drives section kickers/chips on that country's surfaces only; masthead is present on
Country pages (primary), optional compact variants on exchange×country and restricted pages; never
on offer-first or methodology surfaces. Masthead never carries commercial controls.

## 6. Visual-pack generation and approval workflow

```
ChatGPT (art direction + generation per this standard)
→ candidate pack (desktop/mobile/OG/card + palette + safe-zone spec)
→ owner review (style, recognizability, cultural check)  → APPROVED or revision loop
→ handoff to Claude Code
→ ingestion into owner-assets/site-design/country-visual/{CC}/ + registry entry
   (REFERENCE_MANIFEST/COUNTRY_VISUAL_REGISTRY update, checksums, rights record)
→ design-branch commit (owner-gated)
→ prototype usage (mock pages)
→ PRODUCTION_ASSET_EXPORT task (separately authorized) for optimized public/** derivatives
```
No pack may be generated before `COUNTRY_ART_GENERATION_AUTHORIZED` is true for that batch;
no artwork enters `public/**` without the export gate.

## 7. Pilot visual plan (defined only — NOT generated in this task)

| Pilot | Accent direction | Landmark/motif candidates (for owner selection) |
|---|---|---|
| **Kazakhstan (KZ)** | sky-turquoise + gold (harmonized to CBW navy) | Baiterek Tower silhouette · steppe horizon · sun-ray motif |
| **Poland (PL)** | crimson + silver-gray | Warsaw skyline w/ Palace of Culture silhouette · Vistula curve · eagle-free geometric motif |
| **Germany (DE)** | amber-gold + graphite | Brandenburg Gate silhouette · Rhine/skyline band · precision-grid motif |

Pilots follow the full workflow in §6; flags only as control glyphs; no coats of arms.

## 8. Governance

Every profile field is owner-approved; cultural review is mandatory before OWNER_REVIEW exit;
rights review is mandatory for any landmark with potential design protection; retired artwork is
archived, not deleted; CI blocks: artwork referenced without `APPROVED` status, artwork in
`public/**` without an export-task trail, flags used outside glyph contexts, emblem use without a
rights record.
