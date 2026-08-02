# 053A Country Preview Route Discovery

Status: AUDIT_CORRECTION / NO_PUBLICATION_AUTHORIZATION

During the first browser-audit build, the generated route inventory revealed four Kazakhstan routes that were not represented in the initial route-family matrix:

- `/countries/kazakhstan/`;
- `/countries/kazakhstan/exchanges/binance/`;
- `/countries/kazakhstan/exchanges/bybit/`;
- `/countries/kazakhstan/exchanges/okx/`.

## Verified route boundary

These routes are **not public GEO publication approvals**.

The country hub:

- renders with `noindex,nofollow`;
- uses a draft ContentPackage;
- has zero approved ranking rows;
- has recommendation, publication, affiliate CTA and indexability flags set to false;
- calls the route guard and confirms that public route resolution is rejected.

Each market passport:

- renders with `noindex,nofollow`;
- uses a validated MarketProfile inside a draft review package;
- has zero approved claims for publication;
- has no affiliate action;
- preserves ranking under-review/excluded states;
- calls the route guard and confirms that public resolution is rejected.

## Layout impact

Although publication is blocked, these are activation-candidate route shapes and therefore must not be ignored by the layout audit. They currently use another page-local `1160px` shell and independent hero/content geometry.

They are now registered as two separate audit families:

1. `country-review-hub` → `CountryHubTemplateV3`;
2. `country-review-passport` → `MarketPassportTemplateV3`.

They do not count as current public geometry authority, but they must converge to the same named container system before any future publication or indexability gate can open.

## Authorization boundary

This discovery does not authorize:

- public Kazakhstan publication;
- indexability;
- ranking rows;
- recommendations;
- affiliate CTA;
- locale activation;
- merge or deployment of a country route.
