#!/usr/bin/env node
/**
 * CBW Portal Factory — fail-closed contracts test.
 *
 * Adversarial, runnable proof that the Portal Factory validators and the
 * commercial CTA gate reject malformed, incomplete, stale, conflicting,
 * restricted, unavailable and unapproved inputs — and that a /go/* affiliate
 * target is emitted ONLY for an approved, offer-eligible, available market in
 * production mode. Transpiles the TypeScript contracts with esbuild (already a
 * project dependency); no network, no third-party test runner.
 *
 * Exit 0 = every case behaved as expected; exit 1 = any regression.
 */
import { build } from 'esbuild';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const factory = join(ROOT, 'src/data/contracts/portalFactory.ts');
const cta = join(ROOT, 'src/data/contracts/portalCta.ts');
const ctaI18n = join(ROOT, 'src/data/contracts/portalCtaI18n.ts');
const homepageCta = join(ROOT, 'src/data/homepageTop10Cta.ts');
const homepageData = join(ROOT, 'src/data/homepageTop10.ts');
const routeGuards = join(ROOT, 'src/data/contracts/portalRouteGuards.ts');
const publication = join(ROOT, 'src/data/contracts/portalPublication.ts');
const disclosure = join(ROOT, 'src/data/contracts/portalDisclosure.ts');
const internalPath = join(ROOT, 'src/data/contracts/internalPath.ts');
const countryInput = join(ROOT, 'src/data/contracts/countryInput.ts');
const marketProfileRegistry = join(ROOT, 'src/data/contracts/marketProfileRegistry.ts');
const countryAwareCta = join(ROOT, 'src/data/contracts/countryAwareCta.ts');
const evidenceMetadata = join(ROOT, 'src/data/contracts/evidenceMetadata.ts');
const offersData = join(ROOT, 'src/data/offers.ts');

const tmp = mkdtempSync(join(tmpdir(), 'cbw-portal-test-'));
const outfile = join(tmp, 'contracts.mjs');

const results = [];
let failures = 0;
function check(name, cond) {
  const ok = !!cond;
  if (!ok) failures++;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
}

try {
  await build({
    stdin: {
      contents:
        `export * from ${JSON.stringify(factory)};\n` +
        `export * from ${JSON.stringify(cta)};\n` +
        `export { pickLocalized, gateReasonText, ctaGateReasonText, ctaMicrocopy } from ${JSON.stringify(ctaI18n)};\n` +
        `export { resolveHomepageTop10Cta, resolveHomepageTop10Ctas } from ${JSON.stringify(homepageCta)};\n` +
        `export { homepageTop10 } from ${JSON.stringify(homepageData)};\n` +
        `export { assertPortalRouteRecord, resolvePortalRoute } from ${JSON.stringify(routeGuards)};\n` +
        `export { emitPublicRankingRoutes } from ${JSON.stringify(publication)};\n` +
        `export { resolveDisclosure } from ${JSON.stringify(disclosure)};\n` +
        `export { isInternalPath, assertInternalPath } from ${JSON.stringify(internalPath)};\n` +
        `export { normalizeCountryInput, SUPPORTED_COUNTRY_CODES } from ${JSON.stringify(countryInput)};\n` +
        `export { resolveMarketProfile, PUBLIC_MARKET_PROFILES } from ${JSON.stringify(marketProfileRegistry)};\n` +
        `export { resolveCountryAwareCommercialCta, normalizeRestrictedCountries, PUBLIC_HOMEPAGE_COUNTRY } from ${JSON.stringify(countryAwareCta)};\n` +
        `export { isExactIsoDateTime, parseExactIsoDateTime, validateEvidenceMetadata, assessEvidenceAuthorization, resolveOfferEvidenceAuthorization, formatEvidenceCheckedAt, deriveCheckedDisplay, toMarketProfileTimestamps } from ${JSON.stringify(evidenceMetadata)};\n` +
        `export { offers, getOffer } from ${JSON.stringify(offersData)};`,
      resolveDir: ROOT,
      loader: 'ts',
    },
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    logLevel: 'silent',
  });
  const m = await import(pathToFileURL(outfile).href);

  const digest = `sha256:${'a'.repeat(64)}`;
  const baseSource = {
    packetId: 'src:test:001', sourceUrl: 'https://example.com/x', sourceClass: 'exchange_official',
    publisher: 'X', accessedAt: '2026-07-31T00:00:00Z', topics: ['availability'],
    rawCaptureRef: 'ref://x', rawCaptureDigest: digest, parserVersion: '1', extractionWarnings: [],
  };
  const baseClaim = {
    claimId: 'clm:test:001', subjectId: 'subj:1', predicate: 'p', value: 'v',
    supportingPacketIds: ['src:test:001'], contradictingPacketIds: [], confidence: 'high',
    limitations: [], approval: 'validated',
  };
  const baseProfile = {
    profileId: 'mp:1', exchangeId: 'ex', countryCode: 'KZ', availability: 'available',
    offerEligibility: 'under_review', claimIds: ['clm:test:001'], limitations: [],
    lastCheckedAt: '2026-07-31T00:00:00Z', nextReviewAt: '2026-08-31T00:00:00Z', approval: 'validated',
  };

  // --- SourcePacket ---
  check('source: valid accepted', m.validateSourcePacket(baseSource).ok);
  check('source: null rejected (malformed)', !m.validateSourcePacket(null).ok);
  check('source: non-https rejected', !m.validateSourcePacket({ ...baseSource, sourceUrl: 'http://x.com/a' }).ok);
  check('source: bad digest rejected', !m.validateSourcePacket({ ...baseSource, rawCaptureDigest: 'nope' }).ok);
  check('source: missing topics rejected', !m.validateSourcePacket({ ...baseSource, topics: [] }).ok);

  // --- NormalizedClaim ---
  check('claim: valid accepted', m.validateNormalizedClaim(baseClaim).ok);
  check('claim: no evidence rejected (incomplete)', !m.validateNormalizedClaim({ ...baseClaim, supportingPacketIds: [] }).ok);
  check('claim: contradiction+approved rejected (conflicting)', !m.validateNormalizedClaim({ ...baseClaim, contradictingPacketIds: ['s2'], approval: 'approved' }).ok);
  check('claim: unknown-confidence approved rejected', !m.validateNormalizedClaim({ ...baseClaim, confidence: 'unknown', approval: 'approved' }).ok);

  // --- MarketProfile ---
  check('profile: valid accepted', m.validateMarketProfile(baseProfile).ok);
  check('profile: approved+unknown-availability rejected', !m.validateMarketProfile({ ...baseProfile, availability: 'unknown', approval: 'approved' }).ok);
  check('profile: offer-approved without profile-approval rejected', !m.validateMarketProfile({ ...baseProfile, offerEligibility: 'approved', approval: 'validated' }).ok);
  check('profile: nextReview<=lastChecked rejected (stale window)', !m.validateMarketProfile({ ...baseProfile, nextReviewAt: '2026-07-01T00:00:00Z' }).ok);
  check('profile: no claims rejected', !m.validateMarketProfile({ ...baseProfile, claimIds: [] }).ok);

  // --- RankingSnapshot ---
  const baseRank = { snapshotId: 'rk:1', countryCode: 'KZ', methodologyVersion: 'v1', rows: [], excludedExchangeIds: [], underReviewExchangeIds: [], evidenceCheckedAt: '2026-07-31T00:00:00Z', approval: 'draft' };
  check('ranking: valid empty draft accepted', m.validateRankingSnapshot(baseRank).ok);
  check('ranking: approved empty rejected', !m.validateRankingSnapshot({ ...baseRank, approval: 'approved' }).ok);
  check('ranking: non-contiguous positions rejected', !m.validateRankingSnapshot({ ...baseRank, rows: [{ position: 2, exchangeId: 'a', marketProfileId: 'mp', rationaleClaimIds: ['c'] }] }).ok);
  check('ranking: duplicate exchange rejected', !m.validateRankingSnapshot({ ...baseRank, rows: [
    { position: 1, exchangeId: 'a', marketProfileId: 'mp', rationaleClaimIds: ['c'] },
    { position: 2, exchangeId: 'a', marketProfileId: 'mp', rationaleClaimIds: ['c'] },
  ] }).ok);
  check('ranking: approved without approvedBy rejected', !m.validateRankingSnapshot({ ...baseRank, approval: 'approved', rows: [{ position: 1, exchangeId: 'a', marketProfileId: 'mp', rationaleClaimIds: ['c'] }] }).ok);

  // --- ContentPackage ---
  const basePkg = { packageId: 'ct:1', countryCode: 'KZ', approvedClaimIds: [], editorialBlocks: ['b'], sourcePacketIds: ['src:test:001'], localeReadiness: { en: 'draft' }, previewRoute: '/__design/cbw-v2/contracts/', approval: 'draft' };
  check('package: valid draft accepted', m.validateContentPackage(basePkg).ok);
  check('package: approved without approved claims rejected', !m.validateContentPackage({ ...basePkg, approval: 'approved' }).ok);
  check('package: approved without approved locale rejected', !m.validateContentPackage({ ...basePkg, approval: 'approved', approvedClaimIds: ['c'] }).ok);
  check('package: bad preview route rejected', !m.validateContentPackage({ ...basePkg, previewRoute: 'not-a-path' }).ok);
  check('package: no sources rejected', !m.validateContentPackage({ ...basePkg, sourcePacketIds: [] }).ok);

  // --- Commercial CTA gate ---
  const goProfile = { exchangeId: 'ex', slug: 'ex', availability: 'available', offerEligibility: 'approved', approval: 'approved', reviewHref: '/exchanges/ex/' };
  const goModel = m.resolveCommercialCta('get_bonus', 'ru', 'production', goProfile);
  check('cta: approved+eligible+production emits /go/', goModel.isAffiliate && goModel.href.startsWith('/go/') && goModel.rel.includes('sponsored') && goModel.rel.includes('nofollow'));
  check('cta: preview never emits /go/', !m.resolveCommercialCta('get_bonus', 'ru', 'preview', goProfile).href.startsWith('/go/'));
  check('cta: not-offer-eligible no /go/', !m.resolveCommercialCta('get_bonus', 'ru', 'production', { ...goProfile, offerEligibility: 'under_review', approval: 'validated' }).href.startsWith('/go/'));
  check('cta: stale approval no /go/', !m.resolveCommercialCta('get_bonus', 'ru', 'production', { ...goProfile, approval: 'stale' }).href.startsWith('/go/'));
  const restricted = m.resolveCommercialCta('get_bonus', 'ru', 'production', { ...goProfile, availability: 'restricted', offerEligibility: 'not_eligible' });
  check('cta: restricted no /go/ + disabled', !restricted.href.startsWith('/go/') && restricted.disabled === true && restricted.gateReason === 'MARKET_RESTRICTED');
  check('cta: unavailable no /go/', !m.resolveCommercialCta('get_bonus', 'ru', 'production', { ...goProfile, availability: 'unavailable', offerEligibility: 'not_eligible' }).href.startsWith('/go/'));
  check('cta: localized ru label present', goModel.label === 'Получить бонус');

  // --- Honest fallback: label always matches the resolved destination ---
  const throwsHelper = (fn) => { try { fn(); return false; } catch { return true; } };
  check('honest: live affiliate keeps requested commercial intent + label', (() => {
    const r = m.resolveCommercialCta('get_bonus', 'en', 'production', goProfile);
    return r.requestedIntent === 'get_bonus' && r.resolvedIntent === 'get_bonus' && r.label === 'Get bonus' && r.href.startsWith('/go/');
  })());
  check('honest: preview downgrades get_bonus -> view_review label "Read review"', (() => {
    const r = m.resolveCommercialCta('get_bonus', 'en', 'preview', goProfile);
    return r.requestedIntent === 'get_bonus' && r.resolvedIntent === 'view_review' && r.label === 'Read review' && !r.href.startsWith('/go/') && !r.rel.includes('sponsored');
  })());
  check('honest: offer-not-approved -> view_review label (not "Get bonus")', (() => {
    const r = m.resolveCommercialCta('get_bonus', 'en', 'production', { ...goProfile, offerEligibility: 'under_review', approval: 'validated' });
    return r.resolvedIntent === 'view_review' && r.label === 'Read review' && r.gateReason === 'OFFER_NOT_APPROVED';
  })());
  check('honest: stale evidence -> view_review label matches internal dest', (() => {
    const r = m.resolveCommercialCta('get_bonus', 'en', 'production', { ...goProfile, evidenceCheckedAt: '2020-01-01T00:00:00Z' }, { now: Date.parse('2026-08-02T00:00:00Z') });
    return r.resolvedIntent === 'view_review' && r.label === 'Read review' && !r.href.startsWith('/go/');
  })());
  check('honest: restricted -> disabled commercial control, no href, localized', (() => {
    const r = m.resolveCommercialCta('get_bonus', 'ru', 'production', { ...goProfile, availability: 'restricted', offerEligibility: 'not_eligible' });
    return r.disabled === true && r.href === '' && r.resolvedIntent === 'get_bonus' && r.label === 'Получить бонус' && r.gateReason === 'MARKET_RESTRICTED';
  })());
  check('honest: requestedIntent preserved for analytics on downgrade', (() => {
    const r = m.resolveCommercialCta('register', 'en', 'preview', goProfile);
    return r.requestedIntent === 'register' && r.resolvedIntent === 'view_review';
  })());
  check('honest: label localized per resolved intent (ru preview => Читать обзор)', (() => {
    const r = m.resolveCommercialCta('get_bonus', 'ru', 'preview', goProfile);
    return r.label === 'Читать обзор';
  })());
  check('honest: assert rejects label that contradicts resolved intent', throwsHelper(() =>
    m.assertCommercialCtaModel({ requestedIntent: 'get_bonus', resolvedIntent: 'view_review', locale: 'en', label: 'Get bonus', mode: 'preview', visualState: 'review', interactionState: 'default', href: '/exchanges/ex/', isAffiliate: false, disabled: false, rel: 'noopener', gateReason: 'PREVIEW_MODE' })));
  check('honest: assert rejects navigable non-affiliate commercial intent', throwsHelper(() =>
    m.assertCommercialCtaModel({ requestedIntent: 'get_bonus', resolvedIntent: 'get_bonus', locale: 'en', label: 'Get bonus', mode: 'preview', visualState: 'review', interactionState: 'default', href: '/exchanges/ex/', isAffiliate: false, disabled: false, rel: 'noopener', gateReason: 'PREVIEW_MODE' })));

  // --- Localization audit (en / ru / kk), deterministic fallback ---
  const LOCALES = ['en', 'ru', 'kk'];
  const INTENTS = ['register', 'get_bonus', 'open_exchange', 'view_review', 'view_evidence'];
  check('i18n: every CTA label present & non-empty in all locales', INTENTS.every((i) => LOCALES.every((l) => {
    const v = m.ctaLabels[i][l];
    return typeof v === 'string' && v.trim().length > 0 && v !== i;
  })));
  check('i18n: pickLocalized returns requested locale', m.pickLocalized({ en: 'A', ru: 'Б', kk: 'В' }, 'ru') === 'Б');
  check('i18n: missing locale falls back to en (not a raw key)', (() => {
    const partial = { en: 'Only-EN' };
    return m.pickLocalized(partial, 'kk') === 'Only-EN';
  })());
  check('i18n: missing en base throws (fail-closed, never blank)', (() => {
    try { m.pickLocalized({ en: '' }, 'en'); return false; } catch { return true; }
  })());
  check('i18n: every gate reason localized in all locales (not raw key)', Object.keys(m.ctaGateReasonText).every((r) =>
    LOCALES.every((l) => { const t = m.gateReasonText(r, l); return t && t.trim() && t !== r; })));
  check('i18n: unknown gate reason falls back to localized "unavailable"', (() => {
    const t = m.gateReasonText('SOME_UNKNOWN_REASON', 'ru');
    return t === m.ctaMicrocopy.unavailable.ru;
  })());
  check('i18n: microcopy present in all locales', ['opensNewTab', 'loading', 'unavailable'].every((k) =>
    LOCALES.every((l) => m.ctaMicrocopy[k][l] && m.ctaMicrocopy[k][l].trim())));
  // Factual independence: locale changes label only, never the gate facts.
  check('i18n: locale changes label only, facts unchanged', (() => {
    const prof = { exchangeId: 'ex', slug: 'ex', availability: 'available', offerEligibility: 'approved', approval: 'approved', reviewHref: '/exchanges/ex/' };
    const en = m.resolveCommercialCta('get_bonus', 'en', 'production', prof);
    const ru = m.resolveCommercialCta('get_bonus', 'ru', 'production', prof);
    const kk = m.resolveCommercialCta('get_bonus', 'kk', 'production', prof);
    const factsEqual = en.href === ru.href && ru.href === kk.href
      && en.isAffiliate === ru.isAffiliate && ru.isAffiliate === kk.isAffiliate
      && en.visualState === ru.visualState && ru.visualState === kk.visualState;
    const labelsDiffer = en.label !== ru.label && ru.label !== kk.label;
    return factsEqual && labelsDiffer;
  })());

  // --- Evidence freshness (deterministic, explicit clock) ---
  const NOW = Date.parse('2026-08-02T00:00:00Z');
  const daysAgo = (d) => new Date(NOW - d * 86400000).toISOString();
  check('fresh: recent evidence is fresh', m.assessEvidenceFreshness(daysAgo(10), NOW).state === 'fresh');
  check('fresh: missing timestamp is invalid (not coerced)', m.assessEvidenceFreshness(undefined, NOW).state === 'invalid');
  check('fresh: malformed timestamp is invalid (not coerced to now)', m.assessEvidenceFreshness('not-a-date', NOW).state === 'invalid');
  check('fresh: exactly at 45d boundary is fresh', m.assessEvidenceFreshness(daysAgo(45), NOW).state === 'fresh');
  check('fresh: just beyond 45d boundary is stale', m.assessEvidenceFreshness(daysAgo(46), NOW).state === 'stale');
  check('fresh: clearly old evidence is stale', m.assessEvidenceFreshness(daysAgo(400), NOW).state === 'stale');
  check('fresh: far-future timestamp flagged future', m.assessEvidenceFreshness(daysAgo(-5), NOW).state === 'future');
  check('fresh: within 60m skew tolerance is fresh', m.assessEvidenceFreshness(new Date(NOW + 30 * 60000).toISOString(), NOW).state === 'fresh');
  check('fresh: timezone offset normalized to UTC (deterministic)', (() => {
    const withOffset = '2026-07-25T05:00:00+05:00'; // == 2026-07-25T00:00Z
    const asUtc = '2026-07-25T00:00:00Z';
    const a = m.assessEvidenceFreshness(withOffset, NOW);
    const b = m.assessEvidenceFreshness(asUtc, NOW);
    return a.state === b.state && a.ageMs === b.ageMs;
  })());

  // Ranking-level fail-closed freshness for approved snapshots.
  const approvedRank = {
    snapshotId: 'rk:fresh', countryCode: 'KZ', methodologyVersion: 'v1',
    rows: [{ position: 1, exchangeId: 'a', marketProfileId: 'mp', rationaleClaimIds: ['c'] }],
    excludedExchangeIds: [], underReviewExchangeIds: [], evidenceCheckedAt: daysAgo(10),
    approval: 'approved', approvedBy: 'owner',
  };
  check('ranking: approved+fresh accepted (with clock)', m.validateRankingSnapshot(approvedRank, { now: NOW }).ok);
  check('ranking: approved+stale rejected (with clock)', !m.validateRankingSnapshot({ ...approvedRank, evidenceCheckedAt: daysAgo(120) }, { now: NOW }).ok);
  check('ranking: approved+future rejected (with clock)', !m.validateRankingSnapshot({ ...approvedRank, evidenceCheckedAt: daysAgo(-30) }, { now: NOW }).ok);
  check('ranking: stale but no clock stays deterministic (accepted)', m.validateRankingSnapshot({ ...approvedRank, evidenceCheckedAt: daysAgo(120) }).ok);

  // CTA-level: a stale-evidence profile must not expose an affiliate action.
  const freshProfile = { exchangeId: 'ex', slug: 'ex', availability: 'available', offerEligibility: 'approved', approval: 'approved', reviewHref: '/exchanges/ex/', evidenceCheckedAt: daysAgo(5) };
  check('cta: fresh evidence still emits /go/ in production', m.resolveCommercialCta('get_bonus', 'ru', 'production', freshProfile, { now: NOW }).href.startsWith('/go/'));
  check('cta: stale evidence blocks /go/ (EVIDENCE_STALE)', (() => {
    const r = m.resolveCommercialCta('get_bonus', 'ru', 'production', { ...freshProfile, evidenceCheckedAt: daysAgo(200) }, { now: NOW });
    return !r.href.startsWith('/go/') && !r.isAffiliate && r.gateReason === 'EVIDENCE_STALE';
  })());

  // --- Homepage Top-10 country-aware binding (Split 3, fail-closed public) ---
  const bybit = m.homepageTop10.find((e) => e.slug === 'bybit');       // verified offer
  const binance = m.homepageTop10.find((e) => e.slug === 'binance');   // research row, no offer
  // s3/19 + s3/20: public context (global) + empty registry → ZERO /go/ in BOTH modes.
  check('hp/s3-19: public homepage PREVIEW emits zero /go/', (() => {
    const b = m.resolveHomepageTop10Cta(bybit, 'preview', 'en');
    return !b.primary.isAffiliate && !b.primary.href.startsWith('/go/') && b.primary.gateReason === 'COUNTRY_GLOBAL';
  })());
  check('hp/s3-20: public homepage PRODUCTION simulation emits zero /go/ (no approved registry)', (() => {
    const b = m.resolveHomepageTop10Cta(bybit, 'production', 'en');
    return !b.primary.isAffiliate && !b.primary.href.startsWith('/go/') && b.primary.gateReason === 'COUNTRY_GLOBAL';
  })());
  check('hp/s3-20: whole public Top-10 production simulation → zero /go/', (() => {
    const all = m.homepageTop10.map((e) => m.resolveHomepageTop10Cta(e, 'production', 'en'));
    return all.every((b) => !b.primary.href.startsWith('/go/'));
  })());
  check('hp/s3-17: offer status alone cannot authorize an affiliate CTA (verified row, public context)', (() => {
    const b = m.resolveHomepageTop10Cta(bybit, 'production', 'en'); // bybit offer is verified
    return !b.primary.isAffiliate && !b.primary.href.startsWith('/go/');
  })());
  check('hp: research row (no offer) is non-commercial review', (() => {
    const b = m.resolveHomepageTop10Cta(binance, 'production', 'en');
    return !b.primary.isAffiliate && !b.primary.href.startsWith('/go/') && !b.primary.disabled;
  })());
  check('hp: honest review label in public context (ru → Читать обзор, not a bonus label)', (() => {
    const b = m.resolveHomepageTop10Cta(bybit, 'production', 'ru');
    return b.primary.label === 'Читать обзор';
  })());
  // s3/21: test-only injected approved profile for an exact supported pair → /go/.
  // R1/R2 (#250): the homepage must ALSO carry authoritative, identity-bound
  // OFFER evidence — an approved profile alone can no longer authorize.
  const synthBybitUA = { profileId: 'mp:ua:bybit', exchangeId: 'bybit', countryCode: 'UA', availability: 'available', offerEligibility: 'approved', claimIds: ['clm:1'], limitations: [], lastCheckedAt: daysAgo(5), nextReviewAt: '2026-12-31T00:00:00Z', approval: 'approved' };
  const synthBybitEvidence = { evidenceCheckedAt: daysAgo(5), nextReviewAt: '2026-12-31T00:00:00Z', sourceUrl: 'https://www.bybit.com/evidence', exchangeId: 'bybit' };
  const liveOpts = { countryCode: 'UA', marketProfiles: [synthBybitUA], now: NOW, offerEvidence: { bybit: synthBybitEvidence } };
  check('hp/#250-R1: approved profile + real (null) offer evidence → no /go/ (OFFER_EVIDENCE_MISSING)', (() => {
    const b = m.resolveHomepageTop10Cta(bybit, 'production', 'en', { countryCode: 'UA', marketProfiles: [synthBybitUA], now: NOW });
    return !b.primary.isAffiliate && !b.primary.href.startsWith('/go/') && b.primary.gateReason === 'OFFER_EVIDENCE_MISSING';
  })());
  check('hp/s3-21: injected approved profile + authoritative offer evidence + production → /go/bybit', (() => {
    const b = m.resolveHomepageTop10Cta(bybit, 'production', 'en', liveOpts);
    return b.primary.isAffiliate && b.primary.href === '/go/bybit' && b.primary.rel.includes('sponsored');
  })());
  check('hp/s3-21: same injected fixtures in preview → no /go/', (() => {
    const b = m.resolveHomepageTop10Cta(bybit, 'preview', 'en', liveOpts);
    return !b.primary.isAffiliate && !b.primary.href.startsWith('/go/');
  })());
  check('hp/#250-R2: offer evidence for a DIFFERENT exchange → no /go/ (identity mismatch)', (() => {
    const b = m.resolveHomepageTop10Cta(bybit, 'production', 'en', { ...liveOpts, offerEvidence: { bybit: { ...synthBybitEvidence, exchangeId: 'okx' } } });
    return !b.primary.isAffiliate && !b.primary.href.startsWith('/go/') && b.primary.gateReason === 'OFFER_EVIDENCE_IDENTITY_MISMATCH';
  })());
  check('hp/s3-22: no unsupported/unprofiled row gains a /go/ even with injected fixture for another pair', (() => {
    // Inject bybit×UA only; a DIFFERENT exchange in the same country has no profile → no /go/.
    const other = m.homepageTop10.find((e) => e.slug === 'okx');
    const b = m.resolveHomepageTop10Cta(other, 'production', 'en', liveOpts);
    return !b.primary.isAffiliate && !b.primary.href.startsWith('/go/');
  })());
  check('hp/s3-18: en/ru/kk identical factual authorization on the injected live pair', (() => {
    const mk = (l) => m.resolveHomepageTop10Cta(bybit, 'production', l, liveOpts).primary;
    const en = mk('en'), ru = mk('ru'), kk = mk('kk');
    return en.href === ru.href && ru.href === kk.href && en.isAffiliate === ru.isAffiliate && en.label !== ru.label && ru.label !== kk.label;
  })());

  // Secondary-action contract (fail-closed, validated binding).
  const thr = (fn) => { try { fn(); return false; } catch { return true; } };
  const withSecondary = (href, label = 'Read more') => ({ ...bybit, secondaryAction: { href, label } });
  check('hp/secondary: valid internal secondary passes + is echoed in binding', (() => {
    const b = m.resolveHomepageTop10Cta(withSecondary('/exchanges/bybit/'), 'preview', 'en');
    return b.secondaryHref === '/exchanges/bybit/' && b.secondaryLabel === 'Read more';
  })());
  check('hp/secondary: affiliate /go/ rejected', thr(() => m.resolveHomepageTop10Cta(withSecondary('/go/bybit'), 'preview', 'en')));
  check('hp/secondary: external absolute URL rejected', thr(() => m.resolveHomepageTop10Cta(withSecondary('https://evil.example/x/'), 'preview', 'en')));
  check('hp/secondary: protocol-relative rejected', thr(() => m.resolveHomepageTop10Cta(withSecondary('//host/'), 'preview', 'en')));
  check('hp/secondary: malformed path rejected', thr(() => m.resolveHomepageTop10Cta(withSecondary('/exchanges/bybit'), 'preview', 'en')));
  check('hp/secondary: empty label rejected', thr(() => m.resolveHomepageTop10Cta(withSecondary('/exchanges/bybit/', '   '), 'preview', 'en')));
  check('hp/secondary: real data whole Top-10 all valid (build-time fail-closed)', (() => {
    const all = m.homepageTop10.map((e) => m.resolveHomepageTop10Cta(e, 'preview', 'en'));
    return all.every((b) => b.secondaryHref.startsWith('/') && !b.secondaryHref.startsWith('//') && !b.secondaryHref.startsWith('/go/') && b.secondaryLabel.trim().length > 0);
  })());

  // --- Canonical internal-path validator (adversarial) ---
  const throws = (fn) => { try { fn(); return false; } catch { return true; } };
  const ACCEPT_PATHS = ['/', '/methodology/', '/exchanges/bybit/', '/__design/cbw-v2/contracts/', '/bybit/'];
  const REJECT_PATHS = [
    '//host/', '///host/', 'https://host/path/', 'http://host/path/', 'javascript:alert(1)',
    '/\\evil/', '\\\\host\\', '/a//b/', '/../', '/foo/../bar/', '/foo?x=1/', '/foo#frag/',
    '/foo%2e%2e/', '/exchanges/bybit', 'exchanges/bybit/', '', '/CONTROL/', '/go/bybit', '/go/bybit/',
  ];
  check('path: all canonical ACCEPT cases pass', ACCEPT_PATHS.every((p) => m.isInternalPath(p)));
  check('path: all adversarial REJECT cases fail', REJECT_PATHS.every((p) => !m.isInternalPath(p)));
  check('path: protocol-relative //host/ rejected', !m.isInternalPath('//host/'));
  check('path: external absolute URL rejected', !m.isInternalPath('https://evil.example/x/'));
  check('path: /go/* rejected for internal (default)', !m.isInternalPath('/go/bybit/'));
  check('path: /go/* allowed only with allowGo', m.isInternalPath('/go/bybit/', { allowGo: true }));
  check('path: non-string rejected', !m.isInternalPath(null) && !m.isInternalPath(undefined) && !m.isInternalPath(42));
  check('path: assertInternalPath throws on protocol-relative', throws(() => m.assertInternalPath('//host/', 'x')));

  // Downstream contracts must inherit the strict validator.
  check('path: CTA review href rejects protocol-relative', throws(() =>
    m.resolveCommercialCta('get_bonus', 'en', 'preview', { exchangeId: 'e', slug: 'e', availability: 'available', offerEligibility: 'approved', approval: 'approved', reviewHref: '//host/' })));
  check('path: disclosure rejects protocol-relative methodology', throws(() =>
    m.resolveDisclosure({ tone: 'verified', isAffiliate: false, methodologyHref: '//host/' }, 'en')));
  check('path: ContentPackage rejects protocol-relative preview route', !m.validateContentPackage({ packageId: 'ct:1', countryCode: 'KZ', approvedClaimIds: [], editorialBlocks: ['b'], sourcePacketIds: ['src:1'], localeReadiness: { en: 'draft' }, previewRoute: '//host/', approval: 'draft' }).ok);
  check('path: route guard rejects protocol-relative review path', throws(() =>
    m.assertPortalRouteRecord({ routeId: 'x', reviewPath: '//host/', publicationState: 'draft', indexabilityAuthorized: false })));
  check('path: public emission never returns protocol-relative output', (() => {
    // A route whose publicPath is protocol-relative must fail the guard → excluded.
    const prof = { profileId: 'mp:1', exchangeId: 'ex', countryCode: 'KZ', availability: 'available', offerEligibility: 'approved', claimIds: ['clm:1'], limitations: [], lastCheckedAt: daysAgo(5), nextReviewAt: '2026-09-30T00:00:00Z', approval: 'approved' };
    const snap = { snapshotId: 'rk:x', countryCode: 'KZ', methodologyVersion: 'v1', rows: [{ position: 1, exchangeId: 'ex', marketProfileId: 'mp:1', rationaleClaimIds: ['clm:1'] }], excludedExchangeIds: [], underReviewExchangeIds: [], evidenceCheckedAt: daysAgo(5), approval: 'approved', approvedBy: 'owner' };
    // A protocol-relative publicPath cannot even be constructed (assert throws), so emission has no valid route → row blocked.
    let guardThrew = false;
    try { m.assertPortalRouteRecord({ routeId: 'ex', reviewPath: '/__design/ex/', publicPath: '//host/', publicationState: 'approved', indexabilityAuthorized: true }); } catch { guardThrew = true; }
    const r = m.emitPublicRankingRoutes({ snapshot: snap, profiles: { 'mp:1': prof }, routes: {}, now: NOW });
    return guardThrew && r.published.length === 0 && !r.published.some((p) => String(p.publicPath).startsWith('//'));
  })());

  // --- Route guard + real public emission path ---

  const okRoute = { routeId: 'ex', reviewPath: '/__design/exchanges/ex/', publicPath: '/exchanges/ex/', publicationState: 'approved', indexabilityAuthorized: true };
  check('route: review mode returns review path', m.resolvePortalRoute(okRoute, 'review') === '/__design/exchanges/ex/');
  check('route: approved+indexable public path emitted', m.resolvePortalRoute(okRoute, 'public') === '/exchanges/ex/');
  check('route: draft cannot resolve public (throws)', throws(() => m.resolvePortalRoute({ ...okRoute, publicationState: 'draft', indexabilityAuthorized: false }, 'public')));
  check('route: approved but not indexable cannot resolve public', throws(() => m.resolvePortalRoute({ ...okRoute, indexabilityAuthorized: false }, 'public')));
  check('route: blocked cannot resolve public', throws(() => m.resolvePortalRoute({ ...okRoute, publicationState: 'blocked', indexabilityAuthorized: false }, 'public')));
  check('route: review path outside /__design/ rejected', throws(() => m.assertPortalRouteRecord({ ...okRoute, reviewPath: '/exchanges/ex/' })));
  check('route: public path in review namespace rejected', throws(() => m.assertPortalRouteRecord({ ...okRoute, publicPath: '/__design/x/' })));
  check('route: indexable without approval rejected', throws(() => m.assertPortalRouteRecord({ ...okRoute, publicationState: 'reviewed', indexabilityAuthorized: true })));
  check('route: approved without public path rejected', throws(() => m.assertPortalRouteRecord({ ...okRoute, publicPath: undefined })));

  // Composed emission fixtures.
  const pubProfile = { profileId: 'mp:1', exchangeId: 'ex', countryCode: 'KZ', availability: 'available', offerEligibility: 'approved', claimIds: ['clm:1'], limitations: [], lastCheckedAt: daysAgo(5), nextReviewAt: '2026-09-30T00:00:00Z', approval: 'approved' };
  const pubRow = { position: 1, exchangeId: 'ex', marketProfileId: 'mp:1', rationaleClaimIds: ['clm:1'] };
  const pubSnap = { snapshotId: 'rk:pub', countryCode: 'KZ', methodologyVersion: 'v1', rows: [pubRow], excludedExchangeIds: [], underReviewExchangeIds: [], evidenceCheckedAt: daysAgo(5), approval: 'approved', approvedBy: 'owner' };
  const baseInput = { snapshot: pubSnap, profiles: { 'mp:1': pubProfile }, routes: { ex: okRoute }, now: NOW };

  const okRes = m.emitPublicRankingRoutes(baseInput);
  check('emit: valid approved row is published', okRes.snapshotPublishable && okRes.published.length === 1 && okRes.published[0].publicPath === '/exchanges/ex/' && okRes.blocked.length === 0);

  check('emit: unapproved snapshot emits zero public routes', (() => {
    const r = m.emitPublicRankingRoutes({ ...baseInput, snapshot: { ...pubSnap, approval: 'draft', approvedBy: undefined } });
    return !r.snapshotPublishable && r.published.length === 0 && r.blocked.every((b) => b.reasons.includes('SNAPSHOT_NOT_PUBLISHABLE'));
  })());
  check('emit: stale snapshot emits zero public routes', (() => {
    const r = m.emitPublicRankingRoutes({ ...baseInput, snapshot: { ...pubSnap, evidenceCheckedAt: daysAgo(120) } });
    return !r.snapshotPublishable && r.published.length === 0;
  })());
  check('emit: malformed country blocks the whole snapshot', (() => {
    const r = m.emitPublicRankingRoutes({ ...baseInput, snapshot: { ...pubSnap, countryCode: 'kazakhstan' } });
    return !r.snapshotPublishable && r.published.length === 0;
  })());
  check('emit: blocked route excluded from list (not published)', (() => {
    const r = m.emitPublicRankingRoutes({ ...baseInput, routes: { ex: { ...okRoute, publicationState: 'blocked', indexabilityAuthorized: false } } });
    return r.published.length === 0 && r.blocked.some((b) => b.exchangeId === 'ex' && b.reasons.includes('ROUTE_NOT_AUTHORIZED'));
  })());
  check('emit: non-indexable route excluded', (() => {
    const r = m.emitPublicRankingRoutes({ ...baseInput, routes: { ex: { ...okRoute, indexabilityAuthorized: false } } });
    return r.published.length === 0 && r.blocked.length === 1;
  })());
  check('emit: unapproved profile excludes row', (() => {
    const r = m.emitPublicRankingRoutes({ ...baseInput, profiles: { 'mp:1': { ...pubProfile, approval: 'validated', offerEligibility: 'under_review' } } });
    return r.published.length === 0 && r.blocked.some((b) => b.reasons.includes('PROFILE_NOT_APPROVED'));
  })());
  check('emit: unavailable profile excludes row', (() => {
    const r = m.emitPublicRankingRoutes({ ...baseInput, profiles: { 'mp:1': { ...pubProfile, availability: 'unavailable', offerEligibility: 'not_eligible' } } });
    return r.published.length === 0 && r.blocked.some((b) => b.reasons.includes('PROFILE_NOT_AVAILABLE'));
  })());
  check('emit: negative combination (missing profile + bad route) blocks with multiple reasons', (() => {
    const r = m.emitPublicRankingRoutes({ ...baseInput, profiles: {}, routes: { ex: { ...okRoute, publicationState: 'blocked', indexabilityAuthorized: false } } });
    const b = r.blocked.find((x) => x.exchangeId === 'ex');
    return r.published.length === 0 && b && b.reasons.includes('PROFILE_MISSING') && b.reasons.includes('ROUTE_NOT_AUTHORIZED');
  })());
  check('emit: alternate locale yields identical published set (facts language-independent)', (() => {
    const en = m.emitPublicRankingRoutes({ ...baseInput, locale: 'en' });
    const ru = m.emitPublicRankingRoutes({ ...baseInput, locale: 'ru' });
    return JSON.stringify(en.published) === JSON.stringify(ru.published) && JSON.stringify(en.blocked) === JSON.stringify(ru.blocked);
  })());
  check('emit: published never intersects blocked (invariant holds under mixed input)', (() => {
    const twoRow = { ...pubSnap, rows: [pubRow, { position: 2, exchangeId: 'ex2', marketProfileId: 'mp:2', rationaleClaimIds: ['clm:2'] }] };
    const r = m.emitPublicRankingRoutes({ snapshot: twoRow, profiles: { 'mp:1': pubProfile }, routes: { ex: okRoute }, now: NOW });
    const pub = new Set(r.published.map((p) => p.exchangeId));
    const blk = new Set(r.blocked.map((b) => b.exchangeId));
    return r.published.length === 1 && pub.has('ex') && blk.has('ex2') && ![...pub].some((id) => blk.has(id));
  })());

  // --- Evidence disclosure (single-record provenance, fail-closed, localized) ---
  // #250 R4/R5: machine-backed disclosure consumes ONE EvidenceMetadata record +
  // an explicit clock. Checked date, semantic time, evidence state and evidence
  // Source ALL derive from that record; state overrides tone so a verified row
  // never presents stale/overdue/invalid/missing evidence as current.
  const discEv = { evidenceCheckedAt: daysAgo(5), nextReviewAt: '2026-12-31T00:00:00Z', sourceUrl: 'https://ex.com/promo', exchangeId: 'ex' };
  const discBase = { tone: 'verified', evidence: discEv, now: NOW, isAffiliate: true, methodologyHref: '/methodology/', officialHref: 'https://ex.com/official' };
  const disc = m.resolveDisclosure(discBase, 'en');
  check('disc: current evidence → derived date + same-record source + affiliate note', disc.tone === 'verified' && disc.evidenceState === 'current' && disc.lastChecked === m.formatEvidenceCheckedAt(discEv.evidenceCheckedAt, 'en') && disc.lastCheckedIso === discEv.evidenceCheckedAt && disc.sourceHref === 'https://ex.com/promo' && !!disc.affiliateNote);
  check('disc/R6.13: display, time and source all come from the SAME record', disc.lastCheckedIso === discEv.evidenceCheckedAt && disc.sourceHref === discEv.sourceUrl && disc.statusLabel === disc.toneLabel);
  check('disc/R6.12: official offer page is a SEPARATE non-evidence link (not the source)', disc.officialHref === 'https://ex.com/official' && disc.officialLabel !== disc.sourceLabel && disc.sourceHref !== disc.officialHref);
  check('disc: non-affiliate has no affiliate note', m.resolveDisclosure({ ...discBase, isAffiliate: false }, 'en').affiliateNote === null);
  check('disc/R6.11: null evidence → no checked date, no evidence source, under re-verification', (() => {
    const d = m.resolveDisclosure({ ...discBase, evidence: null, isAffiliate: false }, 'en');
    return d.evidenceState === 'none' && d.lastChecked === null && d.lastCheckedIso === null && d.sourceHref === null && d.statusLabel !== d.toneLabel;
  })());
  check('disc/R6.11: human-only "June 2026" record → invalid, no date/time/source (R5)', (() => {
    const d = m.resolveDisclosure({ ...discBase, evidence: { evidenceCheckedAt: 'June 2026', nextReviewAt: 'July 2026', sourceUrl: 'https://ex.com/x', exchangeId: 'ex' }, isAffiliate: false }, 'en');
    return d.evidenceState === 'invalid' && d.lastChecked === null && d.lastCheckedIso === null && d.sourceHref === null && d.statusLabel !== d.toneLabel;
  })());
  check('disc/R6.14: STALE evidence visible but labelled stale, not current', (() => {
    const d = m.resolveDisclosure({ ...discBase, evidence: { ...discEv, evidenceCheckedAt: daysAgo(200) }, isAffiliate: false }, 'en');
    return d.evidenceState === 'stale' && !!d.lastChecked && d.statusLabel !== d.toneLabel && d.sourceHref === discEv.sourceUrl;
  })());
  check('disc/R6.14: OVERDUE review visible but labelled overdue, not current', (() => {
    const d = m.resolveDisclosure({ ...discBase, evidence: { ...discEv, evidenceCheckedAt: daysAgo(5), nextReviewAt: daysAgo(1) }, isAffiliate: false }, 'en');
    return d.evidenceState === 'overdue' && !!d.lastChecked && d.statusLabel !== d.toneLabel;
  })());
  check('disc/R5: verified tone + null evidence must NOT claim current', (() => {
    const d = m.resolveDisclosure({ tone: 'verified', evidence: null, now: NOW, isAffiliate: false, methodologyHref: '/methodology/' }, 'en');
    return d.tone === 'verified' && d.evidenceState === 'none' && d.statusLabel !== d.toneLabel;
  })());
  check('disc: unknown tone fails closed to missing', m.resolveDisclosure({ ...discBase, tone: 'totally-unknown' }, 'en').tone === 'missing');
  check('disc: non-local methodology href throws', throws(() => m.resolveDisclosure({ ...discBase, methodologyHref: 'https://x.com/m' }, 'en')));
  check('disc/R6.15: en/ru/kk formatting differs, ISO/source/state identical', (() => {
    const en = m.resolveDisclosure(discBase, 'en'), ru = m.resolveDisclosure(discBase, 'ru'), kk = m.resolveDisclosure(discBase, 'kk');
    const factsEqual = en.lastCheckedIso === ru.lastCheckedIso && ru.lastCheckedIso === kk.lastCheckedIso
      && en.sourceHref === ru.sourceHref && en.evidenceState === ru.evidenceState && ru.evidenceState === kk.evidenceState;
    return factsEqual && en.lastChecked !== ru.lastChecked && !!en.lastChecked && !!ru.lastChecked && !!kk.lastChecked;
  })());

  // ===== Split 3 — country-aware commercial gate =====
  const s3throws = (fn) => { try { fn(); return false; } catch { return true; } };

  // ── Country input contract ──
  check('s3/country: valid supported (UA) → valid', (() => { const r = m.normalizeCountryInput('UA'); return r.state === 'valid' && r.code === 'UA'; })());
  check('s3/country: lowercase not normalized → malformed', m.normalizeCountryInput('ua').state === 'malformed');
  check('s3/country: full name → malformed', m.normalizeCountryInput('ukraine').state === 'malformed');
  check('s3/country: empty/undefined → missing', m.normalizeCountryInput('').state === 'missing' && m.normalizeCountryInput(undefined).state === 'missing');
  check('s3/country: global → global (not proof of eligibility)', m.normalizeCountryInput('global').state === 'global' && m.normalizeCountryInput('Global').state === 'global');
  check('s3/country: well-formed but unknown → unsupported', m.normalizeCountryInput('ZZ').state === 'unsupported');
  check('s3/country: non-string → malformed', m.normalizeCountryInput(42).state === 'malformed');
  check('s3/country: supported set excludes global', !m.SUPPORTED_COUNTRY_CODES.includes('global') && m.SUPPORTED_COUNTRY_CODES.includes('UA'));

  // ── MarketProfile resolver ──
  const okProfile = { profileId: 'mp:ua:ex', exchangeId: 'ex', countryCode: 'UA', availability: 'available', offerEligibility: 'approved', claimIds: ['clm:1'], limitations: [], lastCheckedAt: daysAgo(5), nextReviewAt: '2026-12-31T00:00:00Z', approval: 'approved' };
  check('s3/mp: public registry is empty (fail-closed)', Array.isArray(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0);
  check('s3/mp: exact approved pair → ok', m.resolveMarketProfile('ex', 'UA', [okProfile]).ok === true);
  check('s3/mp: missing → PROFILE_MISSING', m.resolveMarketProfile('ex', 'UA', []).reason === 'PROFILE_MISSING');
  check('s3/mp: duplicate pair → PROFILE_CONFLICT', m.resolveMarketProfile('ex', 'UA', [okProfile, { ...okProfile, profileId: 'mp:ua:ex2' }]).reason === 'PROFILE_CONFLICT');
  check('s3/mp: malformed profile → PROFILE_REGISTRY_INVALID (atomic)', m.resolveMarketProfile('ex', 'UA', [{ ...okProfile, lastCheckedAt: 'not-a-date' }]).reason === 'PROFILE_REGISTRY_INVALID');
  check('s3/mp: not approved → PROFILE_NOT_APPROVED', m.resolveMarketProfile('ex', 'UA', [{ ...okProfile, approval: 'validated', offerEligibility: 'under_review' }]).reason === 'PROFILE_NOT_APPROVED');
  check('s3/mp: restricted availability → PROFILE_RESTRICTED', m.resolveMarketProfile('ex', 'UA', [{ ...okProfile, availability: 'restricted' }]).reason === 'PROFILE_RESTRICTED');
  check('s3/mp: unavailable availability → PROFILE_UNAVAILABLE', m.resolveMarketProfile('ex', 'UA', [{ ...okProfile, availability: 'unavailable' }]).reason === 'PROFILE_UNAVAILABLE');
  check('s3/mp: approved+unknown availability → PROFILE_REGISTRY_INVALID (atomic, fail closed)', m.resolveMarketProfile('ex', 'UA', [{ ...okProfile, approval: 'approved', availability: 'unknown', offerEligibility: 'under_review' }]).reason === 'PROFILE_REGISTRY_INVALID');
  check('s3/mp: country mismatch → PROFILE_MISSING', m.resolveMarketProfile('ex', 'UA', [{ ...okProfile, countryCode: 'US', profileId: 'mp:us:ex' }]).reason === 'PROFILE_MISSING');
  check('s3/mp: exchange mismatch → PROFILE_MISSING', m.resolveMarketProfile('ex', 'UA', [{ ...okProfile, exchangeId: 'other' }]).reason === 'PROFILE_MISSING');

  // ── Restricted-country normalization (R3 completeness) ──
  check('s3/restr: undefined → missing (fail closed, NOT proven empty)', (() => { const r = m.normalizeRestrictedCountries(undefined); return r.state === 'missing' && r.codes.length === 0; })());
  check('s3/restr: null → missing (fail closed)', m.normalizeRestrictedCountries(null).state === 'missing');
  check('s3/restr: explicit [] → ok (proof: no restrictions recorded)', (() => { const r = m.normalizeRestrictedCountries([]); return r.state === 'ok' && r.codes.length === 0; })());
  check('s3/restr: valid codes accepted', (() => { const r = m.normalizeRestrictedCountries(['US', 'GB']); return r.state === 'ok' && r.codes.length === 2; })());
  check('s3/restr: lowercase → invalid (fail closed)', m.normalizeRestrictedCountries(['us']).state === 'invalid');
  check('s3/restr: non-array → invalid', m.normalizeRestrictedCountries('US').state === 'invalid');
  check('s3/restr: non-string element → invalid', m.normalizeRestrictedCountries([123]).state === 'invalid');

  // ── Composed country-aware CTA (the 22 required cases) ──
  // #250 R1/R2: a live CTA now ALSO requires authoritative, identity-bound offer
  // evidence. The positive fixture carries it; negative cases omit/mismatch it.
  const OFFER_EV = { evidenceCheckedAt: daysAgo(5), nextReviewAt: '2026-12-31T00:00:00Z', sourceUrl: 'https://ex.com/offer-evidence', exchangeId: 'ex' };
  const baseOffer = { exchangeSlug: 'ex', status: 'verified', restrictedCountries: ['US'], evidence: OFFER_EV };
  const carBase = { intent: 'get_bonus', locale: 'en', mode: 'production', countryCode: 'UA', exchangeId: 'ex', slug: 'ex', reviewHref: '/exchanges/ex/', offer: baseOffer, marketProfiles: [okProfile], now: NOW };
  const car = (o = {}) => m.resolveCountryAwareCommercialCta({ ...carBase, ...o });
  const isGo = (mdl) => mdl.isAffiliate && typeof mdl.href === 'string' && mdl.href.startsWith('/go/');

  check('s3/1: approved pair + eligible offer + fresh + production → live /go/', (() => { const r = car(); return isGo(r) && r.href === '/go/ex' && r.rel.includes('sponsored'); })());
  check('s3/2: same input in preview → no /go/', !isGo(car({ mode: 'preview' })));
  check('s3/3: verified offer but profile missing → no /go/', (() => { const r = car({ marketProfiles: [] }); return !isGo(r) && r.gateReason === 'PROFILE_MISSING'; })());
  check('s3/4: verified offer but malformed country → no /go/', (() => { const r = car({ countryCode: 'ukraine' }); return !isGo(r) && r.gateReason === 'COUNTRY_MALFORMED'; })());
  check('s3/5: unsupported country → no /go/', (() => { const r = car({ countryCode: 'ZZ' }); return !isGo(r) && r.gateReason === 'COUNTRY_UNSUPPORTED'; })());
  check('s3/6: restrictedCountries match → disabled, no href', (() => { const r = car({ offer: { exchangeSlug: 'ex', status: 'verified', restrictedCountries: ['UA'] } }); return !isGo(r) && r.disabled === true && r.href === '' && r.gateReason === 'MARKET_RESTRICTED'; })());
  check('s3/7: MarketProfile restricted → disabled, no href', (() => { const r = car({ marketProfiles: [{ ...okProfile, availability: 'restricted' }] }); return !isGo(r) && r.disabled === true && r.href === '' && r.gateReason === 'MARKET_RESTRICTED'; })());
  check('s3/8: MarketProfile unavailable → disabled, no href', (() => { const r = car({ marketProfiles: [{ ...okProfile, availability: 'unavailable' }] }); return !isGo(r) && r.disabled === true && r.gateReason === 'MARKET_UNAVAILABLE'; })());
  check('s3/9: MarketProfile under review → internal review', (() => { const r = car({ marketProfiles: [{ ...okProfile, approval: 'validated', offerEligibility: 'under_review' }] }); return !isGo(r) && r.disabled === false && r.gateReason === 'PROFILE_UNDER_REVIEW'; })());
  check('s3/10: profile approval stale → no /go/', (() => { const r = car({ marketProfiles: [{ ...okProfile, approval: 'stale', offerEligibility: 'under_review' }] }); return !isGo(r) && r.gateReason === 'PROFILE_UNDER_REVIEW'; })());
  check('s3/11: stale evidence (fresh review window) → no /go/', (() => { const r = car({ marketProfiles: [{ ...okProfile, lastCheckedAt: daysAgo(120), nextReviewAt: daysAgo(-30) }] }); return !isGo(r) && r.gateReason === 'EVIDENCE_STALE'; })());
  check('s3/12: profile country mismatch → no /go/', (() => { const r = car({ marketProfiles: [{ ...okProfile, countryCode: 'US', profileId: 'mp:us:ex' }] }); return !isGo(r) && r.gateReason === 'PROFILE_MISSING'; })());
  check('s3/13: profile exchange mismatch → no /go/', (() => { const r = car({ marketProfiles: [{ ...okProfile, exchangeId: 'other' }] }); return !isGo(r) && r.gateReason === 'PROFILE_MISSING'; })());
  check('s3/14: duplicate/conflicting profiles → no /go/', (() => { const r = car({ marketProfiles: [okProfile, { ...okProfile, profileId: 'mp:ua:ex2' }] }); return !isGo(r) && r.gateReason === 'PROFILE_CONFLICT'; })());
  check('s3/15: malformed restrictedCountries → no /go/ (fail closed)', (() => { const r = car({ offer: { exchangeSlug: 'ex', status: 'verified', restrictedCountries: ['us'] } }); return !isGo(r) && r.disabled === true && r.gateReason === 'RESTRICTION_DATA_INVALID'; })());
  check('s3/16: global/missing country → no /go/', !isGo(car({ countryCode: 'global' })) && car({ countryCode: 'global' }).gateReason === 'COUNTRY_GLOBAL' && !isGo(car({ countryCode: undefined })) && car({ countryCode: undefined }).gateReason === 'COUNTRY_MISSING');
  check('s3/17: offer status alone can never authorize availability', (() => {
    // Verified offer + valid supported country, but NO approved profile → never /go/.
    const r = car({ marketProfiles: [] });
    // And a verified offer with an under-review profile is still not /go/.
    const r2 = car({ marketProfiles: [{ ...okProfile, approval: 'validated', offerEligibility: 'under_review' }] });
    return !isGo(r) && !isGo(r2);
  })());
  check('s3/18: en/ru/kk identical factual authorization, only labels differ', (() => {
    const en = car({ locale: 'en' }), ru = car({ locale: 'ru' }), kk = car({ locale: 'kk' });
    const factsEqual = en.href === ru.href && ru.href === kk.href && en.isAffiliate === ru.isAffiliate && ru.isAffiliate === kk.isAffiliate && en.disabled === ru.disabled && en.resolvedIntent === ru.resolvedIntent && ru.resolvedIntent === kk.resolvedIntent;
    const labelsDiffer = en.label !== ru.label && ru.label !== kk.label;
    return factsEqual && isGo(en) && labelsDiffer;
  })());
  check('s3/21: test-only fixture production simulation emits only approved exact pairs', (() => {
    // Approved UA pair → /go/; the SAME exchange for a different supported country with no profile → no /go/.
    const yes = car({ countryCode: 'UA' });
    const no = car({ countryCode: 'BR' }); // no BR profile injected
    return isGo(yes) && !isGo(no);
  })());
  check('s3: en/ru/kk gate reasons all localized for new country/profile reasons', (() => {
    const reasons = ['COUNTRY_MISSING', 'COUNTRY_GLOBAL', 'COUNTRY_MALFORMED', 'COUNTRY_UNSUPPORTED', 'PROFILE_MISSING', 'PROFILE_CONFLICT', 'PROFILE_INVALID', 'PROFILE_UNDER_REVIEW', 'RESTRICTION_DATA_INVALID'];
    return reasons.every((rk) => ['en', 'ru', 'kk'].every((l) => { const t = m.gateReasonText(rk, l); return t && t.trim() && t !== rk; }));
  })());

  // ===== Split 3 R1–R6 — production integrity invariants =====
  // R1 exchange identity binding
  check('R1/1: bybit profile + exchangeId=bybit + slug=okx → no /go/ (EXCHANGE_IDENTITY_MISMATCH)', (() => {
    const r = car({ exchangeId: 'bybit', slug: 'okx', offer: { ...baseOffer, exchangeSlug: 'bybit' }, marketProfiles: [{ ...okProfile, exchangeId: 'bybit' }] });
    return !isGo(r) && r.gateReason === 'EXCHANGE_IDENTITY_MISMATCH';
  })());
  check('R1/2: exchangeId=okx + slug=bybit → no /go/', (() => { const r = car({ exchangeId: 'okx', slug: 'bybit' }); return !isGo(r) && r.gateReason === 'EXCHANGE_IDENTITY_MISMATCH'; })());
  check('R1/3: exact ex/ex identity → positive path remains possible', isGo(car()));
  check('R1/4: blank/malformed identity → no /go/', !isGo(car({ exchangeId: '', slug: '' })) && !isGo(car({ exchangeId: 'Ex!', slug: 'Ex!' })) && car({ exchangeId: '', slug: '' }).gateReason === 'EXCHANGE_IDENTITY_MISMATCH');
  check('R1/5: cross-exchange profile substitution (profile.exchangeId≠target) → no /go/', (() => {
    // Identity ok (ex/ex) but the only profile is for a different exchange → no exact match → no /go/.
    const r = car({ marketProfiles: [{ ...okProfile, exchangeId: 'other' }] });
    return !isGo(r);
  })());

  // R2 offer identity binding
  check('R2/1: verified bybit offer + bybit profile + okx target → no /go/', (() => {
    const r = car({ exchangeId: 'okx', slug: 'okx', offer: { exchangeSlug: 'bybit', status: 'verified', restrictedCountries: [] }, marketProfiles: [{ ...okProfile, exchangeId: 'okx' }] });
    return !isGo(r); // fails offer identity (bybit≠okx)
  })());
  check('R2/2: offer for a different exchange → no /go/ (OFFER_IDENTITY_MISMATCH)', (() => { const r = car({ offer: { exchangeSlug: 'other', status: 'verified', restrictedCountries: [] } }); return !isGo(r) && r.gateReason === 'OFFER_IDENTITY_MISMATCH'; })());
  check('R2/3: verified offer with missing exchangeSlug → no /go/', (() => { const r = car({ offer: { status: 'verified', restrictedCountries: [] } }); return !isGo(r) && r.gateReason === 'OFFER_IDENTITY_MISMATCH'; })());
  check('R2/3b: malformed offer exchangeSlug → no /go/', (() => { const r = car({ offer: { exchangeSlug: 'Ex!', status: 'verified', restrictedCountries: [] } }); return !isGo(r) && r.gateReason === 'OFFER_IDENTITY_MISMATCH'; })());
  check('R2/4: exact offer/profile/target identity → positive fixture green', isGo(car({ offer: { exchangeSlug: 'ex', status: 'verified', restrictedCountries: [], evidence: OFFER_EV } })));
  check('R2/5: offer status alone still cannot authorize (verified but wrong identity)', !isGo(car({ offer: { exchangeSlug: 'other', status: 'verified', restrictedCountries: [] } })));

  // R3 restriction completeness
  check('R3/1: verified offer with MISSING restrictedCountries → no /go/ (RESTRICTION_DATA_MISSING)', (() => { const r = car({ offer: { exchangeSlug: 'ex', status: 'verified' } }); return !isGo(r) && r.gateReason === 'RESTRICTION_DATA_MISSING'; })());
  check('R3/2: null restrictedCountries → no /go/', (() => { const r = car({ offer: { exchangeSlug: 'ex', status: 'verified', restrictedCountries: null } }); return !isGo(r) && r.gateReason === 'RESTRICTION_DATA_MISSING'; })());
  check('R3/3: non-array restrictedCountries → disabled, no /go/', (() => { const r = car({ offer: { exchangeSlug: 'ex', status: 'verified', restrictedCountries: 'US' } }); return !isGo(r) && r.gateReason === 'RESTRICTION_DATA_INVALID'; })());
  check('R3/4: explicit [] (no restrictions recorded) → /go/ eligible', isGo(car({ offer: { exchangeSlug: 'ex', status: 'verified', restrictedCountries: [], evidence: OFFER_EV } })));
  check('R3/5: country in explicit list → disabled restricted', (() => { const r = car({ offer: { exchangeSlug: 'ex', status: 'verified', restrictedCountries: ['UA'] } }); return !isGo(r) && r.disabled === true && r.gateReason === 'MARKET_RESTRICTED'; })());

  // R4 finite explicit clock
  check('R4/NaN: now=NaN → no /go/ (CLOCK_INVALID)', (() => { const r = car({ now: NaN }); return !isGo(r) && r.gateReason === 'CLOCK_INVALID'; })());
  check('R4/Inf: now=Infinity → no /go/', (() => { const r = car({ now: Infinity }); return !isGo(r) && r.gateReason === 'CLOCK_INVALID'; })());
  check('R4/-Inf: now=-Infinity → no /go/', (() => { const r = car({ now: -Infinity }); return !isGo(r) && r.gateReason === 'CLOCK_INVALID'; })());
  check('R4/omitted: no now in an injectable live scenario → no /go/', (() => { const r = car({ now: undefined }); return !isGo(r) && r.gateReason === 'CLOCK_INVALID'; })());
  check('R4/finite: finite NOW + exact approved fixture → positive path green', isGo(car({ now: NOW })));
  check('R4/freshness: assessEvidenceFreshness rejects non-finite clock', m.assessEvidenceFreshness(daysAgo(5), NaN).state === 'invalid' && m.assessEvidenceFreshness(daysAgo(5), Infinity).state === 'invalid');
  check('R4/policy: assessEvidenceFreshness rejects invalid policy numbers', m.assessEvidenceFreshness(daysAgo(5), NOW, { maxEvidenceAgeDays: NaN, futureSkewToleranceMinutes: 60 }).state === 'invalid' && m.assessEvidenceFreshness(daysAgo(5), NOW, { maxEvidenceAgeDays: -1, futureSkewToleranceMinutes: 60 }).state === 'invalid');

  // R5 nextReviewAt deadline
  check('R5/1: fresh lastChecked, nextReviewAt PAST → no /go/ (PROFILE_REVIEW_OVERDUE)', (() => { const r = car({ marketProfiles: [{ ...okProfile, lastCheckedAt: daysAgo(5), nextReviewAt: daysAgo(1) }] }); return !isGo(r) && r.gateReason === 'PROFILE_REVIEW_OVERDUE'; })());
  check('R5/2: fresh lastChecked, nextReviewAt == now → no /go/', (() => { const r = car({ marketProfiles: [{ ...okProfile, lastCheckedAt: daysAgo(5), nextReviewAt: new Date(NOW).toISOString() }] }); return !isGo(r) && r.gateReason === 'PROFILE_REVIEW_OVERDUE'; })());
  check('R5/3: fresh lastChecked, nextReviewAt FUTURE → eligible', isGo(car({ marketProfiles: [{ ...okProfile, lastCheckedAt: daysAgo(5), nextReviewAt: daysAgo(-30) }] })));
  check('R5/3b: invalid nextReviewAt → no /go/ (but must be caught before validation)', (() => {
    // An invalid nextReviewAt fails MarketProfile validation first → PROFILE_INVALID.
    const r = car({ marketProfiles: [{ ...okProfile, nextReviewAt: 'not-a-date' }] });
    return !isGo(r);
  })());
  check('R5/4: stale lastCheckedAt + future nextReviewAt → no /go/ (EVIDENCE_STALE)', (() => { const r = car({ marketProfiles: [{ ...okProfile, lastCheckedAt: daysAgo(200), nextReviewAt: daysAgo(-30) }] }); return !isGo(r) && r.gateReason === 'EVIDENCE_STALE'; })());
  check('R5/5: overdue profile factually identical across en/ru/kk', (() => {
    const mk = (l) => car({ locale: l, marketProfiles: [{ ...okProfile, nextReviewAt: daysAgo(1) }] });
    const en = mk('en'), ru = mk('ru'), kk = mk('kk');
    return en.gateReason === ru.gateReason && ru.gateReason === kk.gateReason && !isGo(en) && !isGo(ru) && !isGo(kk);
  })());

  // R6 malformed registry (no throw)
  check('R6/undefined: marketProfiles undefined → no throw, no /go/ (PROFILE_REGISTRY_INVALID)', (() => { const r = car({ marketProfiles: undefined }); return !isGo(r) && r.gateReason === 'PROFILE_REGISTRY_INVALID'; })());
  check('R6/null: marketProfiles null → no throw, no /go/', (() => { const r = car({ marketProfiles: null }); return !isGo(r) && r.gateReason === 'PROFILE_REGISTRY_INVALID'; })());
  check('R6/non-array: marketProfiles = {} → no throw, no /go/', (() => { const r = car({ marketProfiles: {} }); return !isGo(r) && r.gateReason === 'PROFILE_REGISTRY_INVALID'; })());
  check('R6/bad-entries: malformed array entries → no throw, no /go/ (atomic)', (() => { const r = car({ marketProfiles: [null, 42, 'x'] }); return !isGo(r) && r.gateReason === 'PROFILE_REGISTRY_INVALID'; })());
  check('R6/resolver: resolveMarketProfile never throws on bad registry', (() => {
    return m.resolveMarketProfile('ex', 'UA', undefined).reason === 'PROFILE_REGISTRY_INVALID'
      && m.resolveMarketProfile('ex', 'UA', {}).reason === 'PROFILE_REGISTRY_INVALID'
      && m.resolveMarketProfile('ex', 'UA', [null, 1]).reason === 'PROFILE_REGISTRY_INVALID';
  })());

  // ── R6 (R2 remediation): ATOMIC registry validity ──
  const unrelatedOk = { profileId: 'mp:br:other', exchangeId: 'other', countryCode: 'BR', availability: 'available', offerEligibility: 'approved', claimIds: ['clm:2'], limitations: [], lastCheckedAt: daysAgo(5), nextReviewAt: '2026-12-31T00:00:00Z', approval: 'approved' };
  check('atomic/1: [null] → PROFILE_REGISTRY_INVALID', m.resolveMarketProfile('ex', 'UA', [null]).reason === 'PROFILE_REGISTRY_INVALID');
  check('atomic/2: [42, "x"] → PROFILE_REGISTRY_INVALID', m.resolveMarketProfile('ex', 'UA', [42, 'x']).reason === 'PROFILE_REGISTRY_INVALID');
  check('atomic/3: [valid exact, null] → PROFILE_REGISTRY_INVALID and no /go/', (() => {
    const rr = m.resolveMarketProfile('ex', 'UA', [okProfile, null]);
    const cta = car({ marketProfiles: [okProfile, null] });
    return rr.reason === 'PROFILE_REGISTRY_INVALID' && !isGo(cta) && cta.gateReason === 'PROFILE_REGISTRY_INVALID';
  })());
  check('atomic/4: [valid exact, malformed unrelated] → PROFILE_REGISTRY_INVALID and no /go/', (() => {
    const bad = { ...unrelatedOk, lastCheckedAt: 'not-a-date' };
    const rr = m.resolveMarketProfile('ex', 'UA', [okProfile, bad]);
    const cta = car({ marketProfiles: [okProfile, bad] });
    return rr.reason === 'PROFILE_REGISTRY_INVALID' && !isGo(cta);
  })());
  check('atomic/5: [valid exact, valid unrelated] → exact positive pair remains eligible', (() => {
    const rr = m.resolveMarketProfile('ex', 'UA', [okProfile, unrelatedOk]);
    const cta = car({ marketProfiles: [okProfile, unrelatedOk] });
    return rr.ok === true && isGo(cta) && cta.href === '/go/ex';
  })());
  check('atomic/6: [] → PROFILE_MISSING', m.resolveMarketProfile('ex', 'UA', []).reason === 'PROFILE_MISSING');
  check('atomic/7: [one valid non-matching] → PROFILE_MISSING', m.resolveMarketProfile('ex', 'UA', [unrelatedOk]).reason === 'PROFILE_MISSING');
  check('atomic/8: duplicate valid exact → PROFILE_CONFLICT', m.resolveMarketProfile('ex', 'UA', [okProfile, { ...okProfile, profileId: 'mp:ua:ex2' }]).reason === 'PROFILE_CONFLICT');
  check('atomic/9: public empty registry is valid → PROFILE_MISSING', m.resolveMarketProfile('ex', 'UA', m.PUBLIC_MARKET_PROFILES).reason === 'PROFILE_MISSING');
  check('atomic/10: no malformed combination throws', (() => {
    const combos = [undefined, null, {}, 0, 'x', [null], [1], ['x'], [okProfile, null], [okProfile, {}], [{}], [okProfile, { ...unrelatedOk, countryCode: 'zz' }]];
    for (const c of combos) { try { m.resolveMarketProfile('ex', 'UA', c); } catch { return false; } }
    return true;
  })());
  check('atomic/reason: registry-invalid maps to localized internal review, never /go/', (() => {
    const cta = car({ marketProfiles: [okProfile, null] });
    return !isGo(cta) && cta.disabled === false && m.gateReasonText('PROFILE_REGISTRY_INVALID', 'ru').trim().length > 0;
  })());

  // i18n completeness for all R1–R6 reasons
  check('R1-R6: all new reasons localized en/ru/kk (no raw key)', (() => {
    const reasons = ['EXCHANGE_IDENTITY_MISMATCH', 'OFFER_IDENTITY_MISMATCH', 'RESTRICTION_DATA_MISSING', 'CLOCK_INVALID', 'PROFILE_REVIEW_OVERDUE', 'PROFILE_REGISTRY_INVALID'];
    return reasons.every((rk) => ['en', 'ru', 'kk'].every((l) => { const t = m.gateReasonText(rk, l); return t && t.trim() && t !== rk; }));
  })());

  // ===== Split 3 (#250) — machine-readable evidence freshness =====
  // ONE factual freshness source: exact, timezone-qualified ISO metadata backed
  // by an HTTPS source. Human strings can never authorize; display dates derive
  // from the machine timestamp; locale changes formatting only.
  const EVI_SRC = 'https://ex.com/evidence';
  const validMeta = { evidenceCheckedAt: daysAgo(5), nextReviewAt: '2026-12-31T00:00:00Z', sourceUrl: EVI_SRC, exchangeId: 'ex' };

  // ── R9: strict calendar-valid ISO datetime (never Date.parse normalization) ──
  const accept = ['2024-02-29T00:00:00Z', '2026-04-30T23:59:59Z', '2026-07-31T09:30:00+05:00', '2026-07-31T09:30:00.123Z', '2026-07-31T09:30:00-08:00'];
  const reject = [
    '2026-02-29T00:00:00Z', '2026-02-30T00:00:00Z', '2026-02-31T00:00:00Z', '2026-04-31T12:00:00Z',
    '2026-06-31T00:00:00Z', '2026-07-31T24:00:00Z', '2026-07-31T23:60:00Z', '2026-07-31T23:59:60Z',
    '2026-00-15T00:00:00Z', '2026-13-15T00:00:00Z', '2026-07-00T00:00:00Z', '2026-07-31T09:30:00+25:00',
    '2026-07-31T09:30:00+05:99', '2026-07-31', '2026-07-31T00:00:00', '2026-07-31 00:00:00Z', '1900-02-29T00:00:00Z',
  ];
  check('R9/accept: all valid calendar datetimes accepted (incl. leap 2024-02-29, offsets, fractional)', accept.every((v) => m.isExactIsoDateTime(v) && m.parseExactIsoDateTime(v) !== null));
  check('R9/reject: all impossible/date-only/tz-less/space-separated rejected', reject.every((v) => !m.isExactIsoDateTime(v) && m.parseExactIsoDateTime(v) === null));
  check('R9/leap: 2024-02-29 accepted, 2026-02-29 & 1900-02-29 rejected (leap rules)', m.isExactIsoDateTime('2024-02-29T00:00:00Z') && !m.isExactIsoDateTime('2026-02-29T00:00:00Z') && !m.isExactIsoDateTime('1900-02-29T00:00:00Z') && m.isExactIsoDateTime('2000-02-29T00:00:00Z'));
  check('R9/no-normalization: Date.parse would accept 2026-02-31 but strict parser rejects', Number.isFinite(Date.parse('2026-02-31T00:00:00Z')) && !m.isExactIsoDateTime('2026-02-31T00:00:00Z'));
  check('R9/offset: deterministic epoch — +05:00 equals the same UTC instant', m.parseExactIsoDateTime('2026-07-31T09:30:00+05:00').epochMs === Date.parse('2026-07-31T04:30:00Z'));
  check('R9/validator: evidence with impossible date fails validateEvidenceMetadata', !m.validateEvidenceMetadata({ ...validMeta, evidenceCheckedAt: '2026-02-31T00:00:00Z' }).ok && !m.validateEvidenceMetadata({ ...validMeta, nextReviewAt: '2026-04-31T00:00:00Z' }).ok);
  check('R9/auth: impossible-date evidence can never authorize', !m.assessEvidenceAuthorization({ ...validMeta, evidenceCheckedAt: '2026-02-31T00:00:00Z' }, NOW).authoritative && m.resolveOfferEvidenceAuthorization({ ...validMeta, evidenceCheckedAt: '2026-02-31T00:00:00Z' }, 'ex', NOW).reason === 'OFFER_EVIDENCE_INVALID');

  // ── R12: normalized/whitespace-rejecting validated values ──
  check('R12/url-ws: sourceUrl with surrounding whitespace rejected', !m.validateEvidenceMetadata({ ...validMeta, sourceUrl: ' https://ex.com/e ' }).ok && !m.validateEvidenceMetadata({ ...validMeta, sourceUrl: 'https://ex.com/e\n' }).ok);
  check('R12/id-ws: exchangeId with surrounding whitespace rejected', !m.validateEvidenceMetadata({ ...validMeta, exchangeId: ' ex ' }).ok);
  check('R12/value: validator returns a normalized value used verbatim (no ws can reach href/identity)', (() => {
    const v = m.validateEvidenceMetadata(validMeta);
    return v.ok && v.value.sourceUrl === EVI_SRC && v.value.sourceUrl.trim() === v.value.sourceUrl && v.value.exchangeId === 'ex';
  })());
  check('R12/disc: whitespace source never reaches disclosure href (fails closed to invalid)', (() => {
    const d = m.resolveDisclosure({ tone: 'verified', evidence: { ...validMeta, sourceUrl: ' https://ex.com/e ' }, expectedExchangeId: 'ex', now: NOW, isAffiliate: false, methodologyHref: '/methodology/' }, 'en');
    return d.evidenceState === 'invalid' && d.sourceHref === null;
  })());

  // ── R10: disclosure subject-identity binding ──
  const discBind = (evidence, expectedExchangeId) => m.resolveDisclosure({ tone: 'verified', evidence, expectedExchangeId, now: NOW, isAffiliate: false, methodologyHref: '/methodology/', officialHref: 'https://bybit.com/official' }, 'en');
  const bybitEv = { evidenceCheckedAt: daysAgo(5), nextReviewAt: '2026-12-31T00:00:00Z', sourceUrl: 'https://bybit.com/e', exchangeId: 'bybit' };
  check('R10/1: bybit row + bybit evidence → current display allowed', (() => { const d = discBind(bybitEv, 'bybit'); return d.evidenceState === 'current' && !!d.lastChecked && !!d.lastCheckedIso && d.sourceHref === 'https://bybit.com/e'; })());
  check('R10/2: bybit row + OKX evidence → invalid, no date, no evidence Source', (() => { const d = discBind({ ...bybitEv, exchangeId: 'okx', sourceUrl: 'https://okx.com/e' }, 'bybit'); return d.evidenceState === 'invalid' && d.lastChecked === null && d.lastCheckedIso === null && d.sourceHref === null; })());
  check('R10/3: bybit row + evidence without exchangeId → invalid', (() => { const d = discBind({ evidenceCheckedAt: daysAgo(5), nextReviewAt: '2026-12-31T00:00:00Z', sourceUrl: 'https://bybit.com/e' }, 'bybit'); return d.evidenceState === 'invalid' && d.sourceHref === null; })());
  check('R10/4: blank/malformed expectedExchangeId → invalid', (() => { const a = discBind(bybitEv, ''); const b = discBind(bybitEv, 'BYBIT!'); return a.evidenceState === 'invalid' && a.sourceHref === null && b.evidenceState === 'invalid'; })());
  check('R10/5: source URL and semantic datetime disappear TOGETHER on identity failure', (() => { const d = discBind({ ...bybitEv, exchangeId: 'okx' }, 'bybit'); return d.sourceHref === null && d.lastCheckedIso === null && d.lastChecked === null; })());
  check('R10/6: en/ru/kk identity decisions identical (mismatch → invalid in all)', (() => {
    const mk = (l) => m.resolveDisclosure({ tone: 'verified', evidence: { ...bybitEv, exchangeId: 'okx' }, expectedExchangeId: 'bybit', now: NOW, isAffiliate: false, methodologyHref: '/methodology/' }, l);
    const en = mk('en'), ru = mk('ru'), kk = mk('kk');
    return en.evidenceState === 'invalid' && en.evidenceState === ru.evidenceState && ru.evidenceState === kk.evidenceState && en.sourceHref === ru.sourceHref && ru.sourceHref === kk.sourceHref;
  })());
  check('R10/official: separately-labelled Official offer page survives identity failure (non-evidence nav)', (() => { const d = discBind({ ...bybitEv, exchangeId: 'okx' }, 'bybit'); return d.officialHref === 'https://bybit.com/official' && d.sourceHref === null; })());

  check('evi/1: exact UTC timestamp accepted', m.isExactIsoDateTime('2026-07-31T00:00:00Z') && m.validateEvidenceMetadata(validMeta).ok);
  check('evi/2: exact offset accepted + normalized deterministically', m.isExactIsoDateTime('2026-07-31T09:30:00+05:00') && Date.parse('2026-07-31T09:30:00+05:00') === Date.parse('2026-07-31T04:30:00Z'));
  check('evi/3: date-only rejected', !m.isExactIsoDateTime('2026-07-31') && !m.validateEvidenceMetadata({ ...validMeta, evidenceCheckedAt: '2026-07-31' }).ok);
  check('evi/4: timezone-less datetime rejected', !m.isExactIsoDateTime('2026-07-31T00:00:00') && !m.validateEvidenceMetadata({ ...validMeta, evidenceCheckedAt: '2026-07-31T12:00:00' }).ok);
  check('evi/5: malformed timestamp rejected', !m.isExactIsoDateTime('not-a-date') && !m.isExactIsoDateTime('2026-99-99T00:00:00Z'));
  check('evi/6: missing timestamp rejected', (() => { const r = m.validateEvidenceMetadata({ nextReviewAt: '2026-12-31T00:00:00Z', sourceUrl: EVI_SRC }); return !r.ok && r.issues.some((i) => i.field === 'evidenceCheckedAt'); })());
  check('evi/7: NaN/Infinity clock rejected', !m.assessEvidenceAuthorization(validMeta, NaN).authoritative && m.assessEvidenceAuthorization(validMeta, NaN).reason === 'INVALID_CLOCK' && !m.assessEvidenceAuthorization(validMeta, Infinity).authoritative && !m.assessEvidenceAuthorization(validMeta, -Infinity).authoritative);
  check('evi/8: future beyond skew rejected', (() => { const a = m.assessEvidenceAuthorization({ ...validMeta, evidenceCheckedAt: new Date(NOW + 61 * 60000).toISOString() }, NOW); return !a.authoritative && a.freshness === 'future'; })());
  check('evi/9: stale evidence rejected', (() => { const a = m.assessEvidenceAuthorization({ ...validMeta, evidenceCheckedAt: daysAgo(200) }, NOW); return !a.authoritative && a.freshness === 'stale'; })());
  check('evi/10a: exactly 45d evidence fresh (central boundary)', m.assessEvidenceFreshness(daysAgo(45), NOW).state === 'fresh');
  check('evi/10b: 45d+1ms evidence stale', m.assessEvidenceFreshness(new Date(NOW - 45 * 86400000 - 1).toISOString(), NOW).state === 'stale');
  check('evi/10c: authorization fresh exactly at boundary with future review', m.assessEvidenceAuthorization({ ...validMeta, evidenceCheckedAt: daysAgo(45) }, NOW).authoritative === true);
  check('evi/11: nextReviewAt <= evidenceCheckedAt rejected', !m.validateEvidenceMetadata({ evidenceCheckedAt: daysAgo(5), nextReviewAt: daysAgo(6), sourceUrl: EVI_SRC }).ok);
  check('evi/12: nextReviewAt == now overdue', (() => { const a = m.assessEvidenceAuthorization({ evidenceCheckedAt: daysAgo(5), nextReviewAt: new Date(NOW).toISOString(), sourceUrl: EVI_SRC }, NOW); return !a.authoritative && a.reviewState === 'overdue' && a.reason === 'REVIEW_OVERDUE'; })());
  check('evi/13: nextReviewAt < now overdue', (() => { const a = m.assessEvidenceAuthorization({ evidenceCheckedAt: daysAgo(5), nextReviewAt: daysAgo(1), sourceUrl: EVI_SRC }, NOW); return !a.authoritative && a.reviewState === 'overdue'; })());
  check('evi/14: fresh checked + future review accepted', m.assessEvidenceAuthorization(validMeta, NOW).authoritative === true);
  check('evi/15: "June 2026" cannot authorize freshness', !m.isExactIsoDateTime('June 2026') && !m.assessEvidenceAuthorization({ evidenceCheckedAt: 'June 2026', nextReviewAt: 'July 2026', sourceUrl: EVI_SRC }, NOW).authoritative);
  check('evi/16: "Recheck in progress" cannot authorize freshness', !m.assessEvidenceAuthorization({ evidenceCheckedAt: 'Recheck in progress', nextReviewAt: 'Recheck in progress', sourceUrl: EVI_SRC }, NOW).authoritative);
  check('evi/17: no real offer carries authorizing machine evidence (all under re-verification)', m.offers.every((o) => (o.evidence === null || o.evidence === undefined) && m.deriveCheckedDisplay(o.evidence ?? null, NOW).state === 'none'));
  check('evi/17b: verified offer without machine evidence cannot authorize', (() => { const v = m.offers.find((o) => o.status === 'verified'); return v && (v.evidence === null || v.evidence === undefined) && !m.assessEvidenceAuthorization(v.evidence ?? null, NOW).authoritative; })());
  check('evi/18: missing/non-https/malformed source URL fails closed', !m.validateEvidenceMetadata({ ...validMeta, sourceUrl: 'http://ex.com/x' }).ok && !m.validateEvidenceMetadata({ evidenceCheckedAt: validMeta.evidenceCheckedAt, nextReviewAt: validMeta.nextReviewAt }).ok && !m.validateEvidenceMetadata({ ...validMeta, sourceUrl: 'not a url' }).ok);
  check('evi/19: visible date derived from machine timestamp (not a human string)', (() => {
    const d = m.deriveCheckedDisplay(validMeta, NOW, 'en');
    return !!d.display && d.iso === validMeta.evidenceCheckedAt && d.display === m.formatEvidenceCheckedAt(validMeta.evidenceCheckedAt, 'en') && d.display !== 'June 2026' && d.state === 'current';
  })());
  check('evi/20: en/ru/kk formatting differs while factual state identical', (() => {
    const meta = { evidenceCheckedAt: '2026-07-31T00:00:00Z', nextReviewAt: '2026-12-31T00:00:00Z', sourceUrl: EVI_SRC };
    const en = m.deriveCheckedDisplay(meta, NOW, 'en'), ru = m.deriveCheckedDisplay(meta, NOW, 'ru'), kk = m.deriveCheckedDisplay(meta, NOW, 'kk');
    const factsEqual = en.iso === ru.iso && ru.iso === kk.iso && en.state === ru.state && ru.state === kk.state;
    return factsEqual && !!en.display && !!ru.display && !!kk.display && en.display !== ru.display;
  })());
  check('evi/21: public homepage PREVIEW emits zero /go/', m.homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'preview', 'en').primary.href.startsWith('/go/')));
  check('evi/22: public homepage PRODUCTION simulation emits zero /go/', m.homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'production', 'en').primary.href.startsWith('/go/')));
  check('evi/23: exact evidence → identity-bound adapter → approved profile + authoritative offer evidence → /go/ex', (() => {
    const adapted = m.toMarketProfileTimestamps(validMeta, 'ex');
    if (!adapted.ok) return false;
    const prof = { ...okProfile, lastCheckedAt: adapted.value.lastCheckedAt, nextReviewAt: adapted.value.nextReviewAt };
    const live = car({ marketProfiles: [prof], offer: { exchangeSlug: 'ex', status: 'verified', restrictedCountries: [], evidence: validMeta } });
    return isGo(live) && live.href === '/go/ex';
  })());
  check('evi/23b: adapter (identity REQUIRED) rejects display/date-only/missing provenance + cross-exchange', (() => (
    !m.toMarketProfileTimestamps({ evidenceCheckedAt: 'June 2026', nextReviewAt: 'July 2026', sourceUrl: EVI_SRC, exchangeId: 'ex' }, 'ex').ok
    && !m.toMarketProfileTimestamps({ evidenceCheckedAt: '2026-07-31', nextReviewAt: '2026-12-31', sourceUrl: EVI_SRC, exchangeId: 'ex' }, 'ex').ok
    && !m.toMarketProfileTimestamps({ evidenceCheckedAt: daysAgo(5), nextReviewAt: '2026-12-31T00:00:00Z', exchangeId: 'ex' }, 'ex').ok
    && m.toMarketProfileTimestamps({ ...validMeta, exchangeId: 'okx' }, 'bybit').reason === 'EVIDENCE_IDENTITY_MISMATCH'
    && m.toMarketProfileTimestamps(validMeta, 'ex').ok
  ))());
  check('evi/23c: adapter requires identity — missing evidence.exchangeId + malformed expected fail closed', (() => (
    m.toMarketProfileTimestamps({ evidenceCheckedAt: daysAgo(5), nextReviewAt: '2026-12-31T00:00:00Z', sourceUrl: EVI_SRC }, 'ex').reason === 'EVIDENCE_IDENTITY_MISMATCH'
    && m.toMarketProfileTimestamps(validMeta, '').reason === 'EVIDENCE_IDENTITY_MISMATCH'
    && m.toMarketProfileTimestamps(validMeta, 'EX!').reason === 'EVIDENCE_IDENTITY_MISMATCH'
  ))());
  check('evi/24: PUBLIC_MARKET_PROFILES remains Object.freeze([])', Array.isArray(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0 && Object.isFrozen(m.PUBLIC_MARKET_PROFILES));
  check('evi/disc: disclosure derives semantic ISO + source ONLY from a valid machine record', (() => {
    const machine = m.resolveDisclosure({ tone: 'verified', evidence: validMeta, now: NOW, isAffiliate: false, methodologyHref: '/methodology/' }, 'en');
    const humanOnly = m.resolveDisclosure({ tone: 'verified', evidence: { evidenceCheckedAt: 'June 2026', nextReviewAt: 'July 2026', sourceUrl: EVI_SRC }, now: NOW, isAffiliate: false, methodologyHref: '/methodology/' }, 'en');
    return machine.lastCheckedIso === validMeta.evidenceCheckedAt && machine.sourceHref === validMeta.sourceUrl && humanOnly.lastCheckedIso === null && humanOnly.sourceHref === null;
  })());

  // ── #250 R1/R2 — OFFER evidence end-to-end through the country-aware gate ──
  const OEV = { evidenceCheckedAt: daysAgo(5), nextReviewAt: '2026-12-31T00:00:00Z', sourceUrl: 'https://ex.com/oe', exchangeId: 'ex' };
  const offerWith = (ev) => ({ exchangeSlug: 'ex', status: 'verified', restrictedCountries: [], evidence: ev });
  check('e2e/1: verified offer + approved fresh profile + MISSING offer evidence → no /go/ (OFFER_EVIDENCE_MISSING)', (() => { const r = car({ offer: { exchangeSlug: 'ex', status: 'verified', restrictedCountries: [] } }); return !isGo(r) && r.gateReason === 'OFFER_EVIDENCE_MISSING'; })());
  check('e2e/2: offer evidence null → no /go/', (() => { const r = car({ offer: offerWith(null) }); return !isGo(r) && r.gateReason === 'OFFER_EVIDENCE_MISSING'; })());
  check('e2e/3: date-only offer evidence → no /go/ (OFFER_EVIDENCE_INVALID)', (() => { const r = car({ offer: offerWith({ evidenceCheckedAt: '2026-07-05', nextReviewAt: '2026-12-31', sourceUrl: 'https://ex.com/oe', exchangeId: 'ex' }) }); return !isGo(r) && r.gateReason === 'OFFER_EVIDENCE_INVALID'; })());
  check('e2e/4: stale offer evidence → no /go/ (OFFER_EVIDENCE_STALE)', (() => { const r = car({ offer: offerWith({ ...OEV, evidenceCheckedAt: daysAgo(200) }) }); return !isGo(r) && r.gateReason === 'OFFER_EVIDENCE_STALE'; })());
  check('e2e/5: future offer evidence → no /go/ (OFFER_EVIDENCE_FUTURE)', (() => { const r = car({ offer: offerWith({ ...OEV, evidenceCheckedAt: new Date(NOW + 61 * 60000).toISOString() }) }); return !isGo(r) && r.gateReason === 'OFFER_EVIDENCE_FUTURE'; })());
  check('e2e/6: overdue offer evidence → no /go/ (OFFER_EVIDENCE_REVIEW_OVERDUE)', (() => { const r = car({ offer: offerWith({ ...OEV, evidenceCheckedAt: daysAgo(5), nextReviewAt: daysAgo(1) }) }); return !isGo(r) && r.gateReason === 'OFFER_EVIDENCE_REVIEW_OVERDUE'; })());
  check('e2e/7: exact current offer evidence + exact current profile + all invariants → /go/ex', (() => { const r = car({ offer: offerWith(OEV) }); return isGo(r) && r.href === '/go/ex' && r.rel.includes('sponsored'); })());
  check('e2e/8: offer evidence for ANOTHER exchange → no /go/ (OFFER_EVIDENCE_IDENTITY_MISMATCH)', (() => { const r = car({ offer: offerWith({ ...OEV, exchangeId: 'other' }) }); return !isGo(r) && r.gateReason === 'OFFER_EVIDENCE_IDENTITY_MISMATCH'; })());
  check('e2e/8b: offer evidence with missing exchangeId → no /go/ (identity mismatch)', (() => { const r = car({ offer: offerWith({ evidenceCheckedAt: daysAgo(5), nextReviewAt: '2026-12-31T00:00:00Z', sourceUrl: 'https://ex.com/oe' }) }); return !isGo(r) && r.gateReason === 'OFFER_EVIDENCE_IDENTITY_MISMATCH'; })());
  check('e2e/9: profile current but offer STALE → no /go/', (() => { const r = car({ offer: offerWith({ ...OEV, evidenceCheckedAt: daysAgo(200) }) }); return !isGo(r) && r.gateReason === 'OFFER_EVIDENCE_STALE'; })());
  check('e2e/10: offer current but PROFILE stale → no /go/ (EVIDENCE_STALE)', (() => { const r = car({ offer: offerWith(OEV), marketProfiles: [{ ...okProfile, lastCheckedAt: daysAgo(200), nextReviewAt: daysAgo(-30) }] }); return !isGo(r) && r.gateReason === 'EVIDENCE_STALE'; })());
  check('e2e/clock: non-finite clock stays CLOCK_INVALID', (() => { const r = car({ offer: offerWith(OEV), now: NaN }); return !isGo(r) && r.gateReason === 'CLOCK_INVALID'; })());
  check('e2e/status: offer.status=verified alone cannot substitute for evidence', (() => { const r = car({ offer: { exchangeSlug: 'ex', status: 'verified', restrictedCountries: [] } }); return !isGo(r); })());
  check('e2e/i18n: all offer-evidence reasons localized en/ru/kk (no raw key)', (() => {
    const reasons = ['OFFER_EVIDENCE_MISSING', 'OFFER_EVIDENCE_INVALID', 'OFFER_EVIDENCE_IDENTITY_MISMATCH', 'OFFER_EVIDENCE_FUTURE', 'OFFER_EVIDENCE_STALE', 'OFFER_EVIDENCE_REVIEW_OVERDUE'];
    return reasons.every((rk) => ['en', 'ru', 'kk'].every((l) => { const t = m.gateReasonText(rk, l); return t && t.trim() && t !== rk; }));
  })());
  check('e2e/resolver: resolveOfferEvidenceAuthorization is pure fail-closed (no throw on junk)', (() => {
    const junk = [undefined, null, {}, 42, 'x', { evidenceCheckedAt: 'x' }, OEV];
    for (const j of junk) { try { m.resolveOfferEvidenceAuthorization(j, 'ex', NOW); } catch { return false; } }
    return m.resolveOfferEvidenceAuthorization(OEV, 'ex', NaN).reason === 'CLOCK_INVALID'
      && m.resolveOfferEvidenceAuthorization(null, 'ex', NOW).reason === 'OFFER_EVIDENCE_MISSING'
      && m.resolveOfferEvidenceAuthorization(OEV, 'ex', NOW).ok === true;
  })());

  // --- Invariant: a non-commercial model may never point at /go/ ---
  let threw = false;
  try { m.assertCommercialCtaModel({ ...goModel, isAffiliate: false, visualState: 'review' }); } catch { threw = true; }
  check('cta: invariant throws on non-commercial /go/ leak', threw);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(results.join('\n'));
console.log(`\nportal contracts: ${results.length - failures} passed, ${failures} failed`);
if (failures) { console.error('FAIL: portal contract fail-closed guarantees regressed'); process.exit(1); }
console.log('PASS: portal contracts are fail-closed');
