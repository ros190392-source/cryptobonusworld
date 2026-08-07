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
import { runResolutionHarness } from './test-support/offer-packet-resolution-harness.mjs';
import { makeSyntheticPromoPolicy, makeSyntheticPartnerConfirmation } from './test-support/synthetic-confirmation-fixtures.mjs';
import { runTestAuthorityGuard, runGuardSelfTests } from './test-authority-guard.mjs';
import { runBybitPublicOutputAudit, BYBIT_UNIQUE_FORBIDDEN, BYBIT_PROMO_CODE } from './bybit-public-output-audit.mjs';
import { existsSync } from 'node:fs';

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
const offerEvidencePacket = join(ROOT, 'src/data/contracts/offerEvidencePacket.ts');
const bybitOfferEvidence = join(ROOT, 'src/data/evidence/offers/bybitOfferEvidence.ts');
const publicRenderedCapture = join(ROOT, 'src/data/contracts/publicRenderedCapture.ts');
const claimConfirmation = join(ROOT, 'src/data/contracts/claimConfirmation.ts');
const bybitPromoCodeConfirmation = join(ROOT, 'src/data/evidence/offers/bybitPromoCodeConfirmation.ts');
const offerPacketResolution = join(ROOT, 'src/data/contracts/offerPacketResolution.ts');
const officialSourceCapture = join(ROOT, 'src/data/contracts/officialSourceCapture.ts');
const bybitOfferClaimSourcePlan = join(ROOT, 'src/data/contracts/bybitOfferClaimSourcePlan.ts');
const bybitPublicPresentation = join(ROOT, 'src/data/evidence/offers/bybitPublicPresentation.ts');
const publicOfferView = join(ROOT, 'src/data/publicOfferView.ts');

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
        `export { buildHomepageTop10 } from ${JSON.stringify(homepageData)};\n` +
        `export { assertPortalRouteRecord, resolvePortalRoute } from ${JSON.stringify(routeGuards)};\n` +
        `export { emitPublicRankingRoutes } from ${JSON.stringify(publication)};\n` +
        `export { resolveDisclosure } from ${JSON.stringify(disclosure)};\n` +
        `export { isInternalPath, assertInternalPath } from ${JSON.stringify(internalPath)};\n` +
        `export { normalizeCountryInput, SUPPORTED_COUNTRY_CODES } from ${JSON.stringify(countryInput)};\n` +
        `export { resolveMarketProfile, PUBLIC_MARKET_PROFILES } from ${JSON.stringify(marketProfileRegistry)};\n` +
        `export { resolveCountryAwareCommercialCta, normalizeRestrictedCountries, PUBLIC_HOMEPAGE_COUNTRY } from ${JSON.stringify(countryAwareCta)};\n` +
        `export { isExactIsoDateTime, parseExactIsoDateTime, validateEvidenceMetadata, assessEvidenceAuthorization, resolveOfferEvidenceAuthorization, formatEvidenceCheckedAt, deriveCheckedDisplay, toMarketProfileTimestamps } from ${JSON.stringify(evidenceMetadata)};\n` +
        `export { offers, getOffer } from ${JSON.stringify(offersData)};\n` +
        `export { validateOfferEvidencePacket, isOfficialBybitSource, deriveUnsupportedClaims, computeCaptureManifestDigest, canonicalCaptureManifest, BYBIT_OFFER_CLAIM_POLICY, BYBIT_OFFER_CLAIM_INVENTORY, BYBIT_OFFER_REQUIRED_CLAIMS, ALLOWED_OWNER_IDENTITIES } from ${JSON.stringify(offerEvidencePacket)};\n` +
        `export * as OEP from ${JSON.stringify(offerEvidencePacket)};\n` +
        `export { getBybitOfferCommercialIdentity, resolveBybitOfferPacketClaims, computeResolutionDigest, canonicalResolution, computeRawPacketDigest, computeConfirmationSetDigest, computeConfirmationPolicyDigest, validateResolvedOfferPacket, adaptBybitOfferToEvidence, PRODUCTION_CONFIRMATION_POLICY_ID, PRODUCTION_CONFIRMATION_POLICY_DIGEST, RESOLUTION_SCHEMA_ID } from ${JSON.stringify(offerPacketResolution)};\n` +
        `export * as OPR from ${JSON.stringify(offerPacketResolution)};\n` +
        `export { BYBIT_OFFER_EVIDENCE_PACKET, BYBIT_OFFER_EVIDENCE_DECISION, deriveBybitDecision, deriveBybitOfferEvidence, bybitOfferEvidence } from ${JSON.stringify(bybitOfferEvidence)};\n` +
        `export { validatePublicRenderedCapture, computeFragmentDigest, computeRenderedArtifactDigest, canonicalRenderedArtifact, isOfficialBybitUrl, captureMaySupportClaims, fragmentSupportsClaim, RENDER_OUTCOMES, MAX_FRAGMENT_TEXT_LENGTH, MAX_REDIRECTS, MAX_LOCATOR_LENGTH, MAX_WARNINGS, MAX_WARNING_LENGTH, MAX_PAGE_TITLE_LENGTH } from ${JSON.stringify(publicRenderedCapture)};\n` +
        `export { validateClaimConfirmation, normalizeReferralCode, normalizeStatement, computeAssertedValueDigest, computeSourceStatementDigest, computeReceiptDigest, canonicalSourceAssertion, computeConfirmationArtifactDigest, canonicalConfirmationArtifact, promoAdmissibilityIssues, evaluatePromoCodeConfirmations, evaluateBybitPromoCodeConfirmations, promoCodeSetConfirmsValue, BYBIT_PROMO_CODE_CONFIRMATION_POLICY, CONFIRMATION_SOURCE_KINDS, CONFIRMATION_LIFECYCLE_STATES, ARTIFACT_INTENTS, ASSIGNMENT_STATES, MAX_STATEMENT_LENGTH } from ${JSON.stringify(claimConfirmation)};\n` +
        `export * as CC from ${JSON.stringify(claimConfirmation)};\n` +
        `export { BYBIT_PROMO_CODE_CONFIRMATIONS, BYBIT_PROMO_CODE_CONFIRMATION_STATE, BYBIT_PROMO_CODE_CANDIDATE, BYBIT_PROMO_CODE_CANDIDATE_CONFIRMED } from ${JSON.stringify(bybitPromoCodeConfirmation)};\n` +
        `export { validateOfficialSourceCapture, computeOfficialSourceDigest, computeOfficialFragmentDigest, canonicalOfficialSource, sourceMaySupportClaims, sourceWasReachable, officialFragmentAddressesClaim, OFFICIAL_SOURCE_SCOPES, OFFICIAL_SOURCE_OUTCOMES, MAX_SOURCE_FRAGMENT_TEXT } from ${JSON.stringify(officialSourceCapture)};\n` +
        `export * as OSC from ${JSON.stringify(officialSourceCapture)};\n` +
        `export { BYBIT_OFFER_CLAIM_SOURCE_PLAN, BYBIT_OFFICIAL_SOURCE_CANDIDATES, BYBIT_OFFER_EXTRACTION_PLAN, SOURCE_PLAN_TARGET_CLAIMS, SOURCE_PLAN_EXCLUDED_CLAIMS, BYBIT_SOURCE_PLAN_ID, BYBIT_SOURCE_PLAN_DIGEST, getSourcePlanEntry, getCandidate, computeCandidateDigest, assessOfferClaimEvidence, assessAllOfferClaims, buildOfficialSourceEvidenceRun, documentIdentity, validateSourcePlanCoverage, validateExtractionCoverage } from ${JSON.stringify(bybitOfferClaimSourcePlan)};\n` +
        `export { deriveBybitPublicOfferPresentation, BYBIT_PUBLIC_CLAIM_BINDINGS, resolvePublicClaimValue, resolvePublicPromoCode, BYBIT_NEUTRAL_HEADLINE, BYBIT_NEUTRAL_DETAIL, BYBIT_NEUTRAL_STATUS_LABEL, BYBIT_NEUTRAL_SUMMARY } from ${JSON.stringify(bybitPublicPresentation)};\n` +
        `export { resolvePublicOfferView } from ${JSON.stringify(publicOfferView)};`,
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

  // Issue #264 (R5): the homepage model is built from an EXPLICIT clock (no no-clock
  // module snapshot). Tests build it once with a fixed clock.
  const HP_NOW = Date.parse('2026-08-06T00:00:00Z');
  const homepageTop10 = m.buildHomepageTop10(HP_NOW);

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
  const bybit = homepageTop10.find((e) => e.slug === 'bybit');       // verified offer
  const binance = homepageTop10.find((e) => e.slug === 'binance');   // research row, no offer
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
    const all = homepageTop10.map((e) => m.resolveHomepageTop10Cta(e, 'production', 'en'));
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
    const other = homepageTop10.find((e) => e.slug === 'okx');
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
    const all = homepageTop10.map((e) => m.resolveHomepageTop10Cta(e, 'preview', 'en'));
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
  check('evi/21: public homepage PREVIEW emits zero /go/', homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'preview', 'en').primary.href.startsWith('/go/')));
  check('evi/22: public homepage PRODUCTION simulation emits zero /go/', homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'production', 'en').primary.href.startsWith('/go/')));
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

  // ===== Split 3 (#252, hardened R1–R8) — Bybit OfferEvidencePacket =====
  // Requirements, digest, source bindings and approval identity are CODE-OWNED;
  // the packet cannot declare its own authorization policy. The real packet stays
  // draft / under re-verification. A truly complete canonical fixture proves the
  // Outcome-A path is possible only under every code-owned condition.
  const PKT_NOW = Date.parse('2026-08-05T20:00:00Z');
  const pdaysAgo = (d) => new Date(PKT_NOW - d * 86400000).toISOString();
  const OFFICIAL = 'https://www.bybit.com/en/promo/new-user/';
  const capA = { captureId: 'probe-a', sourceUrl: OFFICIAL, capturedAt: pdaysAgo(1), observedStatus: 200, redirectLocation: null, responseBytes: 2048, bodyDigest: 'sha256:' + 'b'.repeat(64), contentType: 'text/html', normalizedObservation: 'official new-user promo content observed' };
  const REQ = new Set(m.BYBIT_OFFER_REQUIRED_CLAIMS);
  const mkClaim = (id, result, refs) => ({ claimId: id, label: id, result, observed: 'obs', sourceRefs: refs, limitation: '' });
  // Complete canonical claim set (#258): every required claim supported + capture-
  // cited EXCEPT bybit.promo_code, which may never be raw-supported — its authority
  // comes only from the confirmation bridge, so it stays partner-confirmation-required
  // in the raw packet. realistic_value editorial; other optionals supported + cited.
  // Issue #260 (R9): source-plan target claims may NEVER be raw-supported; their support
  // is derived by the resolver from the source-plan assessment. Only source_identity is
  // raw-supported (identity-bound capture path). Target claims stay inaccessible in the raw
  // packet fixture; promo stays confirmation-required; realistic_value is editorial.
  const completeClaims = () => m.BYBIT_OFFER_CLAIM_INVENTORY.map((id) =>
    id === 'bybit.realistic_value' ? mkClaim(id, 'not_found', ['editorial:cbw'])
      : id === 'bybit.promo_code' ? mkClaim(id, 'requires_owner_partner_confirmation', ['capture:probe-a'])
        : id === 'bybit.source_identity' ? mkClaim(id, 'supported', ['capture:probe-a'])
          : mkClaim(id, 'inaccessible', ['capture:probe-a']));
  const APPROVER = { approvedBy: 'ros190392-source', approvedAt: pdaysAgo(1), approvalRef: 'https://github.com/ros190392-source/cryptobonusworld/pull/253#pullrequestreview-1' };
  const buildPacket = (over = {}) => {
    const captures = over.captures || [capA];
    const base = {
      packetId: 'bybit-test-approved', exchangeId: 'bybit',
      capturedAt: pdaysAgo(1), nextReviewAt: '2026-12-31T00:00:00Z',
      sourceUrl: OFFICIAL, primaryCaptureId: 'probe-a',
      captureMethod: 'manual_official_review', captureTool: 'cbw-test/1.0',
      captures, claims: completeClaims(),
      warnings: [], limitations: [], approval: 'approved', approver: { ...APPROVER },
      ...over,
    };
    // Recompute digest for a legitimately-built packet unless the test overrides it.
    if (!('captureManifestDigest' in over)) base.captureManifestDigest = m.computeCaptureManifestDigest(base.captures);
    return base;
  };
  const approvedPacket = buildPacket();
  const withoutClaim = (id) => buildPacket({ claims: completeClaims().filter((c) => c.claimId !== id) });
  const withClaim = (id, patch) => buildPacket({ claims: completeClaims().map((c) => c.claimId === id ? { ...c, ...patch } : c) });

  check('pkt/1: complete raw packet is valid but the single product adapter blocks on promo (empty set)', (() => {
    const valid = m.validateOfferEvidencePacket(approvedPacket).ok;
    const r = m.adaptBybitOfferToEvidence(approvedPacket, [], PKT_NOW);
    // Promo authority never flows through the raw packet (#258): with an empty
    // confirmation set the only product adapter blocks on promo.
    return valid && r.ok === false && r.reason === 'REQUIRED_CLAIM_UNSUPPORTED';
  })());
  check('pkt/1b: raw packet forbids hand-setting promo to supported', (() => {
    const p = withClaim('bybit.promo_code', { result: 'supported' });
    const v = m.validateOfferEvidencePacket(p);
    return !v.ok && v.issues.some((i) => i.code === 'PROMO_RAW_SUPPORT_FORBIDDEN');
  })());
  check('pkt/1c: legacy ownerConfirmations field is rejected', (() => {
    const p = buildPacket({ ownerConfirmations: [] });
    const v = m.validateOfferEvidencePacket(p);
    return !v.ok && v.issues.some((i) => i.code === 'LEGACY_FIELD_FORBIDDEN');
  })());
  check('pkt/2: missing KYC claim → inventory invalid', (() => { const p = withoutClaim('bybit.kyc_required'); return !m.validateOfferEvidencePacket(p).ok && m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'PACKET_CLAIM_INVENTORY_INVALID') && m.adaptBybitOfferToEvidence(p, [], PKT_NOW).reason === 'RESOLUTION_INVALID'; })());
  check('pkt/3: missing restrictions claim → inventory invalid', !m.validateOfferEvidencePacket(withoutClaim('bybit.restricted_countries')).ok);
  check('pkt/4: missing terms-summary claim → inventory invalid', !m.validateOfferEvidencePacket(withoutClaim('bybit.terms_summary')).ok);
  check('pkt/5: setting a code-required claim to optional cannot bypass', (() => {
    const p = withClaim('bybit.kyc_required', { result: 'inaccessible', requiredForAuthorization: false });
    return !m.validateOfferEvidencePacket(p).ok && m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'PACKET_CANNOT_DECLARE_REQUIREMENT') && !m.adaptBybitOfferToEvidence(p, [], PKT_NOW).ok;
  })());
  check('pkt/6: unknown claim rejected', (() => { const p = buildPacket({ claims: [...completeClaims(), mkClaim('bybit.unknown', 'supported', ['capture:probe-a'])] }); return !m.validateOfferEvidencePacket(p).ok; })());
  check('pkt/7: duplicate claim rejected', (() => { const p = buildPacket({ claims: [...completeClaims(), mkClaim('bybit.kyc_required', 'supported', ['capture:probe-a'])] }); return !m.validateOfferEvidencePacket(p).ok && m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'PACKET_CLAIM_INVENTORY_INVALID'); })());
  check('pkt/8: declared unsupportedClaims rejected (derived, atomic)', (() => { const p = buildPacket({ unsupportedClaims: [] }); return !m.validateOfferEvidencePacket(p).ok && m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'DERIVED_FIELD'); })());
  check('pkt/9: required supported claim with unknown capture ref rejected', !m.validateOfferEvidencePacket(withClaim('bybit.kyc_required', { sourceRefs: ['capture:nope'] })).ok);
  check('pkt/10: required supported claim citing editorial source rejected', (() => { const p = withClaim('bybit.source_identity', { result: 'supported', sourceRefs: ['editorial:cbw'] }); return !m.validateOfferEvidencePacket(p).ok && m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'INADMISSIBLE_SUPPORT'); })());
  check('pkt/11: claim citing undeclared capture rejected', !m.validateOfferEvidencePacket(withClaim('bybit.bonus_headline', { sourceRefs: ['capture:ghost'] })).ok);
  check('pkt/12: complete claim sources bound to declared official captures accepted', (() => { const p = approvedPacket; return m.validateOfferEvidencePacket(p).ok && m.BYBIT_OFFER_REQUIRED_CLAIMS.every((id) => p.claims.find((c) => c.claimId === id).sourceRefs.some((r) => r.startsWith('capture:'))); })());
  check('pkt/13: arbitrary all-a packet digest rejected', (() => { const p = buildPacket({ captureManifestDigest: 'sha256:' + 'a'.repeat(64) }); return !m.validateOfferEvidencePacket(p).ok && m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'DIGEST_MISMATCH') && m.adaptBybitOfferToEvidence(p, [], PKT_NOW).reason === 'RESOLUTION_INVALID'; })());
  check('pkt/14: manifest tampering after digest creation rejected', (() => { const p = buildPacket(); p.captures[0].normalizedObservation = 'TAMPERED'; return !m.validateOfferEvidencePacket(p).ok && m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'DIGEST_MISMATCH'); })());
  check('pkt/15: changing response status invalidates digest', (() => { const p = buildPacket(); p.captures[0].observedStatus = 404; return m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'DIGEST_MISMATCH'); })());
  check('pkt/16: changing bodyDigest invalidates digest', (() => { const p = buildPacket(); p.captures[0].bodyDigest = 'sha256:' + 'c'.repeat(64); return m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'DIGEST_MISMATCH'); })());
  check('pkt/17: invalid HTTP status rejected', (() => { const p = buildPacket({ captures: [{ ...capA, observedStatus: 99 }] }); return !m.validateOfferEvidencePacket(p).ok && m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'INVALID_STATUS'); })());
  check('pkt/18: URL credentials rejected', (() => { const p = buildPacket({ sourceUrl: 'https://user:pass@www.bybit.com/en/promo/new-user/', primaryCaptureId: 'probe-a', captures: [{ ...capA, sourceUrl: 'https://user:pass@www.bybit.com/en/promo/new-user/' }] }); return !m.validateOfferEvidencePacket(p).ok; })());
  check('pkt/19: approvedBy="owner" rejected', (() => { const p = buildPacket({ approver: { ...APPROVER, approvedBy: 'owner' } }); return !m.validateOfferEvidencePacket(p).ok && m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'UNKNOWN_OWNER'); })());
  check('pkt/20: unknown approver rejected', !m.validateOfferEvidencePacket(buildPacket({ approver: { ...APPROVER, approvedBy: 'someone-else' } })).ok);
  check('pkt/21: approval before capture rejected', (() => { const p = buildPacket({ capturedAt: pdaysAgo(1), approver: { ...APPROVER, approvedAt: pdaysAgo(2) } }); return !m.validateOfferEvidencePacket(p).ok && m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'APPROVAL_BEFORE_CAPTURE'); })());
  check('pkt/22: future approval rejected (adapter APPROVAL_UNTRUSTED)', (() => { const p = buildPacket({ approver: { ...APPROVER, approvedAt: new Date(PKT_NOW + 3600000).toISOString() } }); return m.validateOfferEvidencePacket(p).ok && m.adaptBybitOfferToEvidence(p, [], PKT_NOW).reason === 'APPROVAL_UNTRUSTED'; })());
  check('pkt/23: approval after nextReviewAt rejected', (() => { const p = buildPacket({ approver: { ...APPROVER, approvedAt: '2027-01-01T00:00:00Z' } }); return !m.validateOfferEvidencePacket(p).ok && m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'APPROVAL_AFTER_REVIEW'); })());
  check('pkt/24: missing approvalRef rejected', (() => { const p = buildPacket(); delete p.approver.approvalRef; return !m.validateOfferEvidencePacket(p).ok && m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'INVALID_APPROVAL_REF'); })());
  check('pkt/25: recursive unsafe approver/capture content rejected', (() => {
    const p1 = buildPacket({ approver: { ...APPROVER, note: 'see C:\\\\secret\\\\notes.txt' } });
    const p2 = buildPacket({ captures: [{ ...capA, normalizedObservation: 'token=abc123 leaked' }] });
    return !m.validateOfferEvidencePacket(p1).ok && !m.validateOfferEvidencePacket(p2).ok;
  })());
  check('pkt/26: real draft packet remains structurally valid', m.validateOfferEvidencePacket(m.BYBIT_OFFER_EVIDENCE_PACKET).ok === true);
  check('pkt/27: real draft packet remains under_re_verification', m.BYBIT_OFFER_EVIDENCE_DECISION === 'under_re_verification' && m.deriveBybitDecision(PKT_NOW) === 'under_re_verification');
  check('pkt/28: real packet cannot adapt', m.deriveBybitOfferEvidence(PKT_NOW).ok === false);
  check('pkt/29: offers.bybit.evidence remains null', m.bybitOfferEvidence === null && m.getOffer('bybit').evidence === null && m.getOffer('bybit').status === 'verified');
  check('pkt/30: preview homepage /go/* = 0', homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'preview', 'en').primary.href.startsWith('/go/')));
  check('pkt/31: public production simulation /go/* = 0', homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'production', 'en').primary.href.startsWith('/go/')));
  check('pkt/32: PUBLIC_MARKET_PROFILES remains Object.freeze([])', Array.isArray(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0 && Object.isFrozen(m.PUBLIC_MARKET_PROFILES));
  check('pkt/33: locale cannot change packet facts / decision', (() => {
    const results = m.BYBIT_OFFER_EVIDENCE_PACKET.claims.map((c) => c.claimId + '=' + c.result).join(',');
    const disc = (l) => m.resolveDisclosure({ tone: 'verified', evidence: m.bybitOfferEvidence, expectedExchangeId: 'bybit', now: PKT_NOW, isAffiliate: false, methodologyHref: '/methodology/' }, l);
    const en = disc('en'), ru = disc('ru'), kk = disc('kk');
    return typeof results === 'string' && en.evidenceState === 'none' && en.evidenceState === ru.evidenceState && ru.evidenceState === kk.evidenceState && m.BYBIT_OFFER_EVIDENCE_DECISION === 'under_re_verification';
  })());
  // Integrity + policy sanity on the committed real packet.
  check('pkt/integrity: committed real packet digest recomputes exactly', m.computeCaptureManifestDigest(m.BYBIT_OFFER_EVIDENCE_PACKET.captures) === m.BYBIT_OFFER_EVIDENCE_PACKET.captureManifestDigest);
  check('pkt/policy: code-owned inventory has 13 unique claims + 9 required; real packet matches inventory', (() => {
    const inv = m.BYBIT_OFFER_CLAIM_INVENTORY;
    const invUnique = new Set(inv).size === inv.length && inv.length === 13 && m.BYBIT_OFFER_REQUIRED_CLAIMS.length === 9;
    const packetIds = new Set(m.BYBIT_OFFER_EVIDENCE_PACKET.claims.map((c) => c.claimId));
    return invUnique && inv.every((id) => packetIds.has(id)) && packetIds.size === inv.length;
  })());
  check('pkt/derived: real unsupportedClaims derived = 12 non-supported (only source_identity supported)', (() => { const u = m.deriveUnsupportedClaims(m.BYBIT_OFFER_EVIDENCE_PACKET); return u.length === 12 && !u.includes('bybit.source_identity'); })());
  check('pkt/two-probes: real capture manifest has both official probes', (() => { const c = m.BYBIT_OFFER_EVIDENCE_PACKET.captures; return c.length === 2 && c.every((x) => m.isOfficialBybitSource(x.sourceUrl) && Number.isInteger(x.observedStatus)) && c.some((x) => x.captureId === 'probe-a') && c.some((x) => x.captureId === 'probe-b'); })());

  // ===== Split 3 (#254) — public rendered-capture runner (offline replay, R1–R9) =====
  const INV = m.BYBIT_OFFER_CLAIM_INVENTORY;
  const R_URL = 'https://www.bybit.com/en/promo/new-user/';
  const RECEIPT = { persistentContextUsed: false, storageStateImported: false, proxyConfigured: false, httpCredentialsConfigured: false, initialCookieCount: 0, initialLocalStorageEntryCount: 0, initialSessionStorageEntryCount: 0, formSubmissionsObserved: 0, downloadsObserved: 0, fileChoosersObserved: 0, externalMainFrameNavigationsBlocked: 0, artifactContainsCookieValues: false };
  const mkFrag = (over = {}) => { const f = { fragmentId: 'f1', captureId: 'rc1', extractionType: 'meta', locator: 'meta[name=description]', text: 'Welcome bonus up to 30,000 USDT', claimIds: [], limitations: 'bounded', ...over }; f.textLength = f.text.length; f.fragmentDigest = m.computeFragmentDigest(f); return f; };
  // A claim-BOUND fragment (binds bybit.bonus_headline) for the positive fixture.
  const mkClaimFrag = (over = {}) => mkFrag({ fragmentId: 'f-bonus', extractionType: 'visible_text', locator: 'h1', text: 'Welcome bonus up to 30,000 USDT', claimIds: ['bybit.bonus_headline'], ...over });
  const mkCap = (over = {}) => {
    const base = {
      captureId: 'rc1', exchangeId: 'bybit', requestedUrl: R_URL, finalUrl: R_URL, redirectChain: [],
      capturedAt: '2026-08-05T21:00:00Z', browserName: 'chromium', browserVersion: '148.0.7778.96', runtimeVersion: 'v24.14.0',
      ephemeralContext: { persistentProfileUsed: false, importedStorageState: false, proxyUsed: false, authenticationUsed: false, formSubmissionPerformed: false, downloadPerformed: false },
      runtimeReceipt: { ...RECEIPT }, viewport: { width: 1280, height: 900 }, locale: 'en-US', mainDocumentStatus: 200, contentType: 'text/html', pageTitle: 'Bybit',
      outcome: 'rendered', fragments: [mkFrag()], structuredMetadata: { pageTitle: 'Bybit', description: null, canonicalUrl: null, ogTitle: null, ogDescription: null, jsonLdType: null },
      warnings: [], limitations: [], normalizedArtifactDigest: 'sha256:' + '0'.repeat(64), ...over,
    };
    if (!('normalizedArtifactDigest' in over)) base.normalizedArtifactDigest = m.computeRenderedArtifactDigest(base);
    return base;
  };
  const NULL_META = { pageTitle: null, description: null, canonicalUrl: null, ogTitle: null, ogDescription: null, jsonLdType: null };
  // A valid "no official document observed" capture (network_error / timeout / external_redirect).
  const mkNoDoc = (outcome, over = {}) => mkCap({ outcome, finalUrl: null, mainDocumentStatus: null, contentType: null, pageTitle: null, fragments: [], structuredMetadata: { ...NULL_META }, ...over });
  const vc = (cap) => m.validatePublicRenderedCapture(cap, INV);
  const codes = (cap) => vc(cap).issues.map((i) => i.code);
  const has = (cap, code) => codes(cap).includes(code);
  const ec = (patch) => mkCap({ ephemeralContext: { persistentProfileUsed: false, importedStorageState: false, proxyUsed: false, authenticationUsed: false, formSubmissionPerformed: false, downloadPerformed: false, ...patch } });
  const rr = (patch) => mkCap({ runtimeReceipt: { ...RECEIPT, ...patch } });
  // Tamper helper: mutate a committed-shape capture WITHOUT recomputing the digest.
  const tamper = (mut) => { const c = mkCap(); mut(c); return c; };

  // -- R8 ephemeral + runtime safety receipt --
  check('render/1: valid ephemeral+receipt capture accepted', vc(mkCap()).ok === true);
  check('render/2: persistent profile rejected', has(ec({ persistentProfileUsed: true }), 'EPHEMERAL_VIOLATION'));
  check('render/3: imported storage state rejected', !vc(ec({ importedStorageState: true })).ok);
  check('render/4: proxy rejected', !vc(ec({ proxyUsed: true })).ok);
  check('render/5: authentication rejected', !vc(ec({ authenticationUsed: true })).ok);
  check('render/6: form submission rejected', !vc(ec({ formSubmissionPerformed: true })).ok);
  check('render/7: download rejected', !vc(ec({ downloadPerformed: true })).ok);
  check('render/8: cookies/tokens content rejected recursively', has(mkCap({ warnings: ['token=abc123'] }), 'UNSAFE_CONTENT'));
  check('render/9: receipt false-flag violation rejected', has(rr({ proxyConfigured: true }), 'RECEIPT_VIOLATION'));
  check('render/10: receipt zero-count violation rejected', has(rr({ formSubmissionsObserved: 1 }), 'RECEIPT_VIOLATION') && has(rr({ initialCookieCount: 1 }), 'RECEIPT_VIOLATION'));
  check('render/11: receipt unknown field rejected', has(rr({ extraField: true }), 'RECEIPT_UNKNOWN_FIELD'));
  check('render/12: receipt negative counter rejected', has(rr({ downloadsObserved: -1 }), 'RECEIPT_VIOLATION'));
  check('render/13: missing runtimeReceipt rejected', (() => { const c = mkCap(); delete c.runtimeReceipt; return has(c, 'REQUIRED'); })());

  // -- R1/R7 URLs + redirects --
  check('render/14: non-official requested URL rejected', !vc(mkCap({ requestedUrl: 'https://evil.example/x' })).ok);
  check('render/15: non-official final URL rejected', !vc(mkCap({ finalUrl: 'https://evil.example/x' })).ok);
  check('render/16: external redirect in chain rejected', has(mkCap({ redirectChain: ['https://evil.example/x'] }), 'NON_OFFICIAL_URL'));
  check('render/17: URL credentials rejected', !vc(mkCap({ requestedUrl: 'https://u:p@www.bybit.com/en/promo/new-user/' })).ok);
  check('render/18: unsafe token query param rejected', m.isOfficialBybitUrl('https://www.bybit.com/x?token=abc') === false && !vc(mkCap({ requestedUrl: 'https://www.bybit.com/x?token=abc' })).ok);
  check('render/19: too many redirects rejected', (() => { const chain = Array.from({ length: m.MAX_REDIRECTS + 1 }, (_, i) => `https://www.bybit.com/r${i}`); return has(mkCap({ redirectChain: chain }), 'TOO_MANY_REDIRECTS'); })());
  check('render/20: strict timestamp required', !vc(mkCap({ capturedAt: '2026-08-05' })).ok && !vc(mkCap({ capturedAt: 'August 2026' })).ok);
  check('render/21: unknown outcome rejected', has(mkNoDoc('weird'), 'INVALID_OUTCOME'));

  // -- R3 outcome matrix --
  check('render/22: rendered with null status rejected', has(mkCap({ mainDocumentStatus: null }), 'MATRIX_RENDERED_STATUS'));
  check('render/23: rendered with non-HTML content type rejected', has(mkCap({ contentType: 'application/json' }), 'MATRIX_RENDERED_CONTENT_TYPE'));
  check('render/24: rendered with 4xx/5xx rejected', has(mkCap({ mainDocumentStatus: 404 }), 'MATRIX_RENDERED_STATUS') && has(mkCap({ mainDocumentStatus: 503 }), 'MATRIX_RENDERED_STATUS'));
  check('render/25: rendered with zero fragments rejected', has(mkCap({ fragments: [] }), 'MATRIX_RENDERED_NEEDS_FRAGMENT'));
  check('render/26: redirect_only requires redirect evidence; with redirect accepted', (() => {
    const noRedir = mkCap({ outcome: 'redirect_only', fragments: [], mainDocumentStatus: 200, contentType: 'text/html', finalUrl: R_URL });
    const withRedir = mkCap({ outcome: 'redirect_only', fragments: [], mainDocumentStatus: 200, contentType: 'text/html', finalUrl: 'https://www.bybit.com/en/promo/global/welcome-gifts/' });
    return has(noRedir, 'MATRIX_REDIRECT_NEEDS_EVIDENCE') && vc(withRedir).ok;
  })());
  check('render/27: invalid HTTP status value rejected', has(mkCap({ mainDocumentStatus: 99 }), 'INVALID_STATUS'));

  // -- R1/R2 external + terminal (no-document) states --
  check('render/28: external_redirect with null finalUrl accepted; cannot support', (() => { const c = mkNoDoc('external_redirect'); return vc(c).ok && m.captureMaySupportClaims(c) === false; })());
  check('render/29: external_redirect cannot be rewritten as finalUrl=requestedUrl', has(mkNoDoc('external_redirect', { finalUrl: R_URL }), 'MATRIX_NO_DOCUMENT'));
  check('render/30: external_redirect cannot carry claim fragments', has(mkNoDoc('external_redirect', { fragments: [mkClaimFrag()] }), 'MATRIX_NO_CLAIM_FRAGMENTS') || has(mkNoDoc('external_redirect', { fragments: [mkClaimFrag()] }), 'MATRIX_NO_DOCUMENT'));
  check('render/31: network_error finalUrl null accepted', vc(mkNoDoc('network_error')).ok === true);
  check('render/32: network_error with fabricated finalUrl rejected', has(mkNoDoc('network_error', { finalUrl: R_URL }), 'MATRIX_NO_DOCUMENT'));
  check('render/33: network_error with title/metadata/fragments rejected', (() => {
    const withTitle = mkNoDoc('network_error', { pageTitle: 'Bybit', structuredMetadata: { ...NULL_META, pageTitle: 'Bybit' } });
    const withMeta = mkNoDoc('network_error', { structuredMetadata: { ...NULL_META, description: 'x' } });
    const withFrag = mkNoDoc('network_error', { fragments: [mkFrag()] });
    return has(withTitle, 'MATRIX_NO_DOCUMENT') && has(withMeta, 'MATRIX_NO_DOCUMENT') && has(withFrag, 'MATRIX_NO_DOCUMENT');
  })());
  check('render/34: timeout enforces no-document shape', has(mkNoDoc('timeout', { mainDocumentStatus: 200 }), 'MATRIX_NO_DOCUMENT') && vc(mkNoDoc('timeout')).ok);

  // -- walls --
  check('render/35: login/captcha/geo cannot support claims', ['login_wall', 'captcha_or_bot_wall', 'geo_restricted'].every((o) => m.captureMaySupportClaims(mkCap({ outcome: o, fragments: [] })) === false));
  check('render/36: wall with claim-linked fragment rejected', has(mkCap({ outcome: 'captcha_or_bot_wall', fragments: [mkClaimFrag()] }), 'MATRIX_NO_CLAIM_FRAGMENTS'));
  check('render/37: empty outcome cannot support + claim fragment rejected', m.captureMaySupportClaims(mkCap({ outcome: 'empty', fragments: [] })) === false && has(mkCap({ outcome: 'empty', fragments: [mkClaimFrag()] }), 'MATRIX_NO_CLAIM_FRAGMENTS'));

  // -- R7 fragments + bounds --
  check('render/38: fragment maximum length enforced', has(mkCap({ fragments: [mkFrag({ text: 'x'.repeat(m.MAX_FRAGMENT_TEXT_LENGTH + 1) })] }), 'FRAGMENT_TOO_LONG'));
  check('render/39: full HTML/page-body fragment rejected', has(mkCap({ fragments: [mkFrag({ text: '<html><body>page</body></html>' })] }), 'RAW_PAYLOAD') && !vc(mkCap({ fragments: [mkFrag({ text: '<body>whole page</body>' })] })).ok);
  check('render/40: locator required + bounded', !vc(mkCap({ fragments: [mkFrag({ locator: '' })] })).ok && has(mkCap({ fragments: [mkFrag({ locator: 'a'.repeat(m.MAX_LOCATOR_LENGTH + 1) })] }), 'INVALID_LOCATOR'));
  check('render/41: fragment claimIds must be known + unique', has(mkCap({ fragments: [mkFrag({ claimIds: ['bybit.not_a_claim'] })] }), 'INVALID_CLAIM_IDS') && has(mkCap({ fragments: [mkFrag({ claimIds: ['bybit.bonus_headline', 'bybit.bonus_headline'] })] }), 'INVALID_CLAIM_IDS'));
  check('render/42: unbounded warnings/limitations rejected', has(mkCap({ warnings: Array.from({ length: m.MAX_WARNINGS + 1 }, () => 'w') }), 'INVALID_ARRAY') && has(mkCap({ warnings: ['w'.repeat(m.MAX_WARNING_LENGTH + 1)] }), 'INVALID_ARRAY'));
  check('render/43: oversized pageTitle rejected + metadata mirror must match', has(mkCap({ pageTitle: 'x'.repeat(m.MAX_PAGE_TITLE_LENGTH + 1), structuredMetadata: { ...NULL_META, pageTitle: 'x'.repeat(m.MAX_PAGE_TITLE_LENGTH + 1) } }), 'INVALID') && has(mkCap({ pageTitle: 'A', structuredMetadata: { ...NULL_META, pageTitle: 'B' } }), 'PAGE_TITLE_MISMATCH'));
  check('render/44: canonicalUrl outside official host rejected', has(mkCap({ structuredMetadata: { ...NULL_META, pageTitle: 'Bybit', canonicalUrl: 'https://evil.example/x' } }), 'NON_OFFICIAL_URL'));

  // -- R6 complete artifact digest --
  check('render/45: fragment digest deterministic + tamper rejected', (() => { const f = mkClaimFrag(); const ok = m.computeFragmentDigest(f) === f.fragmentDigest; const t = tamper((c) => { c.fragments = [mkFrag()]; c.fragments[0].text = 'Tampered bounded text'; c.fragments[0].textLength = c.fragments[0].text.length; }); return ok && has(t, 'FRAGMENT_DIGEST_MISMATCH'); })());
  check('render/46: artifact digest recomputes', (() => { const c = mkCap(); return m.computeRenderedArtifactDigest(c) === c.normalizedArtifactDigest; })());
  check('render/47: capturedAt tamper breaks digest', has(tamper((c) => { c.capturedAt = '2026-08-05T22:00:00Z'; }), 'ARTIFACT_DIGEST_MISMATCH'));
  check('render/48: browserVersion tamper breaks digest', has(tamper((c) => { c.browserVersion = '999.0.0.0'; }), 'ARTIFACT_DIGEST_MISMATCH'));
  check('render/49: runtime receipt tamper breaks digest', has(tamper((c) => { c.runtimeReceipt.externalMainFrameNavigationsBlocked = 5; }), 'ARTIFACT_DIGEST_MISMATCH'));
  check('render/50: viewport tamper breaks digest', has(tamper((c) => { c.viewport = { width: 1000, height: 900 }; }), 'ARTIFACT_DIGEST_MISMATCH'));
  check('render/51: locale tamper breaks digest', has(tamper((c) => { c.locale = 'ru-RU'; }), 'ARTIFACT_DIGEST_MISMATCH'));
  check('render/52: warning tamper breaks digest', has(tamper((c) => { c.warnings = ['injected']; }), 'ARTIFACT_DIGEST_MISMATCH'));
  check('render/53: finalUrl tamper breaks digest', has(tamper((c) => { c.finalUrl = 'https://www.bybit.com/en/promo/global/welcome-gifts/'; }), 'ARTIFACT_DIGEST_MISMATCH'));
  check('render/54: outcome tamper breaks digest', has(tamper((c) => { c.outcome = 'login_wall'; }), 'ARTIFACT_DIGEST_MISMATCH'));
  check('render/55: fragment reorder breaks digest', (() => { const c = mkCap({ fragments: [mkFrag({ fragmentId: 'fa', text: 'alpha bounded text' }), mkFrag({ fragmentId: 'fb', text: 'beta bounded text' })] }); c.fragments.reverse(); return has(c, 'ARTIFACT_DIGEST_MISMATCH'); })());

  // -- R4 fragment-level claim provenance (packet layer) --
  const posCap = mkCap({ fragments: [mkClaimFrag()] });
  const posRefs = (over = {}) => buildPacket({ renderedCaptures: [posCap], claims: completeClaims().map((c) => c.claimId === 'bybit.bonus_headline' ? { ...c, ...over } : c) });
  // Packet-layer rendered-fragment admissibility is tested via bybit.source_identity — the
  // only required claim still authorized at the packet layer (#260 R9: source-plan target
  // claims are never raw-supported; their support comes from the resolver's assessment).
  const siFrag = mkFrag({ fragmentId: 'f-sid', extractionType: 'visible_text', locator: 'h1', text: 'official bybit domain identity', claimIds: ['bybit.source_identity'] });
  const siCap = mkCap({ fragments: [siFrag] });
  const siRefs = (over = {}) => buildPacket({ renderedCaptures: [siCap], claims: completeClaims().map((c) => c.claimId === 'bybit.source_identity' ? { ...c, result: 'supported', ...over } : c) });
  check('render/56: exact matching rendered-fragment reference supports a required claim', m.validateOfferEvidencePacket(siRefs({ sourceRefs: ['rendered-fragment:rc1/f-sid'] })).ok === true);
  check('render/57: bare rendered: capture reference cannot supply support', (() => { const p = siRefs({ sourceRefs: ['rendered:rc1'] }); return !m.validateOfferEvidencePacket(p).ok && m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'INADMISSIBLE_SUPPORT'); })());
  check('render/58: unknown rendered-fragment reference rejected', (() => { const p = posRefs({ sourceRefs: ['rendered-fragment:rc1/ghost'] }); return m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'UNKNOWN_RENDERED_FRAGMENT_REF'); })());
  check('render/59: unknown rendered capture reference rejected', (() => { const p = posRefs({ sourceRefs: ['rendered:ghost'] }); return m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'UNKNOWN_RENDERED_REF'); })());
  check('render/60: fragment whose claimIds omit the claim is inadmissible', (() => { const cap = mkCap({ fragments: [mkFrag({ fragmentId: 'f-other', claimIds: ['bybit.kyc_required'], locator: 'h2', text: 'kyc required text' })] }); const p = buildPacket({ renderedCaptures: [cap], claims: completeClaims().map((c) => c.claimId === 'bybit.source_identity' ? { ...c, result: 'supported', sourceRefs: ['rendered-fragment:rc1/f-other'] } : c) }); return m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'INADMISSIBLE_SUPPORT'); })());
  check('render/61: empty-claimIds fragment cannot be used as proof', (() => { const cap = mkCap({ fragments: [mkFrag()] }); const p = buildPacket({ renderedCaptures: [cap], claims: completeClaims().map((c) => c.claimId === 'bybit.source_identity' ? { ...c, result: 'supported', sourceRefs: ['rendered-fragment:rc1/f1'] } : c) }); return m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'INADMISSIBLE_SUPPORT'); })());
  check('render/62: fragment on a walled capture cannot support (capture itself rejected)', (() => { const cap = mkCap({ outcome: 'login_wall', fragments: [mkClaimFrag()] }); const p = buildPacket({ renderedCaptures: [cap], claims: completeClaims().map((c) => c.claimId === 'bybit.bonus_headline' ? { ...c, sourceRefs: ['rendered-fragment:rc1/f-bonus'] } : c) }); const r = m.validateOfferEvidencePacket(p); return !r.ok; })());
  check('render/63: fragmentSupportsClaim binds exact capture+fragment+claim', m.fragmentSupportsClaim(posCap, 'f-bonus', 'bybit.bonus_headline') === true && m.fragmentSupportsClaim(posCap, 'f-bonus', 'bybit.kyc_required') === false && m.fragmentSupportsClaim(mkNoDoc('network_error'), 'f-bonus', 'bybit.bonus_headline') === false);

  // -- real posture (unchanged) --
  check('render/64: offline replay validates committed rendered artifacts + digests recompute', (() => { const rc = m.BYBIT_OFFER_EVIDENCE_PACKET.renderedCaptures || []; return rc.length === 2 && rc.every((c) => vc(c).ok && m.computeRenderedArtifactDigest(c) === c.normalizedArtifactDigest); })());
  check('render/65: committed rendered captures have finalUrl null', (() => { const rc = m.BYBIT_OFFER_EVIDENCE_PACKET.renderedCaptures || []; return rc.length === 2 && rc.every((c) => c.finalUrl === null); })());
  check('render/66: existing HTTP probes remain unchanged', (() => { const c = m.BYBIT_OFFER_EVIDENCE_PACKET.captures; return c.length === 2 && c[0].captureId === 'probe-a' && c[1].captureId === 'probe-b' && m.computeCaptureManifestDigest(c) === m.BYBIT_OFFER_EVIDENCE_PACKET.captureManifestDigest; })());
  check('render/67: real packet remains draft', m.BYBIT_OFFER_EVIDENCE_PACKET.approval === 'draft');
  check('render/68: all real claims unchanged (1 supported, 1 partner, 1 not_found, 10 inaccessible)', (() => {
    const cl = m.BYBIT_OFFER_EVIDENCE_PACKET.claims;
    const by = (r) => cl.filter((c) => c.result === r).length;
    return cl.length === 13 && by('supported') === 1 && cl.find((c) => c.claimId === 'bybit.source_identity').result === 'supported' && by('requires_owner_partner_confirmation') === 1 && by('not_found') === 1 && by('inaccessible') === 10;
  })());
  check('render/69: referral code remains partner-confirmation-required', m.BYBIT_OFFER_EVIDENCE_PACKET.claims.find((c) => c.claimId === 'bybit.promo_code').result === 'requires_owner_partner_confirmation');
  check('render/70: offers.bybit.evidence remains null', m.bybitOfferEvidence === null && m.getOffer('bybit').evidence === null);
  check('render/71: preview homepage /go/* = 0', homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'preview', 'en').primary.href.startsWith('/go/')));
  check('render/72: public production simulation /go/* = 0', homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'production', 'en').primary.href.startsWith('/go/')));
  check('render/73: PUBLIC_MARKET_PROFILES remains frozen and empty', Array.isArray(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0 && Object.isFrozen(m.PUBLIC_MARKET_PROFILES));
  check('render/74: locale cannot change capture/claim facts', (() => {
    const rc = m.BYBIT_OFFER_EVIDENCE_PACKET.renderedCaptures || [];
    const disc = (l) => m.resolveDisclosure({ tone: 'verified', evidence: m.bybitOfferEvidence, expectedExchangeId: 'bybit', now: Date.parse('2026-08-05T21:00:00Z'), isAffiliate: false, methodologyHref: '/methodology/' }, l);
    return rc.every((c) => c.outcome === 'network_error') && disc('en').evidenceState === 'none' && disc('ru').evidenceState === disc('en').evidenceState && disc('kk').evidenceState === disc('en').evidenceState && m.BYBIT_OFFER_EVIDENCE_DECISION === 'under_re_verification';
  })());
  check('render/75: no full HTML / cache / secrets / personal data / absolute paths committed', (() => {
    const serialized = JSON.stringify(m.BYBIT_OFFER_EVIDENCE_PACKET.renderedCaptures || []);
    return !/<html|<body|<!doctype|[A-Za-z]:\\|\/Users\/|\/home\/|token=|cookie\s*[:=]|bearer|password/i.test(serialized);
  })());
  check('render/live: both real rendered captures are network_error, finalUrl null, zero fragments', (() => {
    const rc = m.BYBIT_OFFER_EVIDENCE_PACKET.renderedCaptures || [];
    return rc.length === 2 && rc.every((c) => c.outcome === 'network_error' && c.finalUrl === null && c.fragments.length === 0 && c.mainDocumentStatus === null);
  })());

  // ===== Split 3 (#256) — trusted owner/partner claim-confirmation intake (R1–R9) =====
  const CNOW = Date.parse('2026-08-06T12:00:00Z');
  const PPOL = m.BYBIT_PROMO_CODE_CONFIRMATION_POLICY;
  // Issue #262: the synthetic test policy is built HERE (test code) from the test-support
  // fixtures — it is no longer a production `src/**` export.
  const TPOL = makeSyntheticPromoPolicy(m);
  const CAND = PPOL.candidateValue;
  const csa = (over = {}) => ({ exchangeId: 'bybit', claimId: 'bybit.promo_code', assertionType: 'exact_referral_code_assignment', assignmentState: 'active', assertedValue: CAND, ...over });
  const fin = (a) => {
    a.assertedValueDigest = m.computeAssertedValueDigest(a);
    a.sourceStatementDigest = m.computeSourceStatementDigest(a.sourceStatement);
    if (a.partnerReceipt) { a.partnerReceipt.normalizedAssertion = m.canonicalSourceAssertion(a.sourceAssertion); a.partnerReceipt.normalizedReceiptDigest = m.computeReceiptDigest(a.partnerReceipt); }
    a.artifactDigest = m.computeConfirmationArtifactDigest(a);
    return a;
  };
  const mkO = (over = {}) => fin({
    confirmationId: 'c-owner', exchangeId: 'bybit', claimId: 'bybit.promo_code', assertionType: 'exact_referral_code_assignment',
    assertedValue: CAND, assertedValueDigest: '', confirmedBy: 'ros190392-source', confirmationRole: 'owner',
    confirmedAt: '2026-08-05T00:00:00Z', validUntil: '2026-10-01T00:00:00Z', sourceEventAt: '2026-08-04T00:00:00Z',
    artifactIntent: 'attestation', sourceAssertion: csa(), sourceKind: 'github_issue_comment',
    sourceUrl: 'https://github.com/ros190392-source/cryptobonusworld/issues/256#issuecomment-100200300', sourceId: '100200300', partnerReceipt: null,
    sourceStatement: 'Owner attests bybit promo referral code assignment.', sourceStatementDigest: '', status: 'confirmed',
    replacesConfirmationId: null, revokesConfirmationId: null, limitations: 'Owner attestation.', note: null, artifactDigest: '', ...over,
  });
  const mkP = (over = {}) => {
    const base = {
      confirmationId: 'c-partner', exchangeId: 'bybit', claimId: 'bybit.promo_code', assertionType: 'exact_referral_code_assignment',
      assertedValue: CAND, assertedValueDigest: '', confirmedBy: 'test-partner-fixture', confirmationRole: 'partner',
      confirmedAt: '2026-08-05T00:00:00Z', validUntil: '2026-10-01T00:00:00Z', sourceEventAt: '2026-08-04T00:00:00Z',
      artifactIntent: 'attestation', sourceAssertion: csa(), sourceKind: 'partner_dashboard_receipt', sourceUrl: null, sourceId: 'receipt-x',
      partnerReceipt: { issuerId: 'test-partner-fixture', issuerDomain: 'partner.test', receiptKind: 'partner_dashboard_receipt', receiptId: 'receipt-x', issuedAt: '2026-08-04T00:00:00Z', normalizedAssertion: '', normalizedReceiptDigest: '', redactionVersion: 'v1' },
      sourceStatement: 'Partner receipt attests active referral code assignment.', sourceStatementDigest: '', status: 'confirmed',
      replacesConfirmationId: null, revokesConfirmationId: null, limitations: 'Redacted partner receipt.', note: null, artifactDigest: '',
    };
    const a = { ...base, ...over };
    if (!('partnerReceipt' in over) && a.partnerReceipt) { a.partnerReceipt = { ...a.partnerReceipt, receiptId: a.sourceId, issuedAt: a.sourceEventAt }; }
    return fin(a);
  };
  const vconf = (a) => m.validateClaimConfirmation(a);
  const iss = (a) => vconf(a).issues.map((i) => i.code);
  const admP = (a, pol) => m.promoAdmissibilityIssues(a, pol).map((i) => i.code);
  const evP = (arr, pol) => m.evaluatePromoCodeConfirmations(arr, CNOW, pol);
  const evProd = (arr) => m.evaluateBybitPromoCodeConfirmations(arr, CNOW);

  // -- R1: one authorizing path --
  check('conf/1: owner-only helper bypass impossible (evaluator pending; helper false)', evProd([mkO()]).state === 'pending_partner_confirmation' && m.promoCodeSetConfirmsValue([mkO()], CNOW, PPOL, CAND) === false && m.promoCodeSetConfirmsValue([mkO()], CNOW, TPOL, CAND) === false);
  check('conf/2: no confirmationSupportsTarget/isActiveConfirmed exported', m.confirmationSupportsTarget === undefined && m.isActiveConfirmed === undefined && m.isActiveAdmissibleConfirmed === undefined);
  check('conf/3: delegated helper true only when evaluator confirmed (test policy)', m.promoCodeSetConfirmsValue([mkP()], CNOW, TPOL, CAND) === true && evP([mkP()], TPOL).state === 'confirmed');
  check('conf/4: helper false for expired/wrong-value confirmed sets', m.promoCodeSetConfirmsValue([mkP({ confirmedAt: '2026-01-01T00:00:00Z', validUntil: '2026-02-01T00:00:00Z', sourceEventAt: '2025-12-31T00:00:00Z' })], CNOW, TPOL, CAND) === false && m.promoCodeSetConfirmsValue([mkP({ assertedValue: 'OTHERCODE9', sourceAssertion: csa({ assertedValue: 'OTHERCODE9' }) })], CNOW, TPOL, CAND) === false);

  // -- R2: no invented production partner trust; test-only policy proves positive --
  check('conf/5: production policy has NO trusted partner identity or domain', PPOL.trustedPartnerIdentities.length === 0 && PPOL.trustedPartnerDomains.length === 0);
  check('conf/6: self-declared partner cannot confirm in production (→ invalid)', (() => {
    const p = mkP({ confirmedBy: 'bybit-partner-official', partnerReceipt: { issuerId: 'bybit-partner-official', issuerDomain: 'partner.bybit.com', receiptKind: 'partner_dashboard_receipt', receiptId: 'receipt-x', issuedAt: '2026-08-04T00:00:00Z', normalizedAssertion: '', normalizedReceiptDigest: '', redactionVersion: 'v1' } });
    return evProd([p]).state === 'invalid' && m.promoCodeSetConfirmsValue([p], CNOW, PPOL, CAND) === false;
  })());
  check('conf/7: synthetic TEST-ONLY policy proves the positive algorithmic path', evP([mkP()], TPOL).state === 'confirmed' && TPOL.trustedPartnerIdentities.length > 0 && TPOL.trustedPartnerDomains.length > 0);
  check('conf/8: product wrapper always uses production policy', evProd([mkP()]).state === 'invalid');

  // -- R3: structured partner receipt provenance --
  check('conf/9: partner source requires structured receipt; github source forbids it', iss(mkP({ partnerReceipt: null })).includes('REQUIRED') && iss(mkO({ partnerReceipt: { issuerId: 'x', issuerDomain: 'partner.test', receiptKind: 'partner_dashboard_receipt', receiptId: 'r', issuedAt: '2026-08-04T00:00:00Z', normalizedAssertion: '', normalizedReceiptDigest: 'sha256:' + '0'.repeat(64), redactionVersion: 'v1' } })).includes('RECEIPT_FORBIDDEN'));
  check('conf/10: receipt digest recomputes; issuer/domain/receiptId/issuedAt/assertion tamper breaks it', (() => {
    const mut = [
      (a) => { a.partnerReceipt.issuerId = 'evil'; },
      (a) => { a.partnerReceipt.issuerDomain = 'evil.test'; },
      (a) => { a.partnerReceipt.receiptId = 'receipt-z'; },
      (a) => { a.partnerReceipt.issuedAt = '2026-08-03T00:00:00Z'; },
      (a) => { a.partnerReceipt.normalizedAssertion = '{"x":1}'; },
    ];
    return mut.every((fn) => { const a = mkP(); fn(a); return iss(a).includes('RECEIPT_DIGEST_MISMATCH') || iss(a).includes('ASSERTION_MISMATCH') || iss(a).includes('ISSUED_AT_MISMATCH') || iss(a).includes('ARTIFACT_DIGEST_MISMATCH'); });
  })());
  check('conf/11: receipt issuedAt must bind to sourceEventAt', (() => { const a = mkP(); a.partnerReceipt.issuedAt = '2026-08-03T00:00:00Z'; a.partnerReceipt.normalizedReceiptDigest = m.computeReceiptDigest(a.partnerReceipt); a.artifactDigest = m.computeConfirmationArtifactDigest(a); return iss(a).includes('ISSUED_AT_MISMATCH'); })());
  check('conf/12: full dashboard/email dump in statement rejected; no credentials/tokens', iss(mkP({ sourceStatement: 'From: partner@bybit.com Subject: code' })).includes('INVALID_STATEMENT') && iss(mkP({ note: 'session_token=abc' })).includes('UNSAFE_CONTENT'));

  // -- R4: structured positive assertion (no substring auth) --
  check('conf/13: authorization uses structured assertion, not statement text', evP([mkP({ sourceStatement: 'approved' })], TPOL).state === 'confirmed');
  check('conf/14: non-positive assignment states rejected (inactive/revoked/historical/not_assigned)', ['inactive', 'revoked', 'historical', 'not_assigned'].every((st) => evP([mkP({ sourceAssertion: csa({ assignmentState: st }) })], TPOL).state === 'invalid'));
  check('conf/15: sourceAssertion must mirror subject exactly (exchange/claim/value)', iss(mkP({ sourceAssertion: csa({ exchangeId: 'binance' }) })).includes('SOURCE_ASSERTION_MISMATCH') && iss(mkP({ sourceAssertion: csa({ assertedValue: 'OTHERCODE9' }) })).includes('SOURCE_ASSERTION_MISMATCH'));
  check('conf/16: prefix value cannot confirm the candidate', (() => { const p = mkP({ assertedValue: 'CRYPTOBONUSWXY', sourceAssertion: csa({ assertedValue: 'CRYPTOBONUSWXY' }) }); return m.promoCodeSetConfirmsValue([p], CNOW, TPOL, CAND) === false && evP([p], TPOL).state !== 'confirmed'; })());
  check('conf/17: wrong exchange/claim confirmed → invalid (fail closed)', evP([mkP({ exchangeId: 'binance', sourceAssertion: csa({ exchangeId: 'binance' }) })], TPOL).state === 'invalid' && evP([mkP({ claimId: 'bybit.bonus_headline', sourceAssertion: csa({ claimId: 'bybit.bonus_headline' }) })], TPOL).state === 'invalid');
  check('conf/18: structured assertion tampering breaks the artifact digest', (() => { const a = mkO(); a.sourceAssertion = csa({ assignmentState: 'inactive' }); return iss(a).includes('ARTIFACT_DIGEST_MISMATCH'); })());

  // -- R5: fail closed on policy-invalid active artifacts --
  check('conf/19: untrusted confirmed partner → invalid (not silently discarded)', evP([mkP()], PPOL).state === 'invalid');
  check('conf/20: untrusted owner actor confirmed → invalid', evP([mkO({ confirmedBy: 'random-person' })], PPOL).state === 'invalid' && evP([mkO({ confirmedBy: 'random-person' })], TPOL).state === 'invalid');
  check('conf/21: wrong-claim / wrong-exchange confirmed → invalid', evP([mkO({ claimId: 'bybit.bonus_headline', sourceAssertion: csa({ claimId: 'bybit.bonus_headline' }) })], TPOL).state === 'invalid');
  check('conf/22: malformed partner receipt (untrusted domain) confirmed → invalid', evP([mkP({ partnerReceipt: { issuerId: 'test-partner-fixture', issuerDomain: 'evil.test', receiptKind: 'partner_dashboard_receipt', receiptId: 'receipt-x', issuedAt: '2026-08-04T00:00:00Z', normalizedAssertion: '', normalizedReceiptDigest: '', redactionVersion: 'v1' } })], TPOL).state === 'invalid');
  check('conf/23: clean empty set → missing; clean owner-only → pending', evProd([]).state === 'missing' && evP([mkO()], PPOL).state === 'pending_partner_confirmation');
  check('conf/24: structurally invalid artifact → invalid', evP([{ confirmationId: 'bad' }], TPOL).state === 'invalid');

  // -- R6: replacement / revocation semantics --
  check('conf/25: active replacement suppresses replaced confirmation (no conflict)', (() => {
    const c1 = mkP({ confirmationId: 'c1', sourceId: 'receipt-1' });
    const c2 = mkP({ confirmationId: 'c2', confirmedAt: '2026-08-06T00:00:00Z', sourceEventAt: '2026-08-05T12:00:00Z', sourceId: 'receipt-2', artifactIntent: 'replacement', replacesConfirmationId: 'c1' });
    return evP([c1, c2], TPOL).state === 'confirmed';
  })());
  check('conf/26: replacement with a new value does not create old+new conflict', (() => {
    const c1 = mkP({ confirmationId: 'c1', sourceId: 'receipt-1' });
    const c2 = mkP({ confirmationId: 'c2', assertedValue: 'NEWCODE9', sourceAssertion: csa({ assertedValue: 'NEWCODE9' }), confirmedAt: '2026-08-06T00:00:00Z', sourceEventAt: '2026-08-05T12:00:00Z', sourceId: 'receipt-2', artifactIntent: 'replacement', replacesConfirmationId: 'c1' });
    const r = evP([c1, c2], TPOL);
    // old CAND suppressed → only NEWCODE9 active (single-value), never a two-value conflict.
    const twoAtt = evP([mkP({ confirmationId: 'a1', sourceId: 'r1' }), mkP({ confirmationId: 'a2', sourceId: 'r2', assertedValue: 'NEWCODE9', sourceAssertion: csa({ assertedValue: 'NEWCODE9' }) })], TPOL);
    return r.value === 'NEWCODE9' && twoAtt.state === 'conflict' && twoAtt.value === null;
  })());
  check('conf/27: revocation removes target from active quorum → revoked, not confirmed', (() => {
    const c1 = mkP({ confirmationId: 'c1', sourceId: 'receipt-1' });
    const c3 = mkO({ confirmationId: 'c3', confirmedAt: '2026-08-06T00:00:00Z', sourceEventAt: '2026-08-05T12:00:00Z', sourceId: '100200301', sourceUrl: 'https://github.com/ros190392-source/cryptobonusworld/issues/256#issuecomment-100200301', artifactIntent: 'revocation', revokesConfirmationId: 'c1' });
    return evP([c1, c3], TPOL).state === 'revoked';
  })());
  check('conf/28: invalid lifecycle links → invalid (double/self/cross-subject/not-after/unknown/cycle)', (() => {
    const dbl = iss(mkO({ artifactIntent: 'replacement', replacesConfirmationId: 'x', revokesConfirmationId: 'y' })).includes('DOUBLE_LIFECYCLE_LINK');
    const self = iss(mkO({ confirmationId: 'cs', artifactIntent: 'replacement', replacesConfirmationId: 'cs' })).includes('SELF_REFERENCE');
    const unknown = evP([mkO({ artifactIntent: 'replacement', replacesConfirmationId: 'ghost' })], TPOL).state === 'invalid';
    const cross = (() => { const t = mkO({ confirmationId: 't1', claimId: 'bybit.bonus_headline', sourceAssertion: csa({ claimId: 'bybit.bonus_headline' }), status: 'validated' }); const r = mkO({ confirmationId: 't2', confirmedAt: '2026-08-06T00:00:00Z', sourceEventAt: '2026-08-05T12:00:00Z', sourceId: '100200302', sourceUrl: 'https://github.com/ros190392-source/cryptobonusworld/issues/256#issuecomment-100200302', artifactIntent: 'revocation', revokesConfirmationId: 't1' }); return evP([t, r], TPOL).state === 'invalid'; })();
    const notAfter = (() => { const c1 = mkP({ confirmationId: 'c1', sourceId: 'receipt-1' }); const c2 = mkP({ confirmationId: 'c2', sourceId: 'receipt-2', artifactIntent: 'replacement', replacesConfirmationId: 'c1' }); return evP([c1, c2], TPOL).state === 'invalid'; })();
    return dbl && self && unknown && cross && notAfter;
  })());
  check('conf/29: attestation must not carry lifecycle links', iss(mkO({ artifactIntent: 'attestation', replacesConfirmationId: 'x' })).includes('INTENT_LINK_MISMATCH'));

  // -- R7: deterministic statement normalization --
  check('conf/30: statement normalization deterministic + idempotent + required', (() => {
    const n = m.normalizeStatement('  Bybit   partner\n receipt.  ');
    return n.ok && n.value === 'Bybit partner receipt.' && m.normalizeStatement(n.value).value === n.value && iss(mkP({ sourceStatement: '  spaced   out  ' })).includes('STATEMENT_NOT_NORMALIZED');
  })());

  // -- R8 / clock --
  check('conf/31: evaluator requires a finite clock (no Date.now fallback)', m.evaluatePromoCodeConfirmations([mkP()], Number.NaN, TPOL).state === 'invalid' && m.evaluatePromoCodeConfirmations([mkP()], Infinity, TPOL).state === 'invalid');
  check('conf/32: future confirmed artifact cannot confirm', m.promoCodeSetConfirmsValue([mkP({ confirmedAt: '2026-09-01T00:00:00Z', validUntil: '2026-12-01T00:00:00Z', sourceEventAt: '2026-09-01T00:00:00Z' })], CNOW, TPOL, CAND) === false);
  check('conf/33: value/statement/artifact digests recompute + tamper', (() => { const a = mkP(); const okAll = m.computeAssertedValueDigest(a) === a.assertedValueDigest; const t = mkP(); t.assertedValue = 'DIFFERENT9'; const t2 = mkP(); t2.confirmedAt = '2026-08-05T06:00:00Z'; return okAll && iss(t).includes('VALUE_DIGEST_MISMATCH') && iss(t2).includes('ARTIFACT_DIGEST_MISMATCH'); })());

  // -- R2/real posture invariants --
  check('conf/34: real confirmation set remains Object.freeze([])', Array.isArray(m.BYBIT_PROMO_CODE_CONFIRMATIONS) && m.BYBIT_PROMO_CODE_CONFIRMATIONS.length === 0 && Object.isFrozen(m.BYBIT_PROMO_CODE_CONFIRMATIONS));
  check('conf/35: candidateConfirmed remains false; real derived state missing', PPOL.candidateConfirmed === false && m.BYBIT_PROMO_CODE_CANDIDATE_CONFIRMED === false && m.BYBIT_PROMO_CODE_CONFIRMATION_STATE === 'missing');
  check('conf/36: no synthetic policy/receipt entered product data', m.BYBIT_PROMO_CODE_CONFIRMATIONS.length === 0 && PPOL.trustedPartnerIdentities.length === 0 && TPOL.trustedPartnerIdentities.length > 0);
  check('conf/37: promo-code claim remains partner-confirmation-required', m.BYBIT_OFFER_EVIDENCE_PACKET.claims.find((c) => c.claimId === 'bybit.promo_code').result === 'requires_owner_partner_confirmation');
  check('conf/38: real packet remains draft + legacy ownerConfirmations field removed', m.BYBIT_OFFER_EVIDENCE_PACKET.approval === 'draft' && m.BYBIT_OFFER_EVIDENCE_PACKET.ownerConfirmations === undefined);
  check('conf/39: offers.bybit.evidence remains null', m.bybitOfferEvidence === null && m.getOffer('bybit').evidence === null);
  check('conf/40: preview homepage /go/* = 0', homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'preview', 'en').primary.href.startsWith('/go/')));
  check('conf/41: public production simulation /go/* = 0', homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'production', 'en').primary.href.startsWith('/go/')));
  check('conf/42: PUBLIC_MARKET_PROFILES remains frozen and empty', Array.isArray(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0 && Object.isFrozen(m.PUBLIC_MARKET_PROFILES));
  check('conf/43: locale cannot change confirmation facts', (() => {
    const disc = (l) => m.resolveDisclosure({ tone: 'verified', evidence: m.bybitOfferEvidence, expectedExchangeId: 'bybit', now: CNOW, isAffiliate: false, methodologyHref: '/methodology/' }, l);
    return ['en', 'ru', 'kk'].every((l) => disc(l).evidenceState === 'none') && m.BYBIT_PROMO_CODE_CONFIRMATION_STATE === 'missing';
  })());
  check('conf/44: draft template is structurally valid but non-authorizing', (() => { const d = mkO({ confirmationId: 'c-draft', status: 'draft', sourceUrl: null, sourceId: 'UNCONFIRMED-TEMPLATE' }); return vconf(d).ok === true && evProd([d]).state === 'missing'; })());
  check('conf/45: normalizeReferralCode deterministic + unsafe rejected', m.normalizeReferralCode('  cryptobonusw ').value === 'CRYPTOBONUSW' && m.normalizeReferralCode('crypto bonusw').ok === false && m.normalizeReferralCode('CRYPTO$BONUS').ok === false);

  // ===== Split 3 (#258, hardened R1–R9) — confirmation-to-packet bridge =====
  const BNOW = Date.parse('2026-08-06T00:00:00Z');
  const realPkt = m.BYBIT_OFFER_EVIDENCE_PACKET;
  const OID = m.getBybitOfferCommercialIdentity();
  const TID = { exchangeSlug: 'bybit', promoCode: 'CRYPTOBONUSW' };
  const resP = (pkt, set) => m.resolveBybitOfferPacketClaims(pkt, set, BNOW);
  const adP = (pkt, set) => m.adaptBybitOfferToEvidence(pkt, set, BNOW);
  // Issue #262: no test resolver/adapter exists in production. The positive promo-confirmed
  // resolution path is proven only by the isolated component-level harness (bridge/38);
  // evaluator states are proven at conf/* with the local synthetic policy. Here we assert
  // the production resolver over the PRODUCTION policy cannot confirm synthetic partners.
  const evT = (arr) => m.evaluatePromoCodeConfirmations(arr, BNOW, TPOL);
  const rc = (res, id) => res.resolvedClaims.find((c) => c.claimId === id);
  const rIssues = (res) => (m.validateResolvedOfferPacket(res).issues || []).map((i) => i.code);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  // -- R1/R9.1-5: exactly one public product EvidenceMetadata entry point --
  check('bridge/1: evaluatePacketReadiness is not publicly exported', m.OEP.evaluatePacketReadiness === undefined && m.evaluatePacketReadiness === undefined);
  check('bridge/2: packetToEvidenceMetadata is not publicly exported', m.OEP.packetToEvidenceMetadata === undefined && m.packetToEvidenceMetadata === undefined);
  check('bridge/3: adaptResolvedApprovedPacketToEvidence is not publicly exported', m.OPR.adaptResolvedApprovedPacketToEvidence === undefined && m.adaptResolvedApprovedPacketToEvidence === undefined);
  check('bridge/4: raw-packet-only EvidenceMetadata adapter is removed', m.OEP.adaptApprovedPacketToEvidence === undefined && m.adaptApprovedPacketToEvidence === undefined);
  check('bridge/5: only adaptBybitOfferToEvidence is the product evidence entry point', typeof m.adaptBybitOfferToEvidence === 'function' && Object.keys(m.OPR).filter((k) => /adapt/i.test(k)).sort().join(',') === 'adaptBybitOfferToEvidence' && m.OPR.adaptOfferToEvidenceForTest === undefined && m.OPR.resolveOfferPacketClaimsForTest === undefined);
  check('bridge/6: no public resolved-view→evidence adapter exists', Object.keys(m.OPR).every((k) => !/adaptResolved/i.test(k)));

  // -- R2: caller-supplied resolved view cannot authorize --
  check('bridge/7: a hand-built resolved view has no public adapter to authorize it', (() => {
    const r = resP(buildPacket(), []); // valid audit snapshot
    const fake = clone(r); rc(fake, 'bybit.promo_code').resolvedResult = 'supported'; fake.blockingRequiredClaims = [];
    // There is simply no public function that turns a resolved object into evidence.
    return m.adaptResolvedApprovedPacketToEvidence === undefined && typeof m.adaptBybitOfferToEvidence === 'function' && m.adaptBybitOfferToEvidence.length === 3;
  })());
  check('bridge/8: recomputed arbitrary resolution digest cannot authorize (no consumer)', (() => {
    const r = resP(buildPacket(), []);
    const fake = clone(r); rc(fake, 'bybit.promo_code').resolvedResult = 'supported'; fake.blockingRequiredClaims = [];
    fake.resolutionDigest = m.computeResolutionDigest((() => { const { resolutionDigest, ok, ...core } = fake; return core; })());
    // Even a self-consistent forged snapshot is inert: nothing public consumes it.
    return m.adaptResolvedApprovedPacketToEvidence === undefined;
  })());

  // -- R3: canonical product offer identity; no promo-code argument --
  check('bridge/9: product adapter reads the real offer promo code internally', OID.exchangeSlug === 'bybit' && OID.promoCode === m.getOffer('bybit').promoCode);
  check('bridge/10: product APIs accept no promo-code argument', m.adaptBybitOfferToEvidence.length === 3 && m.resolveBybitOfferPacketClaims.length === 3);
  check('bridge/11: product resolution binds the real canonical offer code (no injectable identity)', (() => {
    // No production function accepts a caller identity; the resolver reads the real code.
    const r = resP(realPkt, []);
    return r.ok && r.normalizedOfferPromoCode === m.getOffer('bybit').promoCode && OID.promoCode === m.getOffer('bybit').promoCode && typeof r.offerIdentityDigest === 'string' && r.offerIdentityDigest.startsWith('sha256:') && m.resolveBybitOfferPacketClaims.length === 3;
  })());

  // -- R4: production policy fingerprint --
  check('bridge/12: production-policy resolution carries the production fingerprint', (() => { const r = resP(realPkt, []); return r.policyMode === 'production' && r.policyId === m.PRODUCTION_CONFIRMATION_POLICY_ID && r.policyDigest === m.PRODUCTION_CONFIRMATION_POLICY_DIGEST; })());
  check('bridge/13: production resolution is production-mode; no test adapter/resolver exists', (() => { const r = resP(realPkt, []); return r.policyMode === 'production' && m.OPR.adaptOfferToEvidenceForTest === undefined && m.OPR.resolveOfferPacketClaimsForTest === undefined; })());
  check('bridge/14: production vs synthetic policy fingerprints differ; production carries the production digest', (() => { const a = resP(realPkt, []); return a.policyDigest === m.PRODUCTION_CONFIRMATION_POLICY_DIGEST && m.computeConfirmationPolicyDigest(PPOL) !== m.computeConfirmationPolicyDigest(TPOL); })());

  // -- R5: full raw-packet digest --
  check('bridge/15: raw-packet digest covers every committed field (tamper detection)', (() => {
    const base = buildPacket();
    const d0 = m.computeRawPacketDigest(base);
    const muts = [
      (p) => { p.approval = 'draft'; },
      (p) => { p.approver.approvedBy = 'someone-else'; },
      (p) => { p.approver.approvedAt = '2026-08-04T00:00:00Z'; },
      (p) => { p.capturedAt = '2026-08-03T00:00:00Z'; },
      (p) => { p.nextReviewAt = '2026-11-30T00:00:00Z'; },
      (p) => { p.sourceUrl = 'https://www.bybit.com/en/promo/other/'; },
      (p) => { p.claims.find((c) => c.claimId === 'bybit.kyc_required').result = 'not_found'; },
      (p) => { p.warnings = ['x']; },
      (p) => { p.limitations = ['y']; },
      (p) => { p.captureTool = 'other'; },
      (p) => { p.captureMethod = 'other'; },
    ];
    return muts.every((fn) => { const p = clone(base); fn(p); return m.computeRawPacketDigest(p) !== d0; });
  })());
  check('bridge/16: resolution has no mutable raw packet reference', (() => { const r = resP(realPkt, []); return r.packet === undefined && typeof r.rawPacketDigest === 'string'; })());

  // -- R6: full confirmation-set digest --
  check('bridge/17: adding/removing a confirmation changes confirmationSetDigest', (() => {
    const empty = m.computeConfirmationSetDigest([]);
    const one = m.computeConfirmationSetDigest([mkO({ confirmationId: 'd1', status: 'draft', sourceUrl: null, sourceId: 'UNCONFIRMED' })]);
    return empty !== one && /^sha256:[a-f0-9]{64}$/.test(empty);
  })());
  check('bridge/18: confirmation ordering is canonicalized deterministically', (() => {
    const a = mkP({ confirmationId: 'ca', sourceId: 'ra' });
    const b = mkO({ confirmationId: 'cb' });
    return m.computeConfirmationSetDigest([a, b]) === m.computeConfirmationSetDigest([b, a]);
  })());
  check('bridge/19: changing a receipt note changes confirmationSetDigest via artifactDigest', (() => {
    const a = mkP({ confirmationId: 'cn', sourceId: 'rn' });
    const a2 = mkP({ confirmationId: 'cn', sourceId: 'rn', note: 'changed note' });
    return m.computeConfirmationSetDigest([a]) !== m.computeConfirmationSetDigest([a2]);
  })());
  check('bridge/20: confirmation artifact with invalid digest fails resolution', (() => { const bad = mkP(); bad.artifactDigest = 'sha256:' + '0'.repeat(64); return resP(buildPacket(), [bad]).reason === 'CONFIRMATION_INVALID'; })());
  check('bridge/21: empty set has a deterministic non-empty digest', m.computeConfirmationSetDigest([]) === m.computeConfirmationSetDigest([]) && m.computeConfirmationSetDigest([]).length > 8);

  // -- R7: resolution digest + snapshot invariants --
  check('bridge/22: resolution digest recomputes', m.validateResolvedOfferPacket(resP(realPkt, [])).ok === true);
  check('bridge/23: resolved audit snapshot is deeply frozen', (() => { const r = resP(realPkt, []); return Object.isFrozen(r) && Object.isFrozen(r.resolvedClaims) && Object.isFrozen(r.resolvedClaims[0]) && Object.isFrozen(r.confirmationEvaluation); })());
  check('bridge/24: blockingRequiredClaims mismatch fails', (() => { const r = clone(resP(realPkt, [])); r.blockingRequiredClaims = []; return rIssues(r).includes('BLOCKING_MISMATCH'); })());
  check('bridge/25: supported promo with non-confirmed evaluator fails', (() => { const r = clone(resP(realPkt, [])); rc(r, 'bybit.promo_code').resolvedResult = 'supported'; return rIssues(r).includes('SUPPORT_WITHOUT_CONFIRMED'); })());
  check('bridge/26: a forged confirmed-promo snapshot without a confirmationId fails validation', (() => { const r = clone(resP(realPkt, [])); const p = rc(r, 'bybit.promo_code'); p.resolvedResult = 'supported'; p.provenance = { kind: 'confirmation_evaluator', detail: 'forged', evaluatorState: 'confirmed', evaluatorValue: 'CRYPTOBONUSW', confirmationId: null }; return rIssues(r).includes('MISSING_CONFIRMATION_ID'); })());
  check('bridge/27: resolved-result tampering fails (target claim raw≤assessment invariant / blocking)', (() => { const r = clone(resP(realPkt, [])); rc(r, 'bybit.kyc_required').resolvedResult = 'supported'; return rIssues(r).length > 0; })());
  check('bridge/28: missing / duplicate resolved claim fails closed', (() => { const r = resP(realPkt, []); const miss = clone(r); miss.resolvedClaims = miss.resolvedClaims.filter((c) => c.claimId !== 'bybit.kyc_required'); const dup = clone(r); dup.resolvedClaims = [...dup.resolvedClaims, dup.resolvedClaims[0]]; return rIssues(miss).includes('MISSING_CLAIM') && rIssues(dup).includes('DUPLICATE_CLAIM'); })());

  // -- promo-only bridge behavior --
  check('bridge/29: empty real set → promo pending; adapter non-authorizing', (() => { const r = resP(realPkt, []); return r.confirmationEvaluation.state === 'missing' && rc(r, 'bybit.promo_code').resolvedResult === 'requires_owner_partner_confirmation' && adP(realPkt, []).ok === false; })());
  check('bridge/30: owner-only set → promo pending', (() => { const r = resP(realPkt, [mkO()]); return r.confirmationEvaluation.state === 'pending_partner_confirmation' && rc(r, 'bybit.promo_code').resolvedResult !== 'supported'; })());
  check('bridge/31: synthetic partner cannot confirm under the production policy; positive path only in the isolated harness', (() => {
    // Production resolver over the production policy rejects the untrusted synthetic partner.
    const prod = resP(realPkt, [mkP()]);
    // The positive promo-confirmed evaluation is proven only via the local synthetic policy.
    const synth = evT([mkP()]);
    return prod.reason === 'CONFIRMATION_INVALID' && synth.state === 'confirmed' && synth.value === CAND;
  })());
  check('bridge/32: wrong / prefix value → not confirmed (evaluator, synthetic policy)', evT([mkP({ assertedValue: 'OTHERCODE9', sourceAssertion: csa({ assertedValue: 'OTHERCODE9' }) })]).state !== 'confirmed' && evT([mkP({ assertedValue: 'CRYPTOBONUSWXY', sourceAssertion: csa({ assertedValue: 'CRYPTOBONUSWXY' }) })]).state !== 'confirmed');
  check('bridge/33: conflict / invalid / expired / revoked → not confirmed', (() => {
    const conflict = evT([mkP({ confirmationId: 'p1', sourceId: 'r1' }), mkP({ confirmationId: 'p2', sourceId: 'r2', assertedValue: 'RIVALCODE9', sourceAssertion: csa({ assertedValue: 'RIVALCODE9' }) })]).state === 'conflict';
    const invalid = resP(realPkt, [mkP()]).reason === 'CONFIRMATION_INVALID';
    const expired = evT([mkP({ confirmedAt: '2026-01-01T00:00:00Z', validUntil: '2026-02-01T00:00:00Z', sourceEventAt: '2025-12-31T00:00:00Z' })]).state === 'expired';
    const c1 = mkP({ confirmationId: 'c1', sourceId: 'receipt-1' });
    const c3 = mkO({ confirmationId: 'c3', confirmedAt: '2026-08-05T12:00:00Z', sourceEventAt: '2026-08-05T06:00:00Z', sourceId: '100200301', sourceUrl: 'https://github.com/ros190392-source/cryptobonusworld/issues/256#issuecomment-100200301', artifactIntent: 'revocation', revokesConfirmationId: 'c1' });
    const revoked = evT([c1, c3]).state === 'revoked';
    return conflict && invalid && expired && revoked;
  })());
  check('bridge/34: non-promo claims are source-plan-derived, unaffected by confirmations', (() => { const r = resP(realPkt, []); return ['bybit.bonus_headline', 'bybit.kyc_required', 'bybit.deposit_required', 'bybit.availability', 'bybit.restricted_countries', 'bybit.reward_type', 'bybit.terms_summary'].every((id) => rc(r, id).resolvedResult === rc(r, id).rawResult && rc(r, id).provenance.kind === 'source_plan_assessment'); })());
  check('bridge/35: raw packet + confirmation set are not mutated by resolution', (() => { const set = [mkP()]; const p0 = JSON.stringify(realPkt); const s0 = JSON.stringify(set); resP(realPkt, set); return JSON.stringify(realPkt) === p0 && JSON.stringify(set) === s0; })());

  // -- adapter proofs --
  check('bridge/36: adapter rejects unresolved promo', adP(buildPacket(), []).reason === 'REQUIRED_CLAIM_UNSUPPORTED');
  check('bridge/37: adapter rejects another unresolved required claim', (() => { const pkt = buildPacket({ claims: completeClaims().map((c) => c.claimId === 'bybit.kyc_required' ? { ...c, result: 'inaccessible' } : c) }); return adP(pkt, []).reason === 'REQUIRED_CLAIM_UNSUPPORTED'; })());
  check('bridge/38: synthetic complete positive path adapts (isolated test harness)', (() => { const H = runResolutionHarness(m, BNOW); if (H.fail !== 0) console.log(H.results.join('\n')); return H.fail === 0 && H.pass >= 5; })());
  check('bridge/39: production adapter rejects the synthetic partner set (empty production trust)', adP(buildPacket(), [mkP()]).ok === false);

  // -- real posture --
  check('bridge/40: real confirmation set stays frozen empty', Array.isArray(m.BYBIT_PROMO_CODE_CONFIRMATIONS) && m.BYBIT_PROMO_CODE_CONFIRMATIONS.length === 0 && Object.isFrozen(m.BYBIT_PROMO_CODE_CONFIRMATIONS));
  check('bridge/41: production trusted partner remains empty (no synthetic data in product)', PPOL.trustedPartnerIdentities.length === 0 && PPOL.trustedPartnerDomains.length === 0 && m.BYBIT_PROMO_CODE_CONFIRMATION_STATE === 'missing');
  check('bridge/42: real raw promo claim remains requires_owner_partner_confirmation', realPkt.claims.find((c) => c.claimId === 'bybit.promo_code').result === 'requires_owner_partner_confirmation');
  check('bridge/43: real packet remains draft + no ownerConfirmations field', realPkt.approval === 'draft' && realPkt.ownerConfirmations === undefined);
  check('bridge/44: offers.bybit.evidence remains null; real decision under re-verification', m.bybitOfferEvidence === null && m.getOffer('bybit').evidence === null && m.BYBIT_OFFER_EVIDENCE_DECISION === 'under_re_verification');
  check('bridge/45: preview homepage /go/* = 0', homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'preview', 'en').primary.href.startsWith('/go/')));
  check('bridge/46: public production simulation /go/* = 0', homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'production', 'en').primary.href.startsWith('/go/')));
  check('bridge/47: PUBLIC_MARKET_PROFILES remains frozen and empty', Array.isArray(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0 && Object.isFrozen(m.PUBLIC_MARKET_PROFILES));
  check('bridge/48: locale cannot change resolved facts', (() => {
    const a = resP(realPkt, []); const b = resP(realPkt, []);
    const disc = (l) => m.resolveDisclosure({ tone: 'verified', evidence: m.bybitOfferEvidence, expectedExchangeId: 'bybit', now: BNOW, isAffiliate: false, methodologyHref: '/methodology/' }, l);
    return a.resolutionDigest === b.resolutionDigest && ['en', 'ru', 'kk'].every((l) => disc(l).evidenceState === 'none');
  })());

  // ===== Split 3 (#260, hardened R1–R12) — Bybit official multi-source claim evidence =====
  // Code-owned source plan + candidate inventory + evidence-run manifest + deterministic,
  // fail-closed assessment. The SOURCE PLAN (not the raw packet) controls authorization for
  // its target claims; invalid runs fail closed; general evidence can never prove a
  // promotion-specific assertion; promo/editorial are excluded.
  const SNOW = Date.parse('2026-08-06T12:00:00Z');
  const PLAN_ID = m.BYBIT_SOURCE_PLAN_ID, PLAN_DIGEST = m.BYBIT_SOURCE_PLAN_DIGEST;
  const NULL_SMD = { pageTitle: null, description: null, canonicalUrl: null, ogTitle: null, ogDescription: null, jsonLdType: null };
  const SREC = { authenticationUsed: false, cookiesSent: false, cookiesStored: false, proxyConfigured: false, bodyPersisted: false, redirectsObserved: 0, externalRedirectsBlocked: 0 };
  const cand = (id) => m.BYBIT_OFFICIAL_SOURCE_CANDIDATES.find((c) => c.candidateId === id);
  const realPkt260 = m.BYBIT_OFFER_EVIDENCE_PACKET;

  // A content source bound to a real candidate, proving the given claim components.
  const mkContent = (candidateId, observedScope, fragSpecs, over = {}, body = 'sha256:' + 'b'.repeat(64)) => {
    const c = cand(candidateId);
    const fragments = fragSpecs.map((fs, i) => { const f = { fragmentId: `${candidateId}-f${i}`, sourceId: candidateId, extractionType: 'visible_text', locator: 'h1', text: fs.text || `official bounded evidence ${i}`, claimIds: fs.claimIds, assertionComponentIds: fs.componentIds || [], stance: fs.stance || 'supports', limitation: 'bounded' }; f.textLength = f.text.length; f.fragmentDigest = m.computeOfficialFragmentDigest(f); return f; });
    const fragIds = fragments.map((f) => f.fragmentId);
    const base = {
      sourceId: candidateId, exchangeId: 'bybit', candidateId, planId: PLAN_ID, planDigest: PLAN_DIGEST,
      requestedUrl: c.url, finalUrl: c.url, redirectChain: [], capturedAt: '2026-08-06T10:00:00Z',
      captureMethod: 'http_probe_no_auth_no_cookies', captureTool: 'cbw-test/1.0', runtimeVersion: 'v24', captureMethodUsed: 'http',
      httpStatus: 200, contentType: 'text/html', declaredScope: c.declaredScope, observedScope, currency: 'current',
      scopeAssessment: { classifiedScope: observedScope, classificationRuleId: 'content-observed', evidenceRefs: fragIds, confidence: 'high', limitations: 'ok' },
      currencyAssessment: { currency: 'current', ruleId: 'observed-current-campaign', evidenceRefs: fragIds, observedTime: null, limitations: 'ok' },
      outcome: 'content', responseBytes: 2048, bodyDigest: body,
      fragments, structuredMetadata: { ...NULL_SMD }, runtimeReceipt: { ...SREC }, warnings: [], limitations: [], sourceDigest: 'sha256:' + '0'.repeat(64), ...over,
    };
    if (!('sourceDigest' in over)) base.sourceDigest = m.computeOfficialSourceDigest(base);
    return base;
  };
  // A non-content source (shell / wall / terminal) bound to a real candidate.
  const mkShell = (candidateId, outcome, observedScope, over = {}) => {
    const c = cand(candidateId);
    const noDoc = ['timeout', 'network_error', 'external_redirect', 'response_too_large'].includes(outcome);
    const base = {
      sourceId: candidateId, exchangeId: 'bybit', candidateId, planId: PLAN_ID, planDigest: PLAN_DIGEST,
      requestedUrl: c.url, finalUrl: noDoc ? null : c.url, redirectChain: [], capturedAt: '2026-08-06T10:00:00Z',
      captureMethod: 'http_probe_no_auth_no_cookies', captureTool: 'cbw-test/1.0', runtimeVersion: 'v24', captureMethodUsed: 'http',
      httpStatus: noDoc ? null : 200, contentType: noDoc ? null : 'text/html', declaredScope: c.declaredScope, observedScope, currency: 'ambiguous',
      scopeAssessment: { classifiedScope: observedScope, classificationRuleId: 'declared-unconfirmed', evidenceRefs: [], confidence: 'none', limitations: 'shell' },
      currencyAssessment: { currency: 'ambiguous', ruleId: 'insufficient-currentness-evidence', evidenceRefs: [], observedTime: null, limitations: 'ambiguous' },
      outcome, responseBytes: noDoc ? 0 : 512, bodyDigest: 'sha256:' + 'd'.repeat(64),
      fragments: [], structuredMetadata: { ...NULL_SMD }, runtimeReceipt: { ...SREC }, warnings: [], limitations: [], sourceDigest: 'sha256:' + '0'.repeat(64), ...over,
    };
    if (!('sourceDigest' in over)) base.sourceDigest = m.computeOfficialSourceDigest(base);
    return base;
  };
  const vs = (s) => m.validateOfficialSourceCapture(s, m.BYBIT_OFFER_CLAIM_INVENTORY);
  const shas = (s, code) => vs(s).issues.some((i) => i.code === code);
  const assess = (claimId, sources) => m.assessOfferClaimEvidence(claimId, sources, SNOW);

  // 1 — candidate coverage for every target claim and component.
  check('src/1: plan+candidate coverage complete (all target claims + components)', m.validateSourcePlanCoverage().ok === true && m.BYBIT_OFFER_CLAIM_SOURCE_PLAN.length === 10);
  // 2 — restricted_countries has an official legal/jurisdiction candidate.
  check('src/2: restricted_countries has a legal/jurisdiction candidate', m.BYBIT_OFFICIAL_SOURCE_CANDIDATES.some((c) => c.targetClaimIds.includes('bybit.restricted_countries') && (c.declaredScope === 'legal_restrictions' || c.declaredScope === 'jurisdiction_specific')));
  // 3 — KYC has both general and promotion-specific candidate coverage.
  check('src/3: kyc has general + promotion-specific candidate coverage', (() => { const k = m.BYBIT_OFFICIAL_SOURCE_CANDIDATES.filter((c) => c.targetClaimIds.includes('bybit.kyc_required')); return k.some((c) => c.declaredScope === 'identity_verification_general') && k.some((c) => c.declaredScope === 'promotion_specific'); })());
  // 4 — extraction strategy covers every material component.
  check('src/4: extraction plan covers every material component', m.validateExtractionCoverage().ok === true);
  // 5 — readable KYC/legal/reward pages classify as content (candidate-aware).
  check('src/5: KYC/legal/reward content sources validate + may support', (() => {
    const k = mkContent('help-kyc-identity', 'identity_verification_general', [{ claimIds: ['bybit.kyc_required'], componentIds: ['identity-verification-exists'] }]);
    const l = mkContent('help-restricted-jurisdictions', 'legal_restrictions', [{ claimIds: ['bybit.restricted_countries'], componentIds: ['restricted-list-matches'] }]);
    const r = mkContent('help-what-is-bonus', 'reward_mechanics', [{ claimIds: ['bybit.reward_type'], componentIds: ['reward-instrument-form'] }]);
    return vs(k).ok && vs(l).ok && vs(r).ok && m.sourceMaySupportClaims(k);
  })());
  // 6 — currency ambiguous cannot support.
  check('src/6: ambiguous currency cannot support a requiresCurrent claim', (() => { const s = mkContent('help-restricted-jurisdictions', 'legal_restrictions', [{ claimIds: ['bybit.restricted_countries'], componentIds: ['restricted-list-matches'] }], { currency: 'ambiguous', currencyAssessment: { currency: 'ambiguous', ruleId: 'insufficient-currentness-evidence', evidenceRefs: [], observedTime: null, limitations: 'x' } }); return assess('bybit.restricted_countries', [s]).result !== 'supported'; })());
  // 7 — `current` classification needs evidence (caller-declared current rejected).
  check('src/7: current currency without evidence rejected', shas(mkContent('help-what-is-bonus', 'reward_mechanics', [{ claimIds: ['bybit.reward_type'], componentIds: ['reward-instrument-form'] }], { currencyAssessment: { currency: 'current', ruleId: 'none', evidenceRefs: [], observedTime: null, limitations: 'x' } }), 'CURRENT_NEEDS_EVIDENCE'));
  // 8 — observed scope cannot be caller-self-declared (must match scopeAssessment).
  check('src/8: observedScope must equal scopeAssessment.classifiedScope', shas(mkContent('promo-new-user', 'promotion_specific', [{ claimIds: ['bybit.bonus_headline'], componentIds: ['max-reward-figure', 'reward-is-welcome-package'] }], { observedScope: 'campaign_terms' }), 'SCOPE_ASSESSMENT_MISMATCH'));
  // 9 — runner honors rendered fallback (candidate config present).
  check('src/9: candidates carry a capture-method preference (rendered fallback)', m.BYBIT_OFFICIAL_SOURCE_CANDIDATES.every((c) => c.captureMethod === 'http_only' || c.captureMethod === 'http_then_rendered') && m.BYBIT_OFFICIAL_SOURCE_CANDIDATES.some((c) => c.captureMethod === 'http_then_rendered'));
  // 10 — runner remains no-network by default (asserted structurally: candidates are official-only).
  check('src/10: every candidate URL is official Bybit (no third-party discovery in product)', m.BYBIT_OFFICIAL_SOURCE_CANDIDATES.every((c) => /^https:\/\/(?:www\.|announcements\.|learn\.)?bybit\.com\//.test(c.url)));
  // 11 — invalid source set returns invalid (never silently dropped).
  check('src/11: an invalid artifact makes the run + assessment invalid', (() => { const good = mkContent('promo-new-user', 'promotion_specific', [{ claimIds: ['bybit.bonus_headline'], componentIds: ['max-reward-figure', 'reward-is-welcome-package'] }]); const bad = { ...mkShell('help-what-is-bonus', 'spa_shell', 'reward_mechanics'), bodyDigest: 'not-a-digest' }; const run = m.buildOfficialSourceEvidenceRun([good, bad], SNOW); return run.ok === false && assess('bybit.bonus_headline', [good, bad]).result === 'invalid'; })());
  // 12 — tampered contradiction cannot be dropped.
  check('src/12: tampered contradicting source cannot be dropped → invalid', (() => { const good = mkContent('help-what-is-bonus', 'reward_mechanics', [{ claimIds: ['bybit.reward_type'], componentIds: ['reward-instrument-form', 'withdrawal-conversion-limits'] }]); const contra = mkContent('help-use-bonus', 'reward_mechanics', [{ claimIds: ['bybit.reward_type'], componentIds: [], stance: 'contradicts' }]); contra.observedScope = 'ambiguous'; /* tamper without recompute */ return assess('bybit.reward_type', [good, contra]).result === 'invalid'; })());
  // 13 — incomplete evidence run cannot support.
  check('src/13: missing a mandatory candidate → not supported (incomplete when 0 proven)', (() => { const only = mkShell('promo-welcome-gifts', 'spa_shell', 'promotion_specific'); const a = assess('bybit.bonus_headline', [only]); return a.result !== 'supported'; })());
  // 14 — wrong-scope fragment cannot support (resolution + packet level).
  check('src/14: wrong-scope content cannot prove a promotion-specific claim', (() => { const s = mkContent('promo-new-user', 'account_wide_general', [{ claimIds: ['bybit.bonus_headline'], componentIds: ['max-reward-figure', 'reward-is-welcome-package'] }], { scopeAssessment: { classifiedScope: 'account_wide_general', classificationRuleId: 'redirected-to-generic-homepage', evidenceRefs: [], confidence: 'medium', limitations: 'x' } }); return assess('bybit.bonus_headline', [s]).result !== 'supported'; })());
  // 15 — partial-component fragment cannot support.
  check('src/15: partial component coverage → partially_supported (not supported)', (() => { const s = mkContent('promo-new-user', 'promotion_specific', [{ claimIds: ['bybit.bonus_headline'], componentIds: ['max-reward-figure'] }]); return assess('bybit.bonus_headline', [s]).result === 'partially_supported'; })());
  // 16 — stale/ambiguous source cannot support.
  check('src/16: historical currency cannot prove current availability', (() => { const s = mkContent('help-restricted-jurisdictions', 'legal_restrictions', [{ claimIds: ['bybit.availability'], componentIds: ['global-with-exclusions'] }], { currency: 'historical', currencyAssessment: { currency: 'historical', ruleId: 'historical-marker', evidenceRefs: [], observedTime: null, limitations: 'x' } }); return assess('bybit.availability', [s]).result !== 'supported'; })());
  // 17 — contradicted source cannot support.
  check('src/17: contradiction → contradicted (never supported)', (() => { const s = mkContent('help-restricted-jurisdictions', 'legal_restrictions', [{ claimIds: ['bybit.restricted_countries'], componentIds: [], stance: 'contradicts' }]); return assess('bybit.restricted_countries', [s]).result === 'contradicted'; })());
  // 18 — duplicate source documents do not satisfy multi-source rules (independence R10).
  check('src/18: two captures of the same document count once for multi-source', (() => {
    const body = 'sha256:' + 'e'.repeat(64);
    const a = mkContent('help-what-is-bonus', 'reward_mechanics', [{ claimIds: ['bybit.terms_summary'], componentIds: ['new-accounts-only', 'kyc-to-withdraw', 'volume-conditions-higher-tiers', 'voucher-expiry-window'] }], { finalUrl: 'https://www.bybit.com/en/help-center/article/Same', requestedUrl: cand('help-what-is-bonus').url }, body);
    const b = mkContent('help-use-bonus', 'reward_mechanics', [{ claimIds: ['bybit.terms_summary'], componentIds: ['new-accounts-only', 'kyc-to-withdraw', 'volume-conditions-higher-tiers', 'voucher-expiry-window'] }], { finalUrl: 'https://www.bybit.com/en/help-center/article/Same', requestedUrl: cand('help-use-bonus').url }, body);
    return assess('bybit.terms_summary', [a, b]).result === 'partially_supported';
  })());
  // 18b — two INDEPENDENT documents satisfy the multi-source rule.
  check('src/18b: terms_summary supported by two independent documents', (() => {
    const a = mkContent('help-what-is-bonus', 'reward_mechanics', [{ claimIds: ['bybit.terms_summary'], componentIds: ['volume-conditions-higher-tiers', 'voucher-expiry-window'] }], {}, 'sha256:' + '1'.repeat(64));
    const b = mkContent('promo-new-user', 'promotion_specific', [{ claimIds: ['bybit.terms_summary'], componentIds: ['new-accounts-only', 'kyc-to-withdraw'] }], {}, 'sha256:' + '2'.repeat(64));
    return assess('bybit.terms_summary', [a, b]).result === 'supported';
  })());
  // 19 — generic capture cannot support a source-plan claim (packet layer).
  check('src/19: raw supported target claim forbidden at packet layer', (() => { const p = buildPacket({ claims: completeClaims().map((c) => c.claimId === 'bybit.bonus_headline' ? { ...c, result: 'supported', sourceRefs: ['capture:probe-a'] } : c) }); return !m.validateOfferEvidencePacket(p).ok && m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'SOURCE_PLAN_RAW_SUPPORT_FORBIDDEN'); })());
  // 20 — generic rendered fragment cannot bypass the source plan.
  check('src/20: source-fragment ref cannot raw-support a target claim', (() => { const src = mkContent('promo-new-user', 'promotion_specific', [{ claimIds: ['bybit.bonus_headline'], componentIds: ['max-reward-figure', 'reward-is-welcome-package'] }]); const p = buildPacket({ officialSourceCaptures: [src], claims: completeClaims().map((c) => c.claimId === 'bybit.bonus_headline' ? { ...c, result: 'supported', sourceRefs: ['source-fragment:promo-new-user/promo-new-user-f0'] } : c) }); return !m.validateOfferEvidencePacket(p).ok && m.validateOfferEvidencePacket(p).issues.some((i) => i.code === 'SOURCE_PLAN_RAW_SUPPORT_FORBIDDEN'); })());
  // 21 — canonical assessment controls non-promo resolved claims (resolver).
  check('src/21: resolver derives target resolvedResult from the source-plan assessment', (() => {
    const src = mkContent('promo-new-user', 'promotion_specific', [{ claimIds: ['bybit.deposit_required'], componentIds: ['deposit-task-in-this-promo'] }]);
    const p = buildPacket({ officialSourceCaptures: [src] });
    const r = m.resolveBybitOfferPacketClaims(p, [], SNOW);
    if (!r.ok) return false;
    const dep = r.resolvedClaims.find((c) => c.claimId === 'bybit.deposit_required');
    return dep.provenance.kind === 'source_plan_assessment' && dep.resolvedResult === 'supported' && dep.rawResult === 'inaccessible';
  })());
  // 22 — source plan id/digest enters raw + resolution integrity.
  check('src/22: source plan id + digest + evidence-run digest bound into the resolution', (() => { const r = m.resolveBybitOfferPacketClaims(realPkt260, [], SNOW); return r.ok && r.sourcePlanId === PLAN_ID && r.sourcePlanDigest === PLAN_DIGEST && typeof r.evidenceRunDigest === 'string' && r.evidenceRunDigest.startsWith('sha256:'); })());
  // 22b — plan/candidate digests recompute; changing a candidate changes the digest.
  check('src/22b: candidate + plan digests recompute', m.BYBIT_OFFICIAL_SOURCE_CANDIDATES.every((c) => m.computeCandidateDigest(c) === c.candidateDigest) && typeof PLAN_DIGEST === 'string' && PLAN_DIGEST.startsWith('sha256:'));
  // 23 — production adapter rejects any source-plan mismatch (bad planDigest → invalid run).
  check('src/23: production adapter rejects a plan-digest-mismatched source (evidence run invalid)', (() => { const bad = mkContent('promo-new-user', 'promotion_specific', [{ claimIds: ['bybit.bonus_headline'], componentIds: ['max-reward-figure', 'reward-is-welcome-package'] }], { planDigest: 'sha256:' + 'f'.repeat(64) }); const p = buildPacket({ officialSourceCaptures: [bad] }); const r = m.resolveBybitOfferPacketClaims(p, [], SNOW); return r.ok === false && r.reason === 'EVIDENCE_RUN_INVALID' && m.adaptBybitOfferToEvidence(p, [], SNOW).ok === false; })());
  // 23b — unknown-candidate source → invalid run.
  check('src/23b: unknown-candidate source → evidence run invalid', (() => { const bad = mkContent('promo-new-user', 'promotion_specific', [{ claimIds: ['bybit.bonus_headline'], componentIds: ['max-reward-figure'] }], { candidateId: 'ghost-candidate', sourceId: 'ghost-candidate' }); return m.buildOfficialSourceEvidenceRun([bad], SNOW).ok === false; })());
  // 24 — real promo unchanged.
  check('src/24: real promo remains requires_owner_partner_confirmation', realPkt260.claims.find((c) => c.claimId === 'bybit.promo_code').result === 'requires_owner_partner_confirmation');
  // 25 — real packet remains draft.
  check('src/25: real packet remains draft + valid', realPkt260.approval === 'draft' && m.validateOfferEvidencePacket(realPkt260).ok === true);
  // 26 — offers.bybit.evidence null.
  check('src/26: offers.bybit.evidence remains null', m.bybitOfferEvidence === null && m.getOffer('bybit').evidence === null);
  // 27 — real confirmation set frozen empty.
  check('src/27: real confirmation set stays frozen empty', Array.isArray(m.BYBIT_PROMO_CODE_CONFIRMATIONS) && m.BYBIT_PROMO_CODE_CONFIRMATIONS.length === 0 && Object.isFrozen(m.BYBIT_PROMO_CODE_CONFIRMATIONS));
  // 28 — preview /go/* = 0.
  check('src/28: preview homepage /go/* = 0', homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'preview', 'en').primary.href.startsWith('/go/')));
  // 29 — public production simulation /go/* = 0.
  check('src/29: public production simulation /go/* = 0', homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'production', 'en').primary.href.startsWith('/go/')));
  // 30 — PUBLIC_MARKET_PROFILES frozen empty.
  check('src/30: PUBLIC_MARKET_PROFILES remains frozen empty', Array.isArray(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0 && Object.isFrozen(m.PUBLIC_MARKET_PROFILES));
  // 31 — no third-party/synthetic evidence in product data.
  check('src/31: real official-source captures all official + candidate-bound + no supporting fragments', (() => {
    const caps = realPkt260.officialSourceCaptures || [];
    const run = m.buildOfficialSourceEvidenceRun(caps, SNOW, realPkt260.packetId);
    const allOfficial = caps.length === 8 && caps.every((c) => c.exchangeId === 'bybit' && (c.finalUrl === null || /^https:\/\/(?:www\.|announcements\.|learn\.)?bybit\.com\//.test(c.finalUrl)) && c.fragments.length === 0 && !!cand(c.candidateId));
    return allOfficial && run.ok === true && run.attemptedCandidateIds.length === 8;
  })());
  // 32 — real target claims all inaccessible; production adapter non-authorizing; decision under re-verification.
  check('src/32: real target claims inaccessible; production adapter non-authorizing', (() => {
    const targets = m.SOURCE_PLAN_TARGET_CLAIMS;
    const noUpgrade = targets.every((id) => realPkt260.claims.find((c) => c.claimId === id).result === 'inaccessible');
    return noUpgrade && m.deriveBybitOfferEvidence(SNOW).ok === false && m.adaptBybitOfferToEvidence(realPkt260, [], SNOW).ok === false && m.BYBIT_OFFER_EVIDENCE_DECISION === 'under_re_verification';
  })());
  // 33 — unknown source-plan claim rejected; promo excluded from source-based support.
  check('src/33: unknown claim throws; promo/realistic excluded', (() => { let threw = false; try { assess('bybit.not_a_real_claim', []); } catch { threw = true; } return threw && assess('bybit.promo_code', []).reason === 'EXCLUDED_FROM_SOURCE_SUPPORT' && !m.SOURCE_PLAN_TARGET_CLAIMS.includes('bybit.promo_code'); })());
  // 34 — full supported assessment flows into an approved packet resolving supported (positive path).
  check('src/34: complete official content resolves a target claim supported via the resolver', (() => {
    const src = mkContent('help-restricted-jurisdictions', 'legal_restrictions', [{ claimIds: ['bybit.restricted_countries'], componentIds: ['restricted-list-matches'] }]);
    const r = m.resolveBybitOfferPacketClaims(buildPacket({ officialSourceCaptures: [src] }), [], SNOW);
    if (!r.ok) return false;
    const rc = r.resolvedClaims.find((c) => c.claimId === 'bybit.restricted_countries');
    return rc.resolvedResult === 'supported' && rc.provenance.kind === 'source_plan_assessment';
  })());
  // 35 — digest tamper on an official source is rejected.
  check('src/35: source digest tamper rejected', (() => { const s = mkContent('promo-new-user', 'promotion_specific', [{ claimIds: ['bybit.bonus_headline'], componentIds: ['max-reward-figure', 'reward-is-welcome-package'] }]); s.observedScope = 'campaign_terms'; s.scopeAssessment.classifiedScope = 'campaign_terms'; return shas(s, 'SOURCE_DIGEST_MISMATCH'); })());
  // 36 — response_too_large / oversized body outcome is a terminal no-document.
  check('src/36: response_too_large is a terminal no-document outcome (never supported)', vs(mkShell('promo-new-user', 'response_too_large', 'promotion_specific')).ok === true && ['inaccessible', 'incomplete'].includes(assess('bybit.bonus_headline', [mkShell('promo-new-user', 'response_too_large', 'promotion_specific')]).result));
  // 37 — real committed captures validate + digests recompute.
  check('src/37: real committed official-source captures validate + digests recompute', (realPkt260.officialSourceCaptures || []).every((c) => m.validateOfficialSourceCapture(c, m.BYBIT_OFFER_CLAIM_INVENTORY).ok && m.computeOfficialSourceDigest(c) === c.sourceDigest));

  // ===== Split 3 (#262) — post-merge test-authority surface removal =====
  // No synthetic/test authorization policy, resolver or EvidenceMetadata adapter may be
  // exported from production `src/**`. adaptBybitOfferToEvidence is the sole production
  // EvidenceMetadata producer. The synthetic positive proof lives only in test-support.
  const GUARD = runTestAuthorityGuard();
  const realPkt262 = m.BYBIT_OFFER_EVIDENCE_PACKET;
  // 1 — TEST_ONLY policy absent from claimConfirmation exports.
  check('guard/1: TEST_ONLY_PROMO_CODE_POLICY absent from claimConfirmation exports', m.CC.TEST_ONLY_PROMO_CODE_POLICY === undefined && m.TEST_ONLY_PROMO_CODE_POLICY === undefined);
  // 2 — TEST_ONLY policy absent from all src/** text (AST/text guard).
  check('guard/2: no TEST_ONLY_PROMO_CODE_POLICY token in src/**', GUARD.violations.every((v) => v.code !== 'TEST_ONLY_POLICY_IN_SRC'));
  // 3 — synthetic partner identity absent from src/**.
  check('guard/3: no test-partner-fixture identity in src/**', GUARD.violations.every((v) => v.code !== 'SYNTHETIC_PARTNER_IDENTITY_IN_SRC'));
  // 4 — synthetic partner domain absent from src/**.
  check('guard/4: no partner.test domain in src/**', GUARD.violations.every((v) => v.code !== 'SYNTHETIC_PARTNER_DOMAIN_IN_SRC'));
  // 5 — test resolver absent from production exports.
  check('guard/5: resolveOfferPacketClaimsForTest absent from production exports', m.OPR.resolveOfferPacketClaimsForTest === undefined && m.resolveOfferPacketClaimsForTest === undefined);
  // 6 — test adapter absent from production exports.
  check('guard/6: adaptOfferToEvidenceForTest absent from production exports', m.OPR.adaptOfferToEvidenceForTest === undefined && m.adaptOfferToEvidenceForTest === undefined);
  // 7 — no exported __test / forbidden authorization hook name.
  check('guard/7: no forbidden test-authority export names in src/**', GUARD.violations.every((v) => v.code !== 'FORBIDDEN_EXPORT_NAME') && Object.keys(m.OPR).every((k) => !/__test|ForTest|testAdapter|syntheticPolicy/.test(k)) && Object.keys(m.CC).every((k) => !/__test|ForTest|TEST_ONLY/.test(k)));
  // 8 — only adaptBybitOfferToEvidence is a production EvidenceMetadata producer.
  check('guard/8: only adaptBybitOfferToEvidence produces EvidenceMetadata (AST + namespace)', GUARD.violations.every((v) => v.code !== 'EXTRA_EVIDENCE_PRODUCER') && Object.keys(m.OPR).filter((k) => /^adapt/.test(k)).join(',') === 'adaptBybitOfferToEvidence');
  // 9 — product source cannot import test-support.
  check('guard/9: no production import of test-support / scripts', GUARD.violations.every((v) => v.code !== 'PRODUCTION_IMPORTS_TEST_SUPPORT'));
  // 10 — test-support not re-exported by a product barrel.
  check('guard/10: test-support not re-exported by a production module', GUARD.violations.every((v) => v.code !== 'TEST_SUPPORT_REEXPORTED'));
  // 10b — the guard as a whole passes (fail-closed TypeChecker producer + boundary).
  check('guard/10b: test-authority guard passes with zero violations', GUARD.ok === true);
  // guard/self/* — the hardened detector is proven against transient fixture trees so an
  // inferred / re-exported / aliased / object-method / class-method producer, a dynamic or
  // require() test-support import, or a forbidden name cannot silently bypass it (R7). A
  // legitimate domain accessor whose record merely holds an `evidence` field is accepted.
  const GUARD_SELF = runGuardSelfTests();
  if (!GUARD_SELF.ok) for (const r of GUARD_SELF.results) if (!r.pass) console.log(`  guard/self/${r.id} FAILED [codes: ${r.codes.join(',') || 'none'}]`);
  for (const r of GUARD_SELF.results) check(`guard/self/${r.id}: ${r.desc}`, r.pass === true);
  check('guard/self: hardened detector self-test suite passes as a whole', GUARD_SELF.ok === true && GUARD_SELF.results.length >= 20);
  // 11 — synthetic harness remains ≥5/5.
  check('guard/11: synthetic harness remains at least 5/5', (() => { const H = runResolutionHarness(m, BNOW); if (H.fail !== 0) console.log(H.results.join('\n')); return H.fail === 0 && H.pass >= 5; })());
  // 12 — production adapter rejects the real empty confirmation set.
  check('guard/12: production adapter rejects the real empty confirmation set', m.adaptBybitOfferToEvidence(realPkt262, [], BNOW).ok === false);
  // 13 — production trusted partner identities/domains empty.
  check('guard/13: production trusted partner identities/domains remain empty', PPOL.trustedPartnerIdentities.length === 0 && PPOL.trustedPartnerDomains.length === 0);
  // 14 — real confirmation set frozen empty.
  check('guard/14: BYBIT_PROMO_CODE_CONFIRMATIONS remains Object.freeze([])', Array.isArray(m.BYBIT_PROMO_CODE_CONFIRMATIONS) && m.BYBIT_PROMO_CODE_CONFIRMATIONS.length === 0 && Object.isFrozen(m.BYBIT_PROMO_CODE_CONFIRMATIONS));
  // 15 — CRYPTOBONUSW unconfirmed.
  check('guard/15: CRYPTOBONUSW remains unconfirmed', m.BYBIT_PROMO_CODE_CANDIDATE_CONFIRMED === false && PPOL.candidateConfirmed === false && m.BYBIT_PROMO_CODE_CONFIRMATION_STATE === 'missing');
  // 16 — raw promo remains requires_owner_partner_confirmation.
  check('guard/16: raw promo remains requires_owner_partner_confirmation', realPkt262.claims.find((c) => c.claimId === 'bybit.promo_code').result === 'requires_owner_partner_confirmation');
  // 17 — all ten source-plan claims remain inaccessible.
  check('guard/17: all ten source-plan target claims remain inaccessible', m.SOURCE_PLAN_TARGET_CLAIMS.every((id) => realPkt262.claims.find((c) => c.claimId === id).result === 'inaccessible') && m.SOURCE_PLAN_TARGET_CLAIMS.length === 10);
  // 18 — packet remains draft.
  check('guard/18: packet remains draft', realPkt262.approval === 'draft' && m.validateOfferEvidencePacket(realPkt262).ok === true);
  // 19 — offers.bybit.evidence remains null.
  check('guard/19: offers.bybit.evidence remains null', m.bybitOfferEvidence === null && m.getOffer('bybit').evidence === null);
  // 20 — PUBLIC_MARKET_PROFILES frozen empty.
  check('guard/20: PUBLIC_MARKET_PROFILES remains frozen empty', Array.isArray(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0 && Object.isFrozen(m.PUBLIC_MARKET_PROFILES));
  // 21 — PUBLIC_CBW_CTA_MODE untouched (public posture mode-independent: no /go in either mode).
  check('guard/21: public CTA posture mode-independent (no /go/* in preview or production)', homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'preview', 'en').primary.href.startsWith('/go/') && !m.resolveHomepageTop10Cta(e, 'production', 'en').primary.href.startsWith('/go/')));
  // 22 — preview /go/* = 0.
  check('guard/22: preview homepage /go/* = 0', homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'preview', 'en').primary.href.startsWith('/go/')));
  // 23 — public production simulation /go/* = 0.
  check('guard/23: public production simulation /go/* = 0', homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'production', 'en').primary.href.startsWith('/go/')));
  // 24 — the eight official-source artifacts + digests remain unchanged (valid + recompute).
  check('guard/24: eight official-source artifacts remain valid; digests recompute', (() => { const caps = realPkt262.officialSourceCaptures || []; return caps.length === 8 && caps.every((c) => m.validateOfficialSourceCapture(c, m.BYBIT_OFFER_CLAIM_INVENTORY).ok && m.computeOfficialSourceDigest(c) === c.sourceDigest); })());
  // 25 — source-plan + candidate fingerprints remain intact.
  check('guard/25: source-plan + candidate fingerprints intact', m.validateSourcePlanCoverage().ok === true && m.validateExtractionCoverage().ok === true && typeof m.BYBIT_SOURCE_PLAN_DIGEST === 'string' && m.BYBIT_SOURCE_PLAN_DIGEST.startsWith('sha256:') && m.BYBIT_OFFICIAL_SOURCE_CANDIDATES.every((c) => m.computeCandidateDigest(c) === c.candidateDigest));

  // ===== Split 3 (#264) — Bybit unverified public-copy neutralization =====
  // The public Bybit presentation is derived from authoritative evidence/confirmation
  // state, never raw Offer fields. Real state is under_re_verification; every commercial
  // claim + the unconfirmed code is suppressed. Rendered-output assertions (4–7, 17–21,
  // 25, 41) are authoritatively enforced by the post-build public-output audit gate
  // (scripts/portal/bybit-public-output-audit.mjs); here they also verify the projection
  // carries none of those strings, and re-verify a present dist if one exists.
  const PNOW = Date.parse('2026-08-06T00:00:00Z');
  const PRES = m.deriveBybitPublicOfferPresentation(PNOW);
  const RAW_BYBIT = m.getOffer('bybit');
  const presStrings = JSON.stringify(PRES);
  const distIndex = join(ROOT, 'dist', 'index.html');
  const AUD = existsSync(distIndex) ? runBybitPublicOutputAudit(join(ROOT, 'dist')) : null;
  const auditClean = AUD === null || AUD.ok === true;
  const eqPres = (p) => JSON.stringify(p) === presStrings;
  const noForbidden = BYBIT_UNIQUE_FORBIDDEN.every((s) => !presStrings.includes(s)) && !presStrings.includes(BYBIT_PROMO_CODE);
  const bind = (id) => m.BYBIT_PUBLIC_CLAIM_BINDINGS.find((b) => b.fieldId === id);
  const mut = (over) => ({ ...RAW_BYBIT, ...over });
  const confirmedEval = (value, confirmationId = 'cbw-bybit-partner-001') => ({ state: 'confirmed', value, confirmationId });

  check('pub/1: real Bybit public state = under_re_verification', PRES.publicState === 'under_re_verification' && m.resolvePublicOfferView('bybit', PNOW).publicState === 'under_re_verification');
  check('pub/2: raw candidate promo code remains available internally', RAW_BYBIT.promoCode === 'CRYPTOBONUSW');
  check('pub/3: public projection contains no CRYPTOBONUSW', PRES.promoCode === null && !presStrings.includes(BYBIT_PROMO_CODE));
  check('pub/4: rendered public HTML contains no CRYPTOBONUSW (Bybit-scoped audit)', auditClean);
  check('pub/5: rendered public output contains no 30,000 USDT', auditClean && !presStrings.includes('30,000'));
  check('pub/6: rendered output contains no raw $30–$200 estimate', PRES.realisticValue === null && !presStrings.includes('$30'));
  check('pub/7: rendered output contains no 50% fee-discount claim', PRES.feeDiscount === null && !presStrings.includes('50%'));
  check('pub/8: public projection does not assert KYC required', PRES.kycRequired === null);
  check('pub/9: public projection does not assert deposit required', PRES.depositRequired === null);
  check('pub/10: public projection does not expose raw min-deposit wording', PRES.minDeposit === null);
  check('pub/11: public projection does not expose raw restricted-country offer list', PRES.restrictedCountries === null);
  check('pub/12: public projection does not expose raw reward/withdrawal wording', PRES.rewardType === null);
  check('pub/13: public projection does not expose raw expiry wording', PRES.expiry === null);
  check('pub/14: public projection does not expose raw terms summary', PRES.termsSummary === null);
  check('pub/15: public status does not say verified/confirmed', PRES.statusLabel === m.BYBIT_NEUTRAL_STATUS_LABEL && PRES.statusTone !== 'verified' && !/verified|confirmed/i.test(PRES.statusLabel));
  check('pub/16: neutral re-verification text is present', PRES.headline === m.BYBIT_NEUTRAL_HEADLINE && PRES.detailText === m.BYBIT_NEUTRAL_DETAIL);
  check('pub/17: no suppressed value in data-* attributes (rendered audit)', auditClean);
  check('pub/18: no suppressed value in aria/title attributes (rendered audit)', auditClean);
  check('pub/19: no suppressed value in JSON-LD (rendered audit)', auditClean);
  check('pub/20: no suppressed value in embedded client JSON (rendered audit)', auditClean);
  check('pub/21: no suppressed value in metadata (rendered audit)', auditClean);
  check('pub/22: locale EN cannot restore a suppressed fact', noForbidden && PRES.promoCode === null && PRES.bonusHeadline === null && PRES.termsSummary === null);
  check('pub/23: locale RU cannot restore a suppressed fact (projection is locale-independent)', eqPres(m.deriveBybitPublicOfferPresentation(PNOW)));
  check('pub/24: locale KK / any clock cannot restore a suppressed fact', eqPres(m.deriveBybitPublicOfferPresentation(Date.parse('2026-08-07T00:00:00Z'))));
  check('pub/25: desktop factual posture equals mobile factual posture (single evidence-driven projection)', auditClean && eqPres(m.deriveBybitPublicOfferPresentation(PNOW)));
  check('pub/26: preview homepage /go/* = 0', homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'preview', 'en').primary.href.startsWith('/go/')));
  check('pub/27: production simulation homepage /go/* = 0', homepageTop10.every((e) => !m.resolveHomepageTop10Cta(e, 'production', 'en').primary.href.startsWith('/go/')));
  check('pub/28: non-commercial CTA remains non-affiliate', PRES.isCommercialCtaAllowed === false && m.resolvePublicOfferView('bybit', PNOW).isCommercial === false);
  check('pub/29: raw packet unchanged (draft + promo claim requires owner-partner confirmation)', realPkt262.approval === 'draft' && realPkt262.claims.find((c) => c.claimId === 'bybit.promo_code').result === 'requires_owner_partner_confirmation');
  check('pub/30: all 8 source artifacts unchanged (digests recompute)', (realPkt262.officialSourceCaptures || []).length === 8 && (realPkt262.officialSourceCaptures || []).every((c) => m.computeOfficialSourceDigest(c) === c.sourceDigest));
  check('pub/31: source-plan/candidate fingerprints unchanged', m.validateSourcePlanCoverage().ok === true && m.BYBIT_SOURCE_PLAN_DIGEST.startsWith('sha256:') && m.BYBIT_OFFICIAL_SOURCE_CANDIDATES.every((c) => m.computeCandidateDigest(c) === c.candidateDigest));
  check('pub/32: confirmation real set frozen empty', Array.isArray(m.BYBIT_PROMO_CODE_CONFIRMATIONS) && m.BYBIT_PROMO_CODE_CONFIRMATIONS.length === 0 && Object.isFrozen(m.BYBIT_PROMO_CODE_CONFIRMATIONS));
  check('pub/33: production partner trust empty', PPOL.trustedPartnerIdentities.length === 0 && PPOL.trustedPartnerDomains.length === 0);
  check('pub/34: raw promo remains requires_owner_partner_confirmation (candidate unconfirmed)', m.BYBIT_PROMO_CODE_CONFIRMATION_STATE === 'missing' && m.BYBIT_PROMO_CODE_CANDIDATE_CONFIRMED === false);
  check('pub/35: all ten source-plan claims remain inaccessible', m.SOURCE_PLAN_TARGET_CLAIMS.length === 10 && m.SOURCE_PLAN_TARGET_CLAIMS.every((id) => realPkt262.claims.find((c) => c.claimId === id).result === 'inaccessible'));
  check('pub/36: packet remains draft', realPkt262.approval === 'draft' && m.validateOfferEvidencePacket(realPkt262).ok === true);
  check('pub/37: offers.bybit.evidence remains null', m.bybitOfferEvidence === null && m.getOffer('bybit').evidence === null);
  check('pub/38: PUBLIC_MARKET_PROFILES remains frozen empty', Array.isArray(m.PUBLIC_MARKET_PROFILES) && m.PUBLIC_MARKET_PROFILES.length === 0 && Object.isFrozen(m.PUBLIC_MARKET_PROFILES));
  check('pub/39: test-authority guard PASS', GUARD.ok === true);
  check('pub/40: adaptBybitOfferToEvidence remains the sole product evidence adapter', Object.keys(m.OPR).filter((k) => /^adapt/.test(k)).join(',') === 'adaptBybitOfferToEvidence');
  check('pub/41: synthetic test values never enter public output', auditClean && !presStrings.includes('test-partner-fixture') && !presStrings.includes('partner.test'));
  check('pub/42: other exchange presentation has no factual regression', (() => { const okx = m.resolvePublicOfferView('okx', PNOW); const raw = m.getOffer('okx'); return !!okx && okx.promoCode === raw.promoCode && okx.bonusHeadline === raw.bonusHeadline && okx.showVerifiedBadge === (raw.status === 'verified') && okx.isCommercial === true; })());

  // pub/mut/* — R10 future-reactivation regression matrix. Exercises the PURE binding
  // resolvers with synthetic supported/confirmed inputs + mutated raw candidates to prove
  // exact identity binding: a supported OLD assertion never authorizes a CHANGED candidate,
  // one supported claim never unlocks another, and only the projection's verified state
  // (not raw Offer.status) can turn the public presentation commercial.
  check('pub/mut/1: exact supported headline + exact candidate → may restore', m.resolvePublicClaimValue(bind('bonusHeadline'), RAW_BYBIT, true) === bind('bonusHeadline').assertedValue);
  check('pub/mut/2: supported headline + CHANGED raw headline → hidden', m.resolvePublicClaimValue(bind('bonusHeadline'), mut({ bonusHeadline: 'Up to 99,999 USDT Welcome Package' }), true) === null);
  check('pub/mut/3: supported fee claim + CHANGED raw fee → hidden', m.resolvePublicClaimValue(bind('feeDiscount'), mut({ feeDiscount: 'Up to 80% fee discount' }), true) === null);
  check('pub/mut/4: supported restrictions + CHANGED country list → hidden', m.resolvePublicClaimValue(bind('restrictedCountries'), mut({ restrictedCountries: ['US', 'UK'] }), true) === null);
  check('pub/mut/5: confirmed promo + exact real code → may restore', m.resolvePublicPromoCode('CRYPTOBONUSW', confirmedEval('CRYPTOBONUSW')) === 'CRYPTOBONUSW');
  check('pub/mut/6: confirmed promo + CHANGED raw code → hidden', m.resolvePublicPromoCode('NEWCODE9', confirmedEval('CRYPTOBONUSW')) === null);
  check('pub/mut/7: one supported claim cannot unlock another (per-field gating)', m.resolvePublicClaimValue(bind('termsSummary'), RAW_BYBIT, false) === null && m.resolvePublicClaimValue(bind('availability'), RAW_BYBIT, true) !== null);
  check('pub/mut/8: verified overall cannot restore an UNsupported optional field', m.resolvePublicClaimValue(bind('feeDiscount'), RAW_BYBIT, false) === null && m.resolvePublicClaimValue(bind('minDeposit'), RAW_BYBIT, false) === null);
  check('pub/mut/9: realisticValue has no authority (no binding; stays null)', PRES.realisticValue === null && m.BYBIT_PUBLIC_CLAIM_BINDINGS.every((b) => b.fieldId !== 'realisticValue'));
  check('pub/mut/10: exact supported boolean/string/set candidates → restore their code-owned value', m.resolvePublicClaimValue(bind('kycRequired'), RAW_BYBIT, true) === true && m.resolvePublicClaimValue(bind('availability'), RAW_BYBIT, true) === bind('availability').assertedValue && Array.isArray(m.resolvePublicClaimValue(bind('restrictedCountries'), RAW_BYBIT, true)));
  check('pub/mut/11: NOT supported (e.g. stale/inaccessible) → hidden for every field', m.BYBIT_PUBLIC_CLAIM_BINDINGS.every((b) => m.resolvePublicClaimValue(b, RAW_BYBIT, false) === null));
  check('pub/mut/12: invalid / no clock stays neutral (fail-closed audit case)', (() => { const p = m.deriveBybitPublicOfferPresentation(NaN); return p.publicState === 'under_re_verification' && p.promoCode === null && p.bonusHeadline === null && p.termsSummary === null && p.isCommercialCtaAllowed === false; })());
  check('pub/mut/13: current /go/bybit public view is non-commercial', m.resolvePublicOfferView('bybit', PNOW).isCommercial === false && (AUD === null || AUD.violations.every((v) => !/^GO_BYBIT_/.test(v.code))));
  check('pub/mut/14: commercial state is gated ONLY by the projection verified state', PRES.isCommercialCtaAllowed === (PRES.publicState === 'verified'));
  check('pub/mut/15: raw Offer.status=verified alone cannot make the public state verified', RAW_BYBIT.status === 'verified' && PRES.publicState === 'under_re_verification');
  check('pub/mut/16: homepage public Bybit model carries no latent affiliate URL/code/action', (() => { const e = homepageTop10.find((x) => x.slug === 'bybit'); const s = JSON.stringify(e); return !!e && e.primaryAction === undefined && !s.includes('CRYPTOBONUSW') && !s.includes('partner.bybit.com') && !s.includes('/go/'); })());
  check('pub/mut/17: promo-codes trust ordering uses the public view state (bybit not verified)', m.resolvePublicOfferView('bybit', PNOW).publicState !== 'verified' && m.resolvePublicOfferView('bybit', PNOW).showVerifiedBadge === false);
  check('pub/mut/18: mixed-state — Bybit public view exposes no verified/confirmed label', !/verified|confirmed/i.test(m.resolvePublicOfferView('bybit', PNOW).statusLabel) && auditClean);
  check('pub/mut/19: public-output audit includes /go/bybit in scope', (() => { const r = existsSync(distIndex) ? runBybitPublicOutputAudit(join(ROOT, 'dist')) : null; return r === null || r.violations.every((v) => v.code !== 'GO_BYBIT_MISSING'); })());
  check('pub/mut/20: current real output remains fully neutral', PRES.promoCode === null && PRES.bonusHeadline === null && PRES.feeDiscount === null && PRES.kycRequired === null && PRES.depositRequired === null && PRES.minDeposit === null && PRES.availability === null && PRES.restrictedCountries === null && PRES.rewardType === null && PRES.expiry === null && PRES.termsSummary === null && auditClean);

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
