/**
 * Evidence-disclosure contract.
 *
 * Produces a compact, localized, fail-closed disclosure model for a product
 * surface (freshness, evidence state, affiliate relationship, methodology link).
 * It exposes only supported information: a source link is shown only when it is
 * a real HTTPS URL, a checked date only when actually present — evidence is
 * never invented. An unknown/absent evidence state resolves to a clear
 * 'missing' disclosure rather than a confident-looking claim.
 */
import type { CtaLocale } from './portalCta';
import { pickLocalized, type LocalizedText } from './portalCtaI18n';

export type DisclosureTone = 'verified' | 'preview' | 'research' | 'review' | 'missing';

export interface DisclosureInput {
  tone: DisclosureTone | string;
  /** Human "last checked" label (e.g. "June 2026"); shown only when present. */
  lastChecked?: string;
  /** Public source URL; shown only when it is a real HTTPS URL. */
  sourceHref?: string;
  /** Whether the row's primary CTA is a live affiliate action. */
  isAffiliate: boolean;
  /** Internal methodology/evidence route (must be a local path ending in '/'). */
  methodologyHref: string;
}

export interface DisclosureModel {
  tone: DisclosureTone;
  toneLabel: string;
  checkedLabel: string;
  /** Null when no real checked date is available (never fabricated). */
  lastChecked: string | null;
  sourceLabel: string;
  /** Null unless a real HTTPS source URL was supplied. */
  sourceHref: string | null;
  /** Localized affiliate disclosure, or null when the CTA is not affiliate. */
  affiliateNote: string | null;
  methodologyLabel: string;
  methodologyHref: string;
  /** Compact one-line summary for the collapsed state. */
  summary: string;
}

const TONES: DisclosureTone[] = ['verified', 'preview', 'research', 'review', 'missing'];
const LOCAL_PATH_PATTERN = /^\/[a-z0-9/_-]*\/$/i;
const HTTPS_PATTERN = /^https:\/\/[^\s]+$/i;

const toneLabels: Record<DisclosureTone, LocalizedText> = {
  verified: { en: 'Verified evidence', ru: 'Проверенные данные', kk: 'Тексерілген дәлелдер' },
  preview: { en: 'Public preview', ru: 'Публичный предпросмотр', kk: 'Ашық алдын ала қарау' },
  research: { en: 'Country research complete', ru: 'Исследование по стране завершено', kk: 'Ел бойынша зерттеу аяқталды' },
  review: { en: 'Re-verification in progress', ru: 'Идёт перепроверка', kk: 'Қайта тексеру жүріп жатыр' },
  missing: { en: 'Evidence pending', ru: 'Данные готовятся', kk: 'Дәлелдер дайындалуда' },
};

const checkedText: LocalizedText = { en: 'Checked', ru: 'Проверено', kk: 'Тексерілген' };
const sourceText: LocalizedText = { en: 'Source', ru: 'Источник', kk: 'Дереккөз' };
const methodologyText: LocalizedText = { en: 'How we verify', ru: 'Как мы проверяем', kk: 'Қалай тексереміз' };
const affiliateText: LocalizedText = {
  en: 'Affiliate link — we may earn a commission.',
  ru: 'Партнёрская ссылка — мы можем получить комиссию.',
  kk: 'Серіктестік сілтеме — біз комиссия алуымыз мүмкін.',
};

/** Resolve a fail-closed, localized disclosure model. */
export function resolveDisclosure(input: DisclosureInput, locale: CtaLocale = 'en'): DisclosureModel {
  if (!LOCAL_PATH_PATTERN.test(input.methodologyHref)) {
    throw new Error('Disclosure methodology href must be a normalized local path ending with a slash.');
  }

  // Unknown/absent tone fails closed to 'missing' (no confident claim).
  const tone: DisclosureTone = (TONES as string[]).includes(input.tone) ? (input.tone as DisclosureTone) : 'missing';

  // Source link is exposed only for a real HTTPS URL — never invented.
  const sourceHref = typeof input.sourceHref === 'string' && HTTPS_PATTERN.test(input.sourceHref.trim())
    ? input.sourceHref.trim()
    : null;

  // Checked date shown only when actually present.
  const lastChecked = typeof input.lastChecked === 'string' && input.lastChecked.trim()
    ? input.lastChecked.trim()
    : null;

  const toneLabel = pickLocalized(toneLabels[tone], locale, `disclosure tone ${tone}`);
  const checkedLabel = pickLocalized(checkedText, locale, 'checked');
  const summary = lastChecked ? `${toneLabel} · ${checkedLabel}: ${lastChecked}` : toneLabel;

  return {
    tone,
    toneLabel,
    checkedLabel,
    lastChecked,
    sourceLabel: pickLocalized(sourceText, locale, 'source'),
    sourceHref,
    affiliateNote: input.isAffiliate ? pickLocalized(affiliateText, locale, 'affiliate') : null,
    methodologyLabel: pickLocalized(methodologyText, locale, 'methodology'),
    methodologyHref: input.methodologyHref,
    summary,
  };
}
