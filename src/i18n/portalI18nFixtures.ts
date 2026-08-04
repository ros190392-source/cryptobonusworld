import {
  binanceKazakhstanFactParityPass,
  binanceKazakhstanLocalizedViews,
} from '../data/pilots/kz/binanceLocaleParity';
import {
  countryCodes,
  countryRegistry,
  isDefaultEnglishStable,
  localeCodes,
  localeRegistry,
} from './portalRegistry';
import {
  buildCoreLocalePath,
  buildPortalRoute,
  getLocaleAlternates,
  resolveLocaleFallback,
  resolvePortalSeo,
} from './portalRoutes';

export interface I18nFixtureResult {
  name: string;
  expected: 'PASS' | 'REJECT';
  passed: boolean;
  detail: string;
}

const results: I18nFixtureResult[] = [];

function expectPass(name: string, run: () => boolean, detail: string): void {
  let passed = false;
  try { passed = run(); } catch { passed = false; }
  results.push({ name, expected: 'PASS', passed, detail });
}

function expectReject(name: string, run: () => unknown, detail: string): void {
  let rejected = false;
  try { run(); } catch { rejected = true; }
  results.push({ name, expected: 'REJECT', passed: rejected, detail });
}

expectPass(
  'English core route remains unprefixed',
  () => buildCoreLocalePath('/promo-codes/', 'en') === '/promo-codes/' && isDefaultEnglishStable('en'),
  'Existing English public URLs must not gain an /en/ prefix.',
);

expectReject(
  'Inactive Russian public core route',
  () => buildCoreLocalePath('/promo-codes/', 'ru'),
  'A registered locale is not automatically a public localized route.',
);

expectPass(
  'Russian review-shape core route',
  () => buildCoreLocalePath('/promo-codes/', 'ru', 'review-shape') === '/ru/promo-codes/',
  'Review shapes can be modeled without activating a route.',
);

expectReject(
  'Kazakhstan English public country route',
  () => buildPortalRoute({ locale: 'en', country: 'KZ', page: 'country' }),
  'Kazakhstan remains foundation/noindex and cannot resolve publicly.',
);

expectReject(
  'Kazakhstan Russian public country route',
  () => buildPortalRoute({ locale: 'ru', country: 'KZ', page: 'country' }),
  'Russian and Kazakhstan publication gates are both closed.',
);

expectPass(
  'Kazakhstan English review route shape',
  () => buildPortalRoute({ locale: 'en', country: 'KZ', page: 'country', mode: 'review-shape' }) === '/countries/kazakhstan/',
  'Default English uses the existing unprefixed shape.',
);

expectPass(
  'Kazakhstan Russian review route shape',
  () => buildPortalRoute({ locale: 'ru', country: 'KZ', page: 'country', mode: 'review-shape' }) === '/ru/countries/kazakhstan/',
  'Country and locale are independent route dimensions.',
);

expectPass(
  'Kazakhstan Russian passport route shape',
  () => buildPortalRoute({
    locale: 'ru', country: 'KZ', page: 'market-passport', exchangeSlug: 'binance', mode: 'review-shape',
  }) === '/ru/countries/kazakhstan/exchanges/binance/',
  'A passport shape can be modeled without hreflang or sitemap activation.',
);

expectReject(
  'Market passport without exchange slug',
  () => buildPortalRoute({ locale: 'en', country: 'KZ', page: 'market-passport', mode: 'review-shape' }),
  'A market passport cannot exist without an exchange identity.',
);

expectReject(
  'Unsafe exchange route slug',
  () => buildPortalRoute({
    locale: 'en', country: 'KZ', page: 'market-passport', exchangeSlug: '../binance', mode: 'review-shape',
  }),
  'Route inputs must remain strict lowercase URL slugs.',
);

expectPass(
  'Unknown locale fallback',
  () => {
    const result = resolveLocaleFallback('fr', 'KZ');
    return result.effectiveLocale === 'en'
      && result.fallbackApplied
      && !result.routeActivated
      && result.reason === 'unknown-locale';
  },
  'Unknown locale requests fall back to English presentation without activating a URL.',
);

expectPass(
  'Country-incompatible locale fallback',
  () => {
    const result = resolveLocaleFallback('ru', 'DE');
    return result.effectiveLocale === 'en'
      && result.fallbackApplied
      && !result.routeActivated
      && result.reason === 'not-presented-for-country';
  },
  'A known locale not registered for a country falls back without route activation.',
);

expectPass(
  'Supported inactive locale presentation',
  () => {
    const result = resolveLocaleFallback('ru', 'KZ');
    return result.effectiveLocale === 'ru'
      && !result.fallbackApplied
      && !result.routeActivated
      && result.reason === 'requested-supported';
  },
  'Russian presentation can exist while its localized URL remains inactive.',
);

expectPass(
  'Kazakhstan SEO remains noindex',
  () => {
    const seo = resolvePortalSeo({ locale: 'en', country: 'KZ', page: 'country' });
    return seo.robots === 'noindex,nofollow'
      && seo.canonical === null
      && seo.alternates.length === 0
      && !seo.sitemapEligible
      && !seo.localizedRouteActive;
  },
  'No canonical, hreflang or sitemap entry is emitted before publication authority.',
);

expectPass(
  'Kazakhstan locale alternates remain review-only',
  () => {
    const alternates = getLocaleAlternates('KZ', 'market-passport', 'binance');
    return alternates.length === 2
      && alternates.map(item => item.locale).join(',') === 'en,ru'
      && alternates.every(item => !item.eligibleForHreflang);
  },
  'EN/RU route shapes exist, but neither is eligible for hreflang.',
);

expectPass(
  'No localized route is active',
  () => localeCodes.every(code => localeRegistry[code].localizedRouteState === 'inactive'),
  'Locale registration must not silently activate localized URLs.',
);

expectPass(
  'No country route is public',
  () => countryCodes.every(code => !countryRegistry[code].publicRouteAuthorized),
  'Country publication remains a separate owner gate.',
);

expectPass(
  'Binance EN/RU immutable fact parity',
  () => {
    const enIds = binanceKazakhstanLocalizedViews.en.facts.map(item => item.claim.claimId);
    const ruIds = binanceKazakhstanLocalizedViews.ru.facts.map(item => item.claim.claimId);
    return binanceKazakhstanFactParityPass
      && enIds.length === 10
      && ruIds.length === 10
      && JSON.stringify(enIds) === JSON.stringify(ruIds);
  },
  'Translations may change labels and summaries, never the fact objects.',
);

export const portalI18nFixtureResults = results;
export const portalI18nFoundationPass = results.every(result => result.passed);

if (!portalI18nFoundationPass) {
  const failed = results.filter(result => !result.passed).map(result => result.name).join(', ');
  throw new Error(`Portal i18n foundation fixtures failed: ${failed}`);
}
