import {
  countryRegistry,
  getCountry,
  isCountryPublic,
  isLocalePublic,
  localeRegistry,
  type CountryCode,
  type LocaleCode,
} from './portalRegistry';

export type RouteMode = 'public' | 'review';
export type PortalPageKind = 'country' | 'country-ranking' | 'market-passport';

interface PortalRouteInput {
  locale: LocaleCode;
  country: CountryCode;
  page: PortalPageKind;
  exchangeSlug?: string;
  mode?: RouteMode;
}

function cleanSlug(value: string, label: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new Error(`${label} must be a lowercase URL slug`);
  }
  return normalized;
}

export function buildPortalRoute(input: PortalRouteInput): string {
  const mode = input.mode ?? 'public';
  const locale = localeRegistry[input.locale];
  const country = countryRegistry[input.country];

  if (!locale) throw new Error(`Unknown locale: ${input.locale}`);
  if (!country) throw new Error(`Unknown country: ${input.country}`);

  if (mode === 'public') {
    if (!isLocalePublic(input.locale)) {
      throw new Error(`Locale ${input.locale} is not publication-ready`);
    }
    if (!isCountryPublic(input.country)) {
      throw new Error(`Country ${input.country} is not publication-ready`);
    }
  }

  const localePrefix = input.locale === 'en' ? '' : `/${input.locale}`;
  const countryBase = `${localePrefix}/countries/${country.slug}`;

  if (input.page === 'country') return `${countryBase}/`;
  if (input.page === 'country-ranking') return `${countryBase}/exchanges/`;

  if (!input.exchangeSlug) {
    throw new Error('exchangeSlug is required for a market-passport route');
  }

  return `${countryBase}/exchanges/${cleanSlug(input.exchangeSlug, 'exchangeSlug')}/`;
}

export function buildReviewRoute(input: Omit<PortalRouteInput, 'mode'>): string {
  const publicShape = buildPortalRoute({ ...input, mode: 'review' });
  return `/__design/cbw-v2/route-preview${publicShape}`;
}

export function getLocaleAlternates(
  country: CountryCode,
  page: PortalPageKind,
  exchangeSlug?: string,
): Array<{ locale: LocaleCode; href: string; public: boolean }> {
  const countryRecord = getCountry(country);
  return countryRecord.presentationLocales.map(locale => ({
    locale,
    href: buildPortalRoute({ locale, country, page, exchangeSlug, mode: 'review' }),
    public: isLocalePublic(locale) && isCountryPublic(country),
  }));
}
