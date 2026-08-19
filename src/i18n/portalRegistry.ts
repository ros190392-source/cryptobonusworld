export type LocaleCode = 'en' | 'pl' | 'ru' | 'uk';
export type CountryCode = 'KZ' | 'PL' | 'DE' | 'BR';
export type RegistryState = 'public' | 'foundation' | 'planned';
export type LocalizedRouteState = 'inactive' | 'review' | 'approved' | 'active';

export interface LocaleRecord {
  code: LocaleCode;
  label: string;
  nativeLabel: string;
  direction: 'ltr';
  registryState: RegistryState;
  localizedRouteState: LocalizedRouteState;
  defaultLocale: boolean;
  routePrefix: string;
  uiCoverage: 'complete' | 'partial' | 'none';
  contentCoverage: 'complete' | 'partial' | 'none';
}

export interface CountryRecord {
  code: CountryCode;
  slug: string;
  label: string;
  flag: string;
  registryState: RegistryState;
  publicRouteAuthorized: boolean;
  primaryCurrencies: string[];
  presentationLocales: LocaleCode[];
}

export const localeRegistry: Record<LocaleCode, LocaleRecord> = {
  en: {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    direction: 'ltr',
    registryState: 'public',
    localizedRouteState: 'inactive',
    defaultLocale: true,
    routePrefix: '',
    uiCoverage: 'complete',
    contentCoverage: 'complete',
  },
  pl: {
    code: 'pl',
    label: 'Polish',
    nativeLabel: 'Polski',
    direction: 'ltr',
    registryState: 'foundation',
    localizedRouteState: 'inactive',
    defaultLocale: false,
    routePrefix: '/pl',
    uiCoverage: 'partial',
    contentCoverage: 'none',
  },
  ru: {
    code: 'ru',
    label: 'Russian',
    nativeLabel: 'Русский',
    direction: 'ltr',
    registryState: 'foundation',
    localizedRouteState: 'inactive',
    defaultLocale: false,
    routePrefix: '/ru',
    uiCoverage: 'partial',
    contentCoverage: 'none',
  },
  uk: {
    code: 'uk',
    label: 'Ukrainian',
    nativeLabel: 'Українська',
    direction: 'ltr',
    registryState: 'foundation',
    localizedRouteState: 'inactive',
    defaultLocale: false,
    routePrefix: '/uk',
    uiCoverage: 'partial',
    contentCoverage: 'none',
  },
};

export const countryRegistry: Record<CountryCode, CountryRecord> = {
  KZ: {
    code: 'KZ',
    slug: 'kazakhstan',
    label: 'Kazakhstan',
    flag: '🇰🇿',
    registryState: 'foundation',
    publicRouteAuthorized: false,
    primaryCurrencies: ['KZT'],
    presentationLocales: ['en', 'ru'],
  },
  PL: {
    code: 'PL',
    slug: 'poland',
    label: 'Poland',
    flag: '🇵🇱',
    registryState: 'foundation',
    publicRouteAuthorized: false,
    primaryCurrencies: ['PLN'],
    presentationLocales: ['en', 'pl', 'ru', 'uk'],
  },
  DE: {
    code: 'DE',
    slug: 'germany',
    label: 'Germany',
    flag: '🇩🇪',
    registryState: 'planned',
    publicRouteAuthorized: false,
    primaryCurrencies: ['EUR'],
    presentationLocales: ['en'],
  },
  BR: {
    code: 'BR',
    slug: 'brazil',
    label: 'Brazil',
    flag: '🇧🇷',
    registryState: 'planned',
    publicRouteAuthorized: false,
    primaryCurrencies: ['BRL'],
    presentationLocales: ['en'],
  },
};

export const localeCodes = Object.keys(localeRegistry) as LocaleCode[];
export const countryCodes = Object.keys(countryRegistry) as CountryCode[];

export function isLocaleCode(value: string): value is LocaleCode {
  return Object.prototype.hasOwnProperty.call(localeRegistry, value);
}

export function isCountryCode(value: string): value is CountryCode {
  return Object.prototype.hasOwnProperty.call(countryRegistry, value);
}

export function getLocale(code: LocaleCode): LocaleRecord {
  return localeRegistry[code];
}

export function getCountry(code: CountryCode): CountryRecord {
  return countryRegistry[code];
}

export function isLocalizedRouteActive(code: LocaleCode): boolean {
  return getLocale(code).localizedRouteState === 'active';
}

export function isDefaultEnglishStable(code: LocaleCode): boolean {
  const locale = getLocale(code);
  return locale.code === 'en'
    && locale.defaultLocale
    && locale.routePrefix === ''
    && locale.registryState === 'public'
    && locale.uiCoverage === 'complete'
    && locale.contentCoverage === 'complete';
}

export function isCountryRoutePublic(code: CountryCode): boolean {
  const country = getCountry(code);
  return country.registryState === 'public' && country.publicRouteAuthorized;
}

const defaultLocales = localeCodes.filter(code => localeRegistry[code].defaultLocale);
if (defaultLocales.length !== 1 || defaultLocales[0] !== 'en') {
  throw new Error('English must remain the only default locale.');
}

if (!isDefaultEnglishStable('en')) {
  throw new Error('English public routes must remain unprefixed and stable.');
}

if (localeCodes.some(code => localeRegistry[code].localizedRouteState === 'active')) {
  throw new Error('No localized route may be active in the i18n foundation package.');
}

if (countryCodes.some(code => countryRegistry[code].publicRouteAuthorized)) {
  throw new Error('No country route may be public in the i18n foundation package.');
}
