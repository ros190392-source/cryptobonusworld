import countriesJson from '../countries.json';
import {
  COUNTRY_SLUG_TO_ISO,
  SUPPORTED_COUNTRY_CODES,
  normalizeCountryInput,
} from '../contracts/countryInput';
import {
  parseStoredCountryContext,
  resolveCountryContext,
  serializeStoredCountryContext,
} from '../contracts/countryContext';

export interface HeaderCountryOption {
  code: string | 'global';
  slug: string;
  name: string;
  shortName: string;
  flag: string;
}

interface CountryRecord {
  name?: unknown;
  slug?: unknown;
  flag?: unknown;
}

function isoFlag(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return '🌍';
  return [...code]
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

const IDENTITY_NAME_FALLBACKS: Readonly<Record<string, string>> = Object.freeze({
  PL: 'Poland',
  KZ: 'Kazakhstan',
});

const countryRecords = Array.isArray(countriesJson)
  ? (countriesJson as CountryRecord[])
  : [];

const recordByCode = new Map<string, CountryRecord>();
for (const record of countryRecords) {
  if (typeof record?.slug !== 'string') continue;
  if (record.slug === 'global') {
    recordByCode.set('global', record);
    continue;
  }
  const code = COUNTRY_SLUG_TO_ISO[record.slug];
  if (code) recordByCode.set(code, record);
}

function countryOption(code: string): HeaderCountryOption {
  const record = recordByCode.get(code);
  const name = typeof record?.name === 'string' && record.name.trim()
    ? record.name.trim()
    : IDENTITY_NAME_FALLBACKS[code] ?? code;
  const flag = typeof record?.flag === 'string' && record.flag.trim()
    ? record.flag.trim()
    : isoFlag(code);
  const slug = Object.entries(COUNTRY_SLUG_TO_ISO)
    .find(([, iso]) => iso === code)?.[0] ?? code.toLowerCase();
  return Object.freeze({ code, slug, name, shortName: code, flag });
}

const globalRecord = recordByCode.get('global');
const GLOBAL_COUNTRY: HeaderCountryOption = Object.freeze({
  code: 'global',
  slug: 'global',
  name: 'General',
  shortName: 'General',
  flag: typeof globalRecord?.flag === 'string' && globalRecord.flag.trim()
    ? globalRecord.flag.trim()
    : '🌍',
});

export const HEADER_COUNTRIES: readonly HeaderCountryOption[] = Object.freeze([
  GLOBAL_COUNTRY,
  ...SUPPORTED_COUNTRY_CODES.map(countryOption).sort((a, b) => a.name.localeCompare(b.name, 'en')),
]);

export function findHeaderCountry(code: unknown): HeaderCountryOption {
  if (code === 'global' || code === null || code === undefined) return GLOBAL_COUNTRY;
  if (typeof code !== 'string') return GLOBAL_COUNTRY;
  return HEADER_COUNTRIES.find((entry) => entry.code === code) ?? GLOBAL_COUNTRY;
}

export function parseCloudflareTraceCountry(trace: unknown): string | null {
  if (typeof trace !== 'string') return null;
  const locLines = trace
    .split(/\r?\n/)
    .filter((line) => line.startsWith('loc='));
  if (locLines.length !== 1) return null;
  const code = locLines[0]!.slice(4).trim();
  const normalized = normalizeCountryInput(code);
  return normalized.state === 'valid' ? normalized.code : null;
}

export interface HeaderCountryDecision {
  country: HeaderCountryOption;
  source: 'manual' | 'ip' | 'global' | 'invalid_storage';
}

export function resolveHeaderCountry(input: {
  storedRaw?: unknown;
  ipCountryCode?: unknown;
}): HeaderCountryDecision {
  const storedPresent = typeof input.storedRaw === 'string' && input.storedRaw.length > 0;

  if (storedPresent) {
    const parsed = parseStoredCountryContext(input.storedRaw);
    if (!parsed) {
      const failed = resolveCountryContext({ explicitOverride: '__invalid__', proposedCountry: input.ipCountryCode });
      return {
        country: findHeaderCountry(failed.countryCode),
        source: 'invalid_storage',
      };
    }
    const manual = resolveCountryContext({ explicitOverride: parsed.country });
    return {
      country: findHeaderCountry(manual.countryCode),
      source: 'manual',
    };
  }

  const proposed = resolveCountryContext({ proposedCountry: input.ipCountryCode });
  if (proposed.context === 'country' && proposed.countryCode) {
    return { country: findHeaderCountry(proposed.countryCode), source: 'ip' };
  }
  return { country: GLOBAL_COUNTRY, source: 'global' };
}

export function serializeHeaderCountrySelection(code: unknown): string | null {
  return serializeStoredCountryContext(code === 'global' ? 'global' : code);
}

export const HEADER_LANGUAGE_STORAGE_KEY = 'cbw_language_preference_v1';
export const HEADER_LANGUAGE_STORAGE_VERSION = 1 as const;

export interface HeaderLanguageOption {
  code: 'en' | 'ru' | 'pl' | 'uk' | 'kk';
  shortLabel: string;
  label: string;
}

export const HEADER_LANGUAGES: readonly HeaderLanguageOption[] = Object.freeze([
  Object.freeze({ code: 'en', shortLabel: 'EN', label: 'English' }),
  Object.freeze({ code: 'ru', shortLabel: 'RU', label: 'Русский' }),
  Object.freeze({ code: 'pl', shortLabel: 'PL', label: 'Polski' }),
  Object.freeze({ code: 'uk', shortLabel: 'UK', label: 'Українська' }),
  Object.freeze({ code: 'kk', shortLabel: 'KK', label: 'Қазақша' }),
]);

export type HeaderLanguageCode = HeaderLanguageOption['code'];

export interface StoredHeaderLanguageV1 {
  v: typeof HEADER_LANGUAGE_STORAGE_VERSION;
  language: HeaderLanguageCode;
}

function normalizeLanguage(value: unknown): HeaderLanguageCode | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const base = value.trim().toLowerCase().split('-')[0];
  return HEADER_LANGUAGES.some((entry) => entry.code === base)
    ? (base as HeaderLanguageCode)
    : null;
}

export function parseStoredHeaderLanguage(raw: unknown): StoredHeaderLanguageV1 | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  if (Object.keys(record).some((key) => key !== 'v' && key !== 'language')) return null;
  if (record.v !== HEADER_LANGUAGE_STORAGE_VERSION) return null;
  const language = normalizeLanguage(record.language);
  if (!language) return null;
  return Object.freeze({ v: HEADER_LANGUAGE_STORAGE_VERSION, language });
}

export function serializeHeaderLanguage(language: unknown): string | null {
  const normalized = normalizeLanguage(language);
  if (!normalized) return null;
  return JSON.stringify({ v: HEADER_LANGUAGE_STORAGE_VERSION, language: normalized });
}

export interface HeaderLanguageDecision {
  language: HeaderLanguageOption;
  source: 'manual' | 'browser' | 'fallback' | 'invalid_storage';
}

function languageOption(code: HeaderLanguageCode): HeaderLanguageOption {
  return HEADER_LANGUAGES.find((entry) => entry.code === code) ?? HEADER_LANGUAGES[0]!;
}

export function resolveHeaderLanguage(input: {
  storedRaw?: unknown;
  browserLanguages?: readonly unknown[];
}): HeaderLanguageDecision {
  const storedPresent = typeof input.storedRaw === 'string' && input.storedRaw.length > 0;
  if (storedPresent) {
    const parsed = parseStoredHeaderLanguage(input.storedRaw);
    if (!parsed) return { language: HEADER_LANGUAGES[0]!, source: 'invalid_storage' };
    return { language: languageOption(parsed.language), source: 'manual' };
  }

  for (const candidate of input.browserLanguages ?? []) {
    const normalized = normalizeLanguage(candidate);
    if (normalized) return { language: languageOption(normalized), source: 'browser' };
  }
  return { language: HEADER_LANGUAGES[0]!, source: 'fallback' };
}
