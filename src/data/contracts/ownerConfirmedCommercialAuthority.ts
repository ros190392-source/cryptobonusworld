/**
 * Owner-confirmed commercial link/code authority (Issue #269).
 *
 * This contract is intentionally independent from offer-claim evidence.
 * The owner confirmed on 2026-08-08 that the exact affiliate destinations and
 * promo/referral codes already present on canonical master
 * 9e34549150a495bca790552182f3826123a282d7 may remain publicly usable.
 *
 * IMPORTANT: confirmation is exact-value bound. A later data edit, a new GEO
 * destination, a new code, or a new exchange fails closed until explicitly
 * confirmed again. Link/code confirmation never authorizes bonus amounts, KYC,
 * deposits, expiry, availability, country eligibility, fee discounts, or any
 * other offer claim.
 */
import exchanges from '../exchanges.json';

export const OWNER_COMMERCIAL_CONFIRMATION = Object.freeze({
  provenance: 'owner_decision_2026-08-08',
  baseSha: '9e34549150a495bca790552182f3826123a282d7',
});

type ConfirmedEntry = Readonly<{
  slug: string;
  affiliateUrl: string;
  defaultUrl: string;
  geo: Readonly<Record<string, string>>;
  promoCode: string | null;
}>;

const BYBIT_URL = 'https://partner.bybit.com/b/CRYPTOBONUSW';

/**
 * Immutable snapshot of the exact owner-confirmed commercial values on the
 * governing base. Placeholder `#` GEO values are deliberately omitted.
 */
export const OWNER_CONFIRMED_COMMERCIAL_MANIFEST: readonly ConfirmedEntry[] = Object.freeze([
  Object.freeze({
    slug: 'bybit',
    affiliateUrl: BYBIT_URL,
    defaultUrl: BYBIT_URL,
    geo: Object.freeze({ tr: BYBIT_URL, in: BYBIT_URL, id: BYBIT_URL, ng: BYBIT_URL, br: BYBIT_URL, vn: BYBIT_URL, ph: BYBIT_URL }),
    promoCode: 'CRYPTOBONUSW',
  }),
  Object.freeze({ slug: 'mexc', affiliateUrl: 'https://www.mexc.com/acquisition/custom-sign-up?shareCode=mexc-CryptoBonus', defaultUrl: 'https://www.mexc.com/acquisition/custom-sign-up?shareCode=mexc-CryptoBonus', geo: Object.freeze({}), promoCode: 'mexc-CryptoBonus' }),
  Object.freeze({ slug: 'okx', affiliateUrl: 'https://okx.com/join/CRYPTOBONUSW', defaultUrl: 'https://okx.com/join/CRYPTOBONUSW', geo: Object.freeze({}), promoCode: 'CRYPTOBONUSW' }),
  Object.freeze({ slug: 'bitget', affiliateUrl: 'https://partner.bitget.com/bg/CryptoBonW', defaultUrl: 'https://partner.bitget.com/bg/CryptoBonW', geo: Object.freeze({}), promoCode: 'CryptoBonW' }),
  Object.freeze({ slug: 'bingx', affiliateUrl: 'https://bingxdao.com/partner/CRYPTOBONUSWORLD/', defaultUrl: 'https://bingxdao.com/partner/CRYPTOBONUSWORLD/', geo: Object.freeze({}), promoCode: 'CRYPTOBONUSWORLD' }),
  Object.freeze({ slug: 'gate-io', affiliateUrl: 'https://www.gate.com/share/BONUSCBW', defaultUrl: 'https://www.gate.com/share/BONUSCBW', geo: Object.freeze({}), promoCode: 'BONUSCBW' }),
  Object.freeze({ slug: 'kucoin', affiliateUrl: 'https://www.kucoin.com/r/af/CRYPTOBONW', defaultUrl: 'https://www.kucoin.com/r/af/CRYPTOBONW', geo: Object.freeze({}), promoCode: 'CRYPTOBONW' }),
  Object.freeze({ slug: 'htx', affiliateUrl: 'https://www.htx.com.ph/invite/ru-ru/1h?invite_code=cryptobonusw', defaultUrl: 'https://www.htx.com.ph/invite/ru-ru/1h?invite_code=cryptobonusw', geo: Object.freeze({}), promoCode: 'cryptobonusw' }),
  Object.freeze({ slug: 'coinex', affiliateUrl: 'https://www.coinex.com/register?rc=2my4f&channel=Referral', defaultUrl: 'https://www.coinex.com/register?rc=2my4f&channel=Referral', geo: Object.freeze({}), promoCode: '2my4f' }),
  Object.freeze({ slug: 'phemex', affiliateUrl: 'https://phemex.com/ru/account/referral/invite-friends-entry?referralCode=GJFJA5', defaultUrl: 'https://phemex.com/ru/account/referral/invite-friends-entry?referralCode=GJFJA5', geo: Object.freeze({}), promoCode: 'GJFJA5' }),
  Object.freeze({ slug: 'bitunix', affiliateUrl: 'https://www.bitunix.com/register?inviteCode=phpZuw', defaultUrl: 'https://www.bitunix.com/register?inviteCode=phpZuw', geo: Object.freeze({}), promoCode: 'phpZuw' }),
  Object.freeze({ slug: 'binance', affiliateUrl: 'https://www.binance.com/join?ref=CRYPTOBONW', defaultUrl: 'https://www.binance.com/join?ref=CRYPTOBONW', geo: Object.freeze({}), promoCode: 'CRYPTOBONW' }),
  Object.freeze({ slug: 'coinbase', affiliateUrl: 'https://www.coinbase.com/', defaultUrl: 'https://www.coinbase.com/', geo: Object.freeze({}), promoCode: null }),
]);

export type OwnerCommercialRawExchange = {
  slug?: unknown;
  affiliateUrl?: unknown;
  affiliateLinks?: { default?: unknown; geo?: Record<string, unknown> } | null;
  promoCode?: unknown;
  promoCodes?: Array<{ code?: unknown } | null> | null;
};

export interface OwnerConfirmedCommercialAuthority {
  slug: string;
  provenance: typeof OWNER_COMMERCIAL_CONFIRMATION.provenance;
  baseSha: typeof OWNER_COMMERCIAL_CONFIRMATION.baseSha;
  linkConfirmed: boolean;
  confirmedDefaultUrl: string | null;
  confirmedGeoUrls: Readonly<Record<string, string>>;
  promoCodeConfirmed: boolean;
  confirmedPromoCode: string | null;
}

function isRealUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
}

function realPromoCodes(raw: OwnerCommercialRawExchange): string[] {
  const values: string[] = [];
  if (typeof raw.promoCode === 'string' && raw.promoCode.trim()) values.push(raw.promoCode);
  if (Array.isArray(raw.promoCodes)) {
    for (const item of raw.promoCodes) {
      const code = item?.code;
      if (typeof code === 'string' && code.trim()) values.push(code);
    }
  }
  return [...new Set(values)];
}

function realGeo(raw: OwnerCommercialRawExchange): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw.affiliateLinks?.geo ?? {})) {
    if (isRealUrl(value)) out[key] = value;
  }
  return out;
}

function sameStringRecord(a: Readonly<Record<string, string>>, b: Readonly<Record<string, string>>): boolean {
  const ak = Object.keys(a).sort();
  const bk = Object.keys(b).sort();
  return ak.length === bk.length && ak.every((key, index) => key === bk[index] && a[key] === b[key]);
}

function rawBySlug(slug: string): OwnerCommercialRawExchange | null {
  const rows = exchanges as OwnerCommercialRawExchange[];
  return rows.find((row) => row?.slug === slug) ?? null;
}

export function getOwnerConfirmedManifestEntry(slug: string): ConfirmedEntry | null {
  return OWNER_CONFIRMED_COMMERCIAL_MANIFEST.find((entry) => entry.slug === slug) ?? null;
}

/**
 * Pure exact-value resolver for validation and mutation tests. It accepts a caller-supplied
 * raw record but still uses the immutable owner-confirmed manifest as the only authority.
 */
export function resolveOwnerConfirmedCommercialAuthorityForRaw(
  slug: string,
  raw: OwnerCommercialRawExchange | null,
): OwnerConfirmedCommercialAuthority | null {
  const expected = getOwnerConfirmedManifestEntry(slug);
  if (!expected || !raw) return null;

  const currentAffiliateUrl = isRealUrl(raw.affiliateUrl) ? raw.affiliateUrl : null;
  const currentDefaultUrl = isRealUrl(raw.affiliateLinks?.default) ? raw.affiliateLinks?.default as string : null;
  const currentGeo = realGeo(raw);

  const linkConfirmed =
    currentAffiliateUrl === expected.affiliateUrl
    && currentDefaultUrl === expected.defaultUrl
    && sameStringRecord(currentGeo, expected.geo);

  const currentCodes = realPromoCodes(raw);
  const promoCodeConfirmed = expected.promoCode === null
    ? currentCodes.length === 0
    : currentCodes.length >= 1 && currentCodes.every((code) => code === expected.promoCode);

  return Object.freeze({
    slug,
    provenance: OWNER_COMMERCIAL_CONFIRMATION.provenance,
    baseSha: OWNER_COMMERCIAL_CONFIRMATION.baseSha,
    linkConfirmed,
    confirmedDefaultUrl: linkConfirmed ? expected.defaultUrl : null,
    confirmedGeoUrls: linkConfirmed ? expected.geo : Object.freeze({}),
    promoCodeConfirmed,
    confirmedPromoCode: promoCodeConfirmed ? expected.promoCode : null,
  });
}

/** Resolve link/code authority against CURRENT repository raw data. */
export function resolveOwnerConfirmedCommercialAuthority(slug: string): OwnerConfirmedCommercialAuthority | null {
  return resolveOwnerConfirmedCommercialAuthorityForRaw(slug, rawBySlug(slug));
}

/** Exact current confirmed destination for a country code, falling back to default. */
export function resolveOwnerConfirmedAffiliateUrl(slug: string, countryCode?: string | null): string | null {
  const authority = resolveOwnerConfirmedCommercialAuthority(slug);
  if (!authority?.linkConfirmed) return null;
  if (countryCode && authority.confirmedGeoUrls[countryCode]) return authority.confirmedGeoUrls[countryCode];
  return authority.confirmedDefaultUrl;
}

export function validateOwnerConfirmedCommercialManifest(): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const entry of OWNER_CONFIRMED_COMMERCIAL_MANIFEST) {
    if (seen.has(entry.slug)) issues.push(`duplicate:${entry.slug}`);
    seen.add(entry.slug);
    const resolved = resolveOwnerConfirmedCommercialAuthority(entry.slug);
    if (!resolved?.linkConfirmed) issues.push(`link-mismatch:${entry.slug}`);
    if (!resolved?.promoCodeConfirmed) issues.push(`promo-mismatch:${entry.slug}`);
  }
  return { ok: issues.length === 0, issues };
}
