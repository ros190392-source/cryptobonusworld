# CBW Site Standard Remediation Sequence — 053A

Status: `AUDIT_IN_PROGRESS`

This sequence implements owner direction to replace the current collection of page-local widths and templates with one governed site system. It does not itself authorize production changes.

## Workstream order

1. **053A-1 — Inventory and measurements**
   - source route-family inventory;
   - width and local-style inventory;
   - first-viewport browser measurements;
   - SEO and affiliate risk registers;
   - deletion candidate register.

2. **053A-2 — Canonical layout foundation**
   - freeze width, gutter, spacing, typography, radius and surface tokens;
   - create reusable Shell/Wide/Standard/Prose/Narrow container primitives;
   - create governed Hero, Section and FirstViewport contracts;
   - no public content/data mutation.

3. **053A-3 — Ranking-first homepage remediation**
   - compact hero/context;
   - ranking heading and evidence context in first viewport;
   - at least 3 complete desktop rows at 1440×900, target 5;
   - first ranking card begins within 390×844;
   - preserve ranking order, statuses, CTA/no-CTA rules and `/go/` destinations.

4. **053A-4 — Exchange page family migration**
   - one shared exchange page shell;
   - one first-screen contract;
   - migrate legacy Bybit/MEXC and component pages;
   - preserve exchange-specific brand identity and factual content.

5. **053A-5 — Directory, guide and information families**
   - migrate Exchanges, Promo Codes, Guides, Methodology, FAQ, policies, legal and Contact;
   - remove page-local widths and section systems;
   - preserve canonical, schema, breadcrumbs and forms.

6. **053A-6 — Legacy deletion and parity**
   - delete superseded CSS, duplicate templates and compatibility bridges only after parity QA;
   - verify no orphan imports, dead routes or duplicate shells;
   - maintain rollback commit and evidence package.

7. **053A-7 — Full public-route QA and deploy gate**
   - all generated public routes;
   - desktop 1440×900, tablet 768×1024, mobile 390×844;
   - first-viewport and full-page captures;
   - SEO, affiliate, schema, internal link and overflow validation;
   - exact-SHA merge and deploy authorization.

## Freeze rule

Further public GEO/locale activation remains blocked until 053A-2 defines the canonical layout contract. PR #200 stays review-only.
