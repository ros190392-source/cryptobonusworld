# CryptoBonusWorld Sitewide Layout Standard v3 — Audit 053A

Status: AUDIT_ONLY / NO_PUBLIC_MUTATION / OWNER_REVIEW_IN_PROGRESS

Governing issue: #201

## Executive finding

The site currently shares color, typography and shell styling, but it does **not** share one governed geometry. Public pages are assembled from several generations of templates and compatibility layers. The result is visibly inconsistent widths, different hero heights, different first-screen behavior and duplicated layout rules.

This audit authorizes no production mutation. It defines the replacement standard and the order in which legacy geometry must be removed.

## Review team

- Product / UX architecture: page purpose, family map, first-viewport hierarchy.
- Design system: containers, spacing, hero, cards, tables, FAQ, callouts.
- SEO architecture: canonical, source HTML, headings, schema, sitemap, redirects.
- Affiliate integrity: CTA bindings, promo codes, disclosures, no-CTA boundaries.
- Browser / accessibility QA: responsive geometry, keyboard, overflow and errors.

## Confirmed current geometry conflicts

| Area | Current width / rule | Problem |
|---|---:|---|
| `CleanLayout .container` | 1180px | Global shell value is not used consistently by page families. |
| `CleanLayout --cbw-wide-max` | 1120px | Used by Top-10 and wide directories, but not homepage shell. |
| Homepage `.shell` | 1160px | Page-local width competes with global shell/wide tokens. |
| Homepage `.prose-shell` | 800px | Another unmanaged page-local width. |
| Exchange `.p2-inner/.bw-wrap` | 760px | Hard override with `!important`; incompatible with content/wide roles. |
| Info/legal `.container` | 860px | Separate family-specific width. |
| Methodology `.mth-prose/.mth-wide` | 900px | Same page family contains another width. |
| PageHero | 270–360px minimum | Directory/trust pages can delay the first substantive block. |
| Homepage hero | 68px top + 86px bottom padding, H1 up to 86px | Too tall for the ranking-first product requirement. |

## Confirmed first-viewport failure

The homepage renders this order:

1. hero;
2. three-card `path-section`;
3. `HomepageTop10`.

This violates the owner requirement that the ranking must enter the first viewport. The path cards must move below the ranking or be absorbed into a compact ranking preface.

### Target homepage gate

At 1440×900:

- current header visible;
- compact hero visible;
- Top-10 heading visible;
- at least two complete ranking rows visible.

At 390×844:

- current header visible;
- compact hero and country/language context visible;
- Top-10 heading visible;
- first ranking card visibly enters the viewport.

## Confirmed architecture debt

### 1. Layout primitives are embedded in `CleanLayout`

`CleanLayout` currently owns global reset, container values, section spacing, button primitives and imports four page-family override files. This makes it both a document shell and a design-system implementation.

Required replacement:

- `layout-tokens.css` — named values only;
- `layout-primitives.css` — named containers and section rhythm;
- `PageShell`, `PageIntro`, `ContentSection`, `Prose`, `WideDataSurface` components;
- `CleanLayout` reduced to metadata, shell and slots.

### 2. Page-family CSS is mainly override-based

`exchange-page-v2.css`, `directory-pages-v2.css`, `info-pages-v2.css` and `faq-page-v2.css` use broad selectors and many `!important` declarations to normalize older markup. They improved appearance but preserve several generations of DOM and CSS underneath.

Required replacement:

- migrate markup to governed components;
- remove page-local widths and obsolete class contracts;
- delete override files after each family reaches parity.

### 3. Client-side navigation compatibility bridge

`CleanLayout` rewrites `/#finder` links after load. This creates a mismatch between source HTML and browser DOM and keeps obsolete source references alive.

Required replacement:

- correct every source link;
- validate zero `#finder` strings at build time;
- delete the client-side rewrite script.

### 4. Retired route stubs use standalone shells

Observed retired route implementations such as `/guides/`, `/guides/{slug}/` and `/bonuses/` render standalone full-screen HTML with page-local CSS and meta refresh. They do not use the site shell.

Required replacement:

- one governed redirect registry;
- server-level redirects where the current deploy platform supports them;
- one minimal fallback redirect document only when server redirect is impossible;
- remove duplicated standalone HTML/CSS.

## Canonical container standard

Only these named roles are permitted:

| Role | Maximum | Use |
|---|---:|---|
| `shell` | 1200px | header/footer/full page alignment |
| `wide` | 1120px | rankings, directories, comparison tables |
| `content` | 960px | mixed content/cards and structured articles |
| `prose` | 760px | long-form text/legal/editorial copy |

Unified gutters:

- mobile: 20px;
- tablet: 24px;
- desktop: 32px.

Raw `max-width` values in public page CSS are forbidden unless listed in an exception registry with a test.

## Page-family target architecture

### Homepage

`SiteHeader → CompactHomepageIntro → HomepageTop10 → Market discovery → Methodology/trust → Updates → Guide/FAQ → Disclosure → SiteFooter`

### Exchange profile

`SiteHeader → Compact exchange identity/offer hero → Facts strip → Primary article content → Evidence/tables → FAQ/related/disclosure → SiteFooter`

### Directory / comparison

`SiteHeader → Compact page intro → First live card/table row → Methodology/context → FAQ/disclosure → SiteFooter`

### Editorial / legal

`SiteHeader → Compact purpose intro → First substantive section → remaining governed prose surfaces → SiteFooter`

### Redirect-only

No visual page family. Redirect registry plus minimal fallback document.

## SEO team findings and gates

1. Preserve canonical URLs, titles, descriptions and JSON-LD unless separately authorized.
2. Remove client-only correction of crawlable links.
3. Replace meta-refresh routes with server redirects where possible.
4. Keep exactly one H1 per public content route.
5. Primary content must enter the first viewport; decorative blocks cannot precede core intent.
6. Preserve sitemap/indexability behavior during template migration.
7. Detect hidden duplicate sections and duplicate page-purpose headings.

## Affiliate team findings and gates

1. Preserve every approved `/go/{exchange}/` destination byte-for-byte.
2. Preserve current promo codes and offer records.
3. Preserve no-primary-CTA boundaries for Binance, Gate.io, HTX and Phemex.
4. Actions use amber; evidence/status may use green.
5. Affiliate status cannot affect ranking position.
6. Disclosure remains visible on commercial pages.
7. CTA geometry must not overflow or detach from its content container.

## Delivery plan

1. Add route-family registry and layout contracts.
2. Add build-time raw-width and obsolete-link detection.
3. Introduce named container primitives.
4. Remediate homepage first viewport first.
5. Migrate exchange pages from override CSS to governed components.
6. Migrate directory/promo pages.
7. Rebuild or formally retire guide family.
8. Migrate info/legal/FAQ/contact family.
9. Replace legacy route stubs with redirect registry.
10. Run full public-route SEO, affiliate, accessibility and Chromium audit.

## Merge boundary

Audit artifacts may merge separately after validation. No layout implementation, publication or deployment is authorized by this audit file.