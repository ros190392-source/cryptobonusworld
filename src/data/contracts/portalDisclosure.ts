/**
 * Evidence-disclosure contract.
 *
 * Produces a compact, localized, fail-closed disclosure model for a product
 * surface (freshness, evidence state, affiliate relationship, methodology link).
 *
 * Single-record provenance (R4): machine-backed disclosure consumes exactly ONE
 * canonical EvidenceMetadata record plus an explicit clock. The checked display,
 * semantic datetime, evidence state, and evidence Source link are ALL derived
 * from that one record — a caller can no longer pair a human "checked" label
 * with an unrelated source URL. A separately-named NON-evidence reference (e.g.
 * an "Official offer page") may be carried, but it is never presented as the
 * source backing the checked timestamp.
 *
 * Evidence state overrides tone (R5): an entry whose editorial tone is
 * `verified` but whose machine evidence is stale / overdue / invalid / missing
 * must never claim, visually or textually, that its evidence is current. The
 * displayed status label is driven by the evidence state whenever it is not
 * `current`.
 */
import type { CtaLocale } from './portalCta';
import { pickLocalized, type LocalizedText } from './portalCtaI18n';
import { isInternalPath } from './internalPath';
import {
  type EvidenceMetadata,
  type CheckedDisplayState,
  deriveCheckedDisplay,
  validateEvidenceMetadata,
} from './evidenceMetadata';

/** Canonical exchange identity (CBW: evidence.exchangeId === exchange slug). */
const CANONICAL_SLUG = /^[a-z0-9][a-z0-9-]*$/;

export type DisclosureTone = 'verified' | 'preview' | 'research' | 'review' | 'missing';

export interface DisclosureInput {
  tone: DisclosureTone | string;
  /**
   * The ONE canonical machine evidence record (or null when under
   * re-verification). ALL factual freshness — checked date, semantic datetime,
   * evidence state, evidence Source link — derives from this single record.
   */
  evidence?: EvidenceMetadata | null;
  /** Explicit clock (epoch ms) for deriving the evidence state. */
  now?: number;
  /**
   * Expected canonical exchange slug for an exchange-specific disclosure (R10).
   * When supplied, the evidence must belong to this exchange
   * (`evidence.exchangeId === expectedExchangeId`) or it is treated as invalid —
   * no checked date, no evidence Source. A malformed expected identity also fails
   * closed. Omit for non-exchange (generic) disclosures.
   */
  expectedExchangeId?: string;
  /** Whether the row's primary CTA is a live affiliate action. */
  isAffiliate: boolean;
  /** Internal methodology/evidence route (must be a local path ending in '/'). */
  methodologyHref: string;
  /**
   * OPTIONAL separately-named non-evidence reference (e.g. the exchange's
   * official offer page). Shown only when a real HTTPS URL. It is NEVER
   * presented as the source backing the checked timestamp.
   */
  officialHref?: string;
}

export interface DisclosureModel {
  tone: DisclosureTone;
  toneLabel: string;
  /** Evidence freshness state derived from the ONE evidence record. */
  evidenceState: CheckedDisplayState;
  /**
   * The status label the UI shows: the tone label when evidence is `current`,
   * otherwise the localized evidence-state label (so a verified tone can never
   * present stale/overdue/invalid/missing evidence as current).
   */
  statusLabel: string;
  checkedLabel: string;
  /** Derived checked display; null for `none`/`invalid` states (never fabricated). */
  lastChecked: string | null;
  /** Exact ISO instant for semantic `<time datetime>`; null unless machine-backed. */
  lastCheckedIso: string | null;
  sourceLabel: string;
  /** Evidence Source URL — from the SAME record; null unless evidence is valid. */
  sourceHref: string | null;
  /** Localized label for the separate non-evidence official reference. */
  officialLabel: string;
  /** Non-evidence official reference URL; null unless a real HTTPS URL. */
  officialHref: string | null;
  /** Localized affiliate disclosure, or null when the CTA is not affiliate. */
  affiliateNote: string | null;
  methodologyLabel: string;
  methodologyHref: string;
  /** Compact one-line summary for the collapsed state. */
  summary: string;
}

const TONES: DisclosureTone[] = ['verified', 'preview', 'research', 'review', 'missing'];
const HTTPS_PATTERN = /^https:\/\/[^\s]+$/i;

const toneLabels: Record<DisclosureTone, LocalizedText> = {
  verified: { en: 'Verified evidence', ru: 'Проверенные данные', kk: 'Тексерілген дәлелдер' },
  preview: { en: 'Public preview', ru: 'Публичный предпросмотр', kk: 'Ашық алдын ала қарау' },
  research: { en: 'Country research complete', ru: 'Исследование по стране завершено', kk: 'Ел бойынша зерттеу аяқталды' },
  review: { en: 'Re-verification in progress', ru: 'Идёт перепроверка', kk: 'Қайта тексеру жүріп жатыр' },
  missing: { en: 'Evidence pending', ru: 'Данные готовятся', kk: 'Дәлелдер дайындалуда' },
};

/** Localized evidence-state labels (R5). `current` falls back to the tone label. */
const evidenceStateLabels: Record<Exclude<CheckedDisplayState, 'current'>, LocalizedText> = {
  none: { en: 'Under re-verification', ru: 'На перепроверке', kk: 'Қайта тексерілуде' },
  invalid: { en: 'Evidence invalid — under review', ru: 'Данные недействительны — на проверке', kk: 'Дәлелдер жарамсыз — тексерілуде' },
  stale: { en: 'Evidence stale', ru: 'Данные устарели', kk: 'Дәлелдер ескірген' },
  overdue: { en: 'Review overdue', ru: 'Проверка просрочена', kk: 'Тексеру мерзімі өтті' },
};

const checkedText: LocalizedText = { en: 'Checked', ru: 'Проверено', kk: 'Тексерілген' };
const sourceText: LocalizedText = { en: 'Source', ru: 'Источник', kk: 'Дереккөз' };
const officialText: LocalizedText = { en: 'Official offer page', ru: 'Официальная страница предложения', kk: 'Ресми ұсыныс беті' };
const methodologyText: LocalizedText = { en: 'How we verify', ru: 'Как мы проверяем', kk: 'Қалай тексереміз' };
const affiliateText: LocalizedText = {
  en: 'Affiliate link — we may earn a commission.',
  ru: 'Партнёрская ссылка — мы можем получить комиссию.',
  kk: 'Серіктестік сілтеме — біз комиссия алуымыз мүмкін.',
};

/** Resolve a fail-closed, localized disclosure model from ONE evidence record. */
export function resolveDisclosure(input: DisclosureInput, locale: CtaLocale = 'en'): DisclosureModel {
  if (!isInternalPath(input.methodologyHref)) {
    throw new Error('Disclosure methodology href must be a normalized internal path ending with a slash (never affiliate or protocol-relative).');
  }

  // Unknown/absent tone fails closed to 'missing' (no confident claim).
  const tone: DisclosureTone = (TONES as string[]).includes(input.tone) ? (input.tone as DisclosureTone) : 'missing';

  // Evidence state + derived checked display come from the ONE record. A live
  // decision uses an explicit finite clock; without one, state cannot claim
  // 'current' (deriveCheckedDisplay downgrades to 'stale').
  const nowMs = typeof input.now === 'number' ? input.now : NaN;
  const evidence = input.evidence ?? null;

  // Validate ONCE and use the NORMALIZED validated value everywhere (R12).
  const validation = evidence !== null ? validateEvidenceMetadata(evidence) : null;
  const meta: EvidenceMetadata | null = validation && validation.ok && validation.value ? validation.value : null;

  // Subject-identity binding (R10): an exchange-specific disclosure requires the
  // evidence to belong to the expected exchange. A malformed expected identity,
  // a missing evidence.exchangeId, or a mismatch all fail closed (invalid) —
  // OKX evidence can never back a Bybit row.
  let identityFail = false;
  if (input.expectedExchangeId !== undefined) {
    const expected = input.expectedExchangeId;
    identityFail = typeof expected !== 'string' || !CANONICAL_SLUG.test(expected)
      || meta === null || meta.exchangeId !== expected;
  }

  // Checked display: null evidence → 'none'; invalid or identity-failed → 'invalid'
  // (no date); otherwise derived from the exact machine timestamp.
  const checked = evidence === null || evidence === undefined
    ? { iso: null, display: null, state: 'none' as CheckedDisplayState }
    : (meta === null || identityFail)
      ? { iso: null, display: null, state: 'invalid' as CheckedDisplayState }
      : deriveCheckedDisplay(meta, nowMs, locale);

  // Evidence Source link: only when the record validates AND belongs to the row.
  // It is the record's own (normalized) sourceUrl, never an unrelated value.
  const sourceHref = meta !== null && !identityFail ? meta.sourceUrl : null;

  // Separate non-evidence official reference (never the checked-timestamp source).
  const officialHref = typeof input.officialHref === 'string' && HTTPS_PATTERN.test(input.officialHref.trim())
    ? input.officialHref.trim()
    : null;

  const toneLabel = pickLocalized(toneLabels[tone], locale, `disclosure tone ${tone}`);
  const statusLabel = checked.state === 'current'
    ? toneLabel
    : pickLocalized(evidenceStateLabels[checked.state], locale, `evidence state ${checked.state}`);

  const checkedLabel = pickLocalized(checkedText, locale, 'checked');
  const summary = checked.display
    ? `${statusLabel} · ${checkedLabel}: ${checked.display}`
    : statusLabel;

  return {
    tone,
    toneLabel,
    evidenceState: checked.state,
    statusLabel,
    checkedLabel,
    lastChecked: checked.display,
    lastCheckedIso: checked.iso,
    sourceLabel: pickLocalized(sourceText, locale, 'source'),
    sourceHref,
    officialLabel: pickLocalized(officialText, locale, 'official'),
    officialHref,
    affiliateNote: input.isAffiliate ? pickLocalized(affiliateText, locale, 'affiliate') : null,
    methodologyLabel: pickLocalized(methodologyText, locale, 'methodology'),
    methodologyHref: input.methodologyHref,
    summary,
  };
}
