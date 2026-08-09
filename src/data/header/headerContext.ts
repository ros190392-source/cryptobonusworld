import { normalizeCountryInput } from '../contracts/countryInput';
import {
  parseStoredCountryContext,
  resolveCountryContext,
  serializeStoredCountryContext,
} from '../contracts/countryContext';

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
  countryCode: string | 'global';
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
        countryCode: failed.countryCode ?? 'global',
        source: 'invalid_storage',
      };
    }
    const manual = resolveCountryContext({ explicitOverride: parsed.country });
    return {
      countryCode: manual.countryCode ?? 'global',
      source: 'manual',
    };
  }

  const proposed = resolveCountryContext({ proposedCountry: input.ipCountryCode });
  if (proposed.context === 'country' && proposed.countryCode) {
    return { countryCode: proposed.countryCode, source: 'ip' };
  }
  return { countryCode: 'global', source: 'global' };
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
