# CBW SEO Risk Register — 053A

Status: `AUDIT_IN_PROGRESS`

This register governs the site-standard migration. It does not authorize content, indexability or route changes.

| ID | Risk | Current signal | Migration requirement | Severity | Status |
| --- | --- | --- | --- | --- | --- |
| SEO-053A-01 | Oversized pre-content stages push primary intent below the fold | Homepage hero plus pathway cards precede the Top-10 | Ranking heading and real rows must enter the first viewport without removing the primary H1 | P0 | Confirmed |
| SEO-053A-02 | Multiple page-local width systems create inconsistent content hierarchy | Static scanner reports 228 max-width declarations and 88 distinct values | Migrate to the frozen container registry; exceptions require explicit route-level justification | P0 | Confirmed |
| SEO-053A-03 | Local style blocks can silently override shared heading and section contracts | 40 page sources contain embedded style blocks | Migrated families must use shared primitives; remaining local styles must be inventoried exceptions | P0 | Confirmed |
| SEO-053A-04 | Layout migration can change H1 order or create duplicate headings | Pages use multiple hero/header implementations | Preserve exactly one visible H1 and logical H2/H3 order per public route | P0 | Open |
| SEO-053A-05 | Layout migration can remove or duplicate canonical/robots metadata | CleanLayout, InfoLayout and legacy routes own metadata differently | Capture canonical and robots values before/after; zero unexplained changes | P0 | Open |
| SEO-053A-06 | FAQ and article schema can diverge from visible content | FAQ JSON-LD and page-specific schemas are generated in route files | Preserve schema type, entity count and visible-answer parity | P0 | Open |
| SEO-053A-07 | Breadcrumbs can disappear during template convergence | Trust/legal pages and some directory details use different breadcrumb patterns | Preserve breadcrumb visibility and BreadcrumbList schema where present | P1 | Open |
| SEO-053A-08 | Compatibility scripts can hide obsolete internal-link intent | Legacy `#finder` links are rewritten client-side to `#exchanges` | Replace source links during migration, then remove the compatibility bridge | P1 | Confirmed |
| SEO-053A-09 | Duplicate public route families can produce near-duplicate intent | Root exchange pages and `/exchanges/{slug}/` routes coexist | Document canonical ownership and ensure no template migration changes indexing intent | P0 | Open |
| SEO-053A-10 | Preview/design routes can leak into sitemap or indexability | Multiple `[designRoot]` and `/preview/` surfaces exist | Require noindex/nofollow and sitemap exclusion after every migration | P0 | Open |
| SEO-053A-11 | First-screen compression can hide important limitation/disclosure text | Exchange pages mix hero, offer and limitation content | Keep material limitation and affiliate disclosure visible without misleading action prominence | P0 | Open |
| SEO-053A-12 | Deleting old CSS/templates can orphan routes or imports | Multiple layered CSS systems currently coexist | Run build, route inventory, internal-link and sitemap checks after each deletion batch | P0 | Open |
| SEO-053A-13 | Changed hero dimensions can degrade Core Web Vitals | Large background heroes and multiple image treatments exist | Preserve explicit dimensions/containment and avoid new layout shifts | P1 | Open |
| SEO-053A-14 | Utility and guide pages may be missed by representative-only QA | 102 generated pages exceed the core commercial routes | Final gate must crawl every generated public HTML route | P0 | Open |

## Required parity captures

For every migrated public route record:

- title;
- meta description;
- canonical;
- robots;
- H1 count and text;
- ordered H2 list;
- JSON-LD types and entity counts;
- breadcrumb links;
- internal links;
- sitemap presence/absence;
- HTTP status.

## Freeze boundary

No public GEO or locale route may be activated before the Site Standard foundation defines the canonical route shell and metadata ownership model.
