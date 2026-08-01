# CBW Legacy Deletion Register — 053A

Status: `CANDIDATES_IDENTIFIED_NOT_AUTHORIZED`

Deletion is a separate controlled stage after replacement parity. Nothing listed here is authorized for removal by the audit PR.

| Candidate | Current role | Replacement target | Delete only after | Status |
| --- | --- | --- | --- | --- |
| `src/styles/exchange-page-v2.css` | Global override layer across legacy and component exchange pages | Governed exchange-family primitives from #214 | All exchange routes pass screenshot, content, SEO and affiliate parity | Candidate |
| `src/styles/directory-pages-v2.css` | Global overrides for Exchanges and Promo Codes | Directory/Table/Card primitives from #215 | Directory/promo full-family QA passes | Candidate |
| `src/styles/info-pages-v2.css` | Global overrides for trust/legal/methodology/contact pages | PageShell/Prose/Callout/Table/Form primitives from #215 | All info/legal routes pass parity | Candidate |
| `src/styles/faq-page-v2.css` | Dedicated FAQ override layer | Governed FAQ primitive from #215 | FAQ 5 groups/20 items/schema parity passes | Candidate |
| Client-side `#finder` → `#exchanges` bridge in `CleanLayout` | Compatibility rewrite for obsolete source links | Direct source-link migration | Repository scan finds zero `#finder` source references | Candidate |
| Page-local `.shell`, `*-wrap`, `*-inner` width rules | Independent container systems | Canonical Container primitive from #212 | Each owning family is migrated | Candidate group |
| Homepage `path-section` before Top-10 | Explanatory cards that push ranking below fold | Move below ranking or merge into compact context | Homepage first-screen contract passes | Candidate for relocation/removal |
| Legacy Bybit/MEXC monolithic exchange CSS | Self-contained exchange layouts | Shared exchange-family template from #214 | Exact content/action parity proven | Candidate group |
| Duplicate exchange root and `/exchanges/{slug}/` presentation templates | Multiple detail-route systems | Frozen canonical route/template ownership | SEO canonical and route intent decision recorded | Review required |
| Old hero variants and page-local intro bands | Multiple first-screen systems | Shared compact Hero/FirstViewport primitives | All owning routes pass first-screen QA | Candidate group |
| Embedded page `<style>` blocks | 40 page-source local style systems | Shared family primitives or registered exceptions | Scanner reports only approved exceptions | Candidate group |
| Dead preview/design components | Review-only historical surfaces | Current audit/contract dashboards | Sitemap/noindex and owner archive decision | Review required |

## Deletion protocol

1. Record exact pre-deletion master SHA.
2. Capture before-parity artifact.
3. Merge replacement implementation under exact-SHA gate.
4. Re-run build, SEO, affiliate, schema, links and browser QA.
5. Delete one governed candidate batch.
6. Run orphan-import and route-inventory checks.
7. Record rollback SHA and changed-file inventory.
8. Merge deletion PR separately from feature work.

## Completion target

- no compatibility bridge for migrated public routes;
- no unregistered page-local max-width;
- no duplicate page-family template ownership;
- no obsolete global override layer;
- no dead import or orphan public route;
- rollback remains available.
