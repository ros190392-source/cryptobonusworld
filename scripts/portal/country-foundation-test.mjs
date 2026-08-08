#!/usr/bin/env node
/**
 * Country Foundation regression suite (Issue #272).
 *
 * Proves the PL/KZ identity + context + MarketProfile V1 boundary without
 * populating the public registry or publishing country availability facts.
 */
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TMP = mkdtempSync(join(tmpdir(), 'cbw-country-foundation-'));
const OUT = join(TMP, 'country-foundation.mjs');

const countryInput = join(ROOT, 'src/data/contracts/countryInput.ts');
const countryContext = join(ROOT, 'src/data/contracts/countryContext.ts');
const portalFactory = join(ROOT, 'src/data/contracts/portalFactory.ts');
const marketProfileV1 = join(ROOT, 'src/data/contracts/marketProfileV1.ts');
const marketProfileRegistry = join(ROOT, 'src/data/contracts/marketProfileRegistry.ts');
const countryAwareCta = join(ROOT, 'src/data/contracts/countryAwareCta.ts');
const portalCtaI18n = join(ROOT, 'src/data/contracts/portalCtaI18n.ts');
const ownerAuthority = join(ROOT, 'src/data/contracts/ownerConfirmedCommercialAuthority.ts');

let checks = 0;
const failures = [];
function check(name, condition, detail = '') {
  checks += 1;
  if (!condition) failures.push(detail ? `${name}: ${detail}` : name);
}

const NOW = Date.parse('2026-08-08T12:00:00Z');
const days = (n) => new Date(NOW + n * 24 * 60 * 60 * 1000).toISOString();

try {
  await build({
    stdin: {
      contents:
        `export { normalizeCountryInput, SUPPORTED_COUNTRY_CODES, COUNTRY_SLUG_TO_ISO } from ${JSON.stringify(countryInput)};\n` +
        `export { COUNTRY_CONTEXT_STORAGE_KEY, COUNTRY_CONTEXT_STORAGE_VERSION, resolveCountryContext, serializeStoredCountryContext, parseStoredCountryContext } from ${JSON.stringify(countryContext)};\n` +
        `export { validateMarketProfile } from ${JSON.stringify(portalFactory)};\n` +
        `export { COUNTRY_MARKET_PROFILE_SCHEMA_VERSION, validateCountryMarketProfileV1 } from ${JSON.stringify(marketProfileV1)};\n` +
        `export { resolveMarketProfile, PUBLIC_MARKET_PROFILES } from ${JSON.stringify(marketProfileRegistry)};\n` +
        `export { resolveCountryAwareCommercialCta, resolveCountryFoundationCommercialCta } from ${JSON.stringify(countryAwareCta)};\n` +
        `export { gateReasonText } from ${JSON.stringify(portalCtaI18n)};\n` +
        `export { resolveOwnerConfirmedCommercialAuthority } from ${JSON.stringify(ownerAuthority)};\n`,
      resolveDir: ROOT,
      loader: 'ts',
      sourcefile: 'country-foundation-test-entry.ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: OUT,
    logLevel: 'silent',
  });

  const m = await import(`${pathToFileURL(OUT).href}?v=${Date.now()}`);

  // ── PL/KZ identity only ────────────────────────────────────────────────────
  check('identity/PL: Poland is recognized', m.COUNTRY_SLUG_TO_ISO.poland === 'PL' && m.SUPPORTED_COUNTRY_CODES.includes('PL'));
  check('identity/KZ: Kazakhstan is recognized', m.COUNTRY_SLUG_TO_ISO.kazakhstan === 'KZ' && m.SUPPORTED_COUNTRY_CODES.includes('KZ'));
  check('identity: global is not a country code', !m.SUPPORTED_COUNTRY_CODES.includes('global'));
  check('input/PL: uppercase exact accepted', m.normalizeCountryInput('PL').state === 'valid');
  check('input/KZ: uppercase exact accepted', m.normalizeCountryInput('KZ').state === 'valid');
  check('input/pl: lowercase fails closed', m.normalizeCountryInput('pl').state === 'malformed');
  check('input/kz: lowercase fails closed', m.normalizeCountryInput('kz').state === 'malformed');

  // ── Country context precedence / storage ──────────────────────────────────
  const overrideWins = m.resolveCountryContext({ explicitOverride: 'PL', proposedCountry: 'KZ' });
  check('context: explicit PL beats proposed KZ', overrideWins.countryCode === 'PL' && overrideWins.source === 'explicit_override');

  const invalidExplicit = m.resolveCountryContext({ explicitOverride: 'pl', proposedCountry: 'KZ' });
  check('context: malformed explicit does not fall through to proposal', invalidExplicit.context === 'global' && invalidExplicit.countryCode === null && invalidExplicit.reason === 'EXPLICIT_INVALID');

  const proposalUsed = m.resolveCountryContext({ proposedCountry: 'KZ' });
  check('context: valid proposal used when explicit absent', proposalUsed.countryCode === 'KZ' && proposalUsed.source === 'proposal');

  const invalidProposal = m.resolveCountryContext({ proposedCountry: 'ZZ' });
  check('context: invalid proposal fails to global', invalidProposal.context === 'global' && invalidProposal.reason === 'PROPOSAL_INVALID');

  const explicitGlobal = m.resolveCountryContext({ explicitOverride: 'global', proposedCountry: 'PL' });
  check('context: explicit global beats proposal', explicitGlobal.context === 'global' && explicitGlobal.source === 'explicit_override' && explicitGlobal.reason === 'EXPLICIT_GLOBAL');

  check('storage: key is versioned', m.COUNTRY_CONTEXT_STORAGE_KEY === 'cbw_country_context_v1' && m.COUNTRY_CONTEXT_STORAGE_VERSION === 1);
  for (const country of ['PL', 'KZ', 'global']) {
    const encoded = m.serializeStoredCountryContext(country);
    const decoded = m.parseStoredCountryContext(encoded);
    check(`storage/${country}: round trip`, Boolean(encoded) && decoded?.country === country && decoded?.v === 1);
  }
  check('storage: lowercase value not serialized', m.serializeStoredCountryContext('pl') === null);
  check('storage: unknown version rejected', m.parseStoredCountryContext('{"v":2,"country":"PL"}') === null);
  check('storage: extra fields rejected', m.parseStoredCountryContext('{"v":1,"country":"PL","x":true}') === null);
  check('storage: unsupported country rejected', m.parseStoredCountryContext('{"v":1,"country":"ZZ"}') === null);
  check('storage: malformed JSON rejected', m.parseStoredCountryContext('{bad') === null);

  // ── MarketProfile V1 ───────────────────────────────────────────────────────
  const claimIds = [
    'claim:reg', 'claim:kyc', 'claim:dep', 'claim:wd',
    'claim:fiat', 'claim:prod', 'claim:bonus', 'claim:restr',
  ];
  const v1Profile = {
    profileId: 'mp:ex:pl:v1',
    exchangeId: 'ex',
    countryCode: 'PL',
    availability: 'available',
    offerEligibility: 'approved',
    claimIds,
    limitations: [],
    lastCheckedAt: days(-5),
    nextReviewAt: days(30),
    approval: 'approved',
    schemaVersion: 1,
    confidence: 'high',
    regulation: { state: 'licensed', legalEntityClaimIds: [], licenseClaimIds: ['claim:reg'], limitations: [] },
    kyc: { state: 'supported', claimIds: ['claim:kyc'], limitations: [] },
    deposits: { state: 'supported', claimIds: ['claim:dep'], limitations: [] },
    withdrawals: { state: 'supported', claimIds: ['claim:wd'], limitations: [] },
    fiatPayments: { state: 'supported', claimIds: ['claim:fiat'], limitations: [], methods: ['Bank transfer'] },
    products: { state: 'supported', claimIds: ['claim:prod'], limitations: [] },
    bonusAvailability: { state: 'supported', claimIds: ['claim:bonus'], limitations: [] },
    restrictions: { state: 'clear', claimIds: ['claim:restr'], limitations: [] },
  };

  const legacyProfile = {
    profileId: 'mp:ex:pl:legacy', exchangeId: 'ex', countryCode: 'PL',
    availability: 'available', offerEligibility: 'approved', claimIds: ['claim:legacy'], limitations: [],
    lastCheckedAt: days(-5), nextReviewAt: days(30), approval: 'approved',
  };

  check('profile/base: legacy profile remains structurally valid', m.validateMarketProfile(legacyProfile).ok === true);
  check('profile/v1: legacy profile cannot pass V1', m.validateCountryMarketProfileV1(legacyProfile).ok === false);
  check('profile/v1: complete structured profile passes', m.validateCountryMarketProfileV1(v1Profile).ok === true);
  check('profile/v1: missing dimension fails', m.validateCountryMarketProfileV1({ ...v1Profile, kyc: undefined }).ok === false);
  check('profile/v1: factual state without claim refs fails', m.validateCountryMarketProfileV1({ ...v1Profile, deposits: { state: 'supported', claimIds: [], limitations: [] } }).ok === false);
  check('profile/v1: unbound dimension claim fails', m.validateCountryMarketProfileV1({ ...v1Profile, kyc: { state: 'supported', claimIds: ['claim:not-in-base'], limitations: [] } }).ok === false);
  check('profile/v1: approved low confidence fails', m.validateCountryMarketProfileV1({ ...v1Profile, confidence: 'low' }).ok === false);
  check('profile/v1: approved unknown confidence fails', m.validateCountryMarketProfileV1({ ...v1Profile, confidence: 'unknown' }).ok === false);
  check('profile/v1: medium confidence may pass', m.validateCountryMarketProfileV1({ ...v1Profile, confidence: 'medium' }).ok === true);
  check('profile/v1: approved offer requires supported/limited bonus state', m.validateCountryMarketProfileV1({ ...v1Profile, bonusAvailability: { state: 'under_review', claimIds: [], limitations: [] } }).ok === false);
  check('profile/v1: supported fiat requires method label', m.validateCountryMarketProfileV1({ ...v1Profile, fiatPayments: { state: 'supported', claimIds: ['claim:fiat'], limitations: [], methods: [] } }).ok === false);

  // ── Strict Country Foundation CTA ─────────────────────────────────────────
  const offerEvidence = {
    evidenceCheckedAt: days(-5),
    nextReviewAt: days(30),
    sourceUrl: 'https://example.com/offer',
    exchangeId: 'ex',
  };
  const offer = { exchangeSlug: 'ex', status: 'verified', restrictedCountries: [], evidence: offerEvidence };
  const baseCta = {
    intent: 'get_bonus', locale: 'en', mode: 'production', countryCode: 'PL',
    exchangeId: 'ex', slug: 'ex', reviewHref: '/exchanges/ex/', offer,
    marketProfiles: [v1Profile], now: NOW,
  };
  const isGo = (result) => result?.isAffiliate === true && typeof result.href === 'string' && result.href.startsWith('/go/');

  const positive = m.resolveCountryFoundationCommercialCta(baseCta);
  check('cta/v1: exact approved V1 pair may authorize isolated positive fixture', isGo(positive) && positive.href === '/go/ex');

  const legacyBlocked = m.resolveCountryFoundationCommercialCta({ ...baseCta, marketProfiles: [legacyProfile] });
  check('cta/v1: legacy profile fails strict public boundary', !isGo(legacyBlocked) && legacyBlocked.gateReason === 'PROFILE_FOUNDATION_INVALID');

  const missingBlocked = m.resolveCountryFoundationCommercialCta({ ...baseCta, marketProfiles: [] });
  check('cta/v1: missing profile fails closed', !isGo(missingBlocked) && missingBlocked.gateReason === 'PROFILE_MISSING');

  const wrongCountry = m.resolveCountryFoundationCommercialCta({ ...baseCta, countryCode: 'KZ' });
  check('cta/v1: wrong country pair fails closed', !isGo(wrongCountry) && wrongCountry.gateReason === 'PROFILE_MISSING');

  const wrongExchange = m.resolveCountryFoundationCommercialCta({ ...baseCta, exchangeId: 'other', slug: 'other' });
  check('cta/v1: wrong exchange pair fails closed', !isGo(wrongExchange));

  const duplicate = m.resolveCountryFoundationCommercialCta({ ...baseCta, marketProfiles: [v1Profile, { ...v1Profile, profileId: 'mp:ex:pl:v1:2' }] });
  check('cta/v1: duplicate pair conflicts', !isGo(duplicate) && duplicate.gateReason === 'PROFILE_CONFLICT');

  const malformedRegistry = m.resolveCountryFoundationCommercialCta({ ...baseCta, marketProfiles: [v1Profile, null] });
  check('cta/v1: malformed registry fails atomically', !isGo(malformedRegistry) && malformedRegistry.gateReason === 'PROFILE_REGISTRY_INVALID');

  const stale = m.resolveCountryFoundationCommercialCta({ ...baseCta, marketProfiles: [{ ...v1Profile, lastCheckedAt: days(-120), nextReviewAt: days(30) }] });
  check('cta/v1: stale profile fails closed', !isGo(stale) && stale.gateReason === 'EVIDENCE_STALE');

  const overdue = m.resolveCountryFoundationCommercialCta({ ...baseCta, marketProfiles: [{ ...v1Profile, nextReviewAt: days(-1) }] });
  check('cta/v1: overdue review fails closed', !isGo(overdue) && overdue.gateReason === 'PROFILE_REVIEW_OVERDUE');

  const restrictedProfile = {
    ...v1Profile,
    availability: 'restricted',
    offerEligibility: 'not_eligible',
    bonusAvailability: { state: 'restricted', claimIds: ['claim:bonus'], limitations: [] },
  };
  const restricted = m.resolveCountryFoundationCommercialCta({ ...baseCta, marketProfiles: [restrictedProfile] });
  check('cta/v1: restricted profile cannot emit live CTA', !isGo(restricted) && restricted.disabled === true);

  const locales = ['en', 'ru', 'kk'].map((locale) => m.resolveCountryFoundationCommercialCta({ ...baseCta, locale }));
  check('cta/v1: locale cannot alter factual authorization', locales.every((x) => x.href === locales[0].href && x.isAffiliate === locales[0].isAffiliate && x.disabled === locales[0].disabled));
  check('cta/v1: new foundation reason localized en/ru/kk', ['en', 'ru', 'kk'].every((locale) => {
    const text = m.gateReasonText('PROFILE_FOUNDATION_INVALID', locale);
    return typeof text === 'string' && text.trim() !== '' && text !== 'PROFILE_FOUNDATION_INVALID';
  }));

  // Public production registry remains empty until a separate evidence/import task.
  check('public: PUBLIC_MARKET_PROFILES remains frozen empty', Object.isFrozen(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0);

  // Owner-confirmed global commercial values are independent from country authority.
  const bybitOwner = m.resolveOwnerConfirmedCommercialAuthority('bybit');
  check('separation: Bybit has owner-confirmed global link authority', bybitOwner?.linkConfirmed === true);
  const bybitWithoutCountryProfile = m.resolveCountryFoundationCommercialCta({
    intent: 'get_bonus', locale: 'en', mode: 'production', countryCode: 'PL',
    exchangeId: 'bybit', slug: 'bybit', reviewHref: '/bybit/',
    offer: { exchangeSlug: 'bybit', status: 'verified', restrictedCountries: [], evidence: { ...offerEvidence, exchangeId: 'bybit', sourceUrl: 'https://example.com/bybit-offer' } },
    marketProfiles: [], now: NOW,
  });
  check('separation: owner-confirmed global link cannot authorize PL availability', !isGo(bybitWithoutCountryProfile) && bybitWithoutCountryProfile.gateReason === 'PROFILE_MISSING');
  check('separation: confirmed GEO destination is not country proof', Object.keys(bybitOwner?.confirmedGeoUrls ?? {}).length > 0 && !isGo(bybitWithoutCountryProfile));

  if (failures.length) {
    console.error(`COUNTRY FOUNDATION PL/KZ: FAIL (${failures.length}/${checks})`);
    for (const failure of failures) console.error(` - ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(`COUNTRY FOUNDATION PL/KZ: PASS (${checks}/${checks})`);
  }
} catch (error) {
  console.error('COUNTRY FOUNDATION PL/KZ: ERROR');
  console.error(error?.stack ?? error);
  process.exitCode = 1;
} finally {
  rmSync(TMP, { recursive: true, force: true });
}
