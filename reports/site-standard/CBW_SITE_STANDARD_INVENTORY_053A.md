# CBW Site Standard Inventory — 053A

Status: **INVENTORY_COMPLETE_REMEDIATION_REQUIRED**  
Generated: 2026-08-01T21:36:32.969Z

Authoritative workflow:
- run `30719436985`;
- artifact `8824403620`;
- digest `sha256:eacb4fda3883599eb8d0db94e043d84b340c06d26358cf6ed6b647cd377e5cc9`.

## Summary

- Source files scanned: **105**
- Page source files: **69**
- Public page sources: **42**
- Design/review page sources: **27**
- Route families: **15**
- Unclassified public pages: **0**
- `max-width` declarations: **228**
- Distinct `max-width` values: **88**
- Distinct pixel widths: **40**
- Pages with local `<style>` blocks: **40**
- Total page-local style blocks: **41**

## Canonical width proposal

- Wide: `1180px`
- Standard: `960px`
- Prose: `760px`
- Narrow: `560px`
- Gutters: `20px / 24px / 32px`

## Highest-frequency width declarations

| Value | Count | Decision |
| --- | ---: | --- |
| `720px` | 19 | migrate to Prose or registered component exception |
| `760px` | 14 | canonical Prose candidate |
| `320px` | 9 | component-level width; not a page container |
| `100%` | 8 | responsive behavior; validate owning max container |
| `298px` | 6 | component-level width |
| `620px` | 5 | migrate to Narrow/Prose decision |
| `var(--cbw-prose-max, 800px)` | 5 | replace with frozen Prose token |
| `var(--cbw-wide-max, 1120px)` | 4 | replace with frozen Wide token |
| `540px` | 4 | migrate to Narrow or component exception |
| `640px` | 4 | migrate to Prose or component exception |
| `680px !important` | 3 | remove override during family migration |
| `740px` | 3 | migrate to Prose |
| `800px` | 2 | replace with frozen Prose token |
| `900px` | 2 | replace with Standard token |
| `1120px` | 1 | replace with Wide token |
| `1160px` | 1 | replace with Wide token plus governed gutters |
| `1180px` | 1 | canonical Wide token |
| `960px` | 1 | canonical Standard token |
| `560px` | 1 | canonical Narrow token |

Media-query fragments such as `639px)`, `479px)` and similar are tracked separately as scanner syntax noise and will be normalized in the scanner before the final enforcement gate. They do not count as page-container exceptions.

## Route-family counts

| Family | Source routes |
| --- | ---: |
| design-review | 27 |
| exchange-directory-detail | 8 |
| exchange-review | 7 |
| legal-contact | 5 |
| methodology-trust | 5 |
| utility-directory | 4 |
| country-foundation | 3 |
| promo-directory | 3 |
| homepage | 1 |
| exchange-directory | 1 |
| FAQ | 1 |
| guide-directory | 1 |
| guide-detail | 1 |
| affiliate-redirect | 1 |
| system | 1 |

## Confirmed architecture debt

1. Width ownership is duplicated across `tokens.css`, `CleanLayout`, page-local styles and global override layers.
2. `CleanLayout` imports four family override stylesheets in addition to the shell and base tokens.
3. Forty page sources embed local style systems.
4. Root exchange routes and `/exchanges/{slug}/` routes use different template ownership models.
5. Several retired/redirect routes still generate HTML source files and need governed canonical/redirect ownership.
6. The homepage places a pathway section before the canonical ranking.
7. Client-side `#finder` compatibility rewriting remains in the global layout.

## Required end state

- one token sheet owns container widths and gutters;
- every public route maps to a registered page family;
- every migrated page uses a canonical container role;
- local widths are either removed or recorded as component-only exceptions;
- old override layers and compatibility bridges are removed after parity QA;
- no public route becomes orphaned or silently changes indexing intent.
