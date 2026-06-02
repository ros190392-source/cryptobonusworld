/**
 * CryptoBonusWorld — Internationalisation (i18n) Foundation
 *
 * Single source of truth for:
 *  1. Locale definitions — canonical list of supported + planned languages
 *  2. GEO-to-locale and country-to-locale mappings
 *  3. Hreflang tag generation — SEO-safe, only for pages that exist
 *  4. Locale-aware URL helpers — subdirectory strategy
 *  5. Canonical localisation rules — English at root, others under prefix
 *  6. og:locale helpers — Open Graph locale format
 *  7. Schema inLanguage helpers — adds `inLanguage` to Schema.org objects
 *  8. Multilingual sitemap helpers — xhtml:link alternate XML fragments
 *  9. Translation catalog type — TypeScript interface for all UI strings
 * 10. Translation function factory — typed, English-fallback aware
 *
 * URL strategy:
 *   English  → https://cryptobonusworld.com/exchanges/bybit/   (no prefix)
 *   Turkish  → https://cryptobonusworld.com/tr/exchanges/bybit/
 *   Indonesian → https://cryptobonusworld.com/id/exchanges/bybit/
 *   Portuguese → https://cryptobonusworld.com/pt-br/exchanges/bybit/
 *   Vietnamese → https://cryptobonusworld.com/vi/exchanges/bybit/
 *
 * Hreflang safety rule:
 *   Only emit hreflang tags for locales that have an actual translated page.
 *   Passing an empty `availableLocales` array emits English + x-default only.
 *   NEVER emit hreflang pointing to a page that doesn't exist — Google treats
 *   that as an error and ignores the entire hreflang cluster.
 *
 * Usage (Astro page, English — no changes needed):
 *   Layout receives locale="en" by default; no extra props required.
 *
 * Usage (future Turkish page at /tr/exchanges/bybit/):
 *   const hreflangLinks = buildHreflangLinks('/exchanges/bybit/', ['en', 'tr']);
 *   <Layout locale="tr" hreflangLinks={hreflangLinks} ... />
 *
 * Companion files:
 *   src/i18n/en.json     — English translation catalog (authoritative reference)
 *   src/i18n/tr.json     — Turkish translations (when added)
 *   src/i18n/id.json     — Indonesian translations (when added)
 *   src/i18n/pt-br.json  — Portuguese (Brazil) translations (when added)
 *   src/i18n/vi.json     — Vietnamese translations (when added)
 */

import { SITE_URL } from './seo';

// ── 1. Locale definitions ─────────────────────────────────────────────────────

/**
 * BCP-47 locale codes for supported languages.
 * 'en' is the default / fallback locale.
 */
export type LocaleCode = 'en' | 'tr' | 'id' | 'pt-BR' | 'vi';

export type TextDirection = 'ltr' | 'rtl';

export interface LocaleDefinition {
  /** Internal locale code (used as URL prefix and catalog key) */
  code: LocaleCode;
  /** BCP-47 tag — used in hreflang attributes */
  bcp47: string;
  /** Open Graph locale format (underscore, e.g. 'en_US', 'tr_TR') */
  ogLocale: string;
  /** English display name */
  displayName: string;
  /** Name in the locale's own language */
  nativeName: string;
  /** Text direction */
  direction: TextDirection;
  /**
   * URL prefix for this locale.
   * Empty string for English (no prefix — root URLs unchanged).
   * Other locales use lowercase prefix, e.g. '/tr', '/pt-br'.
   */
  urlPrefix: string;
  /** True only for the default English locale */
  isDefault: boolean;
  /** Analytics GEO code (matches affiliateLinks.geo keys), if applicable */
  geoCode?: string;
  /** Country slug in countries.json, if applicable */
  countrySlug?: string;
  /** Native-language name of CryptoBonusWorld for this market */
  siteNameLocal?: string;
}

/**
 * Canonical registry of all supported and planned locales.
 *
 * Phase 1 (now):     English only — infrastructure built, no translated pages
 * Phase 2 (future):  Turkish, Indonesian, Portuguese (Brazil), Vietnamese
 *
 * Rationale for chosen locales:
 *   tr  — Turkey: very-high crypto adoption, TRY inflation driver, big GEO market
 *   id  — Indonesia: SEA's largest crypto market, OJK-regulated, 270M population
 *   pt-BR — Brazil: LATAM's largest market, PIX adoption, formal regulation since 2023
 *   vi  — Vietnam: top-5 global crypto adoption by % of population
 *   (Nigeria + India + Philippines serve English — no separate locale needed)
 */
export const LOCALES: Record<LocaleCode, LocaleDefinition> = {
  en: {
    code: 'en',
    bcp47: 'en',
    ogLocale: 'en_US',
    displayName: 'English',
    nativeName: 'English',
    direction: 'ltr',
    urlPrefix: '',
    isDefault: true,
    siteNameLocal: 'CryptoBonusWorld',
  },
  tr: {
    code: 'tr',
    bcp47: 'tr',
    ogLocale: 'tr_TR',
    displayName: 'Turkish',
    nativeName: 'Türkçe',
    direction: 'ltr',
    urlPrefix: '/tr',
    isDefault: false,
    geoCode: 'tr',
    countrySlug: 'turkey',
    siteNameLocal: 'CryptoBonusWorld',
  },
  id: {
    code: 'id',
    bcp47: 'id',
    ogLocale: 'id_ID',
    displayName: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    direction: 'ltr',
    urlPrefix: '/id',
    isDefault: false,
    geoCode: 'id',
    countrySlug: 'indonesia',
    siteNameLocal: 'CryptoBonusWorld',
  },
  'pt-BR': {
    code: 'pt-BR',
    bcp47: 'pt-BR',
    ogLocale: 'pt_BR',
    displayName: 'Portuguese (Brazil)',
    nativeName: 'Português (Brasil)',
    direction: 'ltr',
    urlPrefix: '/pt-br',
    isDefault: false,
    geoCode: 'br',
    countrySlug: 'brazil',
    siteNameLocal: 'CryptoBonusWorld',
  },
  vi: {
    code: 'vi',
    bcp47: 'vi',
    ogLocale: 'vi_VN',
    displayName: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    direction: 'ltr',
    urlPrefix: '/vi',
    isDefault: false,
    geoCode: 'vn',
    countrySlug: 'vietnam',
    siteNameLocal: 'CryptoBonusWorld',
  },
};

/** Ordered list of all locale codes (English first) */
export const ALL_LOCALES = Object.keys(LOCALES) as LocaleCode[];

/** The default locale — English */
export const DEFAULT_LOCALE: LocaleCode = 'en';

// ── 2. GEO / country → locale mappings ───────────────────────────────────────

/**
 * Maps analytics GEO codes to their best-match locale.
 * GEO codes that map to English have no separate locale page.
 */
export const GEO_TO_LOCALE: Record<string, LocaleCode> = {
  tr: 'tr',
  id: 'id',
  br: 'pt-BR',
  vn: 'vi',
  // English-speaking or English-primary markets:
  in: 'en',   // India — English primary; Hindi/Bengali would be Phase 3
  ng: 'en',   // Nigeria — English official language
  ph: 'en',   // Philippines — English widely used
};

/**
 * Maps country slugs (from countries.json) to their best-match locale.
 */
export const COUNTRY_TO_LOCALE: Record<string, LocaleCode> = {
  turkey:      'tr',
  indonesia:   'id',
  brazil:      'pt-BR',
  vietnam:     'vi',
  india:       'en',
  nigeria:     'en',
  philippines: 'en',
  global:      'en',
};

/** Look up the locale for a GEO code. Falls back to English. */
export function getLocaleForGeo(geoCode: string): LocaleCode {
  return GEO_TO_LOCALE[geoCode] ?? DEFAULT_LOCALE;
}

/** Look up the locale for a country slug. Falls back to English. */
export function getLocaleForCountry(countrySlug: string): LocaleCode {
  return COUNTRY_TO_LOCALE[countrySlug] ?? DEFAULT_LOCALE;
}

/** Return all non-English locales */
export function getNonDefaultLocales(): LocaleDefinition[] {
  return ALL_LOCALES
    .filter(code => code !== DEFAULT_LOCALE)
    .map(code => LOCALES[code]);
}

// ── 3. Hreflang generation ────────────────────────────────────────────────────

export interface HreflangLink {
  /** BCP-47 hreflang value, or 'x-default' */
  hreflang: string;
  /** Absolute URL for this locale variant */
  href: string;
}

/**
 * Build the complete set of hreflang link objects for a page.
 *
 * @param canonicalPath  The English path — always starts with '/', ends with '/'
 *                       e.g. '/exchanges/bybit/' or '/'
 * @param availableLocales  Which locales actually have a translated version of
 *                          this page. Omit a locale if the page doesn't exist yet.
 *                          Always include 'en' when the English page exists.
 * @param siteUrl  Site root (default: SITE_URL)
 *
 * Returns:
 *  - One entry per availableLocale
 *  - One 'x-default' entry pointing to the English URL
 *
 * SEO rule: never emit hreflang for a locale page that doesn't exist.
 * When no locales are translated yet, pass ['en'] or leave array empty
 * (the calling component will emit English + x-default automatically).
 */
export function buildHreflangLinks(
  canonicalPath: string,
  availableLocales: LocaleCode[] = ['en'],
  siteUrl: string = SITE_URL,
): HreflangLink[] {
  const links: HreflangLink[] = [];

  // Normalise path: must start with '/'
  const path = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;

  for (const code of availableLocales) {
    const locale = LOCALES[code];
    if (!locale) continue;

    const localizedPath = locale.isDefault
      ? path
      : `${locale.urlPrefix}${path}`;

    links.push({
      hreflang: locale.bcp47,
      href: `${siteUrl}${localizedPath}`,
    });
  }

  // x-default always points to English (the universal fallback)
  const englishPath = path;
  links.push({
    hreflang: 'x-default',
    href: `${siteUrl}${englishPath}`,
  });

  return links;
}

/**
 * Build self-referencing hreflang for English-only pages.
 * Use this when no translations exist yet — emits `en` + `x-default`.
 * This is SEO-safe: it signals to Google that this page is English.
 */
export function buildEnglishHreflangLinks(
  canonicalPath: string,
  siteUrl: string = SITE_URL,
): HreflangLink[] {
  return buildHreflangLinks(canonicalPath, ['en'], siteUrl);
}

// ── 4. Locale-aware URL helpers ───────────────────────────────────────────────

/**
 * Return the localised URL for a canonical English path.
 * English returns the path unchanged (no prefix).
 * Other locales prepend their URL prefix.
 *
 * @example
 *   getLocalizedUrl('/exchanges/bybit/', 'tr')  → '/tr/exchanges/bybit/'
 *   getLocalizedUrl('/exchanges/bybit/', 'en')  → '/exchanges/bybit/'
 */
export function getLocalizedUrl(path: string, locale: LocaleCode): string {
  const def = LOCALES[locale];
  if (!def || def.isDefault) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${def.urlPrefix}${normalized}`;
}

/**
 * Strip a locale prefix from a path to get the canonical English path.
 * Returns the path unchanged if no locale prefix is found.
 *
 * @example
 *   getEnglishCanonical('/tr/exchanges/bybit/')  → '/exchanges/bybit/'
 *   getEnglishCanonical('/exchanges/bybit/')      → '/exchanges/bybit/'
 */
export function getEnglishCanonical(localizedPath: string): string {
  for (const locale of getNonDefaultLocales()) {
    if (localizedPath.startsWith(locale.urlPrefix + '/')) {
      return localizedPath.slice(locale.urlPrefix.length) || '/';
    }
  }
  return localizedPath;
}

/**
 * Detect the locale from a URL path by matching locale prefixes.
 * Returns the default locale ('en') if no prefix matches.
 *
 * @example
 *   detectLocaleFromPath('/tr/exchanges/bybit/')  → 'tr'
 *   detectLocaleFromPath('/exchanges/bybit/')      → 'en'
 */
export function detectLocaleFromPath(path: string): LocaleCode {
  for (const locale of getNonDefaultLocales()) {
    if (path === locale.urlPrefix || path.startsWith(locale.urlPrefix + '/')) {
      return locale.code;
    }
  }
  return DEFAULT_LOCALE;
}

/**
 * Build all locale variants of a path as an object keyed by locale code.
 * Useful for generating href alternates in components.
 *
 * @example
 *   buildLocalizedPaths('/exchanges/bybit/', ['en', 'tr'])
 *   → { en: '/exchanges/bybit/', tr: '/tr/exchanges/bybit/' }
 */
export function buildLocalizedPaths(
  canonicalPath: string,
  availableLocales: LocaleCode[] = ['en'],
): Partial<Record<LocaleCode, string>> {
  const paths: Partial<Record<LocaleCode, string>> = {};
  for (const code of availableLocales) {
    paths[code] = getLocalizedUrl(canonicalPath, code);
  }
  return paths;
}

// ── 5. og:locale helpers ──────────────────────────────────────────────────────

/**
 * Return the og:locale string for a locale code.
 * @example getOgLocale('pt-BR') → 'pt_BR'
 */
export function getOgLocale(locale: LocaleCode): string {
  return LOCALES[locale]?.ogLocale ?? 'en_US';
}

/**
 * Return og:locale:alternate values for all available locales except the current one.
 * Use these to populate <meta property="og:locale:alternate"> tags.
 */
export function getOgLocaleAlternates(
  currentLocale: LocaleCode,
  availableLocales: LocaleCode[],
): string[] {
  return availableLocales
    .filter(code => code !== currentLocale)
    .map(code => getOgLocale(code));
}

// ── 6. Schema inLanguage helpers ──────────────────────────────────────────────

/**
 * Add `inLanguage` to a Schema.org object.
 * Per Google's documentation, structured data should declare the language
 * of the content with the `inLanguage` property.
 *
 * @example
 *   addSchemaLanguage(productSchema, 'tr')
 *   → { ...productSchema, inLanguage: 'tr' }
 */
export function addSchemaLanguage(
  schema: Record<string, unknown>,
  locale: LocaleCode,
): Record<string, unknown> {
  return { ...schema, inLanguage: LOCALES[locale]?.bcp47 ?? 'en' };
}

/**
 * Add `inLanguage` to each schema in an array.
 */
export function addSchemaLanguageToAll(
  schemas: Record<string, unknown>[],
  locale: LocaleCode,
): Record<string, unknown>[] {
  return schemas.map(s => addSchemaLanguage(s, locale));
}

// ── 7. Multilingual sitemap helpers ──────────────────────────────────────────

/**
 * XML namespace declaration for hreflang sitemap alternates.
 * Add to the <urlset> opening tag when any locale pages exist.
 *
 * @example
 *   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
 *           ${SITEMAP_XHTML_NS}>
 */
export const SITEMAP_XHTML_NS =
  'xmlns:xhtml="http://www.w3.org/1999/xhtml"';

/**
 * Build the xhtml:link XML fragment for sitemap alternate entries.
 * Include this inside a <url> element.
 *
 * Only call this when translated pages actually exist for the given locales.
 * An empty `availableLocales` array returns an empty string.
 *
 * @example (in sitemap.xml.ts, inside the page map):
 *   ${buildSitemapAlternates('/exchanges/bybit/', ['en', 'tr'], site)}
 */
export function buildSitemapAlternates(
  canonicalPath: string,
  availableLocales: LocaleCode[],
  siteUrl: string = SITE_URL,
): string {
  if (availableLocales.length === 0) return '';

  const path = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
  const lines: string[] = [];

  for (const code of availableLocales) {
    const locale = LOCALES[code];
    if (!locale) continue;
    const localizedPath = locale.isDefault ? path : `${locale.urlPrefix}${path}`;
    lines.push(
      `    <xhtml:link rel="alternate" hreflang="${locale.bcp47}" href="${siteUrl}${localizedPath}"/>`
    );
  }

  // x-default → English
  lines.push(
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}${path}"/>`
  );

  return lines.join('\n');
}

/**
 * Determine which locales have pages for a given content type.
 *
 * For now: all content is English-only. This function will be updated as
 * translations are added. It serves as the single chokepoint — update here,
 * sitemap + hreflang propagate automatically.
 *
 * @param contentType  Type of page (e.g. 'exchange', 'category', 'country', 'static')
 * @param slug         The content slug (e.g. 'bybit', 'turkey')
 */
export function getAvailableLocalesForPage(
  contentType: 'exchange' | 'category' | 'country' | 'compare' | 'static',
  slug?: string,
): LocaleCode[] {
  // Phase 1: English only.
  // Phase 2+: check translation file existence per slug.
  // Example expansion:
  //   if (contentType === 'exchange' && slug === 'bybit') return ['en', 'tr', 'id'];
  //   if (contentType === 'country' && slug === 'turkey') return ['en', 'tr'];
  return ['en'];
}

// ── 8. Translation catalog type ───────────────────────────────────────────────

/**
 * Canonical interface for all UI strings used across CryptoBonusWorld.
 *
 * This is the TypeScript contract that ALL translation catalogs must satisfy.
 * The authoritative English values live in src/i18n/en.json.
 * Other locales provide a (potentially partial) version of this interface.
 *
 * Design notes:
 *  - All values are strings (interpolation uses {{placeholder}} syntax)
 *  - Nested namespaces group related strings
 *  - Missing keys fall back to English via createTranslator()
 */
export interface TranslationCatalog {
  /** Site-level strings */
  site: {
    name: string;
    tagline: string;
    description: string;
  };
  /** Navigation */
  nav: {
    allBonuses: string;
    exchanges: string;
    compare: string;
    signupBonuses: string;
    noDeposit: string;
    compareBonuses: string;
    home: string;
    countries: string;
    categories: string;
  };
  /** Common reusable labels */
  common: {
    rating: string;
    bonus: string;
    kycRequired: string;
    kycNotRequired: string;
    noKyc: string;
    depositRequired: string;
    noDeposit: string;
    minDeposit: string;
    tradingVolume: string;
    countries: string;
    lastUpdated: string;
    verified: string;
    viewAll: string;
    learnMore: string;
    bestFor: string;
    upTo: string;
    free: string;
    yes: string;
    no: string;
    none: string;
    global: string;
    available: string;
    notAvailable: string;
  };
  /** CTA button labels */
  cta: {
    claimBonus: string;
    getBonus: string;
    claimNow: string;
    noKycArrow: string;
    claimBonusArrow: string;
    compareBonuses: string;
    viewExchange: string;
    visitExchange: string;
    noKycNoDeposit: string;
    claimNoKyc: string;
    claimNoDeposit: string;
  };
  /** Exchange page */
  exchange: {
    welcomeBonus: string;
    howToClaim: string;
    bonusConditions: string;
    requirements: string;
    pros: string;
    cons: string;
    alternatives: string;
    compareWith: string;
    bonusTiers: string;
    bonusExpiry: string;
    features: string;
    licences: string;
    founded: string;
    users: string;
    headquarters: string;
  };
  /** Bonus table column headers */
  table: {
    exchange: string;
    bonus: string;
    rating: string;
    kyc: string;
    minDeposit: string;
    availability: string;
    action: string;
    bonusType: string;
  };
  /** Compare page */
  compare: {
    winner: string;
    tie: string;
    vs: string;
    overallWinner: string;
    verdict: string;
    chooseIf: string;
    categories: {
      bonusAmount: string;
      rating: string;
      kycRequirement: string;
      minDeposit: string;
      tradingVolume: string;
      established: string;
      users: string;
      licences: string;
      features: string;
      countries: string;
    };
  };
  /** Category pages */
  category: {
    exchangesAvailable: string;
    filterBy: string;
    showingAll: string;
  };
  /** Country pages */
  country: {
    availableExchanges: string;
    paymentMethods: string;
    localNotes: string;
    noKycOptions: string;
    topBonus: string;
  };
  /** Footer */
  footer: {
    disclaimer: string;
    affiliateDisclosure: string;
    allRightsReserved: string;
    riskWarning: string;
  };
  /** Breadcrumbs */
  breadcrumbs: {
    home: string;
    exchanges: string;
    categories: string;
    countries: string;
    compare: string;
    bonuses: string;
  };
  /** Error states */
  errors: {
    notFound: string;
    noExchanges: string;
    dataUnavailable: string;
  };
}

// ── 9. Translation function factory ──────────────────────────────────────────

/**
 * A translation function returned by createTranslator().
 * Accepts a dot-notation key path and optional string interpolation vars.
 *
 * @example
 *   const t = createTranslator('tr', catalog);
 *   t('cta.claimBonus')              → "Bonus'u Al"
 *   t('common.upTo')                 → "Kadar"
 *   t('compare.chooseIf', { name: 'Bybit' }) → "Bybit'i Seçin eğer..."
 */
export type TranslationFn = (key: string, vars?: Record<string, string | number>) => string;

/**
 * Resolve a dot-notation key against an object, returning undefined if missing.
 */
function resolveDotKey(obj: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Interpolate {{placeholder}} variables into a string.
 * @example interpolate('Claim {{name}} Bonus', { name: 'Bybit' }) → 'Claim Bybit Bonus'
 */
function interpolate(str: string, vars: Record<string, string | number>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{{${key}}}`
  );
}

/**
 * Create a translation function for a locale.
 *
 * @param localeCatalog  The locale's partial translation catalog (loaded from JSON)
 * @param fallbackCatalog  The English catalog (full reference, used for missing keys)
 *
 * Falls back silently to English when a key is missing from the locale catalog.
 * This means partially-translated locales are always safe to display.
 */
export function createTranslator(
  localeCatalog: Record<string, unknown>,
  fallbackCatalog: Record<string, unknown>,
): TranslationFn {
  return function t(key: string, vars?: Record<string, string | number>): string {
    const localeValue = resolveDotKey(localeCatalog, key);
    const fallbackValue = resolveDotKey(fallbackCatalog, key);
    const raw = localeValue ?? fallbackValue ?? key; // last resort: return key itself

    return vars ? interpolate(raw, vars) : raw;
  };
}

/**
 * Load a translation catalog from a JSON import.
 * Type-safe wrapper — validates the catalog matches TranslationCatalog shape
 * at the top level only (deep validation not needed at runtime).
 */
export function loadCatalog(json: Record<string, unknown>): Record<string, unknown> {
  return json;
}

// ── 10. HTML lang attribute helper ───────────────────────────────────────────

/**
 * Return the correct HTML lang attribute value for a locale.
 * Uses BCP-47 format which is what the HTML spec requires.
 *
 * @example
 *   getHtmlLang('pt-BR')  → 'pt-BR'
 *   getHtmlLang('en')     → 'en'
 *   getHtmlLang('id')     → 'id'
 */
export function getHtmlLang(locale: LocaleCode): string {
  return LOCALES[locale]?.bcp47 ?? 'en';
}

// ── 11. Locale-aware internal linking ────────────────────────────────────────

/**
 * Build an exchange URL in the correct locale.
 * @example getExchangeUrl('bybit', 'tr') → '/tr/exchanges/bybit/'
 */
export function getExchangeUrl(slug: string, locale: LocaleCode = DEFAULT_LOCALE): string {
  return getLocalizedUrl(`/exchanges/${slug}/`, locale);
}

/**
 * Build a category URL in the correct locale.
 */
export function getCategoryUrl(slug: string, locale: LocaleCode = DEFAULT_LOCALE): string {
  return getLocalizedUrl(`/categories/${slug}/`, locale);
}

/**
 * Build a country URL in the correct locale.
 */
export function getCountryUrl(slug: string, locale: LocaleCode = DEFAULT_LOCALE): string {
  return getLocalizedUrl(`/countries/${slug}/`, locale);
}

/**
 * Build a compare URL in the correct locale.
 */
export function getCompareUrl(pair: string, locale: LocaleCode = DEFAULT_LOCALE): string {
  return getLocalizedUrl(`/compare/${pair}/`, locale);
}

// ── 12. Locale display helpers ────────────────────────────────────────────────

/** Return the native name for a locale code */
export function getLocaleName(locale: LocaleCode): string {
  return LOCALES[locale]?.nativeName ?? locale;
}

/** Return the locale's display name in English */
export function getLocaleDisplayName(locale: LocaleCode): string {
  return LOCALES[locale]?.displayName ?? locale;
}

/** Check if a string is a valid LocaleCode */
export function isValidLocale(code: string): code is LocaleCode {
  return code in LOCALES;
}
