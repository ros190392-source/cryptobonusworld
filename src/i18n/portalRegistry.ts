export type LocaleCode = 'en' | 'pl' | 'ru' | 'uk';
export type CountryCode = 'KZ' | 'PL' | 'DE' | 'BR';
export type RegistryState = 'public' | 'foundation' | 'planned';

export interface LocaleRecord {
  code: LocaleCode;
  label: string;
  nativeLabel: string;
  state: RegistryState;
  direction: 'ltr';
  uiCoverage: 'complete' | 'partial' | 'none';
  contentCoverage: 'complete' | 'partial' | 'none';
}

export interface CountryRecord {
  code: CountryCode;
  slug: string;
  label: string;
  flag: string;
  state: RegistryState;
  primaryCurrencies: string[];
  presentationLocales: LocaleCode[];
}

export const localeRegistry: Record<LocaleCode, LocaleRecord> = {
  en: {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    state: 'public',
    direction: 'ltr',
    uiCoverage: 'complete',
    contentCoverage: 'complete',
  },
  pl: {
    code: 'pl',
    label: 'Polish',
    nativeLabel: 'Polski',
    state: 'foundation',
    direction: 'ltr',
    uiCoverage: 'partial',
    contentCoverage: 'none',
  },
  ru: {
    code: 'ru',
    label: 'Russian',
    nativeLabel: 'Русский',
    state: 'foundation',
    direction: 'ltr',
    uiCoverage: 'partial',
    contentCoverage: 'none',
  },
  uk: {
    code: 'uk',
    label: 'Ukrainian',
    nativeLabel: 'Українська',
    state: 'foundation',
    direction: 'ltr',
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
    state: 'foundation',
    primaryCurrencies: ['KZT'],
    presentationLocales: ['en', 'ru'],
  },
  PL: {
    code: 'PL',
    slug: 'poland',
    label: 'Poland',
    flag: '🇵🇱',
    state: 'foundation',
    primaryCurrencies: ['PLN'],
    presentationLocales: ['en', 'pl', 'ru', 'uk'],
  },
  DE: {
    code: 'DE',
    slug: 'germany',
    label: 'Germany',
    flag: '🇩🇪',
    state: 'planned',
    primaryCurrencies: ['EUR'],
    presentationLocales: ['en'],
  },
  BR: {
    code: 'BR',
    slug: 'brazil',
    label: 'Brazil',
    flag: '🇧🇷',
    state: 'planned',
    primaryCurrencies: ['BRL'],
    presentationLocales: ['en'],
  },
};

export function getLocale(code: LocaleCode): LocaleRecord {
  return localeRegistry[code];
}

export function getCountry(code: CountryCode): CountryRecord {
  return countryRegistry[code];
}

export function isLocalePublic(code: LocaleCode): boolean {
  const locale = getLocale(code);
  return locale.state === 'public'
    && locale.uiCoverage === 'complete'
    && locale.contentCoverage === 'complete';
}

export function isCountryPublic(code: CountryCode): boolean {
  return getCountry(code).state === 'public';
}
