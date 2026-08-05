/**
 * Localized CTA microcopy and gate-reason text (en / ru / kk).
 *
 * Keeps every user-facing CTA string inside one localization contract so the
 * public surfaces never hardcode shared-interface labels. Presentation language
 * is fully separated from the factual gate: switching locale changes only the
 * words, never approval / availability / offer-eligibility / evidence facts.
 *
 * Missing-translation policy (deterministic, fail-closed): a requested locale
 * falls back to English; a raw translation key is never shown. If even the
 * English base is missing that is a build-time contract error and throws.
 */
import type { CtaLocale } from './portalCta';

export type LocalizedText = Record<CtaLocale, string>;

/**
 * Deterministic locale pick: requested locale, else the English base.
 * Never returns empty or a raw key; throws only when the English base itself is
 * absent (a contract error surfaced at build time).
 */
export function pickLocalized(text: LocalizedText, locale: CtaLocale, keyForError = 'text'): string {
  const value = text[locale] ?? text.en;
  if (!value || !value.trim()) {
    throw new Error(`Missing localized ${keyForError}: no '${locale}' translation and no English fallback.`);
  }
  return value;
}

/** Human explanations for a withheld/limited commercial action, per gate reason. */
export const ctaGateReasonText: Record<string, LocalizedText> = {
  MARKET_RESTRICTED: {
    en: 'Not available in restricted regions',
    ru: 'Недоступно в ограниченных регионах',
    kk: 'Шектеулі аймақтарда қолжетімсіз',
  },
  MARKET_UNAVAILABLE: {
    en: 'Currently unavailable',
    ru: 'Сейчас недоступно',
    kk: 'Қазір қолжетімсіз',
  },
  EVIDENCE_STALE: {
    en: 'Evidence is being re-checked',
    ru: 'Данные перепроверяются',
    kk: 'Дәлелдер қайта тексерілуде',
  },
  OFFER_NOT_APPROVED: {
    en: 'Offer under review',
    ru: 'Предложение на проверке',
    kk: 'Ұсыныс тексерілуде',
  },
  AVAILABILITY_UNCONFIRMED: {
    en: 'Availability under review',
    ru: 'Доступность уточняется',
    kk: 'Қолжетімділік тексерілуде',
  },
  PREVIEW_MODE: {
    en: 'Preview — see review',
    ru: 'Превью — смотрите обзор',
    kk: 'Алдын ала қарау — шолуды көріңіз',
  },
  // ── Country-aware gate reasons (Split 3) ──
  COUNTRY_MISSING: {
    en: 'Select your country',
    ru: 'Выберите вашу страну',
    kk: 'Еліңізді таңдаңыз',
  },
  COUNTRY_GLOBAL: {
    en: 'Country not set — see review',
    ru: 'Страна не выбрана — смотрите обзор',
    kk: 'Ел таңдалмаған — шолуды көріңіз',
  },
  COUNTRY_MALFORMED: {
    en: 'Country not recognized',
    ru: 'Страна не распознана',
    kk: 'Ел танылмады',
  },
  COUNTRY_UNSUPPORTED: {
    en: 'Not reviewed for your country yet',
    ru: 'Пока не проверено для вашей страны',
    kk: 'Еліңіз үшін әлі тексерілмеген',
  },
  PROFILE_MISSING: {
    en: 'No country review yet',
    ru: 'Обзора по стране пока нет',
    kk: 'Ел бойынша шолу әлі жоқ',
  },
  PROFILE_CONFLICT: {
    en: 'Conflicting country data',
    ru: 'Противоречивые данные по стране',
    kk: 'Ел деректері қайшы келеді',
  },
  PROFILE_INVALID: {
    en: 'Country data invalid',
    ru: 'Данные по стране недействительны',
    kk: 'Ел деректері жарамсыз',
  },
  PROFILE_UNDER_REVIEW: {
    en: 'Country review in progress',
    ru: 'Идёт проверка по стране',
    kk: 'Ел бойынша тексеру жүріп жатыр',
  },
  RESTRICTION_DATA_INVALID: {
    en: 'Restriction data invalid',
    ru: 'Данные об ограничениях недействительны',
    kk: 'Шектеу деректері жарамсыз',
  },
  // ── Split 3 R1–R6 integrity reasons ──
  EXCHANGE_IDENTITY_MISMATCH: {
    en: 'Exchange identity mismatch',
    ru: 'Несовпадение идентификатора биржи',
    kk: 'Биржа сәйкестігі сәйкес емес',
  },
  OFFER_IDENTITY_MISMATCH: {
    en: 'Offer identity mismatch',
    ru: 'Несовпадение принадлежности предложения',
    kk: 'Ұсыныс сәйкестігі сәйкес емес',
  },
  RESTRICTION_DATA_MISSING: {
    en: 'Restriction data not confirmed',
    ru: 'Данные об ограничениях не подтверждены',
    kk: 'Шектеу деректері расталмаған',
  },
  CLOCK_INVALID: {
    en: 'Freshness clock unavailable',
    ru: 'Часы актуальности недоступны',
    kk: 'Жаңалық сағаты қолжетімсіз',
  },
  PROFILE_REVIEW_OVERDUE: {
    en: 'Country review overdue',
    ru: 'Проверка по стране просрочена',
    kk: 'Ел бойынша тексеру мерзімі өтті',
  },
  PROFILE_REGISTRY_INVALID: {
    en: 'Country data source invalid',
    ru: 'Источник данных по стране недействителен',
    kk: 'Ел деректер көзі жарамсыз',
  },
  // ── Offer evidence authorization reasons (Split 3, #250 R1/R2) ──
  OFFER_EVIDENCE_MISSING: {
    en: 'Offer evidence pending',
    ru: 'Данные по предложению готовятся',
    kk: 'Ұсыныс дәлелдері дайындалуда',
  },
  OFFER_EVIDENCE_INVALID: {
    en: 'Offer evidence invalid',
    ru: 'Данные по предложению недействительны',
    kk: 'Ұсыныс дәлелдері жарамсыз',
  },
  OFFER_EVIDENCE_IDENTITY_MISMATCH: {
    en: 'Offer evidence identity mismatch',
    ru: 'Несовпадение принадлежности данных предложения',
    kk: 'Ұсыныс дәлелдерінің сәйкестігі сәйкес емес',
  },
  OFFER_EVIDENCE_FUTURE: {
    en: 'Offer evidence date invalid',
    ru: 'Дата данных предложения недействительна',
    kk: 'Ұсыныс дәлелдерінің күні жарамсыз',
  },
  OFFER_EVIDENCE_STALE: {
    en: 'Offer evidence is being re-checked',
    ru: 'Данные по предложению перепроверяются',
    kk: 'Ұсыныс дәлелдері қайта тексерілуде',
  },
  OFFER_EVIDENCE_REVIEW_OVERDUE: {
    en: 'Offer review overdue',
    ru: 'Проверка предложения просрочена',
    kk: 'Ұсынысты тексеру мерзімі өтті',
  },
};

/** Short CTA microcopy fragments. */
export const ctaMicrocopy: Record<'opensNewTab' | 'loading' | 'unavailable', LocalizedText> = {
  opensNewTab: {
    en: 'opens in a new tab',
    ru: 'откроется в новой вкладке',
    kk: 'жаңа қойындыда ашылады',
  },
  loading: {
    en: 'Opening…',
    ru: 'Открываем…',
    kk: 'Ашылуда…',
  },
  unavailable: {
    en: 'Not available',
    ru: 'Недоступно',
    kk: 'Қолжетімсіз',
  },
};

/** Localized explanation for a gate reason, falling back to a generic label. */
export function gateReasonText(reason: string | null, locale: CtaLocale): string {
  if (!reason) return '';
  const text = ctaGateReasonText[reason];
  return text
    ? pickLocalized(text, locale, `gate reason ${reason}`)
    : pickLocalized(ctaMicrocopy.unavailable, locale, 'unavailable');
}
