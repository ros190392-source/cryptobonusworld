import countriesJson from '../countries.json';
import {
  COUNTRY_SLUG_TO_ISO,
  SUPPORTED_COUNTRY_CODES,
} from '../contracts/countryInput';

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
  BG: 'Bulgaria',
});

const records = Array.isArray(countriesJson)
  ? (countriesJson as CountryRecord[])
  : [];

const recordByCode = new Map<string, CountryRecord>();
for (const record of records) {
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
export const HEADER_GLOBAL_COUNTRY: HeaderCountryOption = Object.freeze({
  code: 'global',
  slug: 'global',
  name: 'General',
  shortName: 'General',
  flag: typeof globalRecord?.flag === 'string' && globalRecord.flag.trim()
    ? globalRecord.flag.trim()
    : '🌍',
});

export const HEADER_COUNTRIES: readonly HeaderCountryOption[] = Object.freeze([
  HEADER_GLOBAL_COUNTRY,
  ...SUPPORTED_COUNTRY_CODES.map(countryOption).sort((a, b) => a.name.localeCompare(b.name, 'en')),
]);
