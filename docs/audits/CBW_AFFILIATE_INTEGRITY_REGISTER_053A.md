# CBW Affiliate Integrity Register — 053A

Status: `AUDIT_IN_PROGRESS`

This register defines non-negotiable commercial invariants during the site-standard migration.

## Preserved data boundaries

The migration must not change:

- any approved `/go/{exchange}/` destination;
- promo-code values;
- offer amounts or wording;
- offer verification status;
- ranking order;
- last-checked dates;
- affiliate relationship labels;
- no-CTA decisions.

## Homepage invariants

- exactly 10 ranking rows;
- exactly one ranking surface;
- existing row order unchanged;
- six authorized primary CTA paths unchanged;
- Binance, Gate.io, HTX and Phemex retain no primary affiliate CTA;
- no CTA may be created by CSS, fallback logic or missing-data coercion;
- country cards and informational sections contain no exchange affiliate actions.

## Exchange-page invariants

- each approved exchange page retains its own `/go/{slug}/` route;
- no duplicate primary action in the first viewport;
- no detached edge-to-edge CTA;
- primary commercial actions use the canonical amber role;
- green is reserved for verified/evidence/success state;
- material offer limitations and affiliate disclosure remain visible;
- related-exchange actions must not replace or obscure the page's own primary intent.

## Directory and promo invariants

- Exchanges directory retains the current approved card/action inventory;
- Promo Codes retains current row count, order, code values and `/go/` paths;
- mobile card transformations must not duplicate actions hidden from desktop;
- copy buttons must copy the displayed immutable code;
- sorting or responsive CSS must not change editorial order.

## Failure modes to test

| ID | Failure mode | Required detection |
| --- | --- | --- |
| AFF-053A-01 | Duplicate visible CTA after template composition | Browser count by route and viewport |
| AFF-053A-02 | Hidden duplicate CTA remains keyboard-focusable | Tab-order and visibility audit |
| AFF-053A-03 | Wrong `/go/` destination after component reuse | Exact href inventory parity |
| AFF-053A-04 | No-CTA exchange gains a fallback action | Negative assertion for protected slugs |
| AFF-053A-05 | Promo code truncation changes copied value | Display/copy parity test |
| AFF-053A-06 | Green action styling implies verification | Computed color-role audit |
| AFF-053A-07 | Affiliate action appears in country/review-only surface | `/go/` negative assertion |
| AFF-053A-08 | First-screen compression hides limitation/disclosure | Viewport visibility assertion |
| AFF-053A-09 | Mobile layout changes editorial order | DOM order parity across viewport |
| AFF-053A-10 | Deleted legacy template removes redirect coverage | Build and `/go/` route inventory |

## Required before/after evidence

For every commercial public route capture:

- visible CTA count;
- all `/go/` hrefs in DOM order;
- promo-code values;
- copy-button values;
- sponsored/rel attributes;
- affiliate disclosure presence;
- protected no-CTA assertions;
- first-viewport action and limitation visibility.

## Authorization boundary

A layout or template migration cannot modify affiliate state. Any commercial data change requires a separate governed evidence and owner-approval task.
