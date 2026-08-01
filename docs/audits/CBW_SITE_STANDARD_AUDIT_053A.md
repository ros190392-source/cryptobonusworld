# CryptoBonusWorld Site Standard Audit 053A

Status: IN PROGRESS  
Priority: P0  
Governing issue: #209  
Branch: `audit/cbw-site-standard-053a`

## Owner decision

The site must stop behaving as a collection of unrelated page widths, hero systems and local templates. All public routes must inherit one governed visual/layout standard. GEO and locale expansion remains on hold until this audit freezes the standard that new routes must inherit.

## Cross-functional board

- Product/UX: information hierarchy and first-screen contracts.
- Design System: width, spacing, typography, radius, surface and action semantics.
- Frontend Architecture: route-family mapping, primitives, migrations and deletion plan.
- SEO: canonical/robots/schema/breadcrumb/H1/internal-link preservation.
- Affiliate Integrity: `/go/` parity, promo-code parity, no-CTA boundaries and CTA prominence.
- QA: geometry matrix, first-viewport capture, overflow/error detection and parity evidence.

## Confirmed P0 findings

### Width fragmentation

The current implementation contains multiple simultaneous content-width systems, including at least:

- 720 px article/content wrappers;
- 760 px legacy long-form wrappers;
- 800 px prose wrappers;
- 860 px info-page wrappers;
- 900 px methodology/review wrappers;
- 1120 px wide directory/table wrappers;
- 1180 px global page containers.

Some differences are legitimate, but they are not currently governed by one token contract. Page-local widths and local padding systems create visible left/right alignment changes between routes and sometimes within the same route.

### Template fragmentation

The repository currently contains overlapping presentation layers:

- global `CleanLayout` shell;
- `InfoLayout` compatibility layer;
- shared `PageHero`;
- legacy exchange long-form classes;
- component-based exchange-page classes;
- `exchange-page-v2.css` adapter layer;
- directory page-local styles plus `directory-pages-v2.css`;
- info/legal page-local styles plus `info-pages-v2.css`;
- FAQ page-local styles plus `faq-page-v2.css`;
- route-local wrappers with independent widths and section rhythm.

The v2 layers improved visual coherence but currently act partly as overrides over old systems. The audit must decide which primitive survives and which old layer can be deleted after parity evidence.

### First-screen inconsistency

The homepage and other families do not yet share a measured first-viewport contract. Decorative hero height, context blocks and route-local spacing can push the primary decision content below the fold. The homepage must prioritize ranking visibility rather than a large marketing stage.

## Proposed canonical width model — audit candidate

These values are not yet frozen. Browser measurement and content tests must confirm them.

| Token | Candidate | Intended use |
|---|---:|---|
| `--cbw-shell-max` | 1200 px | global header/footer and full page alignment |
| `--cbw-wide-max` | 1120 px | rankings, comparison tables, directories |
| `--cbw-content-max` | 960 px | standard structured pages and exchange articles |
| `--cbw-prose-max` | 760 px | readable legal/editorial prose |
| `--cbw-narrow-max` | 600 px | forms and focused utility states |

Rules:

1. A page family receives one primary width token.
2. A route may use a wider nested data region only through a documented component.
3. Local numeric `max-width` values are forbidden unless registered as an approved exception.
4. Horizontal padding comes from one responsive gutter token, not page-local values.
5. Header, hero content, primary content and footer must align to the same governing grid.

## Proposed first-screen contracts — audit candidate

### Homepage

Desktop 1440×900:

- complete header;
- compact identity/context block;
- ranking title, freshness/methodology context;
- at least 3 complete ranking rows, target 5;
- country/language controls visible;
- no decorative block before ranking.

Mobile 390×844:

- compact header;
- country/language context;
- concise hero copy;
- ranking title and visible start of first real row/card;
- no oversized empty hero or detached CTA strip.

### Exchange page

- header;
- exchange identity;
- offer or evidence state;
- authorized action when present;
- important limitation/disclosure context;
- first substantive article/facts content beginning within the first viewport.

### Directory

- header and concise purpose;
- first cards/table rows visible within the first viewport;
- no oversized decorative hero.

### Methodology / trust / legal

- header, H1, summary/meta and start of the first substantive section within the first viewport;
- readable prose width consistent across all routes.

### Guides

- header, H1, summary, author/freshness context and start of article body within the first viewport;
- guide pages must join the same content-width and typography system.

## Audit inventory to complete

- [ ] all generated public routes classified by family;
- [ ] every layout/component/style controlling width recorded;
- [ ] every numeric `max-width` declaration recorded;
- [ ] every hero minimum height recorded;
- [ ] 1440×900 first-viewport measurements;
- [ ] 768×1024 measurements;
- [ ] 390×844 measurements;
- [ ] SEO risk register;
- [ ] affiliate integrity register;
- [ ] obsolete CSS/template deletion candidates;
- [ ] controlled remediation PR sequence;
- [ ] noindex audit dashboard.

## Preliminary route-family model

1. Homepage / ranking-first.
2. Exchange profile / promo article.
3. Exchange directory / commercial comparison.
4. Promo-code ranking/table.
5. Guide index.
6. Guide article.
7. Methodology / trust policy.
8. Legal / editorial prose.
9. FAQ/help.
10. Contact/form.
11. Review-only design/contract routes.
12. Future country hub and market passport — inactive until this standard is frozen.

## SEO non-negotiables

- preserve canonical URLs and indexability state;
- preserve one H1 and logical heading hierarchy;
- preserve FAQ and article schemas;
- preserve breadcrumbs;
- remove obsolete anchors without changing user intent;
- avoid duplicated intro/ranking blocks;
- no route deletion without redirect/indexation review.

## Affiliate non-negotiables

- exact approved `/go/{exchange}/` destinations preserved;
- exact promo codes preserved;
- no-CTA exchanges remain without primary affiliate CTA;
- amber remains the action role;
- green remains evidence/verified/success only;
- no duplicate, hidden or visually misleading CTA introduced by migration.

## Deletion policy

Old CSS/templates may be removed only after:

1. replacement route parity is proven;
2. screenshots pass at all target viewports;
3. SEO and affiliate inventories pass;
4. no import/reference remains;
5. rollback commit is recorded;
6. deletion happens in a separate controlled PR where practical.

## Immediate next actions

1. create machine-readable route/family inventory;
2. create machine-readable width/hero inventory;
3. build the noindex audit dashboard;
4. run representative browser measurements;
5. freeze tokens and first-screen contracts;
6. split remediation into controlled PRs, starting with homepage ranking-first geometry and global container primitives.
