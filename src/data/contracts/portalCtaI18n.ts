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
