import {
  countryRegistry,
  getCountry,
  getLocale,
  isCountryRoutePublic,
  isDefaultEnglishStable,
  isLocaleCode,
  isLocalizedRouteActive,
  localeRegistry,
  type CountryCode,
  type LocaleCode,
} from './portalRegistry';

export type RouteMode = 'public' | 'review-shape';
export type PortalPageKind = 'country' | 'country-ranking' | 'market-passport';

export interface PortalRouteInput {
  locale: LocaleCode;
  country: CountryCode;
  page: PortalPageKind;
  exchangeSlug?: string;
  mode?: RouteMode;
}

export interface LocaleFallbackResult {
  requestedLocale: string;
  effectiveLocale: LocaleCode;
  fallbackApplied: boolean;
  routeActivated: boolean;
  reason: 'requested-supported' | 'unknown-locale' | 'not-presented-for-country';
}

export interface PortalSeoResolution {
  robots: 'index,follow' | 'noindex,nofollow';
  canonical: string | null;
  alternates: Array<{ hreflang: LocaleCode; href: string }>;
  sitemapEligible: boolean;
  localizedRouteActive: boolean;
}

function cleanSlug(value: string, label: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new Error(`${label} must be a lowercase URL slug`);
  }
  return normalized;
}

function normalizeCorePath(path: string): string {
  const normalized = path.trim();
  if (!normalized.startsWith('/') || !normalized.endsWith('/')) {
    throw new Error('Core route must begin and end with a slash.');
  }
  if (normalized.includes('//')) {
    throw new Error('Core route must not contain duplicate slashes.');
  }
  return normalized;
}

export function isLocaleEligibleForPublicRoute(locale: LocaleCode): boolean {
  return locale === 'en'
    ? isDefaultEnglishStable(locale)
    : isLocalizedRouteActive(locale);
}

export function isPortalRoutePublic(input: Omit<PortalRouteInput, 'mode'>): boolean {
  const country = getCountry(input.country);
  return country.presentationLocales.includes(input.locale)
    && isLocaleEligibleForPublicRoute(input.locale)
    && isCountryRoutePublic(input.country);
}

export function buildCoreLocalePath(
  path: string,
  locale: LocaleCode,
  mode: RouteMode = 'public',
): string {
  const normalized = normalizeCorePath(path);
  const record = getLocale(locale);

  if (mode === 'public' && locale !== 'en' && !isLocalizedRouteActive(locale)) {
    throw new Error(`Localized core route ${locale} is not active.`);
  }

  return locale === 'en' ? normalized : `${record.routePrefix}${normalized}`;
}

export function buildPortalRoute(input: PortalRouteInput): string {
  const mode = input.mode ?? 'public';
  const locale = localeRegistry[input.locale];
  const country = countryRegistry[input.country];

  if (!locale) throw new Error(`Unknown locale: ${input.locale}`);
  if (!country) throw new Error(`Unknown country: ${input.country}`);
  if (!country.presentationLocales.includes(input.locale)) {
    throw new Error(`Locale ${input.locale} is not registered for ${input.country}.`);
  }

  if (mode === 'public' && !isPortalRoutePublic(input)) {
    throw new Error(`${input.locale}/${input.country}/${input.page} is not publication-ready.`);
  }

  const localePrefix = input.locale === 'en' ? '' : locale.routePrefix;
  const countryBase = `${localePrefix}/countries/${country.slug}`;

  if (input.page === 'country') return `${countryBase}/`;
  if (input.page === 'country-ranking') return `${countryBase}/exchanges/`;

  if (!input.exchangeSlug) {
    throw new Error('exchangeSlug is required for a market-passport route.');
  }

  return `${countryBase}/exchanges/${cleanSlug(input.exchangeSlug, 'exchangeSlug')}/`;
}

export function buildReviewRoute(input: Omit<PortalRouteInput, 'mode'>): string {
  const routeShape = buildPortalRoute({ ...input, mode: 'review-shape' });
  return `/__design/i18n-foundation/route${routeShape}`;
}

export function resolveLocaleFallback(
  requestedLocale: string,
  country: CountryCode,
): LocaleFallbackResult {
  const countryRecord = getCountry(country);

  if (!isLocaleCode(requestedLocale)) {
    return {
      requestedLocale,
      effectiveLocale: 'en',
      fallbackApplied: true,
      routeActivated: false,
      reason: 'unknown-locale',
    };
  }

  if (!countryRecord.presentationLocales.includes(requestedLocale)) {
    return {
      requestedLocale,
      effectiveLocale: 'en',
      fallbackApplied: true,
      routeActivated: false,
      reason: 'not-presented-for-country',
    };
  }

  return {
    requestedLocale,
    effectiveLocale: requestedLocale,
    fallbackApplied: false,
    routeActivated: requestedLocale === 'en'
      ? isCountryRoutePublic(country)
      : isLocalizedRouteActive(requestedLocale) && isCountryRoutePublic(country),
    reason: 'requested-supported',
  };
}

export function getLocaleAlternates(
  country: CountryCode,
  page: PortalPageKind,
  exchangeSlug?: string,
): Array<{ locale: LocaleCode; href: string; eligibleForHreflang: boolean }> {
  const countryRecord = getCountry(country);
  return countryRecord.presentationLocales.map(locale => ({
    locale,
    href: buildPortalRoute({ locale, country, page, exchangeSlug, mode: 'review-shape' }),
    eligibleForHreflang: isPortalRoutePublic({ locale, country, page, exchangeSlug }),
  }));
}

export function resolvePortalSeo(
  input: Omit<PortalRouteInput, 'mode'>,
): PortalSeoResolution {
  const localizedRouteActive = isPortalRoutePublic(input);

  if (!localizedRouteActive) {
    return {
      robots: 'noindex,nofollow',
      canonical: null,
      alternates: [],
      sitemapEligible: false,
      localizedRouteActive: false,
    };
  }

  const canonical = buildPortalRoute({ ...input, mode: 'public' });
  const alternates = getLocaleAlternates(input.country, input.page, input.exchangeSlug)
    .filter(item => item.eligibleForHreflang)
    .map(item => ({ hreflang: item.locale, href: item.href }));

  return {
    robots: 'index,follow',
    canonical,
    alternates,
    sitemapEligible: true,
    localizedRouteActive: true,
  };
}
